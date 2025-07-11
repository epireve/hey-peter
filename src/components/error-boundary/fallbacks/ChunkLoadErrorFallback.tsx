'use client';

import { logger } from '@/lib/services';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, HardDrive, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import type { ErrorFallbackProps } from '../types';

export const ChunkLoadErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  errorId
}) => {
  const [isReloading, setIsReloading] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isReloading) {
      const interval = setInterval(() => {
        setProgress(prev => Math.min(prev + 20, 80));
      }, 200);
      
      // Reload after a short delay to show progress
      const timeout = setTimeout(() => {
        window.location.reload();
      }, 1500);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [isReloading]);

  const handleReload = () => {
    setIsReloading(true);
  };

  const handleClearCacheAndReload = async () => {
    setClearingCache(true);
    
    try {
      // Clear service worker cache if available
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }

      // Clear browser caches if available
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Force reload without cache
      window.location.reload(true);
    } catch (err) {
      logger.error('Failed to clear cache:', err);
      // Reload anyway
      window.location.reload(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-orange-100 dark:bg-orange-900/20">
              <HardDrive className="h-12 w-12 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <CardTitle className="text-xl">Application Update Required</CardTitle>
          <CardDescription>
            The application has been updated. Please reload to get the latest version.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>
              Good news! A new version of the application is available with improvements and bug fixes.
            </AlertDescription>
          </Alert>

          {errorId && (
            <div className="text-xs text-muted-foreground text-center">
              Reference: {errorId}
            </div>
          )}

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">What happened?</p>
            <p className="text-sm text-muted-foreground">
              Your browser tried to load an outdated version of the application. This usually happens after we deploy updates.
            </p>
          </div>

          {(isReloading || clearingCache) && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{clearingCache ? 'Clearing cache...' : 'Reloading application...'}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleReload} 
              disabled={isReloading || clearingCache}
              className="w-full"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isReloading ? 'animate-spin' : ''}`} />
              {isReloading ? 'Reloading...' : 'Reload Application'}
            </Button>
            
            <Button 
              onClick={handleClearCacheAndReload}
              variant="outline"
              disabled={isReloading || clearingCache}
              className="w-full"
            >
              <HardDrive className={`mr-2 h-4 w-4 ${clearingCache ? 'animate-pulse' : ''}`} />
              {clearingCache ? 'Clearing Cache...' : 'Clear Cache & Reload'}
            </Button>

            <Button onClick={resetError} variant="ghost" className="w-full">
              Try Again Without Reloading
            </Button>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            <p>Technical details: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};