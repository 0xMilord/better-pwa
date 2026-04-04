// packages/manifest/test/index.test.ts
import { describe, it, expect } from 'vitest';
import { generateManifest, generateDefaultIcons, generateHtmlLinks, DEFAULT_MANIFEST } from '../src/index.js';

describe('manifest', () => {
  describe('DEFAULT_MANIFEST', () => {
    it('has expected defaults', () => {
      expect(DEFAULT_MANIFEST.start_url).toBe('/');
      expect(DEFAULT_MANIFEST.display).toBe('standalone');
      expect(DEFAULT_MANIFEST.theme_color).toBe('#6366f1');
      expect(DEFAULT_MANIFEST.background_color).toBe('#ffffff');
    });
  });

  describe('generateManifest', () => {
    it('generates valid JSON', () => {
      const json = generateManifest({ name: 'My App' });
      const manifest = JSON.parse(json);
      expect(manifest.name).toBe('My App');
    });

    it('uses short_name from first word', () => {
      const json = generateManifest({ name: 'My Awesome App' });
      const manifest = JSON.parse(json);
      expect(manifest.short_name).toBe('My');
    });

    it('respects custom short_name', () => {
      const json = generateManifest({ name: 'My App', short_name: 'MA' });
      const manifest = JSON.parse(json);
      expect(manifest.short_name).toBe('MA');
    });

    it('includes all provided fields', () => {
      const json = generateManifest({
        name: 'My App',
        description: 'A test app',
        start_url: '/home',
        display: 'minimal-ui',
        theme_color: '#000000',
        background_color: '#ffffff',
        scope: '/home',
        lang: 'en',
        dir: 'ltr',
        orientation: 'portrait',
        categories: ['productivity'],
      });
      const manifest = JSON.parse(json);
      expect(manifest.description).toBe('A test app');
      expect(manifest.start_url).toBe('/home');
      expect(manifest.display).toBe('minimal-ui');
      expect(manifest.theme_color).toBe('#000000');
      expect(manifest.scope).toBe('/home');
      expect(manifest.lang).toBe('en');
      expect(manifest.dir).toBe('ltr');
      expect(manifest.orientation).toBe('portrait');
      expect(manifest.categories).toEqual(['productivity']);
    });

    it('excludes undefined fields', () => {
      const json = generateManifest({ name: 'Minimal' });
      const manifest = JSON.parse(json);
      expect(manifest).not.toHaveProperty('description');
      expect(manifest).not.toHaveProperty('categories');
    });

    it('includes icons when provided', () => {
      const json = generateManifest({
        name: 'App',
        icons: [{ src: '/icon.png', sizes: '192x192', type: 'image/png' }],
      });
      const manifest = JSON.parse(json);
      expect(manifest.icons).toHaveLength(1);
    });

    it('auto-generates icons from iconSrc', () => {
      const json = generateManifest({
        name: 'App',
        iconSrc: '/icons/icon-{size}.png',
      });
      const manifest = JSON.parse(json);
      expect(manifest.icons.length).toBe(8);
      expect(manifest.icons[0].sizes).toBe('72x72');
      expect(manifest.icons[7].sizes).toBe('512x512');
    });
  });

  describe('generateDefaultIcons', () => {
    it('generates 8 icon sizes', () => {
      const icons = generateDefaultIcons('/icon-{size}.png');
      expect(icons.length).toBe(8);
    });

    it('sets correct purpose', () => {
      const icons = generateDefaultIcons('/icon-{size}.png');
      for (const icon of icons) {
        expect(icon.purpose).toBe('maskable');
      }
    });

    it('returns empty array without source', () => {
      const icons = generateDefaultIcons();
      expect(icons).toEqual([]);
    });

    it('replaces {size} placeholder', () => {
      const icons = generateDefaultIcons('/icons/icon-{size}.png');
      expect(icons[0]?.src).toBe('/icons/icon-72x72.png');
      expect(icons[7]?.src).toBe('/icons/icon-512x512.png');
    });
  });

  describe('generateHtmlLinks', () => {
    it('generates manifest link', () => {
      const html = generateHtmlLinks({ name: 'App' });
      expect(html).toContain('<link rel="manifest" href="/manifest.json">');
    });

    it('generates theme-color meta', () => {
      const html = generateHtmlLinks({ name: 'App', theme_color: '#ff0000' });
      expect(html).toContain('<meta name="theme-color" content="#ff0000">');
    });

    it('generates icon links for 512x512 icon', () => {
      const html = generateHtmlLinks({
        name: 'App',
        icons: [{ src: '/icon.png', sizes: '512x512', type: 'image/png' }],
      });
      expect(html).toContain('rel="icon"');
      expect(html).toContain('rel="apple-touch-icon"');
    });

    it('uses custom manifest path', () => {
      const html = generateHtmlLinks({ name: 'App' }, '/custom/manifest.json');
      expect(html).toContain('/custom/manifest.json');
    });
  });
});
