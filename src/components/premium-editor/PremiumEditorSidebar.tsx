import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Scissors, 
  Wand2, 
  ImageIcon, 
  Languages,
  Eye,
  Download,
  FileText,
  Users,
  Volume2,
  Settings,
  Menu,
  X,
  Sparkles,
  Film,
  Type,
  Captions
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NavItem {
  id: string;
  label: string;
  icon: any;
  section: string;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  // Edit Section
  { id: 'transcript', label: 'Transcript Editor', icon: FileText, section: 'edit' },
  { id: 'characters', label: 'Characters & Speakers', icon: Users, section: 'edit' },
  { id: 'timeline', label: 'Timeline View', icon: Film, section: 'edit' },
  { id: 'captions', label: 'Captions with Intention', icon: Captions, section: 'edit' },
  
  // AI Tools Section
  { id: 'ai-tools', label: 'Axessible AI', icon: Sparkles, section: 'ai', badge: '12' },
  { id: 'runway', label: 'Runway ML Video Gen', icon: Wand2, section: 'ai' },
  { id: 'analysis', label: 'Video Analysis', icon: Eye, section: 'ai' },
  
  // Media Section
  { id: 'media', label: 'Media Library', icon: ImageIcon, section: 'media' },
  { id: 'elements', label: 'Shapes & Text', icon: Type, section: 'media' },
  
  // Accessibility Section
  { id: 'audio-descriptions', label: 'Audio Descriptions', icon: Volume2, section: 'accessibility' },
  { id: 'sign-language', label: 'Sign Language', icon: Languages, section: 'accessibility' },
  
  // Export Section
  { id: 'export', label: 'Export & Share', icon: Download, section: 'export' },
];

const SECTIONS = [
  { id: 'edit', label: 'Edit', color: 'text-blue-500' },
  { id: 'ai', label: 'AI Tools', color: 'text-purple-500' },
  { id: 'media', label: 'Media', color: 'text-green-500' },
  { id: 'accessibility', label: 'Accessibility', color: 'text-orange-500' },
  { id: 'export', label: 'Export', color: 'text-pink-500' },
];

interface PremiumEditorSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export function PremiumEditorSidebar({ activeView, onViewChange }: PremiumEditorSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div
      className={cn(
        'h-full border-r bg-muted/30 transition-all duration-300 flex flex-col',
        isExpanded ? 'w-60' : 'w-16'
      )}
    >
      {/* Header */}
      <div className="h-14 border-b flex items-center justify-between px-3">
        {isExpanded && (
          <span className="font-semibold text-sm">Premium Editor</span>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-8 w-8 p-0"
        >
          {isExpanded ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <TooltipProvider delayDuration={0}>
        <div className="flex-1 overflow-y-auto py-4">
          {SECTIONS.map((section) => {
            const sectionItems = NAV_ITEMS.filter(item => item.section === section.id);
            
            return (
              <div key={section.id} className="mb-6">
                {/* Section Header */}
                {isExpanded && (
                  <div className="px-4 mb-2">
                    <span className={cn('text-xs font-semibold uppercase tracking-wide', section.color)}>
                      {section.label}
                    </span>
                  </div>
                )}
                
                {/* Section Items */}
                <div className="space-y-1 px-2">
                  {sectionItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;
                    
                    const buttonContent = (
                      <Button
                        variant={isActive ? 'secondary' : 'ghost'}
                        className={cn(
                          'w-full justify-start',
                          !isExpanded && 'justify-center px-0',
                          isActive && 'bg-primary/10 text-primary font-medium'
                        )}
                        onClick={() => onViewChange(item.id)}
                      >
                        <Icon className={cn('w-4 h-4', isExpanded && 'mr-3')} />
                        {isExpanded && (
                          <>
                            <span className="flex-1 text-left">{item.label}</span>
                            {item.badge && (
                              <span className="ml-auto text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </Button>
                    );

                    if (!isExpanded) {
                      return (
                        <Tooltip key={item.id}>
                          <TooltipTrigger asChild>
                            {buttonContent}
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>{item.label}</p>
                            {item.badge && <p className="text-xs text-muted-foreground">{item.badge} tools</p>}
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return <div key={item.id}>{buttonContent}</div>;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </TooltipProvider>

      {/* Footer */}
      <div className="border-t p-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn('w-full', !isExpanded && 'justify-center px-0')}
            >
              <Settings className={cn('w-4 h-4', isExpanded && 'mr-3')} />
              {isExpanded && <span>Settings</span>}
            </Button>
          </TooltipTrigger>
          {!isExpanded && (
            <TooltipContent side="right">
              <p>Settings</p>
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </div>
  );
}
