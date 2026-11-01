import styles from "./dashboard.module.css";
import workspaceStyles from "./workspaces.module.css";

export default function DashboardLoading() {
  return (
    <div className={styles.dashboard} aria-busy="true" aria-live="polite">
      <section className={styles.welcome}>
        <div className={styles.welcomeCopy}>
          <span className={styles.kicker}>MINDMAP PRO / WORKSPACE</span>
          <h2>Memuat workspace Anda…</h2>
          <p>Memeriksa sesi dan mengambil data yang diizinkan.</p>
        </div>
      </section>
      <section className={styles.section} aria-label="Workspace sedang dimuat">
        <div className={workspaceStyles.workspaceGrid}>
          <div className={workspaceStyles.loadingCard} />
          <div className={workspaceStyles.loadingCard} />
        </div>
      </section>
    </div>
  );
}
