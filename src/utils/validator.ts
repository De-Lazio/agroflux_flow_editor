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
  const isDynamic = flowData.variables || flowData.entry || flowData.audio_mappings;

  const audioKeys = new Set<string>();
  const audioFiles = new Set<string>();
  const imageFiles = new Set<string>();
  const usedVars = new Set<string>();

  if (isDynamic && !flowData.audio_mappings) {
    errors.push("Format DYNAMIQUE : L'objet 'audio_mappings' est manquant à la racine du JSON.");
  }

  nodeIds.forEach((id) => {
    const node = nodes[id];

    // Audio validation for Dynamic format
    if (isDynamic) {
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
          // Check for variables in sequence
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

      // Images in Result nodes
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

      // Validate JSON response contrat
      if (node.json_response_contrat) {
        try {
          JSON.parse(node.json_response_contrat);
        } catch (e) {
          errors.push(`Nœud "${id}" : Le champ 'json_response_contrat' n'est pas un JSON valide.`);
        }
      }

      // Validate response examples
      if (node.response_examples && Array.isArray(node.response_examples)) {
        node.response_examples.forEach((ex: string, idx: number) => {
          try {
            JSON.parse(ex);
          } catch (e) {
            errors.push(`Nœud "${id}" : L'exemple de réponse #${idx + 1} n'est pas un JSON valide.`);
          }
        });
      }
    } else {
      // Legacy audio
      if (node.audio?.context) {
        node.audio.context.forEach((a: string) => audioFiles.add(a));
      }
    }

    // Check options.next
    if (node.options) {
      if (node.options.length === 0 && (node.type === 'menu' || node.type === 'filter' || node.type === 'root')) {
        warnings.push(`Nœud "${id}" (${node.type}) n'a aucune option.`);
      }

      node.options.forEach((option: any) => {
        if (option.image) imageFiles.add(option.image);
        if (option.audio) {
          if (Array.isArray(option.audio)) option.audio.forEach((a: string) => audioFiles.add(a));
          else audioFiles.add(option.audio);
        }
        
        if (option.next && !nodeIds.includes(option.next)) {
          errors.push(`Nœud "${id}" : L'option "${option.label || option.id}" pointe vers un ID inexistant "${option.next}".`);
        }
      });
    }

    if (node.image) imageFiles.add(node.image);
    if (node.audio_prompt) audioFiles.add(node.audio_prompt);
    if (node.audio_sequence) {
      if (Array.isArray(node.audio_sequence)) node.audio_sequence.forEach((a: string) => audioFiles.add(a));
    }

    // Check next_filter
    if (node.next_filter && !nodeIds.includes(node.next_filter)) {
      errors.push(`Nœud "${id}" : next_filter pointe vers un ID inexistant "${node.next_filter}".`);
    }

    // Next check for dynamic
    if (isDynamic && node.next && !nodeIds.includes(node.next)) {
      errors.push(`Nœud "${id}" : next pointe vers un ID inexistant "${node.next}".`);
    }

    // Orphan check (except root)
    if (id !== 'root' && id !== flowData.entry) {
      const isTarget = nodeIds.some((otherId) => {
        const otherNode = nodes[otherId];
        const inOptions = otherNode.options?.some((opt: any) => opt.next === id);
        const inNextFilter = otherNode.next_filter === id;
        const inNext = otherNode.next === id;
        return inOptions || inNextFilter || inNext;
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
