import Link from "next/link";
import { ArrowRight, FilePlus2, HardDrive, Network } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceCreateForm } from "./workspace-create-form";
import styles from "./dashboard.module.css";
import workspaceStyles from "./workspaces.module.css";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return (
      <div className={styles.dashboard}>
        <section className={styles.welcome} aria-labelledby="welcome-title">
          <div className={styles.welcomeCopy}>
            <span className={styles.kicker}>VISUAL THINKING WORKSPACE</span>
            <h2 id="welcome-title">Ruang kerja untuk ide dan pengetahuan Anda.</h2>
            <p>Masuk untuk melihat workspace cloud. Editor lokal tetap tersedia tanpa akun.</p>
            <Link className={styles.primaryAction} href="/login">
              Masuk ke MindMap Pro <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>
        <section className={styles.notice} aria-label="Informasi mode lokal">
          <span className={styles.noticeIcon}><HardDrive size={18} aria-hidden="true" /></span>
          <div>
            <strong>Editor lokal tetap dapat digunakan</strong>
            <p>Draft yang tersimpan di browser tidak otomatis menjadi workspace cloud atau tersedia lintas perangkat.</p>
            <Link className={styles.textLink} href="/">Buka editor lokal <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
        </section>
      </div>
    );
  }

  const { data: workspaces, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, name, slug, created_at, updated_at")
    .order("created_at", { ascending: true });

  return (
    <div className={styles.dashboard}>
      <section className={styles.welcome} aria-labelledby="welcome-title">
        <div className={styles.welcomeCopy}>
          <span className={styles.kicker}>VISUAL THINKING WORKSPACE</span>
          <h2 id="welcome-title">Selamat datang di ruang kerja Anda.</h2>
          <p>Workspace yang tampil di sini berasal dari sesi terautentikasi dan kebijakan akses database.</p>
          <Link className={styles.primaryAction} href="/">
            <FilePlus2 size={18} aria-hidden="true" />
            Buka Mind Map Editor
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div className={styles.visual} aria-hidden="true">
          <div className={styles.orbit} />
          <div className={styles.orbit + " " + styles.orbitInner} />
          <div className={styles.mapNode + " " + styles.mapRoot}><Network size={23} /></div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="workspace-title">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.kicker}>DATA TEROTORISASI</span>
            <h2 id="workspace-title">Workspace Anda</h2>
          </div>
        </div>

        {workspaceError ? (
          <div className={workspaceStyles.stateCard} role="alert">
            <h3>Workspace belum dapat dimuat</h3>
            <p>Layanan workspace sedang tidak tersedia atau akses belum dapat diverifikasi. Coba muat ulang halaman.</p>
            <Link className={workspaceStyles.actionLink} href="/dashboard">Coba lagi</Link>
          </div>
        ) : workspaces && workspaces.length > 0 ? (
          <div className={workspaceStyles.workspaceGrid}>
            {workspaces.map((workspace) => (
              <article className={workspaceStyles.workspaceCard} key={workspace.id}>
                <h3 className={workspaceStyles.workspaceName}>{workspace.name}</h3>
                <span className={workspaceStyles.workspaceSlug}>/{workspace.slug}</span>
                <span className={workspaceStyles.workspaceMeta}>
                  Dibuat {new Date(workspace.created_at).toLocaleDateString("id-ID")}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <div className={workspaceStyles.stateCard}>
            <h3>Belum ada workspace cloud</h3>
            <p>Buat workspace pertama untuk mulai mengelola peta pengetahuan melalui akun Anda.</p>
          </div>
        )}
      </section>

      <section className={styles.section} aria-labelledby="create-workspace-title">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.kicker}>WORKSPACE BARU</span>
            <h2 id="create-workspace-title">Buat workspace</h2>
          </div>
        </div>
        <WorkspaceCreateForm />
      </section>

      <section className={styles.notice} aria-label="Batas kemampuan dashboard">
        <span className={styles.noticeIcon}><HardDrive size={18} aria-hidden="true" /></span>
        <div>
          <strong>Daftar peta dan sinkronisasi belum diaktifkan</strong>
          <p>Dashboard hanya menampilkan workspace yang diizinkan oleh sesi dan Row Level Security. Daftar peta, aktivitas, statistik, dan sinkronisasi akan muncul setelah kontrak endpoint masing-masing siap.</p>
        </div>
      </section>
    </div>
  );
}
