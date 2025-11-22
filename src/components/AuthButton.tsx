import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { LogIn, LogOut, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const AuthButton: React.FC = () => {
  const { user, signInWithGoogle, signOut, loading } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const { t } = useTranslation();
  const { isDemo, getPath } = useTheme();

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <User className="w-4 h-4 mr-2" />
        {t('common.loading')}
      </Button>
    );
  }

  if (!user) {
    return (
      <Button asChild size="sm">
        <Link to={isDemo ? getPath('/auth') : '/auth'}>
          <LogIn className="w-4 h-4 mr-2" />
          {t('auth.signIn')}
        </Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <User className="w-4 h-4 mr-2" />
          {user.email}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={signOut}>
          <LogOut className="w-4 h-4 mr-2" />
          {t('auth.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};