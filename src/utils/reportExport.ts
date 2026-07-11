import type { ValidationResult } from '../types/flow';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const markdownList = (items: string[], asCode = false): string => {
  if (items.length === 0) return '_Aucune._';
  return items.map((item) => `- ${asCode ? `\`${item}\`` : item}`).join('\n');
};

const htmlList = (items: string[], asCode = false): string => {
  if (items.length === 0) return '<p><em>Aucune.</em></p>';
  const rendered = (item: string) => (asCode ? `<code>${escapeHtml(item)}</code>` : escapeHtml(item));
  return `<ul>${items.map((item) => `<li>${rendered(item)}</li>`).join('')}</ul>`;
};

export const exportReportAsJson = (result: ValidationResult): string =>
  JSON.stringify(result, null, 2);

export const exportReportAsMarkdown = (result: ValidationResult): string => {
  const { errors, warnings, report } = result;

  return [
    '# Rapport de validation — AgroFlux Studio',
    '',
    `Généré le ${new Date().toISOString()}`,
    '',
    `## Erreurs bloquantes (${errors.length})`,
    '',
    markdownList(errors),
    '',
    `## Avertissements (${warnings.length})`,
    '',
    markdownList(warnings),
    '',
    '## Inventaire de ressources',
    '',
    `### Audios (${report.audios.length})`,
    '',
    markdownList(report.audios, true),
    '',
    `### Images (${report.images.length})`,
    '',
    markdownList(report.images, true),
    '',
    `### Variables utilisées (${report.variables.length})`,
    '',
    markdownList(report.variables.map((v) => `{${v}}`), true),
    ''
  ].join('\n');
};

export const exportReportAsHtml = (result: ValidationResult): string => {
  const { errors, warnings, report } = result;

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Rapport de validation — AgroFlux Studio</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; color: #1e293b; line-height: 1.5; }
  h1 { border-bottom: 2px solid #6366f1; padding-bottom: .5rem; }
  h2 { margin-top: 2rem; }
  code { background: #f1f5f9; padding: .1rem .35rem; border-radius: .25rem; font-size: .9em; }
  .errors li { color: #b91c1c; }
  .warnings li { color: #b45309; }
</style>
</head>
<body>
<h1>Rapport de validation — AgroFlux Studio</h1>
<p>Généré le ${new Date().toISOString()}</p>

<h2>Erreurs bloquantes (${errors.length})</h2>
<div class="errors">${htmlList(errors)}</div>

<h2>Avertissements (${warnings.length})</h2>
<div class="warnings">${htmlList(warnings)}</div>

<h2>Inventaire de ressources</h2>
<h3>Audios (${report.audios.length})</h3>
${htmlList(report.audios, true)}
<h3>Images (${report.images.length})</h3>
${htmlList(report.images, true)}
<h3>Variables utilisées (${report.variables.length})</h3>
${htmlList(report.variables.map((v) => `{${v}}`), true)}
</body>
</html>
`;
};
