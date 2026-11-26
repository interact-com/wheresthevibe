import { useEffect, useState } from 'react';

import { useStore } from './store';

/** The event with this id, fetching it if it isn't loaded yet (e.g. opened from a shared link). */
export function useEvent(id: string | undefined) {
  const { getEvent, loadEvents } = useStore();
  const event = id ? getEvent(id) : undefined;
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!id || event) return;
    let cancelled = false;
    loadEvents([id])
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setTried(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id, event, loadEvents]);

  return { event, loading: !event && !tried };
}
