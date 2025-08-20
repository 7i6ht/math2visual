export class DSLUpdater {
  /**
   * Update DSL string with new component values
   */
  static updateComponentInDSL(
    dslText: string,
    _componentId: string,  // Reserved for future use
    componentPath: string,
    updates: Record<string, any>
  ): string {
    // Handle nested item properties
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
    
    // Parse the component path to understand the structure
    // Path format: "entities[0]" or "operation_1/entities[2]"
    const pathMatch = componentPath.match(/entities\[(\d+)\]/);
    if (!pathMatch) {
      console.warn('Could not parse component path:', componentPath);
      return dslText;
    }
    
    const entityIndex = parseInt(pathMatch[1]);
    
    // Find the component in the DSL
    const lines = dslText.split('\n');
    let inTargetEntity = false;
    let entityCount = -1;
    let bracketDepth = 0;
    let entityStartLine = -1;
    let entityEndLine = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Count container declarations
      if (line.match(/container\d+\[/) || line.match(/result_container\[/)) {
        entityCount++;
        if (entityCount === entityIndex) {
          inTargetEntity = true;
          entityStartLine = i;
          bracketDepth = 1;
        }
      }
      
      // Track bracket depth when inside target entity
      if (inTargetEntity) {
        const openBrackets = (line.match(/\[/g) || []).length;
        const closeBrackets = (line.match(/\]/g) || []).length;
        
        // Adjust for the initial bracket
        if (i > entityStartLine) {
          bracketDepth += openBrackets - closeBrackets;
        }
        
        // Check if we've exited the entity
        if (bracketDepth === 0) {
          entityEndLine = i;
          break;
        }
      }
    }
    
    if (entityStartLine === -1 || entityEndLine === -1) {
      console.warn('Could not find entity in DSL');
      return dslText;
    }
    
    // Update the properties within the entity
    const updatedLines = [...lines];
    for (let i = entityStartLine; i <= entityEndLine; i++) {
      const line = lines[i];
      
      // Update each property
      Object.entries(flatUpdates).forEach(([key, value]) => {
        const propPattern = new RegExp(`(\\s*${key}\\s*:\\s*)([^,\\]]+)`);
        if (propPattern.test(line)) {
          // Format the value appropriately
          let formattedValue = value;
          if (typeof value === 'string' && key !== 'entity_quantity') {
            // Keep string values as-is (DSL doesn't use quotes)
            formattedValue = value;
          } else if (typeof value === 'number' || key === 'entity_quantity') {
            formattedValue = value.toString();
          }
          
          updatedLines[i] = line.replace(propPattern, `$1${formattedValue}`);
        }
      });
    }
    
    return updatedLines.join('\n');
  }
  
  /**
   * Find a component's position in the DSL
   */
  static findComponentInDSL(
    dslText: string,
    componentPath: string
  ): { start: number; end: number } | null {
    const pathMatch = componentPath.match(/entities\[(\d+)\]/);
    if (!pathMatch) {
      return null;
    }
    
    const entityIndex = parseInt(pathMatch[1]);
    const lines = dslText.split('\n');
    let entityCount = -1;
    let currentPos = 0;
    let startPos = -1;
    let endPos = -1;
    let inTargetEntity = false;
    let bracketDepth = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineLength = line.length + 1; // +1 for newline
      
      // Count container declarations
      if (line.match(/container\d+\[/) || line.match(/result_container\[/)) {
        entityCount++;
        if (entityCount === entityIndex) {
          inTargetEntity = true;
          startPos = currentPos;
          bracketDepth = 1;
        }
      }
      
      // Track bracket depth when inside target entity
      if (inTargetEntity) {
        const openBrackets = (line.match(/\[/g) || []).length;
        const closeBrackets = (line.match(/\]/g) || []).length;
        
        // Adjust for the initial bracket
        if (currentPos > startPos) {
          bracketDepth += openBrackets - closeBrackets;
        }
        
        // Check if we've exited the entity
        if (bracketDepth === 0) {
          endPos = currentPos + lineLength;
          break;
        }
      }
      
      currentPos += lineLength;
    }
    
    if (startPos === -1 || endPos === -1) {
      return null;
    }
    
    return { start: startPos, end: endPos };
  }
  
  /**
   * Generate DSL snippet for a new component
   */
  static generateDSLSnippet(
    componentType: string,
    properties: Record<string, any>
  ): string {
    const indent = '  ';
    let snippet = `${componentType}[\n`;
    
    const propertyOrder = [
      'entity_name',
      'entity_type',
      'entity_quantity',
      'container_name',
      'container_type',
      'attr_name',
      'attr_type',
    ];
    
    propertyOrder.forEach(prop => {
      if (prop in properties) {
        const value = properties[prop];
        // Don't add quotes around string values in DSL
        snippet += `${indent}${prop}: ${value},\n`;
      }
    });
    
    // Remove trailing comma and add closing bracket
    snippet = snippet.slice(0, -2) + '\n]';
    return snippet;
  }
  
  /**
   * Validate DSL syntax
   */
  static validateDSL(dslText: string): { valid: boolean; error?: string } {
    try {
      // Check for balanced brackets
      let bracketCount = 0;
      let parenCount = 0;
      
      for (const char of dslText) {
        if (char === '[') bracketCount++;
        if (char === ']') bracketCount--;
        if (char === '(') parenCount++;
        if (char === ')') parenCount--;
        
        if (bracketCount < 0 || parenCount < 0) {
          return { valid: false, error: 'Unmatched closing bracket or parenthesis' };
        }
      }
      
      if (bracketCount !== 0) {
        return { valid: false, error: 'Unbalanced brackets' };
      }
      if (parenCount !== 0) {
        return { valid: false, error: 'Unbalanced parentheses' };
      }
      
      // Check for valid operations
      const validOps = ['addition', 'subtraction', 'multiplication', 'division', 'surplus', 'unittrans', 'area', 'comparison'];
      const opPattern = /(\w+)\s*\(/g;
      let match;
      while ((match = opPattern.exec(dslText)) !== null) {
        const op = match[1];
        if (!validOps.includes(op) && !op.startsWith('container') && op !== 'result_container') {
          return { valid: false, error: `Unknown operation: ${op}` };
        }
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Invalid DSL syntax' };
    }
  }
}
