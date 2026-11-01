"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "./workspaces.module.css";

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function WorkspaceCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = typeof result === "object" && result !== null &&
          "error" in result && typeof result.error === "object" && result.error !== null &&
          "message" in result.error && typeof result.error.message === "string"
          ? result.error.message
          : "Workspace tidak dapat dibuat.";
        throw new Error(message);
      }
      setName("");
      setSlug("");
      setSlugEdited(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Workspace tidak dapat dibuat.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <label htmlFor="workspace-name">Nama workspace</label>
      <input
        id="workspace-name"
        name="name"
        value={name}
        maxLength={120}
        required
        onChange={(event) => {
          const value = event.target.value;
          setName(value);
          if (!slugEdited) setSlug(slugify(value));
        }}
        placeholder="Contoh: Tim Riset"
      />
      <label htmlFor="workspace-slug">Slug workspace</label>
      <input
        id="workspace-slug"
        name="slug"
        value={slug}
        maxLength={80}
        pattern="[a-z0-9]+(-[a-z0-9]+)*"
        required
        onChange={(event) => {
          setSlugEdited(true);
          setSlug(slugify(event.target.value));
        }}
        placeholder="tim-riset"
      />
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <button className={styles.submit} type="submit" disabled={busy || !name.trim() || !slug}>
        {busy ? "Membuat workspace…" : "Buat workspace"}
      </button>
    </form>
  );
}
