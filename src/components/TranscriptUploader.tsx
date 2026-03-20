import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TranscriptSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  speaker: string;
  speakerColor: string;
  emphasis: 'normal' | 'loud' | 'quiet' | 'yelling';
  pitch: 'normal' | 'high' | 'low';
}

interface TranscriptUploaderProps {
  onTranscriptUploaded: (segments: TranscriptSegment[], language: string) => void;
  onCancel?: () => void;
  className?: string;
}

export const TranscriptUploader: React.FC<TranscriptUploaderProps> = ({
  onTranscriptUploaded,
  onCancel,
  className = ""
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [language, setLanguage] = useState('en');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [previewSegments, setPreviewSegments] = useState<TranscriptSegment[]>([]);
  const { toast } = useToast();

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'tr', name: 'Turkish' },
  ];

  // Use unified color palette from cwiPalette
  const getSpeakerColor = (speakerName: string) => {
    const { getSpeakerColor: getColor } = require('@/lib/cwiPalette');
    return getColor(speakerName);
  };

  // Convert timestamp formats to seconds
  const parseTimestamp = (timeStr: string): number => {
    // Handle different timestamp formats
    // SRT format: "00:01:23,456" or "00:01:23.456"
    // VTT format: "00:01:23.456"
    // Simple format: "1:23.456" or "83.456"
    
    timeStr = timeStr.trim().replace(',', '.');
    
    // If it's just seconds (like "83.456")
    if (/^\d+\.?\d*$/.test(timeStr)) {
      return parseFloat(timeStr);
    }
    
    // If it has colons (like "1:23.456" or "00:01:23.456")
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      // Format: "1:23.456"
      const minutes = parseInt(parts[0], 10);
      const seconds = parseFloat(parts[1]);
      return minutes * 60 + seconds;
    } else if (parts.length === 3) {
      // Format: "00:01:23.456"
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      const seconds = parseFloat(parts[2]);
      return hours * 3600 + minutes * 60 + seconds;
    }
    
    return 0;
  };

  // Parse SRT format
  const parseSRT = (content: string): TranscriptSegment[] => {
    const segments: TranscriptSegment[] = [];
    const blocks = content.trim().split(/\n\s*\n/);
    
    blocks.forEach((block, index) => {
      const lines = block.trim().split('\n');
      if (lines.length < 3) return;
      
      // Skip the sequence number (first line)
      const timecodeLine = lines[1];
      const textLines = lines.slice(2);
      
      // Parse timecode: "00:01:23,456 --> 00:02:34,789"
      const timecodeMatch = timecodeLine.match(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/);
      if (!timecodeMatch) return;
      
      const startTime = parseTimestamp(timecodeMatch[1]);
      const endTime = parseTimestamp(timecodeMatch[2]);
      const text = textLines.join(' ').trim();
      
      if (text) {
        segments.push({
          id: `segment-${index}`,
          text,
          startTime,
          endTime,
          speaker: `Speaker ${(index % 3) + 1}`,
          speakerColor: getSpeakerColor(`Speaker ${(index % 3) + 1}`),
          emphasis: 'normal',
          pitch: 'normal'
        });
      }
    });
    
    return segments;
  };

  // Parse VTT format
  const parseVTT = (content: string): TranscriptSegment[] => {
    const segments: TranscriptSegment[] = [];
    const lines = content.split('\n');
    let currentSegment: Partial<TranscriptSegment> = {};
    let segmentIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip WEBVTT header and empty lines
      if (!line || line === 'WEBVTT' || line.startsWith('NOTE')) continue;
      
      // Check for timecode line: "00:01:23.456 --> 00:02:34.789"
      const timecodeMatch = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/);
      if (timecodeMatch) {
        // If we have a previous segment, save it
        if (currentSegment.text) {
          segments.push({
            id: `segment-${segmentIndex}`,
            text: currentSegment.text,
            startTime: currentSegment.startTime || 0,
            endTime: currentSegment.endTime || 0,
            speaker: `Speaker ${(segmentIndex % 3) + 1}`,
            speakerColor: getSpeakerColor(`Speaker ${(segmentIndex % 3) + 1}`),
            emphasis: 'normal',
            pitch: 'normal'
          });
          segmentIndex++;
        }
        
        // Start new segment
        currentSegment = {
          startTime: parseTimestamp(timecodeMatch[1]),
          endTime: parseTimestamp(timecodeMatch[2]),
          text: ''
        };
      } else if (currentSegment.startTime !== undefined && line) {
        // This is text content
        currentSegment.text = (currentSegment.text || '') + (currentSegment.text ? ' ' : '') + line;
      }
    }
    
    // Don't forget the last segment
    if (currentSegment.text) {
      segments.push({
        id: `segment-${segmentIndex}`,
        text: currentSegment.text,
        startTime: currentSegment.startTime || 0,
        endTime: currentSegment.endTime || 0,
        speaker: `Speaker ${(segmentIndex % 3) + 1}`,
        speakerColor: getSpeakerColor(`Speaker ${(segmentIndex % 3) + 1}`),
        emphasis: 'normal',
        pitch: 'normal'
      });
    }
    
    return segments;
  };

  // Parse simple text format with timestamps
  const parseSimpleText = (content: string): TranscriptSegment[] => {
    const segments: TranscriptSegment[] = [];
    const lines = content.split('\n').filter(line => line.trim());
    
    lines.forEach((line, index) => {
      line = line.trim();
      if (!line) return;
      
      // Try different patterns for timestamps
      let match;
      let startTime = 0;
      let endTime = 0;
      let text = line;
      
      // Pattern 1: [00:01:23 - 00:02:34] Text here
      match = line.match(/^\[([^\]]+)\s*-\s*([^\]]+)\]\s*(.+)$/);
      if (match) {
        startTime = parseTimestamp(match[1]);
        endTime = parseTimestamp(match[2]);
        text = match[3].trim();
      }
      // Pattern 2: 00:01:23 - 00:02:34: Text here
      else {
        match = line.match(/^([^:]+)\s*-\s*([^:]+):\s*(.+)$/);
        if (match) {
          startTime = parseTimestamp(match[1]);
          endTime = parseTimestamp(match[2]);
          text = match[3].trim();
        }
        // Pattern 3: 83.5: Text here (just start time)
        else {
          match = line.match(/^(\d+\.?\d*)\s*:\s*(.+)$/);
          if (match) {
            startTime = parseFloat(match[1]);
            endTime = startTime + 3; // Default 3 second duration
            text = match[2].trim();
          }
        }
      }
      
      if (text) {
        segments.push({
          id: `segment-${index}`,
          text,
          startTime,
          endTime,
          speaker: `Speaker ${(index % 3) + 1}`,
          speakerColor: getSpeakerColor(`Speaker ${(index % 3) + 1}`),
          emphasis: 'normal',
          pitch: 'normal'
        });
      }
    });
    
    return segments;
  };

  const parseTranscriptFile = async (file: File): Promise<TranscriptSegment[]> => {
    const content = await file.text();
    const extension = file.name.toLowerCase().split('.').pop();
    
    let segments: TranscriptSegment[] = [];
    
    try {
      switch (extension) {
        case 'srt':
          segments = parseSRT(content);
          break;
        case 'vtt':
        case 'webvtt':
          segments = parseVTT(content);
          break;
        case 'txt':
        default:
          segments = parseSimpleText(content);
          break;
      }
      
      // Validate segments
      if (segments.length === 0) {
        throw new Error('No valid transcript segments found in file');
      }
      
      // Sort by start time
      segments.sort((a, b) => a.startTime - b.startTime);
      
      return segments;
    } catch (error) {
      throw new Error(`Failed to parse transcript: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setParseError(null);
    setPreviewSegments([]);
    
    // Validate file type
    const validExtensions = ['srt', 'vtt', 'webvtt', 'txt'];
    const extension = file.name.toLowerCase().split('.').pop();
    
    if (!extension || !validExtensions.includes(extension)) {
      setParseError('Please select a valid transcript file (.srt, .vtt, or .txt)');
      return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setParseError('File too large. Maximum size is 10MB.');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const segments = await parseTranscriptFile(file);
      setPreviewSegments(segments);
      
      toast({
        title: "Transcript Parsed",
        description: `Successfully parsed ${segments.length} segments from ${file.name}`,
      });
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Failed to parse transcript file');
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleUpload = () => {
    if (previewSegments.length > 0) {
      onTranscriptUploaded(previewSegments, language);
      toast({
        title: "Transcript Uploaded",
        description: `${previewSegments.length} segments uploaded successfully`,
      });
    }
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Transcript File
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging 
                ? 'border-primary bg-primary/10' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2">
                {isProcessing ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                ) : (
                  <FileText className="w-12 h-12 text-muted-foreground" />
                )}
                <div>
                  <p className="text-lg font-medium">
                    {isProcessing ? 'Processing...' : 'Drop transcript file here'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Or click to browse files
                  </p>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Supported formats: SRT, VTT, TXT with timestamps</p>
                <p>Max file size: 10MB</p>
              </div>
              
              <Input
                type="file"
                accept=".srt,.vtt,.webvtt,.txt"
                onChange={handleFileInputChange}
                className="cursor-pointer"
              />
            </div>
          </div>

          {/* Language Selection */}
          <div className="space-y-2">
            <Label htmlFor="language">Transcript Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Error Display */}
          {parseError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          {/* File Info */}
          {selectedFile && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(1)} KB)
              </AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {previewSegments.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Preview ({previewSegments.length} segments)
              </h4>
              
              <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-3">
                {previewSegments.slice(0, 5).map((segment, index) => (
                  <div key={segment.id} className="text-sm space-y-1 border-b pb-2 last:border-b-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>
                        {Math.floor(segment.startTime / 60)}:{(segment.startTime % 60).toFixed(1).padStart(4, '0')} - {Math.floor(segment.endTime / 60)}:{(segment.endTime % 60).toFixed(1).padStart(4, '0')}
                      </span>
                      <User className="w-3 h-3 ml-2" />
                      <span style={{ color: segment.speakerColor }}>{segment.speaker}</span>
                    </div>
                    <p className="text-sm">{segment.text}</p>
                  </div>
                ))}
                {previewSegments.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    ...and {previewSegments.length - 5} more segments
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button 
              onClick={handleUpload} 
              disabled={previewSegments.length === 0 || isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </div>
              ) : (
                `Upload ${previewSegments.length} Segments`
              )}
            </Button>
          </div>

          {/* Format Examples */}
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer font-medium mb-2">Supported Format Examples</summary>
            <div className="space-y-2 pl-4">
              <div>
                <strong>SRT Format:</strong>
                <pre className="bg-muted p-2 rounded mt-1 text-xs">
{`1
00:00:10,500 --> 00:00:13,000
This is the first subtitle

2
00:00:14,000 --> 00:00:18,000
This is the second subtitle`}
                </pre>
              </div>
              <div>
                <strong>Simple Text Format:</strong>
                <pre className="bg-muted p-2 rounded mt-1 text-xs">
{`[00:00:10 - 00:00:13] This is the first line
[00:00:14 - 00:00:18] This is the second line
10.5: Or just start time with text`}
                </pre>
              </div>
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  );
};