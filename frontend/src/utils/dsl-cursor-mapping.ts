/**
 * DSL Cursor Mapping
 */

/**
 * Find the most specific DSL path for a given cursor position using component mappings
 */
export function findDSLPathAtPosition(componentMappings: Record<string, any>, cursorOffset: number): string | null {
  // Validate offset bounds
  if (cursorOffset < 0) {
    return null;
  }

  // Find all ranges that contain the cursor position
  const containingRanges = Object.entries(componentMappings)
    .filter(([_, range]) => 
      cursorOffset >= range.dsl_range[0] && cursorOffset < range.dsl_range[1]
    )
    .map(([dslPath, range]) => ({ dslPath, range }));

  if (containingRanges.length === 0) {
    return null;
  }

  // Sort by range size (smallest first) to get the most specific match
  // In case of ties, prefer the one that starts later (more specific)
  containingRanges.sort((a, b) => {
    const sizeA = a.range.dsl_range[1] - a.range.dsl_range[0];
    const sizeB = b.range.dsl_range[1] - b.range.dsl_range[0];
    if (sizeA === sizeB) {
      return b.range.dsl_range[0] - a.range.dsl_range[0]; // Later start is more specific
    }
    return sizeA - sizeB; // Smaller size is more specific
  });

  return containingRanges[0].dslPath;
}

/**
 * Print formatted tree structure
 */
export function printDSLTreeFormatted(componentMappings: Record<string, any>): string {
  // Sort mappings by start position for tree-like output
  const sortedMappings = Object.entries(componentMappings)
    .map(([dslPath, range]) => ({ dslPath, range }))
    .sort((a, b) => a.range.dsl_range[0] - b.range.dsl_range[0]);
  
  let result = '';
  for (const mapping of sortedMappings) {
    // Derive display hint from the path suffix
    let hint = '';
    if (mapping.dslPath.endsWith('/operation') || mapping.dslPath === 'operation') {
      hint = '(op)';
    } else if (/\/entities\[\d+\]$/.test(mapping.dslPath)) {
      hint = '[entity]';
    } else if (/\/(entity_name|entity_type|entity_quantity|container_name|container_type|attr_name|attr_type)(\[\d+\])?$/.test(mapping.dslPath)) {
      hint = '"prop"';
    }

    const pathDepth = mapping.dslPath.split('/').length - 1;
    const nodeIndent = '  '.repeat(pathDepth);
    result += `${nodeIndent}${mapping.dslPath} ${hint} [${mapping.range.dsl_range[0]}-${mapping.range.dsl_range[1]}]`;
    result += '\n';
  }
  
  return result;
}