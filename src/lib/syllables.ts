/**
 * Syllabification Utility for Captions with Intention
 * Syllabifies words >= 6 characters for better caption timing
 */

/**
 * Syllabify a word into syllables using vowel-cluster heuristic
 * @param word - Word to syllabify
 * @returns Array of syllables
 */
export function syllabify(word: string): string[] {
  // Only syllabify words >= 6 characters
  if (word.length < 6) return [word];
  
  // Handle special cases
  if (word.includes('-')) {
    // Split hyphenated words but keep the hyphen with the first part
    const parts = word.split('-');
    if (parts.length === 2) {
      return [parts[0] + '-', parts[1]];
    }
  }
  
  if (word.includes("'")) {
    // Keep apostrophes with the part they belong to (e.g., "don't" -> "don't")
    return [word];
  }
  
  // Split before vowel clusters (vowel sequences)
  // This is a simple heuristic that works reasonably well for English
  const vowels = /[aeiouAEIOU]/;
  const syllables: string[] = [];
  let currentSyllable = '';
  let previousWasVowel = false;
  
  for (let i = 0; i < word.length; i++) {
    const char = word[i];
    const isVowel = vowels.test(char);
    
    // Split before a vowel if previous was consonant and we have accumulated text
    if (isVowel && !previousWasVowel && currentSyllable.length > 0) {
      syllables.push(currentSyllable);
      currentSyllable = char;
    } else {
      currentSyllable += char;
    }
    
    previousWasVowel = isVowel;
  }
  
  // Add remaining syllable
  if (currentSyllable) {
    syllables.push(currentSyllable);
  }
  
  // If we only got one syllable or none, return the original word
  if (syllables.length <= 1) {
    return [word];
  }
  
  return syllables;
}

/**
 * Add syllables to words that are missing them
 * Distributes word timing across syllables
 */
export function injectSyllables(
  words: Array<{
    text: string;
    startTime: number;
    endTime: number;
    emphasis?: string;
    pitch?: string;
    syllables?: Array<{ text: string; startTime: number; endTime: number }>;
  }>
): typeof words {
  return words.map(word => {
    // Skip if word already has syllables or is too short
    if (word.syllables && word.syllables.length > 0) return word;
    if (word.text.length < 6) return word;
    
    const syllables = syllabify(word.text);
    
    // If syllabification didn't split the word, skip
    if (syllables.length <= 1) return word;
    
    // Distribute word timing across syllables
    const wordDuration = word.endTime - word.startTime;
    const syllableDuration = wordDuration / syllables.length;
    
    return {
      ...word,
      syllables: syllables.map((syllable, idx) => ({
        text: syllable,
        startTime: word.startTime + (idx * syllableDuration),
        endTime: word.startTime + ((idx + 1) * syllableDuration)
      }))
    };
  });
}
