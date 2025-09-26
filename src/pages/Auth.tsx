import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Mail, Lock, User, LogIn, Gift } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { Link } from 'react-router-dom';

export const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const { user, signInWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const selectedPlan = searchParams.get('plan');
  const { t } = useTranslation();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const cleanupAuthState = () => {
    // Clear all auth-related keys
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    Object.keys(sessionStorage || {}).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError(t('auth.passwordsDoNotMatch'));
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError(t('auth.passwordMinLength'));
      setLoading(false);
      return;
    }

    if (!acceptedTerms) {
      setError('You must accept the Terms and Conditions to create an account.');
      setLoading(false);
      return;
    }

    try {
      cleanupAuthState();
      
      const redirectUrl = `${window.location.origin}/`;
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (signUpError) throw signUpError;

      if (data.user && !data.user.email_confirmed_at) {
        setMessage(t('auth.checkEmailConfirmation'));
      } else if (data.user) {
        toast({
          title: t('auth.accountCreatedSuccess'),
          description: t('auth.canStartUsing')
        });
        window.location.href = '/';
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      if (error.message?.includes('User already registered')) {
        setError(t('auth.userAlreadyExists'));
      } else {
        setError(error.message || t('auth.signUpError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      cleanupAuthState();
      
      // Attempt global sign out first
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      if (data.user) {
        toast({
          title: t('auth.welcomeBack'),
          description: t('auth.signInSuccess')
        });
        window.location.href = '/';
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      if (error.message?.includes('Invalid login credentials')) {
        setError(t('auth.invalidCredentials'));
      } else if (error.message?.includes('Email not confirmed')) {
        setError(t('auth.emailNotConfirmed'));
      } else {
        setError(error.message || t('auth.signInError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError(t('auth.enterEmailToReset'));
      return;
    }

    setResetLoading(true);
    setError('');
    
    try {
      const { error: resetError } = await resetPassword(email);
      
      if (resetError) throw resetError;
      
      setMessage(t('auth.resetEmailSent'));
      setShowForgotPassword(false);
      toast({
        title: t('auth.resetEmailSentTitle'),
        description: t('auth.checkEmailForReset')
      });
    } catch (error: any) {
      console.error('Password reset error:', error);
      setError(error.message || t('auth.resetPasswordError'));
    } finally {
      setResetLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      cleanupAuthState();
      await signInWithGoogle();
    } catch (error: any) {
      console.error('Google sign in error:', error);
      if (error.message?.includes('provider is not enabled')) {
        setError(t('auth.googleNotConfigured'));
      } else {
        setError(error.message || t('auth.googleSignInFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-background/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {t('auth.welcomeToAxessible')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('auth.signInDescription')}
          </CardDescription>
          {selectedPlan === 'starter' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
              <div className="flex items-center gap-2 text-green-800">
                <Gift className="w-4 h-4" />
                <span className="text-sm font-medium">{t('auth.freeStarterPlan')}</span>
              </div>
              <p className="text-xs text-green-700 mt-1">
                {t('auth.starterPlanDescription')}
              </p>
            </div>
          )}
          {selectedPlan && selectedPlan !== 'starter' && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mt-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  {selectedPlan} Plan
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('auth.createAccountForPlan', { plan: selectedPlan })}
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">{t('auth.signIn')}</TabsTrigger>
              <TabsTrigger value="signup">{t('auth.signUp')}</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4">
              {!showForgotPassword ? (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">{t('auth.email')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder={t('auth.enterEmail')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">{t('auth.password')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={t('auth.enterPassword')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pl-10 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="text-xs"
                      onClick={() => setShowForgotPassword(true)}
                    >
                      {t('auth.forgotPassword')}
                    </Button>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    <LogIn className="w-4 h-4 mr-2" />
                    {loading ? t('auth.signingIn') : t('auth.signIn')}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">{t('auth.email')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder={t('auth.enterEmailToReset')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {t('auth.resetPasswordDescription')}
                  </p>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setError('');
                      }}
                    >
                      {t('auth.backToSignIn')}
                    </Button>
                    <Button type="submit" className="flex-1" disabled={resetLoading}>
                      {resetLoading ? t('auth.sendingReset') : t('auth.sendResetEmail')}
                    </Button>
                  </div>
                </form>
              )}
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t('auth.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder={t('auth.enterEmail')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t('auth.password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('auth.createPassword')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pl-10 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">{t('auth.confirmPassword')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('auth.confirmPasswordPlaceholder')}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="terms" 
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                  />
                  <Label 
                    htmlFor="terms" 
                    className="text-sm font-light leading-relaxed cursor-pointer"
                  >
                    I agree to the{' '}
                    <Link 
                      to="/terms" 
                      className="text-primary hover:underline font-medium"
                      target="_blank"
                    >
                      Terms and Conditions
                    </Link>
                  </Label>
                </div>

                <Button type="submit" className="w-full" disabled={loading || !acceptedTerms}>
                  <User className="w-4 h-4 mr-2" />
                  {loading ? t('auth.creatingAccount') : t('auth.createAccount')}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Temporarily disabled - Google OAuth not configured */}
          {false && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    {t('auth.orContinueWith')}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleGoogleSignIn}
                variant="outline"
                className="w-full"
                disabled={loading}
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {t('auth.continueWithGoogle')}
              </Button>
            </>
          )}

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {message && (
            <Alert className="mt-4">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};