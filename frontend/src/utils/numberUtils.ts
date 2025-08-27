import { ToWords } from 'to-words';

/**
 * Utility for converting numbers to their word representation
 */
class NumberConverter {
  private toWords: ToWords;

  constructor() {
    this.toWords = new ToWords();
  }

  /**
   * Convert a number to its word representation
   * @param num - The number to convert
   * @returns The word representation of the number, or the string representation as fallback
   * 
   * @example
   * numberToWord(5) // returns "five"
   * numberToWord(88) // returns "eighty-eight"
   */
  convert(num: number): string {
    try {
      return this.toWords.convert(num);
    } catch (error) {
      console.warn('Failed to convert number to word:', num, error);
      return num.toString(); // fallback to numeric form
    }
  }
}

// Export singleton instance
const numberConverter = new NumberConverter();

/**
 * Convert a number to its word representation
 * @param num - The number to convert
 * @returns The word representation of the number
 */
export const numberToWord = (num: number): string => {
  return numberConverter.convert(num);
};
