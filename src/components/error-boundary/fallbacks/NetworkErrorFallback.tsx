'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, Globe, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import type { ErrorFallbackProps } from '../types';

export const NetworkErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  retry,
  errorId,
  retryCount = 0,
  maxRetries = 3,
  isRecovering = false
}) => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [retryProgress, setRetryProgress] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isRecovering && retry) {
      const interval = setInterval(() => {
        setRetryProgress(prev => Math.min(prev + 10, 100));
      }, 300);

      return () => clearInterval(interval);
    } else {
      setRetryProgress(0);
    }
  }, [isRecovering, retry]);

  const checkConnection = async () => {
    setCheckingConnection(true);
    try {
      // Try to fetch a small resource to check connectivity
      const response = await fetch('/api/health', { method: 'HEAD' });
      if (response.ok) {
        setIsOnline(true);
        if (retry) retry();
      }
    } catch {
      setIsOnline(false);
    } finally {
      setCheckingConnection(false);
    }
  };

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-destructive/10">
              <WifiOff className="h-12 w-12 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-xl">Network Error</CardTitle>
          <CardDescription>
            Unable to connect to our servers. Please check your internet connection.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert variant={isOnline ? 'default' : 'destructive'}>
            <AlertDescription className="flex items-center">
              {isOnline ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                  Your device is online
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 mr-2" />
                  Your device appears to be offline
                </>
              )}
            </AlertDescription>
          </Alert>

          {errorId && (
            <div className="text-xs text-muted-foreground text-center">
              Error Reference: {errorId}
            </div>
          )}

          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-medium">Troubleshooting steps:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Check your internet connection</li>
              <li>Try refreshing the page</li>
              <li>Check if other websites are working</li>
              <li>Disable VPN or proxy if you're using one</li>
              <li>Clear your browser cache</li>
            </ul>
          </div>

          {isRecovering && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Retrying connection...</span>
                <span>{retryProgress}%</span>
              </div>
              <Progress value={retryProgress} className="h-2" />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button 
              onClick={checkConnection} 
              disabled={checkingConnection || isRecovering}
              className="w-full"
            >
              {checkingConnection ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Checking Connection...
                </>
              ) : (
                <>
                  <Globe className="mr-2 h-4 w-4" />
                  Check Connection
                </>
              )}
            </Button>

            {retry && retryCount < maxRetries && (
              <Button 
                onClick={retry} 
                variant="outline"
                disabled={isRecovering || !isOnline}
                className="w-full"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRecovering ? 'animate-spin' : ''}`} />
                {isRecovering ? 'Retrying...' : `Retry (${retryCount}/${maxRetries})`}
              </Button>
            )}
            
            <Button onClick={resetError} variant="outline" className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload Page
            </Button>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            <p>Error details: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};