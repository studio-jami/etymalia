import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Etymalia",
  description:
    "Etymalia — etymology-led AI brand identity, from name to complete brand kit.",
};

const themeScript = `
  try {
    const savedTheme = localStorage.getItem("etymalia-theme");
    document.documentElement.dataset.theme = savedTheme === "light" ? "light" : "dark";
  } catch {
    document.documentElement.dataset.theme = "dark";
  }
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
