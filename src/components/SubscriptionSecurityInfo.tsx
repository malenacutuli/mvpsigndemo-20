import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Eye, Database } from 'lucide-react';

export const SubscriptionSecurityInfo: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            <CardTitle className="text-green-800">Security Improvements Applied</CardTitle>
          </div>
          <CardDescription className="text-green-700">
            Your subscription system has been secured with multiple layers of protection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Database className="h-4 w-4" />
                Database Security
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Blocked direct access to subscribers table</li>
                <li>• Function-based access control implemented</li>
                <li>• Sensitive data masking for Stripe customer IDs</li>
                <li>• Data minimization principles applied</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Audit & Monitoring
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Complete access audit trail</li>
                <li>• Suspicious activity detection</li>
                <li>• Field-level access tracking</li>
                <li>• IP address and user agent logging</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2">Security Features</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                Row Level Security
              </Badge>
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                Function-based Access
              </Badge>
              <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                Audit Logging
              </Badge>
              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                Data Masking
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Important Security Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-blue-700">
          <div>
            <h5 className="font-medium">For Developers:</h5>
            <p className="text-sm">
              Always use the secure functions (<code>get_user_subscription_info</code>) instead of 
              direct table access. This ensures proper audit logging and data protection.
            </p>
          </div>
          <div>
            <h5 className="font-medium">Access Patterns:</h5>
            <p className="text-sm">
              The system monitors for unusual access patterns (&gt;10 requests/minute) and logs 
              warnings for potential security threats.
            </p>
          </div>
          <div>
            <h5 className="font-medium">Data Protection:</h5>
            <p className="text-sm">
              Stripe customer IDs are masked in admin views and never exposed to client-side code. 
              Only subscription status and features are accessible to users.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};