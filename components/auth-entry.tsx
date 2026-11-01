"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AuthUser = { email?: string } | null;

export function AuthEntry() {
  const [configured, setConfigured] = useState(false);
  const [user, setUser] = useState<AuthUser>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    let unsubscribe: () => void = () => {};

    try {
      const supabase = createClient();
      supabase.auth.getSession().then(({ data }) => {
        if (active) {
          setUser(data.session?.user ? { email: data.session.user.email } : null);
          setConfigured(true);
          setReady(true);
        }
      }).catch(() => {
        if (active) {
          setConfigured(true);
          setReady(true);
        }
      });

      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (active) setUser(session?.user ? { email: session.user.email } : null);
      });
      unsubscribe = () => { data.subscription.unsubscribe(); };
    } catch {
      if (active) {
        setConfigured(false);
        setReady(true);
      }
    }

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  async function signOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setUser(null);
      window.location.assign("/");
    } catch {
      // Keep the current local editor available if the auth service is unavailable.
    }
  }

  if (!ready) return <span className="auth-local-label">Memeriksa akun…</span>;
  if (!configured) return <span className="auth-local-label">Mode lokal</span>;
  if (!user) return <Link className="secondary-button auth-entry-button" href="/login">Masuk</Link>;

  return (
    <div className="auth-entry">
      <span className="auth-email" title={user.email ?? "Akun aktif"}>{user.email ?? "Akun aktif"}</span>
      <button className="secondary-button auth-entry-button" type="button" onClick={() => void signOut()}>Keluar</button>
    </div>
  );
}
