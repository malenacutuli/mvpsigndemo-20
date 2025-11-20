import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { removeFillerWords } from '@/services/fillerWordProcessor';
import {
  Search,
  Trash2,
  AlertCircle,
  Info,
  Settings,
  Play,
  Loader2,
  Download,
  CheckCircle
} from 'lucide-react';

interface FillerWord {
  id: string;
  word: string;
  count: number;
  instances: FillerInstance[];
  category: 'common' | 'pause' | 'custom';
  severity: 'high' | 'medium' | 'low';
  selected: boolean;
}

interface FillerInstance {
  segmentId: string;
  wordIndex: number;
  startTime: number;
  endTime: number;
  context: string;
  confidence: number;
  marked: boolean;
}

interface DetectionSettings {
  detectCommon: boolean;
  detectPauses: boolean;
  detectCustom: boolean;
  customWords: string[];
  pauseThreshold: number;
  confidenceThreshold: number;
  contextWindow: number;
}

interface FillerWordDetectorProps {
  videoId: string;
  onSeek?: (time: number) => void;
}

// Default filler words
const DEFAULT_FILLERS = {
  common: ['um', 'uh', 'ah', 'er', 'like', 'you know', 'actually', 'basically', 'literally', 'sort of', 'kind of', 'I mean', 'right'],
  pause: ['...', '—', 'hmm', 'mmm'],
  custom: []
};

// Severity thresholds
const SEVERITY_THRESHOLDS = {
  high: 10,
  medium: 5,
  low: 1
};

export function FillerWordDetector({ videoId, onSeek }: FillerWordDetectorProps) {
  const [fillerWords, setFillerWords] = useState<FillerWord[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [selectedCount, setSelectedCount] = useState(0);
  const [settings, setSettings] = useState<DetectionSettings>({
    detectCommon: true,
    detectPauses: true,
    detectCustom: false,
    customWords: [],
    pauseThreshold: 2,
    confidenceThreshold: 0.7,
    contextWindow: 20
  });
  const [viewMode, setViewMode] = useState<'list' | 'stats' | 'timeline'>('list');
  const [filterCategory, setFilterCategory] = useState<'all' | 'common' | 'pause' | 'custom'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalInstances = fillerWords.reduce((sum, fw) => sum + fw.count, 0);
    const totalDuration = fillerWords.reduce((sum, fw) => 
      sum + fw.instances.reduce((iSum, inst) => iSum + (inst.endTime - inst.startTime), 0), 0
    );
    const selectedInstances = fillerWords
      .filter(fw => fw.selected)
      .reduce((sum, fw) => sum + fw.count, 0);
    const selectedDuration = fillerWords
      .filter(fw => fw.selected)
      .reduce((sum, fw) => 
        sum + fw.instances.reduce((iSum, inst) => iSum + (inst.endTime - inst.startTime), 0), 0
      );

    return {
      totalWords: fillerWords.length,
      totalInstances,
      totalDuration: totalDuration.toFixed(2),
      selectedInstances,
      selectedDuration: selectedDuration.toFixed(2),
      averagePerMinute: totalInstances > 0 ? (totalInstances / (totalDuration / 60)).toFixed(1) : '0',
      highSeverity: fillerWords.filter(fw => fw.severity === 'high').length,
      mediumSeverity: fillerWords.filter(fw => fw.severity === 'medium').length,
      lowSeverity: fillerWords.filter(fw => fw.severity === 'low').length
    };
  }, [fillerWords]);

  // Scan for filler words
  const scanForFillers = async () => {
    setIsScanning(true);
    setScanProgress(0);
    
    try {
      const { data: segments, error } = await supabase
        .from('transcript_segments')
        .select('*')
        .eq('video_id', videoId)
        .order('start_time');

      if (error) throw error;
      if (!segments || segments.length === 0) {
        toast.error('No transcript found. Please generate a transcript first.');
        return;
      }

      const detectedFillers: Map<string, FillerWord> = new Map();
      let processedSegments = 0;

      for (const segment of segments) {
        const text = segment.text.toLowerCase();
        
        // Check for common filler words
        if (settings.detectCommon) {
          for (const filler of DEFAULT_FILLERS.common) {
            const regex = new RegExp(`\\b${filler}\\b`, 'gi');
            let match;
            
            while ((match = regex.exec(text)) !== null) {
              const wordIndex = match.index;
              const instance: FillerInstance = {
                segmentId: segment.id,
                wordIndex,
                startTime: segment.start_time,
                endTime: segment.start_time + 0.5,
                context: text.substring(
                  Math.max(0, wordIndex - settings.contextWindow), 
                  Math.min(text.length, wordIndex + filler.length + settings.contextWindow)
                ),
                confidence: 0.95,
                marked: false
              };

              if (!detectedFillers.has(filler)) {
                detectedFillers.set(filler, {
                  id: `filler-${Date.now()}-${filler}`,
                  word: filler,
                  count: 0,
                  instances: [],
                  category: 'common',
                  severity: 'low',
                  selected: false
                });
              }

              const fillerWord = detectedFillers.get(filler)!;
              fillerWord.instances.push(instance);
              fillerWord.count++;
            }
          }
        }

        // Check for custom words
        if (settings.detectCustom && settings.customWords.length > 0) {
          for (const customWord of settings.customWords) {
            const regex = new RegExp(`\\b${customWord}\\b`, 'gi');
            let match;
            
            while ((match = regex.exec(text)) !== null) {
              const wordIndex = match.index;
              const instance: FillerInstance = {
                segmentId: segment.id,
                wordIndex,
                startTime: segment.start_time,
                endTime: segment.start_time + 0.5,
                context: text.substring(
                  Math.max(0, wordIndex - settings.contextWindow), 
                  Math.min(text.length, wordIndex + customWord.length + settings.contextWindow)
                ),
                confidence: 0.9,
                marked: false
              };

              if (!detectedFillers.has(customWord)) {
                detectedFillers.set(customWord, {
                  id: `filler-custom-${customWord}`,
                  word: customWord,
                  count: 0,
                  instances: [],
                  category: 'custom',
                  severity: 'low',
                  selected: false
                });
              }

              detectedFillers.get(customWord)!.instances.push(instance);
              detectedFillers.get(customWord)!.count++;
            }
          }
        }

        processedSegments++;
        setScanProgress((processedSegments / segments.length) * 100);
      }

      // Calculate severity
      const fillerArray = Array.from(detectedFillers.values());
      fillerArray.forEach(filler => {
        if (filler.count >= SEVERITY_THRESHOLDS.high) {
          filler.severity = 'high';
        } else if (filler.count >= SEVERITY_THRESHOLDS.medium) {
          filler.severity = 'medium';
        } else {
          filler.severity = 'low';
        }
      });

      fillerArray.sort((a, b) => b.count - a.count);
      
      setFillerWords(fillerArray);
      toast.success(`Found ${fillerArray.length} different filler words with ${fillerArray.reduce((sum, fw) => sum + fw.count, 0)} total instances`);
    } catch (error: any) {
      console.error('Filler detection error:', error);
      toast.error('Failed to scan for filler words');
    } finally {
      setIsScanning(false);
      setScanProgress(100);
    }
  };

  // Remove selected fillers
  const removeSelectedFillers = async () => {
    const instancesToRemove = fillerWords
      .filter(fw => fw.selected)
      .flatMap(fw => fw.instances);

    if (instancesToRemove.length === 0) {
      toast.error('No filler words selected');
      return;
    }

    setIsRemoving(true);
    
    try {
      await removeFillerWords(videoId, instancesToRemove);
      
      setFillerWords(fillerWords.filter(fw => !fw.selected));
      setSelectedCount(0);
      
      toast.success(`Removed ${instancesToRemove.length} filler instances`);
    } catch (error: any) {
      toast.error('Failed to remove filler words');
    } finally {
      setIsRemoving(false);
    }
  };

  // Toggle selection
  const toggleSelection = (fillerId: string) => {
    setFillerWords(fillerWords.map(fw => {
      if (fw.id === fillerId) {
        fw.selected = !fw.selected;
      }
      return fw;
    }));
    
    setSelectedCount(fillerWords.filter(fw => fw.selected).length);
  };

  // Select all/none
  const selectAll = () => {
    setFillerWords(fillerWords.map(fw => ({ ...fw, selected: true })));
    setSelectedCount(fillerWords.length);
  };

  const selectNone = () => {
    setFillerWords(fillerWords.map(fw => ({ ...fw, selected: false })));
    setSelectedCount(0);
  };

  // Select by severity
  const selectBySeverity = (severity: 'high' | 'medium' | 'low') => {
    setFillerWords(fillerWords.map(fw => ({
      ...fw,
      selected: fw.severity === severity
    })));
    setSelectedCount(fillerWords.filter(fw => fw.severity === severity).length);
  };

  // Filter fillers
  const filteredFillers = useMemo(() => {
    let filtered = fillerWords;
    
    if (filterCategory !== 'all') {
      filtered = filtered.filter(fw => fw.category === filterCategory);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(fw => 
        fw.word.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [fillerWords, filterCategory, searchQuery]);

  // Generate report
  const generateReport = () => {
    const report = {
      videoId,
      scanDate: new Date().toISOString(),
      statistics,
      fillerWords: fillerWords.map(fw => ({
        word: fw.word,
        count: fw.count,
        category: fw.category,
        severity: fw.severity,
        instances: fw.instances.length
      }))
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `filler-word-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Report downloaded');
  };

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Filler Word Detection
              </CardTitle>
              <CardDescription>
                Identify and remove filler words to improve speech clarity
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={scanForFillers}
                disabled={isScanning}
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Scan
                  </>
                )}
              </Button>
              
              <Button
                onClick={removeSelectedFillers}
                disabled={selectedCount === 0 || isRemoving}
                variant="destructive"
              >
                {isRemoving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Remove Selected ({selectedCount})
              </Button>
            </div>
          </div>

          {isScanning && (
            <div className="mt-4 space-y-2">
              <Progress value={scanProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Analyzing transcript... {Math.round(scanProgress)}%
              </p>
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          {fillerWords.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Fillers</p>
                <p className="text-2xl font-bold">{statistics.totalInstances}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="text-2xl font-bold">{statistics.totalDuration}s</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Per Minute</p>
                <p className="text-2xl font-bold">{statistics.averagePerMinute}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Selected</p>
                <p className="text-2xl font-bold text-destructive">
                  {statistics.selectedInstances}
                </p>
              </div>
            </div>
          )}

          <div className="mb-4">
            <details className="group">
              <summary className="cursor-pointer list-none">
                <div className="flex items-center gap-2 text-sm font-medium py-2">
                  <Settings className="w-4 h-4 transition-transform group-open:rotate-90" />
                  Detection Settings
                </div>
              </summary>
              
              <div className="mt-4 space-y-4 pl-6">
                <div className="flex items-center justify-between">
                  <Label>Detect Common Fillers</Label>
                  <Switch
                    checked={settings.detectCommon}
                    onCheckedChange={(checked) => 
                      setSettings({ ...settings, detectCommon: checked })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>Detect Pauses</Label>
                  <Switch
                    checked={settings.detectPauses}
                    onCheckedChange={(checked) => 
                      setSettings({ ...settings, detectPauses: checked })
                    }
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Pause Threshold: {settings.pauseThreshold}s</Label>
                  <Slider
                    value={[settings.pauseThreshold]}
                    onValueChange={([value]) => 
                      setSettings({ ...settings, pauseThreshold: value })
                    }
                    min={0.5}
                    max={5}
                    step={0.5}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Custom Words</Label>
                  <Input
                    placeholder="Enter custom words separated by commas"
                    onBlur={(e) => {
                      const words = e.target.value.split(',').map(w => w.trim()).filter(Boolean);
                      setSettings({ 
                        ...settings, 
                        customWords: words,
                        detectCustom: words.length > 0
                      });
                    }}
                  />
                </div>
              </div>
            </details>
          </div>

          <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="stats">Statistics</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={selectAll}>
                    Select All
                  </Button>
                  <Button size="sm" variant="outline" onClick={selectNone}>
                    Clear
                  </Button>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => selectBySeverity('high')}>
                      High
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => selectBySeverity('medium')}>
                      Medium
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => selectBySeverity('low')}>
                      Low
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search fillers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-48"
                  />
                  <Select value={filterCategory} onValueChange={(v: any) => setFilterCategory(v)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="common">Common</SelectItem>
                      <SelectItem value="pause">Pauses</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {filteredFillers.map((filler) => (
                    <Card
                      key={filler.id}
                      className={cn(
                        "cursor-pointer transition-all",
                        filler.selected && "ring-2 ring-destructive"
                      )}
                      onClick={() => toggleSelection(filler.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={filler.selected}
                              onCheckedChange={() => toggleSelection(filler.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">"{filler.word}"</span>
                                <Badge variant={
                                  filler.severity === 'high' ? 'destructive' :
                                  filler.severity === 'medium' ? 'default' : 'secondary'
                                }>
                                  {filler.severity}
                                </Badge>
                                <Badge variant="outline">
                                  {filler.category}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {filler.count} instance{filler.count > 1 ? 's' : ''}
                                {' • '}
                                {filler.instances.reduce((sum, inst) => 
                                  sum + (inst.endTime - inst.startTime), 0
                                ).toFixed(2)}s total
                              </div>
                            </div>
                          </div>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSeek && filler.instances[0]) {
                                onSeek(filler.instances[0].startTime);
                              }
                            }}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        </div>

                        {filler.instances.length > 0 && (
                          <div className="mt-3 text-xs text-muted-foreground">
                            <p>Example: "...{filler.instances[0].context}..."</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="stats" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Severity Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">High</span>
                        <Badge variant="destructive">{statistics.highSeverity}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Medium</span>
                        <Badge>{statistics.mediumSeverity}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Low</span>
                        <Badge variant="secondary">{statistics.lowSeverity}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Top Fillers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {fillerWords.slice(0, 3).map((filler) => (
                        <div key={filler.id} className="flex items-center justify-between">
                          <span className="text-sm">{filler.word}</span>
                          <Badge variant="outline">{filler.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Impact Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Removing all selected fillers will reduce your video by{' '}
                        <strong>{statistics.selectedDuration} seconds</strong>
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>

              <Button onClick={generateReport} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </Button>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Timeline visualization shows filler word distribution throughout your video.
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
