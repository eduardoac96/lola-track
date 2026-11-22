import { useState } from 'react';
import { Segmented } from '../../ui/kit';
import { WishesScreen } from '../wishes/WishesScreen';
import { ItemsScreen } from '../items/ItemsScreen';

type GiftsView = 'deseos' | 'listas';
const VIEW_KEY = 'lola:giftsView';

function getView(): GiftsView {
  try {
    return localStorage.getItem(VIEW_KEY) === 'listas' ? 'listas' : 'deseos';
  } catch {
    return 'deseos';
  }
}

/**
 * Regalos: lo que cada quien quiere (Deseos) y lo que vamos a regalar (listas de regalo).
 * Recuerda la última vista por dispositivo.
 */
export function GiftsScreen() {
  const [view, setView] = useState<GiftsView>(getView);
  const change = (v: GiftsView) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* modo privado */
    }
  };
  return (
    <main className="flex flex-col gap-4">
      <h1 className="m-0 text-[30px] font-bold tracking-tight">Regalos</h1>
      <Segmented
        label="Regalos"
        value={view}
        onChange={change}
        options={[
          { value: 'deseos', label: 'Deseos' },
          { value: 'listas', label: 'Para regalar' },
        ]}
      />
      {view === 'deseos' ? <WishesScreen /> : <ItemsScreen scope="gift" />}
    </main>
  );
}
