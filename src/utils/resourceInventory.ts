import type { FlowVariables, FlowHashmaps, FlowMappings, ResourceGroup } from '../types/flow';

// Formats de sortie proposés pour la génération des ressources.
export const AUDIO_FORMATS = ['mp3', 'wav', 'ogg', 'm4a'];
export const IMAGE_FORMATS = ['jpeg', 'jpg', 'png', 'webp'];

export const DEFAULT_AUDIO_FORMAT = 'mp3';
export const DEFAULT_IMAGE_FORMAT = 'jpeg';

// Toutes les extensions reconnues comme fichier de ressource (utilisé par la
// vérification sur disque pour repérer les fichiers dans un tree.txt).
export const RESOURCE_EXTENSIONS = [...AUDIO_FORMATS, ...IMAGE_FORMATS, 'gif', 'svg'];

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
 * chaque variable, à partir du mapping de dossier et des formats choisis.
 *
 * Variable "produits" -> dossier "produits", valeur "riz"
 *   => audios/produits/riz.mp3, images/produits/riz.jpeg
 */
export const buildVariableResources = (
  variables: FlowVariables,
  mappings: FlowMappings,
  audioFormat: string = DEFAULT_AUDIO_FORMAT,
  imageFormat: string = DEFAULT_IMAGE_FORMAT
): ResourceGroup => {
  const audios: string[] = [];
  const images: string[] = [];

  Object.entries(variables || {}).forEach(([name, values]) => {
    const folder = mappings?.[name] || name;
    (values || []).forEach((value) => {
      audios.push(`audios/${folder}/${value}.${audioFormat}`);
      images.push(`images/${folder}/${value}.${imageFormat}`);
    });
  });

  return { audios, images };
};

/**
 * Génère la liste des ressources audio/image attendues pour chaque
 * combinaison clé/valeur de chaque hashmap.
 *
 * HashMap "marche_par_departement" -> dossier "marche_par_departement",
 * clé "oueme", valeur "ouando"
 *   => audios/marche_par_departement/oueme/ouando.mp3, images/.../ouando.jpeg
 */
export const buildHashmapResources = (
  hashmaps: FlowHashmaps,
  mappings: FlowMappings,
  audioFormat: string = DEFAULT_AUDIO_FORMAT,
  imageFormat: string = DEFAULT_IMAGE_FORMAT
): ResourceGroup => {
  const audios: string[] = [];
  const images: string[] = [];

  Object.entries(hashmaps || {}).forEach(([name, keys]) => {
    const folder = mappings?.[name] || name;
    Object.entries(keys || {}).forEach(([key, values]) => {
      (values || []).forEach((value) => {
        audios.push(`audios/${folder}/${key}/${value}.${audioFormat}`);
        images.push(`images/${folder}/${key}/${value}.${imageFormat}`);
      });
    });
  });

  return { audios, images };
};
