"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import styles from "./account-menu.module.css";

type AccountMenuProps = {
  email: string | null;
};

export function AccountMenu({ email }: AccountMenuProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Sesi belum dapat diakhiri. Coba kembali.");
    } finally {
      setBusy(false);
    }
  }

  if (!email) {
    return (
      <div className={styles.accountArea}>
        <Link className={styles.signIn} href="/login">Masuk</Link>
        <span className={styles.localLabel}>Mode lokal</span>
      </div>
    );
  }

  return (
    <div className={styles.accountArea}>
      <details className={styles.accountDetails}>
        <summary className={styles.accountTrigger} aria-label="Buka menu akun">
          <span className={styles.avatar} aria-hidden="true">{email.slice(0, 1).toUpperCase()}</span>
          <span className={styles.email}>{email}</span>
          <span className={styles.chevron} aria-hidden="true">⌄</span>
        </summary>
        <div className={styles.menu} role="group" aria-label="Menu akun">
          <span className={styles.menuLabel}>Akun terautentikasi</span>
          <span className={styles.menuEmail}>{email}</span>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <button className={styles.signOut} type="button" onClick={() => void signOut()} disabled={busy}>
            {busy ? "Keluar…" : "Keluar"}
          </button>
        </div>
      </details>
    </div>
  );
}
