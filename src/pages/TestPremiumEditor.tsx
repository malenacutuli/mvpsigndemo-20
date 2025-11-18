import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Video, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VideoProject {
  id: string;
  created_at: string;
  videos: Array<{
    id: string;
    title: string;
    thumbnail_url: string | null;
    duration_seconds: number | null;
  }>;
}

export default function TestPremiumEditor() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('video_projects')
        .select('*, videos(id, title, thumbnail_url, duration_seconds)')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setProjects(data || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const createTestProject = async () => {
    try {
      // Get the first available video
      const { data: videos, error: videoError } = await supabase
        .from('videos')
        .select('id, title')
        .limit(1)
        .single();

      if (videoError || !videos) {
        toast.error('No videos found. Please upload a video first.');
        return;
      }

      // Check if video_projects table exists and has correct schema
      // If it doesn't work, user needs to create the table first
      toast.info('Creating project... (Note: Ensure video_projects table exists)');
      
      navigate(`/video/${videos.id}/edit`);
    } catch (error) {
      console.error('Failed to create test project:', error);
      toast.error('Navigate to /video/:id/edit instead to test the editor');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Premium Video Editor</h1>
            <p className="text-muted-foreground mt-2">
              Test the premium video editing interface
            </p>
          </div>
          <Button onClick={createTestProject}>
            <Plus className="w-4 h-4 mr-2" />
            Create Test Project
          </Button>
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Video className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No projects found</p>
              <Button onClick={createTestProject}>
                Create Your First Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => {
              const video = Array.isArray(project.videos) ? project.videos[0] : project.videos;
              return (
                <Card
                  key={project.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/premium-editor/${project.id}`)}
                >
                  <CardHeader>
                    <div className="aspect-video bg-muted rounded-md mb-4 flex items-center justify-center overflow-hidden">
                      {video?.thumbnail_url ? (
                        <img
                          src={video.thumbnail_url}
                          alt={video.title || 'Video'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Video className="w-12 h-12 text-muted-foreground" />
                      )}
                    </div>
                    <CardTitle className="text-lg">Project {project.id.slice(0, 8)}</CardTitle>
                    <CardDescription>
                      {video?.title || 'Untitled Video'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        {video?.duration_seconds
                          ? `${Math.floor(video.duration_seconds / 60)}:${Math.floor(video.duration_seconds % 60).toString().padStart(2, '0')}`
                          : 'N/A'}
                      </span>
                      <span>
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
