import { describe, it, expect } from 'vitest';
import { derivePlaceholderColor, derivePlaceholderLabel } from './resourceGenerator';

describe('derivePlaceholderColor', () => {
  it('est déterministe : le même chemin donne toujours la même couleur', () => {
    const path = 'images/produits/riz.jpeg';
    expect(derivePlaceholderColor(path)).toBe(derivePlaceholderColor(path));
  });

  it('distingue deux chemins différents', () => {
    expect(derivePlaceholderColor('images/produits/riz.jpeg'))
      .not.toBe(derivePlaceholderColor('images/produits/mais.jpeg'));
  });

  it('retourne une couleur HSL valide', () => {
    expect(derivePlaceholderColor('images/produits/riz.jpeg')).toMatch(/^hsl\(\d+, 65%, 55%\)$/);
  });
});

describe('derivePlaceholderLabel', () => {
  it('retire le préfixe "images/" et l\'extension', () => {
    expect(derivePlaceholderLabel('images/produits/riz.jpeg')).toBe('produits / riz');
  });

  it('retire le préfixe "audio/{lang}/" (la langue ne distingue pas le contenu) et l\'extension', () => {
    expect(derivePlaceholderLabel('audio/fon/produits/riz.mp3')).toBe('produits / riz');
  });

  it("gère les chemins imbriqués d'un hashmap (clé/valeur)", () => {
    expect(derivePlaceholderLabel('images/marche_par_departement/oueme/ouando.jpeg'))
      .toBe('marche_par_departement / oueme / ouando');
  });
});
