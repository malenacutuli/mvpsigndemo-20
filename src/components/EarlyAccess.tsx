import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, Shield } from 'lucide-react';

export const EarlyAccess: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    useCase: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Form submitted:', formData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <section className="py-20 bg-gradient-accessibility">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 text-sm font-medium px-4 py-2">
            EARLY ACCESS
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Pioneer the Future of Accessible Video
          </h2>
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            Join leading enterprises, educational institutions, and content creators building the world's most inclusive digital experiences.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Card className="bg-card/80 backdrop-blur-sm border border-border/50">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold text-foreground mb-6">Join the Waitlist</h3>
                  <p className="text-muted-foreground mb-8">Limited early access spots available</p>
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <Label htmlFor="name" className="text-sm font-medium">Name *</Label>
                      <Input
                        id="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email" className="text-sm font-medium">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="company" className="text-sm font-medium">Company</Label>
                      <Input
                        id="company"
                        type="text"
                        value={formData.company}
                        onChange={(e) => handleInputChange('company', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="useCase" className="text-sm font-medium">Use Case</Label>
                      <Select onValueChange={(value) => handleInputChange('useCase', value)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select your use case" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                          <SelectItem value="education">Education</SelectItem>
                          <SelectItem value="government">Government</SelectItem>
                          <SelectItem value="media">Media & Entertainment</SelectItem>
                          <SelectItem value="healthcare">Healthcare</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button type="submit" className="w-full text-lg py-3">
                      <Star className="w-5 h-5 mr-2" />
                      Sign Up for the Waiting List
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-4">What You Get</h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-4"></div>
                    <div>
                      <h4 className="font-semibold text-foreground">Enterprise pilot program</h4>
                      <p className="text-muted-foreground text-sm">Early access to our platform with dedicated support</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-4"></div>
                    <div>
                      <h4 className="font-semibold text-foreground">Custom compliance reporting</h4>
                      <p className="text-muted-foreground text-sm">Tailored accessibility audits for your organization</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-4"></div>
                    <div>
                      <h4 className="font-semibold text-foreground">Dedicated implementation support</h4>
                      <p className="text-muted-foreground text-sm">White-glove onboarding and integration assistance</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-card/50 backdrop-blur-sm rounded-lg p-6 border border-border/50">
                <h4 className="font-bold text-foreground mb-4">Enterprise & Public Sector Ready</h4>
                <div className="flex items-center text-sm text-muted-foreground mb-4">
                  <Shield className="w-4 h-4 mr-2" />
                  WCAG 2.1 AAA Compliant
                </div>
                <p className="text-xs text-muted-foreground">
                  © 2025 axessible technologies. 99% of global video is inaccessible. Axessible unlocks it all.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};