import { numberToWord } from '@/utils/numberUtils';
import type { ParsedOperation, ParsedEntity } from '@/utils/dsl-parser';

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
 * Parse DSL object to extract entity information (supports nested structures)
 */
export function parseDSLEntities(parsedDSL: ParsedOperation): EntityInfo[] {
  const entities: EntityInfo[] = [];
  
  try {
    // Recursively extract entities from the parsed DSL object
    extractEntitiesRecursive(parsedDSL, entities);
  } catch (error) {
    console.warn('Failed to parse DSL entities:', error);
  }
  
  return entities;
}

/**
 * Recursively extract entities from parsed DSL structure
 */
function extractEntitiesRecursive(operation: ParsedOperation, entities: EntityInfo[], parentPath: string = ''): void {
  const operationPath = parentPath ? `${parentPath}/operation` : 'operation';
  
  // Process all entities in this operation
  if (!operation.entities || !Array.isArray(operation.entities)) {
    console.warn('Operation entities is not an array:', operation);
    return;
  }
  
  operation.entities.forEach((entity, index) => {
    const entityPath = `${operationPath}/entities[${index}]`;
    
    if ('operation' in entity) {
      // This is a nested operation, recurse
      extractEntitiesRecursive(entity as ParsedOperation, entities, entityPath);
    } else {
      // This is a regular entity
      const parsedEntity = entity as ParsedEntity;
      const entityInfo = extractEntityInfo(parsedEntity, entityPath);
      if (entityInfo) {
        entities.push(entityInfo);
      }
    }
  });
  
  // Process result container if it exists
  if (operation.result_container) {
    const resultPath = `${operationPath}/result_container`;
    const entityInfo = extractEntityInfo(operation.result_container, resultPath);
    if (entityInfo) {
      entities.push(entityInfo);
    }
  }
}

/**
 * Extract entity information from a ParsedEntity
 */
function extractEntityInfo(entity: ParsedEntity, dslPath: string): EntityInfo | null {
  try {
    // Get entity name - try multiple possible locations
    const entityName = entity.entity_name || entity.name || '';
    
    // Get entity quantity - try multiple possible locations
    const entityQuantity = entity.entity_quantity || entity.item?.entity_quantity || 0;
    
    // Get container name
    const containerName = entity.container_name || '';
    
    if (entityName) {
      return {
        entityName,
        entityQuantity,
        containerName,
        dslPath,
      };
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to extract entity info:', entity, error);
    return null;
  }
}


/**
 * Detect changes between old and new parsed DSL objects (supports nested structures)
 */
export function detectDSLChanges(oldParsedDSL: ParsedOperation, newParsedDSL: ParsedOperation): DSLChange[] {
  const oldEntities = parseDSLEntities(oldParsedDSL);
  const newEntities = parseDSLEntities(newParsedDSL);
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
