// Déclenche le téléchargement d'un contenu texte via un data URI — pas d'appel
// serveur, tout reste côté navigateur (cohérent avec le reste du Studio).
export const downloadTextFile = (content: string, filename: string, mimeType: string): void => {
  const dataStr = `data:${mimeType};charset=utf-8,` + encodeURIComponent(content);
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute('href', dataStr);
  downloadAnchorNode.setAttribute('download', filename);
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
};
