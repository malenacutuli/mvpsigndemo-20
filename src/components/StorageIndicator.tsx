import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, HardDrive } from 'lucide-react';
import { useStorageManagement } from '@/hooks/useStorageManagement';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const StorageIndicator: React.FC = () => {
  const { storageUsage, loading, formatBytes } = useStorageManagement();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded mb-2"></div>
            <div className="h-2 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = () => {
    if (storageUsage.isOverLimit) return 'text-red-600';
    if (storageUsage.isNearLimit) return 'text-amber-600';
    return 'text-green-600';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <HardDrive className="w-5 h-5" />
          {t('dashboard.storage.title')}
          {storageUsage.isOverLimit && (
            <Badge variant="destructive" className="ml-2">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {t('dashboard.storage.overLimit')}
            </Badge>
          )}
          {storageUsage.isNearLimit && !storageUsage.isOverLimit && (
            <Badge variant="secondary" className="ml-2">
              <TrendingUp className="w-3 h-3 mr-1" />
              {t('dashboard.storage.nearlyFull')}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className={getStatusColor()}>
              {t('dashboard.storage.usedOfTotal', { used: formatBytes(storageUsage.totalUsed), total: '100GB' })}
            </span>
            <span className="text-muted-foreground">
              {storageUsage.usagePercentage.toFixed(1)}%
            </span>
          </div>
          
          <Progress 
            value={Math.min(storageUsage.usagePercentage, 100)} 
            className="h-2"
          />
        </div>

        {storageUsage.isOverLimit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="text-red-800 text-sm font-medium mb-2">
              {t('dashboard.storage.overLimitTitle')}
            </div>
            <p className="text-red-700 text-xs mb-3">
              {t('dashboard.storage.overLimitDesc')}
            </p>
            <Button 
              size="sm" 
              onClick={() => navigate('/pricing')}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('dashboard.storage.upgradeStandard')}
            </Button>
          </div>
        )}

        {storageUsage.isNearLimit && !storageUsage.isOverLimit && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="text-amber-800 text-sm font-medium mb-2">
              {t('dashboard.storage.nearlyFullTitle')}
            </div>
            <p className="text-amber-700 text-xs mb-3">
              {t('dashboard.storage.nearlyFullDesc')}
            </p>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => navigate('/pricing')}
              className="border-amber-300 text-amber-700 hover:bg-amber-100"
            >
              {t('dashboard.storage.viewUpgradeOptions')}
            </Button>
          </div>
        )}

        {!storageUsage.isNearLimit && !storageUsage.isOverLimit && (
          <div className="text-xs text-muted-foreground">
            {t('dashboard.storage.onStarter')}
            <Button 
              variant="link" 
              size="sm" 
              className="p-0 h-auto text-xs ml-1"
              onClick={() => navigate('/pricing')}
            >
              {t('dashboard.storage.viewOtherPlans')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};