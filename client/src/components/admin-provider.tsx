import React, { createContext, useContext, useState, useMemo, useEffect } from "react";

type AdminContextValue = {
  adminOpen: boolean;
  setAdminOpen: (v: boolean) => void;
  toggleAdmin: () => void;
  dialogOpen: boolean;
  setDialogOpen: (v: boolean) => void;
  unlock: (password: string) => Promise<{ ok: boolean; ms?: number }>;
  requireAdmin: () => Promise<boolean>;
  remainingMs: number;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [adminOpen, setAdminOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingResolvers, setPendingResolvers] = useState<Array<(ok: boolean) => void>>([]);
  const [unlockUntil, setUnlockUntil] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);

  const unlock = async (password: string) => {
    try {
      const pwd = password.trim();
      const qp = pwd ? `?master_password=${encodeURIComponent(pwd)}` : "";
      const res = await fetch(`/api/admin/unlock${qp}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(pwd ? { "X-Master-Password": pwd } : {}),
        },
        body: JSON.stringify({ master_password: pwd }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAdminOpen(true);
      setDialogOpen(false);
      const ms = typeof data?.unlock_ms === "number" ? data.unlock_ms : 600000;
      setTimeout(() => setAdminOpen(false), ms);
      setUnlockUntil(Date.now() + ms);
      setRemainingMs(ms);
      // Resolve any waiters
      setPendingResolvers((prev) => {
        prev.forEach((resolve) => resolve(true));
        return [];
      });
      return { ok: true, ms };
    } catch (e) {
      return { ok: false };
    }
  };

  useEffect(() => {
    let timer: any;
    if (adminOpen && unlockUntil) {
      timer = setInterval(() => {
        const rem = Math.max(0, (unlockUntil as number) - Date.now());
        setRemainingMs(rem);
        if (rem <= 0) {
          setAdminOpen(false);
          setUnlockUntil(null);
          clearInterval(timer);
        }
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [adminOpen, unlockUntil]);

  const requireAdmin = async () => {
    if (adminOpen) return true;
    setDialogOpen(true);
    return await new Promise<boolean>((resolve) => {
      setPendingResolvers((prev) => [...prev, resolve]);
    });
  };

  const value = useMemo(
    () => ({
      adminOpen,
      setAdminOpen,
      toggleAdmin: () => setAdminOpen((prev) => !prev),
      dialogOpen,
      setDialogOpen,
      unlock,
      requireAdmin,
      remainingMs,
    }),
    [adminOpen, dialogOpen, remainingMs]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error("useAdmin must be used within AdminProvider");
  }
  return ctx;
}
