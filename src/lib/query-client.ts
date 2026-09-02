import { QueryClient } from '@tanstack/react-query';

/**
 * QueryClient global, extraído de app/_layout.tsx pra poder ser importado pelos
 * módulos de fila offline e pela auth.store sem ciclo de import.
 *
 * - `networkMode: 'always'`: queries/mutations sempre executam (mesmo offline) e
 *   falham rápido, servindo o cache. O onlineManager (ligado ao NetInfo em
 *   @/lib/offline-sync) continua disparando o refetch automático das queries
 *   stale quando a conexão volta.
 * - `gcTime` de 14 dias: precisa ser MAIOR que o `maxAge` do persist-client
 *   (7 dias), senão toda query restaurada do disco é coletada imediatamente
 *   antes de qualquer componente consumi-la.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24 * 14,
      networkMode: 'always',
    },
    mutations: {
      networkMode: 'always',
    },
  },
});
