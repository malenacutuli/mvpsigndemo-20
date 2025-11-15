import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Contact = () => {
  const { t } = useTranslation();
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
    
    window.location.href = `mailto:hello@axessible.ai?cc=malena@axessible.ai&subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-light text-foreground mb-6 leading-tight">
              {t('contact.title')}
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-light leading-relaxed">
              {t('contact.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-card p-8 rounded-2xl border shadow-soft">
              <h2 className="text-2xl font-light text-foreground mb-6">{t('contact.form.title')}</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">{t('contact.form.name')}</Label>
                    <Input 
                      id="name" 
                      name="name" 
                      type="text" 
                      required 
                      className="mt-1"
                      placeholder={t('contact.form.namePlaceholder')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">{t('contact.form.email')}</Label>
                    <Input 
                      id="email" 
                      name="email" 
                      type="email" 
                      required 
                      className="mt-1"
                      placeholder={t('contact.form.emailPlaceholder')}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="subject">{t('contact.form.subject')}</Label>
                  <Input 
                    id="subject" 
                    name="subject" 
                    type="text" 
                    required 
                    className="mt-1"
                    placeholder={t('contact.form.subjectPlaceholder')}
                  />
                </div>
                
                <div>
                  <Label htmlFor="message">{t('contact.form.message')}</Label>
                  <Textarea 
                    id="message" 
                    name="message" 
                    required 
                    className="mt-1 min-h-32"
                    placeholder={t('contact.form.messagePlaceholder')}
                  />
                </div>
                
                <Button type="submit" size="lg" className="w-full">
                  {t('contact.form.submit')}
                </Button>
              </form>
            </div>

            {/* Contact Information */}
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-light text-foreground mb-6">{t('contact.info.title')}</h2>
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-light text-foreground text-lg mb-1">{t('contact.info.email')}</h3>
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
                      <h3 className="font-light text-foreground text-lg mb-2">{t('contact.info.locations')}</h3>
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
                  {t('contact.info.helpWith')}
                </h3>
                <ul className="space-y-2 text-muted-foreground font-light leading-relaxed">
                  <li>• {t('contact.info.consulting')}</li>
                  <li>• {t('contact.info.demos')}</li>
                  <li>• {t('contact.info.partnerships')}</li>
                  <li>• {t('contact.info.media')}</li>
                  <li>• {t('contact.info.support')}</li>
                </ul>
              </div>

              <div className="bg-card p-6 rounded-2xl border shadow-soft">
                <h3 className="text-lg font-light text-foreground mb-3">
                  {t('contact.info.responseTitle')}
                </h3>
                <p className="text-muted-foreground font-light leading-relaxed">
                  {t('contact.info.responseText')}
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