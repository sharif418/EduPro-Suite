export interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface OfflineData {
  key: string;
  data: any;
  timestamp: Date;
  expiresAt?: Date;
}

export interface SyncJob {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  table: string;
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  status: 'PENDING' | 'SYNCING' | 'COMPLETED' | 'FAILED';
}

export class PWAService {
  private static instance: PWAService;
  private deferredPrompt: PWAInstallPrompt | null = null;
  private isOnline = true;
  private syncQueue: SyncJob[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializePWA();
    }
  }

  public static getInstance(): PWAService {
    if (!PWAService.instance) {
      PWAService.instance = new PWAService();
    }
    return PWAService.instance;
  }

  /**
   * Initialize PWA functionality
   */
  private initializePWA(): void {
    // Register service worker
    this.registerServiceWorker();

    // Listen for install prompt
    this.setupInstallPrompt();

    // Monitor online/offline status
    this.setupOnlineStatusMonitoring();

    // Setup background sync
    this.setupBackgroundSync();

    console.log('[PWA_SERVICE] PWA service initialized');
  }

  /**
   * Register service worker
   */
  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is available
                this.notifyServiceWorkerUpdate();
              }
            });
          }
        });

        console.log('[PWA_SERVICE] Service worker registered successfully');
      } catch (error) {
        console.error('[PWA_SERVICE] Service worker registration failed:', error);
      }
    }
  }

  /**
   * Setup install prompt handling
   */
  private setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as any;
      console.log('[PWA_SERVICE] Install prompt available');
      
      // Dispatch custom event to notify components
      window.dispatchEvent(new CustomEvent('pwa-install-available'));
    });

    window.addEventListener('appinstalled', () => {
      console.log('[PWA_SERVICE] App installed successfully');
      this.deferredPrompt = null;
      
      // Track installation
      this.trackPWAInstallation();
    });
  }

  /**
   * Setup online/offline status monitoring
   */
  private setupOnlineStatusMonitoring(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('[PWA_SERVICE] Back online - syncing data');
      this.syncOfflineData();
      
      // Notify components
      window.dispatchEvent(new CustomEvent('pwa-online'));
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('[PWA_SERVICE] Gone offline - enabling offline mode');
      
      // Notify components
      window.dispatchEvent(new CustomEvent('pwa-offline'));
    });

    // Initial status
    this.isOnline = navigator.onLine;
  }

  /**
   * Setup background sync
   */
  private setupBackgroundSync(): void {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        // Register background sync
        (registration as any).sync.register('background-sync');
        console.log('[PWA_SERVICE] Background sync registered');
      }).catch((error) => {
        console.error('[PWA_SERVICE] Background sync registration failed:', error);
      });
    }
  }

  /**
   * Show install prompt
   */
  async showInstallPrompt(): Promise<boolean> {
    if (!this.deferredPrompt) {
      return false;
    }

    try {
      await this.deferredPrompt.prompt();
      const choiceResult = await this.deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA_SERVICE] User accepted the install prompt');
        return true;
      } else {
        console.log('[PWA_SERVICE] User dismissed the install prompt');
        return false;
      }
    } catch (error) {
      console.error('[PWA_SERVICE] Error showing install prompt:', error);
      return false;
    } finally {
      this.deferredPrompt = null;
    }
  }

  /**
   * Check if app is installable
   */
  isInstallable(): boolean {
    return this.deferredPrompt !== null;
  }

  /**
   * Check if app is installed
   */
  isInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }

  /**
   * Store data for offline use
   */
  async storeOfflineData(key: string, data: any, expiresIn?: number): Promise<void> {
    try {
      const offlineData: OfflineData = {
        key,
        data,
        timestamp: new Date(),
        expiresAt: expiresIn ? new Date(Date.now() + expiresIn) : undefined
      };

      localStorage.setItem(`offline_${key}`, JSON.stringify(offlineData));
      console.log(`[PWA_SERVICE] Data stored offline: ${key}`);

    } catch (error) {
      console.error('[PWA_SERVICE] Error storing offline data:', error);
    }
  }

  /**
   * Retrieve offline data
   */
  async getOfflineData(key: string): Promise<any | null> {
    try {
      const storedData = localStorage.getItem(`offline_${key}`);
      if (!storedData) {
        return null;
      }

      const offlineData: OfflineData = JSON.parse(storedData);
      
      // Check if data has expired
      if (offlineData.expiresAt && new Date() > new Date(offlineData.expiresAt)) {
        localStorage.removeItem(`offline_${key}`);
        return null;
      }

      return offlineData.data;

    } catch (error) {
      console.error('[PWA_SERVICE] Error retrieving offline data:', error);
      return null;
    }
  }

  /**
   * Add data to sync queue
   */
  async addToSyncQueue(syncJob: Omit<SyncJob, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<void> {
    try {
      const job: SyncJob = {
        ...syncJob,
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        retryCount: 0,
        status: 'PENDING'
      };

      this.syncQueue.push(job);
      
      // Store in localStorage for persistence
      localStorage.setItem('pwa_sync_queue', JSON.stringify(this.syncQueue));
      
      console.log(`[PWA_SERVICE] Added to sync queue: ${job.id}`);

      // Try to sync immediately if online
      if (this.isOnline) {
        this.syncOfflineData();
      }

    } catch (error) {
      console.error('[PWA_SERVICE] Error adding to sync queue:', error);
    }
  }

  /**
   * Sync offline data when back online
   */
  private async syncOfflineData(): Promise<void> {
    try {
      // Load sync queue from localStorage
      const storedQueue = localStorage.getItem('pwa_sync_queue');
      if (storedQueue) {
        this.syncQueue = JSON.parse(storedQueue);
      }

      const pendingJobs = this.syncQueue.filter(job => job.status === 'PENDING' || job.status === 'FAILED');
      
      console.log(`[PWA_SERVICE] Syncing ${pendingJobs.length} pending jobs`);

      for (const job of pendingJobs) {
        await this.processSyncJob(job);
      }

      // Update localStorage
      localStorage.setItem('pwa_sync_queue', JSON.stringify(this.syncQueue));

    } catch (error) {
      console.error('[PWA_SERVICE] Error syncing offline data:', error);
    }
  }

  /**
   * Process individual sync job
   */
  private async processSyncJob(job: SyncJob): Promise<void> {
    try {
      job.status = 'SYNCING';

      const endpoint = this.getEndpointForTable(job.table);
      const method = this.getMethodForType(job.type);

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(job.data)
      });

      if (response.ok) {
        job.status = 'COMPLETED';
        console.log(`[PWA_SERVICE] Sync job completed: ${job.id}`);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      console.error(`[PWA_SERVICE] Sync job failed: ${job.id}`, error);
      
      job.retryCount++;
      if (job.retryCount >= job.maxRetries) {
        job.status = 'FAILED';
      } else {
        job.status = 'PENDING';
      }
    }
  }

  /**
   * Get API endpoint for table
   */
  private getEndpointForTable(table: string): string {
    const endpoints: { [key: string]: string } = {
      'students': '/api/admin/students',
      'staff': '/api/admin/staff',
      'attendance': '/api/teacher/attendance',
      'grades': '/api/teacher/gradebook',
      'assignments': '/api/teacher/assignments',
      'notifications': '/api/notifications'
    };

    return endpoints[table] || '/api/sync';
  }

  /**
   * Get HTTP method for sync type
   */
  private getMethodForType(type: string): string {
    switch (type) {
      case 'CREATE': return 'POST';
      case 'UPDATE': return 'PUT';
      case 'DELETE': return 'DELETE';
      default: return 'POST';
    }
  }

  /**
   * Notify about service worker update
   */
  private notifyServiceWorkerUpdate(): void {
    // Dispatch custom event to notify components
    window.dispatchEvent(new CustomEvent('pwa-update-available'));
  }

  /**
   * Track PWA installation
   */
  private trackPWAInstallation(): void {
    // Track installation analytics
    console.log('[PWA_SERVICE] PWA installation tracked');
    
    // This could send analytics data to track PWA adoption
    // analytics.track('pwa_installed', {
    //   timestamp: new Date(),
    //   userAgent: navigator.userAgent,
    //   platform: navigator.platform
    // });
  }

  /**
   * Get PWA status
   */
  getPWAStatus(): {
    isInstallable: boolean;
    isInstalled: boolean;
    isOnline: boolean;
    hasServiceWorker: boolean;
    syncQueueLength: number;
  } {
    return {
      isInstallable: this.isInstallable(),
      isInstalled: this.isInstalled(),
      isOnline: this.isOnline,
      hasServiceWorker: 'serviceWorker' in navigator,
      syncQueueLength: this.syncQueue.filter(job => job.status === 'PENDING').length
    };
  }

  /**
   * Clear offline data
   */
  async clearOfflineData(): Promise<void> {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('offline_'));
      keys.forEach(key => localStorage.removeItem(key));
      
      console.log(`[PWA_SERVICE] Cleared ${keys.length} offline data entries`);

    } catch (error) {
      console.error('[PWA_SERVICE] Error clearing offline data:', error);
    }
  }

  /**
   * Get offline data size
   */
  getOfflineDataSize(): { count: number; sizeKB: number } {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('offline_'));
      let totalSize = 0;
      
      keys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += new Blob([value]).size;
        }
      });

      return {
        count: keys.length,
        sizeKB: Math.round(totalSize / 1024)
      };

    } catch (error) {
      console.error('[PWA_SERVICE] Error calculating offline data size:', error);
      return { count: 0, sizeKB: 0 };
    }
  }

  /**
   * Force sync all pending data
   */
  async forceSyncAll(): Promise<{ success: boolean; syncedCount: number; failedCount: number }> {
    try {
      const pendingJobs = this.syncQueue.filter(job => job.status === 'PENDING' || job.status === 'FAILED');
      let syncedCount = 0;
      let failedCount = 0;

      for (const job of pendingJobs) {
        try {
          await this.processSyncJob(job);
          if (job.status === 'COMPLETED') {
            syncedCount++;
          } else {
            failedCount++;
          }
        } catch (error) {
          failedCount++;
        }
      }

      // Update localStorage
      localStorage.setItem('pwa_sync_queue', JSON.stringify(this.syncQueue));

      return { success: true, syncedCount, failedCount };

    } catch (error) {
      console.error('[PWA_SERVICE] Error in force sync:', error);
      return { success: false, syncedCount: 0, failedCount: 0 };
    }
  }

  /**
   * Enable offline mode for specific features
   */
  enableOfflineMode(features: string[]): void {
    try {
      localStorage.setItem('pwa_offline_features', JSON.stringify(features));
      console.log('[PWA_SERVICE] Offline mode enabled for features:', features);

    } catch (error) {
      console.error('[PWA_SERVICE] Error enabling offline mode:', error);
    }
  }

  /**
   * Check if feature is available offline
   */
  isFeatureAvailableOffline(feature: string): boolean {
    try {
      const offlineFeatures = localStorage.getItem('pwa_offline_features');
      if (!offlineFeatures) {
        return false;
      }

      const features = JSON.parse(offlineFeatures);
      return features.includes(feature);

    } catch (error) {
      console.error('[PWA_SERVICE] Error checking offline feature:', error);
      return false;
    }
  }

  /**
   * Get PWA analytics
   */
  getPWAAnalytics(): {
    installationDate?: Date;
    usageStats: {
      totalSessions: number;
      averageSessionTime: number;
      offlineUsage: number;
    };
    syncStats: {
      totalSyncs: number;
      successfulSyncs: number;
      failedSyncs: number;
    };
  } {
    try {
      // Mock analytics data
      return {
        installationDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        usageStats: {
          totalSessions: 45,
          averageSessionTime: 25, // minutes
          offlineUsage: 15 // percentage
        },
        syncStats: {
          totalSyncs: 120,
          successfulSyncs: 115,
          failedSyncs: 5
        }
      };

    } catch (error) {
      console.error('[PWA_SERVICE] Error getting PWA analytics:', error);
      return {
        usageStats: { totalSessions: 0, averageSessionTime: 0, offlineUsage: 0 },
        syncStats: { totalSyncs: 0, successfulSyncs: 0, failedSyncs: 0 }
      };
    }
  }
}

// Export singleton instance
export const pwaService = PWAService.getInstance();

// PWA Hook for React components
export const usePWA = () => {
  const [pwaStatus, setPwaStatus] = React.useState(pwaService.getPWAStatus());
  const [updateAvailable, setUpdateAvailable] = React.useState(false);

  React.useEffect(() => {
    const handleInstallAvailable = () => {
      setPwaStatus(pwaService.getPWAStatus());
    };

    const handleUpdateAvailable = () => {
      setUpdateAvailable(true);
    };

    const handleOnlineStatus = () => {
      setPwaStatus(pwaService.getPWAStatus());
    };

    window.addEventListener('pwa-install-available', handleInstallAvailable);
    window.addEventListener('pwa-update-available', handleUpdateAvailable);
    window.addEventListener('pwa-online', handleOnlineStatus);
    window.addEventListener('pwa-offline', handleOnlineStatus);

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
      window.removeEventListener('pwa-online', handleOnlineStatus);
      window.removeEventListener('pwa-offline', handleOnlineStatus);
    };
  }, []);

  return {
    ...pwaStatus,
    updateAvailable,
    showInstallPrompt: () => pwaService.showInstallPrompt(),
    storeOfflineData: (key: string, data: any, expiresIn?: number) => 
      pwaService.storeOfflineData(key, data, expiresIn),
    getOfflineData: (key: string) => pwaService.getOfflineData(key),
    addToSyncQueue: (job: Omit<SyncJob, 'id' | 'timestamp' | 'retryCount' | 'status'>) => 
      pwaService.addToSyncQueue(job),
    forceSyncAll: () => pwaService.forceSyncAll()
  };
};

// Import React for the hook
import React from 'react';
