"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/auth-context";

export default function RedirectorWrapper() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    // Only redirect on root, login, or signup
    if (!["/", "/login", "/signup"].includes(pathname)) return;

    if (user) {
      let target = "/dashboard";
      if (user.role === "buyer") target = "/buyer";
      if (user.role === "godown_admin") target = "/admin";

      router.push(target);
    } else if (pathname === "/") {
      router.push("/login");
    }
  }, [user, loading, pathname, router]);

  return null;
}
