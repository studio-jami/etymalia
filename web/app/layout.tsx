import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Entymalia",
  description:
    "Entymalia — AI-powered brand identity. Consistent logos, assets, palettes, and video promos.",
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

