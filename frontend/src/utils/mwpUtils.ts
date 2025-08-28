import { numberToWord } from './numberUtils';

/**
 * Utility functions for Math Word Problem (MWP) text processing and highlighting
 */

/**
 * Split text into sentences using common sentence separators
 * @param text - The text to split
 * @returns Array of trimmed sentences (empty sentences filtered out)
 */
export const splitIntoSentences = (text: string): string[] => {
  return text.split(/[.!?]+/).filter(s => s.trim().length > 0);
};

/**
 * Create regex patterns for finding sentences containing specific values
 * @param containerName - The container name to search for
 * @param quantity - The quantity to search for (optional)
 * @param entityName - The entity name to search for (optional)
 * @returns Array of regex patterns ordered by specificity (most specific first)
 */
export const createSentencePatterns = (
  containerName: string,
  quantity?: string,
  entityName?: string
): RegExp[] => {
  const patterns: RegExp[] = [];
  
  if (quantity) {
    // Convert quantity to both numeric and word forms for pattern matching
    const numericQuantity = quantity.toString();
    const wordQuantity = numberToWord(parseInt(quantity.toString()));
    const quantityPattern = `(${numericQuantity}|${wordQuantity})`;
    
    if (entityName) {
      // Pattern with container + quantity + entity (most specific)
      patterns.push(
        new RegExp(`([^.!?]*${containerName}[^.!?]*${quantityPattern}[^.!?]*${entityName}[^.!?]*[.!?])`, 'i')
      );
    }
    
    // Pattern with container + quantity (no entity requirement)
    patterns.push(
      new RegExp(`([^.!?]*${containerName}[^.!?]*${quantityPattern}[^.!?]*[.!?])`, 'i')
    );
  }
  
  // Fallback pattern with just container
  patterns.push(
    new RegExp(`([^.!?]*${containerName}[^.!?]*[.!?])`, 'i')
  );
  
  return patterns;
};

/**
 * Find the position of a sentence in the original text
 * @param originalText - The full text
 * @param sentences - Array of split sentences
 * @param sentenceIndex - Index of the sentence to find
 * @param sentence - The sentence text to match
 * @returns Tuple of [start, end] positions or null if not found
 */
export const findSentencePosition = (
  originalText: string,
  sentences: string[],
  sentenceIndex: number,
  sentence: string
): [number, number] | null => {
  // Calculate the approximate position based on previous sentences
  let sentenceStart = 0;
  for (let j = 0; j < sentenceIndex; j++) {
    sentenceStart += sentences[j].length + 1; // +1 for the separator
  }
  
  // Find the actual start position in the original text
  const escapedSentence = sentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const actualSentenceMatch = originalText.substring(sentenceStart).match(
    new RegExp(`\\s*${escapedSentence}`)
  );
  
  if (actualSentenceMatch && actualSentenceMatch.index !== undefined) {
    const matchStart = sentenceStart + actualSentenceMatch.index;
    // Find where the actual sentence text starts (after any leading whitespace)
    const leadingWhitespaceLength = actualSentenceMatch[0].length - sentence.length;
    const actualStart = matchStart + leadingWhitespaceLength;
    const actualEnd = actualStart + sentence.length;
    return [actualStart, actualEnd];
  }
  
  return null;
};

/**
 * Find and highlight a quantity in text using both numeric and word forms
 * @param text - The text to search in
 * @param quantity - The quantity to search for
 * @returns Tuple of [start, end] positions or null if not found
 */
export const findQuantityInText = (
  text: string,
  quantity: string | number
): [number, number] | null => {
  const numericQuantity = quantity.toString();
  const wordQuantity = numberToWord(parseInt(quantity.toString()));
  
  // Try numeric form first
  let regex = new RegExp(`\\b${numericQuantity}\\b`);
  let match = regex.exec(text);
  
  if (match) {
    return [match.index, match.index + match[0].length];
  }
  
  // Try word form if numeric not found
  regex = new RegExp(`\\b${wordQuantity}\\b`, 'i'); // case-insensitive
  match = regex.exec(text);
  
  if (match) {
    return [match.index, match.index + match[0].length];
  }
  
  return null;
};

/**
 * Create a flexible regex pattern for entity names that handles singular/plural variations
 * Only the last word (typically the noun) gets the optional 's' for pluralization
 * @param entityName - The entity name to create a pattern for (e.g., "colorful flower")
 * @returns A regex pattern string that matches both singular and plural forms
 * @example "colorful flower" → matches "colorful flower" and "colorful flowers"
 */
export const createEntityNamePattern = (entityName: string): string => {
  // Escape special regex characters
  const escapedName = entityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Split into words
  const words = escapedName.split(/\s+/);
  
  // Handle pluralization for the last word only (typically the noun)
  if (words.length > 0) {
    const lastWord = words[words.length - 1];
    if (!lastWord.toLowerCase().endsWith('s')) {
      words[words.length - 1] = `${lastWord}s?`;
    }
  }
  
  // Join words with flexible whitespace pattern (allows multiple spaces)
  const pattern = words.join('\\s+');
  
  // Add word boundaries to ensure we match complete phrases
  return `\\b${pattern}\\b`;
};

/**
 * Score sentences based on container name and quantity matches
 * @param sentences - Array of sentences to score
 * @param containerName - The container name to search for
 * @param quantity - The quantity to search for (numeric)
 * @returns Array of scored sentences sorted by relevance (highest score first)
 */
export const scoreSentencesForEntity = (
  sentences: string[], 
  containerName: string, 
  quantity: string
): Array<{ index: number; score: number; sentence: string }> => {
  const sentenceScores: Array<{ index: number; score: number; sentence: string }> = [];
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();
    let score = 0;
    
    // Check if sentence contains container name
    const containerRegex = new RegExp(`\\b${containerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (containerRegex.test(sentence)) score++;
    
    // Check if sentence contains quantity (numeric or word form)
    const numericQuantity = quantity.toString();
    const wordQuantity = numberToWord(parseInt(quantity.toString()));
    const quantityRegex = new RegExp(`\\b(${numericQuantity}|${wordQuantity})\\b`, 'i');
    if (quantityRegex.test(sentence)) score++;
    
    // Only consider sentences with at least one match
    if (score > 0) {
      sentenceScores.push({ index: i, score, sentence });
    }
  }
  
  // Sort by score (descending) and then by index (ascending) for ties
  sentenceScores.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score; // Higher score first
    return a.index - b.index; // Earlier sentence first for ties
  });
  
  return sentenceScores;
};

/**
 * Find entity name matches in a sentence and convert to absolute positions
 * @param entityName - The entity name to search for
 * @param sentence - The sentence to search within
 * @param sentenceIndex - Index of the sentence in the sentences array
 * @param sentences - Array of all sentences for position calculation
 * @param mwpText - The full MWP text for absolute positioning
 * @returns Array of [start, end] ranges or null if no matches found
 */
export const findEntityNameInSentence = (
  entityName: string,
  sentence: string,
  sentenceIndex: number,
  sentences: string[],
  mwpText: string
): [number, number][] | null => {
  const entityNamePattern = createEntityNamePattern(entityName);
  const entityNameRegex = new RegExp(entityNamePattern, 'gi');
  const entityNameMatches = Array.from(sentence.matchAll(entityNameRegex));
  
  if (entityNameMatches.length === 0) return null;
  
  // Calculate the absolute position in the full text
  const sentencePosition = findSentencePosition(mwpText, sentences, sentenceIndex, sentence);
  if (!sentencePosition) return null;
  
  const [sentenceStart] = sentencePosition;
  
  return entityNameMatches.map(match => {
    const relativeStart = match.index!;
    const relativeEnd = relativeStart + match[0].length;
    const absoluteStart = sentenceStart + relativeStart;
    const absoluteEnd = sentenceStart + relativeEnd;
    return [absoluteStart, absoluteEnd] as [number, number];
  });
};

/**
 * Find all occurrences of entity name in the text (fallback function)
 * @param entityName - The entity name to search for
 * @param mwpText - The full MWP text to search within
 * @returns Array of [start, end] ranges for all occurrences
 */
export const findAllEntityNameOccurrencesInText = (
  entityName: string,
  mwpText: string
): [number, number][] => {
  const entityNamePattern = createEntityNamePattern(entityName);
  const entityNameRegex = new RegExp(entityNamePattern, 'gi');
  const allMatches = Array.from(mwpText.matchAll(entityNameRegex));
  
  return allMatches.map(match => [match.index!, match.index! + match[0].length] as [number, number]);
};
