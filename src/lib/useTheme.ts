import { useEffect, useState } from 'react';
import { effectiveTheme, getThemePref, setThemePref, type ThemePref } from './theme';

export function useTheme() {
  const [pref, setPref] = useState<ThemePref>(getThemePref);
  const [, force] = useState(0);

  useEffect(() => {
    const onChange = (e: Event) => setPref((e as CustomEvent<ThemePref>).detail);
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onSystem = () => force((n) => n + 1);
    window.addEventListener('lola:theme', onChange);
    mq?.addEventListener?.('change', onSystem);
    return () => {
      window.removeEventListener('lola:theme', onChange);
      mq?.removeEventListener?.('change', onSystem);
    };
  }, []);

  const current = effectiveTheme(pref);
  return {
    pref,
    current,
    setPref: setThemePref,
    /** Día ↔ noche (fija el tema contrario al que se ve). */
    toggle: () => setThemePref(current === 'dark' ? 'light' : 'dark'),
  };
}
