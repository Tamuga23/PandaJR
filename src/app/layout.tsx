import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0d9488",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://panda-jr.vercel.app"),
  title: "PandaJR - Copiloto para Padres Primerizos",
  description: "Herramienta colaborativa para padres primerizos: neuro-nutrición, citas médicas, contador de contracciones y asistente con IA.",
  applicationName: "PandaJR",
  authors: [{ name: "PandaJR" }],
  keywords: ["embarazo", "padres primerizos", "bebé", "agenda médica", "contracciones", "IA"],
  openGraph: {
    title: "PandaJR - Copiloto para Padres Primerizos",
    description: "Herramienta colaborativa para padres primerizos: neuro-nutrición, citas médicas, contador de contracciones y asistente con IA.",
    url: "https://panda-jr.vercel.app",
    siteName: "PandaJR",
    images: [
      {
        url: "/og-image.jpg",
        width: 1001,
        height: 1024,
        alt: "PandaJR - Logo Oficial",
        type: "image/jpeg",
      },
    ],
    locale: "es_LA",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "PandaJR - Copiloto para Padres Primerizos",
    description: "Herramienta colaborativa para padres primerizos: neuro-nutrición, citas médicas y asistente con IA.",
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: [
      { url: "/icon.jpg" },
      { url: "/og-image.jpg" },
    ],
    shortcut: "/icon.jpg",
    apple: [
      { url: "/apple-icon.jpg" },
      { url: "/og-image.jpg" },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900 w-full overflow-x-hidden">{children}</body>
    </html>
  );
}
