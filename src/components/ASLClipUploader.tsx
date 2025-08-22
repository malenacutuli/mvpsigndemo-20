import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, X, Video, HandHelping, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ASLClip {
  id: string;
  keywords: string[];
  videoFile: File;
  previewUrl: string;
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'error';
  uploadProgress: number;
}

interface ASLClipUploaderProps {
  onClipsUploaded?: (clips: ASLClip[]) => void;
}

export const ASLClipUploader: React.FC<ASLClipUploaderProps> = ({ onClipsUploaded }) => {
  const [clips, setClips] = useState<ASLClip[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Common recipe keywords for mapping
  const suggestedKeywords = [
    'cook', 'cooking', 'boil', 'boiling', 'stir', 'stirring', 
    'garlic', 'pasta', 'water', 'oil', 'salt', 'pepper',
    'chef', 'kitchen', 'recipe', 'eat', 'food', 'bake'
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    const videoFiles = files.filter(file => file.type.startsWith('video/'));
    
    if (videoFiles.length === 0) {
      toast({
        title: "Invalid file type",
        description: "Please upload video files only (.mp4, .webm, .mov)",
        variant: "destructive"
      });
      return;
    }

    const newClips: ASLClip[] = videoFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      keywords: [],
      videoFile: file,
      previewUrl: URL.createObjectURL(file),
      uploadStatus: 'pending',
      uploadProgress: 0
    }));

    setClips(prev => [...prev, ...newClips]);
  };

  const updateClipKeywords = (clipId: string, keywords: string[]) => {
    setClips(prev => prev.map(clip => 
      clip.id === clipId ? { ...clip, keywords } : clip
    ));
  };

  const addKeyword = (clipId: string, keyword: string) => {
    const trimmedKeyword = keyword.trim().toLowerCase();
    if (!trimmedKeyword) return;

    setClips(prev => prev.map(clip => 
      clip.id === clipId && !clip.keywords.includes(trimmedKeyword)
        ? { ...clip, keywords: [...clip.keywords, trimmedKeyword] }
        : clip
    ));
  };

  const removeKeyword = (clipId: string, keyword: string) => {
    setClips(prev => prev.map(clip => 
      clip.id === clipId 
        ? { ...clip, keywords: clip.keywords.filter(k => k !== keyword) }
        : clip
    ));
  };

  const removeClip = (clipId: string) => {
    setClips(prev => {
      const clip = prev.find(c => c.id === clipId);
      if (clip) {
        URL.revokeObjectURL(clip.previewUrl);
      }
      return prev.filter(c => c.id !== clipId);
    });
  };

  const simulateUpload = async (clip: ASLClip) => {
    // Simulate upload process
    setClips(prev => prev.map(c => 
      c.id === clip.id ? { ...c, uploadStatus: 'uploading', uploadProgress: 0 } : c
    ));

    // Simulate progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setClips(prev => prev.map(c => 
        c.id === clip.id ? { ...c, uploadProgress: progress } : c
      ));
    }

    // Mark as completed
    setClips(prev => prev.map(c => 
      c.id === clip.id ? { ...c, uploadStatus: 'completed' } : c
    ));

    // Save to local storage for demo purposes
    const aslClips = JSON.parse(localStorage.getItem('custom-asl-clips') || '{}');
    clip.keywords.forEach(keyword => {
      aslClips[keyword] = clip.previewUrl;
    });
    localStorage.setItem('custom-asl-clips', JSON.stringify(aslClips));
  };

  const uploadClip = async (clip: ASLClip) => {
    if (clip.keywords.length === 0) {
      toast({
        title: "Keywords required",
        description: "Please add at least one keyword for this clip",
        variant: "destructive"
      });
      return;
    }

    try {
      await simulateUpload(clip);
      toast({
        title: "Clip uploaded successfully",
        description: `ASL clip mapped to: ${clip.keywords.join(', ')}`,
      });
    } catch (error) {
      setClips(prev => prev.map(c => 
        c.id === clip.id ? { ...c, uploadStatus: 'error' } : c
      ));
      toast({
        title: "Upload failed",
        description: "There was an error uploading your clip",
        variant: "destructive"
      });
    }
  };

  const uploadAllClips = async () => {
    const pendingClips = clips.filter(c => c.uploadStatus === 'pending' && c.keywords.length > 0);
    
    if (pendingClips.length === 0) {
      toast({
        title: "No clips to upload",
        description: "Add keywords to your clips before uploading",
        variant: "destructive"
      });
      return;
    }

    for (const clip of pendingClips) {
      await uploadClip(clip);
    }

    onClipsUploaded?.(clips.filter(c => c.uploadStatus === 'completed'));
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HandHelping className="w-5 h-5" />
          Upload Custom ASL Clips
        </CardTitle>
        <CardDescription>
          Upload your sign language videos and map them to keywords for synchronized display in the recipe demo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Drop your ASL videos here</h3>
          <p className="text-muted-foreground mb-4">
            or click to browse and select video files (.mp4, .webm, .mov)
          </p>
          <Button variant="outline">
            <Video className="w-4 h-4 mr-2" />
            Choose Video Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Uploaded Clips */}
        {clips.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold">Uploaded Clips ({clips.length})</h4>
              <Button onClick={uploadAllClips} disabled={clips.every(c => c.uploadStatus !== 'pending')}>
                Upload All Clips
              </Button>
            </div>

            {clips.map((clip) => (
              <Card key={clip.id} className="relative">
                <CardContent className="p-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    {/* Video Preview */}
                    <div className="space-y-2">
                      <video
                        src={clip.previewUrl}
                        className="w-full h-32 object-cover rounded bg-black"
                        controls
                        muted
                      />
                      <p className="text-xs text-muted-foreground truncate">
                        {clip.videoFile.name}
                      </p>
                    </div>

                    {/* Keywords Management */}
                    <div className="space-y-2">
                      <Label>Keywords for synchronization</Label>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {clip.keywords.map((keyword) => (
                          <Badge key={keyword} variant="secondary" className="text-xs">
                            {keyword}
                            <button
                              onClick={() => removeKeyword(clip.id, keyword)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add keyword..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                addKeyword(clip.id, e.currentTarget.value);
                                e.currentTarget.value = '';
                              }
                            }}
                            className="text-sm"
                          />
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          Suggested: {suggestedKeywords.slice(0, 6).map((keyword) => (
                            <button
                              key={keyword}
                              onClick={() => addKeyword(clip.id, keyword)}
                              className="mr-2 underline hover:text-primary"
                              disabled={clip.keywords.includes(keyword)}
                            >
                              {keyword}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Upload Status */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Status</Label>
                        <button
                          onClick={() => removeClip(clip.id)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        {clip.uploadStatus === 'pending' && (
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm">Ready to upload</span>
                          </div>
                        )}
                        
                        {clip.uploadStatus === 'uploading' && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                              <span className="text-sm">Uploading...</span>
                            </div>
                            <Progress value={clip.uploadProgress} className="h-2" />
                          </div>
                        )}
                        
                        {clip.uploadStatus === 'completed' && (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm">Ready for demo</span>
                          </div>
                        )}
                        
                        {clip.uploadStatus === 'error' && (
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span className="text-sm">Upload failed</span>
                          </div>
                        )}

                        {clip.uploadStatus === 'pending' && clip.keywords.length > 0 && (
                          <Button 
                            size="sm" 
                            onClick={() => uploadClip(clip)}
                            className="w-full"
                          >
                            Upload Clip
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Instructions */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <h5 className="font-semibold mb-2">How it works:</h5>
            <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
              <li>Upload your sign language video clips</li>
              <li>Add keywords that describe what's being signed</li>
              <li>The system will automatically display your clips when those keywords appear in captions</li>
              <li>Your clips will be synchronized with the recipe demo for a seamless experience</li>
            </ol>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};