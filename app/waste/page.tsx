"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/auth-context";
import { createClient } from "@/app/lib/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, MapPin, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/components/toast-provider";

// ✅ Map components
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
import { useMapEvents, useMap } from "react-leaflet";

// ✅ Leaflet marker setup
let L: any;
if (typeof window !== "undefined") L = require("leaflet");

let markerIcon: any = null;
if (typeof window !== "undefined" && L) {
  markerIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
}

// ==================== Interfaces ====================
interface Waste {
  waste_id: string;
  farmer_id: string;
  buyer_id?: string | null;
  waste_type: string;
  quantity_kg: number;
  price: number;
  description?: string;
  location_latitude?: number;
  location_longitude?: number;
  is_sold: boolean;
  // 👇 add this line — the joined user info from Supabase
  users?: {
    full_name?: string;
    phone?: string;
  };
}


// ==================== Component ====================
export default function WastePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState("add");
  const [wastes, setWastes] = useState<Waste[]>([]);
  const [editItem, setEditItem] = useState<Waste | null>(null);

  const [wasteType, setWasteType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<[number, number] | null>(null);

  const [mapModal, setMapModal] = useState<{ isOpen: boolean; lat?: number; lng?: number }>({ isOpen: false });

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) fetchWastes();
  }, [user]);

  const fetchWastes = async () => {
  const { data, error } = await supabase
  .from("wastes")
  .select("*, users:farmer_id(full_name, phone)")
  .order("created_at", { ascending: false });
    if (error) addToast("خرابی: " + error.message, "error");
    else if (data) setWastes(data);
  };

  const resetForm = () => {
    setWasteType("");
    setQuantity("");
    setPrice("");
    setDescription("");
    setLocation(null);
    setEditItem(null);
  };

  const handleSaveWaste = async () => {
    if (!wasteType || !quantity || !price) {
      addToast("براہ کرم لازمی معلومات درج کریں", "error");
      return;
    }

    const payload = {
      farmer_id: user?.id,
      waste_type: wasteType,
      quantity_kg: Number(quantity),
      price: Number(price),
      description: description || null,
      location_latitude: location ? location[0] : null,
      location_longitude: location ? location[1] : null,
      is_sold: false,
    };

    let error;
    if (editItem) ({ error } = await supabase.from("wastes").update(payload).eq("waste_id", editItem.waste_id));
    else ({ error } = await supabase.from("wastes").insert(payload));

    if (error) return addToast("خرابی: " + error.message, "error");

    addToast(editItem ? "فضلہ اپڈیٹ کر دیا گیا ✓" : "فضلہ شامل کر دیا گیا ✓", "success");
    resetForm();
    fetchWastes();
  };

  const handleDeleteWaste = async (id: string) => {
    const { error } = await supabase.from("wastes").delete().eq("waste_id", id);
    if (error) addToast("خرابی: " + error.message, "error");
    else {
      addToast("فضلہ حذف کر دیا گیا ✓", "success");
      fetchWastes();
    }
  };

  const handleBuyWaste = async (w: Waste) => {
    const { error } = await supabase
      .from("wastes")
      .update({ is_sold: true, buyer_id: user?.id })
      .eq("waste_id", w.waste_id);

    if (error) addToast("خرابی: " + error.message, "error");
    else {
      addToast("فضلہ خریدا گیا ✓", "success");
      fetchWastes();
    }
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="border-b bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-green-700">فضلہ مینجمنٹ</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="add">مارکیٹ میں بھیجیں</TabsTrigger>
            <TabsTrigger value="buy">فضلہ خریدیں</TabsTrigger>
            <TabsTrigger value="mine">میرا ریکارڈ</TabsTrigger>
          </TabsList>

          {/* Add Waste */}
          <TabsContent value="add">
            <Card>
              <CardHeader>
                <CardTitle>{editItem ? "فضلہ ترمیم کریں" : "نیا فضلہ شامل کریں"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Label>فضلہ کی قسم</Label>
                <Input value={wasteType || editItem?.waste_type || ""} onChange={(e) => setWasteType(e.target.value)} />

                <Label>مقدار (کلوگرام)</Label>
                <Input type="number" value={quantity || editItem?.quantity_kg || ""} onChange={(e) => setQuantity(e.target.value)} />

                <Label>قیمت (روپے)</Label>
                <Input type="number" value={price || editItem?.price || ""} onChange={(e) => setPrice(e.target.value)} />

                <Label>تفصیل (اختیاری)</Label>
                <Textarea value={description || editItem?.description || ""} onChange={(e) => setDescription(e.target.value)} />

                <Label>مقام منتخب کریں</Label>
                <div className="relative h-[400px] mt-2 rounded-lg overflow-hidden">
                  <MapContainer center={location || [30.3753, 69.3451]} zoom={6} className="h-full w-full z-0">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
                    {location && <Marker position={location} icon={markerIcon} />}
                    <MapClickHandler setLocation={setLocation} />
                    <LocateButton setLocation={setLocation} />
                  </MapContainer>
                </div>

                <Button onClick={handleSaveWaste} className="w-full bg-green-700 hover:bg-green-800">
                  {editItem ? "اپڈیٹ کریں" : "مارکیٹ میں شامل کریں"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Buy Waste */}
          <TabsContent value="buy">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wastes
                .filter((w) => !w.is_sold && w.farmer_id !== user?.id)
                .map((w) => (
                  <Card key={w.waste_id}>
                    <CardHeader className="flex justify-between items-start">
                      <CardTitle>{w.waste_type}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>مقدار: {w.quantity_kg} کلوگرام</p>
                      <p>قیمت: {w.price} روپے</p>
                      <p>رابطہ نمبر: {w.users?.phone || "دستیاب نہیں"}</p>
                      {w.description && <p>تفصیل: {w.description}</p>}
                      <Button
                        className="mt-2 w-full bg-gray-600 hover:bg-gray-700"
                        onClick={() => setMapModal({ isOpen: true, lat: w.location_latitude!, lng: w.location_longitude! })}
                      >
                        <MapPin className="w-4 h-4 mr-2" /> مقام دیکھیں
                      </Button>
                      <Button className="mt-2 w-full bg-green-600 hover:bg-green-700" onClick={() => handleBuyWaste(w)}>
                        خریدیں
                      </Button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>

          {/* My Record */}
          <TabsContent value="mine">
            <h2 className="text-xl font-bold mb-4 text-green-700">میرا ریکارڈ</h2>

            {/* My Added Waste */}
            <h3 className="text-lg font-semibold mb-2 text-gray-700">میرے شامل کردہ فضلے</h3>
            {wastes.filter((w) => w.farmer_id === user?.id).length === 0 ? (
              <p className="mb-6">آپ نے کوئی فضلہ شامل نہیں کیا۔</p>
            ) : (
              wastes
                .filter((w) => w.farmer_id === user?.id)
                .map((w) => (
                  <Card key={w.waste_id} className="mb-3">
                    <CardHeader className="flex justify-between items-start">
                      <CardTitle>{w.waste_type}</CardTitle>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setEditItem(w)}>
                          <Pencil className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteWaste(w.waste_id)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p>مقدار: {w.quantity_kg} کلوگرام</p>
                      <p>قیمت: {w.price} روپے</p>
                      <p>{w.is_sold ? "فروخت شدہ" : "دستیاب"}</p>
                    </CardContent>
                  </Card>
                ))
            )}

            <hr className="my-6 border-t border-gray-300" />

            {/* My Purchased Waste */}
            <h3 className="text-lg font-semibold mb-2 text-gray-700">میرے خریدے گئے فضلے</h3>
            {wastes.filter((w) => w.buyer_id === user?.id).length === 0 ? (
              <p>آپ نے کوئی فضلہ نہیں خریدا۔</p>
            ) : (
              wastes
                .filter((w) => w.buyer_id === user?.id)
                .map((w) => (
                  <Card key={w.waste_id} className="mb-3">
                    <CardHeader>
                      <CardTitle>{w.waste_type}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>مقدار: {w.quantity_kg} کلوگرام</p>
                      <p>قیمت: {w.price} روپے</p>
                      <Button
                        className="mt-2 w-full bg-gray-600 hover:bg-gray-700"
                        onClick={() =>
                          setMapModal({ isOpen: true, lat: w.location_latitude!, lng: w.location_longitude! })
                        }
                      >
                        مقام دیکھیں
                      </Button>
                    </CardContent>
                  </Card>
                ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Map Modal */}
      {mapModal.isOpen && mapModal.lat && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[2000]">
          <div className="bg-white rounded-lg p-4 w-[90%] md:w-[600px] h-[500px] relative">
            <Button className="absolute top-2 right-2 z-[2001]" variant="outline" onClick={() => setMapModal({ isOpen: false })}>
              بند کریں
            </Button>
            <MapContainer center={[mapModal.lat!, mapModal.lng!]} zoom={13} className="h-full w-full rounded-lg">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
              <Marker position={[mapModal.lat!, mapModal.lng!]} icon={markerIcon} />
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// Map Handlers
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
