"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import dynamic from "next/dynamic";
import { createClient } from "@/app/lib/client";
import { useToast } from "@/components/toast-provider";
import "leaflet/dist/leaflet.css";

// 🗺️ React Leaflet Dynamic Imports (client-side only)
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
import { useMapEvents, useMap } from "react-leaflet";

// ✅ Leaflet icon fix for Next.js (wrapped in window check)
let L: any = null;
if (typeof window !== "undefined") {
  L = require("leaflet");
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "/leaflet/marker-icon-2x.png",
    iconUrl: "/leaflet/marker-icon.png",
    shadowUrl: "/leaflet/marker-shadow.png",
  });
}

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("farmer");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [godownName, setGodownName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [address, setAddress] = useState("");
  const router = useRouter();
  const { signup } = useAuth();
  const supabase = createClient();
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    const result = await signup(fullName, email, password, phone, role);

    if (result.success) {
      // If Godown Admin — create a godown record
      if (role === "godown_admin") {
        if (!godownName || !capacity || !address || !location) {
          addToast("Please fill all godown details and select a location.", "error");
          setLoading(false);
          return;
        }

        const { error } = await supabase.from("godowns").insert([
          {
            name: godownName,
            address,
            total_capacity_kg: Number(capacity),
            available_capacity_kg: Number(capacity),
            location_latitude: location[0],
            location_longitude: location[1],
            storage_fee_per_day: 100,
            temperature_control: false,
            humidity_control: false,
            admin_id: result.userId,
          },
        ]);

        if (error) console.error("Godown insert error:", error);
      }

      // Redirect by role
      if (role === "godown_admin") router.push("/admin");
      else if (role === "buyer") router.push("/buyer");
      else router.push("/dashboard");
    } else {
      setError(result.error || "Signup failed");
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-6">
      <Card className="w-full max-w-2xl border-2 border-green-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription className="text-green-100">Join AgriVerse</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Label>Full Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />

            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

            <Label>Phone</Label>
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />

            <Label>Role</Label>
            <select
              className="border rounded w-full px-3 py-2"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="farmer">Farmer</option>
              <option value="buyer">Buyer</option>
              <option value="godown_admin">Go-down Admin</option>
            </select>

            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

            <Label>Confirm Password</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />

            {/* Godown Fields */}
            {role === "godown_admin" && (
              <>
                <hr className="my-4" />
                <Label>Godown Name</Label>
                <Input value={godownName} onChange={(e) => setGodownName(e.target.value)} required />

                <Label>Capacity (kg)</Label>
                <Input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} required />

                <Label>Address</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} required />

                <Label>Location</Label>
                <div className="relative h-[300px] mt-2 rounded-lg overflow-hidden">
                  <MapContainer center={location || [30.3753, 69.3451]} zoom={6} className="h-full w-full z-0">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
                    {location && <Marker position={location} />}
                    <MapClickHandler setLocation={setLocation} />
                    <LocateButton setLocation={setLocation} />
                  </MapContainer>
                </div>
              </>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700">
              {loading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="text-green-600 underline hover:text-green-700">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 📍 Map Handlers
function MapClickHandler({ setLocation }: { setLocation: (coords: [number, number]) => void }) {
  useMapEvents({
    click(e: any) {
      const { lat, lng } = e.latlng;
      setLocation([lat, lng]);
    },
  });
  return null;
}

function LocateButton({ setLocation }: { setLocation: (coords: [number, number]) => void }) {
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
        const coords: [number, number] = [latitude, longitude];
        setLocation(coords);
        map.flyTo(coords, 13);
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
      title="میری لوکیشن پر جائیں"
    >
      📍
    </button>
  );
}
