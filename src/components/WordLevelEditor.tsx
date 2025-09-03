import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Volume2, Music } from 'lucide-react';

export interface WordData {
  text: string;
  emphasis?: 'loud' | 'quiet' | 'normal' | 'yelling';
  pitch?: 'high' | 'low' | 'normal';
}

interface WordLevelEditorProps {
  initialText: string;
  onWordsChange: (words: WordData[]) => void;
  className?: string;
}

export const WordLevelEditor: React.FC<WordLevelEditorProps> = ({
  initialText,
  onWordsChange,
  className = ""
}) => {
  const [words, setWords] = useState<WordData[]>([]);
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(null);

  // Initialize words from text
  useEffect(() => {
    const wordTexts = initialText.split(/\s+/).filter(word => word.trim());
    const initialWords: WordData[] = wordTexts.map(text => ({
      text: text,
      emphasis: 'normal',
      pitch: 'normal'
    }));
    setWords(initialWords);
    onWordsChange(initialWords);
  }, [initialText]);

  const updateWord = (index: number, updates: Partial<WordData>) => {
    const updatedWords = words.map((word, i) => 
      i === index ? { ...word, ...updates } : word
    );
    setWords(updatedWords);
    onWordsChange(updatedWords);
  };

  const getWordStyle = (word: WordData): React.CSSProperties => {
    const styles: React.CSSProperties = {
      cursor: 'pointer',
      padding: '2px 4px',
      borderRadius: '3px',
      margin: '1px',
      display: 'inline-block',
      transition: 'all 0.2s ease'
    };

    // Base styling based on properties
    if (word.emphasis === 'loud') {
      styles.backgroundColor = '#fee2e2';
      styles.color = '#dc2626';
      styles.fontWeight = 'bold';
      styles.fontSize = '1.1em';
    } else if (word.emphasis === 'quiet') {
      styles.backgroundColor = '#f3f4f6';
      styles.color = '#6b7280';
      styles.fontSize = '0.9em';
    } else {
      styles.backgroundColor = '#f8fafc';
      styles.color = '#374151';
    }

    // Pitch styling
    if (word.pitch === 'high') {
      styles.fontStretch = '75%';
      styles.textDecoration = 'underline';
      styles.textDecorationColor = '#3b82f6';
    } else if (word.pitch === 'low') {
      styles.fontStretch = '125%';
      styles.borderBottom = '2px solid #8b5cf6';
    }

    return styles;
  };

  const getWordBadges = (word: WordData) => {
    const badges = [];
    if (word.emphasis !== 'normal') {
      badges.push(
        <Badge key="emphasis" variant="secondary" className="text-xs">
          {word.emphasis}
        </Badge>
      );
    }
    if (word.pitch !== 'normal') {
      badges.push(
        <Badge key="pitch" variant="outline" className="text-xs">
          {word.pitch}
        </Badge>
      );
    }
    return badges;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Instructions */}
      <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-md border">
        <p className="font-medium mb-1">Word-Level Editing:</p>
        <p>• Click on any word to select and modify its emphasis or pitch</p>
        <p>• <strong className="text-red-600">Loud</strong> words appear larger and bold</p>
        <p>• <span className="text-gray-500">Quiet</span> words appear smaller and muted</p>
        <p>• <u className="text-blue-600">High pitch</u> words are underlined</p>
        <p>• <span className="border-b-2 border-purple-500">Low pitch</span> words have bottom border</p>
      </div>

      {/* Word Selection Area */}
      <div className="border rounded-lg p-4 bg-white min-h-24">
        <div className="flex flex-wrap gap-1 leading-relaxed">
          {words.map((word, index) => (
            <span
              key={index}
              style={getWordStyle(word)}
              className={`
                ${selectedWordIndex === index ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}
              `}
              onClick={() => setSelectedWordIndex(selectedWordIndex === index ? null : index)}
              title={`Click to edit "${word.text}"`}
            >
              {word.text}
              {(word.emphasis !== 'normal' || word.pitch !== 'normal') && (
                <sup className="ml-1">
                  {word.emphasis === 'loud' && '↗'}
                  {word.emphasis === 'quiet' && '↘'}
                  {word.pitch === 'high' && '♪'}
                  {word.pitch === 'low' && '♫'}
                </sup>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Word Properties Editor */}
      {selectedWordIndex !== null && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            Editing: <span className="text-blue-600">"{words[selectedWordIndex]?.text}"</span>
            <div className="flex gap-1">
              {getWordBadges(words[selectedWordIndex])}
            </div>
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Emphasis Control */}
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Volume Emphasis
              </Label>
              <Select 
                value={words[selectedWordIndex]?.emphasis || 'normal'} 
                onValueChange={(value) => updateWord(selectedWordIndex, { emphasis: value as 'loud' | 'quiet' | 'normal' | 'yelling' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="loud">Loud (Shouting)</SelectItem>
                  <SelectItem value="quiet">Quiet (Whisper)</SelectItem>
                  <SelectItem value="yelling">Yelling (Bold)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pitch Control */}
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                <Music className="w-4 h-4" />
                Pitch Level
              </Label>
              <Select 
                value={words[selectedWordIndex]?.pitch || 'normal'} 
                onValueChange={(value) => updateWord(selectedWordIndex, { pitch: value as 'high' | 'low' | 'normal' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High Pitch</SelectItem>
                  <SelectItem value="low">Low Pitch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mt-4">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => updateWord(selectedWordIndex, { emphasis: 'normal', pitch: 'normal' })}
            >
              Reset to Normal
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => setSelectedWordIndex(null)}
            >
              Done Editing
            </Button>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="text-xs text-muted-foreground">
        Words modified: {words.filter(w => w.emphasis !== 'normal' || w.pitch !== 'normal').length} / {words.length}
      </div>
    </div>
  );
};