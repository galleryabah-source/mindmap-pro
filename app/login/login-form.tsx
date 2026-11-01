"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./login.module.css";

type Mode = "sign-in" | "sign-up";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");

    try {
      const supabase = createClient();
      if (mode === "sign-in") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) throw authError;
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: new URL("/auth/callback", window.location.origin).toString(),
        },
      });
      if (authError) throw authError;

      if (data.session) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }
      setMessage("Pendaftaran diterima. Periksa email untuk mengonfirmasi akun sebelum masuk.");
    } catch (cause) {
      setError(cause instanceof Error
        ? cause.message
        : "Autentikasi tidak dapat diselesaikan. Periksa konfigurasi Supabase.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="login-title">
        <Link className={styles.brand} href="/dashboard">MindMap <span>Pro</span></Link>
        <p className={styles.eyebrow}>VISUAL KNOWLEDGE STUDIO</p>
        <h1 id="login-title">{mode === "sign-in" ? "Selamat datang kembali" : "Buat akun MindMap Pro"}</h1>
        <p className={styles.description}>
          {mode === "sign-in"
            ? "Masuk untuk mengakses workspace cloud Anda."
            : "Daftarkan akun untuk mulai menggunakan workspace cloud."}
        </p>

        <form className={styles.form} onSubmit={submit}>
          <label htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <label htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            type="password"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          {message ? <p className={styles.message} role="status">{message}</p> : null}
          <button className={styles.submit} type="submit" disabled={busy}>
            {busy ? "Memproses…" : mode === "sign-in" ? "Masuk" : "Daftar"}
          </button>
        </form>

        <p className={styles.switch}>
          {mode === "sign-in" ? "Belum memiliki akun?" : "Sudah memiliki akun?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "sign-in" ? "sign-up" : "sign-in");
              setError("");
              setMessage("");
            }}
          >
            {mode === "sign-in" ? "Daftar" : "Masuk"}
          </button>
        </p>
        <Link className={styles.back} href="/dashboard">Kembali ke dashboard</Link>
      </section>
    </main>
  );
}
