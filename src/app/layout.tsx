import type { Metadata, Viewport } from "next";
import { Alegreya, Alegreya_Sans } from "next/font/google";
import "./globals.css";
import { ThemeSync } from "@/components/ThemeSync";
import { PwaUpdates } from "@/components/PwaUpdates";

/**
 * Tipografía (fase 6, Huerta Tipográfica): Alegreya para títulos (font-display) y Alegreya Sans para la
 * UI (font-sans, la del body). Self-hosted por next/font: sin peticiones a Google en el navegador.
 * - Alegreya es variable (wght 400–900): un archivo cubre los pesos de título que se usan (500, 700, 800).
 * - Alegreya Sans no es variable: solo los pesos que la UI usa (400 cuerpo, 500 meta, 700 filas y
 *   botones, 800 cifras destacadas). font-semibold (600) resuelve a 700 y font-black (900) a 800.
 * Las variables crudas se llaman --font-alegreya(-sans); globals.css las expone como --font-display y
 * --font-sans (@theme) para no crear una variable que se referencie a sí misma.
 */
const alegreya = Alegreya({
  variable: "--font-alegreya",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

const alegreyaSans = Alegreya_Sans({
  variable: "--font-alegreya-sans",
  weight: ["400", "500", "700", "800"],
  subsets: ["latin", "latin-ext"],
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
});

export const viewport: Viewport = {
  // Zoom permitido (WCAG 1.4.4): sin maximumScale ni userScalable.
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // = --ground de globals.css (alabastro / obsidiana): la barra del sistema continúa el fondo de la app.
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#faf9f5" }, { media: "(prefers-color-scheme: dark)", color: "#181520" }],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://panda-jr.vercel.app"),
  title: "PandaJr: el embarazo en pareja, semana a semana",
  description: "Guía semanal del embarazo para la mamá y su pareja: tareas compartidas, citas con el obstetra, contador de contracciones y a quién llamar si algo es urgente.",
  applicationName: "PandaJr",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PandaJr",
  },
  authors: [{ name: "PandaJr" }],
  keywords: ["embarazo", "embarazo en pareja", "padres primerizos", "semanas de embarazo", "contracciones", "obstetra"],
  openGraph: {
    title: "PandaJr: el embarazo en pareja, semana a semana",
    description: "Guía semanal del embarazo para la mamá y su pareja: tareas compartidas, citas con el obstetra, contador de contracciones y a quién llamar si algo es urgente.",
    url: "https://panda-jr.vercel.app",
    siteName: "PandaJr",
    locale: "es_LA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PandaJr: el embarazo en pareja, semana a semana",
    description: "Guía semanal del embarazo para la mamá y su pareja: tareas compartidas, citas con el obstetra, contador de contracciones y a quién llamar si algo es urgente.",
  },
  // Iconos e imágenes para compartir: convenciones de archivo de app/ (tienen prioridad sobre este objeto):
  // icon.svg (favicon vectorial), apple-icon.png (180), opengraph-image.png y twitter-image.png (1200×630,
  // con su .alt.txt). Los PNG del manifiesto viven en public/icons/. Procedencia: DESIGN.md §4.2.
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
      className={`${alegreya.variable} ${alegreyaSans.variable} h-full antialiased`}
    >
      <head>
        {/* Síncrono en <head>: pone la clase .dark ANTES del primer pintado (next/script
            beforeInteractive se encola y corre tras hidratar → destello). Misma regla que
            resolveTheme/migrateThemePreference de usePandaStore; ThemeSync la mantiene después. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-ground text-ink font-sans w-full overflow-x-hidden transition-colors duration-200">
        <ThemeSync />
        <PwaUpdates />
        {children}
      </body>
    </html>
  );
}
