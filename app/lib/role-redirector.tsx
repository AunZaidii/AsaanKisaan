"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/app/lib/auth-context";

export default function RoleRedirector() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    // Allow login/signup always
    if (pathname.startsWith("/login") || pathname.startsWith("/signup")) return;

    // If no user, go to login
    if (!user) {
      if (pathname !== "/login" && pathname !== "/signup") router.push("/login");
      return;
    }

    // 🧭 Role → base route mapping
    const roleBase: Record<string, string> = {
      farmer: "/dashboard",
      buyer: "/buyer",
      godown_admin: "/admin",
    };

    const allowedPaths: Record<string, string[]> = {
      farmer: ["/dashboard", "/storage", "/marketplace", "/settings"],
      buyer: ["/buyer", "/marketplace", "/profile"],
      godown_admin: ["/admin", "/requests", "/godowns", "/market"],
    };

    const basePath = roleBase[user.role] || "/dashboard";
    const allowed = allowedPaths[user.role] || ["/dashboard"];

    // 🚫 Only redirect if user tries to access unauthorized area
    const isAllowed = allowed.some((p) => pathname.startsWith(p));

    if (!isAllowed) router.push(basePath);
  }, [user, loading, pathname, router]);

  return null;
}
