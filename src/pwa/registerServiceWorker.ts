const UPDATE_INTERVAL_MS = 60 * 60 * 1000;

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | undefined> {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return undefined;

  const hadController = Boolean(navigator.serviceWorker.controller);
  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  let reloading = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.setInterval(() => {
    void registration.update();
  }, UPDATE_INTERVAL_MS);

  return registration;
}
