import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Save, Download } from 'lucide-react';
import { Timeline } from './Timeline';

interface PremiumEditorLayoutProps {
  videoId: string;
}

export function PremiumEditorLayout({ videoId }: PremiumEditorLayoutProps) {
  const [activeTab, setActiveTab] = useState('timeline');

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Navigation Bar */}
      <div className="border-b bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">Premium Video Editor</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button variant="default" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Navigation */}
        <div className="w-64 border-r bg-card">
          <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="h-full">
            <TabsList className="flex flex-col h-full w-full justify-start">
              <TabsTrigger value="timeline" className="justify-start w-full">Timeline</TabsTrigger>
              <TabsTrigger value="transcript" className="justify-start w-full">Transcript</TabsTrigger>
              <TabsTrigger value="clips" className="justify-start w-full">Social Clips</TabsTrigger>
              <TabsTrigger value="export" className="justify-start w-full">Export</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Center - Main Canvas */}
        <div className="flex-1 overflow-auto p-4">
          <Tabs value={activeTab}>
            <TabsContent value="timeline" className="m-0">
              <Timeline videoId={videoId} />
            </TabsContent>
            <TabsContent value="transcript" className="m-0">
              <Card className="p-6">
                <p className="text-muted-foreground">Transcript Editor Coming Soon</p>
              </Card>
            </TabsContent>
            <TabsContent value="clips" className="m-0">
              <Card className="p-6">
                <p className="text-muted-foreground">Social Clips Generator Coming Soon</p>
              </Card>
            </TabsContent>
            <TabsContent value="export" className="m-0">
              <Card className="p-6">
                <p className="text-muted-foreground">Advanced Export Options Coming Soon</p>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Sidebar - Properties */}
        <div className="w-80 border-l bg-card p-4">
          <h3 className="font-semibold mb-4">Properties</h3>
          <p className="text-sm text-muted-foreground">Select an element to edit properties</p>
        </div>
      </div>
    </div>
  );
}
