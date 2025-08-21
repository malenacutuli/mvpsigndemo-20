import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AxessiblePlayer } from "./AxessiblePlayer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Clock } from "lucide-react";

const VOICES = [
  { id: "gordon-ramsay", name: "Gordon Ramsay Style", description: "Passionate, authoritative" },
  { id: "dora-exploradora", name: "Dora la Exploradora Style", description: "Warm, encouraging Spanish style" },
];

const ASL = [
  { id: "chef-avatar", name: "Professional Chef", description: "Culinary signs" },
  { id: "superhero-captain", name: "Captain Wonder", description: "Superhero avatar" },
];

export const PromptToVideo: React.FC = () => {
  const [prompt, setPrompt] = useState("");
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [voice, setVoice] = useState(VOICES[0].id);
  const [asl, setAsl] = useState(ASL[0].id);

  useEffect(() => {
    let timer: any;
    if (generationId && !videoUrl) {
      timer = setInterval(async () => {
        try {
          const { data, error } = await supabase.functions.invoke("prompt-to-video", {
            body: { action: "status", id: generationId },
          });
          if (error) throw new Error(error.message);
          if ((data as any)?.status === "succeeded" && (data as any)?.videoUrl) {
            setVideoUrl((data as any).videoUrl);
            clearInterval(timer);
            toast.success("Video ready");
          } else if ((data as any)?.status === "failed") {
            clearInterval(timer);
            toast.error("Generation failed");
            setGenerationId(null);
          }
        } catch (e) {
          console.error(e);
        }
      }, 4000);
    }
    return () => clearInterval(timer);
  }, [generationId, videoUrl]);

  const startGeneration = async () => {
    if (!prompt.trim()) {
      toast.error("Enter a prompt");
      return;
    }
    try {
      setLoading(true);
      setVideoUrl(null);
      const { data, error } = await supabase.functions.invoke("prompt-to-video", {
        body: { action: "start", prompt },
      });
      if (error) throw new Error(error.message);
      if (!(data as any)?.id) throw new Error("No generation ID returned");
      setGenerationId((data as any).id);
      toast("Generating… This can take ~1–2 minutes");
    } catch (e: any) {
      toast.error(e.message || "Could not start generation");
    } finally {
      setLoading(false);
    }
  };

  const selectedVoice = useMemo(() => VOICES.find(v => v.id === voice) || VOICES[0], [voice]);
  const selectedAsl = useMemo(() => ASL.find(a => a.id === asl) || ASL[0], [asl]);

  return (
    <section className="py-16">
      <div className="container mx-auto px-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5"/> Prompt → Video (Beta)</CardTitle>
            <CardDescription>Type a scene. We generate a short clip, then play it in the Axessible player with toggles for CC, ASL, and AD.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="prompt">Prompt</Label>
                  <Input id="prompt" placeholder="A chef tossing pasta in a pan, cinematic lighting" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
                  <p className="text-xs text-muted-foreground">We call a secure Edge Function. No API keys in the browser.</p>
                </div>
                <div className="space-y-2">
                  <Label>Voice</Label>
                  <Select value={voice} onValueChange={setVoice}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VOICES.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ASL Avatar</Label>
                  <Select value={asl} onValueChange={setAsl}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ASL.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={startGeneration} disabled={loading}>
                    <Sparkles className="w-4 h-4 mr-2"/> Generate
                  </Button>
                  {generationId && !videoUrl && (
                    <div className="inline-flex items-center text-sm text-muted-foreground"><Clock className="w-4 h-4 mr-1"/> Generating…</div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2">
                {videoUrl ? (
                  <AxessiblePlayer
                    videoSrc={videoUrl}
                    title="Generated video"
                    selectedVoice={selectedVoice}
                    selectedASLAvatar={selectedAsl}
                    contentType="recipe"
                  />
                ) : (
                  <div className="border rounded-lg p-8 text-center text-sm text-muted-foreground">
                    Enter a prompt and click Generate to create a short clip.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
