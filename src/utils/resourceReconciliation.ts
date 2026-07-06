import type { ReconciliationResult } from '../types/flow';

/**
 * Compare les ressources attendues (calculées à partir du flow) aux ressources
 * réellement présentes sur le disque (chemins relatifs complets, ex. issus du
 * manifest de l'Asset Repository). "Manquant" et "orphelin" ne sont que les
 * deux faces de la même comparaison ensembliste — voir ReconciliationResult.
 */
export const reconcileResources = (
  expected: string[],
  presentOnDisk: string[]
): ReconciliationResult => {
  const expectedSet = new Set(expected);
  const presentSet = new Set(presentOnDisk);

  return {
    missing: [...expectedSet].filter((path) => !presentSet.has(path)),
    orphaned: [...presentSet].filter((path) => !expectedSet.has(path))
  };
};
