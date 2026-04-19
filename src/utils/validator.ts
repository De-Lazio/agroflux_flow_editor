export const validateFlow = (flowData: any) => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const nodes = flowData.nodes;
  const nodeIds = Object.keys(nodes);

  nodeIds.forEach((id) => {
    const node = nodes[id];

    // Check options.next
    if (node.options) {
      if (node.options.length === 0 && (node.type === 'menu' || node.type === 'filter')) {
        warnings.push(`Nœud "${id}" (${node.type}) n'a aucune option.`);
      }

      node.options.forEach((option: any) => {
        if (option.next && !nodeIds.includes(option.next)) {
          errors.push(`Nœud "${id}" : L'option "${option.label}" pointe vers un ID inexistant "${option.next}".`);
        }
      });
    }

    // Check next_filter
    if (node.next_filter && !nodeIds.includes(node.next_filter)) {
      errors.push(`Nœud "${id}" : next_filter pointe vers un ID inexistant "${node.next_filter}".`);
    }

    // Orphan check (except root)
    if (id !== 'root') {
      const isTarget = nodeIds.some((otherId) => {
        const otherNode = nodes[otherId];
        const inOptions = otherNode.options?.some((opt: any) => opt.next === id);
        const inNextFilter = otherNode.next_filter === id;
        return inOptions || inNextFilter;
      });

      if (!isTarget) {
        warnings.push(`Nœud orphelin : "${id}" n'est référencé par aucun autre nœud.`);
      }
    }
  });

  return { errors, warnings };
};
