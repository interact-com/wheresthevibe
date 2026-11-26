import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useMemo } from 'react';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import { StyleSheet, View } from 'react-native';

import { colors, fonts, radius } from '@/theme';
import type { EventMapProps } from './EventMap';
import { fromPrice } from './EventCard';

// Browser map: Leaflet with CARTO's dark OpenStreetMap tiles.
// (react-native-maps, used on phones, has no web version.)
const TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

const dot = (size: number, color: string) =>
  `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid ${colors.bg};box-sizing:border-box"></div>`;

const eventIcon = L.divIcon({ className: '', html: dot(16, colors.accent), iconSize: [16, 16], iconAnchor: [8, 8] });
const meIcon = L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;border-radius:50%;background:${colors.me};border:3px solid ${colors.bg};box-shadow:0 0 0 8px rgba(76,141,255,0.22);box-sizing:border-box"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function boostedIcon(label: string) {
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:4px;width:180px;height:48px">
      <div style="background:${colors.accent};color:${colors.accentInk};font-family:${fonts.bold},sans-serif;font-size:12px;padding:5px 10px;border-radius:${radius.sm}px;white-space:nowrap;max-width:170px;overflow:hidden;text-overflow:ellipsis;box-shadow:0 0 0 6px rgba(110,203,200,0.2)">${escapeHtml(label)}</div>
      ${dot(16, colors.accent)}
    </div>`,
    // Box is wider than most labels; the pin's dot sits at its bottom centre.
    iconSize: [180, 48],
    iconAnchor: [90, 40],
  });
}

export function EventMap({ events, center, isBoosted, onPressEvent }: EventMapProps) {
  const boostedIcons = useMemo(
    () =>
      new Map(
        events
          .filter((e) => isBoosted(e.id))
          .map((e) => [e.id, boostedIcon(`${e.title.split(' ').slice(0, 2).join(' ')} · ${fromPrice(e).replace('from ', '')}`)]),
      ),
    [events, isBoosted],
  );

  return (
    <View style={styles.wrap} accessibilityLabel="Map of events near you">
      <MapContainer
        center={[center.latitude, center.longitude]}
        zoom={14}
        style={{ height: '100%', width: '100%', background: colors.surfaceAlt }}
        attributionControl
        zoomControl={false}
      >
        <TileLayer url={TILES} attribution={ATTRIBUTION} subdomains="abcd" maxZoom={19} />
        <Marker position={[center.latitude, center.longitude]} icon={meIcon} interactive={false} keyboard={false} />
        {events.map((e) => (
          <Marker
            key={e.id}
            position={[e.latitude, e.longitude]}
            icon={boostedIcons.get(e.id) ?? eventIcon}
            title={e.title}
            alt={e.title}
            eventHandlers={{ click: () => onPressEvent(e.id) }}
          />
        ))}
      </MapContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 260, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt },
});
