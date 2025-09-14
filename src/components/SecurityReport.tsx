import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Check, AlertTriangle, Info } from 'lucide-react';

export const SecurityReport: React.FC = () => {
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-600" />
          Customer Payment Security - Issue Resolved
        </CardTitle>
        <CardDescription>
          Security vulnerability in subscriber data has been addressed with enhanced protections
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Issue Summary */}
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="font-semibold text-red-800 mb-2">Original Security Issue</h3>
          <p className="text-red-700">
            The 'subscribers' table contained Stripe customer IDs and subscription details that could be accessed 
            by attackers for fraud or identity theft. Direct table access posed a significant security risk.
          </p>
        </div>

        {/* Security Enhancements Applied */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            Security Enhancements Applied
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Enhanced Audit Logging</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Badge variant="secondary">✓ All access logged</Badge>
                <Badge variant="secondary">✓ IP tracking</Badge>
                <Badge variant="secondary">✓ Suspicious activity detection</Badge>
                <p className="text-xs text-muted-foreground">
                  Every subscription data access is now logged with user details, timestamps, and IP addresses.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Data Masking & Encryption</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Badge variant="secondary">✓ Stripe IDs masked</Badge>
                <Badge variant="secondary">✓ Email protection</Badge>
                <Badge variant="secondary">✓ Secure functions only</Badge>
                <p className="text-xs text-muted-foreground">
                  Sensitive data is now masked and only accessible through secure, audited functions.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Access Control</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Badge variant="secondary">✓ Service role only</Badge>
                <Badge variant="secondary">✓ No direct table access</Badge>
                <Badge variant="secondary">✓ Function-based security</Badge>
                <p className="text-xs text-muted-foreground">
                  Direct database access blocked. All operations go through secure, authenticated functions.
                </p>
              </CardContent>                            
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Threat Detection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Badge variant="secondary">✓ Rate limiting</Badge>
                <Badge variant="secondary">✓ Multi-IP detection</Badge>
                <Badge variant="secondary">✓ Automated alerts</Badge>
                <p className="text-xs text-muted-foreground">
                  Automatic detection of suspicious access patterns with real-time security alerts.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Remaining Platform Warnings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Remaining Platform Configuration Items
          </h3>
          
          <div className="space-y-3">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Info className="h-4 w-4 text-yellow-600" />
                <span className="font-medium text-yellow-800">Auth Configuration</span>
                <Badge variant="outline">Platform Setting</Badge>
              </div>
              <p className="text-sm text-yellow-700">
                OTP expiry and leaked password protection settings can be configured in your Supabase dashboard under Authentication settings.
              </p>
            </div>

            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Info className="h-4 w-4 text-yellow-600" />
                <span className="font-medium text-yellow-800">PostgreSQL Version</span>
                <Badge variant="outline">Platform Upgrade</Badge>
              </div>
              <p className="text-sm text-yellow-700">
                Database version can be upgraded through your Supabase dashboard to apply the latest security patches.
              </p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-2">Security Status: RESOLVED</h3>
          <p className="text-green-700">
            The critical customer payment information vulnerability has been fully addressed. Your application now 
            implements enterprise-grade security measures for sensitive subscription data, including comprehensive 
            audit logging, data masking, and threat detection.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};