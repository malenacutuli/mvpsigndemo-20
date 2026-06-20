import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthButton } from '@/components/AuthButton';
import { useAuth } from '@/hooks/useAuth';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import axessplayerLogo from '@/assets/axessplayer-logo.png.asset.json';

export const Navigation: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { theme, isDemo, getPath } = useTheme();

  const isActivePath = (path: string) => {
    const fullPath = getPath(path);
    return location.pathname === fullPath || location.pathname === path;
  };

  const shouldShowLink = (linkName: string) => !theme.hideNavLinks?.includes(linkName);

  const logoSrc = isDemo ? theme.logo : axessplayerLogo.url;
  const logoAlt = isDemo ? theme.companyName : 'Axessplayer';

  return (
    <nav className={`sticky top-0 z-50 border-b border-border/20 ${isDemo ? 'bg-white' : 'bg-background/95 backdrop-blur-xl'}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center mr-4">
            <Link to={getPath('/')} className="flex items-center space-x-3">
              <img
                src={logoSrc}
                alt={logoAlt}
                className={`w-auto object-contain flex-shrink-0 drop-shadow-sm ${
                  theme.id === 'adfidence' ? 'h-20 sm:h-24' : isDemo ? 'h-14 sm:h-16' : 'h-8 sm:h-9'
                }`}
                loading="lazy"
                decoding="async"
              />
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-10">
            <Link
              to={getPath('/explore')}
              className={`text-base font-light transition-colors hover:text-primary ${isActivePath('/explore') ? 'text-primary font-medium' : 'text-slate-600'}`}
            >
              {t('nav.explore')}
            </Link>

            <Link
              to={getPath('/enterprise')}
              className={`text-base font-light transition-colors hover:text-primary ${isActivePath('/enterprise') ? 'text-primary font-medium' : 'text-slate-600'}`}
            >
              {t('nav.enterprise')}
            </Link>

            <Link
              to={getPath('/creators')}
              className={`text-base font-light transition-colors hover:text-primary ${isActivePath('/creators') ? 'text-primary font-medium' : 'text-slate-600'}`}
            >
              {t('nav.creators')}
            </Link>

            {!isDemo && (
              <Link
                to={getPath('/pricing')}
                className={`text-base font-light transition-colors hover:text-primary ${isActivePath('/pricing') ? 'text-primary font-medium' : 'text-slate-600'}`}
              >
                {t('nav.pricing')}
              </Link>
            )}

            {user && shouldShowLink('dashboard') && (
              <Link
                to={getPath('/dashboard')}
                className={`text-base font-light transition-colors hover:text-primary ${isActivePath('/dashboard') ? 'text-primary font-medium' : 'text-slate-600'}`}
              >
                {t('nav.dashboard')}
              </Link>
            )}

            {user && shouldShowLink('videos') && (
              <Link
                to={getPath('/videos')}
                className={`text-base font-light transition-colors hover:text-primary ${isActivePath('/videos') ? 'text-primary font-medium' : 'text-slate-600'}`}
              >
                {t('nav.myVideos')}
              </Link>
            )}
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <LanguageSwitcher />
            <AuthButton />
          </div>

          <div className="md:hidden flex items-center space-x-2">
            <LanguageSwitcher />
            <AuthButton />
          </div>
        </div>
      </div>
    </nav>
  );
};
