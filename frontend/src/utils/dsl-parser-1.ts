/**
 * DSL parser: builds a position-aware tree from DSL text
 */

export interface DSLNode {
  path: string;
  startOffset: number;
  endOffset: number;
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
      children: []
    };
  }

  // Root operation node range: only the operation name
  const opNameStart = operationMatch.index ?? 0;
  const opNameEnd = opNameStart + operationMatch[1].length;
  const rootNode: DSLNode = {
    path: 'operation',
    startOffset: opNameStart,
    endOffset: opNameEnd,
    children: []
  };

  // Parse the content recursively
  parseOperationContent(dslText, rootNode, dslText);

  return rootNode;
}

/**
 * Parse operation content and build the node tree
 */
function parseOperationContent(
  contentText: string,
  parentNode: DSLNode,
  fullDslText?: string,
  baseOffset: number = 0
) {
  // Extract content between parentheses (allow leading whitespace before op name)
  const contentMatch = contentText.match(/^\s*\w+\s*\(([\s\S]*)\)$/);
  if (!contentMatch) return;

  const content = contentMatch[1];
  const contentStartOffset = contentText.indexOf('(') + 1;
  const entities = splitEntities(content);

  // Track position within the extracted content deterministically
  let localCursor = 0;

  entities.forEach((entityStr, index) => {
    // Compute absolute start deterministically from local content cursor
    const entityStart = baseOffset + contentStartOffset + localCursor;

    if (isNestedOperation(entityStr)) {
      // Handle nested operation
      // Match against trimmed-left to allow leading indentation/newlines
      const trimmedLeft = entityStr.trimStart();
      const nestedOpMatch = trimmedLeft.match(/^(\w+)\s*\(/);
      if (nestedOpMatch) {
        // Nested operation node range: only the operation name
        // Skip any leading whitespace before the operation name within this entity string
        const leadingWhitespace = (entityStr.match(/^\s*/) || [''])[0].length;
        const opStart = entityStart + leadingWhitespace;
        const opEnd = opStart + nestedOpMatch[1].length;
        const nestedNode: DSLNode = {
          path: `${parentNode.path}/entities[${index}]/operation`,
          startOffset: opStart,
          endOffset: opEnd,
          children: []
        };
        parentNode.children!.push(nestedNode);
        // Recurse with absolute base offset for nested content
        parseOperationContent(
          entityStr,
          nestedNode,
          fullDslText || contentText,
          entityStart
        );
      }
    } else {
      // Parse regular entity
      const entityNode = parseEntityWithPosition(entityStr, index, entityStart, parentNode.path);
      if (entityNode) {
        parentNode.children!.push(entityNode);
      }
    }
    
    // Advance local cursor past this entity and the following comma if present
    localCursor += entityStr.length + 1;
  });
}

/**
 * Check if a string represents a nested operation
 */
function isNestedOperation(str: string): boolean {
  return /^\s*\w+\s*\(/.test(str);
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
      if (buffer.length > 0) entities.push(buffer);
      buffer = '';
    } else {
      buffer += char;
    }
  }

  if (buffer.length > 0) entities.push(buffer);

  return entities;
}

/**
 * Parse entity with position information
 */
function parseEntityWithPosition(
  entityStr: string, 
  index: number, 
  startOffset: number,
  parentPath: string
): DSLNode | null {
  const entityMatch = entityStr.trimStart().match(/^(\w+)\[([\s\S]*)\]$/);
  if (!entityMatch) return null;

  const [, , content] = entityMatch;
  const entityPath = `${parentPath}/entities[${index}]`;

  const entityNode: DSLNode = {
    path: entityPath,
    startOffset,
    endOffset: startOffset + entityStr.length,
    children: []
  };

  // Parse properties within the entity
  const rawProps = content.split(','); // keep raw to preserve whitespace
  // Absolute offset to just after '[' in the original entityStr (preserves leading whitespace before entity)
  let propOffset = startOffset + entityStr.indexOf('[') + 1;

  rawProps.forEach((rawProp) => {
    const prop = rawProp; // raw, includes original whitespace
    if (prop.includes(':')) {
      const [keyRaw, valueRaw] = prop.split(':', 2);
      const key = keyRaw.trim();
      const value = valueRaw.trim();

      // Find the exact position of this property in the original string
      const propStart = startOffset + entityStr.indexOf(prop, propOffset - startOffset);
      const propEnd = propStart + prop.length;

      const propNode: DSLNode = {
        path: `${entityPath}/${key}`,
        startOffset: propStart,
        endOffset: propEnd,
        children: []
      };

      // Optional: add child nodes for entity_type lists, mapped to same line
      if (key === 'entity_type' && value.includes(',')) {
        const types = value.split(',').map(t => t.trim());
        types.forEach((_, typeIndex) => {
          propNode.children!.push({
            path: `${entityPath}/${key}[${typeIndex}]`,
            startOffset: propStart,
            endOffset: propEnd,
            children: []
          });
        });
      }

      entityNode.children!.push(propNode);

      // Advance to just after this property's text plus the comma.
      // We already computed propStart/propEnd from the original string, so reuse them.
      propOffset = propEnd + 1;
    } else {
      // No key:value found; advance by raw token length + comma
      propOffset += prop.length + 1;
    }
  });

  return entityNode;
}


