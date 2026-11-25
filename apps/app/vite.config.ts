import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
function offlineShell(): Plugin {
  return {
    name: 'offline-shell',
    async closeBundle() {
      const dist = resolve(import.meta.dirname, 'dist');
      const assets = (await readdir(resolve(dist, 'assets'))).map(
        (f) => `/assets/${f}`,
      );
      const paths = [
        '/',
        '/index.html',
        '/manifest.webmanifest',
        '/icon.svg',
        ...assets,
      ];
      const hash = createHash('sha256')
        .update(await readFile(resolve(dist, 'index.html')))
        .digest('hex')
        .slice(0, 12);
      await writeFile(
        resolve(dist, 'sw.js'),
        `const CACHE='pp-shell-${hash}';const FILES=${JSON.stringify(paths)};self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('pp-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin||u.pathname.startsWith('/api/')||u.pathname.startsWith('/packs/'))return;if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.match('/index.html')));return;}e.respondWith(caches.match(e.request,{ignoreVary:true}).then(c=>c||fetch(e.request)));});`,
      );
    },
  };
}
export default defineConfig({
  plugins: [react(), offlineShell()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
      '/packs': 'http://localhost:8080',
    },
  },
  build: { target: 'es2022' },
});
