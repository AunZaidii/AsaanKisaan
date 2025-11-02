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
import { ArrowLeft, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/components/toast-provider";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { useMap, useMapEvents } from "react-leaflet";

// ✅ Dynamic imports for react-leaflet components
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });

// ✅ Leaflet setup
let L: any;
if (typeof window !== "undefined") {
  L = require("leaflet");
}

let markerIcon: any = null;
if (typeof window !== "undefined" && L) {
  markerIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
}

// ============================ Interfaces ============================
interface Tool {
  tool_id: string;
  name: string;
  description: string;
  rent_price_per_day: number;
  availability_status: string;
  owner_id: string;
  location_latitude?: number;
  location_longitude?: number;
}

interface Booking {
  booking_id: string;
  tool_id: string;
  renter_id: string;
  start_date: string;
  end_date: string;
  total_cost: number;
  payment_status: string;
  tool_name?: string;
}

// ============================ Map Handlers ============================
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
export default function ToolsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useToast();

  const [tools, setTools] = useState<Tool[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState("tools-list");

  // Add Tool Form
  const [toolName, setToolName] = useState("");
  const [toolDesc, setToolDesc] = useState("");
  const [toolPrice, setToolPrice] = useState("");
  const [location, setLocation] = useState<[number, number] | null>(null);

  const [bookingModal, setBookingModal] = useState<{ isOpen: boolean; item: Tool | null }>({
    isOpen: false,
    item: null,
  });

  const [editModal, setEditModal] = useState<{ isOpen: boolean; item: Tool | null }>({
    isOpen: false,
    item: null,
  });

  // ============================ Auth & Data ============================
  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    const [toolsRes, bookingsRes] = await Promise.all([
      supabase.from("tools").select("*"),
      supabase.from("tool_bookings").select("*").eq("renter_id", user?.id).neq("payment_status", "cancelled"),
    ]);

    if (toolsRes.data) setTools(toolsRes.data);

    if (bookingsRes.data && toolsRes.data) {
      const enriched = bookingsRes.data.map((b: Booking) => ({
        ...b,
        tool_name: toolsRes.data.find((t: Tool) => t.tool_id === b.tool_id)?.name,
      }));
      setBookings(enriched);
    }
  };

  // ============================ Auto-detect Location ============================
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

  // ============================ CRUD ============================
  const handleAddTool = async () => {
    if (!toolName || !toolPrice) {
      addToast("براہ کرم نام اور کرایہ درج کریں", "error");
      return;
    }

    const { error } = await supabase.from("tools").insert({
      owner_id: user?.id,
      name: toolName,
      description: toolDesc,
      rent_price_per_day: Number(toolPrice),
      availability_status: "available",
      location_latitude: location ? location[0] : null,
      location_longitude: location ? location[1] : null,
    });

    if (error) {
      addToast("خرابی: " + error.message, "error");
      return;
    }

    setToolName("");
    setToolDesc("");
    setToolPrice("");
    setLocation(null);
    addToast("اوزار کامیابی سے شامل ہو گیا ✓", "success");
    fetchData();
  };

  const handleDeleteTool = async (toolId: string) => {
    const { error } = await supabase.from("tools").delete().eq("tool_id", toolId);
    if (error) return addToast("خرابی: " + error.message, "error");
    addToast("اوزار ہٹا دیا گیا ✓", "success");
    fetchData();
  };

  const handleBookTool = async (tool: Tool) => {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 1);

    const { error } = await supabase.from("tool_bookings").insert({
      tool_id: tool.tool_id,
      renter_id: user?.id,
      start_date: today.toISOString(),
      end_date: endDate.toISOString(),
      total_cost: tool.rent_price_per_day,
      payment_status: "pending",
    });

    if (error) {
      addToast("خرابی: " + error.message, "error");
      return;
    }

    await supabase.from("tools").update({ availability_status: "rented" }).eq("tool_id", tool.tool_id);
    addToast("اوزار بک ہو گیا ✓", "success");
    fetchData();
  };

  const handleCancelBooking = async (booking: Booking) => {
    const { error } = await supabase
      .from("tool_bookings")
      .update({ payment_status: "cancelled" })
      .eq("booking_id", booking.booking_id);
    if (error) return addToast("خرابی: " + error.message, "error");

    await supabase.from("tools").update({ availability_status: "available" }).eq("tool_id", booking.tool_id);
    addToast("بکنگ منسوخ کر دی گئی ✓", "success");
    fetchData();
  };

  // ============================ Render ============================
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
          <h1 className="text-2xl font-bold text-blue-700">اوزار شیئرنگ</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="tools-list">اوزار</TabsTrigger>
            <TabsTrigger value="add-tool">اوزار شامل کریں</TabsTrigger>
            <TabsTrigger value="bookings">میری بکنگز</TabsTrigger>
          </TabsList>

          {/* TOOLS LIST */}
          <TabsContent value="tools-list">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tools.map((tool) => (
                <Card key={tool.tool_id}>
                  <CardHeader className="flex justify-between">
                    <CardTitle>{tool.name}</CardTitle>
                    {tool.owner_id === user?.id && (
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteTool(tool.tool_id)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p>{tool.description}</p>
                    <p className="font-bold mt-2">{tool.rent_price_per_day} روپے / دن</p>
                    <Button
                      className="mt-2 w-full"
                      disabled={tool.owner_id === user?.id || tool.availability_status !== "available"}
                      onClick={() => handleBookTool(tool)}
                    >
                      بک کریں
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ADD TOOL */}
          <TabsContent value="add-tool">
            <Card>
              <CardHeader>
                <CardTitle>نیا اوزار شامل کریں</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>نام</Label>
                  <Input value={toolName} onChange={(e) => setToolName(e.target.value)} placeholder="اوزار کا نام" />
                </div>
                <div>
                  <Label>تفصیل</Label>
                  <Textarea
                    value={toolDesc}
                    onChange={(e) => setToolDesc(e.target.value)}
                    placeholder="تفصیل درج کریں..."
                  />
                </div>
                <div>
                  <Label>روزانہ کرایہ (روپے)</Label>
                  <Input
                    type="number"
                    value={toolPrice}
                    onChange={(e) => setToolPrice(e.target.value)}
                    placeholder="مثلاً 500"
                  />
                </div>

                {/* Map Picker */}
                <div>
                  <Label>مقام منتخب کریں</Label>
                  <div className="relative h-[400px] mt-2">
                    <MapContainer
                      center={location || [30.3753, 69.3451]}
                      zoom={6}
                      className="h-full w-full rounded-lg z-0"
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="© OpenStreetMap"
                      />
                      {location && <Marker position={location} icon={markerIcon} />}
                      <MapClickHandler setLocation={setLocation} />
                      <LocateButton setLocation={setLocation} />
                    </MapContainer>
                  </div>
                </div>

                <Button onClick={handleAddTool} className="w-full bg-blue-600 hover:bg-blue-700">
                  شامل کریں
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MY BOOKINGS */}
          <TabsContent value="bookings">
            {bookings.length === 0 ? (
              <p>کوئی بکنگ نہیں ملی</p>
            ) : (
              bookings.map((b) => (
                <Card key={b.booking_id} className="mb-3">
                  <CardHeader>
                    <CardTitle>{b.tool_name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>آغاز: {new Date(b.start_date).toLocaleDateString("ur-PK")}</p>
                    <p>اختتام: {new Date(b.end_date).toLocaleDateString("ur-PK")}</p>
                    <p>کل لاگت: {b.total_cost} روپے</p>
                    <Button variant="outline" onClick={() => handleCancelBooking(b)} className="mt-2">
                      منسوخ کریں
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
