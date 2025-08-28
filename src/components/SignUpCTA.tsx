import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Rocket, Subtitles, Mic, HandHelping, Languages } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const SignUpCTA: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.error('Please fill in required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // Use Supabase edge function to send email
      const { data, error } = await supabase.functions.invoke('send-demo-request', {
        body: {
          name: formData.name,
          email: formData.email,
          company: formData.company,
          message: formData.message,
          to: 'hello@axessible.ai'
        }
      });

      if (error) throw error;

      toast.success('Demo request sent successfully!', {
        description: 'We will contact you within 24 hours to schedule your demo.'
      });
      
      setFormData({ name: '', email: '', company: '', message: '' });
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Demo request error:', error);
      toast.error('Failed to send demo request', {
        description: 'Please try again or contact us directly at hello@axessible.ai'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-6">
      <Card className="border-2 border-primary/20 shadow-xl bg-gradient-to-br from-card/50 to-card backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-3xl md:text-4xl font-black text-foreground mb-4 tracking-tight">
            Experience the accessibility transformation
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            Sign up to experience full accessibility: Speech recognition, captions with Intention, 
            Audio Transcriptions, American Sign Language and Spanish Sign Language Avatars.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Feature Preview Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50">
              <Subtitles className="w-8 h-8 text-primary mb-3 mx-auto" />
              <h3 className="font-semibold text-lg mb-2 text-center">Captions with Intention</h3>
              <p className="text-muted-foreground text-sm text-center">
                AI-powered emotional styling makes captions expressive and contextual
              </p>
            </div>
            
            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50">
              <Mic className="w-8 h-8 text-accent mb-3 mx-auto" />
              <h3 className="font-semibold text-lg mb-2 text-center">Audio Descriptions</h3>
              <p className="text-muted-foreground text-sm text-center">
                Automatic visual content descriptions for blind and low-vision users
              </p>
            </div>
            
            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50">
              <HandHelping className="w-8 h-8 text-cwi-main-orange mb-3 mx-auto" />
              <h3 className="font-semibold text-lg mb-2 text-center">ASL Avatars</h3>
              <p className="text-muted-foreground text-sm text-center">
                Professional AI interpreters in American Sign Language with cultural authenticity
              </p>
            </div>
            
            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50">
              <Languages className="w-8 h-8 text-destructive mb-3 mx-auto" />
              <h3 className="font-semibold text-lg mb-2 text-center">Multi-Language Support</h3>
              <p className="text-muted-foreground text-sm text-center">
                Spanish Sign Language avatars and multi-language transcription
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="min-w-[200px] h-12 text-base font-semibold"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Book a Demo
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-2xl">Book Your Accessibility Demo</DialogTitle>
                  <DialogDescription className="text-base">
                    See how Axessible can transform your video content with industry-leading accessibility features.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Your full name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="your@company.com"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      placeholder="Your company name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Tell us about your accessibility needs</Label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="What type of content do you work with? What accessibility challenges are you facing?"
                      rows={3}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Sending...' : 'Send Demo Request'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Link to="/pricing">
              <Button 
                size="lg" 
                className="min-w-[200px] h-12 text-base font-semibold"
              >
                <Rocket className="w-5 h-5 mr-2" />
                Sign Up Now
              </Button>
            </Link>
          </div>

          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground">
              Start with a free trial • No credit card required • Full feature access
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};