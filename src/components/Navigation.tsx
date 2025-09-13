import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Upload, Menu } from 'lucide-react';
import { AuthButton } from '@/components/AuthButton';
import { useAuth } from '@/hooks/useAuth';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

export const Navigation: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  
  const isActivePath = (path: string) => location.pathname === path;
  
  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center mr-4">
            <Link to="/" className="flex items-center space-x-3">
              <img
                src="/lovable-uploads/69bee058-9d55-465d-bec0-0156468ba560.png"
                alt="Axessible"
                className="h-8 sm:h-10 w-auto object-contain flex-shrink-0"
                loading="lazy"
                decoding="async"
              />
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-10">
            <Link 
              to="/explore" 
              className={`text-base font-light transition-colors hover:text-primary ${
                isActivePath('/explore') 
                  ? 'text-primary font-medium' 
                  : 'text-slate-600'
              }`}
            >
              {t('nav.explore')}
            </Link>
            
            <Link 
              to="/enterprise" 
              className={`text-base font-light transition-colors hover:text-primary ${
                isActivePath('/enterprise') 
                  ? 'text-primary font-medium' 
                  : 'text-slate-600'
              }`}
            >
              {t('nav.enterprise')}
            </Link>
            
            <Link 
              to="/pricing" 
              className={`text-base font-light transition-colors hover:text-primary ${
                isActivePath('/pricing') 
                  ? 'text-primary font-medium' 
                  : 'text-slate-600'
              }`}
            >
              {t('nav.pricing')}
            </Link>
            
            {user && (
              <>
                <Link 
                  to="/dashboard" 
                  className={`text-base font-light transition-colors hover:text-primary ${
                    isActivePath('/dashboard') 
                      ? 'text-primary font-medium' 
                      : 'text-slate-600'
                  }`}
                >
                  {t('nav.dashboard')}
                </Link>
                
                <Link 
                  to="/videos" 
                  className={`text-base font-light transition-colors hover:text-primary ${
                    isActivePath('/videos') 
                      ? 'text-primary font-medium' 
                      : 'text-slate-600'
                  }`}
                >
                  {t('nav.myVideos')}
                </Link>
              </>
            )}
          </div>
          
          {/* CTA and Auth */}
          <div className="hidden md:flex items-center space-x-4">
            {!user && (
              <Button asChild variant="default" size="lg" className="font-semibold px-8 py-3 rounded-full">
                <Link to="/auth">
                  {t('nav.getStarted')}
                </Link>
              </Button>
            )}
            
            <LanguageSwitcher />
            <AuthButton />
          </div>
          
          {/* Mobile menu */}
          <div className="md:hidden flex items-center space-x-2">
            {!user && (
              <Button asChild variant="default" size="sm" className="font-medium rounded-full px-3 py-1 text-xs">
                <Link to="/auth">
                  {t('nav.start')}
                </Link>
              </Button>
            )}
            <LanguageSwitcher />
            <AuthButton />
          </div>
        </div>
      </div>
    </nav>
  );
};