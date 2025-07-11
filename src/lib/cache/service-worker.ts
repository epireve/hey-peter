/**
 * Service Worker registration and management utilities
 */

export interface ServiceWorkerManager {
  register(): Promise<ServiceWorkerRegistration | null>;
  unregister(): Promise<boolean>;
  update(): Promise<void>;
  invalidateCache(pattern: string): Promise<void>;
  warmCache(urls: string[]): Promise<void>;
  getCacheStats(): Promise<any>;
  isSupported(): boolean;
  isOnline(): boolean;
  onOfflineChange(callback: (isOnline: boolean) => void): () => void;
}

class ServiceWorkerManagerImpl implements ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private onlineCallbacks: Set<(isOnline: boolean) => void> = new Set();

  constructor() {
    // Listen for online/offline changes
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnlineChange(true));
      window.addEventListener('offline', () => this.handleOnlineChange(false));
    }
  }

  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'caches' in window
    );
  }

  isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  onOfflineChange(callback: (isOnline: boolean) => void): () => void {
    this.onlineCallbacks.add(callback);
    return () => this.onlineCallbacks.delete(callback);
  }

  private handleOnlineChange(isOnline: boolean): void {
    this.onlineCallbacks.forEach(callback => callback(isOnline));
  }

  async register(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) {
      console.warn('[SW] Service workers not supported');
      return null;
    }

    try {
      console.log('[SW] Registering service worker...');
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });

      this.registration = registration;

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        console.log('[SW] Update found');
        const newWorker = registration.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] New version available');
              this.notifyUpdate();
            }
          });
        }
      });

      // Handle service worker messages
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage);

      console.log('[SW] Service worker registered successfully');
      return registration;
    } catch (error) {
      console.error('[SW] Service worker registration failed:', error);
      return null;
    }
  }

  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const result = await this.registration.unregister();
      this.registration = null;
      console.log('[SW] Service worker unregistered');
      return result;
    } catch (error) {
      console.error('[SW] Service worker unregistration failed:', error);
      return false;
    }
  }

  async update(): Promise<void> {
    if (!this.registration) {
      throw new Error('Service worker not registered');
    }

    try {
      await this.registration.update();
      console.log('[SW] Service worker update check completed');
    } catch (error) {
      console.error('[SW] Service worker update failed:', error);
      throw error;
    }
  }

  async invalidateCache(pattern: string): Promise<void> {
    if (!this.isSupported()) return;

    try {
      await this.sendMessage({
        type: 'CACHE_INVALIDATE',
        payload: pattern
      });
      console.log('[SW] Cache invalidation requested for pattern:', pattern);
    } catch (error) {
      console.error('[SW] Cache invalidation failed:', error);
      throw error;
    }
  }

  async warmCache(urls: string[]): Promise<void> {
    if (!this.isSupported()) return;

    try {
      await this.sendMessage({
        type: 'CACHE_WARM',
        payload: urls
      });
      console.log('[SW] Cache warming requested for URLs:', urls);
    } catch (error) {
      console.error('[SW] Cache warming failed:', error);
      throw error;
    }
  }

  async getCacheStats(): Promise<any> {
    if (!this.isSupported()) {
      return { error: 'Service workers not supported' };
    }

    try {
      const stats = await this.sendMessage({
        type: 'CACHE_STATS',
        payload: null
      });
      return stats;
    } catch (error) {
      console.error('[SW] Failed to get cache stats:', error);
      return { error: error.message };
    }
  }

  private async sendMessage(message: any): Promise<any> {
    if (!navigator.serviceWorker.controller) {
      throw new Error('No active service worker');
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      messageChannel.port1.onerror = (error) => {
        reject(error);
      };

      navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
    });
  }

  private handleServiceWorkerMessage = (event: MessageEvent) => {
    const { type, payload } = event.data;
    
    switch (type) {
      case 'CACHE_UPDATED':
        console.log('[SW] Cache updated for:', payload);
        break;
      case 'SYNC_COMPLETED':
        console.log('[SW] Background sync completed:', payload);
        break;
      default:
        console.log('[SW] Unknown message from service worker:', type, payload);
    }
  };

  private notifyUpdate(): void {
    // You can implement custom update notification logic here
    // For example, show a toast notification to the user
    console.log('[SW] Application update available');
    
    // Dispatch custom event that components can listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sw-update-available'));
    }
  }
}

// Singleton instance
export const serviceWorkerManager = new ServiceWorkerManagerImpl();

/**
 * React hook for service worker integration
 */
export function useServiceWorker() {
  const [isRegistered, setIsRegistered] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(serviceWorkerManager.isOnline());
  const [updateAvailable, setUpdateAvailable] = React.useState(false);

  React.useEffect(() => {
    // Register service worker
    serviceWorkerManager.register().then((registration) => {
      setIsRegistered(!!registration);
    });

    // Listen for online/offline changes
    const unsubscribe = serviceWorkerManager.onOfflineChange(setIsOnline);

    // Listen for update notifications
    const handleUpdate = () => setUpdateAvailable(true);
    window.addEventListener('sw-update-available', handleUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('sw-update-available', handleUpdate);
    };
  }, []);

  const updateApp = React.useCallback(async () => {
    try {
      await serviceWorkerManager.update();
      window.location.reload();
    } catch (error) {
      console.error('Failed to update app:', error);
    }
  }, []);

  const invalidateCache = React.useCallback(async (pattern: string) => {
    try {
      await serviceWorkerManager.invalidateCache(pattern);
    } catch (error) {
      console.error('Failed to invalidate cache:', error);
    }
  }, []);

  const warmCache = React.useCallback(async (urls: string[]) => {
    try {
      await serviceWorkerManager.warmCache(urls);
    } catch (error) {
      console.error('Failed to warm cache:', error);
    }
  }, []);

  return {
    isRegistered,
    isOnline,
    updateAvailable,
    updateApp,
    invalidateCache,
    warmCache,
    isSupported: serviceWorkerManager.isSupported()
  };
}

/**
 * Background sync utilities
 */
export class BackgroundSync {
  static async register(tag: string): Promise<void> {
    if (!('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype)) {
      console.warn('[BackgroundSync] Background sync not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(tag);
      console.log('[BackgroundSync] Registered sync:', tag);
    } catch (error) {
      console.error('[BackgroundSync] Failed to register sync:', error);
    }
  }

  static async registerAttendanceSync(): Promise<void> {
    await this.register('background-sync-attendance');
  }

  static async registerPreferencesSync(): Promise<void> {
    await this.register('background-sync-preferences');
  }
}

/**
 * Push notification utilities
 */
export class PushNotifications {
  static async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('[Push] Notifications not supported');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    return Notification.requestPermission();
  }

  static async subscribe(vapidPublicKey: string): Promise<PushSubscription | null> {
    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      console.warn('[Push] Notification permission not granted');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
      });

      console.log('[Push] Subscription created:', subscription);
      return subscription;
    } catch (error) {
      console.error('[Push] Failed to subscribe:', error);
      return null;
    }
  }

  static async unsubscribe(): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        const result = await subscription.unsubscribe();
        console.log('[Push] Unsubscribed:', result);
        return result;
      }
      
      return true;
    } catch (error) {
      console.error('[Push] Failed to unsubscribe:', error);
      return false;
    }
  }

  private static urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

// Import React for the hook
import React from 'react';