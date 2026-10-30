import type { Settings } from '../types';

export type DeckKind = 'mac' | 'devre' | 'taktik' | 'antrenman' | 'hafta';
export type DeckTarget = { kind: DeckKind; id: string };

const BUILD_APP_URL = (import.meta.env.VITE_APP_URL as string | undefined) ?? '';

export const isFramed = () => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

/**
 * Uygulamanın paylaşılabilir adresi (hash'siz). Sırasıyla: ayarlarda girilen adres, çerçeve dışında
 * açıldıysa sayfanın kendi adresi, claude.ai'den gelindiyse oradaki artifact adresi, derlemede verilen adres.
 */
export function appBase(settings: Pick<Settings, 'appUrl'>): string {
  if (settings.appUrl?.trim()) return settings.appUrl.trim().split('#')[0];
  if (!isFramed()) return location.href.split('#')[0];
  const ref = document.referrer;
  if (/^https:\/\/claude\.ai\/(code\/)?artifact\//.test(ref)) return ref.split('#')[0].split('?')[0];
  return BUILD_APP_URL;
}

export const deckHash = (t: DeckTarget) => `sunum-${t.kind}-${t.id}`;
export const SCREEN_HASH = 'ekran';

export function linkFor(settings: Pick<Settings, 'appUrl'>, hash: string) {
  const base = appBase(settings);
  return base ? `${base}#${hash}` : `#${hash}`;
}

/** #sunum-mac-abc123 → { kind: 'mac', id: 'abc123' } */
export function parseDeckHash(route: string): DeckTarget | null {
  const m = /^sunum-(mac|devre|taktik|antrenman|hafta)-(.+)$/.exec(route);
  return m ? { kind: m[1] as DeckKind, id: m[2] } : null;
}
