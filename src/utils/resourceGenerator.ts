// Générateur de ressources placeholder (Studio > Générateur) : comble les
// ressources attendues mais absentes du disque pendant que l'équipe Studio
// réelle prépare les vraies images/audios — jamais de vraie parole possible
// côté navigateur pour le fon/yoruba/dendi/adja, donc l'audio est un bip
// pré-fabriqué (public/placeholders/audio/) recopié tel quel ; l'image, elle,
// est réellement générée (couleur + label dérivés du chemin) pour rester
// visuellement distinguable d'une ressource à l'autre pendant les tests.
//
// Fonctions pures (label/couleur) séparées de l'orchestration disque/canvas/
// réseau, même découpage que simulationEngine.ts vs simulationResources.ts.

import { resourceTypeForPath } from './assetRepository';
import { writeBinaryFile } from './fsAccess';

// ---------------------------------------------------------------------------
// Pur — testable sans DOM
// ---------------------------------------------------------------------------

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

/**
 * Couleur HSL déterministe à partir d'un chemin : deux chemins différents ont
 * (très probablement) des couleurs différentes, un même chemin régénéré garde
 * toujours la même — utile pour repérer un mauvais mapping à l'œil.
 */
export const derivePlaceholderColor = (seed: string): string => `hsl(${hashString(seed) % 360}, 65%, 55%)`;

/**
 * Texte lisible dérivé d'un chemin de ressource, sans l'extension ni le
 * premier segment (audio|images) — pour l'audio, retire aussi le segment de
 * langue (audio/{lang}/...) qui ne distingue pas le contenu, juste sa
 * diffusion. Ex. "images/marche_par_departement/oueme/ouando.jpeg"
 * -> "marche_par_departement / oueme / ouando".
 */
export const derivePlaceholderLabel = (path: string): string => {
  const withoutExtension = path.replace(/\.[^./]+$/, '');
  const segments = withoutExtension.split('/').filter(Boolean);
  if (segments[0] === 'audio') segments.splice(0, 2);
  else segments.shift();
  return segments.join(' / ');
};

const extensionOf = (path: string): string => path.match(/\.([^./]+)$/)?.[1] ?? '';

// ---------------------------------------------------------------------------
// Orchestration — DOM (canvas) / réseau (fetch) / disque
// ---------------------------------------------------------------------------

const IMAGE_MIME_BY_FORMAT: Record<string, string> = {
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp'
};

const PLACEHOLDER_IMAGE_SIZE = 512;

/**
 * Dessine une image placeholder réelle et distincte par ressource (fond
 * coloré + label du chemin + bandeau diagonal "PLACEHOLDER" pour ne jamais la
 * confondre avec un vrai asset si elle finit par traîner jusqu'en Publication).
 */
export const generatePlaceholderImageBlob = (path: string, format: string): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  canvas.width = PLACEHOLDER_IMAGE_SIZE;
  canvas.height = PLACEHOLDER_IMAGE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Canvas 2D non supporté par ce navigateur.'));

  ctx.fillStyle = derivePlaceholderColor(path);
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(-Math.PI / 8);
  ctx.font = 'bold 40px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.textAlign = 'center';
  ctx.fillText('PLACEHOLDER', 0, 16);
  ctx.restore();

  const label = derivePlaceholderLabel(path);
  const plateWidth = canvas.width - 32;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.fillRect((canvas.width - plateWidth) / 2, canvas.height - 72, plateWidth, 40);
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(label, canvas.width / 2, canvas.height - 44, plateWidth - 24);

  const mime = IMAGE_MIME_BY_FORMAT[format] || 'image/jpeg';
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error(`Échec de génération de l'image pour "${path}".`));
    }, mime);
  });
};

// Un seul bip par format, mis en cache : des centaines de chemins audio
// partagent le même contenu, inutile de refetcher à chaque fichier.
const placeholderAudioCache = new Map<string, Promise<Blob>>();

export const loadPlaceholderAudioBlob = (format: string): Promise<Blob> => {
  const cached = placeholderAudioCache.get(format);
  if (cached) return cached;

  const promise = fetch(`/placeholders/audio/beep.${format}`).then((response) => {
    if (!response.ok) throw new Error(`Placeholder audio introuvable pour le format "${format}".`);
    return response.blob();
  });
  placeholderAudioCache.set(format, promise);
  return promise;
};

export interface GeneratePlaceholdersResult {
  generated: string[];
  failed: { path: string; error: string }[];
}

/**
 * Génère et écrit un placeholder pour chaque chemin donné (image dessinée ou
 * bip audio recopié selon `resourceTypeForPath`). Boucle séquentielle (même
 * style que buildManifest) ; une erreur sur un chemin n'interrompt pas le lot.
 */
export const generatePlaceholderResources = async (
  paths: string[],
  resourcesDirHandle: FileSystemDirectoryHandle
): Promise<GeneratePlaceholdersResult> => {
  const generated: string[] = [];
  const failed: { path: string; error: string }[] = [];

  for (const path of paths) {
    try {
      const format = extensionOf(path);
      const blob = resourceTypeForPath(path) === 'audio'
        ? await loadPlaceholderAudioBlob(format)
        : await generatePlaceholderImageBlob(path, format);
      await writeBinaryFile(resourcesDirHandle, path, blob);
      generated.push(path);
    } catch (err) {
      failed.push({ path, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return { generated, failed };
};
