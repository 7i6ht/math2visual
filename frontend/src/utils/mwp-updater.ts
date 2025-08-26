interface EntityMapping {
  text: string;
  startPos: number;
  endPos: number;
  componentId: string; // Note: This is actually a DSL path, keeping name for compatibility
  type: 'quantity' | 'name' | 'container';
  propertyKey: string;
}

export class MWPUpdater {
  /**
   * Extract entity mappings from MWP text using pattern matching
   */
  static extractEntityMappings(
    mwpText: string,
    componentMappings: Record<string, any>
  ): EntityMapping[] {
    const mappings: EntityMapping[] = [];
    
    // Build a map of quantities to component IDs
    const quantityMap: Map<string, string[]> = new Map();
    const nameMap: Map<string, string[]> = new Map();
    const containerMap: Map<string, string[]> = new Map();
    
    Object.entries(componentMappings).forEach(([dslPath, mapping]: [string, any]) => {
      const props = mapping.properties;
      
      // Extract quantity
      const quantity = props?.item?.entity_quantity || props?.entity_quantity;
      if (quantity !== undefined && quantity !== null) {
        const key = quantity.toString();
        if (!quantityMap.has(key)) {
          quantityMap.set(key, []);
        }
        quantityMap.get(key)!.push(dslPath);
      }
      
      // Extract entity name
      const entityName = props?.item?.entity_name || props?.entity_name;
      if (entityName) {
        const key = entityName.toLowerCase();
        if (!nameMap.has(key)) {
          nameMap.set(key, []);
        }
        nameMap.get(key)!.push(dslPath);
      }
      
      // Extract container name
      const containerName = props?.container_name;
      if (containerName) {
        const key = containerName.toLowerCase();
        if (!containerMap.has(key)) {
          containerMap.set(key, []);
        }
        containerMap.get(key)!.push(dslPath);
      }
    });
    
    // Find numbers in the text
    const numberPattern = /\b(\d+(?:\.\d+)?)\b/g;
    let match;
    while ((match = numberPattern.exec(mwpText)) !== null) {
      const number = match[1];
      const dslPaths = quantityMap.get(number);
      
      if (dslPaths && dslPaths.length > 0) {
        // Use the first matching component (could be enhanced with context analysis)
        mappings.push({
          text: number,
          startPos: match.index,
          endPos: match.index + number.length,
          componentId: dslPaths[0],
          type: 'quantity',
          propertyKey: 'entity_quantity'
        });
      }
    }
    
    // Find entity names in the text (case-insensitive)
    nameMap.forEach((dslPaths, entityName) => {
      const regex = new RegExp(`\\b${this.escapeRegex(entityName)}s?\\b`, 'gi');
      let match;
      while ((match = regex.exec(mwpText)) !== null) {
        if (!this.isOverlapping(mappings, match.index, match.index + match[0].length)) {
          mappings.push({
            text: match[0],
            startPos: match.index,
            endPos: match.index + match[0].length,
            componentId: dslPaths[0],
            type: 'name',
            propertyKey: 'entity_name'
          });
        }
      }
    });
    
    // Find container names in the text (case-insensitive)
    containerMap.forEach((dslPaths, containerName) => {
      const regex = new RegExp(`\\b${this.escapeRegex(containerName)}\\b`, 'gi');
      let match;
      while ((match = regex.exec(mwpText)) !== null) {
        if (!this.isOverlapping(mappings, match.index, match.index + match[0].length)) {
          mappings.push({
            text: match[0],
            startPos: match.index,
            endPos: match.index + match[0].length,
            componentId: dslPaths[0],
            type: 'container',
            propertyKey: 'container_name'
          });
        }
      }
    });
    
    // Sort mappings by position
    mappings.sort((a, b) => a.startPos - b.startPos);
    
    return mappings;
  }
  
  /**
   * Update MWP text with component changes
   */
  static updateMWPText(
    mwpText: string,
    dslPath: string,
    updates: Record<string, any>,
    entityMappings: EntityMapping[],
    componentMappings: Record<string, any> = {}
  ): string {
    // Flatten nested updates
    const flatUpdates: Record<string, any> = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'item' && typeof value === 'object') {
        Object.entries(value).forEach(([itemKey, itemValue]) => {
          flatUpdates[itemKey] = itemValue;
        });
      } else {
        flatUpdates[key] = value;
      }
    });
    
    // Find all mappings for this component
    const relevantMappings = entityMappings
      .filter(m => m.componentId === dslPath)
      .sort((a, b) => b.startPos - a.startPos); // Sort in reverse to maintain positions
    
    let updatedText = mwpText;
    
    relevantMappings.forEach(mapping => {
      const updateKey = mapping.propertyKey;
      if (updateKey in flatUpdates) {
        const newValue = flatUpdates[updateKey].toString();
        
        // Handle pluralization for entity names
        let replacementValue = newValue;
        if (mapping.type === 'name' && mapping.text.endsWith('s') && !newValue.endsWith('s')) {
          // Check if the original was plural
          const originalSingular = mapping.text.slice(0, -1);
          if (originalSingular.toLowerCase() === componentMappings[dslPath]?.properties?.item?.entity_name?.toLowerCase() ||
              originalSingular.toLowerCase() === componentMappings[dslPath]?.properties?.entity_name?.toLowerCase()) {
            replacementValue = newValue + 's';
          }
        }
        
        // Replace the text
        updatedText = 
          updatedText.slice(0, mapping.startPos) +
          replacementValue +
          updatedText.slice(mapping.endPos);
        
        // Adjust positions of subsequent mappings if length changed
        const lengthDiff = replacementValue.length - mapping.text.length;
        if (lengthDiff !== 0) {
          relevantMappings.forEach(m => {
            if (m.startPos < mapping.startPos) {
              m.startPos += lengthDiff;
              m.endPos += lengthDiff;
            }
          });
        }
      }
    });
    
    return updatedText;
  }
  
  /**
   * Check if a range overlaps with existing mappings
   */
  private static isOverlapping(
    mappings: EntityMapping[],
    start: number,
    end: number
  ): boolean {
    return mappings.some(m => 
      (start >= m.startPos && start < m.endPos) ||
      (end > m.startPos && end <= m.endPos) ||
      (start <= m.startPos && end >= m.endPos)
    );
  }
  
  /**
   * Escape special regex characters
   */
  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  /**
   * Highlight entity mappings in MWP text
   */
  static highlightMappings(
    mwpText: string,
    entityMappings: EntityMapping[],
    dslPath?: string
  ): { text: string; highlights: Array<[number, number]> } {
    const highlights: Array<[number, number]> = [];
    
    const relevantMappings = dslPath
      ? entityMappings.filter(m => m.componentId === dslPath)
      : entityMappings;
    
    relevantMappings.forEach(mapping => {
      highlights.push([mapping.startPos, mapping.endPos]);
    });
    
    return { text: mwpText, highlights };
  }
  
  /**
   * Generate a summary of changes for user confirmation
   */
  static generateChangeSummary(
    updates: Record<string, any>,
    entityMappings: EntityMapping[],
    dslPath: string
  ): string[] {
    const changes: string[] = [];
    const relevantMappings = entityMappings.filter(m => m.componentId === dslPath);
    
    // Flatten updates
    const flatUpdates: Record<string, any> = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'item' && typeof value === 'object') {
        Object.entries(value).forEach(([itemKey, itemValue]) => {
          flatUpdates[itemKey] = itemValue;
        });
      } else {
        flatUpdates[key] = value;
      }
    });
    
    relevantMappings.forEach(mapping => {
      if (mapping.propertyKey in flatUpdates) {
        const oldValue = mapping.text;
        const newValue = flatUpdates[mapping.propertyKey];
        changes.push(`"${oldValue}" → "${newValue}" at position ${mapping.startPos}`);
      }
    });
    
    return changes;
  }
}
