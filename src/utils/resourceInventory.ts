import type { FlowVariables, FlowHashmaps, FlowMappings, ResourceGroup } from '../types/flow';
import { DEFAULT_LANGUAGES } from './languages';

// Formats de sortie proposés pour la génération des ressources.
export const AUDIO_FORMATS = ['mp3', 'wav', 'ogg', 'm4a'];
export const IMAGE_FORMATS = ['jpeg', 'jpg', 'png', 'webp'];

export const DEFAULT_AUDIO_FORMAT = 'mp3';
export const DEFAULT_IMAGE_FORMAT = 'jpeg';

/**
 * Recalcule le mapping "nom de variable/hashmap -> dossier de ressources".
 * Conserve les valeurs déjà personnalisées (ex. importées d'un JSON externe),
 * ajoute une entrée par défaut (dossier = nom) pour celles qui manquent, et
 * retire les entrées qui ne correspondent plus à une variable/hashmap existant.
 */
export const syncResourceMappings = (
  currentMappings: FlowMappings,
  variables: FlowVariables,
  hashmaps: FlowHashmaps
): FlowMappings => {
  const validNames = [...Object.keys(variables || {}), ...Object.keys(hashmaps || {})];
  const next: Record<string, string> = {};

  validNames.forEach((name) => {
    next[name] = currentMappings?.[name] || name;
  });

  return next;
};

/**
 * Génère la liste des ressources audio/image attendues pour chaque valeur de
 * chaque variable, à partir du mapping de dossier, des langues actives et des
 * formats choisis. Seul l'audio dépend de la langue — une image reste la même
 * quelle que soit la langue de navigation, elle n'est donc jamais dupliquée.
 *
 * Variable "produits" -> dossier "produits", valeur "riz", langues [fon, yoruba]
 *   => audio/fon/produits/riz.mp3, audio/yoruba/produits/riz.mp3 (une entrée par langue)
 *   => images/produits/riz.jpeg (une seule entrée, jamais par langue)
 */
export const buildVariableResources = (
  variables: FlowVariables,
  mappings: FlowMappings,
  languages: string[] = DEFAULT_LANGUAGES,
  audioFormat: string = DEFAULT_AUDIO_FORMAT,
  imageFormat: string = DEFAULT_IMAGE_FORMAT
): ResourceGroup => {
  const audios: string[] = [];
  const images: string[] = [];
  // Dédoublonné une seule fois : un flow importé/édité à la main peut déclarer
  // deux fois la même langue (le UI de FlowSettingsManager l'empêche, un JSON
  // externe ne le garantit pas), ce qui dupliquerait sinon chaque ressource audio.
  const activeLanguages = [...new Set(languages)];

  Object.entries(variables || {}).forEach(([name, values]) => {
    const folder = mappings?.[name] || name;
    (values || []).forEach((value) => {
      activeLanguages.forEach((lang) => {
        audios.push(`audio/${lang}/${folder}/${value}.${audioFormat}`);
      });
      images.push(`images/${folder}/${value}.${imageFormat}`);
    });
  });

  return { audios, images };
};

/**
 * Génère la liste des ressources audio/image attendues pour chaque
 * combinaison clé/valeur de chaque hashmap. Même règle que pour les
 * variables : l'audio est multiplié par langue, jamais l'image.
 *
 * HashMap "marche_par_departement" -> dossier "marche_par_departement",
 * clé "oueme", valeur "ouando", langue "fon"
 *   => audio/fon/marche_par_departement/oueme/ouando.mp3
 *   => images/marche_par_departement/oueme/ouando.jpeg
 *
 * `excludedHashmaps` (voir FlowData.hashmaps_no_resources) retire du calcul
 * les hashmaps dont clés/valeurs sont déjà couvertes par des ressources de
 * variable existantes ailleurs : ni audio ni image n'est attendu pour eux.
 */
export const buildHashmapResources = (
  hashmaps: FlowHashmaps,
  mappings: FlowMappings,
  languages: string[] = DEFAULT_LANGUAGES,
  audioFormat: string = DEFAULT_AUDIO_FORMAT,
  imageFormat: string = DEFAULT_IMAGE_FORMAT,
  excludedHashmaps: string[] = []
): ResourceGroup => {
  const audios: string[] = [];
  const images: string[] = [];
  const activeLanguages = [...new Set(languages)];
  const excluded = new Set(excludedHashmaps);

  Object.entries(hashmaps || {}).forEach(([name, keys]) => {
    if (excluded.has(name)) return;
    const folder = mappings?.[name] || name;
    Object.entries(keys || {}).forEach(([key, values]) => {
      (values || []).forEach((value) => {
        activeLanguages.forEach((lang) => {
          audios.push(`audio/${lang}/${folder}/${key}/${value}.${audioFormat}`);
        });
        images.push(`images/${folder}/${key}/${value}.${imageFormat}`);
      });
    });
  });

  return { audios, images };
};
