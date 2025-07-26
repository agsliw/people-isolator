import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Download, Clock, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Job {
  id: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  output_url: string | null;
  created_at: string;
}

export const JobsList = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [user]);

  // Poll for status updates every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchJobs();
    }, 5000);

    return () => clearInterval(interval);
  }, [user]);

  const downloadImage = async (url: string, jobId: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `processed-image-${jobId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(downloadUrl);
      toast.success('Download started');
    } catch (error) {
      toast.error('Failed to download image');
    }
  };

  const getStatusIcon = (status: Job['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'done':
        return <CheckCircle className="w-4 h-4" />;
      case 'error':
        return <XCircle className="w-4 h-4" />;
    }
  };

  const getStatusVariant = (status: Job['status']) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'processing':
        return 'default';
      case 'done':
        return 'default';
      case 'error':
        return 'destructive';
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading your jobs...</span>
        </div>
      </Card>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">No jobs yet. Upload an image to get started!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your Processing Jobs</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchJobs}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>
      
      <div className="space-y-3">
        {jobs.map((job) => (
          <Card key={job.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant={getStatusVariant(job.status)} className="gap-1">
                  {getStatusIcon(job.status)}
                  {job.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                </span>
              </div>
              
              {job.status === 'done' && job.output_url && (
                <Button
                  size="sm"
                  onClick={() => downloadImage(job.output_url!, job.id)}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              )}
            </div>
            
            {job.output_url && (
              <div className="mt-3">
                <img
                  src={job.output_url}
                  alt="Processed result"
                  className="max-w-32 h-20 object-cover rounded border"
                />
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};