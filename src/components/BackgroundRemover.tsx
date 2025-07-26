import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { PhotoUpload } from './PhotoUpload';
import { JobsList } from './JobsList';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Sparkles, Coins, Crown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AuthModal } from './AuthModal';

type ProcessingState = 'idle' | 'processing' | 'completed' | 'error';

export const BackgroundRemover = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [isUploading, setIsUploading] = useState(false);

  const processImage = useCallback(async (file: File) => {
    if (!user || !profile) {
      toast.error('Please sign in to process images');
      return;
    }

    if (profile.credits <= 0) {
      toast.error('No credits remaining', {
        description: 'You need credits to process images.',
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // Create a new job record
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert({
          user_id: user.id,
          status: 'pending'
        })
        .select()
        .single();

      if (jobError || !job) {
        throw new Error('Failed to create job record');
      }

      // Upload file to storage
      const fileName = `${user.id}/${job.id}`;
      const { error: uploadError } = await supabase
        .storage
        .from('uploads')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Call the edge function to process the image
      const { data: processResult, error: processError } = await supabase
        .functions
        .invoke('isolate-bg', {
          body: { job_id: job.id }
        });

      if (processError) {
        throw new Error(`Processing failed: ${processError.message}`);
      }

      // Decrement user credits
      const { error: creditError } = await supabase
        .from('users')
        .update({ 
          credits: profile.credits - 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (creditError) {
        console.error('Failed to update credits:', creditError);
      } else {
        await refreshProfile();
      }

      toast.success('Image uploaded successfully!', {
        description: 'Your image is being processed. Check the jobs list below for updates.',
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    } finally {
      setIsUploading(false);
    }
  }, [user, profile, refreshProfile]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            People Isolator
          </h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Professional AI-powered background removal that keeps only the people in your photos. 
          Safe, fast, and perfect results every time.
        </p>
      </div>

      {/* Auth Status & Credits */}
      {!user ? (
        <Card className="p-6 text-center bg-gradient-surface">
          <div className="space-y-4">
            <Crown className="w-12 h-12 mx-auto text-primary" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Welcome to People Isolator</h3>
              <p className="text-muted-foreground mb-4">
                Sign up to get 5 free image processing credits and start removing backgrounds instantly!
              </p>
              <AuthModal>
                <Button size="lg" className="gap-2">
                  <Coins className="w-4 h-4" />
                  Get 5 Free Credits
                </Button>
              </AuthModal>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Upload & Process</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Coins className="w-4 h-4" />
                  <span>{profile?.credits || 0} credits remaining</span>
                </div>
              </div>
              
              {profile && profile.credits > 0 ? (
                <PhotoUpload 
                  onFileSelect={processImage} 
                  isProcessing={isUploading}
                />
              ) : (
                <div className="text-center p-8 border-2 border-dashed border-border rounded-lg">
                  <Coins className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">No Credits Remaining</h3>
                  <p className="text-muted-foreground mb-4">
                    You've used all your credits. Purchase more to continue processing images.
                  </p>
                  <Button variant="default">Buy More Credits</Button>
                </div>
              )}
            </Card>
            
            {/* Features */}
            <div className="grid grid-cols-1 gap-4">
              <Card className="p-4 bg-gradient-surface">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">AI-Powered</h4>
                    <p className="text-sm text-muted-foreground">
                      Advanced models for perfect results
                    </p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4 bg-gradient-surface">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Content Safe</h4>
                    <p className="text-sm text-muted-foreground">
                      Built-in content moderation
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Jobs Section */}
          <div>
            <JobsList />
          </div>
        </div>
      )}
    </div>
  );
};