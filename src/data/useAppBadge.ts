import { useEffect } from 'react';
import { useItems } from './items';
import { progressOf } from '../features/items/select';
import { setBadge } from '../lib/badge';

/** Mantiene el número del ícono = pendientes urgentes sin hacer del hogar. */
export function useAppBadge(hid: string): void {
  const items = useItems(hid);
  const urgent = items.data ? progressOf(items.data).urgentPending : null;
  useEffect(() => {
    if (urgent !== null) void setBadge(urgent);
  }, [urgent]);
}
