import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail, MapPin, Phone } from 'lucide-react';

const Contact = () => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Create mailto link with form data
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const subject = encodeURIComponent(`Contact Form: ${formData.get('subject')}`);
    const body = encodeURIComponent(`
Name: ${formData.get('name')}
Email: ${formData.get('email')}
Subject: ${formData.get('subject')}

Message:
${formData.get('message')}
    `);
    
    window.location.href = `mailto:hello@axessible.ai?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-light text-foreground mb-6 leading-tight">
              Get in Touch
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-light leading-relaxed">
              Have a question about accessibility, want to learn more about our platform, or interested in partnering with us? We'd love to hear from you.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-card p-8 rounded-2xl border shadow-soft">
              <h2 className="text-2xl font-light text-foreground mb-6">Send us a message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input 
                      id="name" 
                      name="name" 
                      type="text" 
                      required 
                      className="mt-1"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      name="email" 
                      type="email" 
                      required 
                      className="mt-1"
                      placeholder="your.email@example.com"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input 
                    id="subject" 
                    name="subject" 
                    type="text" 
                    required 
                    className="mt-1"
                    placeholder="What's this about?"
                  />
                </div>
                
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea 
                    id="message" 
                    name="message" 
                    required 
                    className="mt-1 min-h-32"
                    placeholder="Tell us more about your inquiry..."
                  />
                </div>
                
                <Button type="submit" size="lg" className="w-full">
                  Send Message
                </Button>
              </form>
            </div>

            {/* Contact Information */}
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-light text-foreground mb-6">Contact Information</h2>
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-light text-foreground text-lg mb-1">Email</h3>
                      <a href="mailto:hello@axessible.ai" className="text-primary hover:underline font-light">
                        hello@axessible.ai
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-light text-foreground text-lg mb-2">Locations</h3>
                      <div className="text-muted-foreground font-light leading-relaxed space-y-1">
                        <p>Barcelona, Spain</p>
                        <p>Zurich, Switzerland</p>
                        <p>London, UK</p>
                        <p>Miami, USA</p>
                        <p>Buenos Aires, Argentina</p>
                        <p>Mexico DF, Mexico</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-muted/30 p-6 rounded-2xl">
                <h3 className="text-lg font-light text-foreground mb-3">
                  What can we help you with?
                </h3>
                <ul className="space-y-2 text-muted-foreground font-light leading-relaxed">
                  <li>• Accessibility consulting and implementation</li>
                  <li>• Platform demos and technical questions</li>
                  <li>• Partnership and collaboration opportunities</li>
                  <li>• Media inquiries and press requests</li>
                  <li>• General support and feedback</li>
                </ul>
              </div>

              <div className="bg-card p-6 rounded-2xl border shadow-soft">
                <h3 className="text-lg font-light text-foreground mb-3">
                  Quick Response Times
                </h3>
                <p className="text-muted-foreground font-light leading-relaxed">
                  We typically respond to all inquiries within 24 hours during business days. 
                  For urgent accessibility questions, please mention "URGENT" in your subject line.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;