import { describe, it, expect } from 'vitest';
import { reconcileResources } from './resourceReconciliation';

describe('reconcileResources', () => {
  it('ne signale rien si les ressources attendues et présentes sont identiques', () => {
    const result = reconcileResources(
      ['audio/fon/produits/mais.mp3', 'images/produits/mais.jpeg'],
      ['audio/fon/produits/mais.mp3', 'images/produits/mais.jpeg']
    );
    expect(result).toEqual({ missing: [], orphaned: [] });
  });

  it('signale une ressource attendue mais absente du disque comme "manquante"', () => {
    const result = reconcileResources(['audio/fon/produits/mais.mp3'], []);
    expect(result.missing).toEqual(['audio/fon/produits/mais.mp3']);
    expect(result.orphaned).toEqual([]);
  });

  it('signale une ressource présente sur le disque mais plus attendue comme "orpheline"', () => {
    const result = reconcileResources([], ['audio/fon/produits/ancien.mp3']);
    expect(result.missing).toEqual([]);
    expect(result.orphaned).toEqual(['audio/fon/produits/ancien.mp3']);
  });

  it('distingue chemins complets, pas seulement le nom de fichier (pas de faux positif basename)', () => {
    // Même nom de fichier ("mais.mp3"), deux dossiers différents : les deux
    // doivent être traités comme des ressources distinctes, pas comme un
    // "présent" qui couvrirait les deux.
    const result = reconcileResources(
      ['audio/fon/produits/mais.mp3'],
      ['audio/fon/marches/mais.mp3']
    );
    expect(result.missing).toEqual(['audio/fon/produits/mais.mp3']);
    expect(result.orphaned).toEqual(['audio/fon/marches/mais.mp3']);
  });

  it('dédoublonne les entrées répétées dans une même liste', () => {
    const result = reconcileResources(
      ['audio/fon/produits/mais.mp3', 'audio/fon/produits/mais.mp3'],
      []
    );
    expect(result.missing).toEqual(['audio/fon/produits/mais.mp3']);
  });
});
