import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadVideo } from '@/components/UploadVideo';
import { Navigation } from '@/components/Navigation';
import { Target, Volume2, HandMetal } from 'lucide-react';

export default function Upload() {
  const navigate = useNavigate();

  const handleUploadComplete = (videoId: string) => {
    navigate(`/videos/${videoId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Upload and Create Accessible Videos in Seconds</h1>
            <p className="text-muted-foreground">
              Transform your video content with automatic accessibility features
            </p>
          </div>

          <UploadVideo onUploadComplete={handleUploadComplete} />

          {/* Feature Benefits */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-card rounded-lg border">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Smart Captions</h3>
              <p className="text-sm text-muted-foreground">
                AI-powered captions with emotion and intent detection for enhanced communication
              </p>
            </div>

            <div className="text-center p-6 bg-card rounded-lg border">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Volume2 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Audio Descriptions</h3>
              <p className="text-sm text-muted-foreground">
                Automatically generated audio descriptions timed perfectly with your content
              </p>
            </div>

            <div className="text-center p-6 bg-card rounded-lg border">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <HandMetal className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">ASL Support</h3>
              <p className="text-sm text-muted-foreground">
                Sign language avatars and visual accessibility features for comprehensive inclusion
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}