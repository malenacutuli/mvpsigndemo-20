import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  Trash2, 
  Calendar, 
  FileVideo, 
  Clock,
  FileText,
  Volume2,
  Hand,
  AlertCircle
} from 'lucide-react';
import { VideoExport, ExportOptions } from '@/types/export';
import { ExportOrchestrator } from '@/lib/exportOrchestrator';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface VideoExportsPanelProps {
  videoId: string;
  userId: string;
}

export function VideoExportsPanel({ videoId, userId }: VideoExportsPanelProps) {
  const [exports, setExports] = useState<VideoExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const orchestrator = new ExportOrchestrator();

  useEffect(() => {
    loadExports();
  }, [videoId, userId]);

  const loadExports = async () => {
    try {
      setLoading(true);
      const exportsList = await orchestrator.listExports(userId, videoId);
      setExports(exportsList);
    } catch (error) {
      console.error('Failed to load exports:', error);
      toast({
        title: 'Error',
        description: 'Failed to load video exports',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (exportItem: VideoExport) => {
    try {
      const downloadUrl = await orchestrator.getDownloadUrl(exportItem.storage_path);
      window.open(downloadUrl, '_blank');
    } catch (error) {
      console.error('Failed to get download URL:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate download link',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (exportItem: VideoExport) => {
    if (!confirm('Are you sure you want to delete this export?')) {
      return;
    }

    try {
      setDeletingId(exportItem.id);
      await orchestrator.deleteExport(exportItem.id, userId);
      setExports(prev => prev.filter(exp => exp.id !== exportItem.id));
      toast({
        title: 'Success',
        description: 'Export deleted successfully',
      });
    } catch (error) {
      console.error('Failed to delete export:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete export',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: VideoExport['status']) => {
    const variants = {
      processing: { variant: 'secondary' as const, color: 'text-blue-600' },
      completed: { variant: 'default' as const, color: 'text-green-600' },
      failed: { variant: 'destructive' as const, color: 'text-red-600' },
    };

    const config = variants[status];
    return (
      <Badge variant={config.variant} className={config.color}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const renderExportFeatures = (options: ExportOptions) => {
    const features = [];
    
    if (options.captions) {
      features.push(
        <div key="captions" className="flex items-center gap-1 text-xs text-muted-foreground">
          <FileText className="w-3 h-3" />
          Captions
        </div>
      );
    }
    
    if (options.audioDescription) {
      features.push(
        <div key="audio" className="flex items-center gap-1 text-xs text-muted-foreground">
          <Volume2 className="w-3 h-3" />
          Audio Description
        </div>
      );
    }
    
    if (options.signLanguage) {
      features.push(
        <div key="sign" className="flex items-center gap-1 text-xs text-muted-foreground">
          <Hand className="w-3 h-3" />
          Sign Language
        </div>
      );
    }
    
    return features;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileVideo className="w-5 h-5" />
            My Finalized Videos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileVideo className="w-5 h-5" />
          My Finalized Videos
        </CardTitle>
        <CardDescription>
          Download your finalized accessible video exports
        </CardDescription>
      </CardHeader>
      <CardContent>
        {exports.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No exports yet. Use "Finalize & Export" to create your first accessible video export.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {exports.map((exportItem, index) => (
              <div key={exportItem.id}>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      {getStatusBadge(exportItem.status)}
                      <div className="flex items-center gap-4">
                        {renderExportFeatures(exportItem.export_options)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDistanceToNow(new Date(exportItem.created_at), { addSuffix: true })}
                      </div>
                      
                      {exportItem.file_size_bytes && (
                        <div className="flex items-center gap-1">
                          <FileVideo className="w-3 h-3" />
                          {formatFileSize(exportItem.file_size_bytes)}
                        </div>
                      )}
                      
                      {exportItem.duration_seconds && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {Math.floor(exportItem.duration_seconds / 60)}:{(exportItem.duration_seconds % 60).toString().padStart(2, '0')}
                        </div>
                      )}
                    </div>

                    {exportItem.error_message && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          {exportItem.error_message}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {exportItem.status === 'completed' && (
                      <Button
                        size="sm"
                        onClick={() => handleDownload(exportItem)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(exportItem)}
                      disabled={deletingId === exportItem.id}
                    >
                      {deletingId === exportItem.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                {index < exports.length - 1 && <Separator className="my-4" />}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}