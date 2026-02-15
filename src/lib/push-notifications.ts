// Push Notification Utilities for Client-Side

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// Check if push notifications are supported
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// Get notification permission status
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isPushSupported()) return 'unsupported';

  const permission = await Notification.requestPermission();
  return permission;
}

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[Push] Service worker registered:', registration.scope);

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;

    return registration;
  } catch (error) {
    console.error('[Push] Service worker registration failed:', error);
    return null;
  }
}

// Convert URL-safe base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
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

// Subscribe to push notifications
export async function subscribeToPush(): Promise<{
  success: boolean;
  subscription?: PushSubscription;
  error?: string;
}> {
  if (!isPushSupported()) {
    return { success: false, error: 'Push notifications not supported' };
  }

  if (!VAPID_PUBLIC_KEY) {
    return { success: false, error: 'VAPID public key not configured' };
  }

  // Check permission
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    return { success: false, error: 'Notification permission denied' };
  }

  try {
    // Register service worker if not already registered
    const registration = await registerServiceWorker();
    if (!registration) {
      return { success: false, error: 'Failed to register service worker' };
    }

    // Get or create push subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }

    // Get device info
    const deviceInfo = getDeviceInfo();

    // Send subscription to server
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: arrayBufferToBase64(subscription.getKey('auth')),
        },
        ...deviceInfo,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || 'Failed to save subscription' };
    }

    console.log('[Push] Successfully subscribed to push notifications');
    return { success: true, subscription };
  } catch (error) {
    console.error('[Push] Subscription failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isPushSupported()) {
    return { success: false, error: 'Push notifications not supported' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Unsubscribe from push manager
      await subscription.unsubscribe();

      // Notify server
      await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
        method: 'DELETE',
      });
    }

    console.log('[Push] Successfully unsubscribed from push notifications');
    return { success: true };
  } catch (error) {
    console.error('[Push] Unsubscribe failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Check if currently subscribed
export async function isSubscribedToPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch (error) {
    console.error('[Push] Error checking subscription:', error);
    return false;
  }
}

// Get device info for subscription
function getDeviceInfo(): {
  deviceType: string;
  deviceName: string;
  platform: string;
} {
  const ua = navigator.userAgent;
  let deviceType = 'desktop';
  let platform = 'web';

  if (/Mobile|Android|iPhone|iPad/i.test(ua)) {
    deviceType = /iPad/i.test(ua) ? 'tablet' : 'mobile';
  }

  if (/iPhone|iPad|iPod/i.test(ua)) {
    platform = 'ios';
  } else if (/Android/i.test(ua)) {
    platform = 'android';
  }

  // Try to get device name
  let deviceName = 'Unknown Device';
  if (/iPhone/i.test(ua)) deviceName = 'iPhone';
  else if (/iPad/i.test(ua)) deviceName = 'iPad';
  else if (/Android/i.test(ua)) {
    const match = ua.match(/Android.*?;\s*([^;)]+)/);
    deviceName = match ? match[1].trim() : 'Android Device';
  } else if (/Windows/i.test(ua)) deviceName = 'Windows PC';
  else if (/Mac/i.test(ua)) deviceName = 'Mac';
  else if (/Linux/i.test(ua)) deviceName = 'Linux PC';

  return { deviceType, deviceName, platform };
}

// Convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Show local notification (for testing)
export function showLocalNotification(
  title: string,
  options?: NotificationOptions
): Notification | null {
  if (!isPushSupported() || Notification.permission !== 'granted') {
    return null;
  }

  return new Notification(title, {
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    ...options,
  });
}
