import { numberToWord } from '@/utils/numberUtils';

/**
 * DSL parsing and MWP text update utilities
 * Handles bidirectional synchronization between DSL and MWP text
 */

export interface EntityInfo {
  entityName: string;
  entityQuantity: number;
  containerName: string;
  dslPath: string;
}

export interface DSLChange {
  type: 'entity_name' | 'entity_quantity' | 'container_name';
  oldValue: string;
  newValue: string;
  entityPath: string;
}

/**
 * Parse DSL string to extract entity information (supports nested structures)
 */
export function parseDSLEntities(dsl: string): EntityInfo[] {
  const entities: EntityInfo[] = [];
  
  try {
    // Remove the operation wrapper and extract entities (support multi-line with [\s\S]*)
    const operationMatch = dsl.match(/^(\w+)\s*\(([\s\S]*)\)$/);
    if (!operationMatch) return entities;
    
    const [, , content] = operationMatch;
    const entityStrings = splitEntities(content);
    
    // Recursively parse entities, handling nested operations
    entityStrings.forEach((entityStr, index) => {
      if (isNestedOperation(entityStr)) {
        // Recursively parse nested operations
        const nestedEntities = parseDSLEntities(entityStr);
        nestedEntities.forEach(nestedEntity => {
          // Update the path to reflect nesting
          nestedEntity.dslPath = `entities[${index}]/${nestedEntity.dslPath}`;
          entities.push(nestedEntity);
        });
      } else {
        // Parse regular entity
        const entity = parseEntity(entityStr, index);
        if (entity) {
          entities.push(entity);
        }
      }
    });
  } catch (error) {
    console.warn('Failed to parse DSL:', error);
    }
  
  return entities;
}

/**
 * Check if a string represents a nested operation
 */
function isNestedOperation(str: string): boolean {
  // Look for patterns like "operation(...)" 
  return /^\w+\s*\(/.test(str.trim());
}

/**
 * Split entity strings while respecting brackets and parentheses
 */
function splitEntities(content: string): string[] {
  const entities: string[] = [];
  let balance = 0;
  let buffer = '';
  
  for (const char of content) {
    if (char === '[' || char === '(') balance++;
    if (char === ']' || char === ')') balance--;
    
    if (char === ',' && balance === 0) {
      entities.push(buffer.trim());
      buffer = '';
    } else {
      buffer += char;
    }
  }
  
  if (buffer.trim()) {
    entities.push(buffer.trim());
  }
  
  return entities;
}

/**
 * Parse individual entity string
 */
function parseEntity(entityStr: string, index: number): EntityInfo | null {
  try {
    // Support multi-line entity blocks with [\s\S]* inside brackets
    const entityMatch = entityStr.match(/^(\w+)\[([\s\S]*)\]$/);
    if (!entityMatch) return null;
    
    const [, , content] = entityMatch;
    const parts = content.split(',').map(p => p.trim());
    
    const entity: Partial<EntityInfo> = {
      dslPath: `entities[${index}]`,
    };
    
    parts.forEach(part => {
      if (part.includes(':')) {
        const [key, value] = part.split(':', 2).map(s => s.trim());
        
        switch (key) {
          case 'entity_name':
            entity.entityName = value;
            break;
          case 'entity_quantity':
            entity.entityQuantity = parseFloat(value) || 0;
            break;
          case 'container_name':
            entity.containerName = value;
            break;
        }
      }
    });
    
    // Ensure required fields exist
    if (entity.entityName !== undefined) {
      return entity as EntityInfo;
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to parse entity:', entityStr, error);
    return null;
  }
}

/**
 * Detect changes between old and new DSL (supports nested structures)
 */
export function detectDSLChanges(oldDSL: string, newDSL: string): DSLChange[] {
  const oldEntities = parseDSLEntities(oldDSL);
  const newEntities = parseDSLEntities(newDSL);
  const changes: DSLChange[] = [];
  
  // Check for changes in existing entities
  oldEntities.forEach(oldEntity => {
    const newEntity = newEntities.find(e => e.dslPath === oldEntity.dslPath);
    if (newEntity) {
      const fields: Array<{ type: DSLChange['type']; oldVal: unknown; newVal: unknown; stringify?: boolean }>= [
        { type: 'entity_name', oldVal: oldEntity.entityName, newVal: newEntity.entityName },
        { type: 'entity_quantity', oldVal: oldEntity.entityQuantity, newVal: newEntity.entityQuantity, stringify: true },
        { type: 'container_name', oldVal: oldEntity.containerName, newVal: newEntity.containerName },
      ];

      fields.forEach(({ type, oldVal, newVal, stringify }) => {
        if (oldVal !== newVal) {
          changes.push({
            type,
            oldValue: stringify ? String(oldVal) : String(oldVal ?? ''),
            newValue: stringify ? String(newVal) : String(newVal ?? ''),
            entityPath: oldEntity.dslPath,
          });
        }
      });
    }
  });
  
  return changes;
}

/**
 * Update MWP text based on DSL changes
 */
export function updateMWPText(mwpText: string, changes: DSLChange[]): string {
  let updatedText = mwpText;
  
  const handlers: Record<DSLChange["type"], (t: string, o: string, n: string) => string> = {
    entity_name: (t, o, n) => replaceEntityNames(t, o, n),
    entity_quantity: (t, o, n) => replaceQuantities(t, o, n),
    container_name: (t, o, n) => replaceContainerNames(t, o, n),
  };

  changes.forEach(({ type, oldValue, newValue }) => {
    updatedText = handlers[type](updatedText, oldValue, newValue);
  });
  
  return updatedText;
}

/**
 * Replace entity names in MWP text
 */
function replaceEntityNames(text: string, oldName: string, newName: string): string {
  // Simple approach: match the base word with optional trailing 's' (plural)
  // Mirrors the pattern used in useHighlighting.ts for container names
  const escaped = escapeRegex(oldName);
  const regex = new RegExp(`\\b(${escaped})(s?)\\b`, 'gi');
  return text.replace(regex, (_match, _base: string, plural: string) => {
    return plural ? `${newName}s` : newName;
  });
}

/**
 * Replace quantities in MWP text (handles both numeric and text forms)
 */
function replaceQuantities(text: string, oldQuantity: string, newQuantity: string): string {
  const oldNum = parseFloat(oldQuantity);
  const newNum = parseFloat(newQuantity);
  
  if (isNaN(oldNum) || isNaN(newNum)) {
    // If either value isn't a number, do simple text replacement
    const regex = new RegExp(`\\b${escapeRegex(oldQuantity)}\\b`, 'gi');
    return text.replace(regex, newQuantity);
  }
  
  // Convert numbers to text form for better MWP readability
  const oldText = numberToWord(oldNum);
  const newText = numberToWord(newNum);
  
  // Replace both numeric and text forms
  let updatedText = text;
  
  // Replace numeric form
  const numericRegex = new RegExp(`\\b${escapeRegex(oldQuantity)}\\b`, 'gi');
  updatedText = updatedText.replace(numericRegex, newQuantity);
  
  // Replace text form
  const textRegex = new RegExp(`\\b${escapeRegex(oldText)}\\b`, 'gi');
  updatedText = updatedText.replace(textRegex, newText);
  
  return updatedText;
}

/**
 * Replace container names in MWP text
 */
function replaceContainerNames(text: string, oldName: string, newName: string): string {
  // Use word boundaries to avoid partial replacements
  const regex = new RegExp(`\\b${escapeRegex(oldName)}\\b`, 'gi');
  return text.replace(regex, newName);
}

/**
 * Escape special regex characters
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
}
