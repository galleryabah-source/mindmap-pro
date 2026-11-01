"use client";

import styles from "./dashboard.module.css";
import workspaceStyles from "./workspaces.module.css";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className={styles.dashboard}>
      <section className={workspaceStyles.stateCard} role="alert">
        <h2>Dashboard mengalami kendala</h2>
        <p>Data workspace tidak dapat ditampilkan saat ini. Coba ulangi permintaan tanpa mengubah data yang tersimpan.</p>
        <button className={workspaceStyles.actionButton} type="button" onClick={() => reset()}>
          Coba lagi
        </button>
      </section>
    </div>
  );
}
