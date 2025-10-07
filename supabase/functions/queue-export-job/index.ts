import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SQSClient, SendMessageCommand } from 'npm:@aws-sdk/client-sqs@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExportOptions {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  speed?: number;
  audioBoost?: number;
  subtitles?: string;
}

interface RequestBody {
  videoId: string;
  exportOptions?: ExportOptions;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[QUEUE-EXPORT-JOB] Function started');

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('[QUEUE-EXPORT-JOB] Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[QUEUE-EXPORT-JOB] User authenticated:', user.id);

    // Parse request body
    const { videoId, exportOptions = {} } = await req.json() as RequestBody;

    if (!videoId) {
      console.error('[QUEUE-EXPORT-JOB] Missing videoId');
      return new Response(
        JSON.stringify({ error: 'videoId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[QUEUE-EXPORT-JOB] Processing export for video:', videoId);

    // Verify user owns the video
    const { data: video, error: videoError } = await supabaseClient
      .from('videos')
      .select('id, storage_path, user_id')
      .eq('id', videoId)
      .eq('user_id', user.id)
      .single();

    if (videoError || !video) {
      console.error('[QUEUE-EXPORT-JOB] Video not found or unauthorized:', videoError);
      return new Response(
        JSON.stringify({ error: 'Video not found or unauthorized' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[QUEUE-EXPORT-JOB] Video verified, creating export job');

    // Create export job record
    const { data: job, error: jobError } = await supabaseClient
      .from('export_jobs')
      .insert({
        user_id: user.id,
        video_id: videoId,
        status: 'queued',
        progress: 0,
        export_options: exportOptions,
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error('[QUEUE-EXPORT-JOB] Failed to create job:', jobError);
      return new Response(
        JSON.stringify({ error: 'Failed to create export job' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[QUEUE-EXPORT-JOB] Job created with ID:', job.id);

    // Construct video URL
    const videoUrl = `https://faeyekynudyzeotbjfsj.supabase.co/storage/v1/object/public/videos/${video.storage_path}`;

    // Prepare SQS message
    const sqsMessage = {
      jobId: job.id,
      userId: user.id,
      videoId: videoId,
      videoUrl: videoUrl,
      exportOptions: exportOptions,
      supabaseUrl: Deno.env.get('SUPABASE_URL'),
      supabaseKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      r2Endpoint: Deno.env.get('CLOUDFLARE_R2_ENDPOINT'),
      r2AccessKeyId: Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID'),
      r2SecretAccessKey: Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY'),
      r2BucketName: Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME'),
    };

    console.log('[QUEUE-EXPORT-JOB] Sending message to SQS');

    // Initialize SQS client
    const sqsClient = new SQSClient({
      region: Deno.env.get('AWS_REGION') ?? 'us-east-1',
      credentials: {
        accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY') ?? '',
      },
    });

    // Send message to SQS
    const sendCommand = new SendMessageCommand({
      QueueUrl: Deno.env.get('SQS_QUEUE_URL'),
      MessageBody: JSON.stringify(sqsMessage),
      MessageAttributes: {
        jobId: {
          DataType: 'String',
          StringValue: job.id,
        },
        userId: {
          DataType: 'String',
          StringValue: user.id,
        },
      },
    });

    const sqsResponse = await sqsClient.send(sendCommand);

    console.log('[QUEUE-EXPORT-JOB] SQS message sent:', sqsResponse.MessageId);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        status: 'queued',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[QUEUE-EXPORT-JOB] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
