import { useState, useCallback } from 'react';
import { CaptionSegment } from '@/components/CaptionsWithIntention';

interface VoiceFingerprint {
  avgPitch: number;
  pitchVariance: number;
  speechRate: number;
  pausePattern: number;
  volumeProfile: number[];
  textualStyle: 'formal' | 'informal' | 'technical' | 'conversational';
}

interface SpeakerCluster {
  id: string;
  name: string;
  color: string;
  fingerprint: VoiceFingerprint;
  segments: CaptionSegment[];
  confidence: number;
}

interface UseAdvancedSpeakerAnalysisReturn {
  analyzeSpeakers: (segments: CaptionSegment[]) => Promise<SpeakerCluster[]>;
  isAnalyzing: boolean;
}

const CI_SPEAKER_COLORS = [
  '#E5E517', '#17E5E5', '#E51717', '#E58017', '#17E517', '#E517E5',
  '#E85C2E', '#47C2EB', '#EBC247', '#5E82ED', '#C2EB47', '#8C6BED'
];

export const useAdvancedSpeakerAnalysis = (): UseAdvancedSpeakerAnalysisReturn => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  /**
   * Advanced speaker analysis using multiple acoustic and linguistic features
   */
  const analyzeSpeakers = useCallback(async (segments: CaptionSegment[]): Promise<SpeakerCluster[]> => {
    setIsAnalyzing(true);
    
    try {
      console.log('🎭 Starting advanced speaker analysis for', segments.length, 'segments');
      
      // Step 1: Extract voice fingerprints for each segment
      const fingerprints = segments.map(segment => extractVoiceFingerprint(segment));
      
      // Step 2: Cluster segments by similarity using k-means-like approach
      const clusters = await clusterBySimilarity(segments, fingerprints);
      
      // Step 3: Refine clusters using temporal continuity
      const refinedClusters = refineWithTemporalContinuity(clusters, segments);
      
      // Step 4: Assign meaningful names and colors
      const namedClusters = assignSpeakerIdentities(refinedClusters);
      
      console.log('🎯 Advanced analysis complete:', namedClusters.length, 'speakers identified');
      
      return namedClusters;
      
    } catch (error) {
      console.error('❌ Speaker analysis failed:', error);
      
      // Fallback: Simple alternating speakers
      return createFallbackClusters(segments);
      
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  /**
   * Extract comprehensive voice fingerprint from segment
   */
  const extractVoiceFingerprint = (segment: CaptionSegment): VoiceFingerprint => {
    // Extract pitch characteristics
    const pitch = typeof segment.pitch === 'number' ? segment.pitch : 
                  segment.pitch === 'high' ? 220 : 
                  segment.pitch === 'low' ? 100 : 180;
    
    // Calculate speech rate (words per second)
    const duration = segment.endTime - segment.startTime;
    const wordCount = segment.words?.length || segment.text.split(' ').length;
    const speechRate = wordCount / duration;
    
    // Analyze volume profile
    const volume = segment.volume || 50;
    const volumeProfile = [volume]; // Could be expanded with segment analysis
    
    // Calculate pause patterns (if previous segment exists)
    const pausePattern = 0; // Would need context of previous segments
    
    // Analyze textual style
    const textualStyle = analyzeTextualStyle(segment.text);
    
    return {
      avgPitch: pitch,
      pitchVariance: 20, // Would calculate from word-level data if available
      speechRate,
      pausePattern,
      volumeProfile,
      textualStyle
    };
  };

  /**
   * Cluster segments by voice similarity using distance metrics
   */
  const clusterBySimilarity = async (
    segments: CaptionSegment[], 
    fingerprints: VoiceFingerprint[]
  ): Promise<SpeakerCluster[]> => {
    const clusters: SpeakerCluster[] = [];
    const SIMILARITY_THRESHOLD = 0.7;
    
    segments.forEach((segment, index) => {
      const fingerprint = fingerprints[index];
      let bestCluster: SpeakerCluster | null = null;
      let bestSimilarity = 0;
      
      // Find most similar existing cluster
      for (const cluster of clusters) {
        const similarity = calculateVoiceSimilarity(fingerprint, cluster.fingerprint);
        if (similarity > bestSimilarity && similarity > SIMILARITY_THRESHOLD) {
          bestSimilarity = similarity;
          bestCluster = cluster;
        }
      }
      
      if (bestCluster) {
        // Add to existing cluster
        bestCluster.segments.push(segment);
        bestCluster.fingerprint = updateFingerprint(bestCluster.fingerprint, fingerprint);
        bestCluster.confidence = Math.min(bestCluster.confidence, bestSimilarity);
      } else {
        // Create new cluster
        clusters.push({
          id: `speaker_${clusters.length + 1}`,
          name: `Speaker ${clusters.length + 1}`,
          color: CI_SPEAKER_COLORS[clusters.length % CI_SPEAKER_COLORS.length],
          fingerprint,
          segments: [segment],
          confidence: 1.0
        });
      }
    });
    
    return clusters;
  };

  /**
   * Calculate similarity between two voice fingerprints
   */
  const calculateVoiceSimilarity = (fp1: VoiceFingerprint, fp2: VoiceFingerprint): number => {
    // Pitch similarity (weighted 30%)
    const pitchSim = 1 - Math.min(1, Math.abs(fp1.avgPitch - fp2.avgPitch) / 100);
    
    // Speech rate similarity (weighted 25%)
    const rateSim = 1 - Math.min(1, Math.abs(fp1.speechRate - fp2.speechRate) / 3);
    
    // Textual style similarity (weighted 20%)
    const styleSim = fp1.textualStyle === fp2.textualStyle ? 1 : 0.3;
    
    // Volume profile similarity (weighted 25%)
    const volSim = calculateVolumeProfileSimilarity(fp1.volumeProfile, fp2.volumeProfile);
    
    return (pitchSim * 0.3) + (rateSim * 0.25) + (styleSim * 0.2) + (volSim * 0.25);
  };

  /**
   * Calculate volume profile similarity
   */
  const calculateVolumeProfileSimilarity = (vol1: number[], vol2: number[]): number => {
    if (vol1.length === 0 || vol2.length === 0) return 0.5;
    
    const avg1 = vol1.reduce((a, b) => a + b, 0) / vol1.length;
    const avg2 = vol2.reduce((a, b) => a + b, 0) / vol2.length;
    
    return 1 - Math.min(1, Math.abs(avg1 - avg2) / 50);
  };

  /**
   * Update cluster fingerprint with new segment data
   */
  const updateFingerprint = (existing: VoiceFingerprint, new_fp: VoiceFingerprint): VoiceFingerprint => {
    return {
      avgPitch: (existing.avgPitch + new_fp.avgPitch) / 2,
      pitchVariance: (existing.pitchVariance + new_fp.pitchVariance) / 2,
      speechRate: (existing.speechRate + new_fp.speechRate) / 2,
      pausePattern: (existing.pausePattern + new_fp.pausePattern) / 2,
      volumeProfile: [...existing.volumeProfile, ...new_fp.volumeProfile],
      textualStyle: existing.textualStyle // Keep original style
    };
  };

  /**
   * Refine clusters using temporal continuity (speakers tend to speak in chunks)
   */
  const refineWithTemporalContinuity = (
    clusters: SpeakerCluster[], 
    segments: CaptionSegment[]
  ): SpeakerCluster[] => {
    // Sort segments by time
    const sortedSegments = [...segments].sort((a, b) => a.startTime - b.startTime);
    
    // Apply temporal smoothing - if a segment is surrounded by the same speaker, consider reassigning
    let reassignments = 0;
    
    sortedSegments.forEach((segment, index) => {
      if (index === 0 || index === sortedSegments.length - 1) return;
      
      const prevSegment = sortedSegments[index - 1];
      const nextSegment = sortedSegments[index + 1];
      
      const currentCluster = clusters.find(c => c.segments.includes(segment));
      const prevCluster = clusters.find(c => c.segments.includes(prevSegment));
      const nextCluster = clusters.find(c => c.segments.includes(nextSegment));
      
      // If surrounded by same speaker and gap is small, reassign
      if (prevCluster && nextCluster && prevCluster.id === nextCluster.id && 
          currentCluster && currentCluster.id !== prevCluster.id &&
          (segment.startTime - prevSegment.endTime) < 1.0 && 
          (nextSegment.startTime - segment.endTime) < 1.0) {
        
        // Move segment to surrounding cluster
        currentCluster.segments = currentCluster.segments.filter(s => s !== segment);
        prevCluster.segments.push(segment);
        reassignments++;
      }
    });
    
    console.log('🔄 Temporal continuity refinement: made', reassignments, 'reassignments');
    
    // Remove empty clusters
    return clusters.filter(c => c.segments.length > 0);
  };

  /**
   * Assign meaningful speaker names based on content analysis
   */
  const assignSpeakerIdentities = (clusters: SpeakerCluster[]): SpeakerCluster[] => {
    const roleKeywords = {
      'Host': ['welcome', 'today', 'we will', 'let me show', 'first', 'next'],
      'Narrator': ['meanwhile', 'then', 'after that', 'suddenly'],
      'Chef': ['ingredients', 'recipe', 'cooking', 'delicious', 'stir', 'add'],
      'Child': ['wow', 'cool', 'awesome', 'can we', 'I want', 'yay'],
      'Teacher': ['class', 'students', 'lesson', 'remember', 'learn'],
      'Expert': ['research', 'studies', 'according to', 'data shows']
    };
    
    return clusters.map((cluster, index) => {
      const allText = cluster.segments.map(s => s.text).join(' ').toLowerCase();
      
      let bestRole = '';
      let maxScore = 0;
      
      Object.entries(roleKeywords).forEach(([role, keywords]) => {
        const score = keywords.filter(keyword => allText.includes(keyword)).length;
        if (score > maxScore) {
          maxScore = score;
          bestRole = role;
        }
      });
      
      // If no role detected, use voice characteristics
      if (!bestRole) {
        const avgPitch = cluster.fingerprint.avgPitch;
        if (avgPitch > 200) bestRole = 'High Voice';
        else if (avgPitch < 140) bestRole = 'Low Voice';
        else bestRole = `Speaker ${index + 1}`;
      }
      
      return {
        ...cluster,
        name: bestRole,
        color: CI_SPEAKER_COLORS[index % CI_SPEAKER_COLORS.length]
      };
    });
  };

  /**
   * Analyze textual style of speech
   */
  const analyzeTextualStyle = (text: string): 'formal' | 'informal' | 'technical' | 'conversational' => {
    const lowerText = text.toLowerCase();
    
    const formalWords = ['please', 'thank you', 'would', 'could', 'shall'];
    const informalWords = ['yeah', 'okay', 'um', 'like', 'gonna'];
    const technicalWords = ['system', 'process', 'analysis', 'data', 'configure'];
    const conversationalWords = ['really', 'actually', 'maybe', 'I think', 'you know'];
    
    const scores = {
      formal: formalWords.filter(w => lowerText.includes(w)).length,
      informal: informalWords.filter(w => lowerText.includes(w)).length,
      technical: technicalWords.filter(w => lowerText.includes(w)).length,
      conversational: conversationalWords.filter(w => lowerText.includes(w)).length
    };
    
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) return 'conversational';
    
    return Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] as any || 'conversational';
  };

  /**
   * Create fallback clusters when advanced analysis fails
   */
  const createFallbackClusters = (segments: CaptionSegment[]): SpeakerCluster[] => {
    console.log('🔄 Using fallback speaker detection');
    
    const clusters: SpeakerCluster[] = [];
    let currentSpeakerIndex = 0;
    let lastEndTime = 0;
    
    segments.forEach((segment, index) => {
      // Switch speaker on long pauses or pitch changes
      if (index > 0) {
        const gap = segment.startTime - lastEndTime;
        if (gap > 2.0) { // 2 second pause suggests speaker change
          currentSpeakerIndex = (currentSpeakerIndex + 1) % 3; // Max 3 speakers
        }
      }
      
      let cluster = clusters.find(c => c.id === `fallback_${currentSpeakerIndex}`);
      
      if (!cluster) {
        cluster = {
          id: `fallback_${currentSpeakerIndex}`,
          name: `Speaker ${currentSpeakerIndex + 1}`,
          color: CI_SPEAKER_COLORS[currentSpeakerIndex],
          fingerprint: extractVoiceFingerprint(segment),
          segments: [],
          confidence: 0.7
        };
        clusters.push(cluster);
      }
      
      cluster.segments.push(segment);
      lastEndTime = segment.endTime;
    });
    
    return clusters;
  };

  return {
    analyzeSpeakers,
    isAnalyzing
  };
};