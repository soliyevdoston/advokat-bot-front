import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import { PwaInstaller } from "../components/PwaInstaller";
import "./globals.css";

const space = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk"
});

export const metadata: Metadata = {
  title: "Advokat Turdimotov — Admin Panel",
  description: "Huquqiy maslahat va yuridik xizmat admin paneli",
  applicationName: "Advokat Admin",
  appleWebApp: {
    capable: true,
    title: "Advokat Admin",
    statusBarStyle: "black-translucent"
  },
  formatDetection: { telephone: false }
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz">
      <body className={space.variable}>
        {children}
        <PwaInstaller />
      </body>
    </html>
  );
}
