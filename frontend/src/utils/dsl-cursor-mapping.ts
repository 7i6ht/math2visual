/**
 * Utility for mapping cursor positions in DSL editor to DSL paths
 * This enables highlighting of visual elements when editing specific DSL lines
 */

interface DSLNode {
  path: string;
  startOffset: number;
  endOffset: number;
  type: 'operation' | 'entity' | 'property' | 'container';
  value?: string;
  children?: DSLNode[];
}

/**
 * Parse DSL text into a tree structure with position information
 */
export function parseDSLWithPositions(dslText: string): DSLNode {
  // Find the root operation
  const operationMatch = dslText.match(/^(\w+)\s*\(/m);
  if (!operationMatch) {
    return {
      path: '/',
      startOffset: 0,
      endOffset: dslText.length,
      type: 'operation',
      children: []
    };
  }
  
  const operationType = operationMatch[1];
  const rootNode: DSLNode = {
    path: 'operation',
    startOffset: 0,
    endOffset: dslText.length,
    type: 'operation',
    value: operationType,
    children: []
  };
  
  // Parse the content recursively
  parseOperationContent(dslText, rootNode, dslText);
  
  return rootNode;
}

/**
 * Parse operation content and build the node tree
 */
function parseOperationContent(contentText: string, parentNode: DSLNode, fullDslText?: string) {
  // Extract content between parentheses
  const contentMatch = contentText.match(/^\w+\s*\(([\s\S]*)\)$/);
  if (!contentMatch) return;
  
  const content = contentMatch[1];
  const contentStartOffset = contentText.indexOf('(') + 1;
  const entities = splitEntities(content);
  
  let currentOffset = 0; // Offset within the content string
  
  entities.forEach((entityStr, index) => {
    const entityStart = contentStartOffset + currentOffset;
    const entityEnd = entityStart + entityStr.length;
    
    if (isNestedOperation(entityStr)) {
      // Handle nested operation
      const nestedOpMatch = entityStr.match(/^(\w+)\s*\(/);
      if (nestedOpMatch) {
        const nestedNode: DSLNode = {
          path: `${parentNode.path}/entities[${index}]/operation`,
          startOffset: entityStart,
          endOffset: entityEnd,
          type: 'operation',
          value: nestedOpMatch[1],
          children: []
        };
        parentNode.children!.push(nestedNode);
        parseOperationContent(entityStr, nestedNode, fullDslText || contentText);
      }
    } else {
      // Parse regular entity
      const dslTextForEntity = fullDslText || contentText;
      const entityNode = parseEntityWithPosition(entityStr, index, entityStart, parentNode.path, dslTextForEntity);
      if (entityNode) {
        parentNode.children!.push(entityNode);
      }
    }
    
    currentOffset += entityStr.length;
    // Add comma length if not the last entity
    if (index < entities.length - 1) {
      currentOffset += 1; // +1 for comma
    }
  });
}

/**
 * Check if a string represents a nested operation
 */
function isNestedOperation(str: string): boolean {
  return /^\w+\s*\(/.test(str.trim());
}

/**
 * Split entities while respecting brackets and parentheses
 */
function splitEntities(content: string): string[] {
  const entities: string[] = [];
  let balance = 0;
  let buffer = '';
  
  for (const char of content) {
    if (char === '[' || char === '(') balance++;
    if (char === ']' || char === ')') balance--;
    
    if (char === ',' && balance === 0) {
      const trimmed = buffer.trim();
      if (trimmed) entities.push(trimmed);
      buffer = '';
    } else {
      buffer += char;
    }
  }
  
  const trimmed = buffer.trim();
  if (trimmed) entities.push(trimmed);
  
  return entities;
}

/**
 * Parse entity with position information
 */
function parseEntityWithPosition(
  entityStr: string, 
  index: number, 
  startOffset: number,
  parentPath: string,
  dslText: string
): DSLNode | null {
  const entityMatch = entityStr.match(/^(\w+)\[([\s\S]*)\]$/);
  if (!entityMatch) return null;
  
  const [, entityType, content] = entityMatch;
  const entityPath = `${parentPath}/entities[${index}]`;
  
  const entityNode: DSLNode = {
    path: entityPath,
    startOffset,
    endOffset: startOffset + entityStr.length,
    type: entityType === 'result_container' ? 'container' : 'entity',
    value: entityType,
    children: []
  };
  
  // Parse properties within the entity
  const properties = content.split(',').map(p => p.trim());
  let propOffset = startOffset + entityType.length + 1; // +1 for '['
  
  
  properties.forEach((prop) => {
    if (prop.includes(':')) {
      const [key, value] = prop.split(':', 2).map(s => s.trim());
      
      // Find the exact position of this property in the original string
      const propStart = startOffset + entityStr.indexOf(prop, propOffset - startOffset);
      const propEnd = propStart + prop.length;
    

      // Find the position of the key and value separately
      const colonPos = propStart + prop.indexOf(':');
      const valueStart = colonPos + 1;
      
      // Calculate line-based range for the property
      // Find the start of the line containing this property
      const textBeforeProp = dslText.substring(0, propStart);
      const lastNewlineBeforeProp = textBeforeProp.lastIndexOf('\n');
      const lineStart = lastNewlineBeforeProp + 1;
      
      // Find the end of the line containing this property
      const textAfterProp = dslText.substring(propEnd);
      const nextNewlineAfterProp = textAfterProp.indexOf('\n');
      const lineEnd = nextNewlineAfterProp === -1 ? dslText.length : propEnd + nextNewlineAfterProp;
      
      // Add property node with line-based range
      const propNode: DSLNode = {
        path: `${entityPath}/${key}`,
        startOffset: lineStart,
        endOffset: lineEnd,
        type: 'property',
        value: value,
        children: []
      };
      
      // Special handling for entity_type properties that might have array indices
      if (key === 'entity_type' && value.includes(',')) {
        // Multiple entity types
        const types = value.split(',').map(t => t.trim());
        let typeOffset = valueStart;
        types.forEach((type, typeIndex) => {
          const typeStart = startOffset + entityStr.indexOf(type, typeOffset - startOffset);
          
          propNode.children!.push({
            path: `${entityPath}/${key}[${typeIndex}]`,
            startOffset: lineStart, // Use line-based range for child properties too
            endOffset: lineEnd,
            type: 'property',
            value: type
          });
          
          typeOffset = typeStart + type.length;
        });
      }
      
      entityNode.children!.push(propNode);
    }
    
    propOffset += prop.length + 1; // +1 for the comma
  });
  
  return entityNode;
}

/**
 * Find the most specific DSL path for a given cursor position
 */
export function findDSLPathAtPosition(dslText: string, cursorOffset: number): string | null {
  // Validate offset is within text bounds; caret at end is out-of-bounds for mapping
  if (cursorOffset < 0 || cursorOffset >= dslText.length) {
    return null;
  }
  const rootNode = parseDSLWithPositions(dslText);
  //console.log(printDSLTreeFormatted(rootNode));
  return findPathInNode(rootNode, cursorOffset);
}

/**
 * Recursively find the most specific path containing the cursor position
 */
function findPathInNode(node: DSLNode, offset: number): string | null {
  // Check if offset is within this node's range
  if (offset < node.startOffset || offset >= node.endOffset) {
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
  const typeInfo = node.type === 'operation' ? `(${node.value})` : 
                   node.type === 'entity' ? `[${node.value}]` :
                   node.type === 'container' ? `[${node.value}]` :
                   `"${node.value}"`;
  
  let result = `${indent}${node.path} ${typeInfo} [${node.startOffset}-${node.endOffset}]\n`;
  
  if (node.children && node.children.length > 0) {
    node.children.forEach(child => {
      result += printDSLTreeFormatted(child, indent + '  ');
    });
  }
  
  return result;
}

