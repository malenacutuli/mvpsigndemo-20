interface LanguageDetectionResult {
  language: string;
  confidence: number;
  alternatives?: Array<{ language: string; confidence: number }>;
}

/**
 * Detect language from text using heuristic analysis
 * This is a simplified implementation - for production, consider using a proper language detection library
 */
export async function detectLanguage(text: string): Promise<LanguageDetectionResult> {
  const cleanText = text.toLowerCase().trim();
  
  // Language patterns (simple heuristic approach)
  const patterns = {
    en: {
      commonWords: ['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for'],
      weight: 0
    },
    es: {
      commonWords: ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se', 'no', 'haber', 'por', 'con', 'su', 'para'],
      weight: 0
    },
    fr: {
      commonWords: ['le', 'de', 'un', 'être', 'et', 'à', 'il', 'avoir', 'ne', 'je', 'son', 'que', 'se', 'qui', 'ce', 'dans'],
      weight: 0
    },
    de: {
      commonWords: ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'des', 'auf', 'für', 'ist', 'im'],
      weight: 0
    },
    it: {
      commonWords: ['il', 'di', 'e', 'la', 'per', 'che', 'un', 'in', 'è', 'a', 'non', 'con', 'da', 'si', 'della'],
      weight: 0
    },
    pt: {
      commonWords: ['o', 'a', 'de', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'é', 'com', 'não', 'uma', 'os', 'no'],
      weight: 0
    },
    ca: {
      commonWords: ['el', 'de', 'que', 'i', 'a', 'la', 'en', 'un', 'per', 'es', 'amb', 'com', 'no', 'al', 'una', 'dels'],
      weight: 0
    }
  };

  // Count matching words for each language
  const words = cleanText.split(/\s+/);
  
  for (const word of words) {
    for (const [lang, pattern] of Object.entries(patterns)) {
      if (pattern.commonWords.includes(word)) {
        pattern.weight += 1;
      }
    }
  }

  // Character-based patterns for additional confidence
  const charPatterns = {
    en: /[a-z]/gi,
    es: /[áéíóúñü]/gi,
    fr: /[àâæçéèêëïîôùûüÿœ]/gi,
    de: /[äöüß]/gi,
    it: /[àèéìíîòóùú]/gi,
    pt: /[ãõáàâéêíóôõú]/gi,
    ca: /[àèéíïòóúü·]/gi
  };

  for (const [lang, regex] of Object.entries(charPatterns)) {
    const matches = cleanText.match(regex);
    if (matches) {
      patterns[lang as keyof typeof patterns].weight += matches.length * 0.5;
    }
  }

  // Calculate confidence scores
  const totalWeight = Object.values(patterns).reduce((sum, p) => sum + p.weight, 0);
  const scores = Object.entries(patterns)
    .map(([lang, pattern]) => ({
      language: lang,
      confidence: totalWeight > 0 ? pattern.weight / totalWeight : 0
    }))
    .sort((a, b) => b.confidence - a.confidence);

  // Return primary detection with alternatives
  const primary = scores[0];
  const alternatives = scores.slice(1, 4).filter(s => s.confidence > 0.1);

  return {
    language: primary.language,
    confidence: primary.confidence,
    alternatives: alternatives.length > 0 ? alternatives : undefined
  };
}

/**
 * Detect if text contains multiple languages (code-switching)
 */
export async function detectMultilingualContent(text: string): Promise<{
  isMultilingual: boolean;
  languages: string[];
  segments?: Array<{ text: string; language: string; confidence: number }>;
}> {
  // Split by sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  const detectedLanguages = new Set<string>();
  const segments = [];

  for (const sentence of sentences) {
    if (sentence.trim().length > 10) {
      const detection = await detectLanguage(sentence);
      if (detection.confidence > 0.6) {
        detectedLanguages.add(detection.language);
        segments.push({
          text: sentence.trim(),
          language: detection.language,
          confidence: detection.confidence
        });
      }
    }
  }

  return {
    isMultilingual: detectedLanguages.size > 1,
    languages: Array.from(detectedLanguages),
    segments: segments.length > 0 ? segments : undefined
  };
}
