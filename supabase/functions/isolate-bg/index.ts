import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { pipeline, env } from "https://esm.sh/@huggingface/transformers@3.7.0";

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = false;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_IMAGE_DIMENSION = 1024;

function resizeImageIfNeeded(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, image: HTMLImageElement) {
  let width = image.naturalWidth;
  let height = image.naturalHeight;

  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    if (width > height) {
      height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
      width = MAX_IMAGE_DIMENSION;
    } else {
      width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
      height = MAX_IMAGE_DIMENSION;
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, 0, 0, width, height);
    return true;
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0);
  return false;
}

const removeBackground = async (imageElement: HTMLImageElement): Promise<Blob> => {
  try {
    console.log('Starting background removal process...');
    const segmenter = await pipeline('image-segmentation', 'Xenova/segformer-b0-finetuned-ade-512-512', {
      device: 'wasm',
    });
    
    // Convert HTMLImageElement to canvas
    const canvas = new OffscreenCanvas(imageElement.naturalWidth, imageElement.naturalHeight);
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Could not get canvas context');
    
    // Resize image if needed and draw it to canvas
    const wasResized = resizeImageIfNeeded(canvas as any, ctx as any, imageElement);
    console.log(`Image ${wasResized ? 'was' : 'was not'} resized. Final dimensions: ${canvas.width}x${canvas.height}`);
    
    // Get image data as base64
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 });
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    console.log('Processing with segmentation model...');
    const result = await segmenter(uint8Array);
    
    console.log('Segmentation result:', result);
    
    if (!result || !Array.isArray(result) || result.length === 0 || !result[0].mask) {
      throw new Error('Invalid segmentation result');
    }
    
    // Create a new canvas for the masked image
    const outputCanvas = new OffscreenCanvas(canvas.width, canvas.height);
    const outputCtx = outputCanvas.getContext('2d');
    
    if (!outputCtx) throw new Error('Could not get output canvas context');
    
    // Draw original image
    outputCtx.drawImage(canvas as any, 0, 0);
    
    // Apply the mask
    const outputImageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
    const data = outputImageData.data;
    
    // Apply inverted mask to alpha channel
    for (let i = 0; i < result[0].mask.data.length; i++) {
      // Invert the mask value (1 - value) to keep the subject instead of the background
      const alpha = Math.round((1 - result[0].mask.data[i]) * 255);
      data[i * 4 + 3] = alpha;
    }
    
    outputCtx.putImageData(outputImageData, 0, 0);
    console.log('Mask applied successfully');
    
    // Convert canvas to blob
    return await outputCanvas.convertToBlob({ type: 'image/png', quality: 1.0 });
  } catch (error) {
    console.error('Error removing background:', error);
    throw error;
  }
};

const loadImage = (arrayBuffer: ArrayBuffer): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const blob = new Blob([arrayBuffer]);
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { job_id } = await req.json();
    
    if (!job_id) {
      throw new Error("job_id is required");
    }

    console.log('Processing job:', job_id);

    // Get job details
    const { data: job, error: jobError } = await supabaseClient
      .from('jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      throw new Error(`Job not found: ${jobError?.message}`);
    }

    // Update status to processing
    await supabaseClient
      .from('jobs')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', job_id);

    // Download the image from uploads bucket
    const { data: imageData, error: downloadError } = await supabaseClient
      .storage
      .from('uploads')
      .download(`${job.user_id}/${job_id}`);

    if (downloadError || !imageData) {
      throw new Error(`Failed to download image: ${downloadError?.message}`);
    }

    // Convert blob to array buffer and load image
    const arrayBuffer = await imageData.arrayBuffer();
    const imageElement = await loadImage(arrayBuffer);

    // Process the image
    const processedBlob = await removeBackground(imageElement);

    // Upload processed image to outputs bucket
    const outputFileName = `${job_id}.png`;
    const { error: uploadError } = await supabaseClient
      .storage
      .from('outputs')
      .upload(outputFileName, processedBlob, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Failed to upload processed image: ${uploadError.message}`);
    }

    // Get public URL for the output
    const { data: { publicUrl } } = supabaseClient
      .storage
      .from('outputs')
      .getPublicUrl(outputFileName);

    // Update job with success
    await supabaseClient
      .from('jobs')
      .update({ 
        status: 'done', 
        output_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', job_id);

    console.log('Job completed successfully:', job_id);

    return new Response(JSON.stringify({ success: true, output_url: publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Error processing job:', error);
    
    // Update job with error status if we have job_id
    try {
      const { job_id } = await req.json();
      if (job_id) {
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        
        await supabaseClient
          .from('jobs')
          .update({ 
            status: 'error',
            updated_at: new Date().toISOString()
          })
          .eq('id', job_id);
      }
    } catch (updateError) {
      console.error('Failed to update job status:', updateError);
    }

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
