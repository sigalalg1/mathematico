import { readFileSync } from 'node:fs';
import process from 'node:process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readText(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

function pngDimensions(path: string): [number, number] {
  const png = readFileSync(resolve(process.cwd(), path));
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
}

describe('PWA assets', () => {
  it('defines installable Mathletica manifest metadata and approved icons', () => {
    const manifest = JSON.parse(readText('public/manifest.webmanifest')) as {
      name: string;
      short_name: string;
      display: string;
      start_url: string;
      scope: string;
      icons: Array<{ src: string; sizes: string; purpose: string }>;
    };

    expect(manifest).toMatchObject({
      name: 'Mathletica',
      short_name: 'Mathletica',
      display: 'standalone',
      start_url: '/',
      scope: '/',
    });
    expect(manifest.icons).toEqual([
      expect.objectContaining({ src: '/brand/mathletica-icon-192.png', sizes: '192x192', purpose: 'any' }),
      expect.objectContaining({ src: '/brand/mathletica-icon-512.png', sizes: '512x512', purpose: 'any' }),
    ]);
  });

  it('keeps exact icon dimensions and derives only the Apple size', () => {
    expect(pngDimensions('public/brand/mathletica-icon-192.png')).toEqual([192, 192]);
    expect(pngDimensions('public/brand/mathletica-icon-512.png')).toEqual([512, 512]);
    expect(pngDimensions('public/brand/apple-touch-icon.png')).toEqual([180, 180]);
  });

  it('links mobile metadata and registers a network-first SPA shell worker', () => {
    const html = readText('index.html');
    const worker = readText('public/sw.js');
    const registration = readText('src/pwa/registerServiceWorker.ts');

    expect(html).toContain('href="/manifest.webmanifest"');
    expect(html).toContain('href="/brand/apple-touch-icon.png"');
    expect(html).toContain('<title>Mathletica</title>');
    expect(worker).toContain("request.mode === 'navigate'");
    expect(worker).toContain("caches.match('/')");
    expect(worker).toContain('self.skipWaiting()');
    expect(registration).toContain("register('/sw.js', { scope: '/' })");
    expect(registration).toContain("addEventListener('controllerchange'");
  });
});
