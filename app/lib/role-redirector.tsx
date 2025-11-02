"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/auth-context";

export default function RoleRedirector() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (user) {
      let target = "/dashboard";
      if (user.role === "buyer") target = "/buyer";
      if (user.role === "godown_admin") target = "/admin";

      // 🚫 FIX: Only redirect if on root "/" or invalid page
      const allowedPaths = ["/dashboard", "/buyer", "/admin", "/storage", "/marketplace", "/settings"];

      // If the user is on login/signup, don't redirect
      if (pathname.startsWith("/login") || pathname.startsWith("/signup")) return;

      // If user is already on an allowed page, do nothing
      if (allowedPaths.some((p) => pathname.startsWith(p))) return;

      // Otherwise, send them to their correct base page
      router.push(target);
    } else {
      // Not logged in — only redirect if not already on login/signup
      if (!pathname.startsWith("/login") && !pathname.startsWith("/signup")) {
        router.push("/login");
      }
    }
  }, [user, loading, pathname, router]);

  return null;
}
