import { describe, it, expect } from 'vitest';
import { computeRepositoryHash, buildRepository } from './assetRepository';
import type { Manifest, ManifestEntry } from './assetRepository';

const entry = (path: string, hash: string, file_size = 100): ManifestEntry => ({
  path,
  hash,
  file_size,
  resource_type: path.startsWith('audio/') ? 'audio' : 'image',
  last_modified: '2026-01-01T00:00:00.000Z'
});

const buildManifestFixture = (entries: ManifestEntry[]): Manifest => ({
  generated_at: '2026-01-01T00:00:00.000Z',
  entries
});

describe('computeRepositoryHash', () => {
  it('est déterministe : même contenu, même hash, peu importe l\'ordre de scan', async () => {
    const manifestA = buildManifestFixture([
      entry('audio/fon/produits/mais.mp3', 'hash1'),
      entry('images/produits/mais.jpeg', 'hash2')
    ]);
    const manifestB = buildManifestFixture([
      entry('images/produits/mais.jpeg', 'hash2'),
      entry('audio/fon/produits/mais.mp3', 'hash1')
    ]);

    expect(await computeRepositoryHash(manifestA)).toBe(await computeRepositoryHash(manifestB));
  });

  it('change si le hash d\'une entrée change (contenu de fichier modifié)', async () => {
    const before = buildManifestFixture([entry('audio/fon/produits/mais.mp3', 'hash1')]);
    const after = buildManifestFixture([entry('audio/fon/produits/mais.mp3', 'hash1-modifie')]);

    expect(await computeRepositoryHash(before)).not.toBe(await computeRepositoryHash(after));
  });

  it('change si un chemin change (renommage/déplacement)', async () => {
    const before = buildManifestFixture([entry('audio/fon/produits/mais.mp3', 'hash1')]);
    const after = buildManifestFixture([entry('audio/fon/produits/riz.mp3', 'hash1')]);

    expect(await computeRepositoryHash(before)).not.toBe(await computeRepositoryHash(after));
  });

  it('change si la taille change à hash de chemin identique', async () => {
    const before = buildManifestFixture([entry('audio/fon/produits/mais.mp3', 'hash1', 100)]);
    const after = buildManifestFixture([entry('audio/fon/produits/mais.mp3', 'hash1', 200)]);

    expect(await computeRepositoryHash(before)).not.toBe(await computeRepositoryHash(after));
  });

  it('change si un fichier est ajouté ou retiré', async () => {
    const withOne = buildManifestFixture([entry('audio/fon/produits/mais.mp3', 'hash1')]);
    const withTwo = buildManifestFixture([
      entry('audio/fon/produits/mais.mp3', 'hash1'),
      entry('images/produits/mais.jpeg', 'hash2')
    ]);

    expect(await computeRepositoryHash(withOne)).not.toBe(await computeRepositoryHash(withTwo));
  });
});

describe('buildRepository', () => {
  it('reprend generated_at du manifest et compte les entrées', async () => {
    const manifest = buildManifestFixture([
      entry('audio/fon/produits/mais.mp3', 'hash1'),
      entry('images/produits/mais.jpeg', 'hash2')
    ]);

    const repository = await buildRepository(manifest);
    expect(repository.generated_at).toBe(manifest.generated_at);
    expect(repository.entry_count).toBe(2);
    expect(repository.repository_hash).toBe(await computeRepositoryHash(manifest));
  });
});
