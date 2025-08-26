/**
 * DSL Formatter Utility
 */
  
  export class DSLFormatter {
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