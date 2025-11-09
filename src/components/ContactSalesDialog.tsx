import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface ContactSalesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSubject?: string;
}

export function ContactSalesDialog({ 
  open, 
  onOpenChange, 
  defaultSubject = "Contact Sales" 
}: ContactSalesDialogProps) {
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    
    const subject = encodeURIComponent(String(data.get("subject") || defaultSubject));
    const body = encodeURIComponent(
`Name: ${data.get("name")}
Email: ${data.get("email")}

Message:
${data.get("message")}`
    );
    
    window.location.href = `mailto:hello@axessible.ai?cc=malena@axessible.ai&subject=${subject}&body=${body}`;
    onOpenChange(false);
  };

  const copyEmails = async () => {
    try {
      await navigator.clipboard.writeText("hello@axessible.ai; malena@axessible.ai");
      toast({
        title: "Emails copied",
        description: "Email addresses copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please manually copy: hello@axessible.ai; malena@axessible.ai",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-light">Contact Sales</DialogTitle>
          <DialogDescription className="font-light">
            Tell us about your needs and we'll get back to you quickly.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-light">Name</Label>
              <Input 
                id="name" 
                name="name" 
                required 
                placeholder="Your name"
                className="font-light"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="font-light">Email</Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                required 
                placeholder="your.email@example.com"
                className="font-light"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject" className="font-light">Subject</Label>
            <Input 
              id="subject" 
              name="subject" 
              defaultValue={defaultSubject} 
              required
              className="font-light"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message" className="font-light">Message</Label>
            <Textarea 
              id="message" 
              name="message" 
              required 
              className="min-h-32 font-light" 
              placeholder="Tell us more about your inquiry..." 
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="submit" size="lg" className="flex-1 font-light rounded-full">
              Send
            </Button>
            <Button type="button" variant="outline" size="lg" onClick={copyEmails} className="font-light rounded-full">
              Copy emails
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
