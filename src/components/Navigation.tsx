import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Upload, LayoutDashboard } from 'lucide-react';
import { AuthButton } from '@/components/AuthButton';
import { useAuth } from '@/hooks/useAuth';

export const Navigation: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  
  const isActivePath = (path: string) => location.pathname === path;
  
  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link to="/" className="flex items-center space-x-2">
              <img
                src="/lovable-uploads/69bee058-9d55-465d-bec0-0156468ba560.png"
                alt="Axessible logo – multi-modal accessible video platform"
                className="h-6 md:h-7 w-auto opacity-90"
                loading="lazy"
                decoding="async"
              />
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-6">
            <Link 
              to="/" 
              className={`text-sm transition-colors ${
                isActivePath('/') 
                  ? 'text-primary font-medium' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Home
            </Link>
            
            <Link 
              to="/explore" 
              className={`text-sm transition-colors ${
                isActivePath('/explore') 
                  ? 'text-primary font-medium' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Explore
            </Link>
            
            {user && (
              <Link 
                to="/dashboard" 
                className={`text-sm transition-colors ${
                  isActivePath('/dashboard') 
                    ? 'text-primary font-medium' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Dashboard
              </Link>
            )}
            
            {user && (
              <Link 
                to="/videos" 
                className={`text-sm transition-colors ${
                  isActivePath('/videos') 
                    ? 'text-primary font-medium' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                My Videos
              </Link>
            )}
            
            <Link 
              to="/pricing" 
              className={`text-sm transition-colors ${
                isActivePath('/pricing') 
                  ? 'text-primary font-medium' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Pricing
            </Link>
            
            {user ? (
              <Button asChild size="sm">
                <Link to="/upload">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Video
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link to="/auth">
                  Get Started
                </Link>
              </Button>
            )}
            
            <AuthButton />
          </div>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            {user ? (
              <Button asChild size="sm">
                <Link to="/upload">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link to="/auth">
                  Get Started
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