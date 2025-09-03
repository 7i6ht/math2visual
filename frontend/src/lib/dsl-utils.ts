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
      // Check entity name changes
      if (oldEntity.entityName !== newEntity.entityName) {
        changes.push({
          type: 'entity_name',
          oldValue: oldEntity.entityName,
          newValue: newEntity.entityName,
          entityPath: oldEntity.dslPath,
        });
      }
      
      // Check entity quantity changes
      if (oldEntity.entityQuantity !== newEntity.entityQuantity) {
        changes.push({
          type: 'entity_quantity',
          oldValue: oldEntity.entityQuantity.toString(),
          newValue: newEntity.entityQuantity.toString(),
          entityPath: oldEntity.dslPath,
        });
      }
      
      // Check container name changes
      if (oldEntity.containerName !== newEntity.containerName) {
        changes.push({
          type: 'container_name',
          oldValue: oldEntity.containerName,
          newValue: newEntity.containerName,
          entityPath: oldEntity.dslPath,
        });
      }
    }
  });
  
  return changes;
}

/**
 * Update MWP text based on DSL changes
 */
export function updateMWPText(mwpText: string, changes: DSLChange[]): string {
  let updatedText = mwpText;
  
  changes.forEach(change => {
    switch (change.type) {
      case 'entity_name':
        // Replace entity names in the text
        updatedText = replaceEntityNames(updatedText, change.oldValue, change.newValue);
        break;
        
      case 'entity_quantity':
        // Replace quantities in the text (handles both numeric and text forms)
        updatedText = replaceQuantities(updatedText, change.oldValue, change.newValue);
        break;
        
      case 'container_name':
        // Replace container names in the text
        updatedText = replaceContainerNames(updatedText, change.oldValue, change.newValue);
        break;
    }
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
