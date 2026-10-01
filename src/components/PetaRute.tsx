'use client';

import React, { useEffect, useRef } from 'react';
import type { Map as LeafletMap, LayerGroup } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { koordinatValid } from '@/lib/geo';

export interface PerhentianPeta {
  nomor: number;
  id: string;
  lat: number;
  lng: number;
  nama: string;
}

interface PetaRuteProps {
  perhentian: PerhentianPeta[];
  depoLat?: number;
  depoLng?: number;
  tinggi?: number;
}

const DEPO_HTML =
  '<div style="width:20px;height:20px;border-radius:50%;background:#0369a1;border:3px solid #ffffff;box-shadow:0 0 0 2px #0369a1"></div>';

// Peta rute antaran: titik bernomor sesuai urutan, garis menghubungkan depo ke perhentian pertama dan seterusnya.
export default function PetaRute({ perhentian, depoLat, depoLng, tinggi = 300 }: PetaRuteProps) {
  const wadah = useRef<HTMLDivElement>(null);
  const petaRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const [siap, setSiap] = React.useState(false);

  useEffect(() => {
    let batal = false;
    import('leaflet').then(L => {
      if (batal || !wadah.current || petaRef.current) return;
      leafletRef.current = L;
      const peta = L.map(wadah.current, { center: [-2.5, 118], zoom: 5 });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(peta);
      layerRef.current = L.layerGroup().addTo(peta);
      petaRef.current = peta;
      setSiap(true);
      setTimeout(() => { if (petaRef.current === peta) peta.invalidateSize(); }, 250);
    });
    return () => {
      batal = true;
      if (petaRef.current) {
        petaRef.current.remove();
        petaRef.current = null;
        layerRef.current = null;
      }
      setSiap(false);
    };
  }, []);

  useEffect(() => {
    const peta = petaRef.current;
    const L = leafletRef.current;
    const layer = layerRef.current;
    if (!peta || !L || !layer) return;
    layer.clearLayers();

    const garis: [number, number][] = [];
    if (koordinatValid(depoLat, depoLng)) {
      const pusat: [number, number] = [depoLat as number, depoLng as number];
      garis.push(pusat);
      L.marker(pusat, {
        icon: L.divIcon({ className: '', html: DEPO_HTML, iconSize: [20, 20], iconAnchor: [10, 10] }),
        interactive: false, keyboard: false, title: 'Depo'
      }).addTo(layer);
    }
    perhentian.forEach(p => {
      garis.push([p.lat, p.lng]);
      const html =
        `<div style="width:30px;height:30px;border-radius:50%;background:#dc2626;color:#ffffff;border:3px solid #ffffff;` +
        `display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;box-shadow:0 1px 6px rgba(0,0,0,0.45)">${p.nomor}</div>`;
      L.marker([p.lat, p.lng], {
        icon: L.divIcon({ className: '', html, iconSize: [30, 30], iconAnchor: [15, 15] }),
        keyboard: false,
        title: `${p.nomor}. ${p.nama}`
      }).addTo(layer);
    });
    if (garis.length > 1) L.polyline(garis, { color: '#0369a1', weight: 3, dashArray: '8 6', interactive: false }).addTo(layer);
    if (garis.length > 0) peta.fitBounds(L.latLngBounds(garis), { padding: [40, 40], maxZoom: 16 });
  }, [perhentian, depoLat, depoLng, siap]);

  return (
    <div
      ref={wadah}
      role="application"
      aria-label="Peta rute antaran. Nomor merah menunjukkan urutan perhentian."
      style={{
        height: `${tinggi}px`, width: '100%', borderRadius: '14px', overflow: 'hidden',
        border: '1px solid var(--glass-border)', position: 'relative', zIndex: 0, isolation: 'isolate'
      }}
    />
  );
}
