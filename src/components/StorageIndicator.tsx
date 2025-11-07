import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HardDrive, Infinity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const StorageIndicator: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-light flex items-center gap-2">
          <HardDrive className="w-5 h-5" />
          Storage
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center py-8">
          <div className="text-center space-y-2">
            <Infinity className="w-12 h-12 mx-auto text-primary" />
            <div className="text-lg font-medium">Unlimited Storage</div>
            <p className="text-sm text-muted-foreground max-w-xs">
              Upload videos of any size without storage restrictions
            </p>
          </div>
        </div>

        <div className="text-sm font-light text-muted-foreground leading-relaxed text-center">
          Need advanced features?
          <Button 
            variant="link" 
            size="sm" 
            className="p-0 h-auto text-sm font-light ml-1"
            onClick={() => navigate('/pricing')}
          >
            View plans
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};