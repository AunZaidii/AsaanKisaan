"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { ArrowLeft, Trash2, Pencil, MapPin } from "lucide-react";
import { useToast } from "@/components/toast-provider";
import { useMap, useMapEvents } from "react-leaflet";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });

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

interface Waste {
  waste_id: string;
  farmer_id: string;
  waste_type: string;
  quantity_kg: number;
  price: number;
  suggested_use?: string;
  reuse_as?: string;
  location_latitude?: number;
  location_longitude?: number;
  is_sold: boolean;
}

interface Sale {
  sale_id: string;
  waste_id: string;
  buyer_id: string;
  quantity_purchased: number;
  total_price: number;
  payment_status: string;
  purchase_date: string;
  waste_type?: string;
}

// ============================ Map Subcomponents ============================
function MapClickHandler({ setLocation }: { setLocation: (coords: [number, number]) => void }) {
  useMapEvents({
    click(e) {
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

// ============================ Main Component ============================
export default function WastePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useToast();

  const [wastes, setWastes] = useState<Waste[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [activeTab, setActiveTab] = useState("list");

  // Form fields
  const [wasteType, setWasteType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [suggestedUse, setSuggestedUse] = useState("");
  const [reuseAs, setReuseAs] = useState("");
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [editItem, setEditItem] = useState<Waste | null>(null);
  const [mapModal, setMapModal] = useState<{ isOpen: boolean; lat?: number; lng?: number }>({ isOpen: false });

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const fetchData = async () => {
    const [wastesRes, salesRes] = await Promise.all([
      supabase.from("wastes").select("*").order("created_at", { ascending: false }),
      supabase.from("waste_sales").select("*").eq("buyer_id", user?.id),
    ]);
    if (wastesRes.data) setWastes(wastesRes.data);
    if (salesRes.data) setSales(salesRes.data);
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  // Auto-detect user’s location initially
  useEffect(() => {
    if (!location && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setLocation([latitude, longitude]);
        },
        () => console.warn("لوکیشن دستیاب نہیں۔"),
        { enableHighAccuracy: true }
      );
    }
  }, [location]);

  // ============================ Save Waste ============================
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
      suggested_use: suggestedUse || null,
      reuse_as: reuseAs || null,
      location_latitude: location ? location[0] : null,
      location_longitude: location ? location[1] : null,
      is_sold: false,
    };

    let error;
    if (editItem) {
      ({ error } = await supabase.from("wastes").update(payload).eq("waste_id", editItem.waste_id));
    } else {
      ({ error } = await supabase.from("wastes").insert(payload));
    }

    if (error) return addToast("خرابی: " + error.message, "error");

    addToast(editItem ? "فضلہ اپڈیٹ کر دیا گیا ✓" : "فضلہ شامل کر دیا گیا ✓", "success");
    resetForm();
    fetchData();
  };

  const resetForm = () => {
    setWasteType("");
    setQuantity("");
    setPrice("");
    setSuggestedUse("");
    setReuseAs("");
    setLocation(null);
    setEditItem(null);
    setActiveTab("list");
  };

  // ============================ Delete Waste ============================
  const handleDeleteWaste = async (id: string) => {
    const { error } = await supabase.from("wastes").delete().eq("waste_id", id);
    if (error) return addToast("خرابی: " + error.message, "error");
    addToast("فضلہ حذف کر دیا گیا ✓", "success");
    fetchData();
  };

  // ============================ Buy Waste ============================
  const handleBuyWaste = async (waste: Waste) => {
    const { error } = await supabase.from("waste_sales").insert({
      waste_id: waste.waste_id,
      buyer_id: user?.id,
      quantity_purchased: waste.quantity_kg,
      total_price: waste.price,
      payment_status: "pending",
    });

    if (error) return addToast("خرابی: " + error.message, "error");

    await supabase.from("wastes").update({ is_sold: true }).eq("waste_id", waste.waste_id);
    addToast("فضلہ خریدا گیا ✓", "success");
    fetchData();
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
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="list">فضلہ</TabsTrigger>
            <TabsTrigger value="add">شامل / ترمیم کریں</TabsTrigger>
            <TabsTrigger value="mine">میرا فضلہ</TabsTrigger>
            <TabsTrigger value="purchases">میری خریداری</TabsTrigger>
          </TabsList>

          {/* Waste List */}
          <TabsContent value="list">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wastes.map((w) => (
                <Card key={w.waste_id}>
                  <CardHeader className="flex justify-between items-start">
                    <CardTitle>{w.waste_type}</CardTitle>
                    {w.farmer_id === user?.id && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setEditItem(w)}>
                          <Pencil className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteWaste(w.waste_id)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p>مقدار: {w.quantity_kg} کلوگرام</p>
                    <p>قیمت: {w.price} روپے</p>
                    {w.suggested_use && <p>استعمال کی تجویز: {w.suggested_use}</p>}
                    {w.reuse_as && <p>دوبارہ استعمال: {w.reuse_as}</p>}
                    <p className={`font-semibold ${w.is_sold ? "text-red-600" : "text-green-700"}`}>
                      {w.is_sold ? "فروخت شدہ" : "دستیاب"}
                    </p>
                    {w.location_latitude && (
                      <Button
                        className="mt-2 w-full bg-gray-600 hover:bg-gray-700"
                        onClick={() =>
                          setMapModal({
                            isOpen: true,
                            lat: w.location_latitude!,
                            lng: w.location_longitude!,
                          })
                        }
                      >
                        <MapPin className="w-4 h-4 mr-2" />
                        مقام دیکھیں
                      </Button>
                    )}
                    {w.farmer_id !== user?.id && !w.is_sold && (
                      <Button className="mt-2 w-full bg-green-600 hover:bg-green-700" onClick={() => handleBuyWaste(w)}>
                        خریدیں
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Add/Edit Waste */}
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
                <Label>استعمال کی تجویز (اختیاری)</Label>
                <Textarea value={suggestedUse || editItem?.suggested_use || ""} onChange={(e) => setSuggestedUse(e.target.value)} />
                <Label>دوبارہ استعمال کے طور پر (اختیاری)</Label>
                <Textarea value={reuseAs || editItem?.reuse_as || ""} onChange={(e) => setReuseAs(e.target.value)} />
                <Label>مقام منتخب کریں</Label>
                <div className="relative h-[400px] mt-2">
                  <MapContainer center={location || [30.3753, 69.3451]} zoom={6} className="h-full w-full rounded-lg z-0">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
                    {location && <Marker position={location} icon={markerIcon} />}
                    <MapClickHandler setLocation={setLocation} />
                    <LocateButton setLocation={setLocation} />
                  </MapContainer>
                </div>
                <Button onClick={handleSaveWaste} className="w-full bg-green-700 hover:bg-green-800">
                  {editItem ? "تبدیل کریں" : "شامل کریں"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Waste */}
          <TabsContent value="mine">
            {wastes.filter((w) => w.farmer_id === user?.id).length === 0 ? (
              <p>آپ نے ابھی تک کوئی فضلہ شامل نہیں کیا۔</p>
            ) : (
              wastes
                .filter((w) => w.farmer_id === user?.id)
                .map((w) => (
                  <Card key={w.waste_id} className="mb-3">
                    <CardHeader>
                      <CardTitle>{w.waste_type}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>مقدار: {w.quantity_kg} کلوگرام</p>
                      <p>قیمت: {w.price} روپے</p>
                      <p>{w.is_sold ? "فروخت شدہ" : "دستیاب"}</p>
                    </CardContent>
                  </Card>
                ))
            )}
          </TabsContent>

          {/* Purchases */}
          <TabsContent value="purchases">
            {sales.length === 0 ? (
              <p>کوئی خریداری نہیں ملی۔</p>
            ) : (
              sales.map((s) => (
                <Card key={s.sale_id} className="mb-3">
                  <CardHeader>
                    <CardTitle>{s.waste_type || "فضلہ"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>خریداری کی تاریخ: {new Date(s.purchase_date).toLocaleDateString("ur-PK")}</p>
                    <p>کل قیمت: {s.total_price} روپے</p>
                    <p>ادائیگی: {s.payment_status}</p>
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
