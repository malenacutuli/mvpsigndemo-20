/**
 * Gap Classification Utilities for Extended Audio Descriptions (EAD)
 * Provides functions to estimate audio duration and classify gap sufficiency
 */

/**
 * Estimate audio duration based on text length and speaking rate
 * @param text - The text to be spoken
 * @param wordsPerSecond - Speaking rate (default: 2.6 WPS for narration)
 * @returns Estimated duration in seconds
 */
export const estimateAudioDuration = (
  text: string,
  wordsPerSecond: number = 2.6 // Typical narration speed (156 WPM / 60)
): number => {
  const words = text.trim().split(/\s+/).length;
  const baseDuration = words / wordsPerSecond;
  
  // Add time for punctuation pauses
  const sentenceCount = (text.match(/[.!?]+/g) || []).length;
  const punctuationTime = sentenceCount * 0.3; // 300ms per sentence
  
  // Add small buffer for natural pauses
  const pauseBuffer = words * 0.02; // 20ms per word
  
  return baseDuration + punctuationTime + pauseBuffer;
};

/**
 * Classify whether a gap is sufficient for an audio description
 * @param gapDuration - Available time in the video gap (seconds)
 * @param estimatedAudioDuration - Estimated time needed for audio (seconds)
 * @param bufferTime - Safety buffer for smooth transitions (default: 0.5s)
 * @returns Classification: 'sufficient', 'tight', or 'requires-ead'
 */
export const classifyGapSufficiency = (
  gapDuration: number,
  estimatedAudioDuration: number,
  bufferTime: number = 0.5 // Safety buffer in seconds
): 'sufficient' | 'tight' | 'requires-ead' => {
  const requiredTime = estimatedAudioDuration + bufferTime;
  
  if (gapDuration >= requiredTime) {
    return 'sufficient'; // Fits comfortably
  } else if (gapDuration >= estimatedAudioDuration * 0.8) {
    return 'tight'; // Close fit, might work
  } else {
    return 'requires-ead'; // Not enough time, needs video pause/slowdown
  }
};

/**
 * Calculate how much time is needed to extend the video (pause/slowdown)
 * @param gapDuration - Available time in the video gap (seconds)
 * @param estimatedAudioDuration - Estimated time needed for audio (seconds)
 * @param bufferTime - Safety buffer (default: 0.5s)
 * @returns Extension duration needed in seconds (0 if sufficient)
 */
export const calculateExtensionDuration = (
  gapDuration: number,
  estimatedAudioDuration: number,
  bufferTime: number = 0.5
): number => {
  const deficit = estimatedAudioDuration + bufferTime - gapDuration;
  return Math.max(0, deficit);
};

/**
 * Get a human-readable description of gap sufficiency
 * @param sufficiency - Gap classification result
 * @returns User-friendly description
 */
export const getSufficiencyDescription = (
  sufficiency: 'sufficient' | 'tight' | 'requires-ead'
): string => {
  switch (sufficiency) {
    case 'sufficient':
      return 'Description fits comfortably in available gap';
    case 'tight':
      return 'Description barely fits - may feel rushed';
    case 'requires-ead':
      return 'Description requires Extended Audio Description (video will pause)';
  }
};
