import { writeTextFile, walkDirectory, copyFile } from './fsAccess';
import { buildManifest, buildRepository } from './assetRepository';
import type { Manifest, Repository } from './assetRepository';
import { reconcileResources } from './resourceReconciliation';
import { validateFlow } from './validator';
import { buildBackendContract } from './backendContract';
import type { BackendContract } from './backendContract';
import { exportReportAsJson, exportReportAsMarkdown } from './reportExport';
import { exportBackendContractAsJson, exportBackendContractAsMarkdown } from './backendContract';
import type { FlowData, ValidationResult, ReconciliationResult } from '../types/flow';

export interface BuildResult {
  validation: ValidationResult;
  manifest: Manifest;
  repository: Repository;
  reconciliation: ReconciliationResult;
  backendContract: BackendContract;
}

export interface ResourceAnalysis {
  validation: ValidationResult;
  manifest: Manifest;
  reconciliation: ReconciliationResult;
}

/**
 * Valide le flow, scanne le dossier de ressources et réconcilie les deux —
 * la séquence commune au Build (avant d'écrire quoi que ce soit) et au
 * Générateur de ressources (qui n'a besoin que de savoir ce qui manque, sans
 * dossier de sortie).
 */
export const analyzeResources = async (
  flow: FlowData,
  resourcesDirHandle: FileSystemDirectoryHandle
): Promise<ResourceAnalysis> => {
  const validation = validateFlow(flow);
  const manifest = await buildManifest(resourcesDirHandle);
  const reconciliation = reconcileResources(
    [...validation.report.audios, ...validation.report.images],
    manifest.entries.map((entry) => entry.path)
  );
  return { validation, manifest, reconciliation };
};

/**
 * Orchestre l'existant (aucune nouvelle logique métier) : valide le flow, scanne
 * le dossier de ressources, réconcilie les deux, dérive le contrat backend, puis
 * écrit tout dans `outputDirHandle` — sauf si le flow a des erreurs bloquantes,
 * auquel cas le diagnostic complet est quand même retourné (pour l'afficher),
 * mais rien n'est écrit sur disque : jamais de sortie partielle/incohérente.
 */
export const runBuild = async (
  flow: FlowData,
  resourcesDirHandle: FileSystemDirectoryHandle,
  outputDirHandle: FileSystemDirectoryHandle
): Promise<BuildResult> => {
  const { validation, manifest, reconciliation } = await analyzeResources(flow, resourcesDirHandle);
  const repository = await buildRepository(manifest);
  const backendContract = buildBackendContract(flow);

  const result: BuildResult = { validation, manifest, repository, reconciliation, backendContract };

  if (validation.errors.length > 0) {
    return result;
  }

  await writeTextFile(outputDirHandle, 'flow.json', JSON.stringify(flow, null, 2));
  await writeTextFile(outputDirHandle, 'resource_inventory.json', JSON.stringify(validation.report, null, 2));
  await writeTextFile(outputDirHandle, 'manifest.json', JSON.stringify(manifest, null, 2));
  await writeTextFile(outputDirHandle, 'repository.json', JSON.stringify(repository, null, 2));
  await writeTextFile(outputDirHandle, 'validation_report.json', exportReportAsJson(validation));
  await writeTextFile(outputDirHandle, 'validation_report.md', exportReportAsMarkdown(validation));
  await writeTextFile(outputDirHandle, 'backend_contract.json', exportBackendContractAsJson(backendContract));
  await writeTextFile(outputDirHandle, 'backend_contract.md', exportBackendContractAsMarkdown(backendContract));

  return result;
};

export interface PublicationResult {
  build: BuildResult;
  copiedFiles: string[];
}

/**
 * Pas un nouveau moteur : réutilise runBuild tel quel (mêmes 8 fichiers écrits
 * dans publishDirHandle), puis copie en plus dans publishDirHandle/assets/ les
 * seuls fichiers réellement référencés par le flow — jamais les orphelins,
 * jamais un `cp -r` aveugle de tout le dossier de ressources. C'est la seule
 * différence avec un Build normal : celui-ci sert à vérifier/itérer en local,
 * la Publication produit un répertoire "propre" prêt à être consommé par
 * backend/Flutter.
 */
export const preparePublication = async (
  flow: FlowData,
  resourcesDirHandle: FileSystemDirectoryHandle,
  publishDirHandle: FileSystemDirectoryHandle
): Promise<PublicationResult> => {
  const build = await runBuild(flow, resourcesDirHandle, publishDirHandle);

  if (build.validation.errors.length > 0) {
    return { build, copiedFiles: [] };
  }

  const orphanedPaths = new Set(build.reconciliation.orphaned);
  const referencedPaths = build.manifest.entries
    .map((entry) => entry.path)
    .filter((path) => !orphanedPaths.has(path));

  const resourceFiles = await walkDirectory(resourcesDirHandle);
  const copiedFiles: string[] = [];
  for (const path of referencedPaths) {
    const fileHandle = resourceFiles.get(path);
    if (!fileHandle) continue; // ne devrait pas arriver : le manifest vient du même scan
    await copyFile(fileHandle, publishDirHandle, `assets/${path}`);
    copiedFiles.push(path);
  }

  return { build, copiedFiles };
};
