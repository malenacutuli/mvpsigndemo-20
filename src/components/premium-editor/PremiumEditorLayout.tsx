import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Save, Download, ArrowLeft, Sparkles } from 'lucide-react';
import { Timeline } from './Timeline';
import { TextBasedEditor } from './TextBasedEditor';
import { MultiSegmentClipCreator } from './MultiSegmentClipCreator';
import { AdvancedExportModal } from './AdvancedExportModal';
import { AIAssistant } from './AIAssistant';
import { useVideoProject } from '@/hooks/useVideoProject';
import { toast } from 'sonner';

interface PremiumEditorLayoutProps {
  videoId: string;
}

export function PremiumEditorLayout({ videoId }: PremiumEditorLayoutProps) {
  const [activeTab, setActiveTab] = useState('timeline');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { project, isLoading } = useVideoProject(videoId);

  // Fetch transcript segments for MultiSegmentClipCreator
  const { data: segments = [] } = useQuery({
    queryKey: ['transcriptSegments', videoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transcript_segments_clean')
        .select('id, start_time, end_time, text')
        .eq('video_id', videoId)
        .order('idx');

      if (error) throw error;
      return data || [];
    }
  });

  const handleSave = async () => {
    if (!project) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('video_projects')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', project.id);
      
      if (error) throw error;
      toast.success('Project saved successfully');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save project');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading project...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
...
      {/* Export Modal */}
      {project && (
        <AdvancedExportModal 
          open={showExportDialog} 
          onOpenChange={setShowExportDialog}
          projectId={project.id}
          videoId={videoId}
        />
      )}

      {/* AI Assistant Floating Button */}
      <Button
        className="fixed bottom-4 right-4 rounded-full w-14 h-14 shadow-lg z-50"
        onClick={() => setShowAI(!showAI)}
      >
        <Sparkles className="w-6 h-6" />
      </Button>

      {/* AI Assistant Panel */}
      {showAI && project && (
        <div className="fixed bottom-20 right-4 w-96 h-[500px] shadow-2xl rounded-lg overflow-hidden z-50 border bg-card">
          <AIAssistant 
            projectId={project.id}
            videoId={videoId}
            currentContext={activeTab}
          />
        </div>
      )}
    </div>
  );
}
