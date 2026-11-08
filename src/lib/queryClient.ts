import { MutationCache, QueryClient, type DefaultOptions } from '@tanstack/react-query';

/** Cliente único de datos. Cualquier guardado fallido (ya revertido por el rollback) avisa al usuario. */
export function createQueryClient(queries: DefaultOptions['queries'] = {}): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true, ...queries } },
    mutationCache: new MutationCache({
      onError: () =>
        window.dispatchEvent(new CustomEvent('lola:error', { detail: 'No se guardó. Revisa tu conexión.' })),
    }),
  });
}
