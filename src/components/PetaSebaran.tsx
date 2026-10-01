'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, LayerGroup } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { koordinatValid } from '@/lib/geo';

export interface TitikPeta {
  id: string;
  lat: number;
  lng: number;
  nama: string;
  warna: string;
}

export interface CincinZona {
  nama: string;
  km: number;
  warna: string;
}

interface PetaSebaranProps {
  titik: TitikPeta[];
  depoLat?: number;
  depoLng?: number;
  cincin: CincinZona[];
  pilihId?: string | null;
  onPilih: (id: string) => void;
  tinggi?: number;
}

const PUSAT_AWAL: [number, number] = [-2.5, 118];
const UKURAN_SEL_PX = 56; // titik yang berdekatan dalam kotak sebesar ini digabung jadi satu kelompok

const DEPO_HTML =
  '<div style="width:20px;height:20px;border-radius:50%;background:#0369a1;border:3px solid #ffffff;box-shadow:0 0 0 2px #0369a1"></div>';

// Peta sebaran pelanggan (OpenStreetMap). Titik yang berdekatan dikelompokkan otomatis sesuai zoom.
export default function PetaSebaran({ titik, depoLat, depoLng, cincin, pilihId, onPilih, tinggi = 420 }: PetaSebaranProps) {
  const wadah = useRef<HTMLDivElement>(null);
  const petaRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const titikLayer = useRef<LayerGroup | null>(null);
  const cincinLayer = useRef<LayerGroup | null>(null);
  const sudahFit = useRef(false);
  const [siap, setSiap] = useState(false); // peta sudah dibuat (Leaflet dimuat async)
  const titikRef = useRef(titik);
  const pilihRef = useRef(pilihId);
  const onPilihRef = useRef(onPilih);
  titikRef.current = titik;
  pilihRef.current = pilihId;
  onPilihRef.current = onPilih;

  const gambarTitik = () => {
    const peta = petaRef.current;
    const L = leafletRef.current;
    const layer = titikLayer.current;
    if (!peta || !L || !layer) return;
    layer.clearLayers();

    // Kelompokkan berdasarkan kotak piksel di layar
    const sel = new Map<string, { titik: TitikPeta[]; x: number; y: number }>();
    titikRef.current.forEach(t => {
      const p = peta.latLngToContainerPoint([t.lat, t.lng]);
      const kunci = `${Math.floor(p.x / UKURAN_SEL_PX)}:${Math.floor(p.y / UKURAN_SEL_PX)}`;
      const s = sel.get(kunci);
      if (s) s.titik.push(t);
      else sel.set(kunci, { titik: [t], x: p.x, y: p.y });
    });

    sel.forEach(s => {
      if (s.titik.length === 1) {
        const t = s.titik[0];
        const terpilih = pilihRef.current === t.id;
        const ukuran = terpilih ? 26 : 20;
        const html =
          `<div style="width:${ukuran}px;height:${ukuran}px;border-radius:50%;background:${t.warna};border:3px solid #ffffff;` +
          `box-shadow:0 0 0 ${terpilih ? 3 : 1}px ${terpilih ? '#0f172a' : 'rgba(15,23,42,0.45)'}"></div>`;
        const m = L.marker([t.lat, t.lng], {
          icon: L.divIcon({ className: '', html, iconSize: [ukuran, ukuran], iconAnchor: [ukuran / 2, ukuran / 2] }),
          keyboard: false,
          title: t.nama
        });
        m.on('click', () => onPilihRef.current(t.id));
        m.addTo(layer);
      } else {
        const lat = s.titik.reduce((a, t) => a + t.lat, 0) / s.titik.length;
        const lng = s.titik.reduce((a, t) => a + t.lng, 0) / s.titik.length;
        const ukuran = s.titik.length >= 100 ? 50 : s.titik.length >= 10 ? 44 : 38;
        const html =
          `<div style="width:${ukuran}px;height:${ukuran}px;border-radius:50%;background:#0f172a;color:#ffffff;border:3px solid #ffffff;` +
          `display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;box-shadow:0 1px 6px rgba(0,0,0,0.4)">${s.titik.length}</div>`;
        const m = L.marker([lat, lng], {
          icon: L.divIcon({ className: '', html, iconSize: [ukuran, ukuran], iconAnchor: [ukuran / 2, ukuran / 2] }),
          keyboard: false,
          title: `${s.titik.length} pelanggan, ketuk untuk memperbesar`
        });
        m.on('click', () => {
          const batas = L.latLngBounds(s.titik.map(t => [t.lat, t.lng] as [number, number]));
          // Semua titik di tempat yang sama: zoom mentok, buka titik pertama
          if (batas.getNorthEast().equals(batas.getSouthWest()) || peta.getZoom() >= 18) {
            peta.setView(batas.getCenter(), 19);
            return;
          }
          peta.fitBounds(batas, { padding: [50, 50], maxZoom: 19 });
        });
        m.addTo(layer);
      }
    });
  };

  // Buat peta sekali
  useEffect(() => {
    let batal = false;
    import('leaflet').then(L => {
      if (batal || !wadah.current || petaRef.current) return;
      leafletRef.current = L;
      const adaDepo = koordinatValid(depoLat, depoLng);
      const peta = L.map(wadah.current, {
        center: adaDepo ? [depoLat as number, depoLng as number] : PUSAT_AWAL,
        zoom: adaDepo ? 13 : 5
      });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(peta);
      cincinLayer.current = L.layerGroup().addTo(peta);
      titikLayer.current = L.layerGroup().addTo(peta);
      peta.on('zoomend moveend', gambarTitik);
      petaRef.current = peta;
      setSiap(true);
      setTimeout(() => { if (petaRef.current === peta) { peta.invalidateSize(); gambarTitik(); } }, 250);
    });
    return () => {
      batal = true;
      if (petaRef.current) {
        petaRef.current.remove();
        petaRef.current = null;
        titikLayer.current = null;
        cincinLayer.current = null;
        sudahFit.current = false;
      }
      setSiap(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Depo dan cincin zona
  useEffect(() => {
    const peta = petaRef.current;
    const L = leafletRef.current;
    const layer = cincinLayer.current;
    if (!peta || !L || !layer) return;
    layer.clearLayers();
    if (!koordinatValid(depoLat, depoLng)) return;
    const pusat: [number, number] = [depoLat as number, depoLng as number];
    cincin.forEach(c => {
      L.circle(pusat, { radius: c.km * 1000, color: c.warna, weight: 2, dashArray: '6 6', fill: false, interactive: false })
        .bindTooltip(`${c.nama} (${c.km} km)`, { permanent: false })
        .addTo(layer);
    });
    L.marker(pusat, {
      icon: L.divIcon({ className: '', html: DEPO_HTML, iconSize: [20, 20], iconAnchor: [10, 10] }),
      interactive: false, keyboard: false, title: 'Depo'
    }).addTo(layer);
  }, [cincin, depoLat, depoLng, siap]);

  // Titik atau pilihan berubah: gambar ulang; arahkan peta ke semua titik saat pertama kali ada data
  useEffect(() => {
    const peta = petaRef.current;
    const L = leafletRef.current;
    if (!peta || !L) return;
    if (!sudahFit.current && titik.length > 0) {
      sudahFit.current = true;
      const pts = titik.map(t => [t.lat, t.lng] as [number, number]);
      if (koordinatValid(depoLat, depoLng)) pts.push([depoLat as number, depoLng as number]);
      peta.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 16 });
    }
    gambarTitik();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titik, pilihId, siap]);

  return (
    <div
      ref={wadah}
      role="application"
      aria-label="Peta sebaran pelanggan. Ketuk titik untuk melihat detail pelanggan."
      style={{
        height: `${tinggi}px`, width: '100%', borderRadius: '14px', overflow: 'hidden',
        border: '1px solid var(--glass-border)', position: 'relative', zIndex: 0, isolation: 'isolate'
      }}
    />
  );
}
