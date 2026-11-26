export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // Ignore registration failures in unsupported contexts
    });
  });
}

export function getNotificationPermissionState(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.requestPermission();
}

export function sendLocalNotification(title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    if (navigator.serviceWorker?.controller) {
      void navigator.serviceWorker.ready.then((reg) => {
        void reg.showNotification(title, {
          body,
          icon: '/icons/caty-icon.svg',
          badge: '/icons/caty-icon.svg',
        });
      });
      return;
    }
    new Notification(title, {
      body,
      icon: '/icons/caty-icon.svg',
    });
  } catch {
    // Ignore if blocked by OS focus mode
  }
}
