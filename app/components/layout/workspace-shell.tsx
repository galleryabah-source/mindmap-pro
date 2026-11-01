import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, LayoutDashboard, Network, Plus } from "lucide-react";
import styles from "./workspace-shell.module.css";

type WorkspaceSection = "dashboard" | "editor";

type WorkspaceShellProps = {
  children: ReactNode;
  activeSection: WorkspaceSection;
  title: string;
  description?: string;
};

const navigation = [
  { id: "dashboard" as const, label: "Dashboard", href: "/dashboard", Icon: LayoutDashboard },
  { id: "editor" as const, label: "Mind Map Editor", href: "/", Icon: Network },
];

export function WorkspaceShell({
  children,
  activeSection,
  title,
  description,
}: WorkspaceShellProps) {
  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#workspace-main">Lewati ke konten utama</a>

      <aside className={styles.sidebar} aria-label="Navigasi workspace">
        <Link className={styles.brand} href="/dashboard" aria-label="MindMap Pro, dashboard">
          <span className={styles.brandMark} aria-hidden="true"><Network size={20} /></span>
          <span className={styles.brandText}>
            <strong>MindMap <span>Pro</span></strong>
            <small>VISUAL KNOWLEDGE STUDIO</small>
          </span>
        </Link>

        <div className={styles.workspaceLabel}>WORKSPACE</div>
        <nav className={styles.navigation} aria-label="Navigasi utama">
          {navigation.map(({ id, label, href, Icon }) => (
            <Link
              key={id}
              href={href}
              className={id === activeSection ? styles.navLinkActive : styles.navLink}
              aria-current={id === activeSection ? "page" : undefined}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <span className={styles.localIndicator} aria-hidden="true" />
          <span>Editor dengan draft browser</span>
        </div>
      </aside>

      <div className={styles.mainColumn}>
        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <span className={styles.eyebrow}>MINDMAP PRO / WORKSPACE</span>
            <h1>{title}</h1>
            {description ? <p>{description}</p> : null}
          </div>
          <Link className={styles.createButton} href="/" aria-label="Buka editor untuk membuat mind map">
            <Plus size={17} aria-hidden="true" />
            <span>Buat Mind Map</span>
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </header>

        <nav className={styles.mobileNavigation} aria-label="Navigasi mobile">
          {navigation.map(({ id, label, href, Icon }) => (
            <Link
              key={id}
              href={href}
              className={id === activeSection ? styles.mobileNavActive : styles.mobileNavLink}
              aria-current={id === activeSection ? "page" : undefined}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <main id="workspace-main" className={styles.content} tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
