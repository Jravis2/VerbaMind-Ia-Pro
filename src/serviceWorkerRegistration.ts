/**
 * Service Worker Registration and PWA offline capability helper
 */

export interface PWAInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredInstallPrompt: PWAInstallPromptEvent | null = null;
const installListeners: Array<(canInstall: boolean) => void> = [];

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Use relative path so it works in root or GitHub Pages subpath (e.g. /VerbaMind-Ia-Pro/)
      const swUrl = './sw.js';

      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          console.log('[PWA] Service Worker enregistré avec succès sur le scope:', registration.scope);

          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker == null) return;

            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('[PWA] Nouveau contenu disponible, sera actif au prochain rechargement.');
                } else {
                  console.log('[PWA] Contenu entièrement mis en cache pour utilisation 100% Hors Ligne !');
                }
              }
            };
          };
        })
        .catch((error) => {
          console.warn('[PWA] Échec d’enregistrement du Service Worker:', error);
        });
    });

    // Capture standard PWA install prompt
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      deferredInstallPrompt = e as PWAInstallPromptEvent;
      installListeners.forEach((listener) => listener(true));
    });

    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      installListeners.forEach((listener) => listener(false));
      console.log('[PWA] Application VerbaMind installée sur l’appareil.');
    });
  }
}

export function subscribeToInstallPrompt(callback: (canInstall: boolean) => void) {
  installListeners.push(callback);
  callback(deferredInstallPrompt !== null);
  return () => {
    const idx = installListeners.indexOf(callback);
    if (idx !== -1) installListeners.splice(idx, 1);
  };
}

export async function promptPwaInstall(): Promise<boolean> {
  if (!deferredInstallPrompt) {
    return false;
  }
  try {
    await deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installListeners.forEach((listener) => listener(false));
    return choice.outcome === 'accepted';
  } catch (err) {
    console.error('[PWA] Erreur lors de l’invite d’installation:', err);
    return false;
  }
}
