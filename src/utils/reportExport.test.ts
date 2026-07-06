import { describe, it, expect } from 'vitest';
import { exportReportAsJson, exportReportAsMarkdown, exportReportAsHtml } from './reportExport';
import type { ValidationResult } from '../types/flow';

const sampleResult: ValidationResult = {
  errors: ['Nœud "result_1" : erreur <injectée> & "citée"'],
  warnings: ['Nœud "grid_1" : avertissement'],
  report: {
    audios: ['audio/fon/produits/mais.mp3'],
    images: ['images/produits/mais.jpeg'],
    variables: ['produit'],
    variableResources: { audios: ['audio/fon/produits/mais.mp3'], images: ['images/produits/mais.jpeg'] },
    hashmapResources: { audios: [], images: [] }
  }
};

const emptyResult: ValidationResult = {
  errors: [],
  warnings: [],
  report: { audios: [], images: [], variables: [], variableResources: { audios: [], images: [] }, hashmapResources: { audios: [], images: [] } }
};

describe('exportReportAsJson', () => {
  it('sérialise fidèlement le résultat complet (erreurs, avertissements, rapport)', () => {
    const parsed = JSON.parse(exportReportAsJson(sampleResult));
    expect(parsed).toEqual(sampleResult);
  });
});

describe('exportReportAsMarkdown', () => {
  it('inclut les erreurs, avertissements et l\'inventaire', () => {
    const md = exportReportAsMarkdown(sampleResult);
    expect(md).toContain('erreur <injectée> & "citée"');
    expect(md).toContain('Nœud "grid_1" : avertissement');
    expect(md).toContain('audio/fon/produits/mais.mp3');
    expect(md).toContain('images/produits/mais.jpeg');
    expect(md).toContain('{produit}');
  });

  it('signale explicitement l\'absence d\'erreurs/avertissements plutôt que de laisser une section vide', () => {
    const md = exportReportAsMarkdown(emptyResult);
    expect(md).toContain('_Aucune._');
  });
});

describe('exportReportAsHtml', () => {
  it('échappe le contenu utilisateur pour éviter toute injection dans le HTML exporté', () => {
    const html = exportReportAsHtml(sampleResult);
    expect(html).not.toContain('<injectée>');
    expect(html).toContain('&lt;injectée&gt;');
  });

  it('produit un document HTML autonome avec le rapport', () => {
    const html = exportReportAsHtml(sampleResult);
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('audio/fon/produits/mais.mp3');
  });
});
