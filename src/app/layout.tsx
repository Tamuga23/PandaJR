import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeSync } from "@/components/ThemeSync";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  // Zoom permitido (WCAG 1.4.4): sin maximumScale ni userScalable.
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#fdfbf7" }, { media: "(prefers-color-scheme: dark)", color: "#181520" }],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://panda-jr.vercel.app"),
  title: "PandaJR - Copiloto para Padres Primerizos",
  description: "Herramienta colaborativa para padres primerizos: neuro-nutrición, citas médicas, contador de contracciones y asistente con IA.",
  applicationName: "PandaJR",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PandaJR",
  },
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
      { url: "/app-icon.jpg" },
      { url: "/og-image.jpg" },
    ],
    shortcut: "/app-icon.jpg",
    apple: [
      { url: "/app-icon.jpg" },
      { url: "/og-image.jpg" },
    ],
  },
};

/**
 * Resuelve el tema antes del primer pintado leyendo pandajr-storage:
 * themePreference (v1) → o migra el estado v0 (isDark true → oscuro; si no, la clave pandajr_theme;
 * si no, sistema) → "system" usa prefers-color-scheme.
 */
const THEME_BOOT_SCRIPT = `(function(){try{var d=document.documentElement,p="system",st=null;
try{var raw=localStorage.getItem("pandajr-storage");st=raw?(JSON.parse(raw)||{}).state:null}catch(e){}
if(st&&(st.themePreference==="system"||st.themePreference==="light"||st.themePreference==="dark")){p=st.themePreference}
else{var legacy=null;try{legacy=localStorage.getItem("pandajr_theme")}catch(e){}
if(st&&st.isDark===true){p="dark"}else if(legacy==="dark"||legacy==="light"){p=legacy}}
var dark=p==="dark"||(p==="system"&&!!window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);
if(dark){d.classList.add("dark")}else{d.classList.remove("dark")}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Síncrono en <head>: pone la clase .dark ANTES del primer pintado (next/script
            beforeInteractive se encola y corre tras hidratar → destello). Misma regla que
            resolveTheme/migrateThemePreference de usePandaStore; ThemeSync la mantiene después. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-[#faf9f5] dark:bg-[#181520] text-stone-900 dark:text-[#eae6e1] w-full overflow-x-hidden transition-colors duration-200">
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
