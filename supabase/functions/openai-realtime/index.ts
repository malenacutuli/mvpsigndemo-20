import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  console.log("OpenAI Realtime proxy request received:", req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  const openaiUrl = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';
  
  console.log("Attempting to connect to OpenAI Realtime API:", openaiUrl);
  
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    console.error("OpenAI API key not found");
    return new Response('OpenAI API key not configured', { 
      status: 500, 
      headers: corsHeaders 
    });
  }

  try {
    // Create WebSocket connection to OpenAI
    const openaiWs = new WebSocket(openaiUrl, {
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    });

    console.log("WebSocket connection to OpenAI created");

    const { socket, response } = Deno.upgradeWebSocket(req);

    let sessionConfigured = false;

    socket.onopen = () => {
      console.log("Client WebSocket connection opened");
    };

    socket.onclose = () => {
      console.log("Client WebSocket connection closed");
      openaiWs.close();
    };

    socket.onerror = (error) => {
      console.error("Client WebSocket error:", error);
      openaiWs.close();
    };

    // Forward messages from client to OpenAI
    socket.onmessage = (event) => {
      console.log("Message from client:", event.data);
      try {
        const data = JSON.parse(event.data);
        console.log("Parsed client message:", data.type);
        openaiWs.send(JSON.stringify(data));
      } catch (error) {
        console.error("Error parsing client message:", error);
      }
    };

    // Handle messages from OpenAI
    openaiWs.onopen = () => {
      console.log("OpenAI WebSocket connection opened");
    };

    openaiWs.onmessage = (event) => {
      console.log("Message from OpenAI:", event.data);
      try {
        const data = JSON.parse(event.data);
        console.log("OpenAI message type:", data.type);
        
        // Send session configuration after receiving session.created
        if (data.type === 'session.created' && !sessionConfigured) {
          console.log("Session created, sending configuration...");
          const sessionConfig = {
            type: 'session.update',
            session: {
              modalities: ['text', 'audio'],
              instructions: `You are Axessible AI, an accessibility-focused assistant for video content. 
                           Help users create accessible videos with captions, audio descriptions, and translations. 
                           Be encouraging and provide specific guidance for accessibility improvements.
                           When describing visual elements, be detailed and inclusive.`,
              voice: 'alloy',
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              input_audio_transcription: {
                model: 'whisper-1'
              },
              turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 1000
              },
              tools: [
                {
                  type: 'function',
                  name: 'generate_captions',
                  description: 'Generate stylized captions for video content',
                  parameters: {
                    type: 'object',
                    properties: {
                      text: { type: 'string' },
                      style: { type: 'string' },
                      language: { type: 'string' }
                    },
                    required: ['text']
                  }
                },
                {
                  type: 'function',
                  name: 'create_audio_description',
                  description: 'Create detailed audio descriptions for visual content',
                  parameters: {
                    type: 'object',
                    properties: {
                      scene_description: { type: 'string' },
                      duration: { type: 'number' },
                      voice_style: { type: 'string' }
                    },
                    required: ['scene_description']
                  }
                },
                {
                  type: 'function',
                  name: 'translate_content',
                  description: 'Translate video content to specified language',
                  parameters: {
                    type: 'object',
                    properties: {
                      text: { type: 'string' },
                      target_language: { type: 'string' },
                      preserve_timing: { type: 'boolean' }
                    },
                    required: ['text', 'target_language']
                  }
                }
              ],
              tool_choice: 'auto',
              temperature: 0.8,
              max_response_output_tokens: 'inf'
            }
          };
          
          openaiWs.send(JSON.stringify(sessionConfig));
          sessionConfigured = true;
          console.log("Session configuration sent");
        }
        
        // Forward all messages to client
        socket.send(JSON.stringify(data));
      } catch (error) {
        console.error("Error parsing OpenAI message:", error);
      }
    };

    openaiWs.onclose = () => {
      console.log("OpenAI WebSocket connection closed");
      socket.close();
    };

    openaiWs.onerror = (error) => {
      console.error("OpenAI WebSocket error:", error);
      socket.close();
    };

    return response;

  } catch (error) {
    console.error("WebSocket setup error:", error);
    return new Response(`WebSocket error: ${error.message}`, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});