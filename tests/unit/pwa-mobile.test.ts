import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Milestone 3: PWA, Manifest, Service Worker & Safe Areas Verification', () => {
  const rootDir = path.resolve(__dirname, '../../');

  it('1. manifest.json contains required PWA metadata, scope, id, categories and icon entries', () => {
    const manifestPath = path.join(rootDir, 'public/manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const content = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(content);

    expect(manifest.name).toBe('ТаксиДрайв — Учет смен и расходов');
    expect(manifest.short_name).toBe('ТаксиДрайв');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.id).toBe('/');
    expect(manifest.categories).toEqual(expect.arrayContaining(['finance', 'productivity']));

    // Icons check
    expect(Array.isArray(manifest.icons)).toBe(true);
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');

    const icon192 = manifest.icons.find((i: { sizes: string }) => i.sizes === '192x192');
    expect(icon192.type).toBe('image/png');
    expect(icon192.src).toBe('/icons/icon-192.png');

    const icon512 = manifest.icons.find((i: { sizes: string }) => i.sizes === '512x512');
    expect(icon512.type).toBe('image/png');
    expect(icon512.src).toBe('/icons/icon-512.png');
  });

  it('2. public/icons contains valid raster PNG icons (192, 512, apple-touch-icon)', () => {
    const iconsDir = path.join(rootDir, 'public/icons');
    expect(fs.existsSync(iconsDir)).toBe(true);

    const requiredIcons = ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
    for (const icon of requiredIcons) {
      const iconPath = path.join(iconsDir, icon);
      expect(fs.existsSync(iconPath)).toBe(true);
      const stats = fs.statSync(iconPath);
      expect(stats.size).toBeGreaterThan(100); // Non-empty valid file

      // Check PNG magic number header: 89 50 4E 47 0D 0A 1A 0A
      const fd = fs.openSync(iconPath, 'r');
      const buffer = Buffer.alloc(8);
      fs.readSync(fd, buffer, 0, 8, 0);
      fs.closeSync(fd);
      expect(buffer.toString('hex')).toBe('89504e470d0a1a0a');
    }
  });

  it('3. public/sw.js exists and implements offline caching (Cache-First & Network-First)', () => {
    const swPath = path.join(rootDir, 'public/sw.js');
    expect(fs.existsSync(swPath)).toBe(true);

    const swCode = fs.readFileSync(swPath, 'utf8');
    expect(swCode).toContain('addEventListener(\'install\'');
    expect(swCode).toContain('addEventListener(\'activate\'');
    expect(swCode).toContain('addEventListener(\'fetch\'');

    // Precache assets
    expect(swCode).toContain('/manifest.json');
    expect(swCode).toContain('/icons/icon-192.png');
    expect(swCode).toContain('/icons/icon-512.png');

    // Caching strategies
    expect(swCode).toContain('navigate'); // Navigation HTML
    expect(swCode).toContain('/_next/static/'); // Static assets Cache-First
  });

  it('4. app/globals.css defines all safe area insets: top, bottom, left, right', () => {
    const cssPath = path.join(rootDir, 'app/globals.css');
    expect(fs.existsSync(cssPath)).toBe(true);

    const css = fs.readFileSync(cssPath, 'utf8');
    expect(css).toContain('.safe-top');
    expect(css).toContain('env(safe-area-inset-top');
    expect(css).toContain('.safe-bottom');
    expect(css).toContain('env(safe-area-inset-bottom');
    expect(css).toContain('.safe-left');
    expect(css).toContain('env(safe-area-inset-left');
    expect(css).toContain('.safe-right');
    expect(css).toContain('env(safe-area-inset-right');
  });

  it('5. app/layout.tsx complies with WCAG 1.4.4 (removes userScalable: false and maximumScale)', () => {
    const layoutPath = path.join(rootDir, 'app/layout.tsx');
    expect(fs.existsSync(layoutPath)).toBe(true);

    const layout = fs.readFileSync(layoutPath, 'utf8');
    expect(layout).not.toContain('userScalable: false');
    expect(layout).not.toContain('maximumScale');
    expect(layout).toContain('/icons/apple-touch-icon.png');
  });

  it('6. app/page.tsx has safe bottom padding for fixed bottom navigation', () => {
    const pagePath = path.join(rootDir, 'app/page.tsx');
    expect(fs.existsSync(pagePath)).toBe(true);

    const page = fs.readFileSync(pagePath, 'utf8');
    expect(page).toContain('pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]');
    expect(page).toContain('overflow-x-hidden');
  });
});
