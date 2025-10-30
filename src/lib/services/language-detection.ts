interface LanguageDetectionResult {
  language: string;
  confidence: number;
  alternativeLanguages?: Array<{
    language: string;
    confidence: number;
  }>;
}

export async function detectLanguage(text: string): Promise<LanguageDetectionResult> {
  try {
    // Option 1: Use Chrome's built-in language detection API if available
    if ('translation' in self && 'canDetect' in (self as any).translation) {
      const canDetect = await (self as any).translation.canDetect();
      if (canDetect === 'readily') {
        const detector = await (self as any).translation.createDetector();
        const results = await detector.detect(text);
        
        return {
          language: results[0].detectedLanguage,
          confidence: results[0].confidence,
          alternativeLanguages: results.slice(1).map((r: any) => ({
            language: r.detectedLanguage,
            confidence: r.confidence
          }))
        };
      }
    }
    
    // Option 2: Use a lightweight language detection library
    const franc = await import('franc-min');
    const detectedLang = franc.franc(text);
    
    // Map ISO 639-3 to ISO 639-1
    const langMap: Record<string, string> = {
      'eng': 'en',
      'spa': 'es',
      'fra': 'fr',
      'deu': 'de',
      'ita': 'it',
      'por': 'pt',
      'rus': 'ru',
      'jpn': 'ja',
      'kor': 'ko',
      'cmn': 'zh',
      'cat': 'ca',
      'nld': 'nl',
      'pol': 'pl',
      'swe': 'sv',
      'ara': 'ar',
      'hin': 'hi'
    };
    
    return {
      language: langMap[detectedLang] || detectedLang,
      confidence: text.length > 100 ? 0.9 : 0.7
    };
    
  } catch (error) {
    console.error('Language detection failed:', error);
    
    // Fallback: simple heuristic detection
    return detectLanguageHeuristic(text);
  }
}

/**
 * Fallback heuristic language detection
 */
function detectLanguageHeuristic(text: string): LanguageDetectionResult {
  const patterns: Record<string, RegExp[]> = {
    'en': [/\b(the|and|of|to|in|is|you|that|it|he|was|for|on|are|as|with|his|they|at|be|this|have|from|or|one|had|by|word|but|not|what|all|were|we|when|your|can|said)\b/gi],
    'es': [/\b(el|la|de|que|y|a|en|un|ser|se|no|haber|estar|tener|con|para|como|por|su|al|lo|más|pero|sus|le|ya|o)\b/gi],
    'fr': [/\b(le|de|un|être|et|à|il|avoir|ne|je|son|que|se|qui|ce|dans|elle|au|pour|pas|plus|pouvoir|par|tout|mais|ou)\b/gi],
    'de': [/\b(der|die|und|in|den|von|zu|das|mit|sich|des|auf|für|ist|im|dem|nicht|ein|eine|als|auch|es|an|werden|aus|er)\b/gi],
    'it': [/\b(il|di|e|la|per|che|un|in|è|a|non|con|da|si|della|come|più|ma|se|sono|ci|anche|al|lo|questa|nel)\b/gi],
    'pt': [/\b(o|a|de|que|e|do|da|em|um|para|é|com|não|uma|os|no|se|na|por|mais|as|dos|como|mas|foi|ao)\b/gi],
    'ca': [/\b(el|de|que|i|a|la|en|un|per|es|amb|com|no|al|una|dels|les|aquest|més|tot|ser|ha|però|dels)\b/gi]
  };
  
  const scores: Record<string, number> = {};
  
  for (const [lang, regexps] of Object.entries(patterns)) {
    let score = 0;
    for (const regex of regexps) {
      const matches = text.match(regex);
      if (matches) {
        score += matches.length;
      }
    }
    scores[lang] = score;
  }
  
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topLang = sorted[0];
  const confidence = topLang[1] > 10 ? 0.8 : topLang[1] > 5 ? 0.6 : 0.4;
  
  return {
    language: topLang[0],
    confidence,
    alternativeLanguages: sorted.slice(1, 3).map(([lang, score]) => ({
      language: lang,
      confidence: score / topLang[1] * confidence
    }))
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
