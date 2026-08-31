// VerbaMind AI Pro - Service Worker pour fonctionnement 100% Hors Ligne (PWA)
const CACHE_NAME = 'verbamind-pwa-v3';
const RUNTIME_CACHE = 'verbamind-runtime-v3';

// Fichiers vitaux pré-mis en cache à l'installation
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.svg',
  './verbamind-icon.jpg',
  './404.html'
];

// Installation : pré-caching des ressources fondamentales
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pré-mise en cache des fichiers de base');
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[Service Worker] Erreur partielle lors du precache:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activation : nettoyage des anciens caches et prise de contrôle immédiate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => {
            console.log('[Service Worker] Suppression de l’ancien cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET (POST API, etc.)
  if (request.method !== 'GET') {
    return;
  }

  // Ignorer les requêtes vers l'API externe ou interne Gemini (/api/...)
  if (url.pathname.startsWith('/api/') || url.hostname.includes('generativelanguage.googleapis.com')) {
    return;
  }

  // 1. Navigation / Rechargement de page (ex: F5, saisie URL) -> Évite le dinosaure Google Chrome
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
              cache.put('./index.html', networkResponse.clone());
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          console.log('[Service Worker] Navigation hors ligne détectée : chargement depuis le cache local');
          const cache = await caches.open(CACHE_NAME);
          const cachedIndex = await cache.match('./index.html') || await cache.match('./') || await cache.match(request);
          if (cachedIndex) {
            return cachedIndex;
          }
          return new Response(
            '<!doctype html><html><body style="background:#060b19;color:#fff;font-family:sans-serif;text-align:center;padding:40px;"><h2>VerbaMind AI Pro</h2><p>L’application se charge en mode hors-ligne...</p></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // 2. Fichiers statiques (JS, CSS, Fonts, Images, SVG) -> Stratégie Cache-First avec mise à jour en arrière-plan
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Mettre à jour le cache en arrière-plan si réseau disponible
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              caches.open(RUNTIME_CACHE).then((cache) => {
                cache.put(request, networkResponse);
              });
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      // Si pas en cache, chercher sur le réseau et mettre en cache
      return fetch(request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          // Si ressource manquante hors ligne, retourner une réponse vide ou fallback
          return new Response('', { status: 408, statusText: 'Offline' });
        });
    })
  );
});

// Écoute des messages pour forcer l'actualisation
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
