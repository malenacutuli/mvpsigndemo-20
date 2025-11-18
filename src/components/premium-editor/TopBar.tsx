import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Download, Settings, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TopBarProps {
  project: {
    id: string;
    name: string;
    videoId: string;
    videoUrl: string;
    thumbnailUrl: string | null;
    duration: number;
    createdAt: string;
    updatedAt: string;
  };
}

export function TopBar({ project }: TopBarProps) {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState(project.name);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save to Supabase
      console.log('Saving project...');
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    // Open export dialog
    console.log('Export project');
  };

  const handleShare = () => {
    // Open share dialog
    console.log('Share project');
  };

  return (
    <div className="h-14 border-b border-border bg-background/95 backdrop-blur flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="w-64 h-8 font-light"
          placeholder="Project name"
        />
        <span className="text-xs text-muted-foreground font-light">
          Last saved: {new Date(project.updatedAt).toLocaleTimeString()}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          className="font-light"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleExport}
          className="font-light"
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleShare}
          className="font-light"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Project Settings</DropdownMenuItem>
            <DropdownMenuItem>Export Settings</DropdownMenuItem>
            <DropdownMenuItem>Keyboard Shortcuts</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
