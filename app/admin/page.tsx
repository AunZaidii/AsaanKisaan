"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/lib/auth-context";
import { createClient } from "@/app/lib/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Warehouse, LogOut } from "lucide-react";
import { useToast } from "@/components/toast-provider";

export default function GodownAdminDashboard() {
  const { user, logout, loading } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState("requests");
  const [requests, setRequests] = useState<any[]>([]);
  const [godowns, setGodowns] = useState<any[]>([]);
  const [marketItems, setMarketItems] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user?.role !== "godown_admin") router.push("/dashboard");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchGodowns();
      fetchRequests();
      fetchMarketItems();
    }
  }, [user]);

  const fetchGodowns = async () => {
    const { data, error } = await supabase
      .from("godowns")
      .select("*")
      .eq("admin_id", user?.id);
    if (error) addToast("خرابی: " + error.message, "error");
    else setGodowns(data || []);
  };

const fetchRequests = async () => {
  if (!godowns.length) return;
  const { data, error } = await supabase
    .from("storage_requests")
    .select("*, users(full_name, phone), godowns(name, city)")
    .in("godown_id", godowns.map((g) => g.godown_id))
    .order("created_at", { ascending: false });
    
  if (error) addToast("خرابی: " + error.message, "error");
  else setRequests(data || []);
};


  const fetchMarketItems = async () => {
    const { data, error } = await supabase
      .from("marketplace_items")
      .select("*, godowns(name, city)")
      .in(
        "godown_id",
        godowns.map((g) => g.godown_id)
      )
      .order("created_at", { ascending: false });
    if (error) addToast("خرابی: " + error.message, "error");
    else setMarketItems(data || []);
  };

  const handleAccept = async (r: any) => {
    const { error } = await supabase
      .from("storage_requests")
      .update({ status: "approved" })
      .eq("request_id", r.request_id);

    if (error) return addToast("خرابی: " + error.message, "error");

    // Insert into marketplace
    await supabase.from("marketplace_items").insert({
      godown_id: r.godown_id,
      farmer_id: r.farmer_id,
      product_name: r.product_name,
      quantity_kg: r.quantity_kg,
      price_per_kg: r.price_per_kg,
      status: "available",
    });

    addToast("درخواست منظور ہو گئی ✓", "success");
    fetchRequests();
    fetchMarketItems();
  };

  const handleReject = async (r: any) => {
    const { error } = await supabase
      .from("storage_requests")
      .update({ status: "rejected" })
      .eq("request_id", r.request_id);
    if (error) addToast("خرابی: " + error.message, "error");
    else {
      addToast("درخواست مسترد کر دی گئی ✓", "success");
      fetchRequests();
    }
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="border-b bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-amber-700">
            🏬 گودام ایڈمن ڈیش بورڈ
          </h1>
          <Button variant="outline" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" /> لاگ آؤٹ
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="requests">درخواستیں</TabsTrigger>
            <TabsTrigger value="market">مارکیٹ لسٹنگ</TabsTrigger>
            <TabsTrigger value="godowns">میرا گودام</TabsTrigger>
          </TabsList>

          {/* Pending Requests */}
          <TabsContent value="requests">
            {requests.length === 0 ? (
              <p>کوئی نئی درخواست نہیں ہے۔</p>
            ) : (
              requests.map((r) => (
                <Card key={r.request_id} className="mb-4">
                  <CardHeader>
                    <CardTitle>{r.product_name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>کسان: {r.users?.full_name}</p>
                    <p>رابطہ: {r.users?.phone || "دستیاب نہیں"}</p>
                    <p>مقدار: {r.quantity_kg} کلوگرام</p>
                    <p>قیمت: {r.price_per_kg} روپے/کلو</p>
                    <p>مدت: {r.start_date} - {r.end_date}</p>
                    <p>اسٹیٹس: {r.status}</p>
                    {r.status === "pending" && (
                      <div className="flex gap-2 mt-3">
                        <Button className="bg-green-700 hover:bg-green-800" onClick={() => handleAccept(r)}>
                          <CheckCircle className="w-4 h-4 mr-1" /> قبول کریں
                        </Button>
                        <Button className="bg-red-600 hover:bg-red-700" onClick={() => handleReject(r)}>
                          <XCircle className="w-4 h-4 mr-1" /> مسترد کریں
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Marketplace Items */}
          <TabsContent value="market">
            {marketItems.length === 0 ? (
              <p>کوئی لسٹنگ موجود نہیں۔</p>
            ) : (
              marketItems.map((m) => (
                <Card key={m.item_id} className="mb-3">
                  <CardHeader>
                    <CardTitle>{m.product_name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>شہر: {m.godowns?.city}</p>
                    <p>قیمت: {m.price_per_kg} روپے/کلو</p>
                    <p>مقدار: {m.quantity_kg} کلوگرام</p>
                    <p>اسٹیٹس: {m.status}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Godown Info */}
          <TabsContent value="godowns">
            {godowns.length === 0 ? (
              <p>آپ کے نام کوئی گودام نہیں ہے۔</p>
            ) : (
              godowns.map((g) => (
                <Card key={g.godown_id}>
                  <CardHeader>
                    <CardTitle>
                      <Warehouse className="w-5 h-5 inline-block mr-2" />
                      {g.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>شہر: {g.city}</p>
                    <p>پتہ: {g.address}</p>
                    <p>صلاحیت: {g.available_capacity_kg}/{g.total_capacity_kg}</p>
                    <p>فیس: {g.storage_fee_per_day} روپے / دن</p>
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
