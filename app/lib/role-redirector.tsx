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
      // ✅ Determine where the user should go
      let target = "/dashboard";
      if (user.role === "buyer") target = "/buyer";
      if (user.role === "godown_admin") target = "/admin";

      // ✅ Allow staying on the correct page (avoid redirect loop)
      if (pathname.startsWith(target)) return;

      // ✅ Prevent unnecessary redirection when visiting login/signup
      if (pathname.startsWith("/login") || pathname.startsWith("/signup")) return;

      router.push(target);
    } else {
      // If not logged in, only redirect if not already on login/signup
      if (!pathname.startsWith("/login") && !pathname.startsWith("/signup")) {
        router.push("/login");
      }
    }
  }, [user, loading, pathname, router]);

  return null;
}
