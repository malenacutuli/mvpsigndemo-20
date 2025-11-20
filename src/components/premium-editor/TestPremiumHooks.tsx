import { useProjectScenes, useAddScene, useUpdateScene, useDeleteScene } from '@/hooks/useSceneComposition';
import { useVideoProject, useCreateProject, useUpdateProject } from '@/hooks/useVideoProject';
import { useCaptionTemplates, useApplyTemplate, useCreateCustomTemplate } from '@/hooks/useCaptionTemplates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function TestPremiumHooks() {
  const videoId = '179e80fd-afa4-4ef8-a8ef-cda949d69fec';
  
  // Test useVideoProject - auto-creates or fetches project
  const { project, scenes: projectScenes, isLoading: projectLoading } = useVideoProject(undefined, videoId);
  
  // Test useProjectScenes - fetches scenes with video metadata
  const { data: scenes, isLoading: scenesLoading } = useProjectScenes(project?.id || '');
  
  // Test useCaptionTemplates - fetches all templates
  const { data: templates, isLoading: templatesLoading } = useCaptionTemplates('all');
  
  // Test mutations
  const addScene = useAddScene();
  const updateScene = useUpdateScene();
  const deleteScene = useDeleteScene();
  const applyTemplate = useApplyTemplate();
  const createCustomTemplate = useCreateCustomTemplate();
  const updateProject = useUpdateProject();

  const handleAddScene = () => {
    if (!project?.id) return;
    
    addScene.mutate({
      projectId: project.id,
      videoId: videoId,
      startTime: 0,
      endTime: 10,
      layoutType: 'fullscreen',
      sceneName: 'Test Scene'
    });
  };

  const handleUpdateScene = (sceneId: string) => {
    updateScene.mutate({
      sceneId,
      updates: {
        name: 'Updated Scene Name',
        layout_type: 'pip'
      }
    });
  };

  const handleApplyTemplate = (templateId: string) => {
    if (!project?.id) return;
    
    applyTemplate.mutate({
      projectId: project.id,
      templateId
    });
  };

  if (projectLoading || scenesLoading || templatesLoading) {
    return <div className="p-8">Loading hooks test...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Premium Hooks Test</h1>

      {/* Project Info */}
      <Card>
        <CardHeader>
          <CardTitle>Project: {project?.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-4 rounded overflow-auto">
            {JSON.stringify(project, null, 2)}
          </pre>
          <Button 
            className="mt-4"
            onClick={() => {
              if (!project?.id) return;
              updateProject.mutate({
                projectId: project.id,
                updates: { name: 'Updated via Hook' }
              });
            }}
          >
            Update Project Name
          </Button>
        </CardContent>
      </Card>

      {/* Scenes */}
      <Card>
        <CardHeader>
          <CardTitle>Scenes ({scenes?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {scenes?.map(scene => (
            <div key={scene.id} className="p-4 border rounded space-y-2">
              <div className="font-semibold">{scene.name}</div>
              <div className="text-sm text-muted-foreground">
                Timeline: {scene.timeline_start}s - {scene.timeline_end}s
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleUpdateScene(scene.id)}
                >
                  Update
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => deleteScene.mutate(scene.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
          
          <Button onClick={handleAddScene}>
            Add Test Scene
          </Button>
        </CardContent>
      </Card>

      {/* Caption Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Caption Templates ({templates?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {templates?.slice(0, 6).map(template => (
              <div key={template.id} className="p-4 border rounded">
                <div className="font-semibold">{template.name}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {template.use_count} uses
                </div>
                <Button 
                  size="sm" 
                  className="mt-2"
                  onClick={() => handleApplyTemplate(template.id)}
                >
                  Apply to All Scenes
                </Button>
              </div>
            ))}
          </div>

          <Button 
            variant="outline"
            onClick={() => {
              createCustomTemplate.mutate({
                name: 'Test Custom Template',
                description: 'Created via hook test',
                styleConfig: {
                  fontFamily: 'Inter',
                  fontSize: 24,
                  fontWeight: 600,
                  textAlign: 'center',
                  colors: {
                    main: '#FFFFFF',
                    secondary: '#000000',
                    accent: '#3B82F6'
                  },
                  position: {
                    vertical: 'bottom',
                    horizontal: 'center'
                  },
                  characterColors: true,
                  speakerLabels: false,
                  maxWidth: 80,
                  lineHeight: 1.2
                }
              });
            }}
          >
            Create Custom Template
          </Button>
        </CardContent>
      </Card>

      {/* Test Console Output */}
      <Card>
        <CardHeader>
          <CardTitle>Console Test</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => {
              console.log('🎬 Project:', project);
              console.log('🎞️ Scenes:', scenes);
              console.log('📋 Templates:', templates);
            }}
          >
            Log All Data to Console
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
