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
  tier: string;
  filesCount: number;
}

export const useStorageManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [storageUsage, setStorageUsage] = useState<StorageUsage>({
    totalUsed: 0,
    totalLimit: 5368709120, // 5GB in bytes for improved upload capacity 
    usagePercentage: 0,
    isNearLimit: false,
    isOverLimit: false,
    tier: 'free',
    filesCount: 0
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
      // SECURITY FIX: Call without user_id parameter - function uses auth.uid() internally
      const { data: usage, error } = await supabase.rpc('get_user_storage_usage');

      if (error) throw error;

      if (!usage || usage.length === 0) {
        console.warn('No storage usage data returned');
        setLoading(false);
        return;
      }

      const storageData = usage[0];
      
      setStorageUsage({
        totalUsed: storageData.storage_used_bytes,
        totalLimit: storageData.storage_limit_bytes,
        usagePercentage: storageData.usage_percentage,
        isNearLimit: storageData.is_near_limit,
        isOverLimit: storageData.is_over_limit,
        tier: storageData.tier,
        filesCount: storageData.files_count
      });

      // Show warnings based on server-calculated limits
      if (storageData.is_over_limit) {
        toast({
          title: "Storage Limit Exceeded",
          description: `You've exceeded your ${storageData.tier} plan storage limit. Upgrade to continue uploading.`,
          variant: "destructive",
        });
      } else if (storageData.is_near_limit) {
        toast({
          title: "Storage Nearly Full",
          description: `You've used ${storageData.usage_percentage.toFixed(0)}% of your ${storageData.tier} plan storage.`,
        });
      }
    } catch (error) {
      console.error('Error calculating storage usage:', error);
      toast({
        title: "Error",
        description: "Failed to load storage usage",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const checkStorageBeforeUpload = async (fileSize: number): Promise<boolean> => {
    if (!user) {
      return false;
    }

    try {
      // PHASE 2: Use server-side validation before upload
      const { data, error } = await supabase.functions.invoke('validate-upload', {
        body: {
          fileSize,
          userId: user.id
        }
      });

      if (error) {
        console.error('Upload validation error:', error);
        toast({
          title: "Validation Error",
          description: "Failed to validate upload. Please try again.",
          variant: "destructive",
        });
        return false;
      }

      if (!data.allowed) {
        toast({
          title: "Upload Not Allowed",
          description: data.message || `Storage limit exceeded for ${data.tier} plan`,
          variant: "destructive",
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Upload validation error:', error);
      return false;
    }
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