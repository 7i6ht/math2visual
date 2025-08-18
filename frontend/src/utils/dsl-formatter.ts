/**
 * DSL Formatter Utility
 * Parses and formats Visual Language DSL strings for better readability
 */

interface ParsedContainer {
  name: string;
  properties: Array<{ key: string; value: string }>;
}

interface ParsedOperation {
  type: 'operation';
  name: string;
  children: Array<ParsedOperation | ParsedContainer>;
}

export class DSLFormatter {
  private static readonly OPERATIONS = [
    'addition', 'subtraction', 'multiplication', 'division', 
    'surplus', 'unittrans', 'area', 'comparison'
  ];

  private static readonly CONTAINER_PATTERN = /^(container\d+|result_container)$/;

  /**
   * Format a DSL string with proper indentation and line breaks
   */
  static format(dslString: string): string {
    try {
      const trimmed = dslString.trim();
      if (!trimmed) return '';

      const parsed = this.parse(trimmed);
      return this.stringify(parsed, 0);
    } catch (error) {
      // If parsing fails, return original string
      console.warn('DSL formatting failed, returning original:', error);
      return dslString;
    }
  }

  /**
   * Parse DSL string into structured format
   */
  private static parse(input: string): ParsedOperation {
    return this.parseOperation(input.trim());
  }

  /**
   * Parse an operation (like division(...))
   */
  private static parseOperation(input: string): ParsedOperation {
    const match = input.match(/^(\w+)\s*\((.*)\)$/s);
    if (!match) {
      throw new Error(`Invalid operation format: ${input}`);
    }

    const [, operationName, content] = match;
    
    if (!this.OPERATIONS.includes(operationName)) {
      throw new Error(`Unknown operation: ${operationName}`);
    }

    const children = this.parseChildren(content);
    
    return {
      type: 'operation',
      name: operationName,
      children
    };
  }

  /**
   * Parse the content inside operation parentheses
   */
  private static parseChildren(content: string): Array<ParsedOperation | ParsedContainer> {
    const children: Array<ParsedOperation | ParsedContainer> = [];
    const tokens = this.tokenize(content);
    
    for (const token of tokens) {
      const trimmed = token.trim();
      if (!trimmed) continue;

      if (this.isOperation(trimmed)) {
        children.push(this.parseOperation(trimmed));
      } else if (this.isContainer(trimmed)) {
        children.push(this.parseContainer(trimmed));
      }
    }

    return children;
  }

  /**
   * Tokenize content by splitting on commas but respecting nested structures
   */
  private static tokenize(content: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let depth = 0;
    let inBrackets = 0;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      
      if (char === '(') depth++;
      else if (char === ')') depth--;
      else if (char === '[') inBrackets++;
      else if (char === ']') inBrackets--;
      else if (char === ',' && depth === 0 && inBrackets === 0) {
        tokens.push(current.trim());
        current = '';
        continue;
      }

      current += char;
    }

    if (current.trim()) {
      tokens.push(current.trim());
    }

    return tokens;
  }

  /**
   * Check if a string represents an operation
   */
  private static isOperation(str: string): boolean {
    return this.OPERATIONS.some(op => str.startsWith(op + '('));
  }

  /**
   * Check if a string represents a container
   */
  private static isContainer(str: string): boolean {
    return this.CONTAINER_PATTERN.test(str.split('[')[0]);
  }

  /**
   * Parse a container (like container1[...])
   */
  private static parseContainer(input: string): ParsedContainer {
    const match = input.match(/^(\w+)\[(.*)\]$/s);
    if (!match) {
      throw new Error(`Invalid container format: ${input}`);
    }

    const [, containerName, content] = match;
    const properties = this.parseProperties(content);

    return {
      name: containerName,
      properties
    };
  }

  /**
   * Parse properties inside a container
   */
  private static parseProperties(content: string): Array<{ key: string; value: string }> {
    const properties: Array<{ key: string; value: string }> = [];
    
    // Split by commas but be careful with nested content
    const parts = content.split(',');
    
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;

      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();
      
      properties.push({ key, value });
    }

    return properties;
  }

  /**
   * Convert parsed structure back to formatted string
   */
  private static stringify(node: ParsedOperation | ParsedContainer, indent: number): string {
    const indentStr = '  '.repeat(indent);
    
    if ('type' in node && node.type === 'operation') {
      // Format operation
      const children = node.children.map(child => 
        this.stringify(child, indent + 1)
      );

      if (children.length === 0) {
        return `${indentStr}${node.name}()`;
      }

      const childrenStr = children.join(',\n');
      return `${indentStr}${node.name}(\n${childrenStr}\n${indentStr})`;
    } else {
      // Format container
      const container = node as ParsedContainer;
      
      if (container.properties.length === 0) {
        return `${indentStr}${container.name}[]`;
      }

      const propertiesStr = container.properties
        .map(prop => `${indentStr}  ${prop.key}: ${prop.value}`)
        .join(',\n');

      return `${indentStr}${container.name}[\n${propertiesStr}\n${indentStr}]`;
    }
  }

  /**
   * Minify formatted DSL back to single line (for API calls)
   */
  static minify(dslString: string): string {
    return dslString
      .replace(/\s*\n\s*/g, ' ')  // Replace newlines with spaces
      .replace(/\s*,\s*/g, ', ')  // Normalize comma spacing
      .replace(/\s*\[\s*/g, '[')  // Remove spaces around brackets
      .replace(/\s*\]\s*/g, ']')
      .replace(/\s*\(\s*/g, '(')  // Remove spaces around parentheses
      .replace(/\s*\)\s*/g, ')')
      .replace(/\s*:\s*/g, ': ')  // Normalize colon spacing
      .replace(/\s+/g, ' ')       // Collapse multiple spaces
      .trim();
  }
}
