'use client';

import React, { useEffect, useRef } from 'react';
import type { Map as LeafletMap, Marker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { koordinatValid } from '@/lib/geo';

interface LokasiPickerProps {
  lat?: number;
  lng?: number;
  depoLat?: number;
  depoLng?: number;
  onChange: (lat: number, lng: number) => void;
  tinggi?: number;
}

// Pusat awal peta bila belum ada titik: Indonesia
const PUSAT_AWAL: [number, number] = [-2.5, 118];

const PIN_HTML =
  '<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
  '<path d="M15 0C6.7 0 0 6.7 0 15c0 11.3 15 25 15 25s15-13.7 15-25C30 6.7 23.3 0 15 0z" fill="#dc2626" stroke="#ffffff" stroke-width="2"/>' +
  '<circle cx="15" cy="15" r="5.5" fill="#ffffff"/></svg>';

const DEPO_HTML =
  '<div style="width:18px;height:18px;border-radius:50%;background:#0369a1;border:3px solid #ffffff;box-shadow:0 0 0 2px #0369a1"></div>';

// Peta kecil untuk memilih lokasi: ketuk peta atau geser pin. Memakai peta OpenStreetMap (gratis).
export default function LokasiPicker({ lat, lng, depoLat, depoLng, onChange, tinggi = 240 }: LokasiPickerProps) {
  const wadah = useRef<HTMLDivElement>(null);
  const petaRef = useRef<LeafletMap | null>(null);
  const pinRef = useRef<Marker | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Buat peta sekali
  useEffect(() => {
    let batal = false;

    import('leaflet').then(L => {
      if (batal || !wadah.current || petaRef.current) return;
      leafletRef.current = L;

      const adaTitik = koordinatValid(lat, lng);
      const adaDepo = koordinatValid(depoLat, depoLng);
      const pusat: [number, number] = adaTitik ? [lat as number, lng as number] : adaDepo ? [depoLat as number, depoLng as number] : PUSAT_AWAL;
      const zoom = adaTitik ? 17 : adaDepo ? 14 : 5;

      const peta = L.map(wadah.current, { center: pusat, zoom, zoomControl: true });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(peta);

      if (adaDepo) {
        L.marker([depoLat as number, depoLng as number], {
          icon: L.divIcon({ className: '', html: DEPO_HTML, iconSize: [18, 18], iconAnchor: [9, 9] }),
          interactive: false,
          keyboard: false
        }).addTo(peta);
      }

      const pasangPin = (la: number, ln: number) => {
        if (pinRef.current) {
          pinRef.current.setLatLng([la, ln]);
          return;
        }
        const pin = L.marker([la, ln], {
          draggable: true,
          keyboard: false,
          icon: L.divIcon({ className: '', html: PIN_HTML, iconSize: [30, 40], iconAnchor: [15, 40] })
        }).addTo(peta);
        pin.on('dragend', () => {
          const p = pin.getLatLng();
          onChangeRef.current(p.lat, p.lng);
        });
        pinRef.current = pin;
      };

      if (adaTitik) pasangPin(lat as number, lng as number);

      peta.on('click', e => {
        pasangPin(e.latlng.lat, e.latlng.lng);
        onChangeRef.current(e.latlng.lat, e.latlng.lng);
      });

      petaRef.current = peta;
      // Peta di dalam popup: hitung ulang ukuran setelah tampil
      setTimeout(() => peta.invalidateSize(), 250);
    });

    return () => {
      batal = true;
      if (petaRef.current) {
        petaRef.current.remove();
        petaRef.current = null;
        pinRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Titik berubah dari luar (GPS, tautan): pindahkan pin dan pusat peta
  useEffect(() => {
    const peta = petaRef.current;
    const L = leafletRef.current;
    if (!peta || !L) return;

    if (!koordinatValid(lat, lng)) {
      if (pinRef.current) {
        pinRef.current.remove();
        pinRef.current = null;
      }
      return;
    }

    const la = lat as number;
    const ln = lng as number;
    if (pinRef.current) {
      const p = pinRef.current.getLatLng();
      if (Math.abs(p.lat - la) < 1e-9 && Math.abs(p.lng - ln) < 1e-9) return;
      pinRef.current.setLatLng([la, ln]);
    } else {
      const pin = L.marker([la, ln], {
        draggable: true,
        keyboard: false,
        icon: L.divIcon({ className: '', html: PIN_HTML, iconSize: [30, 40], iconAnchor: [15, 40] })
      }).addTo(peta);
      pin.on('dragend', () => {
        const p = pin.getLatLng();
        onChangeRef.current(p.lat, p.lng);
      });
      pinRef.current = pin;
    }
    peta.setView([la, ln], Math.max(peta.getZoom(), 17));
  }, [lat, lng]);

  return (
    <div
      ref={wadah}
      role="application"
      aria-label="Peta untuk memilih lokasi. Ketuk peta atau geser pin merah."
      style={{
        height: `${tinggi}px`, width: '100%', borderRadius: '12px', overflow: 'hidden',
        border: '1px solid var(--glass-border)', position: 'relative', zIndex: 0, isolation: 'isolate'
      }}
    />
  );
}
