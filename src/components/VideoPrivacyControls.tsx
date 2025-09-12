import React, { useState } from 'react';
import { Globe, Lock, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface VideoPrivacyControlsProps {
  videoId: string;
  isPublic: boolean;
  viewCount: number;
  onPrivacyChange: (isPublic: boolean) => void;
  videoTitle: string;
  hasTranscript?: boolean;
  hasAudioDescription?: boolean;
}

export const VideoPrivacyControls: React.FC<VideoPrivacyControlsProps> = ({
  videoId,
  isPublic,
  viewCount,
  onPrivacyChange,
  videoTitle,
  hasTranscript = false,
  hasAudioDescription = false
}) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleTogglePublic = async () => {
    if (!isPublic && (!hasTranscript && !hasAudioDescription)) {
      toast({
        title: "Cannot make public",
        description: "Please add captions or audio descriptions before making this video public to ensure accessibility.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const updates: any = {
        is_public: !isPublic,
      };

      // Set published_at timestamp when making public for the first time
      if (!isPublic) {
        updates.published_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('videos')
        .update(updates)
        .eq('id', videoId);

      if (error) throw error;

      onPrivacyChange(!isPublic);
      
      toast({
        title: isPublic ? "Video made private" : "Video published publicly",
        description: isPublic 
          ? "Your video is now private and only visible to you."
          : "Your accessible video is now publicly available on the community board.",
      });

    } catch (error) {
      console.error('Error updating video privacy:', error);
      toast({
        title: "Error updating privacy",
        description: "There was an error updating the video privacy. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatViewCount = (count: number) => {
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
    return `${(count / 1000000).toFixed(1)}M`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isPublic ? (
              <>
                <Globe className="w-5 h-5 text-green-600" />
                <span>Public Video</span>
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 text-muted-foreground" />
                <span>Private Video</span>
              </>
            )}
          </div>
          <Badge variant={isPublic ? "default" : "secondary"}>
            {isPublic ? "Public" : "Private"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="space-y-2">
          {isPublic ? (
            <>
              <p className="text-sm text-muted-foreground">
                This video is publicly visible on the accessible video board and can be viewed by anyone.
              </p>
              <div className="flex items-center gap-2 text-sm">
                <Eye className="w-4 h-4" />
                <span><strong>{formatViewCount(viewCount)}</strong> public views</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              This video is private and only visible to you. Make it public to share it on the accessible video board.
            </p>
          )}
        </div>

        {/* Accessibility Status */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Accessibility Features</h4>
          <div className="flex gap-2 flex-wrap">
            <Badge variant={hasTranscript ? "default" : "outline"}>
              {hasTranscript ? "✓" : "✗"} Captions
            </Badge>
            <Badge variant={hasAudioDescription ? "default" : "outline"}>
              {hasAudioDescription ? "✓" : "✗"} Audio Descriptions
            </Badge>
          </div>
          {!hasTranscript && !hasAudioDescription && (
            <p className="text-xs text-muted-foreground">
              Add captions or audio descriptions to enable public sharing
            </p>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-2">
          {isPublic ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full" disabled={loading}>
                  <Lock className="w-4 h-4 mr-2" />
                  Make Private
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Make Video Private?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove "{videoTitle}" from the public board and make it visible only to you. 
                    View statistics will be preserved, but the video will no longer be accessible to the public.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleTogglePublic}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Make Private
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  className="w-full" 
                  disabled={loading || (!hasTranscript && !hasAudioDescription)}
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Make It Public
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Publish Video Publicly?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will make "{videoTitle}" visible on the accessible video board where anyone can watch it. 
                    The video will be featured with its accessibility features (captions, audio descriptions, ASL).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleTogglePublic}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Make It Public
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {isPublic && (
          <div className="pt-2 border-t">
            <Button variant="ghost" size="sm" asChild className="w-full">
              <a 
                href={`/watch/${videoId}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <Globe className="w-4 h-4" />
                View on Public Board
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};