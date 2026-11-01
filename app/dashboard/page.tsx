import Link from "next/link";
import { ArrowRight, FilePlus2, HardDrive, Network } from "lucide-react";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  return (
    <div className={styles.dashboard}>
      <section className={styles.welcome} aria-labelledby="welcome-title">
        <div className={styles.welcomeCopy}>
          <span className={styles.kicker}>VISUAL THINKING WORKSPACE</span>
          <h2 id="welcome-title">Ubah ide menjadi pengetahuan yang terstruktur.</h2>
          <p>
            Mulai dari satu topik, susun hubungan antar gagasan, lalu kembangkan
            menjadi peta pengetahuan yang mudah ditinjau kembali.
          </p>
          <Link className={styles.primaryAction} href="/">
            <FilePlus2 size={18} aria-hidden="true" />
            Mulai membuat mind map
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div className={styles.visual} aria-hidden="true">
          <div className={styles.orbit orbitOuter} />
          <div className={styles.orbit orbitInner} />
          <div className={styles.mapNode mapRoot}><Network size={23} /></div>
          <div className={styles.mapNode mapOne}>Ide</div>
          <div className={styles.mapNode mapTwo}>Riset</div>
          <div className={styles.mapNode mapThree}>Aksi</div>
          <span className={styles.mapLine lineOne} />
          <span className={styles.mapLine lineTwo} />
          <span className={styles.mapLine lineThree} />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="start-title">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.kicker}>MULAI DI SINI</span>
            <h2 id="start-title">Ruang kerja Anda</h2>
          </div>
        </div>
        <div className={styles.startGrid}>
          <article className={styles.startCard}>
            <div className={styles.cardIcon}><Network size={19} aria-hidden="true" /></div>
            <h3>Mind Map Editor</h3>
            <p>Buka kanvas untuk menambah topik, menghubungkan gagasan, dan menyusun struktur.</p>
            <Link href="/" className={styles.textLink}>Buka editor <ArrowRight size={15} aria-hidden="true" /></Link>
          </article>
          <article className={styles.startCard}>
            <div className={styles.cardIcon}><HardDrive size={19} aria-hidden="true" /></div>
            <h3>Draft di browser</h3>
            <p>
              Editor menyediakan penyimpanan draft lokal dan pemulihan. Dashboard ini
              tidak menganggap draft lokal sebagai dokumen cloud atau data lintas perangkat.
            </p>
            <span className={styles.infoLabel}>Penyimpanan lokal</span>
          </article>
        </div>
      </section>

      <section className={styles.notice} aria-label="Informasi kemampuan workspace">
        <span className={styles.noticeIcon}><HardDrive size={18} aria-hidden="true" /></span>
        <div>
          <strong>Workspace cloud belum ditampilkan di dashboard ini</strong>
          <p>
            Daftar dokumen, aktivitas, sinkronisasi, dan statistik akan ditambahkan
            setelah integrasi API terotorisasi tersedia pada branch aplikasi ini.
            Editor tetap dapat digunakan melalui navigasi Mind Map Editor.
          </p>
        </div>
      </section>
    </div>
  );
}
