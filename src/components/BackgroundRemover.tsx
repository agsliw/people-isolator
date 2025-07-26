import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { PhotoUpload } from './PhotoUpload';
import { ProcessingStatus, getProcessingSteps } from './ProcessingStatus';
import { ImagePreview } from './ImagePreview';
import { Card } from '@/components/ui/card';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { loadImage, detectPeople, moderateContent, removeBackground, initializeModels } from '@/lib/ai-utils';

type ProcessingState = 'idle' | 'processing' | 'completed' | 'error';

export const BackgroundRemover = () => {
  const [state, setState] = useState<ProcessingState>('idle');
  const [originalImage, setOriginalImage] = useState<string>('');
  const [processedImage, setProcessedImage] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [steps, setSteps] = useState(getProcessingSteps());
  const [modelsInitialized, setModelsInitialized] = useState(false);

  const updateStepStatus = (stepId: string, status: 'pending' | 'processing' | 'completed' | 'error') => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status } : step
    ));
  };

  const processImage = useCallback(async (file: File) => {
    try {
      setState('processing');
      setProgress(0);
      
      // Initialize models if not already done
      if (!modelsInitialized) {
        toast.loading('Initializing AI models...', { id: 'init' });
        const initialized = await initializeModels();
        if (!initialized) {
          throw new Error('Failed to initialize AI models');
        }
        setModelsInitialized(true);
        toast.dismiss('init');
      }

      const originalUrl = URL.createObjectURL(file);
      setOriginalImage(originalUrl);

      // Step 1: Content Validation
      setCurrentStep('validation');
      updateStepStatus('validation', 'processing');
      setProgress(20);

      const image = await loadImage(file);
      const isContentSafe = await moderateContent(image);
      
      if (!isContentSafe) {
        updateStepStatus('validation', 'error');
        throw new Error('Image content not appropriate');
      }
      
      updateStepStatus('validation', 'completed');
      setProgress(40);

      // Step 2: People Detection
      setCurrentStep('people-detection');
      updateStepStatus('people-detection', 'processing');

      const hasPeople = await detectPeople(image);
      
      if (!hasPeople) {
        updateStepStatus('people-detection', 'error');
        throw new Error('No people detected in the image. Please upload a photo with people.');
      }
      
      updateStepStatus('people-detection', 'completed');
      setProgress(70);

      // Step 3: Background Removal
      setCurrentStep('background-removal');
      updateStepStatus('background-removal', 'processing');

      const processedBlob = await removeBackground(image);
      const processedUrl = URL.createObjectURL(processedBlob);
      
      updateStepStatus('background-removal', 'completed');
      setProgress(100);
      
      setProcessedImage(processedUrl);
      setState('completed');
      
      toast.success('Background removed successfully!', {
        description: 'Your photo is ready for download'
      });

    } catch (error) {
      console.error('Processing error:', error);
      setState('error');
      
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error('Processing failed', {
        description: errorMessage
      });
    }
  }, [modelsInitialized]);

  const handleReset = () => {
    setState('idle');
    setOriginalImage('');
    setProcessedImage('');
    setProgress(0);
    setCurrentStep('');
    setSteps(getProcessingSteps());
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            AI Photo Background Remover
          </h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Remove backgrounds from your photos instantly while keeping only the people. 
          Our AI ensures content safety and perfect results.
        </p>
      </div>

      {/* Main Content */}
      {state === 'idle' && (
        <PhotoUpload 
          onFileSelect={processImage} 
          isProcessing={false}
        />
      )}

      {state === 'processing' && (
        <div className="space-y-6">
          <PhotoUpload 
            onFileSelect={processImage} 
            isProcessing={true}
          />
          <ProcessingStatus 
            currentStep={currentStep}
            steps={steps}
            progress={progress}
          />
        </div>
      )}

      {state === 'completed' && (
        <ImagePreview
          originalImage={originalImage}
          processedImage={processedImage}
          onReset={handleReset}
        />
      )}

      {state === 'error' && (
        <Card className="p-8 text-center bg-destructive/5">
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Processing Failed</h3>
              <p className="text-muted-foreground mb-4">
                We couldn't process your image. Please try again with a different photo.
              </p>
              <button
                onClick={handleReset}
                className="text-primary hover:text-primary/80 font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <Card className="p-6 text-center bg-gradient-surface">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold mb-2">AI-Powered</h3>
          <p className="text-sm text-muted-foreground">
            Advanced AI models ensure perfect background removal while preserving people
          </p>
        </Card>

        <Card className="p-6 text-center bg-gradient-surface">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold mb-2">Content Safe</h3>
          <p className="text-sm text-muted-foreground">
            Built-in content moderation ensures appropriate images only
          </p>
        </Card>

        <Card className="p-6 text-center bg-gradient-surface">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold mb-2">Instant Results</h3>
          <p className="text-sm text-muted-foreground">
            Process your photos in seconds with professional-quality results
          </p>
        </Card>
      </div>
    </div>
  );
};