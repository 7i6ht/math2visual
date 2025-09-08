/**
 * Parser moved to './dsl-parser'
 */
import type { DSLNode } from './dsl-parser';
import { parseDSLWithPositions } from './dsl-parser';

/**
 * Find the most specific DSL path for a given cursor position
 */
export function findDSLPathAtPosition(dslText: string, cursorOffset: number): string | null {
  // Validate offset is within text bounds; caret at end is out-of-bounds for mapping
  if (cursorOffset < 0 || cursorOffset >= dslText.length) {
    return null;
  }
  
  const rootNode = parseDSLWithPositions(dslText);
  const result = findPathInNode(rootNode, cursorOffset);
  return result;
}

/**
 * Recursively find the most specific path containing the cursor position
 */
function findPathInNode(node: DSLNode, offset: number): string | null {
  // Check if offset is within this node's range
  if (offset < node.startOffset || offset >= node.endOffset) {
    // Don't return null immediately - check if this node has children that might contain the offset
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const childPath = findPathInNode(child, offset);
        if (childPath) {
          return childPath;
        }
      }
    }
    return null;
  }

  // Check children for more specific match
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      const childPath = findPathInNode(child, offset);
      if (childPath) {
        return childPath;
      }
    }
  }

  // Return this node's path if no more specific child found
  return node.path;
}


/**
 * Print the DSL tree with a custom formatter for better readability
 */
export function printDSLTreeFormatted(node: DSLNode, indent: string = ''): string {
  // Derive a display hint from the path suffix
  let hint = '';
  if (node.path.endsWith('/operation') || node.path === 'operation') {
    // operation name is not stored anymore; just mark as operation
    hint = '(op)';
  } else if (/\/entities\[\d+\]$/.test(node.path)) {
    hint = '[entity]';
  } else if (/\/(entity_name|entity_type|entity_quantity|container_name|container_type|attr_name|attr_type)(\[\d+\])?$/.test(node.path)) {
    hint = '"prop"';
  }
  
  let result = `${indent}${node.path} ${hint} [${node.startOffset}-${node.endOffset}]\n`;
  
  if (node.children && node.children.length > 0) {
    const childrenSorted = [...node.children].sort((a, b) => a.startOffset - b.startOffset);
    childrenSorted.forEach(child => {
      result += printDSLTreeFormatted(child, indent + '  ');
    });
  }
  
  return result;
}

