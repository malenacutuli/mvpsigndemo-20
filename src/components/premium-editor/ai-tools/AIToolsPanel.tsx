'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GenerateTool } from './GenerateTool';
import { RepurposeTool } from './RepurposeTool';
import { WriteTool } from './WriteTool';
import { useAIFeaturesStatus } from '@/hooks/useAIFeaturesStatus';
import { 
  Sparkles, 
  RefreshCw, 
  Upload, 
  PenTool,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AIToolsPanelProps {
  projectId: string;
  videoUrl: string;
  transcript?: string;
  onJobComplete?: () => void;
}

export function AIToolsPanel({
  projectId,
  videoUrl,
  transcript,
  onJobComplete
}: AIToolsPanelProps) {
  const [activeTab, setActiveTab] = useState('generate');
  const { isReady, isChecking, error } = useAIFeaturesStatus();

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Status Banner */}
      {isChecking && (
        <Alert className="m-4 mb-0 border-blue-200 bg-blue-50">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <AlertDescription className="text-blue-800">
            Checking AI features availability...
          </AlertDescription>
        </Alert>
      )}
      
      {!isChecking && !isReady && error && (
        <Alert className="m-4 mb-0 border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            {error}
          </AlertDescription>
        </Alert>
      )}
      
      {!isChecking && isReady && (
        <Alert className="m-4 mb-0 border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            AI features are ready to use
          </AlertDescription>
        </Alert>
      )}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none bg-transparent border-b p-0">
          <TabsTrigger
            value="generate"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Generate
          </TabsTrigger>
          <TabsTrigger
            value="repurpose"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Repurpose
          </TabsTrigger>
          <TabsTrigger
            value="publish"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary gap-2"
          >
            <Upload className="w-4 h-4" />
            Publish
          </TabsTrigger>
          <TabsTrigger
            value="write"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary gap-2"
          >
            <PenTool className="w-4 h-4" />
            Write
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="generate" className="p-4 m-0">
            <GenerateTool
              projectId={projectId}
              onJobComplete={onJobComplete}
              disabled={!isReady}
            />
          </TabsContent>

          <TabsContent value="repurpose" className="p-4 m-0">
            <RepurposeTool
              projectId={projectId}
              videoUrl={videoUrl}
              onJobComplete={onJobComplete}
              disabled={!isReady}
            />
          </TabsContent>

          <TabsContent value="publish" className="p-4 m-0">
            <div className="text-center py-12">
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-foreground font-medium mb-2">Publish Tool</p>
              <p className="text-sm text-muted-foreground">Coming soon</p>
            </div>
          </TabsContent>

          <TabsContent value="write" className="p-4 m-0">
            <WriteTool
              projectId={projectId}
              context={transcript || ''}
              onJobComplete={onJobComplete}
              disabled={!isReady}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
