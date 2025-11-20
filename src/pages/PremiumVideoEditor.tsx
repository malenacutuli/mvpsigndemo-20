import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSubscription } from '@/hooks/useSubscription';
import { CaptionTemplateGallery } from '@/components/premium-editor/CaptionTemplateGallery';

export default function PremiumVideoEditor() {
  const { id: videoId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { subscription_tier, loading: subLoading } = useSubscription();
  const [video, setVideo] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  // Check subscription tier
  useEffect(() => {
    if (!subLoading) {
      const tier = subscription_tier || 'free';
      const hasAccess = ['standard', 'advanced', 'enterprise'].includes(tier.toLowerCase());
      setHasAccess(hasAccess);
      
      if (!hasAccess) {
        toast.error('Premium Editor requires Standard plan or above');
      }
    }
  }, [subscription_tier, subLoading]);

  // Load or create project
  useEffect(() => {
    if (!videoId || !hasAccess) return;
    loadOrCreateProject();
  }, [videoId, hasAccess]);

  const loadOrCreateProject = async () => {
    try {
      setIsLoading(true);
      
      // Get video details
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .single();

      if (videoError) throw videoError;
      setVideo(videoData);

      // Check for existing project
      const { data: existingProject } = await supabase
        .from('premium_projects')
        .select('*')
        .eq('video_id', videoId)
        .maybeSingle();

      if (existingProject) {
        setProject(existingProject);
        console.log('Loaded existing project:', existingProject.id);
      } else {
        // Create new project
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data: newProject, error: createError } = await supabase
          .from('premium_projects')
          .insert({
            video_id: videoId,
            user_id: user?.id,
            name: videoData.title || 'Untitled Project',
            total_duration: videoData.duration_seconds || 0
          })
          .select()
          .single();

        if (createError) throw createError;
        setProject(newProject);
        toast.success('Created new premium project');
        console.log('Created new project:', newProject.id);
      }
    } catch (error: any) {
      console.error('Project load error:', error);
      toast.error('Failed to load project: ' + error.message);
      navigate(`/videos/${videoId}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading Premium Editor...</p>
        </div>
      </div>
    );
  }

  // No access state
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-4">Premium Feature</h2>
          <p className="text-muted-foreground mb-6">
            The Premium Video Editor is available for Standard, Advanced, and Enterprise plans.
          </p>
          <Button 
            onClick={() => navigate('/pricing')}
            className="w-full"
          >
            Upgrade to Standard
          </Button>
          <Button 
            variant="ghost"
            onClick={() => navigate(`/videos/${videoId}`)}
            className="w-full mt-2"
          >
            Back to Video
          </Button>
        </Card>
      </div>
    );
  }

  // Premium Editor UI (placeholder for now)
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">Premium Editor</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Project: {project?.name}
            </span>
            <Button
              variant="outline"
              onClick={() => navigate(`/videos/${videoId}`)}
            >
              Exit Editor
            </Button>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto p-4">
        <CaptionTemplateGallery 
          open={true}
          projectId={project?.id}
          premiumVideoId={videoId}
          userTier={subscription_tier || 'free'}
          onTemplateApply={(templateId) => {
            console.log('Applied template:', templateId);
            toast.success('Template applied successfully');
          }}
        />
      </div>
    </div>
  );
}
