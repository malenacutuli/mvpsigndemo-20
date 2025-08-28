import React from 'react';
import { Navigation } from '@/components/Navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ASLClipUploader } from '@/components/ASLClipUploader';
import { PromptToVideo } from '@/components/PromptToVideo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Video, Wand2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Dashboard = () => {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navigation />
        
        <main className="container mx-auto px-6 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-black text-foreground mb-4 tracking-tight">
                Your Accessibility Studio
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Create, customize, and manage your accessible video content
              </p>
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <Link to="/upload" className="group">
                <Card className="hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                  <CardHeader className="text-center pb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
                      <Upload className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">Upload Video</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-center text-sm">
                      Upload your video and let AI generate captions, audio descriptions, and ASL support
                    </p>
                  </CardContent>
                </Card>
              </Link>
              
              <Link to="/videos" className="group">
                <Card className="hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                  <CardHeader className="text-center pb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
                      <Video className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">My Videos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-center text-sm">
                      View, organize, and manage your accessible video library
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Card className="hover:shadow-lg transition-all duration-300">
                <CardHeader className="text-center pb-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
                    <Wand2 className="w-6 h-6 text-accent" />
                  </div>
                  <CardTitle className="text-xl">AI Tools</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center text-sm">
                    Create content with AI: Custom ASL clips and prompt-to-video generation
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* ASL Clip Upload Section */}
            <section className="py-12 mb-12">
              <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4 tracking-tight">
                  Upload Your Custom ASL Clips
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Integrate your own sign language videos into the recipe demo for personalized accessibility
                </p>
              </div>
              <ASLClipUploader />
            </section>

            {/* Prompt to Video Section */}
            <section className="py-12">
              <PromptToVideo />
            </section>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Dashboard;