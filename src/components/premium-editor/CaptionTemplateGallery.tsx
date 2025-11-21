import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useCaptionTemplates, useApplyTemplate } from '@/hooks/useCaptionTemplates';
import { TemplateCard } from './TemplateCard';
import { TemplatePreview } from './TemplatePreview';
import { Sparkles, Search, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CaptionTemplateGalleryProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  projectId?: string;
  premiumVideoId?: string;
  currentSceneId?: string;
  userTier?: string;
  onTemplateApply?: (templateId: string) => void;
}

export function CaptionTemplateGallery({
  open = false,
  onOpenChange = () => {},
  projectId,
  premiumVideoId,
  currentSceneId,
  userTier = 'free',
  onTemplateApply
}: CaptionTemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'free' | 'premium'>('all');
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useCaptionTemplates();
  const applyTemplate = useApplyTemplate();
  const { toast } = useToast();

  const canAccessPremium = ['advanced', 'enterprise'].includes(userTier.toLowerCase());

  const filteredTemplates = templates.filter(template => {
    // Search filter
    if (searchQuery && !template.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Type filter
    if (filterType === 'free' && template.is_premium) return false;
    if (filterType === 'premium' && !template.is_premium) return false;

    return true;
  });

  const handleApply = async (templateId: string) => {
    // If custom handler provided, use it
    if (onTemplateApply) {
      onTemplateApply(templateId);
      return;
    }

    // Otherwise use default behavior
    try {
      if (!projectId) return;
      
      await applyTemplate.mutateAsync({
        projectId,
        templateId,
        sceneId: currentSceneId
      });

      toast({
        title: 'Template Applied',
        description: currentSceneId 
          ? 'Caption template applied to current scene'
          : 'Caption template applied to all scenes',
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to apply template',
        variant: 'destructive'
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Sparkles className="w-6 h-6 text-primary" />
              Caption Template Gallery
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Tabs value={filterType} onValueChange={(v) => setFilterType(v as any)}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="free">Free</TabsTrigger>
                  <TabsTrigger value="premium">
                    <Crown className="w-3 h-3 mr-1" />
                    Premium
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Template Grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onPreview={() => setPreviewTemplate(template.id)}
                    onApply={() => handleApply(template.id)}
                    canAccessPremium={canAccessPremium}
                    applyingToScene={!!currentSceneId}
                  />
                ))}
              </div>
            )}

            {filteredTemplates.length === 0 && !isLoading && (
              <div className="text-center py-12 text-muted-foreground">
                No templates found matching your search
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      {previewTemplate && (
        <TemplatePreview
          templateId={previewTemplate}
          premiumVideoId={premiumVideoId}
          onClose={() => setPreviewTemplate(null)}
          onApply={() => {
            handleApply(previewTemplate);
            setPreviewTemplate(null);
          }}
        />
      )}
    </>
  );
}
