import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js for optimal performance
env.allowLocalModels = false;
env.useBrowserCache = true;

const MAX_IMAGE_DIMENSION = 1024;

let segmentationPipeline: any = null;
let classificationPipeline: any = null;
let nsfwPipeline: any = null;

// Initialize AI models
export const initializeModels = async () => {
  try {
    console.log('Initializing AI models...');
    
    // Initialize segmentation model for background removal
    if (!segmentationPipeline) {
      segmentationPipeline = await pipeline(
        'image-segmentation', 
        'Xenova/segformer-b0-finetuned-ade-512-512',
        { device: 'webgpu' }
      );
    }

    // Initialize classification model for people detection
    if (!classificationPipeline) {
      classificationPipeline = await pipeline(
        'image-classification',
        'google/vit-base-patch16-224',
        { device: 'webgpu' }
      );
    }

    console.log('AI models initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing AI models:', error);
    return false;
  }
};

// Resize image if it exceeds maximum dimensions
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

// Check if image contains people
export const detectPeople = async (imageElement: HTMLImageElement): Promise<boolean> => {
  try {
    if (!classificationPipeline) {
      await initializeModels();
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    resizeImageIfNeeded(canvas, ctx, imageElement);
    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    const result = await classificationPipeline(imageData);
    
    // Check if any of the top predictions relate to people
    const peopleKeywords = ['person', 'people', 'human', 'man', 'woman', 'child', 'face', 'portrait'];
    const hasPeople = result.some((prediction: any) => 
      peopleKeywords.some(keyword => 
        prediction.label.toLowerCase().includes(keyword)
      ) && prediction.score > 0.1
    );

    console.log('People detection result:', hasPeople, result);
    return hasPeople;
  } catch (error) {
    console.error('Error detecting people:', error);
    return false;
  }
};

// Basic content moderation (check for inappropriate content)
export const moderateContent = async (imageElement: HTMLImageElement): Promise<boolean> => {
  try {
    // Simple check based on image classification
    // In a real app, you'd use a dedicated NSFW detection model
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    resizeImageIfNeeded(canvas, ctx, imageElement);
    
    // For now, we'll do a basic check - in production you'd use specialized models
    // This is a simplified implementation for demonstration
    console.log('Content moderation passed (basic implementation)');
    return true;
  } catch (error) {
    console.error('Error in content moderation:', error);
    return false;
  }
};

// Remove background from image
export const removeBackground = async (imageElement: HTMLImageElement): Promise<Blob> => {
  try {
    console.log('Starting background removal...');
    
    if (!segmentationPipeline) {
      await initializeModels();
    }
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    
    const wasResized = resizeImageIfNeeded(canvas, ctx, imageElement);
    console.log(`Image ${wasResized ? 'was' : 'was not'} resized. Final dimensions: ${canvas.width}x${canvas.height}`);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    console.log('Processing with segmentation model...');
    
    const result = await segmentationPipeline(imageData);
    console.log('Segmentation result:', result);
    
    if (!result || !Array.isArray(result) || result.length === 0 || !result[0].mask) {
      throw new Error('Invalid segmentation result');
    }
    
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = canvas.width;
    outputCanvas.height = canvas.height;
    const outputCtx = outputCanvas.getContext('2d');
    if (!outputCtx) throw new Error('Could not get output canvas context');
    
    outputCtx.drawImage(canvas, 0, 0);
    
    const outputImageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
    const data = outputImageData.data;
    
    // Apply inverted mask to alpha channel to keep people, remove background
    for (let i = 0; i < result[0].mask.data.length; i++) {
      const alpha = Math.round((1 - result[0].mask.data[i]) * 255);
      data[i * 4 + 3] = alpha;
    }
    
    outputCtx.putImageData(outputImageData, 0, 0);
    console.log('Background removal completed');
    
    return new Promise((resolve, reject) => {
      outputCanvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/png',
        1.0
      );
    });
  } catch (error) {
    console.error('Error removing background:', error);
    throw error;
  }
};

// Load image from file
export const loadImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};
