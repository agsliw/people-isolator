import { useState } from 'react';
import { Download, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface ImagePreviewProps {
  originalImage: string;
  processedImage: string;
  onReset: () => void;
}

export const ImagePreview = ({ originalImage, processedImage, onReset }: ImagePreviewProps) => {
  const [showComparison, setShowComparison] = useState(false);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = processedImage;
    link.download = `background-removed-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Image downloaded successfully!');
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden bg-gradient-surface">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Your Photo</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowComparison(!showComparison)}
              className="gap-2"
            >
              {showComparison ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showComparison ? 'Hide' : 'Show'} Original
            </Button>
          </div>

          <div className="relative">
            {showComparison ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Original</p>
                  <div className="relative rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={originalImage}
                      alt="Original"
                      className="w-full h-auto max-h-[400px] object-contain"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Background Removed</p>
                  <div className="relative rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                    <div
                      className="absolute inset-0 opacity-50"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3e%3cg fill='none' fill-rule='evenodd'%3e%3cg fill='%239C92AC' fill-opacity='0.1'%3e%3cpath d='m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3e%3c/g%3e%3c/g%3e%3c/svg%3e")`,
                      }}
                    />
                    <img
                      src={processedImage}
                      alt="Processed"
                      className="relative w-full h-auto max-h-[400px] object-contain"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                <div
                  className="absolute inset-0 opacity-50"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3e%3cg fill='none' fill-rule='evenodd'%3e%3cg fill='%239C92AC' fill-opacity='0.1'%3e%3cpath d='m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3e%3c/g%3e%3c/g%3e%3c/svg%3e")`,
                  }}
                />
                <img
                  src={processedImage}
                  alt="Background removed"
                  className="relative w-full h-auto max-h-[600px] object-contain mx-auto"
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          onClick={handleDownload}
          variant="gradient"
          size="lg"
          className="flex-1 gap-2"
        >
          <Download className="w-4 h-4" />
          Download Image
        </Button>
        
        <Button
          onClick={onReset}
          variant="outline"
          size="lg"
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Process Another
        </Button>
      </div>
    </div>
  );
};