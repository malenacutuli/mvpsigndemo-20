import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Video, 
  Mic, 
  MicOff, 
  Camera, 
  CameraOff, 
  Users, 
  MessageSquare, 
  Settings, 
  Share,
  Subtitles,
  HandHelping,
  Volume2,
  Keyboard,
  Eye
} from 'lucide-react';
import { RealtimeChat } from './RealtimeChat';
import { toast } from 'sonner';

interface WebinarParticipant {
  id: string;
  name: string;
  role: 'host' | 'panelist' | 'attendee';
  isVideoOn: boolean;
  isAudioOn: boolean;
  joinedAt: Date;
}

interface ChatMessage {
  id: string;
  participantId: string;
  participantName: string;
  message: string;
  timestamp: Date;
  isPrivate?: boolean;
}

interface WebinarHostProps {
  className?: string;
}

export const WebinarHost: React.FC<WebinarHostProps> = ({
  className = ""
}) => {
  const [isLive, setIsLive] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [participants, setParticipants] = useState<WebinarParticipant[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  // Accessibility features
  const [liveCaptions, setLiveCaptions] = useState(true);
  const [audioDescriptions, setAudioDescriptions] = useState(true);
  const [keyboardNavigation, setKeyboardNavigation] = useState(true);
  const [screenReaderSupport, setScreenReaderSupport] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  
  // Webinar settings
  const [webinarTitle, setWebinarTitle] = useState('Accessibility in Video Content');
  const [webinarDescription, setWebinarDescription] = useState('Learn how to make your video content accessible to everyone');
  const [maxParticipants, setMaxParticipants] = useState(100);
  const [allowChat, setAllowChat] = useState(true);
  const [recordSession, setRecordSession] = useState(false);

  const startWebinar = async () => {
    try {
      // Request media permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoOn,
        audio: isAudioOn
      });
      
      // In a real implementation, you would set up WebRTC connections here
      setIsLive(true);
      
      // Add host as first participant
      const host: WebinarParticipant = {
        id: 'host-1',
        name: 'You (Host)',
        role: 'host',
        isVideoOn,
        isAudioOn,
        joinedAt: new Date()
      };
      
      setParticipants([host]);
      
      toast.success('Webinar started successfully!');
      
      // Clean up stream (in real app, you'd keep it for the session)
      stream.getTracks().forEach(track => track.stop());
      
    } catch (error) {
      console.error('Error starting webinar:', error);
      toast.error('Failed to start webinar. Please check your camera and microphone permissions.');
    }
  };

  const stopWebinar = () => {
    setIsLive(false);
    setParticipants([]);
    setChatMessages([]);
    toast.info('Webinar ended');
  };

  const sendChatMessage = () => {
    if (!newMessage.trim()) return;
    
    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      participantId: 'host-1',
      participantName: 'You (Host)',
      message: newMessage,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const toggleVideo = () => {
    setIsVideoOn(!isVideoOn);
    // In real implementation, update stream
  };

  const toggleAudio = () => {
    setIsAudioOn(!isAudioOn);
    // In real implementation, update stream
  };

  // Simulate participants joining
  useEffect(() => {
    if (!isLive) return;
    
    const addParticipant = () => {
      const names = ['Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Wilson', 'Emma Brown'];
      const randomName = names[Math.floor(Math.random() * names.length)];
      
      const participant: WebinarParticipant = {
        id: `participant-${Date.now()}`,
        name: randomName,
        role: 'attendee',
        isVideoOn: Math.random() > 0.7,
        isAudioOn: false, // Attendees typically muted
        joinedAt: new Date()
      };
      
      setParticipants(prev => {
        if (prev.length >= maxParticipants) return prev;
        return [...prev, participant];
      });
      
      toast.info(`${randomName} joined the webinar`);
    };
    
    // Add participants randomly
    const interval = setInterval(() => {
      if (Math.random() > 0.7 && participants.length < maxParticipants) {
        addParticipant();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isLive, participants.length, maxParticipants]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Webinar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              Accessible Webinar Host
              {isLive && <Badge variant="destructive">LIVE</Badge>}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                <Users className="w-3 h-3 mr-1" />
                {participants.length}
              </Badge>
              {liveCaptions && (
                <Badge variant="outline">
                  <Subtitles className="w-3 h-3 mr-1" />
                  Live CC
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isLive ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="webinar-title">Webinar Title</Label>
                  <Input
                    id="webinar-title"
                    value={webinarTitle}
                    onChange={(e) => setWebinarTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-participants">Max Participants</Label>
                  <Input
                    id="max-participants"
                    type="number"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(Number(e.target.value))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="webinar-description">Description</Label>
                <Textarea
                  id="webinar-description"
                  value={webinarDescription}
                  onChange={(e) => setWebinarDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">{webinarTitle}</h3>
              <p className="text-muted-foreground">{webinarDescription}</p>
            </div>
          )}
          
          {/* Media Controls */}
          <div className="flex gap-2">
            <Button
              onClick={toggleVideo}
              variant={isVideoOn ? "default" : "outline"}
              size="sm"
            >
              {isVideoOn ? (
                <Camera className="w-4 h-4 mr-2" />
              ) : (
                <CameraOff className="w-4 h-4 mr-2" />
              )}
              Video
            </Button>
            
            <Button
              onClick={toggleAudio}
              variant={isAudioOn ? "default" : "outline"}
              size="sm"
            >
              {isAudioOn ? (
                <Mic className="w-4 h-4 mr-2" />
              ) : (
                <MicOff className="w-4 h-4 mr-2" />
              )}
              Audio
            </Button>
            
            <Button
              onClick={isLive ? stopWebinar : startWebinar}
              variant={isLive ? "destructive" : "default"}
            >
              {isLive ? 'End Webinar' : 'Start Webinar'}
            </Button>
            
            {isLive && (
              <Button variant="outline" size="sm">
                <Share className="w-4 h-4 mr-2" />
                Share Link
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Webinar Content */}
      {isLive && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Video Area */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="p-0">
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="w-24 h-24 bg-primary/30 rounded-full flex items-center justify-center mx-auto">
                      <Video className="w-12 h-12 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">You're Live!</h3>
                      <p className="text-muted-foreground">
                        Your video feed would appear here
                      </p>
                    </div>
                    {liveCaptions && (
                      <div className="bg-black/80 text-white p-2 rounded max-w-md mx-auto">
                        <p className="text-sm">
                          [Live captions would appear here as you speak]
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* AI Assistant */}
            <RealtimeChat
              onTranscript={(text) => {
                // Live caption integration
                console.log('Live caption:', text);
              }}
              onFunctionCall={(name, args) => {
                console.log('Function call:', name, args);
                toast.info(`AI Assistant: ${name} called`);
              }}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Tabs defaultValue="participants">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="participants">Participants</TabsTrigger>
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="accessibility">Access</TabsTrigger>
              </TabsList>
              
              <TabsContent value="participants" className="space-y-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">
                      Participants ({participants.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-60 overflow-y-auto">
                    {participants.map(participant => (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between p-2 rounded-lg border"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium">
                              {participant.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{participant.name}</p>
                            <Badge variant="outline" className="text-xs">
                              {participant.role}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {participant.isVideoOn ? (
                            <Camera className="w-3 h-3 text-green-600" />
                          ) : (
                            <CameraOff className="w-3 h-3 text-gray-400" />
                          )}
                          {participant.isAudioOn ? (
                            <Mic className="w-3 h-3 text-green-600" />
                          ) : (
                            <MicOff className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="chat" className="space-y-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Live Chat
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {chatMessages.map(msg => (
                        <div key={msg.id} className="text-sm">
                          <span className="font-medium text-primary">
                            {msg.participantName}:
                          </span>
                          <span className="ml-2">{msg.message}</span>
                        </div>
                      ))}
                      {chatMessages.length === 0 && (
                        <p className="text-muted-foreground text-sm">
                          No messages yet. Start the conversation!
                        </p>
                      )}
                    </div>
                    
                    {allowChat && (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Type a message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                        />
                        <Button size="sm" onClick={sendChatMessage}>
                          Send
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="accessibility" className="space-y-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Accessibility Features</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2 text-sm">
                          <Subtitles className="w-4 h-4" />
                          Live Captions
                        </Label>
                        <Switch
                          checked={liveCaptions}
                          onCheckedChange={setLiveCaptions}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2 text-sm">
                          <Volume2 className="w-4 h-4" />
                          Audio Descriptions
                        </Label>
                        <Switch
                          checked={audioDescriptions}
                          onCheckedChange={setAudioDescriptions}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2 text-sm">
                          <Keyboard className="w-4 h-4" />
                          Keyboard Navigation
                        </Label>
                        <Switch
                          checked={keyboardNavigation}
                          onCheckedChange={setKeyboardNavigation}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2 text-sm">
                          <Eye className="w-4 h-4" />
                          Screen Reader Support
                        </Label>
                        <Switch
                          checked={screenReaderSupport}
                          onCheckedChange={setScreenReaderSupport}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">
                          High Contrast Mode
                        </Label>
                        <Switch
                          checked={highContrast}
                          onCheckedChange={setHighContrast}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}

      {/* Pre-webinar Settings */}
      {!isLive && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Accessibility Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <h4 className="font-medium">Core Features</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Live Closed Captions</Label>
                    <Switch checked={liveCaptions} onCheckedChange={setLiveCaptions} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Audio Descriptions</Label>
                    <Switch checked={audioDescriptions} onCheckedChange={setAudioDescriptions} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Allow Chat</Label>
                    <Switch checked={allowChat} onCheckedChange={setAllowChat} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Record Session</Label>
                    <Switch checked={recordSession} onCheckedChange={setRecordSession} />
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">Accessibility</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Keyboard Navigation</Label>
                    <Switch checked={keyboardNavigation} onCheckedChange={setKeyboardNavigation} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Screen Reader Support</Label>
                    <Switch checked={screenReaderSupport} onCheckedChange={setScreenReaderSupport} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>High Contrast Mode</Label>
                    <Switch checked={highContrast} onCheckedChange={setHighContrast} />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
