import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Play, Pause, Search, Volume2, VolumeX,
  Scissors, Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Word {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  speaker: string;
  speakerColor: string;
  confidence: number;
  isFillerWord: boolean;
  isSilence: boolean;
}

interface Paragraph {
  id: string;
  speaker: string;
  speakerColor: string;
  startTime: number;
  endTime: number;
  words: Word[];
}

interface TextBasedEditorProps {
  videoId: string;
  videoUrl: string;
  onTimeUpdate: (time: number) => void;
  currentTime: number;
}

export function TextBasedEditor({ 
  videoId, 
  onTimeUpdate,
  currentTime 
}: TextBasedEditorProps) {
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFillerWords] = useState(true);
  const editorRef = useRef<HTMLDivElement>(null);

  // Load transcript with word-level timing
  useEffect(() => {
    loadTranscript();
  }, [videoId]);

  const loadTranscript = async () => {
    try {
      const { data: segments, error } = await supabase
        .from('premium_transcript_segments')
        .select('*')
        .eq('project_id', videoId)
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Convert segments to word-level paragraphs
      const paras = convertSegmentsToParagraphs(segments || []);
      setParagraphs(paras);
      
    } catch (error) {
      console.error('Failed to load transcript:', error);
      toast.error('Failed to load transcript');
    }
  };

  const convertSegmentsToParagraphs = (segments: any[]): Paragraph[] => {
    const paragraphs: Paragraph[] = [];
    let currentPara: Paragraph | null = null;

    segments.forEach((segment) => {
      // Parse words from segment (assumes words array exists)
      const words: Word[] = (segment.words || []).map((w: any, i: number) => ({
        id: `${segment.id}-word-${i}`,
        text: w.text || w.word,
        startTime: w.start,
        endTime: w.end,
        speaker: segment.speaker || 'Unknown',
        speakerColor: segment.speaker_color || '#FFFFFF',
        confidence: w.confidence || 1.0,
        isFillerWord: isFillerWord(w.text || w.word),
        isSilence: w.text === '[SILENCE]'
      }));

      // Group by speaker into paragraphs
      if (!currentPara || currentPara.speaker !== segment.speaker) {
        if (currentPara) paragraphs.push(currentPara);
        
        currentPara = {
          id: `para-${segment.id}`,
          speaker: segment.speaker || 'Unknown',
          speakerColor: segment.speaker_color || '#FFFFFF',
          startTime: segment.start_time,
          endTime: segment.end_time,
          words
        };
      } else {
        currentPara.words.push(...words);
        currentPara.endTime = segment.end_time;
      }
    });

    if (currentPara) paragraphs.push(currentPara);
    return paragraphs;
  };

  const isFillerWord = (text: string): boolean => {
    const fillers = ['um', 'uh', 'like', 'you know', 'so', 'actually', 'basically'];
    return fillers.includes(text.toLowerCase().trim());
  };

  // Click word to jump to that time
  const handleWordClick = (word: Word) => {
    onTimeUpdate(word.startTime);
    setIsPlaying(true);
  };

  // Select words for editing
  const handleWordSelect = (wordId: string, isCtrlKey: boolean) => {
    const newSelection = new Set(selectedWords);
    
    if (isCtrlKey) {
      if (newSelection.has(wordId)) {
        newSelection.delete(wordId);
      } else {
        newSelection.add(wordId);
      }
    } else {
      newSelection.clear();
      newSelection.add(wordId);
    }
    
    setSelectedWords(newSelection);
  };

  // Delete selected words (removes from video)
  const deleteSelectedWords = async () => {
    if (selectedWords.size === 0) return;

    const wordsToDelete = Array.from(selectedWords);
    
    // Get time ranges to delete
    const ranges = wordsToDelete.map(id => {
      const word = findWordById(id);
      return word ? { start: word.startTime, end: word.endTime } : null;
    }).filter(Boolean);

    // Update database to mark words as deleted
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to edit');
        return;
      }

      // This would trigger video re-export without these segments
      await supabase
        .from('premium_video_edits')
        .insert({
          video_id: videoId,
          edit_type: 'delete_words',
          edit_data: { deleted_ranges: ranges },
          created_by: user.id
        });

      // Update UI
      setParagraphs(prev => {
        return prev.map(para => ({
          ...para,
          words: para.words.filter(w => !selectedWords.has(w.id))
        })).filter(para => para.words.length > 0);
      });

      setSelectedWords(new Set());
      toast.success(`Deleted ${wordsToDelete.length} words`);
      
    } catch (error) {
      console.error('Failed to delete words:', error);
      toast.error('Failed to delete words');
    }
  };

  // Remove all filler words
  const removeFillerWords = async () => {
    const fillerWordIds = paragraphs
      .flatMap(p => p.words)
      .filter(w => w.isFillerWord)
      .map(w => w.id);

    if (fillerWordIds.length === 0) {
      toast.info('No filler words found');
      return;
    }

    setSelectedWords(new Set(fillerWordIds));
    await deleteSelectedWords();
  };

  // Highlight current word during playback
  useEffect(() => {
    if (!isPlaying) return;

    const highlightCurrentWord = () => {
      const allWords = paragraphs.flatMap(p => p.words);
      const currentWord = allWords.find(
        w => currentTime >= w.startTime && currentTime < w.endTime
      );

      if (currentWord) {
        const element = document.getElementById(`word-${currentWord.id}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    highlightCurrentWord();
  }, [currentTime, isPlaying, paragraphs]);

  const findWordById = (id: string): Word | null => {
    for (const para of paragraphs) {
      const word = para.words.find(w => w.id === id);
      if (word) return word;
    }
    return null;
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>

          <div className="h-6 w-px bg-border mx-2" />

          <Button
            size="sm"
            variant="outline"
            onClick={removeFillerWords}
          >
            <Scissors className="w-4 h-4 mr-2" />
            Remove Filler Words
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={deleteSelectedWords}
            disabled={selectedWords.size === 0}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Selected ({selectedWords.size})
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search transcript..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-border rounded-md text-sm bg-background"
            />
          </div>
        </div>
      </div>

      {/* Text Editor */}
      <div className="flex-1 overflow-auto p-6" ref={editorRef}>
        {paragraphs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>No transcript available. Upload a video with transcript to get started.</p>
          </div>
        ) : (
          paragraphs.map((para) => (
            <div key={para.id} className="mb-6">
              {/* Speaker Label */}
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: para.speakerColor }}
                />
                <span className="text-sm font-semibold">{para.speaker}</span>
                <span className="text-xs text-muted-foreground">
                  {formatTime(para.startTime)}
                </span>
              </div>

              {/* Words */}
              <div className="text-lg leading-relaxed">
                {para.words.map((word, index) => {
                  const isSelected = selectedWords.has(word.id);
                  const isCurrent = 
                    isPlaying && 
                    currentTime >= word.startTime && 
                    currentTime < word.endTime;
                  const shouldHighlight = 
                    searchQuery && 
                    word.text.toLowerCase().includes(searchQuery.toLowerCase());

                  return (
                    <span
                      key={word.id}
                      id={`word-${word.id}`}
                      className={`
                        inline-block px-1 cursor-pointer transition-all rounded
                        ${isSelected ? 'bg-primary text-primary-foreground' : ''}
                        ${isCurrent ? 'bg-yellow-200 dark:bg-yellow-900' : ''}
                        ${shouldHighlight ? 'bg-green-200 dark:bg-green-900' : ''}
                        ${word.isFillerWord && showFillerWords ? 'text-red-500 line-through' : ''}
                        ${word.confidence < 0.5 ? 'text-muted-foreground' : ''}
                        hover:bg-muted
                      `}
                      onClick={() => handleWordClick(word)}
                      onMouseDown={(e) => {
                        if (e.button === 0) { // Left click
                          handleWordSelect(word.id, e.ctrlKey || e.metaKey);
                        }
                      }}
                    >
                      {word.text}{index < para.words.length - 1 ? ' ' : ''}
                    </span>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
