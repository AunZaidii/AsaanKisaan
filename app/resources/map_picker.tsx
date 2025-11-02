"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

interface MapPickerProps {
  onSelect: (lat: number, lng: number) => void;
}

// 🔴 Selected-location icon
const redIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

// 🔵 Current-location icon
const blueIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/535/535239.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

export default function MapPicker({ onSelect }: MapPickerProps) {
  const [selectedPos, setSelectedPos] = useState<[number, number] | null>(null);
  const [currentPos, setCurrentPos] = useState<[number, number] | null>(null);
  const [hasLocated, setHasLocated] = useState(false);

  // 🌍 Auto-center once on load
  useEffect(() => {
    if (!hasLocated && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setCurrentPos([latitude, longitude]);
          onSelect(latitude, longitude);
          setHasLocated(true);
        },
        (err) => console.warn("Location access denied:", err),
        { enableHighAccuracy: true }
      );
    }
  }, [hasLocated, onSelect]);

  return (
    <div className="relative w-full h-[400px] rounded-lg overflow-hidden">
      <MapContainer
        center={selectedPos || currentPos || [30.3753, 69.3451]}
        zoom={6}
        className="h-full w-full z-0"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap"
        />

        {/* 🟦 Current location marker (if exists) */}
        {currentPos && <Marker position={currentPos} icon={blueIcon} />}

        {/* 🔴 Selected location marker */}
        {selectedPos && <Marker position={selectedPos} icon={redIcon} />}

        <MapClickHandler
          setSelectedPos={setSelectedPos}
          setCurrentPos={setCurrentPos}
          onSelect={onSelect}
        />

        <LocateButton
          setCurrentPos={setCurrentPos}
          setSelectedPos={setSelectedPos}
          onSelect={onSelect}
        />
      </MapContainer>
    </div>
  );
}

// 🖱️ Map click handler
function MapClickHandler({
  setSelectedPos,
  setCurrentPos,
  onSelect,
}: {
  setSelectedPos: (pos: [number, number]) => void;
  setCurrentPos: (pos: [number, number] | null) => void;
  onSelect: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;

      // 🧹 Clear current location marker when selecting manually
      setCurrentPos(null);

      // 🔴 Set new selected position
      setSelectedPos([lat, lng]);
      onSelect(lat, lng);

      // Center map
      map.flyTo([lat, lng], 13, { animate: true });
    },
  });

  return null;
}

// 📍 My Location button
function LocateButton({
  setCurrentPos,
  setSelectedPos,
  onSelect,
}: {
  setCurrentPos: (pos: [number, number]) => void;
  setSelectedPos: (pos: [number, number] | null) => void;
  onSelect: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  const locateUser = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!navigator.geolocation) {
      alert("⚠️ آپ کا براؤزر لوکیشن سپورٹ نہیں کرتا۔");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;

        // 🧹 Remove any selected marker
        setSelectedPos(null);

        // 🟦 Set current location marker
        const newPos: [number, number] = [latitude, longitude];
        setCurrentPos(newPos);
        onSelect(latitude, longitude);
        map.flyTo(newPos, 13, { animate: true });
      },
      (err) => {
        console.error(err);
        alert("⚠️ لوکیشن حاصل نہیں ہو سکی۔ براہ کرم اجازت دیں۔");
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <button
      onClick={locateUser}
      className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-full shadow-md z-[1001]"
      style={{ pointerEvents: "auto" }}
      title="میری لوکیشن پر جائیں"
    >
      📍
    </button>
  );
}
