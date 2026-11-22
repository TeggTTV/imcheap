import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Geolocation } from '@capacitor/geolocation';
import { registerPlugin } from '@capacitor/core';

export interface BackgroundGeolocationPlugin {
  addWatcher(
    options: {
      backgroundTitle?: string;
      backgroundMessage?: string;
      requestPermissions?: boolean;
      stale?: boolean;
      distanceFilter?: number;
    },
    callback: (location: { latitude: number; longitude: number; speed?: number; accuracy?: number } | null, error?: any) => void
  ): Promise<string>;
  removeWatcher(options: { id: string }): Promise<void>;
  openSettings(): Promise<void>;
}

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

export const isNativePlatform = () => Capacitor.isNativePlatform();

/**
 * Requests location permissions.
 * On Android 11+ (API 30+), background location ("Allow all the time")
 * CANNOT be requested in the same dialog as foreground location.
 * First we request foreground location; if granted, we prompt for background location or direct the user to App Settings.
 */
export const requestAlwaysLocationPermission = async (): Promise<boolean> => {
  if (isNativePlatform()) {
    try {
      const current = await Geolocation.checkPermissions();
      if (current.location !== 'granted') {
        const req = await Geolocation.requestPermissions({ permissions: ['location'] });
        if (req.location !== 'granted') {
          return false;
        }
      }

      // Check / request background location or open settings to allow "All the time"
      try {
        await BackgroundGeolocation.openSettings();
      } catch {
        // Fallback
      }
      return true;
    } catch (e) {
      console.warn('Failed to request native location permission:', e);
      return false;
    }
  }

  return true;
};

export const openNativeAppSettings = async () => {
  if (isNativePlatform()) {
    try {
      await BackgroundGeolocation.openSettings();
    } catch (err) {
      console.warn('Failed to open native settings:', err);
    }
  }
};

export const triggerHaptic = async (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') => {
  if (isNativePlatform()) {
    try {
      if (type === 'success' || type === 'warning' || type === 'error') {
        const notificationMap = {
          success: NotificationType.Success,
          warning: NotificationType.Warning,
          error: NotificationType.Error,
        };
        await Haptics.notification({ type: notificationMap[type] });
      } else {
        const styleMap = {
          light: ImpactStyle.Light,
          medium: ImpactStyle.Medium,
          heavy: ImpactStyle.Heavy,
        };
        await Haptics.impact({ style: styleMap[type] });
      }
      return;
    } catch {
      // Fallback below
    }
  }

  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    const patterns = {
      light: 10,
      medium: 25,
      heavy: 45,
      success: [10, 50, 20],
      warning: [30, 50, 30],
      error: [50, 100, 50],
    };
    navigator.vibrate(patterns[type] || 15);
  }
};

export const scheduleSmartPrompt = async (title: string, body: string, id = 1, delayMs = 1000) => {
  if (isNativePlatform()) {
    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== 'granted') return;
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id,
            schedule: { at: new Date(Date.now() + delayMs) },
            sound: undefined,
            attachments: undefined,
            actionTypeId: '',
            extra: null,
          },
        ],
      });
      return;
    } catch (err) {
      console.warn('Native notification failed, falling back:', err);
    }
  }

  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    setTimeout(() => {
      new Notification(title, { body });
    }, delayMs);
  }
};

export const startTripLocationWatcher = async (
  onLocation: (coords: { latitude: number; longitude: number; speed?: number }) => void,
  onError?: (err: any) => void
): Promise<() => void> => {
  if (isNativePlatform()) {
    try {
      const watcherId = await BackgroundGeolocation.addWatcher(
        {
          backgroundTitle: 'ImCheap Trip Tracking Active',
          backgroundMessage: 'Recording transit distance and cost calculations.',
          requestPermissions: true,
          stale: false,
          distanceFilter: 10,
        },
        (location, error) => {
          if (error) {
            onError?.(error);
            return;
          }
          if (location) {
            onLocation({
              latitude: location.latitude,
              longitude: location.longitude,
              speed: location.speed ?? undefined,
            });
          }
        }
      );

      return () => {
        BackgroundGeolocation.removeWatcher({ id: watcherId }).catch(console.error);
      };
    } catch (err) {
      onError?.(err);
    }
  }

  if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        onLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          speed: pos.coords.speed ?? undefined,
        });
      },
      (err) => onError?.(err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }

  return () => {};
};
