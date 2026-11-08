/** Tema: 'auto' sigue al sistema; 'light'/'dark' lo fijan. Se guarda por dispositivo. */
export type ThemePref = 'auto' | 'light' | 'dark';

const KEY = 'lola:theme';
const META_COLORS = { light: '#F5F4FA', dark: '#121019' } as const;

export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export function systemIsDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

/** Tema que se ve ahora mismo. */
export function effectiveTheme(pref: ThemePref = getThemePref()): 'light' | 'dark' {
  return pref === 'auto' ? (systemIsDark() ? 'dark' : 'light') : pref;
}

export function applyTheme(pref: ThemePref): void {
  const root = document.documentElement;
  if (pref === 'auto') delete root.dataset.theme;
  else root.dataset.theme = pref;
  const color = META_COLORS[effectiveTheme(pref)];
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    m.content = color;
    m.removeAttribute('media');
  });
}

export function setThemePref(pref: ThemePref): void {
  try {
    if (pref === 'auto') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    /* modo privado */
  }
  applyTheme(pref);
  window.dispatchEvent(new CustomEvent('lola:theme', { detail: pref }));
}
