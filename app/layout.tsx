import type { Metadata } from "next";
import "@xyflow/react/dist/style.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "MindMap Pro — Visual Knowledge Studio",
  description: "A premium workspace for visual thinking, learning and knowledge mapping.",
  applicationName: "MindMap Pro",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}