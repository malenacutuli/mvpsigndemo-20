import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Upload, Menu } from 'lucide-react';
import { AuthButton } from '@/components/AuthButton';
import { useAuth } from '@/hooks/useAuth';

export const Navigation: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  
  const isActivePath = (path: string) => location.pathname === path;
  
  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3">
              <img
                src="/lovable-uploads/69bee058-9d55-465d-bec0-0156468ba560.png"
                alt="Axessible"
                className="h-8 w-auto"
                loading="lazy"
                decoding="async"
              />
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-10">
            <Link 
              to="/explore" 
              className={`text-base font-medium transition-colors hover:text-primary ${
                isActivePath('/explore') 
                  ? 'text-primary font-semibold' 
                  : 'text-muted-foreground'
              }`}
            >
              Explore
            </Link>
            
            <Link 
              to="/enterprise" 
              className={`text-base font-medium transition-colors hover:text-primary ${
                isActivePath('/enterprise') 
                  ? 'text-primary font-semibold' 
                  : 'text-muted-foreground'
              }`}
            >
              Enterprise
            </Link>
            
            <Link 
              to="/pricing" 
              className={`text-base font-medium transition-colors hover:text-primary ${
                isActivePath('/pricing') 
                  ? 'text-primary font-semibold' 
                  : 'text-muted-foreground'
              }`}
            >
              Pricing
            </Link>
            
            {user && (
              <>
                <Link 
                  to="/dashboard" 
                  className={`text-base font-medium transition-colors hover:text-primary ${
                    isActivePath('/dashboard') 
                      ? 'text-primary font-semibold' 
                      : 'text-muted-foreground'
                  }`}
                >
                  Dashboard
                </Link>
                
                <Link 
                  to="/videos" 
                  className={`text-base font-medium transition-colors hover:text-primary ${
                    isActivePath('/videos') 
                      ? 'text-primary font-semibold' 
                      : 'text-muted-foreground'
                  }`}
                >
                  My Videos
                </Link>
              </>
            )}
          </div>
          
          {/* CTA and Auth */}
          <div className="hidden md:flex items-center space-x-4">
            {!user && (
              <Button asChild variant="default" size="lg" className="font-semibold px-8 py-3 rounded-full">
                <Link to="/auth">
                  Get Started
                </Link>
              </Button>
            )}
            
            <AuthButton />
          </div>
          
          {/* Mobile menu */}
          <div className="md:hidden flex items-center space-x-3">
            {!user && (
              <Button asChild variant="default" size="sm" className="font-semibold rounded-full">
                <Link to="/auth">
                  Start
                </Link>
              </Button>
            )}
            <AuthButton />
          </div>
        </div>
      </div>
    </nav>
  );
};