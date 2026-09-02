import React from 'react';
import { onlineManager } from '@tanstack/react-query';

/**
 * `true` quando o React Query considera o app online. O onlineManager já está
 * ligado ao NetInfo em @/lib/offline-sync (`wireOnlineManager`), então isto
 * reflete a conectividade real sem uma segunda subscription no NetInfo.
 */
export function useOnline(): boolean {
  return React.useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline(),
    () => true,
  );
}
