export const validateFlow = (flowData: any) => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const report: { audios: string[], images: string[], variables: string[] } = {
    audios: [],
    images: [],
    variables: []
  };

  const nodes = flowData.nodes;
  const nodeIds = Object.keys(nodes);

  const audioKeys = new Set<string>();
  const audioFiles = new Set<string>();
  const imageFiles = new Set<string>();
  const usedVars = new Set<string>();

  if (!flowData.audio_mappings) {
    errors.push("L'objet 'audio_mappings' est manquant à la racine du JSON.");
  }

  nodeIds.forEach((id) => {
    const node = nodes[id];

    // Validation de l'objet audio
    if (!node.audio) {
      errors.push(`Nœud "${id}" : L'objet 'audio' est manquant.`);
    } else {
      if (!node.audio.key) {
        errors.push(`Nœud "${id}" : 'audio.key' est manquant.`);
      } else if (audioKeys.has(node.audio.key)) {
        errors.push(`Nœud "${id}" : La clé audio '${node.audio.key}' est déjà utilisée par un autre nœud.`);
      } else {
        audioKeys.add(node.audio.key);
      }

      if (!node.audio.sequence || node.audio.sequence.length === 0) {
        warnings.push(`Nœud "${id}" : La séquence audio est vide.`);
      } else {
        node.audio.sequence.forEach((item: string) => {
          if (!item) return;
          const match = item.match(/\{([^}:]+)(?::[^}]+)?\}/);
          if (match) {
            const varName = match[1];
            usedVars.add(varName);
            if (flowData.audio_mappings && !flowData.audio_mappings[varName]) {
              warnings.push(`Nœud "${id}" : La variable audio "{${varName}}" n'est pas définie dans 'audio_mappings'.`);
            }
          } else {
            audioFiles.add(item);
          }
        });
      }
      if (node.audio.fallback) audioFiles.add(node.audio.fallback);
    }

    // Images référencées dans les nœuds Result (via le champ comment)
    if (node.type === 'result' && node.comment) {
      try {
        const matches = node.comment.match(/"image":\s*"([^"]+)"/g);
        if (matches) {
          matches.forEach((m: string) => {
            const img = m.match(/"image":\s*"([^"]+)"/)?.[1];
            if (img) imageFiles.add(img);
          });
        }
      } catch (e) { /* ignore */ }
    }

    if (node.options_source) usedVars.add(node.options_source);
    if (node.set) usedVars.add(node.set);
    if (node.cle) usedVars.add(node.cle);

    // Validation du contrat de réponse JSON
    if (node.json_response_contrat) {
      try {
        JSON.parse(node.json_response_contrat);
      } catch (e) {
        errors.push(`Nœud "${id}" : Le champ 'json_response_contrat' n'est pas un JSON valide.`);
      }
    }

    // Validation des exemples de réponse
    if (node.response_examples && Array.isArray(node.response_examples)) {
      node.response_examples.forEach((ex: string, idx: number) => {
        try {
          JSON.parse(ex);
        } catch (e) {
          errors.push(`Nœud "${id}" : L'exemple de réponse #${idx + 1} n'est pas un JSON valide.`);
        }
      });
    }

    // Options (nœud root)
    if (node.options) {
      if (node.options.length === 0 && node.type === 'root') {
        warnings.push(`Nœud "${id}" (${node.type}) n'a aucune option.`);
      }

      node.options.forEach((option: any) => {
        if (option.next && !nodeIds.includes(option.next)) {
          errors.push(`Nœud "${id}" : L'option "${option.id}" pointe vers un ID inexistant "${option.next}".`);
        }
      });
    }

    // Lien next (grid, calendrier, pre_filter)
    if (node.next && !nodeIds.includes(node.next)) {
      errors.push(`Nœud "${id}" : next pointe vers un ID inexistant "${node.next}".`);
    }

    // Nœud orphelin (sauf point d'entrée)
    if (id !== flowData.entry) {
      const isTarget = nodeIds.some((otherId) => {
        const otherNode = nodes[otherId];
        const inOptions = otherNode.options?.some((opt: any) => opt.next === id);
        const inNext = otherNode.next === id;
        return inOptions || inNext;
      });

      if (!isTarget) {
        warnings.push(`Nœud orphelin : "${id}" n'est référencé par aucun autre nœud.`);
      }
    }
  });

  report.audios = Array.from(audioFiles).sort();
  report.images = Array.from(imageFiles).sort();
  report.variables = Array.from(usedVars).sort();

  return { errors, warnings, report };
};
