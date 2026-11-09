/**
 * Número en el ícono de la app (Badging API). En iOS funciona en la web app instalada
 * una vez que se permitieron las notificaciones; en otros lados no hace nada.
 */
type BadgeNavigator = Navigator & {
  setAppBadge?: (n?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

export async function setBadge(count: number): Promise<void> {
  const nav = navigator as BadgeNavigator;
  try {
    if (count > 0) await nav.setAppBadge?.(count);
    else await nav.clearAppBadge?.();
  } catch {
    /* sin permiso o no soportado: se ignora */
  }
}
