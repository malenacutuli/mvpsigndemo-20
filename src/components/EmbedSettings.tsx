import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Copy, Eye, EyeOff, Trash2, Plus, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EmbedSettingsProps {
  videoId: string;
  onSettingsChange?: () => void;
}

export const EmbedSettings: React.FC<EmbedSettingsProps> = ({ 
  videoId, 
  onSettingsChange 
}) => {
  const [embedEnabled, setEmbedEnabled] = useState(false);
  const [embedToken, setEmbedToken] = useState<string | null>(null);
  const [embedDomains, setEmbedDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [embedSettings, setEmbedSettings] = useState({
    autoplay: false,
    controls: true,
    width: '100%',
    height: 'auto'
  });
  const [loading, setLoading] = useState(true);
  const [showToken, setShowToken] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadEmbedSettings();
  }, [videoId]);

  const loadEmbedSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('embed_enabled, embed_token, embed_domains, embed_settings')
        .eq('id', videoId)
        .single();

      if (error) throw error;

      if (data) {
        setEmbedEnabled(data.embed_enabled || false);
        setEmbedToken(data.embed_token);
        setEmbedDomains(data.embed_domains || []);
        
        // Safely handle embed_settings JSON
        const settings = data.embed_settings as any;
        setEmbedSettings({
          autoplay: settings?.autoplay || false,
          controls: settings?.controls !== false,
          width: settings?.width || '100%',
          height: settings?.height || 'auto'
        });
      }
    } catch (error) {
      console.error('Error loading embed settings:', error);
      toast({
        title: "Error",
        description: "Failed to load embed settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateEmbedToken = async () => {
    try {
      const { data, error } = await supabase
        .rpc('generate_embed_token', { video_uuid: videoId });

      if (error) throw error;

      setEmbedToken(data);
      await saveEmbedSettings();
      
      toast({
        title: "Success",
        description: "New embed token generated",
      });
    } catch (error) {
      console.error('Error generating token:', error);
      toast({
        title: "Error",
        description: "Failed to generate embed token",
        variant: "destructive",
      });
    }
  };

  const saveEmbedSettings = async () => {
    try {
      const { error } = await supabase
        .from('videos')
        .update({
          embed_enabled: embedEnabled,
          embed_token: embedToken,
          embed_domains: embedDomains.length > 0 ? embedDomains : null,
          embed_settings: embedSettings
        })
        .eq('id', videoId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Embed settings saved",
      });

      onSettingsChange?.();
    } catch (error) {
      console.error('Error saving embed settings:', error);
      toast({
        title: "Error",
        description: "Failed to save embed settings",
        variant: "destructive",
      });
    }
  };

  const addDomain = () => {
    if (newDomain && !embedDomains.includes(newDomain)) {
      setEmbedDomains([...embedDomains, newDomain]);
      setNewDomain('');
    }
  };

  const removeDomain = (domain: string) => {
    setEmbedDomains(embedDomains.filter(d => d !== domain));
  };

  const generateEmbedCode = () => {
    const embedUrl = `${window.location.origin}/embed/${videoId}${embedToken ? `?token=${embedToken}` : ''}`;
    
    return `<iframe 
  src="${embedUrl}"
  width="${embedSettings.width}" 
  height="${embedSettings.height === 'auto' ? '315' : embedSettings.height}"
  frameborder="0" 
  allowfullscreen
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
</iframe>`;
  };

  const copyEmbedCode = async () => {
    try {
      await navigator.clipboard.writeText(generateEmbedCode());
      toast({
        title: "Copied!",
        description: "Embed code copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy embed code",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Embed Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Embed Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable Embedding */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="embed-enabled">Enable Embedding</Label>
            <p className="text-sm text-muted-foreground">
              Allow this video to be embedded on other websites
            </p>
          </div>
          <Switch
            id="embed-enabled"
            checked={embedEnabled}
            onCheckedChange={setEmbedEnabled}
          />
        </div>

        {embedEnabled && (
          <>
            {/* Security Token */}
            <div className="space-y-3">
              <Label>Security Token</Label>
              <div className="flex items-center gap-2">
                <Input
                  type={showToken ? 'text' : 'password'}
                  value={embedToken || 'No token generated'}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateEmbedToken}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Optional: Use a token to secure embed access
              </p>
            </div>

            {/* Domain Whitelist */}
            <div className="space-y-3">
              <Label>Allowed Domains</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="example.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addDomain()}
                />
                <Button onClick={addDomain} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              {embedDomains.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {embedDomains.map((domain) => (
                    <Badge key={domain} variant="secondary" className="flex items-center gap-1">
                      {domain}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeDomain(domain)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Leave empty to allow embedding on any domain
              </p>
            </div>

            {/* Player Settings */}
            <div className="space-y-4">
              <Label>Player Settings</Label>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="width">Width</Label>
                  <Input
                    id="width"
                    value={embedSettings.width}
                    onChange={(e) => setEmbedSettings({
                      ...embedSettings,
                      width: e.target.value
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="height">Height</Label>
                  <Input
                    id="height"
                    value={embedSettings.height}
                    onChange={(e) => setEmbedSettings({
                      ...embedSettings,
                      height: e.target.value
                    })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="autoplay">Autoplay</Label>
                <Switch
                  id="autoplay"
                  checked={embedSettings.autoplay}
                  onCheckedChange={(checked) => setEmbedSettings({
                    ...embedSettings,
                    autoplay: checked
                  })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="controls">Show Controls</Label>
                <Switch
                  id="controls"
                  checked={embedSettings.controls}
                  onCheckedChange={(checked) => setEmbedSettings({
                    ...embedSettings,
                    controls: checked
                  })}
                />
              </div>
            </div>

            {/* Embed Code */}
            <div className="space-y-3">
              <Label>Embed Code</Label>
              <Textarea
                value={generateEmbedCode()}
                readOnly
                className="font-mono text-sm h-32"
              />
              <Button onClick={copyEmbedCode} className="w-full">
                <Copy className="w-4 h-4 mr-2" />
                Copy Embed Code
              </Button>
            </div>

            {/* Save Button */}
            <Button onClick={saveEmbedSettings} className="w-full">
              Save Embed Settings
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};