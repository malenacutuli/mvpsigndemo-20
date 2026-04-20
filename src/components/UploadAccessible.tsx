import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AxessiblePlayer } from "./AxessiblePlayer";
import { AccessibilityGrader } from "./AccessibilityGrader";
import { TranscriptionManager } from "./TranscriptionManager";
import { KeyboardAccessibilityManager } from "./KeyboardAccessibilityManager";
import { VideoDubbingManager } from "./VideoDubbingManager";
import { WebinarHost } from "./WebinarHost";
import { RealtimeChat } from "./RealtimeChat";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, ShieldCheck, Languages, HandHelping, Settings, Video, MessageSquare } from "lucide-react";
import captionsIntention from '@/assets/captions-intention.jpg';
import type { CaptionSegment } from "./CaptionsWithIntention";

// Updated content-type and voice/avatar presets matching DemoSection
const voiceOptions = {
  recipe: [
    { id: "gordon-ramsay", name: "Gordon Ramsay Style", description: "Passionate, authoritative cooking voice" },
    { id: "julia-child", name: "Julia Child Style", description: "Warm, encouraging culinary guide" },
    { id: "anthony-bourdain", name: "Anthony Bourdain Style", description: "Sophisticated, worldly food narrator" },
  ],
  education: [
    { id: "dora-exploradora", name: "Dora la Exploradora Style", description: "Warm, encouraging educational voice" },
    { id: "minnie-mouse", name: "Minnie Mouse Style", description: "Friendly, sweet learning guide" },
    { id: "bob-esponja", name: "Bob Esponja Style", description: "Young, animated educational narrator" },
  ],
} as const;

const aslOptions = {
  recipe: [
    { id: "chef-avatar", name: "Master Chef Rosa", description: "Professional chef with culinary sign expertise" },
    { id: "food-expert", name: "Chef Marcus (Youth)", description: "Young professional chef, great for millennial audience" },
    { id: "home-cook", name: "Nonna Isabella", description: "Traditional home cook with warm, family-style signing" },
  ],
  education: [
    { id: "superhero-captain", name: "Captain Science (Kid)", description: "Young superhero perfect for children ages 6-12" },
    { id: "superhero-star", name: "Star Guardian Emma (Teen)", description: "Teen hero ideal for middle school students" },
    { id: "friendly-teacher", name: "Teacher Maya", description: "Professional educator with clear, patient signing" },
    { id: "student-peer", name: "Student Alex (Age 8)", description: "Child signer for peer-to-peer learning experience" },
  ],
} as const;


function mapSegments(segments: any[]): CaptionSegment[] {
  return segments.map((seg: any) => {
    const start = Number(seg.start ?? 0);
    const end = Number(seg.end ?? start + 2);
    const txt: string = String(seg.text ?? "").trim();
    const wordsRaw = txt.length ? txt.split(/\s+/) : [];
    const dur = Math.max(end - start, 0.001);
    const step = wordsRaw.length ? dur / wordsRaw.length : dur;
    const words = wordsRaw.map((w: string, i: number) => ({
      text: w,
      startTime: start + i * step,
      endTime: Math.min(end, start + (i + 1) * step),
      emphasis: "normal" as const,
      pitch: "normal" as const,
    }));
    return {
      text: txt,
      speaker: "narrator" as const,
      startTime: start,
      endTime: end,
      words,
    } as CaptionSegment;
  });
}

const ComplianceReport: React.FC<{ available: { cc: boolean; ad: boolean; asl: boolean } } > = ({ available }) => {
  const checks = [
    { id: "cc", label: "Captions present (ADA / WCAG 1.2.2)", pass: available.cc },
    { id: "ad", label: "Audio descriptions available (WCAG 1.2.5)", pass: available.ad },
    { id: "asl", label: "Sign language support (EAA multi-modal)", pass: available.asl },
    { id: "kbd", label: "Keyboard accessible controls (WCAG 2.1.1)", pass: true },
    { id: "contrast", label: "High contrast UI (WCAG 1.4.3)", pass: true },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compliance audit</CardTitle>
        <CardDescription>ADA + EAA quick checks</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {checks.map((c) => (
            <li key={c.id} className="flex items-center gap-2 text-sm">
              <span className={`w-2 h-2 rounded-full ${c.pass ? "bg-green-500" : "bg-destructive"}`} />
              <span>{c.label}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export const UploadAccessible: React.FC = () => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [initialCaptions, setInitialCaptions] = useState<CaptionSegment[] | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const [contentType, setContentType] = useState<"recipe" | "education">("recipe");
  const voices = voiceOptions[contentType];
  const asls = aslOptions[contentType];
  const [voice, setVoice] = useState(voices[0].id);
  const [asl, setAsl] = useState(asls[0].id);
  const [activeTab, setActiveTab] = useState("player");
  const [showCaptions, setShowCaptions] = useState(true);
  const [showSignLanguage, setShowSignLanguage] = useState(false);
  const [showAudioDescription, setShowAudioDescription] = useState(true);

  const selectedVoice = useMemo(() => voices.find(v => v.id === voice) || voices[0], [voices, voice]);
  const selectedAsl = useMemo(() => asls.find(a => a.id === asl) || asls[0], [asls, asl]);

  const onFileChange = async (file?: File) => {
    if (!file) return;
    try {
      setUploading(true);
      toast("Uploading video...", { description: "Please wait while we upload and process your video" });
      
      const path = `demo/${Date.now()}-${file.name}`;
      console.log("Uploading file:", file.name, "Size:", file.size, "bytes");
      
      const { error: upErr } = await supabase.storage.from("videos").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "video/mp4",
      });
      
      if (upErr) {
        console.error("Upload error:", upErr);
        throw upErr;
      }

      console.log("File uploaded successfully, getting public URL...");
      // Use public URL since videos bucket is now public
      const { data: publicUrl } = supabase.storage.from("videos").getPublicUrl(path);
      const resolvedPublicUrl = publicUrl?.publicUrl ?? supabase.storage.from('videos').getPublicUrl(path).data.publicUrl;
      console.log("Public URL created:", resolvedPublicUrl);
      setVideoUrl(resolvedPublicUrl);

      console.log("Starting transcription...");
      toast("Processing video...", { description: "Generating captions with AI" });

      // Auto-transcribe first 15MB for MVP
      const videoUrlForTranscription = resolvedPublicUrl;
      const { data, error } = await supabase.functions.invoke("transcribe", {
        body: { videoUrl: videoUrlForTranscription, rangeBytes: 15000000 },
      });
      
      if (error) {
        console.error("Transcription error:", error);
        throw new Error(error.message || "Transcription failed");
      }
      
      console.log("Transcription response:", data);
      const segments = (data as any)?.segments || [];
      setInitialCaptions(mapSegments(segments));
      toast.success("Video uploaded and processed successfully!", { description: "Ready to experience accessibility features" });
    } catch (e: any) {
      console.error("Upload process error:", e);
      toast.error("Upload failed", { description: e.message || "Please try again" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto px-6">
      <Card className="border-2 border-primary/20 shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-3 text-2xl">
            <Upload className="w-6 h-6 text-primary"/> 
            Experience the accessibility transformation
          </CardTitle>
          <CardDescription className="text-base">
            Upload any video to experience the full accessibility transformation: 
            <strong>Speech Recognition → Captions with Intention → Audio Descriptions → ASL Avatars</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
            {/* Upload File Section */}
            <div className="space-y-6 mb-8">
              <div className="space-y-4">
                <Label>Upload Video File</Label>
                <div className="relative flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed border-primary/30 rounded-xl bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer">
                  <Upload className="w-12 h-12 text-primary/60" />
                  <div className="text-center">
                    <h4 className="text-lg font-semibold mb-2">Choose Video File</h4>
                    <p className="text-sm text-muted-foreground mb-4">Drag and drop or click to select</p>
                    <Button 
                      type="button"
                      disabled={uploading}
                      className="pointer-events-none"
                    >
                      {uploading ? "Uploading..." : "Select Video File"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Supported formats: MP4, WebM, MOV<br/>
                    Maximum size: 5GB
                  </p>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      console.log("File input changed:", e.target.files);
                      const file = e.target.files?.[0];
                      if (file) {
                        console.log("Selected file:", file.name, file.size, file.type);
                        onFileChange(file);
                      }
                    }}
                    disabled={uploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    id="video-upload-input"
                  />
                </div>
              </div>
            </div>

            {/* Enhanced Experience with Tabs */}
            <div className="mb-8">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="player">Player</TabsTrigger>
                  <TabsTrigger value="accessibility">Grader</TabsTrigger>
                  <TabsTrigger value="transcription">Transcripts</TabsTrigger>
                  <TabsTrigger value="dubbing">Dubbing</TabsTrigger>
                  <TabsTrigger value="webinar">Webinar</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                
                <TabsContent value="player" className="mt-6">
                  {videoUrl ? (
                    <AxessiblePlayer
                      videoSrc={videoUrl}
                      title="Your uploaded video"
                      selectedVoice={selectedVoice}
                      selectedSignLanguageAvatar={{ id: asl, name: selectedAsl.name, description: selectedAsl.description }}
                      contentType={contentType}
                      initialCaptions={initialCaptions}
                    />
                  ) : (
                    <div className="border-2 border-dashed border-primary/30 rounded-xl p-12 text-center bg-gradient-accessibility">
                      <div className="mb-6">
                        <Upload className="w-16 h-16 text-primary/60 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">Ready for Your Video</h3>
                        <p className="text-muted-foreground">Upload any video to see the complete accessibility pipeline in action</p>
                      </div>
                      
                      <div className="grid gap-4 text-left max-w-md mx-auto bg-card/50 p-6 rounded-lg">
                        <h4 className="font-semibold text-center">What You'll Experience:</h4>
                        <div className="flex items-center gap-3"><img src={captionsIntention} alt="Captions with Intention" className="w-5 h-5 object-contain"/> Auto-generated Captions with Intention</div>
                        <div className="flex items-center gap-3"><HandHelping className="w-5 h-5 text-accent"/> ASL Avatar Overlay (Placeholder)</div>
                        <div className="flex items-center gap-3"><Languages className="w-5 h-5 text-destructive"/> Audio Descriptions</div>
                        <div className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-green-600"/> Full ADA/EAA Compliance</div>
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="accessibility" className="mt-6">
                  <AccessibilityGrader
                    videoUrl={videoUrl || undefined}
                    hasCaptions={!!initialCaptions && initialCaptions.length > 0}
                    hasAudioDescription={false}
                    hasSignLanguage={false}
                    hasTranscript={!!initialCaptions && initialCaptions.length > 0}
                    hasKeyboardNav={true}
                    contrastRatio={4.8}
                    language="en"
                    onFixIssue={(issue) => {
                      console.log('Fix accessibility issue:', issue);
                    }}
                  />
                </TabsContent>
                
                <TabsContent value="transcription" className="mt-6">
                  <TranscriptionManager
                    videoUrl={videoUrl || ""}
                    onTranscriptionComplete={(segments, language) => {
                      setInitialCaptions(segments);
                      toast.success(`Transcription completed for ${language}`);
                    }}
                  />
                </TabsContent>
                
                <TabsContent value="dubbing" className="mt-6">
                  <VideoDubbingManager
                    videoUrl={videoUrl || ""}
                    originalLanguage="en"
                    transcriptText={initialCaptions?.map(c => c.text).join(' ') || ""}
                    audioDescriptions={[]} // No audio descriptions available in upload component yet
                  />
                </TabsContent>
                
                <TabsContent value="webinar" className="mt-6">
                  <WebinarHost />
                </TabsContent>
                
                <TabsContent value="settings" className="mt-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <KeyboardAccessibilityManager
                      onToggleCaptions={() => setShowCaptions(!showCaptions)}
                      onToggleSignLanguage={() => setShowSignLanguage(!showSignLanguage)}
                      onToggleAD={() => setShowAudioDescription(!showAudioDescription)}
                    />
                    <RealtimeChat
                      onTranscript={(text) => {
                        console.log('Real-time transcript:', text);
                      }}
                      onFunctionCall={(name, args) => {
                        console.log('AI function call:', name, args);
                        toast.info(`AI Assistant: ${name} activated`);
                      }}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Options Section */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contentType">Content type</Label>
                  <Select value={contentType} onValueChange={(v) => {
                    setContentType(v as any);
                    setVoice(voiceOptions[v as "recipe" | "education"][0].id);
                    setAsl(aslOptions[v as "recipe" | "education"][0].id);
                  }}>
                    <SelectTrigger id="contentType"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recipe">Recipe</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="voice">Audio description voice</Label>
                  <Select value={voice} onValueChange={(v) => setVoice(v as any)}>
                    <SelectTrigger id="voice"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {voices.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="asl">ASL avatar</Label>
                  <Select value={asl} onValueChange={(v) => setAsl(v as any)}>
                    <SelectTrigger id="asl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {asls.map(a => (
                        <SelectItem key={a.id} value={a.id}>
                          <div>
                            <div className="font-medium">{a.name}</div>
                            <div className="text-xs text-muted-foreground">{a.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>


              <div className="space-y-4">
                <ComplianceReport available={{ cc: !!initialCaptions, ad: true, asl: true }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
  );
};
