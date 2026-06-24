import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Moca Hub — Landing Page Builder",
  description:
    "Extract a client's brand, assemble blocks, edit with comments, export clean HTML.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
