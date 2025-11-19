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
  // Content Section
  { id: 'transcript', label: 'Transcript', icon: FileText, section: 'content' },
  { id: 'characters', label: 'Characters', icon: Users, section: 'content' },
  { id: 'captions', label: 'Captions', icon: Captions, section: 'content' },
  
  // Accessibility Section
  { id: 'audio-descriptions', label: 'Audio Descriptions', icon: Volume2, section: 'accessibility' },
  { id: 'sign-language', label: 'Sign Language', icon: Languages, section: 'accessibility' },
  
  // Analysis Section
  { id: 'analysis', label: 'Video Analysis', icon: Eye, section: 'analysis' },
  { id: 'ai-tools', label: 'AI Tools', icon: Sparkles, section: 'analysis', badge: '12' },
  
  // Media Section
  { id: 'media', label: 'Media Library', icon: ImageIcon, section: 'media' },
  { id: 'elements', label: 'Elements', icon: Type, section: 'media' },
  { id: 'runway', label: 'AI Video Gen', icon: Wand2, section: 'media' },
  
  // Export Section
  { id: 'export', label: 'Export', icon: Download, section: 'export' },
];

const SECTIONS = [
  { id: 'content', label: 'Content', color: 'text-blue-500' },
  { id: 'accessibility', label: 'Accessibility', color: 'text-orange-500' },
  { id: 'analysis', label: 'Analysis', color: 'text-purple-500' },
  { id: 'media', label: 'Media', color: 'text-green-500' },
  { id: 'export', label: 'Export', color: 'text-pink-500' },
];

interface PremiumEditorSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export function PremiumEditorSidebar({ activeView, onViewChange }: PremiumEditorSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="border-b bg-muted/30">
      {/* Compact Header */}
      <div className="h-12 flex items-center justify-between px-3 border-b">
        <span className="font-semibold text-sm">Editor Tools</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-7 w-7 p-0"
        >
          {isExpanded ? <X className="w-3 h-3" /> : <Menu className="w-3 h-3" />}
        </Button>
      </div>

      {/* Navigation - Compact Grid */}
      {isExpanded ? (
        <div className="p-3 max-h-[300px] overflow-y-auto">
          {SECTIONS.map((section) => {
            const sectionItems = NAV_ITEMS.filter(item => item.section === section.id);
            
            return (
              <div key={section.id} className="mb-4">
                <div className="px-2 mb-2">
                  <span className={cn('text-xs font-semibold uppercase tracking-wide', section.color)}>
                    {section.label}
                  </span>
                </div>
                
                <div className="space-y-1">
                  {sectionItems.map((item) => {
                    const Icon = item.icon;
                    const isItemActive = activeView === item.id;

                    return (
                      <Button
                        key={item.id}
                        variant={isItemActive ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => onViewChange(item.id)}
                        className={cn(
                          'w-full justify-start h-8 px-2',
                          isItemActive && 'bg-primary/10 text-primary font-medium'
                        )}
                      >
                        <Icon className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                        <span className="truncate text-xs">{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                            {item.badge}
                          </span>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-2">
          <p className="text-xs text-muted-foreground text-center">Click menu to expand</p>
        </div>
      )}
    </div>
  );
}
