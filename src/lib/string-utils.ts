/**
 * String utility functions for naming conventions
 */
export class StringUtils {
  /**
   * Convert string to PascalCase
   */
  static toPascalCase(str: string): string {
    return str
      .split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Convert string to kebab-case
   */
  static toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  /**
   * Convert plural word to singular using linguistic rules
   */
  static toSingular(word: string): string {
    // Handle empty or single character words
    if (!word || word.length <= 1) {
      return word;
    }

    const lowerWord = word.toLowerCase();
    
    // Irregular plurals that need special handling
    const irregularPlurals: Record<string, string> = {
      'children': 'child',
      'people': 'person',
      'men': 'man',
      'women': 'woman',
      'feet': 'foot',
      'teeth': 'tooth',
      'mice': 'mouse',
      'geese': 'goose',
      'oxen': 'ox',
      'data': 'datum',
      'media': 'medium',
      'criteria': 'criterion',
      'phenomena': 'phenomenon',
      'indices': 'index',
      'vertices': 'vertex',
      'matrices': 'matrix',
      'analyses': 'analysis',
      'bases': 'base',
      'diagnoses': 'diagnosis',
      'theses': 'thesis',
      'crises': 'crisis',
      'oases': 'oasis'
    };

    // Check for irregular plurals first
    if (irregularPlurals[lowerWord]) {
      return this.capitalizeFirst(irregularPlurals[lowerWord], word);
    }

    // Regular plural rules
    // Words ending in -ies (e.g., categories -> category)
    if (lowerWord.endsWith('ies') && lowerWord.length > 4) {
      return this.capitalizeFirst(lowerWord.slice(0, -3) + 'y', word);
    }

    // Words ending in -ves (e.g., leaves -> leaf, wolves -> wolf)
    if (lowerWord.endsWith('ves') && lowerWord.length > 4) {
      // Check if it should be 'f' or 'fe'
      const withoutVes = lowerWord.slice(0, -3);
      if (['leaf', 'wolf', 'shelf', 'calf', 'half', 'self', 'knife', 'life', 'wife'].includes(withoutVes + 'f')) {
        return this.capitalizeFirst(withoutVes + 'f', word);
      }
      if (['leaf', 'wolf', 'shelf', 'calf', 'half', 'self'].includes(withoutVes)) {
        return this.capitalizeFirst(withoutVes, word);
      }
    }

    // Words ending in -es (but not -ies, -ves already handled)
    if (lowerWord.endsWith('es') && !lowerWord.endsWith('ies') && !lowerWord.endsWith('ves') && lowerWord.length > 3) {
      // Check if it's a valid -es plural (e.g., boxes -> box, classes -> class)
      const withoutEs = lowerWord.slice(0, -2);
      const lastChar = withoutEs.slice(-1);
      
      // Words ending in -s, -sh, -ch, -x, -z typically add -es
      if (['s', 'sh', 'ch', 'x', 'z'].includes(lastChar) || 
          withoutEs.endsWith('ss') || 
          withoutEs.endsWith('ch') ||
          withoutEs.endsWith('sh')) {
        return this.capitalizeFirst(withoutEs, word);
      }
    }

    // Words ending in -s (simple case)
    if (lowerWord.endsWith('s') && lowerWord.length > 2) {
      // Don't remove 's' if it's part of the root word
      const withoutS = lowerWord.slice(0, -1);
      
      // Avoid removing 's' from words that end with 's' in singular form
      // (e.g., "glass", "class", "mass", "pass", "grass", "gas", "bus")
      const singularEndsWithS = ['glas', 'clas', 'mas', 'pas', 'gras', 'ga', 'bu'];
      if (singularEndsWithS.some(ending => withoutS.endsWith(ending))) {
        return word; // Keep as is
      }
      
      return this.capitalizeFirst(withoutS, word);
    }

    // If no rules apply, return the original word
    return word;
  }

  /**
   * Capitalize the first letter while preserving the original casing pattern
   */
  private static capitalizeFirst(singular: string, original: string): string {
    if (original === original.toUpperCase()) {
      return singular.toUpperCase();
    }
    if (original[0] === original[0].toUpperCase()) {
      return singular.charAt(0).toUpperCase() + singular.slice(1);
    }
    return singular;
  }
}
