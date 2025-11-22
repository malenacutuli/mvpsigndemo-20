import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadVideo } from '@/components/UploadVideo';
import { Navigation } from '@/components/Navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function Upload() {
  const navigate = useNavigate();

  const handleUploadComplete = (videoId: string) => {
    navigate(`/videos/${videoId}`);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-light mb-4 text-foreground leading-tight">
                  Upload and Create Accessible Videos in Seconds
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed">
                  Transform your video content with automatic accessibility features
                </p>
              </div>

              <UploadVideo onUploadComplete={handleUploadComplete} />
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}