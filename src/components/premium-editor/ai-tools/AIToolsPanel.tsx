'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GenerateTool } from './GenerateTool';
import { 
  Sparkles, 
  RefreshCw, 
  Upload, 
  PenTool,
  History
} from 'lucide-react';

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

  return (
    <div className="h-full flex flex-col bg-background">
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
            />
          </TabsContent>

          <TabsContent value="repurpose" className="p-4 m-0">
            <div className="text-center py-12">
              <RefreshCw className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-foreground font-medium mb-2">Repurpose Tool</p>
              <p className="text-sm text-muted-foreground">Coming soon</p>
            </div>
          </TabsContent>

          <TabsContent value="publish" className="p-4 m-0">
            <div className="text-center py-12">
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-foreground font-medium mb-2">Publish Tool</p>
              <p className="text-sm text-muted-foreground">Coming soon</p>
            </div>
          </TabsContent>

          <TabsContent value="write" className="p-4 m-0">
            <div className="text-center py-12">
              <PenTool className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-foreground font-medium mb-2">Write Tool</p>
              <p className="text-sm text-muted-foreground">Coming soon</p>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
