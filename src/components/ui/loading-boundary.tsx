'use client';

import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface LoadingBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  type?: 'skeleton' | 'spinner' | 'custom';
  className?: string;
}

// Different loading fallback components
const SkeletonLoader = ({ className = '' }: { className?: string }) => (
  <div className={`space-y-4 ${className}`}>
    <Skeleton className="h-8 w-full" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="p-4">
          <Skeleton className="h-6 w-full mb-2" />
          <Skeleton className="h-4 w-2/3 mb-2" />
          <Skeleton className="h-20 w-full" />
        </Card>
      ))}
    </div>
  </div>
);

const SpinnerLoader = ({ className = '' }: { className?: string }) => (
  <div className={`flex items-center justify-center min-h-[200px] ${className}`}>
    <div className="flex flex-col items-center space-y-2">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Dashboard loading skeleton
export const DashboardLoader = () => (
  <div className="space-y-6 p-6">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-4">
          <Skeleton className="h-6 w-full mb-2" />
          <Skeleton className="h-8 w-1/2" />
        </Card>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <Skeleton className="h-6 w-1/3 mb-4" />
        <Skeleton className="h-[300px] w-full" />
      </Card>
      <Card className="p-6">
        <Skeleton className="h-6 w-1/3 mb-4" />
        <Skeleton className="h-[300px] w-full" />
      </Card>
    </div>
  </div>
);

// Analytics loading skeleton
export const AnalyticsLoader = () => (
  <div className="space-y-6 p-6">
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-1/4" />
      <Skeleton className="h-10 w-32" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="p-4">
          <Skeleton className="h-5 w-2/3 mb-2" />
          <Skeleton className="h-8 w-1/2 mb-1" />
          <Skeleton className="h-4 w-1/3" />
        </Card>
      ))}
    </div>
    <Card className="p-6">
      <Skeleton className="h-6 w-1/4 mb-4" />
      <Skeleton className="h-[400px] w-full" />
    </Card>
  </div>
);

// Table loading skeleton
export const TableLoader = () => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-1/4" />
      <Skeleton className="h-10 w-32" />
    </div>
    <Card>
      <div className="p-4 border-b">
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="p-4 border-b">
          <div className="grid grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-full" />
            ))}
          </div>
        </div>
      ))}
    </Card>
  </div>
);

// Form loading skeleton
export const FormLoader = () => (
  <div className="space-y-6 max-w-2xl">
    <Skeleton className="h-8 w-1/3" />
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
    <div className="flex justify-end space-x-2">
      <Skeleton className="h-10 w-20" />
      <Skeleton className="h-10 w-20" />
    </div>
  </div>
);

// Settings loading skeleton
export const SettingsLoader = () => (
  <div className="space-y-6">
    <Skeleton className="h-8 w-1/4" />
    <div className="space-y-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-6 w-12" />
          </div>
        </Card>
      ))}
    </div>
  </div>
);

// Main LoadingBoundary component
export const LoadingBoundary: React.FC<LoadingBoundaryProps> = ({
  children,
  fallback,
  type = 'skeleton',
  className = '',
}) => {
  const getFallback = () => {
    if (fallback) return fallback;
    
    switch (type) {
      case 'spinner':
        return <SpinnerLoader className={className} />;
      case 'skeleton':
        return <SkeletonLoader className={className} />;
      default:
        return fallback || <SpinnerLoader className={className} />;
    }
  };

  return <Suspense fallback={getFallback()}>{children}</Suspense>;
};

// Higher-order component for lazy loading with boundary
export function withLoadingBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode,
  type?: 'skeleton' | 'spinner' | 'custom'
) {
  const WrappedComponent = (props: P) => (
    <LoadingBoundary fallback={fallback} type={type}>
      <Component {...props} />
    </LoadingBoundary>
  );

  WrappedComponent.displayName = `withLoadingBoundary(${
    Component.displayName || Component.name
  })`;

  return WrappedComponent;
}

export default LoadingBoundary;