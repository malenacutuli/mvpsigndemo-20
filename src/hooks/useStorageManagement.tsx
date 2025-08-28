import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface StorageUsage {
  totalUsed: number; // in bytes
  totalLimit: number; // in bytes
  usagePercentage: number;
  isNearLimit: boolean; // 80% or more
  isOverLimit: boolean;
}

export const useStorageManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [storageUsage, setStorageUsage] = useState<StorageUsage>({
    totalUsed: 0,
    totalLimit: 107374182400, // 100GB in bytes for starter plan
    usagePercentage: 0,
    isNearLimit: false,
    isOverLimit: false
  });
  const [loading, setLoading] = useState(false);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const calculateStorageUsage = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get user's videos and calculate total file sizes
      const { data: videos, error } = await supabase
        .from('videos')
        .select('metadata')
        .eq('user_id', user.id);

      if (error) throw error;

      let totalUsed = 0;
      videos?.forEach(video => {
        if (video.metadata && typeof video.metadata === 'object' && video.metadata !== null) {
          const metadata = video.metadata as { [key: string]: any };
          if (metadata.file_size && typeof metadata.file_size === 'number') {
            totalUsed += metadata.file_size;
          }
        }
      });

      const usagePercentage = (totalUsed / storageUsage.totalLimit) * 100;
      const isNearLimit = usagePercentage >= 80;
      const isOverLimit = usagePercentage >= 100;

      setStorageUsage({
        totalUsed,
        totalLimit: storageUsage.totalLimit,
        usagePercentage,
        isNearLimit,
        isOverLimit
      });

      // Show upgrade notifications
      if (isOverLimit) {
        toast({
          title: "Storage Limit Exceeded",
          description: "Upgrade to Standard plan for 2TB storage to continue uploading videos.",
          variant: "destructive",
        });
      } else if (isNearLimit) {
        toast({
          title: "Storage Nearly Full", 
          description: `You've used ${formatBytes(totalUsed)} of your 100GB limit. Consider upgrading soon.`,
        });
      }

    } catch (error) {
      console.error('Error calculating storage usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkStorageBeforeUpload = (fileSize: number): boolean => {
    const wouldExceedLimit = (storageUsage.totalUsed + fileSize) > storageUsage.totalLimit;
    
    if (wouldExceedLimit) {
      toast({
        title: "Upload Failed - Storage Limit",
        description: `This file would exceed your 100GB storage limit. Upgrade to Standard for 2TB storage.`,
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  useEffect(() => {
    if (user) {
      calculateStorageUsage();
    }
  }, [user]);

  return {
    storageUsage,
    loading,
    formatBytes,
    calculateStorageUsage,
    checkStorageBeforeUpload
  };
};