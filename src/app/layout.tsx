import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "HCM Lite | People operations",
  description: "A simple people operations workspace",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="hcm-theme-bootstrap" strategy="beforeInteractive">
          {`try { if (localStorage.getItem("hcm-theme") === "dark") document.documentElement.dataset.theme = "dark"; } catch {}`}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
