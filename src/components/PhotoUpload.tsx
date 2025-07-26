import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface PhotoUploadProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

export const PhotoUpload = ({ onFileSelect, isProcessing }: PhotoUploadProps) => {
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('File too large', {
          description: 'Please select an image smaller than 10MB'
        });
        return;
      }
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    multiple: false,
    disabled: isProcessing,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
  });

  return (
    <Card className="relative overflow-hidden">
      <div
        {...getRootProps()}
        className={`
          min-h-[400px] p-12 text-center cursor-pointer transition-smooth
          border-2 border-dashed rounded-lg
          ${isDragActive || dragActive 
            ? 'border-primary bg-accent/70 scale-[1.02]' 
            : 'border-border bg-gradient-surface hover:border-primary/50 hover:bg-accent/30'
          }
          ${isProcessing ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              {isProcessing ? (
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-8 h-8 text-primary" />
              )}
            </div>
            {!isProcessing && (
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-accent border-2 border-background flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-accent-foreground" />
              </div>
            )}
          </div>

          <div className="space-y-2 max-w-md">
            <h3 className="text-xl font-semibold text-foreground">
              {isProcessing ? 'Processing your photo...' : 'Upload your photo'}
            </h3>
            <p className="text-muted-foreground">
              {isProcessing 
                ? 'Our AI is removing the background and keeping only people'
                : 'Drag and drop your image here, or click to browse'
              }
            </p>
          </div>

          {!isProcessing && (
            <>
              <Button variant="gradient" size="lg" className="gap-2">
                <Upload className="w-4 h-4" />
                Choose Photo
              </Button>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="w-4 h-4" />
                <span>Supports JPG, PNG, WebP up to 10MB</span>
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};