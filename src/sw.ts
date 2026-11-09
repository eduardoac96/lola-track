/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { clientsClaim } from 'workbox-core';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> };

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// SPA: cualquier navegación sirve index.html del precache (funciona offline en modo lectura).
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));

interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
  /** Pendientes urgentes del hogar al momento del aviso → número del ícono. */
  badge?: number;
}

self.addEventListener('push', (event) => {
  let data: PushPayload;
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { body: event.data?.text() };
  }
  const nav = self.navigator as WorkerNavigator & {
    setAppBadge?: (n?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  const badge =
    typeof data.badge === 'number'
      ? (data.badge > 0 ? nav.setAppBadge?.(data.badge) : nav.clearAppBadge?.())?.catch(() => undefined)
      : undefined;
  event.waitUntil(
    Promise.all([
      badge,
      self.registration.showNotification(data.title ?? 'Lola Track', {
        body: data.body ?? '',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: data.tag,
        data: { url: data.url ?? '/agenda' },
      }),
    ]),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data as { url?: string })?.url ?? '/', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of all) {
        if ('focus' in c) {
          await (c as WindowClient).navigate(url).catch(() => undefined);
          return (c as WindowClient).focus();
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});
