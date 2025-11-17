import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Send, Check, AlertCircle, Loader2 } from 'lucide-react';
import { sendAICommand, executeAIAction, AIAction } from '@/services/axessibleAI';
import { toast } from 'sonner';

interface AIAssistantProps {
  projectId: string;
  videoId: string;
  currentContext: string;
}

export function AIAssistant({ projectId, videoId, currentContext }: AIAssistantProps) {
  const [message, setMessage] = useState('');
  const [pendingAction, setPendingAction] = useState<AIAction | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Get or create AI session
  const { data: session } = useQuery({
    queryKey: ['aiSession', projectId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Try to find existing session
      const { data: existing } = await supabase
        .from('ai_chat_sessions')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      if (existing) return existing;

      // Create new session
      const { data: newSession, error } = await supabase
        .from('ai_chat_sessions')
        .insert({
          user_id: user.id,
          project_id: projectId,
          video_id: videoId,
          current_context: currentContext,
          messages: [],
          message_count: 0,
          ai_credits_used: 0
        })
        .select()
        .single();

      if (error) throw error;
      return newSession;
    }
  });

  const sendMessage = useMutation({
    mutationFn: async (userMessage: string) => {
      if (!session) throw new Error('No session');

      const response = await sendAICommand(
        session.id,
        userMessage,
        projectId,
        videoId,
        currentContext
      );

      return response;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['aiSession'] });
      
      if (response.action) {
        setPendingAction(response.action);
      }
    },
    onError: (error) => {
      toast.error('Failed to send message', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const executeAction = useMutation({
    mutationFn: async (action: AIAction) => {
      const result = await executeAIAction(action, projectId, videoId);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      // Update session with executed action
      if (session) {
        await supabase
          .from('ai_chat_sessions')
          .update({
            last_action: action.action,
            current_context: currentContext
          })
          .eq('id', session.id);
      }

      return result;
    },
    onSuccess: () => {
      setPendingAction(null);
      queryClient.invalidateQueries({ queryKey: ['projectScenes'] });
      queryClient.invalidateQueries({ queryKey: ['aiSession'] });
      toast.success('Command Executed', {
        description: 'Your request has been completed successfully'
      });
    },
    onError: (error) => {
      toast.error('Execution Failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const handleSend = () => {
    if (!message.trim()) return;
    sendMessage.mutate(message);
    setMessage('');
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages]);

  const messages = (session?.messages as any[]) || [];

  return (
    <Card className="flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Axessible AI Assistant</h3>
        <Badge variant="secondary" className="ml-auto">Beta</Badge>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Ask me anything about your video project!</p>
              <p className="text-xs mt-2">
                I can apply templates, delete segments, create scenes, and more.
              </p>
            </div>
          )}

          {messages.map((msg: any, idx: number) => (
            <div
              key={idx}
              className={`flex gap-3 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`rounded-lg p-3 max-w-[80%] ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                {msg.action && (
                  <Badge variant="outline" className="mt-2">
                    Action: {msg.action.action}
                  </Badge>
                )}
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Pending Action */}
      {pendingAction && (
        <div className="p-4 border-t bg-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">
                Execute: {pendingAction.action}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPendingAction(null)}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => executeAction.mutate(pendingAction)}
                disabled={executeAction.isPending}
              >
                {executeAction.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-1" />
                )}
                Execute
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            placeholder="Ask me anything or give me a command..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={sendMessage.isPending}
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sendMessage.isPending}
            size="icon"
          >
            {sendMessage.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Try: "Apply Viral TikTok template" • "Delete segments 2, 5, 7" • "Create a TikTok clip"
        </p>
      </div>
    </Card>
  );
}
