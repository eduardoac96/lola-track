import { createContext, useContext } from 'react';
import type { Household, Member } from '../data/household';

export interface AppCtx {
  userId: string;
  email: string;
  hid: string;
  household: Household;
  members: Member[];
  memberById: (id: string | null | undefined) => Member | undefined;
}

export const AppContext = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp fuera de AppContext');
  return ctx;
}
