import { CheckCircle, AlertTriangle, Users, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

interface ProcessingStatusProps {
  currentStep: string;
  steps: ProcessingStep[];
  progress: number;
}

export const ProcessingStatus = ({ currentStep, steps, progress }: ProcessingStatusProps) => {
  return (
    <Card className="p-6 bg-gradient-surface">
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Processing Your Photo</h3>
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-muted-foreground mt-2">{progress}% complete</p>
        </div>

        <div className="space-y-4">
          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = step.id === currentStep;
            const isCompleted = step.status === 'completed';
            const isError = step.status === 'error';

            return (
              <div
                key={step.id}
                className={`
                  flex items-center gap-4 p-4 rounded-lg transition-smooth
                  ${isActive ? 'bg-accent border border-primary/30' : ''}
                  ${isCompleted ? 'bg-primary/5' : ''}
                  ${isError ? 'bg-destructive/5' : ''}
                `}
              >
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-smooth
                    ${isCompleted ? 'bg-primary text-primary-foreground' : ''}
                    ${isActive ? 'bg-primary/20 text-primary' : ''}
                    ${isError ? 'bg-destructive/20 text-destructive' : ''}
                    ${step.status === 'pending' ? 'bg-muted text-muted-foreground' : ''}
                  `}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : isError ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : isActive ? (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>

                <div className="flex-1">
                  <h4 className="font-medium">{step.label}</h4>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

export const getProcessingSteps = (): ProcessingStep[] => [
  {
    id: 'validation',
    label: 'Content Validation',
    status: 'pending',
    icon: AlertTriangle,
    description: 'Checking image content and safety'
  },
  {
    id: 'people-detection',
    label: 'People Detection',
    status: 'pending',
    icon: Users,
    description: 'Identifying people in the image'
  },
  {
    id: 'background-removal',
    label: 'Background Removal',
    status: 'pending',
    icon: Zap,
    description: 'Removing background while keeping people'
  }
];