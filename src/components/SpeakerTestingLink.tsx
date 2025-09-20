import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, ExternalLink } from 'lucide-react';

interface SpeakerTestingLinkProps {
  videoId?: string;
  className?: string;
}

export const SpeakerTestingLink: React.FC<SpeakerTestingLinkProps> = ({ 
  videoId, 
  className = "" 
}) => {
  const handleOpenLab = () => {
    // Open in new tab for testing alongside main video
    window.open('/lab/speaker-sandbox', '_blank');
  };

  return (
    <Alert className={className}>
      <Settings className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>Having speaker identification issues? Test and debug in our lab environment.</span>
        <Button 
          onClick={handleOpenLab}
          variant="outline" 
          size="sm"
          className="ml-4"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Open Speaker Lab
        </Button>
      </AlertDescription>
    </Alert>
  );
};