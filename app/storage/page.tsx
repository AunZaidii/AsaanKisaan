"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, MapPin, Warehouse, CheckCircle } from "lucide-react";
import { useToast } from "@/components/toast-provider";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
import { useMapEvents, useMap } from "react-leaflet";

export default function StoragePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState("godowns");
  const [godowns, setGodowns] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [mapModal, setMapModal] = useState<{ isOpen: boolean; lat?: number; lng?: number; name?: string }>({ isOpen: false });

  // leaflet marker icon (fix for runtime)
  const [markerIcon, setMarkerIcon] = useState<any>(null);
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Dynamically require leaflet only on client
      const L = require("leaflet");
      const icon = new L.Icon({
        iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });
      setMarkerIcon(icon);
    }
  }, []);

  // Form fields
  const [selectedGodown, setSelectedGodown] = useState("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tempReq, setTempReq] = useState(false);
  const [humReq, setHumReq] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchGodowns();
      fetchRequests();
    }
  }, [user]);

  const fetchGodowns = async () => {
    const { data, error } = await supabase.from("godowns").select("*");
    if (error) addToast("خرابی: " + error.message, "error");
    else setGodowns(data || []);
  };

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from("storage_requests")
      .select("*, godowns(name, city)")
      .eq("farmer_id", user?.id)
      .order("created_at", { ascending: false });
    if (error) addToast("خرابی: " + error.message, "error");
    else setRequests(data || []);
  };

  const handleRequest = async () => {
    if (!selectedGodown || !productName || !quantity || !pricePerKg || !startDate || !endDate) {
      addToast("براہ کرم تمام فیلڈز پُر کریں", "error");
      return;
    }

    const godown = godowns.find((g) => g.godown_id === selectedGodown);
    if (!godown) return;

    const days = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    const totalFee = days * godown.storage_fee_per_day;

    const { error } = await supabase.from("storage_requests").insert({
      farmer_id: user?.id,
      godown_id: selectedGodown,
      product_name: productName,
      quantity_kg: Number(quantity),
      price_per_kg: Number(pricePerKg),
      start_date: startDate,
      end_date: endDate,
      temperature_required: tempReq,
      humidity_required: humReq,
      total_storage_fee: totalFee,
      status: "pending",
    });

    if (error) addToast("خرابی: " + error.message, "error");
    else {
      addToast("درخواست جمع کر دی گئی ✓", "success");
      fetchRequests();
      resetForm();
    }
  };

  const resetForm = () => {
    setSelectedGodown("");
    setProductName("");
    setQuantity("");
    setPricePerKg("");
    setStartDate("");
    setEndDate("");
    setTempReq(false);
    setHumReq(false);
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
          <h1 className="text-2xl font-bold text-amber-700">اسٹوریج مینجمنٹ</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="godowns">گودام</TabsTrigger>
            <TabsTrigger value="request">درخواست جمع کریں</TabsTrigger>
            <TabsTrigger value="my">میری درخواستیں</TabsTrigger>
          </TabsList>

          {/* GODOWNS */}
          <TabsContent value="godowns">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {godowns.map((g) => (
                <Card key={g.godown_id}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Warehouse className="w-5 h-5 text-amber-600" /> {g.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>شہر: {g.city}</p>
                    <p>پتہ: {g.address}</p>
                    <p>فون نمبر: {g.phone || "دستیاب نہیں"}</p>
                    <p>صلاحیت: {g.available_capacity_kg}/{g.total_capacity_kg} کلوگرام</p>
                    <p>فیس: {g.storage_fee_per_day} روپے / دن</p>
                    <p>
                      فیچرز:{" "}
                      {g.temperature_control ? "درجہ حرارت کنٹرول, " : ""}
                      {g.humidity_control ? "نمی کنٹرول" : ""}
                      {!g.temperature_control && !g.humidity_control ? "معمولی" : ""}
                    </p>
                    <Button
                      className="mt-2 w-full bg-gray-600 hover:bg-gray-700"
                      onClick={() =>
                        setMapModal({ isOpen: true, lat: g.location_latitude, lng: g.location_longitude, name: g.name })
                      }
                    >
                      <MapPin className="w-4 h-4 mr-2" /> مقام دیکھیں
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* REQUEST FORM */}
          <TabsContent value="request">
            <Card>
              <CardHeader>
                <CardTitle>گودام میں مال جمع کروائیں</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Label>گودام منتخب کریں</Label>
                <select
                  value={selectedGodown}
                  onChange={(e) => setSelectedGodown(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                >
                  <option value="">انتخاب کریں</option>
                  {godowns.map((g) => (
                    <option key={g.godown_id} value={g.godown_id}>
                      {g.name} - {g.city}
                    </option>
                  ))}
                </select>

                <Label>پروڈکٹ کا نام</Label>
                <Input value={productName} onChange={(e) => setProductName(e.target.value)} />

                <Label>مقدار (کلوگرام)</Label>
                <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />

                <Label>فی کلو قیمت (روپے)</Label>
                <Input type="number" value={pricePerKg} onChange={(e) => setPricePerKg(e.target.value)} />

                <Label>آغاز کی تاریخ</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />

                <Label>اختتامی تاریخ</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />

                <div className="flex items-center gap-4 mt-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={tempReq} onChange={() => setTempReq(!tempReq)} /> درجہ حرارت کنٹرول
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={humReq} onChange={() => setHumReq(!humReq)} /> نمی کنٹرول
                  </label>
                </div>

                <Button onClick={handleRequest} className="w-full bg-amber-700 hover:bg-amber-800">
                  درخواست جمع کریں
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MY REQUESTS */}
          <TabsContent value="my">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requests.length === 0 ? (
                <p>آپ کی کوئی درخواست نہیں ہے۔</p>
              ) : (
                requests.map((r) => (
                  <Card key={r.request_id}>
                    <CardHeader>
                      <CardTitle>{r.product_name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>گودام: {r.godowns?.name}</p>
                      <p>مقدار: {r.quantity_kg} کلوگرام</p>
                      <p>قیمت: {r.price_per_kg} روپے / کلو</p>
                      <p>آغاز: {r.start_date}</p>
                      <p>اختتام: {r.end_date}</p>
                      <p>فیس: {r.total_storage_fee} روپے</p>
                      <p>اسٹیٹس: {r.status}</p>
                      {r.status === "approved" && (
                        <div className="flex items-center gap-2 mt-2 text-green-700">
                          <CheckCircle className="w-4 h-4" /> منظور شدہ! آپ ٹرک بک کر سکتے ہیں۔
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Map Modal */}
      {mapModal.isOpen && mapModal.lat && markerIcon && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[2000]">
          <div className="bg-white rounded-lg p-4 w-[90%] md:w-[600px] h-[500px] relative">
            <Button
              className="absolute top-2 right-2 z-[2001]"
              variant="outline"
              onClick={() => setMapModal({ isOpen: false })}
            >
              بند کریں
            </Button>
            <h2 className="text-lg font-bold mb-2">{mapModal.name}</h2>
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
