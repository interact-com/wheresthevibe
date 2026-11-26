import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import { BRAAMFONTEIN } from '@/data/sample';
import { distanceKm, type LatLng } from './geo';

/** Your position if you allow it and are near Johannesburg; otherwise Braamfontein (the pilot area). */
export function useUserLocation() {
  const [location, setLocation] = useState<LatLng>(BRAAMFONTEIN);
  const [source, setSource] = useState<'device' | 'default'>('default');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos =
          (await Location.getLastKnownPositionAsync()) ??
          (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
        if (cancelled || !pos) return;
        const here = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        // The pilot is in Johannesburg: far away, Discover would be empty, so keep Braamfontein.
        if (distanceKm(here, BRAAMFONTEIN) < 50) {
          setLocation(here);
          setSource('device');
        }
      } catch {
        // Keep the default location.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { location, source };
}
