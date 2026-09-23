"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Compass, Calendar, Bot, Send, CheckCircle2, Circle, Clock, ChevronRight, ChevronLeft, HeartPulse, Baby, Utensils, Info, ChevronDown, ChevronUp, Sparkles, Activity, Heart, X, Play, Square, Plus, Users, ClipboardList, Trophy, BriefcaseMedical, ShoppingBag, Home, FileText, AlertTriangle, Download, ArrowRight, ArrowLeft, History, CheckCircle, FileDown, Settings, Paperclip, MapPin, Briefcase, Package, Share2, Bell } from "lucide-react";

type Tab = "planificacion" | "agenda" | "herramientas" | "pandaia";

export interface UserProfile {
  role: "papa" | "mama";
  name: string;
  week: number;
  location: string;
  notes: string;
}

function ProfileModal({ 
  profile, 
  onSave, 
  onClose 
}: { 
  profile: UserProfile;
  onSave: (p: UserProfile) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(profile);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in"
    >
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-teal-600 p-4 flex justify-between items-center text-white">
          <h3 id="profile-modal-title" className="font-bold flex items-center gap-2">
            <Settings size={18} /> Configurar Perfil
          </h3>
          <button onClick={onClose} className="text-teal-100 hover:text-white transition-colors" aria-label="Cerrar ventana de perfil">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <p className="text-xs text-gray-500">
            Define quién está usando la app en este dispositivo. Esto adapta la Guía, la Agenda y PandaIA:
          </p>

          {/* Selector de Rol */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
              Rol en este dispositivo
            </label>
            <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, role: "papa" }))}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  form.role === "papa" ? "bg-white text-teal-700 shadow-sm" : "text-gray-500"
                }`}
              >
                🧔 Soy el Papá
              </button>
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, role: "mama" }))}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  form.role === "mama" ? "bg-white text-teal-700 shadow-sm" : "text-gray-500"
                }`}
              >
                👩 Soy la Mamá
              </button>
            </div>
          </div>

          {/* Nombre / Apodo */}
          <div>
            <label htmlFor="profile-name" className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
              Nombre o Apodo (Opcional)
            </label>
            <input
              id="profile-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Ej. Carlos o Sofía"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* Semana de Gestación */}
          <div>
            <label htmlFor="profile-week" className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
              Semana de Gestación Actual
            </label>
            <input
              id="profile-week"
              type="number"
              min={1}
              max={42}
              value={form.week}
              onChange={(e) => setForm(p => ({ ...p, week: parseInt(e.target.value, 10) || 1 }))}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* Ubicación / Ciudad (Opcional) */}
          <div>
            <label htmlFor="profile-location" className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
              Ciudad o País (Opcional)
            </label>
            <input
              id="profile-location"
              type="text"
              value={form.location}
              onChange={(e) => setForm(p => ({ ...p, location: e.target.value }))}
              placeholder="Para recomendaciones locales"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* Notas personales o médicas */}
          <div>
            <label htmlFor="profile-notes" className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
              Notas de rutina o preferencias
            </label>
            <textarea
              id="profile-notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Ej. Trabajo en turnos, cesárea programada, etc."
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none"
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSave(form)}
            className="flex-1 py-2.5 text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-md transition-all active:scale-95"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// --- SISTEMA DE PREPARACIÓN CLÍNICA Y RECORDATORIOS DE CITAS ---
export interface AppointmentPrepInfo {
  category: string;
  badge: string;
  whatToBring: string[];
  whatToAsk: string[];
  tip: string;
}

export function getAppointmentPrep(title: string): AppointmentPrepInfo {
  const t = (title || "").toLowerCase();

  if (t.includes("ecograf") || t.includes("ultra") || t.includes("tamizaje") || t.includes("scan") || t.includes("sonograf")) {
    const isT2 = t.includes("morfo") || t.includes("20") || t.includes("estructural") || t.includes("segundo");
    const is3D = t.includes("3d") || t.includes("4d") || t.includes("5d") || t.includes("emocional");

    if (isT2) {
      return {
        category: "Ecografía Morfológica (Semanas 20-24)",
        badge: "Anatomía Detallada",
        whatToBring: [
          "Ropa de dos piezas (blusa y pantalón holgado para facilitar acceso al vientre)",
          "Carpeta con todas las ecografías y analíticas del primer trimestre",
          "Snack ligero o zumo de fruta por si el bebé está dormido y el médico pide que camines 10 min",
          "Carnet perinatal y documento de identidad"
        ],
        whatToAsk: [
          "¿Se observan bien las 4 cámaras cardíacas y el flujo sanguíneo del corazón?",
          "¿El crecimiento cerebral, renal y óseo (fémur) concuerda con las semanas?",
          "¿Dónde está ubicada la placenta? (¿descartamos inserción baja o previa?)",
          "¿La cantidad de líquido amniótico y longitud cervical son óptimas?",
          "¿Podemos confirmar el sexo y ver el perfil del rostro?"
        ],
        tip: "Esta ecografía es la más minuciosa (dura 30-45 min). No te alarmes si el especialista se queda en silencio varios minutos: está tomando mediciones milimétricas de órganos vitales."
      };
    }

    if (is3D) {
      return {
        category: "Ecografía Emocional 3D / 4D / 5D",
        badge: "Visualización Fetal",
        whatToBring: [
          "Ropa cómoda de dos piezas",
          "Tomar un vaso de agua o zumo 20 minutos antes para activar el movimiento fetal",
          "Móvil con suficiente batería y espacio para guardar fotos y clips en video"
        ],
        whatToAsk: [
          "¿A quién se parece más el perfil o los rasgos faciales?",
          "¿Tiene las manitas o el cordón cubriéndose la cara?",
          "¿Cuál es el peso fetal estimado al día de hoy?"
        ],
        tip: "Si el bebé está de espaldas, acostarte de lado o caminar unos minutos en la sala suele ayudar a que cambie de postura."
      };
    }

    // Default Ecografía / Tamizaje 1er trimestre
    return {
      category: "Ecografía de Tamizaje (Semanas 11-14)",
      badge: "Desarrollo y Genética",
      whatToBring: [
        "Ropa cómoda de dos piezas (evita vestidos enteros)",
        "Vejiga moderadamente llena si lo solicitó el centro (2 vasos de agua 45 min antes)",
        "Resultados del análisis de sangre prenatal o ADN fetal (si ya se realizó)",
        "Carnet perinatal y seguro médico"
      ],
      whatToAsk: [
        "¿Cuál es la medida de la Translucencia Nucal (TN) y se visualiza el hueso nasal?",
        "¿Cuál es la longitud cráneo-caudal (CRL) y la fecha probable de parto recalculada?",
        "¿A cuántos latidos por minuto (bpm) está latiendo su corazón?",
        "¿Hay algún indicador que sugiera realizar estudios genéticos complementarios?"
      ],
      tip: "Pídele al especialista que les permita escuchar los latidos y grabar un pequeño fragmento si la clínica lo autoriza."
    };
  }

  if (t.includes("lab") || t.includes("sangre") || t.includes("orina") || t.includes("glucosa") || t.includes("curva") || t.includes("o'sullivan") || t.includes("analisis")) {
    const isGlucose = t.includes("glucosa") || t.includes("curva") || t.includes("sullivan") || t.includes("tolerancia");
    return {
      category: isGlucose ? "Curva de Glucosa (Test O'Sullivan)" : "Exámenes de Laboratorio",
      badge: isGlucose ? "Prueba Metabólica" : "Analítica Sanguínea",
      whatToBring: [
        "Confirmar horas de ayuno estricto (usualmente 8 a 10 horas de ayuno de comida)",
        "Botella de agua natural para beber sorbos pequeños si lo permiten",
        "Limón o toallitas húmedas por si el líquido dulce concentrado produce náuseas",
        "Libro, podcast o audífonos cargados (la estancia suele ser de 1 a 2 horas entre tomas)",
        "Merienda o snack nutritivo para comer INMEDIATAMENTE al terminar la última extracción"
      ],
      whatToAsk: [
        "¿Cuánto tardan los resultados y me los entregarán a mí o directo al obstetra?",
        "¿Si siento mareo o náusea durante la hora de espera, a quién debo avisar?",
        "¿Debo suspender las vitaminas prenatales o el hierro la mañana de la prueba?"
      ],
      tip: "Permanece sentada y tranquila durante la hora de espera tras beber la glucosa. Caminar o hacer esfuerzo altera la metabolización del azúcar."
    };
  }

  if (t.includes("parto") || t.includes("monitoreo") || t.includes("correa") || t.includes("anestesi") || t.includes("36") || t.includes("37") || t.includes("38") || t.includes("preparto")) {
    return {
      category: "Control Preparto y Monitoreo Fetal",
      badge: "Recta Final",
      whatToBring: [
        "Plan de Parto impreso (2 copias: una para tu carpeta y otra para el equipo obstétrico)",
        "Historial completo de embarazo, ecografías y analítica del estreptococo grupo B",
        "Ropa cómoda para monitoreo en camilla con correas abdominales",
        "Maleta del hospital verificada (por si se decide ingreso)"
      ],
      whatToAsk: [
        "¿En qué posición exacta está el bebé (cefálico anterior/posterior o podálico)?",
        "¿Hay signos de borramiento o dilatación en el cuello uterino?",
        "¿A partir de qué frecuencia y duración de contracciones regulares debemos ir a urgencias?",
        "¿Qué opciones de alivio del dolor (epidural, walking, calor local) están disponibles?",
        "¿Quién del equipo estará de guardia o asistirá el parto?"
      ],
      tip: "Lleva anotadas las dudas de logística: por qué puerta entrar de noche, estacionamiento de urgencias y documentación requerida al llegar."
    };
  }

  // Consulta Médica Obstétrica General / Control Mensual
  return {
    category: "Consulta Obstétrica de Control",
    badge: "Chequeo Periódico",
    whatToBring: [
      "Carnet de control perinatal",
      "Registro de presiones arteriales recientes (si te la tomas en casa o farmacia)",
      "Lista de síntomas o dudas anotadas durante las últimas semanas",
      "Nombres exactos de cualquier suplemento o vitamina que estés consumiendo"
    ],
    whatToAsk: [
      "¿La ganancia de peso y la altura de fondo uterino van en el percentil esperado?",
      "¿Los movimientos fetales que percibo son los esperados para esta semana?",
      "¿Puedo continuar con mi rutina de actividad física o requiere adaptaciones?",
      "¿Cuáles son los signos de alarma específicos por los que debería acudir a urgencias de inmediato?"
    ],
    tip: "Anota tus preguntas en cuanto surjan durante el mes en tu teléfono para no olvidar ninguna en los minutos de consulta."
  };
}

export function parseEventDate(ev: { rawDate?: string; date?: string; time?: string }): Date | null {
  if (ev.rawDate && /^\d{4}-\d{2}-\d{2}$/.test(ev.rawDate)) {
    const parts = ev.rawDate.split("-");
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    if (ev.time && ev.time !== "Por definir") {
      const match = ev.time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (match) {
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const ampm = match[3]?.toUpperCase();
        if (ampm === "PM" && h < 12) h += 12;
        if (ampm === "AM" && h === 12) h = 0;
        d.setHours(h, m, 0, 0);
      }
    }
    return d;
  }
  if (ev.date) {
    const parts = ev.date.trim().split(" ");
    if (parts.length >= 2) {
      const day = parseInt(parts[0], 10);
      const monthStr = parts[1].toLowerCase().slice(0, 3);
      const monthMap: Record<string, number> = {
        ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
        jul: 6, ago: 7, sep: 8, set: 8, oct: 9, nov: 10, dic: 11
      };
      const month = monthMap[monthStr] ?? 8;
      const year = new Date().getFullYear();
      const d = new Date(year, month, day);
      if (ev.time && ev.time !== "Por definir") {
        const match = ev.time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (match) {
          let h = parseInt(match[1], 10);
          const m = parseInt(match[2], 10);
          const ampm = match[3]?.toUpperCase();
          if (ampm === "PM" && h < 12) h += 12;
          if (ampm === "AM" && h === 12) h = 0;
          d.setHours(h, m, 0, 0);
        }
      }
      return d;
    }
  }
  return null;
}

export function getCountdownText(eventDate: Date): { text: string; isClose: boolean; daysLeft: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(eventDate);
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: "Cita pasada", isClose: false, daysLeft: diffDays };
  }
  if (diffDays === 0) {
    return { text: "¡Es hoy!", isClose: true, daysLeft: 0 };
  }
  if (diffDays === 1) {
    return { text: "¡Es mañana!", isClose: true, daysLeft: 1 };
  }
  if (diffDays <= 7) {
    return { text: `Faltan ${diffDays} días`, isClose: true, daysLeft: diffDays };
  }
  return { text: `En ${diffDays} días`, isClose: false, daysLeft: diffDays };
}

export function downloadIcsCalendar(ev: any, prep: AppointmentPrepInfo) {
  const parsedDate = parseEventDate(ev) || new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = parsedDate.getFullYear();
  const month = pad(parsedDate.getMonth() + 1);
  const day = pad(parsedDate.getDate());
  const hours = pad(parsedDate.getHours() || 10);
  const mins = pad(parsedDate.getMinutes() || 0);

  const dtStart = `${year}${month}${day}T${hours}${mins}00`;
  const endDate = new Date(parsedDate.getTime() + 60 * 60 * 1000);
  const dtEnd = `${year}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00`;

  const description = [
    `CITA MÉDICA: ${ev.title}`,
    `ESPECIALISTA: ${ev.doctor || "Por definir"}`,
    "",
    "🎒 QUÉ LLEVAR:",
    ...prep.whatToBring.map(item => `• ${item}`),
    "",
    "❓ PREGUNTAS CLAVE PARA EL MÉDICO:",
    ...prep.whatToAsk.map(item => `• ${item}`),
    "",
    `💡 CONSEJO PANDAJR: ${prep.tip}`
  ].join("\\n");

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PandaJR//Agenda Prenatal//ES",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:pandajr-${ev.id}-${Date.now()}@pandajr.app`,
    `DTSTAMP:${year}${month}${day}T000000Z`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:👶 Cita Médica: ${ev.title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${ev.doctor || "Consultorio médico"}`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:Recordatorio PandaJR (24h antes): ${ev.title}. ¡Revisa qué llevar y qué preguntar!`,
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    `DESCRIPTION:Recordatorio PandaJR (2h antes): ${ev.title} con ${ev.doctor || "tu médico"}.`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `cita-pandajr-${ev.id}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function openGoogleCalendar(ev: any, prep: AppointmentPrepInfo) {
  const parsedDate = parseEventDate(ev) || new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = parsedDate.getFullYear();
  const month = pad(parsedDate.getMonth() + 1);
  const day = pad(parsedDate.getDate());
  const hours = pad(parsedDate.getHours() || 10);
  const mins = pad(parsedDate.getMinutes() || 0);

  const startIso = `${year}${month}${day}T${hours}${mins}00`;
  const endDate = new Date(parsedDate.getTime() + 60 * 60 * 1000);
  const endIso = `${year}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00`;

  const details = [
    `CITA MÉDICA: ${ev.title}`,
    `ESPECIALISTA: ${ev.doctor || ""}`,
    "",
    "🎒 QUÉ LLEVAR:",
    ...prep.whatToBring.map(i => `• ${i}`),
    "",
    "❓ PREGUNTAS PARA EL DOCTOR:",
    ...prep.whatToAsk.map(i => `• ${i}`),
    "",
    `CONSEJO PANDAJR: ${prep.tip}`
  ].join("\n");

  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`👶 Cita: ${ev.title}`)}&dates=${startIso}/${endIso}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(ev.doctor || "")}`;
  window.open(url, "_blank");
}

export async function requestBrowserNotification(upcomingEvent?: any): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      if (upcomingEvent) {
        new Notification(`🔔 PandaJR: Recordatorio de Cita`, {
          body: `Próxima cita: "${upcomingEvent.title}" el ${upcomingEvent.date} a las ${upcomingEvent.time}. ¡Toca para ver qué llevar y qué preguntar!`,
          icon: "/icon.jpg"
        });
      } else {
        new Notification(`🔔 PandaJR: Recordatorios Activados`, {
          body: `¡Excelente! Te avisaremos de tus citas médicas y te recordaremos qué llevar y qué preguntar antes de salir.`,
          icon: "/icon.jpg"
        });
      }
      return true;
    }
  } catch(e) {
    console.error(e);
  }
  return false;
}

function AppointmentPrepModal({
  event,
  onClose,
  onAskPandaIA
}: {
  event: any;
  onClose: () => void;
  onAskPandaIA?: (question: string) => void;
}) {
  const prep = getAppointmentPrep(event.title);
  const parsedDate = parseEventDate(event);
  const countdown = parsedDate ? getCountdownText(parsedDate) : null;

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [checkedQuestions, setCheckedQuestions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`pandajr_prep_${event.id}`);
      if (saved) {
        const { items, questions } = JSON.parse(saved);
        if (items) setCheckedItems(items);
        if (questions) setCheckedQuestions(questions);
      }
    } catch(e) {}
  }, [event.id]);

  const toggleItem = (item: string) => {
    setCheckedItems(prev => {
      const updated = { ...prev, [item]: !prev[item] };
      try {
        localStorage.setItem(`pandajr_prep_${event.id}`, JSON.stringify({ items: updated, questions: checkedQuestions }));
      } catch(e) {}
      return updated;
    });
  };

  const toggleQuestion = (q: string) => {
    setCheckedQuestions(prev => {
      const updated = { ...prev, [q]: !prev[q] };
      try {
        localStorage.setItem(`pandajr_prep_${event.id}`, JSON.stringify({ items: checkedItems, questions: updated }));
      } catch(e) {}
      return updated;
    });
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="prep-modal-title"
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
    >
      <div className="bg-white w-full max-h-[92vh] sm:max-w-md sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl flex flex-col animate-in slide-in-from-bottom-6">
        {/* Header con gradiente */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-5 text-white shrink-0 relative">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white p-1.5 rounded-full transition-colors"
            aria-label="Cerrar guía de preparación"
          >
            <X size={18} />
          </button>
          
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-white/20 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full tracking-wide">
              {prep.badge}
            </span>
            {countdown && (
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${countdown.isClose ? "bg-amber-400 text-amber-950 font-black shadow-xs" : "bg-teal-800/80 text-teal-100"}`}>
                {countdown.text}
              </span>
            )}
          </div>

          <h3 id="prep-modal-title" className="text-xl font-black leading-tight pr-6">{event.title}</h3>
          
          <div className="flex items-center gap-4 mt-2.5 text-xs text-teal-100 font-medium">
            <span className="flex items-center gap-1.5"><Calendar size={14} className="text-teal-300" /> {event.date}</span>
            <span className="flex items-center gap-1.5"><Clock size={14} className="text-teal-300" /> {event.time}</span>
            {event.doctor && <span className="line-clamp-1">{event.doctor}</span>}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-6 overflow-y-auto flex-1 text-gray-800">
          
          {/* Tip destacado */}
          <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-3.5 flex gap-3 items-start shadow-xs">
            <Sparkles className="text-amber-500 shrink-0 mt-0.5" size={18} />
            <p className="text-xs text-amber-900 leading-relaxed font-medium">
              <strong className="font-bold">Consejo de preparación:</strong> {prep.tip}
            </p>
          </div>

          {/* Sección 1: Qué llevar */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <ShoppingBag size={17} className="text-teal-600" /> ¿Qué debes llevar?
              </h4>
              <span className="text-[11px] font-semibold text-gray-500">
                {Object.values(checkedItems).filter(Boolean).length} de {prep.whatToBring.length} listos
              </span>
            </div>
            <div className="space-y-2">
              {prep.whatToBring.map((item, idx) => {
                const isChecked = !!checkedItems[item];
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleItem(item)}
                    className={`w-full text-left p-3 rounded-xl border text-xs leading-relaxed transition-all flex items-start gap-2.5 ${
                      isChecked 
                        ? "bg-teal-50/70 border-teal-200 text-teal-900 line-through opacity-80" 
                        : "bg-white border-gray-100 hover:border-teal-200 text-gray-700 shadow-xs"
                    }`}
                  >
                    <div className={`mt-0.5 shrink-0 transition-colors ${isChecked ? "text-teal-600" : "text-gray-300"}`}>
                      {isChecked ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                    </div>
                    <span className="flex-1">{item}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sección 2: Qué preguntar al médico */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <ClipboardList size={17} className="text-teal-600" /> Preguntas clave para el doctor
              </h4>
              <span className="text-[11px] font-semibold text-gray-500">
                {Object.values(checkedQuestions).filter(Boolean).length} de {prep.whatToAsk.length} hechas
              </span>
            </div>
            <div className="space-y-2">
              {prep.whatToAsk.map((q, idx) => {
                const isChecked = !!checkedQuestions[q];
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleQuestion(q)}
                    className={`w-full text-left p-3 rounded-xl border text-xs leading-relaxed transition-all flex items-start gap-2.5 ${
                      isChecked 
                        ? "bg-emerald-50/70 border-emerald-200 text-emerald-900 line-through opacity-80" 
                        : "bg-white border-gray-100 hover:border-teal-200 text-gray-700 shadow-xs"
                    }`}
                  >
                    <div className={`mt-0.5 shrink-0 transition-colors ${isChecked ? "text-emerald-600" : "text-gray-300"}`}>
                      {isChecked ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                    </div>
                    <span className="flex-1 font-medium">{q}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Opciones de Recordatorio y Calendario */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <Bell size={15} className="text-teal-600" /> Sincronizar Alarmas de Recordatorio
            </p>
            <p className="text-[11px] text-gray-500 leading-snug">
              Añade esta cita a tu calendario del teléfono con 2 alarmas automáticas (24h y 2h antes) y todas estas preguntas guardadas en las notas.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => downloadIcsCalendar(event, prep)}
                className="py-2.5 px-3 bg-white hover:bg-gray-100 text-gray-800 font-bold text-xs rounded-xl border border-gray-200 shadow-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all text-center"
              >
                <span>📅 Apple / iCal (.ics)</span>
              </button>
              <button
                type="button"
                onClick={() => openGoogleCalendar(event, prep)}
                className="py-2.5 px-3 bg-white hover:bg-gray-100 text-teal-700 font-bold text-xs rounded-xl border border-teal-200 shadow-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all text-center"
              >
                <span>🗓️ Google Calendar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer con botón de consulta a PandaIA */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-2">
          {onAskPandaIA && (
            <button
              type="button"
              onClick={() => onAskPandaIA(`Tengo una cita de "${event.title}" con ${event.doctor || "mi médico"} el ${event.date}. ¿Qué otros consejos o preparaciones me recomiendas como ${event.title}?`)}
              className="flex-1 py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
            >
              <Bot size={16} /> Consultar con PandaIA
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold text-xs transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PandaJRApp() {
  const [activeTab, setActiveTab] = useState<Tab>("planificacion");

  // Perfil global de usuario (compartido en toda la app)
  const [profile, setProfile] = useState<UserProfile>({
    role: "papa",
    name: "",
    week: 14,
    location: "",
    notes: ""
  });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedPrepEvent, setSelectedPrepEvent] = useState<any | null>(null);
  const [aiInitialQuery, setAiInitialQuery] = useState<string>("");

  // Cargar perfil global de localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pandajr_user_profile");
      if (saved) {
        setProfile(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => {
      const updated = { ...prev, ...updates };
      try {
        localStorage.setItem("pandajr_user_profile", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };
  
  const [events, setEvents] = useState([
    { id: 1, date: "15 Oct", rawDate: "2026-10-15", time: "10:30 AM", title: "Ecografía de las 12 Semanas (Tamizaje)", doctor: "Dra. Ramírez" },
    { id: 2, date: "28 Oct", rawDate: "2026-10-28", time: "09:00 AM", title: "Exámenes de laboratorio", doctor: "Laboratorio Central" },
  ]);

  // Próxima cita cronológica más cercana
  const nextUpcomingEvent = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parsedList = events
      .map(e => ({ ...e, parsedDate: parseEventDate(e) }))
      .filter(e => e.parsedDate !== null && e.parsedDate.getTime() >= today.getTime())
      .sort((a, b) => a.parsedDate!.getTime() - b.parsedDate!.getTime());
    return parsedList[0] || (events.length > 0 ? events[0] : null);
  }, [events]);

  const [toast, setToast] = useState<{message: string, onUndo: () => void} | null>(null);
  const showToast = (message: string, onUndo: () => void) => {
    setToast({ message, onUndo });
    setTimeout(() => setToast(null), 5000);
  };

  // Cargar eventos guardados de localStorage y sincronizar si la pareja compartió citas (?sync_events=)
  useEffect(() => {
    try {
      // 1. Cargar citas locales del teléfono
      const saved = localStorage.getItem("pandajr_events");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setEvents(parsed);
        }
      }

      // 2. Revisar si se abrió un enlace de sincronización de la pareja
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const syncData = params.get("sync_events");
        if (syncData) {
          try {
            const decoded = JSON.parse(decodeURIComponent(escape(atob(syncData))));
            if (Array.isArray(decoded) && decoded.length > 0) {
              setEvents(decoded);
              localStorage.setItem("pandajr_events", JSON.stringify(decoded));
              showToast("¡Agenda sincronizada con tu pareja! 👶", () => {});
              setActiveTab("agenda");
              // Limpiar URL sin recargar
              const cleanUrl = new URL(window.location.href);
              cleanUrl.searchParams.delete("sync_events");
              window.history.replaceState({}, "", cleanUrl.pathname);
            }
          } catch (err) {
            console.error("Error al procesar citas compartidas:", err);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Guardar en localStorage cuando se agreguen o editen citas
  useEffect(() => {
    try {
      localStorage.setItem("pandajr_events", JSON.stringify(events));
    } catch (e) {
      console.error(e);
    }
  }, [events]);

  const handleAIAddEvent = (title: string, date: string, time: string, doctor: string, rawDate?: string) => {
    setEvents(prev => [...prev, { id: Date.now(), date, rawDate: rawDate || "", time, title, doctor }]);
  };


  return (
    <div className="flex flex-col min-h-screen w-full max-w-md mx-auto bg-gray-50 text-gray-900 font-sans relative pb-16 shadow-2xl overflow-x-hidden">
      {/* Header con Logo, Alerta de Cita y Selector Global de Perfil */}
      <header className="bg-white px-5 py-2.5 shadow-sm sticky top-0 z-40 w-full flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="sr-only">PandaJR</h1>
          <Image 
            src="/logo.png" 
            alt="PandaJR" 
            width={136} 
            height={36} 
            priority 
            className="h-8 sm:h-9 w-auto object-contain"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Botón Campana de Recordatorio de Cita */}
          {events.length > 0 && (
            <button
              onClick={() => {
                if (nextUpcomingEvent) {
                  setSelectedPrepEvent(nextUpcomingEvent);
                } else {
                  setSelectedPrepEvent(events[0]);
                }
              }}
              className={`p-2 rounded-full border transition-all active:scale-95 relative ${
                nextUpcomingEvent ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100" : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"
              }`}
              title={nextUpcomingEvent ? `Recordatorio de cita: ${nextUpcomingEvent.title}` : "Citas médicas"}
              aria-label="Recordatorio de citas médicas"
            >
              <Bell size={15} />
              {nextUpcomingEvent && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
              )}
              {nextUpcomingEvent && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full border-2 border-white"></span>
              )}
            </button>
          )}

          {/* Botón Global de Perfil / Switcher */}
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200/70 hover:bg-teal-100 transition-all text-xs font-bold text-teal-700 active:scale-95 shadow-xs"
            title="Configurar tu rol y perfil en este dispositivo"
          >
            <span>{profile.role === "papa" ? "🧔" : "👩"}</span>
            <span>{profile.name || (profile.role === "papa" ? "Papá" : "Mamá")}</span>
            <Settings size={13} className="text-teal-500 opacity-70 ml-0.5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full overflow-y-auto pb-6">
        <div className={activeTab === "planificacion" ? "block w-full h-full" : "hidden"}>
          <GuiaPapaView showToast={showToast} profile={profile} updateProfile={updateProfile} />
        </div>
        <div className={activeTab === "agenda" ? "block w-full h-full" : "hidden"}>
          <AgendaView 
            showToast={showToast} 
            events={events} 
            setEvents={setEvents} 
            profile={profile} 
            updateProfile={updateProfile}
            onOpenPrep={(ev) => setSelectedPrepEvent(ev)}
          />
        </div>
        <div className={activeTab === "herramientas" ? "block w-full h-full" : "hidden"}>
          <HerramientasView showToast={showToast} />
        </div>
        <div className={activeTab === "pandaia" ? "block w-full h-full" : "hidden"}>
          <PandaIAView 
            showToast={showToast} 
            addEvent={handleAIAddEvent} 
            profile={profile} 
            openProfileModal={() => setIsProfileModalOpen(true)}
            initialQuery={aiInitialQuery}
            clearInitialQuery={() => setAiInitialQuery("")}
          />
        </div>
      </main>

      {/* Profile Modal Global */}
      {isProfileModalOpen && (
        <ProfileModal
          profile={profile}
          onSave={(newProfile) => {
            updateProfile(newProfile);
            showToast("Perfil actualizado en este dispositivo", () => {});
            setIsProfileModalOpen(false);
          }}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}

      {/* Modal Guía de Preparación y Recordatorio de Cita */}
      {selectedPrepEvent && (
        <AppointmentPrepModal
          event={selectedPrepEvent}
          onClose={() => setSelectedPrepEvent(null)}
          onAskPandaIA={(question) => {
            setSelectedPrepEvent(null);
            setAiInitialQuery(question);
            setActiveTab("pandaia");
          }}
        />
      )}

      {/* Floating Toast Notification with Undo */}
      {toast && (
        <div className="fixed bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] left-4 right-4 max-w-[calc(28rem-2rem)] mx-auto bg-gray-900/95 text-white px-4 py-3 rounded-2xl shadow-2xl z-50 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200 backdrop-blur-sm border border-gray-800">
          <span className="text-sm font-medium">{toast.message}</span>
          <button 
            onClick={() => { toast.onUndo(); setToast(null); }}
            className="text-teal-400 font-bold text-xs uppercase tracking-wider hover:text-teal-300 transition-colors px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 shrink-0"
          >
            Deshacer
          </button>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 flex justify-around items-center px-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-50">
        <NavItem
          icon={<Compass size={24} />}
          label="Guía"
          isActive={activeTab === "planificacion"}
          onClick={() => setActiveTab("planificacion")}
        />
        <NavItem
          icon={<Calendar size={24} />}
          label="Agenda"
          isActive={activeTab === "agenda"}
          onClick={() => setActiveTab("agenda")}
        />
        <NavItem
          icon={<Activity size={24} />}
          label="Herramientas"
          isActive={activeTab === "herramientas"}
          onClick={() => setActiveTab("herramientas")}
        />
        <NavItem
          icon={<Bot size={24} />}
          label="PandaIA"
          isActive={activeTab === "pandaia"}
          onClick={() => setActiveTab("pandaia")}
        />
      </nav>
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 w-full p-2 transition-colors duration-200 ${
        isActive ? "text-teal-600 font-semibold" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

// --- VISTA 1: GUÍA DEL PAPÁ ---
const masterCategories = [
  // TRIMESTRE 1 (Semanas 1-13)
  {
    id: "t1_nutricion", trimester: 1, defaultExpanded: true,
    title: "Neuro-Nutrición (Pilar 1)",
    icon: <Utensils className="text-amber-500" size={20} />, color: "bg-amber-50",
    tasks: [
      { id: 110, text: "Garantizar Suplemento de Ácido Fólico diario" },
      { id: 111, text: "Mantener su termo de agua lleno (volumen amniótico)" },
      { id: 112, text: "Snacks secos en su buró (contra náuseas matutinas)" },
    ]
  },
  {
    id: "t1_toxicos", trimester: 1, defaultExpanded: true,
    title: "Escudo Ambiental (Pilar 2)",
    icon: <AlertTriangle className="text-rose-500" size={20} />, color: "bg-rose-50",
    tasks: [
      { id: 113, text: "Tirar/Donar tuppers de plástico (BPA interfiere hormonas)" },
      { id: 114, text: "Asumir tú la limpieza con químicos (evitar VOCs)" },
      { id: 115, text: "Asumir tú la caja del gato 100% (Prevención Toxoplasmosis)" },
    ]
  },
  {
    id: "t1_citas", trimester: 1, defaultExpanded: false,
    title: "Salud y Citas Médicas",
    icon: <Activity className="text-teal-500" size={20} />, color: "bg-teal-50",
    tasks: [
      { id: 101, text: "Agendar primera cita obstétrica" },
      { id: 102, text: "Preguntar sobre cobertura de seguro médico" },
      { id: 103, text: "Acompañar a la primera ecografía" },
    ]
  },
  // TRIMESTRE 2 (Semanas 14-27)
  {
    id: "t2_nutricion", trimester: 2, defaultExpanded: true,
    title: "Neuro-Nutrición y DHA",
    icon: <Utensils className="text-amber-500" size={20} />, color: "bg-amber-50",
    tasks: [
      { id: 210, text: "Suplemento DHA/Omega-3 (Desarrollo corteza frontal)" },
      { id: 211, text: "Garantizar Colina en dieta (Huevos, pollo magro)" },
      { id: 212, text: "Monitorear hierro (Prevenir anemia por dilución de sangre)" },
    ]
  },
  {
    id: "t2_estres", trimester: 2, defaultExpanded: true,
    title: "Gestor de Cortisol (Pilar 3)",
    icon: <Heart className="text-rose-500" size={20} />, color: "bg-rose-50",
    tasks: [
      { id: 213, text: "Asumir la carga mental de planear las cenas" },
      { id: 214, text: "Agendarle un masaje prenatal o día de descanso total" },
      { id: 215, text: "Bloquear críticas o estrés externo hacia ella" },
    ]
  },
  {
    id: "t2_compras", trimester: 2, defaultExpanded: false,
    title: "Primeras compras",
    icon: <ShoppingBag className="text-teal-500" size={20} />, color: "bg-teal-50",
    tasks: [
      { id: 204, text: "Cotizar cochecito/carriola" },
      { id: 205, text: "Comprar almohada de embarazo (Alineación pélvica)" },
    ]
  },
  // TRIMESTRE 3 (Semanas 28+)
  {
    id: "t3_biomecanica", trimester: 3, defaultExpanded: true,
    title: "Microbioma y Pelvis (Pilar 4)",
    icon: <Activity className="text-teal-500" size={20} />, color: "bg-teal-50",
    tasks: [
      { id: 310, text: "Vacuna DTPa para ambos (Anticuerpos pasivos al feto)" },
      { id: 311, text: "Probióticos en dieta (Yogur/Kefir) para sembrar microbioma" },
      { id: 312, text: "Ejercicios en pelota de pilates para abrir pelvis" },
    ]
  },
  {
    id: "t3_maleta", trimester: 3, defaultExpanded: true,
    title: "Maleta de hospital",
    icon: <BriefcaseMedical className="text-rose-500" size={20} />, color: "bg-rose-50",
    tasks: [
      { id: 301, text: "Documentos de identidad y seguro" },
      { id: 302, text: "Ropa cómoda para tu pareja" },
      { id: 303, text: "Primera ropita del bebé" },
      { id: 304, text: "Snacks (Dátiles para energía durante dilatación)" },
    ]
  },
  {
    id: "t3_logistica", trimester: 3, defaultExpanded: false,
    title: "Logística del parto",
    icon: <MapPin className="text-teal-500" size={20} />, color: "bg-teal-50",
    tasks: [
      { id: 305, text: "Instalar silla de coche y aprender a usarla" },
      { id: 306, text: "Simulacro de ruta al hospital (medir tiempos)" },
      { id: 307, text: "Imprimir plan de parto" },
    ]
  }
];

function getWeekData(week: number) {
  const data: Record<number, any> = {
    4: { size: "Semilla de amapola 🌱", length: "0.1 cm", weight: "1 g", milestone: "Implantación del blastocisto", dadMission: "Blindaje absoluto: asegura su ácido fólico diario y elimina cualquier humo o químico ambiental." },
    8: { size: "Frambuesa 🫐", length: "1.6 cm", weight: "1 g", milestone: "Corazón late a 150 bpm", dadMission: "Toma tú el control de la cocina: los olores fuertes le causarán aversión. Ventila la casa." },
    10: { size: "Fresa 🍓", length: "3.1 cm", weight: "4 g", milestone: "Dedos de manos y pies diferenciados", dadMission: "Mantén galletas saladas en su buró: comer algo antes de pisar el suelo frena las náuseas matutinas." },
    12: { size: "Ciruela 🍑", length: "5.4 cm", weight: "14 g", milestone: "Fin de la organogénesis crítica", dadMission: "Acompáñala a la ecografía de tamizaje genético (traslucencia nucal) y anota todas las dudas médicas." },
    14: { size: "Limón 🍋", length: "8.7 cm", weight: "43 g", milestone: "Glándula tiroides funcional", dadMission: "El cerebro fetal triplica su sinapsis. Prepara cenas ricas en Colina (huevos) y DHA (salmón)." },
    15: { size: "Manzana 🍎", length: "10.1 cm", weight: "70 g", milestone: "Esqueleto en proceso de osificación", dadMission: "El bebé absorbe calcio a toda velocidad. Garantiza lácteos, almendras o suplementos de calcio." },
    16: { size: "Aguacate 🥑", length: "11.6 cm", weight: "100 g", milestone: "Reflejos de prensión y succión", dadMission: "Su volumen de sangre subió 50%. Vigila que tome al menos 2.5 litros de agua al día." },
    18: { size: "Pimiento 🫑", length: "14.2 cm", weight: "190 g", milestone: "Oído interno completamente formado", dadMission: "Tu voz ya es audible para el bebé. Háblale directo a la barriga todas las noches al acostarse." },
    20: { size: "Plátano 🍌", length: "25.6 cm", weight: "300 g", milestone: "Mitad del camino: Ecografía Morfológica", dadMission: "Bloquea tu agenda laboral: esta es la ecografía anatómica detallada donde podrán confirmar el sexo." },
    24: { size: "Mazorca de maíz 🌽", length: "30.0 cm", weight: "600 g", milestone: "Viabilidad pulmonar incipiente", dadMission: "Semana del test de O'Sullivan (glucosa). Acompáñala al laboratorio para apoyarla con el ayuno." },
    28: { size: "Berenjena 🍆", length: "37.6 cm", weight: "1000 g", milestone: "Apertura de párpados y sueño REM", dadMission: "Gestiona la vacuna DTPa (tos ferina) para ambos: le transmitirán anticuerpos pasivos vitales." },
    32: { size: "Piña 🍍", length: "42.4 cm", weight: "1700 g", milestone: "Maduración del sistema nervioso central", dadMission: "Arma la pelota de pilates y ayúdala a hacer rotaciones pélvicas para aliviar el dolor lumbar." },
    36: { size: "Melón 🍈", length: "47.4 cm", weight: "2600 g", milestone: "Bebé descendiendo hacia la pelvis", dadMission: "Instala la silla de auto en tu vehículo y practica asegurarla con los cinturones y anclajes ISOFIX." },
    38: { size: "Sandía 🍉", length: "49.8 cm", weight: "3000 g", milestone: "Embarazo a término completo", dadMission: "Dale 6 dátiles diarios (evidencia clínica para dilatación) y mantén la maleta en la cajuela del coche." },
    40: { size: "Calabaza 🎃", length: "51.2 cm", weight: "3400 g", milestone: "¡Listos para el gran encuentro!", dadMission: "Monitorea las contracciones con la Regla 5-1-1 y sé su ancla de calma y respiración durante el parto." },
  };

  if (data[week]) return data[week];

  // Cálculo biológico coherente para cualquier otra semana intermedia (1 a 42)
  const isT1 = week <= 13;
  const isT2 = week > 13 && week <= 27;
  const lengthEst = (week * 1.25).toFixed(1);
  const weightEst = week < 10 ? (week * 0.8).toFixed(0) : Math.round(Math.pow(week / 4.2, 3) * 11);
  
  return { 
    size: isT1 ? "Semilla / Baya silvestre 🫐" : isT2 ? "Vegetal nutritivo 🥑" : "Fruta madura 🍉", 
    length: `${lengthEst} cm`, 
    weight: `${weightEst} g`, 
    milestone: isT1 ? "Organogénesis y multiplicación celular acelerada" : isT2 ? "Desarrollo de sentidos y corteza cerebral" : "Ganancia de peso y maduración pulmonar", 
    dadMission: isT1 
      ? "Evita que cargue peso, mantén la casa ventilada y apóyala con las comidas ligeras." 
      : isT2 
      ? "Cuiden la alineación de la espalda con la almohada de embarazo y mantengan rutinas de caminata." 
      : "Ten lista la logística de transporte, tanque de gasolina lleno y números de emergencia a mano." 
  };
}

function GuiaPapaView({ showToast, profile, updateProfile }: { showToast: any, profile: UserProfile, updateProfile: (u: Partial<UserProfile>) => void }) {
  const week = profile.week || 14;
  const setWeek = (updater: number | ((w: number) => number)) => {
    const nextWeek = typeof updater === "function" ? updater(week) : updater;
    updateProfile({ week: nextWeek });
  };
  const weekData = getWeekData(week);

  // Checklist state
    const currentTrimester = React.useMemo(() => week <= 13 ? 1 : week <= 27 ? 2 : 3, [week]);
  
  const [taskStatus, setTaskStatus] = React.useState<Record<number, "completed" | "dismissed">>({});
  const [expandedCats, setExpandedCats] = React.useState<Record<string, boolean>>({});

  const categories = React.useMemo(() => {
    return masterCategories
      .filter(cat => cat.trimester === currentTrimester)
      .map(cat => ({
        ...cat,
        expanded: expandedCats[cat.id] !== undefined ? expandedCats[cat.id] : cat.defaultExpanded,
        tasks: cat.tasks
          .filter(t => taskStatus[t.id] !== "dismissed")
          .map(t => ({ ...t, completed: taskStatus[t.id] === "completed" }))
      }));
  }, [currentTrimester, taskStatus, expandedCats]);

  const toggleExpand = (id: string) => {
    setExpandedCats(prev => ({ ...prev, [id]: categories.find(c => c.id === id)?.expanded ? false : true }));
  };

  const toggleTask = (catId: string, taskId: number) => {
    setTaskStatus(prev => ({
      ...prev,
      [taskId]: prev[taskId] === "completed" ? undefined : "completed"
    }) as any);
  };

  const clearCompleted = (catId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    
    const completedIds = cat.tasks.filter(t => t.completed).map(t => t.id);
    const oldStatus = { ...taskStatus };
    
    const newStatus = { ...taskStatus };
    completedIds.forEach(id => newStatus[id] = "dismissed");
    
    setTaskStatus(newStatus as any);
    showToast("Tareas limpiadas", () => setTaskStatus(oldStatus));
  };

  const totalTasks = categories.reduce((acc, cat) => acc + cat.tasks.length, 0);
  const completedTasks = categories.reduce((acc, cat) => acc + cat.tasks.filter(t => t.completed).length, 0);
  const progressPercent = Math.round((completedTasks / totalTasks) * 100) || 0;

  return (
    <div className="p-5 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* 1. Week Selector & Info */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Selector */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-500 p-4 text-white flex items-center justify-between">
          <button aria-label="Semana anterior"
            onClick={() => setWeek(w => Math.max(1, w - 1))}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="text-center">
            <p className="text-teal-100 text-xs font-semibold uppercase tracking-wider mb-1">Semana de Gestación</p>
            <h2 className="text-3xl font-black">{week}</h2>
          </div>
          <button aria-label="Semana siguiente"
            onClick={() => setWeek(w => Math.min(40, w + 1))}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Fetal Size Info */}
        <div className="p-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-gray-500 text-xs uppercase font-bold mb-1">Tamaño comparativo</p>
              <p className="text-xl font-bold text-gray-800">{weekData.size}</p>
            </div>
            <div className="bg-teal-50 p-3 rounded-2xl">
              <Baby size={32} className="text-teal-600" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
              <p className="text-gray-400 text-xs font-semibold mb-1">Longitud</p>
              <p className="font-bold text-gray-700">{weekData.length}</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
              <p className="text-gray-400 text-xs font-semibold mb-1">Peso est.</p>
              <p className="font-bold text-gray-700">{weekData.weight}</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
            <Sparkles size={24} className="text-amber-500 shrink-0" />
            <div>
              <p className="text-amber-800 text-xs font-bold uppercase mb-1">Hito de la semana</p>
              <p className="text-amber-900 text-sm font-medium">{weekData.milestone}</p>
            </div>
          </div>
        </div>

        {/* Misión */}
        <div className="bg-teal-50 border-t border-teal-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={18} className="text-teal-600" />
            <h3 className="font-bold text-teal-800 text-sm">
              {profile.role === "papa" ? "Misión del Papá" : "Misión de la Mamá"}
            </h3>
          </div>
          <p className="text-teal-900 text-sm leading-relaxed">
            {weekData.dadMission}
          </p>
        </div>
      </div>

      {/* 2. Checklist Module */}
      <div>
        <div className="flex justify-between items-end mb-3">
          <h2 className="text-xl font-bold text-gray-800">
            {profile.role === "papa" ? "Checklists del Papá" : "Checklists de la Mamá"}
          </h2>
          <span className="text-teal-600 font-bold text-sm">{progressPercent}% completado</span>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-5 overflow-hidden">
          <div className="bg-teal-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
        </div>

        <div className="space-y-4">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <button 
                onClick={() => toggleExpand(cat.id)}
                className="w-full p-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`${cat.color} p-2 rounded-xl`}>
                    {cat.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-left">{cat.title}</h3>
                    <p className="text-xs text-gray-500 text-left">
                      {cat.tasks.filter(t => t.completed).length} de {cat.tasks.length} completadas
                    </p>
                  </div>
                </div>
                {cat.expanded ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
              </button>
              
              {cat.expanded && (
                <div className="p-4 pt-0 border-t border-gray-50 bg-gray-50/50">
                  <div className="space-y-2 mt-3">
                    {cat.tasks.map(task => (
                      <button 
                        key={task.id} 
                        onClick={() => toggleTask(cat.id, task.id)}
                        aria-checked={task.completed}
                        role="switch"
                        className="w-full text-left flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-100 cursor-pointer hover:border-teal-200 transition-colors group focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <div className={`mt-0.5 shrink-0 transition-colors ${task.completed ? "text-teal-500" : "text-gray-300 group-hover:text-teal-400"}`}>
                          {task.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                        </div>
                        <span className={`text-sm leading-snug ${task.completed ? "text-gray-400 line-through" : "text-gray-700"}`}>
                          {task.text}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// --- VISTA 2: AGENDA ---
function AgendaView({ 
  showToast, 
  events, 
  setEvents, 
  profile, 
  updateProfile,
  onOpenPrep
}: { 
  showToast: any, 
  events: any[], 
  setEvents: any, 
  profile: UserProfile, 
  updateProfile: (u: Partial<UserProfile>) => void,
  onOpenPrep: (ev: any) => void
}) {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState<any>(null);
  
  const [newEvent, setNewEvent] = React.useState({ title: "", date: "", time: "", doctor: "" });

  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsModalOpen(false);
    };
    if (isModalOpen) {
      window.addEventListener("keydown", handleEsc);
      return () => window.removeEventListener("keydown", handleEsc);
    }
  }, [isModalOpen]);

  const deleteEvent = (id: number) => {
    const oldEvents = [...events];
    setEvents(events.filter(e => e.id !== id));
    showToast("Cita eliminada", () => setEvents(oldEvents));
  };

  const toInputDateFormat = (dateStr?: string, rawDate?: string) => {
    if (rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return rawDate;
    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    if (dateStr) {
      const parts = dateStr.trim().split(" ");
      if (parts.length >= 2) {
        const day = parts[0].padStart(2, "0");
        const monthStr = parts[1].toLowerCase().slice(0, 3);
        const monthMap: Record<string, string> = {
          ene: "01", feb: "02", mar: "03", abr: "04", may: "05", jun: "06",
          jul: "07", ago: "08", sep: "09", set: "09", oct: "10", nov: "11", dic: "12"
        };
        const month = monthMap[monthStr] || "09";
        const year = new Date().getFullYear();
        return `${year}-${month}-${day}`;
      }
    }
    return new Date().toISOString().split("T")[0];
  };

  const handleSaveEvent = () => {
    if (!newEvent.title || !newEvent.date) return;
    
    // Parse date (e.g. "2026-09-28" to "28 Sep")
    let displayDate = newEvent.date;
    try {
      const parts = newEvent.date.split("-");
      if (parts.length === 3) {
        const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const monthIdx = parseInt(parts[1], 10) - 1;
        displayDate = `${parseInt(parts[2], 10)} ${months[monthIdx] || parts[1]}`;
      }
    } catch(e) {}

    const eventObj = {
      id: editingEvent ? editingEvent.id : Date.now(),
      date: displayDate,
      rawDate: newEvent.date,
      time: newEvent.time || "Por definir",
      title: newEvent.title,
      doctor: newEvent.doctor
    };

    if (editingEvent) {
      setEvents(events.map(e => e.id === editingEvent.id ? eventObj : e));
    } else {
      setEvents([...events, eventObj]);
    }
    
    setIsModalOpen(false);
    setNewEvent({ title: "", date: "", time: "", doctor: "" });
    setEditingEvent(null);
  };

  const openEdit = (ev: any) => {
    setEditingEvent(ev);
    setNewEvent({ 
      title: ev.title, 
      date: toInputDateFormat(ev.date, ev.rawDate), 
      time: (ev.time && ev.time !== "Por definir") ? ev.time : "", 
      doctor: ev.doctor || "" 
    });
    setIsModalOpen(true);
  };

  const openNew = () => {
    setEditingEvent(null);
    setNewEvent({ 
      title: "", 
      date: new Date().toISOString().split("T")[0], 
      time: "10:00", 
      doctor: "" 
    });
    setIsModalOpen(true);
  };

  const [suggestions, setSuggestions] = React.useState({
    mama: [
      { id: "m1", text: "Sugerencia: Agendar ecografía de tamizaje (Traslucencia Nucal)." },
      { id: "m2", text: "Sugerencia: Revisar vitaminas prenatales para el segundo trimestre." }
    ],
    papa: [
      { id: "p1", text: "Sugerencia: Planificar cómo dar la gran noticia a la familia y amigos." },
      { id: "p2", text: "Sugerencia: Bloquear agenda para acompañar a la ecografía de las 12 semanas." }
    ]
  });

  const dismissSuggestion = (id: string) => {
    const oldMama = [...suggestions.mama];
    const oldPapa = [...suggestions.papa];
    setSuggestions(prev => ({
      mama: prev.mama.filter(s => s.id !== id),
      papa: prev.papa.filter(s => s.id !== id)
    }));
    showToast("Sugerencia descartada", () => setSuggestions({ mama: oldMama, papa: oldPapa }));
  };

  const shareWithPartner = () => {
    try {
      const dataStr = btoa(unescape(encodeURIComponent(JSON.stringify(events))));
      const shareUrl = `${window.location.origin}/?sync_events=${dataStr}`;
      
      const summary = events.map(e => `• ${e.date} (${e.time}): ${e.title} - ${e.doctor}`).join("\n");
      const text = `¡Hola amor! Te comparto nuestra agenda médica actualizada de PandaJR:\n\n${summary}\n\n👉 Ábrelo aquí para sincronizarlo en tu teléfono:\n${shareUrl}`;

      if (navigator.share) {
        navigator.share({
          title: "Agenda Médica PandaJR",
          text: text,
        }).catch(() => {});
      } else {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
      }
    } catch(err) {
      console.error(err);
      if (showToast) showToast("No se pudo generar el enlace de sincronización", () => {});
    }
  };

  const nextUpcoming = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parsedList = events
      .map(e => ({ ...e, parsedDate: parseEventDate(e) }))
      .filter(e => e.parsedDate !== null && e.parsedDate.getTime() >= today.getTime())
      .sort((a, b) => a.parsedDate!.getTime() - b.parsedDate!.getTime());
    return parsedList[0] || null;
  }, [events]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 relative h-full flex flex-col">
      {/* Header destacado */}
      <div className="bg-teal-600 px-6 py-8 text-white rounded-b-3xl shadow-md shrink-0">
        <p className="text-teal-100 text-sm font-medium mb-1">Etapa actual</p>
        <h2 className="text-2xl font-bold">Semana {profile.week} <br/><span className="text-lg font-medium text-teal-200">({profile.week <= 13 ? "Primer trimestre" : profile.week <= 27 ? "Segundo trimestre" : "Tercer trimestre"})</span></h2>
        <div className="mt-4 bg-white/20 rounded-full h-1.5 w-full overflow-hidden">
          <div className="bg-white h-full transition-all duration-500 rounded-full" style={{ width: `${Math.min(100, Math.round((profile.week / 40) * 100))}%` }}></div>
        </div>
        <p className="text-teal-50 text-xs mt-2 text-right">Faltan {Math.max(0, 40 - profile.week)} semanas</p>
      </div>

      <div className="p-5 flex-1 overflow-y-auto space-y-6 pb-20">
        
        {/* Banner de Recordatorio de Próxima Cita */}
        {nextUpcoming && (
          <button 
            type="button"
            onClick={() => onOpenPrep(nextUpcoming)}
            className="w-full text-left bg-gradient-to-br from-amber-500/10 via-orange-50 to-white border border-amber-200/90 rounded-3xl p-4 shadow-sm hover:shadow-md cursor-pointer transition-all active:scale-[0.99] group relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="bg-amber-100 text-amber-800 p-2.5 rounded-2xl shrink-0 mt-0.5 group-hover:scale-105 transition-transform shadow-xs">
                  <Bell size={20} className="animate-pulse text-amber-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full">
                      Recordatorio de Cita
                    </span>
                    <span className="text-xs font-bold text-amber-950">
                      {getCountdownText(parseEventDate(nextUpcoming)!).text}
                    </span>
                  </div>
                  <h4 className="font-bold text-gray-900 text-base mt-1 leading-tight">{nextUpcoming.title}</h4>
                  <p className="text-xs text-gray-600 mt-1 flex items-center gap-2">
                    <span>📅 {nextUpcoming.date} ({nextUpcoming.time})</span>
                    {nextUpcoming.doctor && <span>· {nextUpcoming.doctor}</span>}
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-amber-500 shrink-0 mt-2 group-hover:translate-x-1 transition-transform" />
            </div>

            <div className="mt-3.5 pt-2.5 border-t border-amber-200/60 flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-amber-950">
                <ClipboardList size={13} className="text-amber-700" /> Preparación: ¿Qué llevar y qué preguntar?
              </span>
              <span className="text-teal-700 group-hover:underline">Abrir →</span>
            </div>
          </button>
        )}

        {/* Toggle Perfil */}
        <div>
          <div className="flex bg-gray-100 rounded-full p-1 mb-3">
            <button 
              onClick={() => updateProfile({ role: "mama" })}
              className={`flex-1 py-1.5 text-sm font-bold rounded-full transition-colors ${profile.role === "mama" ? "bg-white text-teal-600 shadow-sm" : "text-gray-500"}`}
            >
              Perfil: Mamá
            </button>
            <button 
              onClick={() => updateProfile({ role: "papa" })}
              className={`flex-1 py-1.5 text-sm font-bold rounded-full transition-colors ${profile.role === "papa" ? "bg-white text-teal-600 shadow-sm" : "text-gray-500"}`}
            >
              Perfil: Papá
            </button>
          </div>
          
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-teal-100 bg-gradient-to-br from-teal-50/50 to-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 bg-teal-100 text-teal-600 text-[10px] font-bold px-2 py-1 rounded-bl-xl">IA ACTIVA</div>
            
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-teal-100 p-1.5 rounded-full"><Sparkles className="text-teal-600" size={16} /></div>
              <h3 className="font-bold text-gray-800 text-sm">Sugeridas para ti</h3>
            </div>
            
            <div className="space-y-2">
              {(profile.role === "mama" ? suggestions.mama : suggestions.papa).map((s) => (
                <div key={s.id} className="flex gap-2 items-start group/item">
                  <div className="mt-1 flex-shrink-0 w-4 h-4 bg-teal-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 size={10} className="text-teal-600" />
                  </div>
                  <p className="text-sm text-gray-600 leading-snug flex-1">{s.text}</p>
                  <button onClick={() => dismissSuggestion(s.id)} aria-label="Descartar sugerencia" className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full bg-gray-50 opacity-0 group-hover/item:opacity-100 focus:opacity-100 transition-opacity">
                    <X size={14} />
                  </button>
                </div>
              ))}
              {(profile.role === "mama" ? suggestions.mama : suggestions.papa).length === 0 && (
                <p className="text-sm text-gray-500 italic text-center py-2">No hay más sugerencias por ahora.</p>
              )}
            </div>
          </div>
        </div>

        {/* Citas */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Calendar className="text-teal-500" size={20}/> Agenda Médica
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                onClick={async () => {
                  const ok = await requestBrowserNotification(nextUpcoming);
                  if (ok) showToast("Recordatorios de citas activados en este teléfono 🔔", () => {});
                  else showToast("Permiso de notificaciones del navegador no concedido", () => {});
                }}
                className="text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-2.5 py-1.5 rounded-xl border border-teal-200/60 flex items-center gap-1 transition-colors shadow-xs active:scale-95"
                title="Activar alertas en el teléfono"
              >
                <Bell size={13} /> Alertas
              </button>
              {events.length > 0 && (
                <button
                  onClick={shareWithPartner}
                  className="text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-2.5 py-1.5 rounded-xl border border-teal-200/60 flex items-center gap-1 transition-colors shadow-xs active:scale-95"
                  title="Compartir citas con tu pareja para sincronizarlas"
                >
                  <Share2 size={13} /> Sincronizar
                </button>
              )}
            </div>
          </div>
          
          <div className="space-y-3">
            {events.length === 0 && (
              <div className="bg-gray-50 rounded-2xl p-6 text-center border border-dashed border-gray-200">
                <Calendar className="mx-auto text-gray-300 mb-2" size={32} />
                <p className="text-gray-500 text-sm font-medium">No hay citas agendadas</p>
              </div>
            )}
            {events.map(event => (
              <div key={event.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-start gap-4 relative group">
                <div className="flex-1 flex items-start gap-4">
                  <button 
                    type="button"
                    onClick={() => openEdit(event)}
                    className="bg-teal-50 text-teal-700 rounded-xl w-14 h-14 flex flex-col justify-center items-center shrink-0 mt-0.5 hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
                    aria-label={`Ver o editar cita del ${event.date}`}
                  >
                    <span className="text-xs font-bold uppercase">{event.date.split(" ")[1]}</span>
                    <span className="text-xl font-bold leading-none">{event.date.split(" ")[0]}</span>
                  </button>
                  <div className="flex-1">
                    <button 
                      type="button"
                      onClick={() => openEdit(event)}
                      className="text-left group/title focus:outline-none focus:ring-2 focus:ring-teal-500 rounded block w-full"
                      aria-label={`Editar cita: ${event.title}, el ${event.date}`}
                    >
                      <h4 className="font-bold text-gray-800 text-base leading-snug group-hover/title:text-teal-700 transition-colors">{event.title}</h4>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1"><Clock size={14} /> {event.time}</span>
                      </div>
                      {event.doctor && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{event.doctor}</p>}
                    </button>
                    
                    {/* Botón de Preparación Rápida */}
                    <div className="flex items-center gap-2 mt-2.5">
                      <button 
                        type="button"
                        onClick={() => onOpenPrep(event)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold border border-teal-200/70 shadow-xs active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <ClipboardList size={13} className="text-teal-600" />
                        <span>¿Qué llevar y preguntar?</span>
                      </button>
                    </div>
                  </div>
                </div>
                <button onClick={() => deleteEvent(event.id)} aria-label={`Eliminar cita: ${event.title}`} className="text-gray-300 hover:text-rose-500 transition-colors p-2 z-10 rounded-lg">
                  <X size={18}/>
                </button>
              </div>
            ))}
          </div>
          
          <button onClick={openNew} className="w-full mt-4 py-3 rounded-xl border-2 border-dashed border-teal-200 text-teal-600 font-bold flex items-center justify-center gap-2 hover:bg-teal-50 transition-colors">
            <Plus size={18} /> Nueva Cita Médica
          </button>
        </div>
      </div>

      {/* Modal Nueva/Editar Cita */}
      {isModalOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="agenda-modal-title"
          className="absolute inset-0 bg-gray-900/40 z-50 flex items-end sm:items-center justify-center animate-in fade-in duration-200"
        >
          <div className="bg-white w-full max-h-[90%] overflow-y-auto sm:w-[90%] sm:rounded-3xl rounded-t-3xl p-6 pb-12 animate-in slide-in-from-bottom-8">
            <div className="flex justify-between items-center mb-6">
              <h3 id="agenda-modal-title" className="text-xl font-bold text-gray-800">{editingEvent ? "Editar Cita" : "Nueva Cita Médica"}</h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="bg-gray-100 p-2 rounded-full text-gray-500 hover:bg-gray-200"
                aria-label="Cerrar modal de cita"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="event-title" className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Título / Motivo</label>
                <input 
                  id="event-title"
                  type="text" 
                  value={newEvent.title} 
                  onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Ej. Ecografía 3D" 
                />
              </div>
              
              <div className="flex gap-3">
                <div className="flex-1">
                  <label htmlFor="event-date" className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Fecha</label>
                  <input 
                    id="event-date"
                    type="date" 
                    value={newEvent.date} 
                    onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500" 
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="event-time" className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Hora</label>
                  <input 
                    id="event-time"
                    type="time" 
                    value={newEvent.time} 
                    onChange={e => setNewEvent({...newEvent, time: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500" 
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="event-doctor" className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Doctor o Clínica</label>
                <input 
                  id="event-doctor"
                  type="text" 
                  value={newEvent.doctor} 
                  onChange={e => setNewEvent({...newEvent, doctor: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Dra. Ramírez" 
                />
              </div>
              
              <button 
                onClick={handleSaveEvent}
                disabled={!newEvent.title || !newEvent.date}
                className="w-full bg-teal-600 text-white font-bold py-4 rounded-xl mt-4 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-teal-700 transition-colors"
              >
                Guardar Cita
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- VISTA 3: PANDA IA ---
function PandaIAView({ 
  showToast, 
  addEvent, 
  profile, 
  openProfileModal,
  initialQuery,
  clearInitialQuery
}: { 
  showToast: any, 
  addEvent: any, 
  profile: UserProfile, 
  openProfileModal: () => void,
  initialQuery?: string,
  clearInitialQuery?: () => void
}) {
  const [messages, setMessages] = useState<any[]>([
    { id: 1, sender: "ai", text: "¡Hola! Soy PandaIA. ¿En qué te ayudo hoy?" }
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      setInputText(initialQuery);
      if (clearInitialQuery) clearInitialQuery();
    }
  }, [initialQuery, clearInitialQuery]);


    const [smartChips, setSmartChips] = useState([
    "Recordatorio: Cita médica el 28 de septiembre",
    "Agendar cita para ecografía 3D",
    "¿Cuándo podremos conocer el sexo del bebé?",
    "¿Qué evalúan en la ecografía de las 12 semanas?"
  ]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isTyping) return;
    
    const newMsg = { id: Date.now(), sender: "user", text };
    setSmartChips(prev => prev.filter(c => c !== text));
    setMessages(prev => [...prev, newMsg]);
    setInputText("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-6),
          context: {
            currentWeek: profile.week || 14,
            userProfile: profile.role === "papa" ? `Papá${profile.name ? ` (${profile.name})` : ""}` : `Mamá${profile.name ? ` (${profile.name})` : ""}`,
            location: profile.location || "No especificada",
            notes: profile.notes || "Embarazo primerizo"
          }
        })
      });

      if (!response.ok) {
        throw new Error("HTTP error " + response.status);
      }

      const data = await response.json();

      // Si Gemini detectó y extrajo una cita médica, agendarla en la Agenda
      if (data.appointment && addEvent) {
        addEvent(
          data.appointment.title,
          data.appointment.date,
          data.appointment.time || "Por definir",
          data.appointment.doctor || "Generado por PandaIA",
          data.appointment.rawDate
        );
        if (showToast) {
          showToast(`Cita agendada: ${data.appointment.title}`, () => {});
        }
      }

      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: "ai",
        text: data.reply || "He procesado tu consulta.",
        card: data.card || (data.appointment ? {
          title: `📅 ${data.appointment.title}`,
          desc: `Programada para el ${data.appointment.date} (${data.appointment.time || "Hora por definir"}). ¡Revisa la pestaña Agenda!`
        } : undefined)
      }]);
    } catch (err: any) {
      console.error("Error communicating with PandaIA:", err);
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: "ai",
        text: "No pude conectar con el asistente en este momento. Por favor revisa tu conexión a internet o verifica tu configuración de Gemini."
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] animate-in fade-in duration-300 bg-slate-50 relative">
      
      {/* HEADER Y ESTADO */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white shadow-sm flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-teal-100 text-teal-600 p-2 rounded-full relative">
            <Bot size={22} />
            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full animate-pulse"></span>
          </div>
          <div>
            <h2 className="font-bold text-gray-800 leading-tight">PandaIA</h2>
            <p className="text-xs font-bold text-teal-600 uppercase tracking-wide flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block animate-pulse"></span>
              {profile.role === "papa" ? "Modo Papá" : "Modo Mamá"}{profile.name ? ` (${profile.name})` : ""} · Sem {profile.week}
            </p>
          </div>
        </div>
        <button 
          onClick={openProfileModal} 
          className="p-2 text-teal-600 hover:bg-teal-50 rounded-xl transition-colors flex items-center gap-1.5 border border-teal-100 shadow-sm"
          aria-label="Configurar perfil"
        >
          <Settings size={18} />
          <span className="text-xs font-bold">Perfil</span>
        </button>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 flex flex-col no-scrollbar">
        {messages.map(msg => (
          <div key={msg.id} className={`flex items-end gap-2 max-w-[85%] ${msg.sender === 'user' ? 'self-end flex-row-reverse' : ''}`}>
            {msg.sender === 'ai' && (
              <div className="bg-teal-100 text-teal-700 p-1.5 rounded-full shrink-0 mb-1">
                <Bot size={16} />
              </div>
            )}
            
            <div className={`flex flex-col gap-2 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`p-3.5 rounded-2xl shadow-sm text-base ${
                msg.sender === 'user' 
                  ? 'bg-teal-600 text-white rounded-br-none' 
                  : 'bg-white border border-gray-100 text-gray-700 rounded-bl-none'
              }`}>
                {msg.text}
              </div>
              
              {msg.card && (
                <div className="bg-white border border-teal-100 shadow-md rounded-xl p-4 w-full max-w-sm">
                  <div className="flex items-center gap-2 mb-2 text-teal-700 font-bold">
                    <Package size={18} /> {msg.card.title}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {msg.card.desc}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-end gap-2 max-w-[85%]">
            <div className="bg-teal-100 text-teal-700 p-1.5 rounded-full shrink-0 mb-1">
              <Bot size={16} />
            </div>
            <div className="bg-white p-4 rounded-2xl rounded-bl-none shadow-sm border border-gray-100 flex gap-1 items-center h-10">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse"></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: "0.15s" }}></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: "0.3s" }}></div>
            </div>
          </div>
        )}
      </div>

      {/* INPUT AREA WITH SMART CHIPS */}
      <div className="bg-white border-t border-gray-200 shrink-0 pb-16">
        {/* Smart Chips */}
        <div className="flex overflow-x-auto gap-2 p-3 no-scrollbar border-b border-gray-50">
          {smartChips.map((chip, idx) => (
            <button 
              key={idx}
              onClick={() => handleSend(chip)}
              className="whitespace-nowrap bg-teal-50 border border-teal-100 text-teal-700 text-xs font-medium px-4 py-2 rounded-full hover:bg-teal-100 transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Text Input */}
        <div className="p-3">
          <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent transition-all">
            <button 
              type="button"
              aria-label="Adjuntar archivo o ecografía"
              className="p-2 text-gray-500 hover:text-teal-600 transition-colors shrink-0"
            >
              <Paperclip size={20} />
            </button>
            <textarea 
              aria-label="Escribe tu consulta para PandaIA"
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(inputText);
                }
              }}
              placeholder="Pregúntale a PandaIA..." 
              className="flex-1 bg-transparent border-none focus:outline-none text-base py-2 resize-none max-h-32 min-h-[40px]"
            />
            <button 
              type="button"
              aria-label="Enviar mensaje a PandaIA"
              onClick={() => handleSend(inputText)}
              disabled={!inputText.trim()}
              className={`p-2.5 rounded-full transition-colors shrink-0 ${
                inputText.trim() ? "bg-teal-600 text-white hover:bg-teal-700" : "bg-gray-200 text-gray-400"
              }`}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

// --- VISTA 4: HERRAMIENTAS ---
function SOSSintomas() {
  const [expanded, setExpanded] = React.useState<string | null>("mareos");
  
  const symptoms = [
    {
      id: "mareos",
      title: "Náuseas y Mareos",
      icon: <Utensils className="text-amber-500" size={20} />,
      color: "bg-amber-50",
      content: (
        <ul className="text-sm text-gray-600 space-y-2 mt-2 list-disc pl-5">
          <li><strong>Estómago con colchón:</strong> Coman galletas saladas o tostadas antes de levantarse de la cama.</li>
          <li><strong>Hidratación táctica:</strong> Beber agua muy fría en pequeños tragos. Rodajas de limón o jengibre fresco son magia pura.</li>
          <li><strong>Vitamina B6:</strong> Consulten con su médico materno-fetal si pueden recetar un suplemento de B6.</li>
          <li><strong>Oler alcohol:</strong> Una toallita de alcohol isopropílico bajo la nariz ayuda a cortar el mareo agudo al instante.</li>
        </ul>
      )
    },
    {
      id: "acidez",
      title: "Acidez y Reflujo",
      icon: <Heart className="text-rose-500" size={20} />,
      color: "bg-rose-50",
      content: (
        <ul className="text-sm text-gray-600 space-y-2 mt-2 list-disc pl-5">
          <li><strong>Poco pero seguido:</strong> 5 o 6 comidas pequeñas al día en lugar de 3 grandes para no sobrecargar el esfínter.</li>
          <li><strong>Física básica:</strong> Esperar al menos 2 horas después de cenar para ir a la cama (gravedad a su favor).</li>
          <li><strong>Evitar disparadores:</strong> Cítricos, tomate, chocolate, y comidas muy grasas o picantes.</li>
          <li><strong>Leche fría o almendras:</strong> Neutralizan la acidez al instante de forma natural.</li>
        </ul>
      )
    },
    {
      id: "ciatica",
      title: "Dolor de Espalda (Ciática)",
      icon: <Activity className="text-blue-500" size={20} />,
      color: "bg-blue-50",
      content: (
        <ul className="text-sm text-gray-600 space-y-2 mt-2 list-disc pl-5">
          <li><strong>Compresas tibias:</strong> Aplicar calor en la espalda baja por 15-20 minutos (tú puedes encargarte de prepararlas).</li>
          <li><strong>Postura al dormir:</strong> Siempre del lado izquierdo, con la almohada de embarazo entre las rodillas.</li>
          <li><strong>Estiramientos suaves:</strong> Ayúdala con ejercicios de yoga prenatal (postura del gato-vaca) para aliviar la presión del útero.</li>
        </ul>
      )
    },
    {
      id: "alarma",
      title: "🚨 Señales de Alarma Médica",
      icon: <AlertTriangle className="text-red-500" size={20} />,
      color: "bg-red-50",
      content: (
        <ul className="text-sm text-red-700 font-medium space-y-2 mt-2 list-disc pl-5">
          <li><strong>Sangrado vaginal</strong> (cualquier cantidad, contactar al médico).</li>
          <li><strong>Dolor abdominal intenso</strong> o cólicos persistentes que no ceden al descansar.</li>
          <li><strong>Dolor de cabeza severo</strong> o visión borrosa (riesgo de preeclampsia).</li>
          <li><strong>Hinchazón repentina extrema</strong> en cara, manos o pies.</li>
          <li><strong>Disminución de movimientos fetales</strong> (si sienten menos de 10 en 2 horas después de la semana 24).</li>
        </ul>
      )
    }
  ];

  return (
    <div className="flex flex-col py-2 animate-in fade-in duration-300 h-full w-full">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-800 flex justify-center items-center gap-2">
          <HeartPulse className="text-rose-500" /> SOS Mamá
        </h3>
        <p className="text-sm text-gray-500">Guía rápida de alivio de síntomas</p>
      </div>

      {/* Banner de Emergencia Rápida */}
      <div className="bg-gradient-to-r from-rose-50 to-red-50 border border-rose-200 rounded-2xl p-4 mb-4 flex items-center justify-between gap-3 shadow-sm">
        <div>
          <h4 className="font-bold text-rose-800 text-sm flex items-center gap-1.5">
            <AlertTriangle size={16} className="text-rose-600 shrink-0" /> ¿Emergencia o Alarma?
          </h4>
          <p className="text-xs text-rose-600 mt-0.5">Acceso rápido ante signos de alerta</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <a
            href="tel:911"
            className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md transition-all"
            aria-label="Llamar a Urgencias médicas"
          >
            📞 Llamar
          </a>
          <a
            href="https://maps.google.com/?q=hospital+maternidad"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white hover:bg-rose-100/50 active:scale-95 border border-rose-200 text-rose-700 font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
            aria-label="Ver ruta al hospital más cercano"
          >
            📍 Hospital
          </a>
        </div>
      </div>

      <div className="space-y-3 overflow-y-auto pb-8">
        {symptoms.map(sym => (
          <div key={sym.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button 
              onClick={() => setExpanded(expanded === sym.id ? null : sym.id)}
              className="w-full p-4 flex items-center justify-between text-left transition-colors hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className={`${sym.color} p-2 rounded-full`}>{sym.icon}</div>
                <span className="font-bold text-gray-800">{sym.title}</span>
              </div>
              {expanded === sym.id ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
            </button>
            {expanded === sym.id && (
              <div className="p-4 pt-0 bg-gray-50 border-t border-gray-100 animate-in slide-in-from-top-2">
                {sym.content}
                {sym.id === "alarma" && (
                  <div className="mt-4 pt-3 border-t border-red-200 flex gap-2">
                    <a
                      href="tel:911"
                      className="flex-1 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all text-center"
                    >
                      📞 Llamar al Obstetra / 911
                    </a>
                    <a
                      href="https://maps.google.com/?q=hospital+maternidad"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-white hover:bg-red-50 active:scale-95 border border-red-300 text-red-800 font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all text-center"
                    >
                      📍 Ruta al Hospital
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function HerramientasView({ showToast }: { showToast: any }) {

  const [activeTool, setActiveTool] = useState<any>("sos");

  const tools = [
    { id: "sos", label: "SOS Mamá", icon: <HeartPulse size={16} /> },
    { id: "patadas", label: "Patadas", icon: <Baby size={16} /> },
    { id: "contracciones", label: "Contracc.", icon: <Activity size={16} /> },
    { id: "nombres", label: "Nombres", icon: <Users size={16} /> },
    { id: "parto", label: "Parto", icon: <ClipboardList size={16} /> }
  ];

  return (
    <div className="flex flex-col h-full w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Sub-navigation sin desplazamiento (100% visible) */}
      <div className="bg-white px-3 py-2.5 shadow-sm border-b border-gray-100 sticky top-0 z-10 w-full">
        <div className="grid grid-cols-5 gap-1 bg-gray-100/90 p-1 rounded-2xl w-full">
          {tools.map((tool) => {
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id as any)}
                className={`flex flex-col items-center justify-center py-2 px-0.5 rounded-xl transition-all ${
                  isActive 
                    ? "bg-white text-teal-700 shadow-sm font-bold scale-[1.02]" 
                    : "text-gray-500 hover:text-gray-800 font-medium"
                }`}
              >
                <div className={`p-1 rounded-lg ${isActive ? "text-teal-600" : "text-gray-400"}`}>
                  {tool.icon}
                </div>
                <span className="text-[10px] leading-tight text-center tracking-tight truncate w-full">
                  {tool.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-5 flex-1 overflow-y-auto w-full">
        <div className={activeTool === "sos" ? "block w-full h-full" : "hidden"}><SOSSintomas /></div>
        <div className={activeTool === "patadas" ? "block w-full" : "hidden"}><ContadorPatadas showToast={showToast} /></div>
        <div className={activeTool === "contracciones" ? "block w-full" : "hidden"}><ContadorContracciones showToast={showToast} /></div>
        <div className={activeTool === "nombres" ? "block w-full" : "hidden"}><VotadorNombres showToast={showToast} /></div>
        <div className={activeTool === "parto" ? "block w-full h-full" : "hidden"}><PlanParto /></div>
      </div>
    </div>
  );
}

function ContadorPatadas({ showToast }: { showToast: any }) {
  const [count, setCount] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState("00:00");
  
  const [sessions, setSessions] = useState([
      { id: 1, date: "Ayer", count: 10, duration: "25 min" },
      { id: 2, date: "Antier", count: 10, duration: "18 min" },
    ]);
    const deleteSession = (id: number) => {
    const sessionToRestore = sessions.find(s => s.id === id);
    setSessions(prev => prev.filter(s => s.id !== id));
    if(sessionToRestore) showToast("Sesión eliminada", () => setSessions(prev => [sessionToRestore, ...prev].sort((a,b) => b.id - a.id)));
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (startTime && count < 10) {
      interval = setInterval(() => {
        const diff = Math.floor((Date.now() - startTime) / 1000);
        const m = Math.floor(diff / 60).toString().padStart(2, '0');
        const s = (diff % 60).toString().padStart(2, '0');
        setElapsed(`${m}:${s}`);
      }, 1000);
    } else if (count === 10 && startTime) {
      // Finished session
      const diff = Math.floor((Date.now() - startTime) / 1000);
      const m = Math.floor(diff / 60);
      const newSession = { id: Date.now(), date: "Hoy", count: 10, duration: `${m} min` };
      setSessions(prev => [newSession, ...prev]);
      setStartTime(null); // Stop timer
    }
    return () => clearInterval(interval);
  }, [startTime, count]);

  const handleKick = () => {
    if (count === 0) setStartTime(Date.now());
    if (count < 10) setCount(c => c + 1);
  };

  const reset = () => {
    setCount(0);
    setStartTime(null);
    setElapsed("00:00");
  };

  return (
    <div className="flex flex-col py-2 animate-in fade-in duration-300 w-full">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-800">Monitor Inteligente</h3>
        <p className="text-sm text-gray-500">Toca el botón con cada movimiento.</p>
      </div>

      <div className="relative mb-8 flex justify-center">
        <div className="absolute inset-0 bg-teal-100 rounded-full animate-ping opacity-30 scale-150 transform origin-center"></div>
        <button 
          onClick={handleKick}
          disabled={count >= 10}
          className={`relative z-10 w-56 h-56 rounded-full shadow-xl flex flex-col items-center justify-center transition-all duration-300 transform active:scale-95 ${
            count >= 10 ? "bg-gray-100 text-teal-600 border-4 border-teal-100" : "bg-gradient-to-br from-teal-400 to-teal-600 text-white border-4 border-white"
          }`}
        >
          <span className="text-7xl font-black tracking-tighter mb-1">{count}</span>
          <span className="text-sm font-bold uppercase tracking-widest opacity-80">{count >= 10 ? "Completado" : "Registrar"}</span>
        </button>
      </div>

      <div className="bg-white w-full rounded-2xl shadow-sm border border-gray-100 p-4 flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-teal-50 p-2 rounded-full"><Clock className="text-teal-600" size={20}/></div>
          <div>
            <p className="text-xs text-teal-700 font-bold uppercase tracking-wider tracking-wider">Sesión Actual</p>
            <p className="text-2xl font-black text-gray-700">{elapsed}</p>
          </div>
        </div>
        <button onClick={reset} className="text-gray-500 font-bold text-xs bg-gray-50 px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors uppercase tracking-wider">
          Reiniciar
        </button>
      </div>

      <div>
        <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><History size={18} className="text-teal-600"/> Historial de Sesiones</h4>
        <div className="space-y-3">
          {sessions.map(s => (
            <div key={s.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-green-50 text-green-600 p-2 rounded-full"><CheckCircle size={16}/></div>
                <span className="font-bold text-gray-700">{s.date}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-800">{s.count} patadas</p>
                <p className="text-xs text-gray-500">en {s.duration}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContadorContracciones({ showToast }: { showToast: any }) {
  const [isRecording, setIsRecording] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentDuration, setCurrentDuration] = useState(0);
  
  // Dummy history tailored to show the 5-1-1 rule alert
  const [history, setHistory] = useState<{ id: number, start: number, duration: number, interval: number | null }[]>([
    { id: 1, start: Date.now() - 300000, duration: 60, interval: 300 }, // 5 mins ago, lasted 60s
    { id: 2, start: Date.now() - 600000, duration: 58, interval: 310 }, // 10 mins ago, lasted 58s
    { id: 3, start: Date.now() - 900000, duration: 62, interval: 290 }, // 15 mins ago, lasted 62s
  ]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && startTime) {
      interval = setInterval(() => {
        setCurrentDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, startTime]);

  const toggleRecording = () => {
    const now = Date.now();
    if (!isRecording) {
      setStartTime(now);
      setCurrentDuration(0);
      setIsRecording(true);
    } else {
      if (startTime) {
        const durationSecs = Math.floor((now - startTime) / 1000);
        let intervalSecs: number | null = null;
        if (history.length > 0) {
          const lastStart = history[0].start;
          intervalSecs = Math.floor((startTime - lastStart) / 1000);
        }
        setHistory(prev => [{
          id: now,
          start: startTime,
          duration: durationSecs,
          interval: intervalSecs
        }, ...prev]);
      }
      setIsRecording(false);
      setStartTime(null);
    }
  };

  const formatTime = (secs: number) => {
    if (secs < 60) return `${secs}s`;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  // Calculations for averages
  const avgDuration = history.length > 0 ? Math.round(history.reduce((acc, h) => acc + h.duration, 0) / history.length) : 0;
  const intervals = history.filter(h => h.interval !== null);
  const avgInterval = intervals.length > 0 ? Math.round(intervals.reduce((acc, h) => acc + (h.interval || 0), 0) / intervals.length) : 0;

  // 5-1-1 Rule: Freq ~5m (300s), Duration ~1m (60s). Using rough ranges.
  const is511 = history.length >= 3 && avgDuration >= 45 && avgInterval > 0 && avgInterval <= 360;

  return (
    <div className="flex flex-col py-2 animate-in fade-in duration-300 w-full">
      
      {is511 && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl mb-6 shadow-md" role="alert" aria-live="assertive">
          <div className="flex gap-3">
            <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={24}/>
            <div>
              <h4 className="font-bold text-rose-900 text-sm">¡Regla 5-1-1 Detectada! (Parto Activo)</h4>
              <p className="text-rose-700 text-xs mt-1 leading-snug">
                Tus contracciones vienen cada 5 min y duran 1 min. ¡Es momento de ir al hospital o contactar a tu equipo obstétrico!
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-rose-200/80 flex gap-2">
            <a
              href="tel:911"
              className="flex-1 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all text-center"
            >
              📞 Llamar al Obstetra
            </a>
            <a
              href="https://maps.google.com/?q=hospital+maternidad"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-white hover:bg-rose-100/50 active:scale-95 border border-rose-300 text-rose-800 font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all text-center"
            >
              📍 Ruta al Hospital
            </a>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <p className="text-xs text-teal-700 font-bold uppercase tracking-wider tracking-wider mb-1">Duración Prom.</p>
          <p className="text-xl font-black text-teal-600">{formatTime(avgDuration)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <p className="text-xs text-teal-700 font-bold uppercase tracking-wider tracking-wider mb-1">Frecuencia Prom.</p>
          <p className="text-xl font-black text-rose-500">{avgInterval ? formatTime(avgInterval) : "—"}</p>
        </div>
      </div>
      
      <button 
        onClick={toggleRecording}
        className={`w-full py-6 rounded-3xl shadow-xl text-white font-bold text-xl flex flex-col items-center justify-center gap-3 transition-all duration-300 transform active:scale-95 ${
          isRecording ? "bg-rose-500 hover:bg-rose-600" : "bg-teal-600 hover:bg-teal-700"
        }`}
      >
        {isRecording ? <Square size={36} /> : <Play size={36} />}
        {isRecording ? `Detener (${formatTime(currentDuration)})` : "Iniciar Contracción"}
      </button>

      {history.length > 0 && (
        <div className="mt-8">
          <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Activity size={18} className="text-teal-600"/> Historial (Timeline)</h4>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 p-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
              <div>Hora</div>
              <div>Duración</div>
              <div>Frecuencia</div>
            </div>
            <div className="divide-y divide-gray-50">
              {history.map((item) => (
                <div key={item.id} className="grid grid-cols-3 p-4 text-sm text-center items-center hover:bg-gray-50 transition-colors">
                  <div className="text-gray-500 font-medium">
                    {new Date(item.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="font-bold text-teal-600 bg-teal-50 py-1 px-2 rounded-lg inline-block mx-auto">{formatTime(item.duration)}</div>
                  <div className="font-bold text-rose-500">{item.interval ? formatTime(item.interval) : "—"}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VotadorNombres({ showToast }: { showToast: any }) {
  const [names, setNames] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("pandajr_baby_names");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return [
      { id: 1, text: "Valentina", origin: "Latín", meaning: "Valerosa, vigorosa.", status: "pending", partnerLiked: true, gender: "niña" },
      { id: 2, text: "Mateo", origin: "Hebreo", meaning: "El gran regalo de Dios.", status: "pending", partnerLiked: false, gender: "niño" },
      { id: 3, text: "Noa", origin: "Hebreo", meaning: "Delicia, descanso.", status: "pending", partnerLiked: true, gender: "neutro" },
      { id: 4, text: "Emilio", origin: "Latín", meaning: "El que se esfuerza.", status: "pending", partnerLiked: true, gender: "niño" },
      { id: 5, text: "Lucía", origin: "Latín", meaning: "La que nació a la luz del día.", status: "pending", partnerLiked: false, gender: "niña" },
      { id: 6, text: "Alex", origin: "Griego", meaning: "Defensor/a.", status: "pending", partnerLiked: true, gender: "neutro" },
    ];
  });

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [genderFilter, setGenderFilter] = useState<"todos"|"niño"|"niña"|"neutro">("todos");

  useEffect(() => {
    try {
      localStorage.setItem("pandajr_baby_names", JSON.stringify(names));
    } catch (e) {}
  }, [names]);

  const handleRequestMoreNames = async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);

    try {
      const existingNames = names.map(n => n.text);
      const res = await fetch("/api/names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gender: genderFilter,
          existingNames,
          count: 6
        })
      });

      if (!res.ok) throw new Error("Error en servidor al generar nombres");
      const data = await res.json();

      if (Array.isArray(data.names) && data.names.length > 0) {
        const formatted = data.names.map((item: any, idx: number) => ({
          id: Date.now() + idx,
          text: item.text,
          origin: item.origin || "Inspiración",
          meaning: item.meaning || "Significado especial",
          gender: item.gender || (genderFilter === "todos" ? "neutro" : genderFilter),
          status: "pending",
          partnerLiked: Math.random() > 0.45
        }));

        setNames(prev => [...prev, ...formatted]);
        const msg = data.source === "gemini" 
          ? `¡PandaIA generó ${formatted.length} nuevos nombres únicos con IA! ✨` 
          : `¡${formatted.length} nuevos nombres únicos listos para votar! 👶`;
        showToast(msg, () => {});
      } else {
        showToast("No hay más nombres disponibles para este filtro.", () => {});
      }
    } catch (err) {
      console.error(err);
      showToast("No se pudo conectar con PandaIA. Intenta nuevamente.", () => {});
    } finally {
      setIsLoadingMore(false);
    }
  };

  const pendingNames = names.filter(n => n.status === "pending" && (genderFilter === "todos" || n.gender === genderFilter));
  const current = pendingNames[0];
  const matches = names.filter(n => n.status === "liked" && n.partnerLiked);

  const vote = (id: number, status: "liked" | "disliked") => {
    setNames(prev => prev.map(n => n.id === id ? { ...n, status } : n));
  };

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const currentX = e.targetTouches[0].clientX;
    const diff = currentX - touchStart;
    setSwipeOffset(diff);
  };
  const onTouchEnd = () => {
    if (!current) {
      setTouchStart(null);
      setSwipeOffset(0);
      return;
    }
    if (swipeOffset > 80) vote(current.id, "liked");
    else if (swipeOffset < -80) vote(current.id, "disliked");
    setTouchStart(null);
    setSwipeOffset(0);
  };

  return (
    <div className="flex flex-col py-2 animate-in fade-in duration-300 w-full">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Nombres del Bebé</h3>
          <p className="text-xs text-gray-500">¿Hará match con tu pareja?</p>
        </div>
        <div className="flex items-center gap-2">
          {matches.length > 0 && (
            <div className="bg-rose-100 text-rose-600 font-bold px-3 py-1 rounded-full text-xs flex items-center gap-1 animate-pulse">
              <Heart size={12} fill="currentColor"/> {matches.length} Matches
            </div>
          )}
          <button
            type="button"
            onClick={handleRequestMoreNames}
            disabled={isLoadingMore}
            className="text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-full border border-teal-200/70 flex items-center gap-1.5 transition-colors disabled:opacity-60 shadow-xs"
            title="Pedir más nombres a PandaIA"
          >
            {isLoadingMore ? (
              <div className="w-3 h-3 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Sparkles size={12} className="text-amber-500" />
            )}
            <span>+ Nombres</span>
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
        {["todos", "niña", "niño", "neutro"].map(f => (
          <button 
            key={f}
            onClick={() => setGenderFilter(f as any)}
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase transition-colors whitespace-nowrap ${genderFilter === f ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-500"}`}
          >
            {f}
          </button>
        ))}
      </div>
      
      {current ? (
        <div 
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ transform: touchStart !== null ? `translateX(${swipeOffset}px) rotate(${swipeOffset * 0.05}deg)` : "translateX(0) rotate(0)", transition: touchStart !== null ? "none" : "transform 0.3s ease-out" }}
          className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 flex flex-col items-center text-center relative overflow-hidden mb-6 select-none touch-pan-y w-full"
        >
          <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-teal-400 to-amber-400"></div>
          <h2 className="text-4xl font-black text-gray-800 mb-2 mt-4">{current.text}</h2>
          <span className="text-xs font-bold uppercase tracking-widest text-teal-600 bg-teal-50 px-3 py-1 rounded-full mb-4">
            Origen: {current.origin} • {current.gender}
          </span>
          <p className="text-sm text-gray-500 italic mb-8 max-w-[200px]">"{current.meaning}"</p>
          
          <div className="flex gap-6 w-full justify-center">
            <button 
              type="button"
              onClick={() => vote(current.id, "disliked")} 
              aria-label={`Descartar el nombre ${current.text}`}
              className="bg-white border-2 border-gray-100 p-5 rounded-full shadow-sm hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-transform active:scale-90 focus:outline-none focus:ring-2 focus:ring-rose-300"
            >
              <X size={32} />
            </button>
            <button 
              type="button"
              onClick={() => vote(current.id, "liked")} 
              aria-label={`Guardar como favorito el nombre ${current.text}`}
              className="bg-rose-500 p-5 rounded-full shadow-lg hover:bg-rose-600 text-white transition-transform active:scale-90 focus:outline-none focus:ring-2 focus:ring-rose-300"
            >
              <Heart size={32} fill="currentColor" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-teal-50 to-amber-50 rounded-3xl border border-teal-100 p-8 text-center mb-6 shadow-sm flex flex-col items-center w-full">
            <div className="bg-white p-4 rounded-full mb-4 shadow-sm">
              <Sparkles className="text-amber-500" size={32} />
            </div>
            <h4 className="text-xl font-bold text-gray-800 mb-2">
              {matches.length > 0 ? "¡Excelente trabajo en equipo!" : "¡Sigue buscando!"}
            </h4>
            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
              {matches.length > 0 
                ? `Han coincidido en ${matches.length} nombre${matches.length > 1 ? "s" : ""}. Este bebé ya tiene opciones increíbles.` 
                : "Has revisado esta lista, pero aún no hay coincidencias. ¡No te rindas, el nombre perfecto está ahí afuera!"}
            </p>
            <button 
              type="button"
              disabled={isLoadingMore}
              onClick={handleRequestMoreNames}
              className="bg-teal-600 text-white font-bold py-3.5 px-6 rounded-full shadow-md hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60 w-full max-w-xs"
            >
              {isLoadingMore ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Buscando nombres únicos...</span>
                </>
              ) : (
                <>
                  <Bot size={18} /> Pedir más ideas a PandaIA
                </>
              )}
            </button>
            <button 
              type="button"
              onClick={() => {
                 setNames(prev => prev.map(n => ({...n, status: "pending"})));
                 showToast("Nombres restablecidos a pendientes para volver a votar", () => {});
              }}
              className="mt-4 text-xs font-bold text-gray-500 hover:text-gray-700 uppercase tracking-wider transition-colors focus:outline-none"
            >
              Volver a votar los anteriores
            </button>
          </div>
        )}

      {matches.length > 0 && (
        <div className="mt-4">
          <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Sparkles size={18} className="text-amber-500"/> ¡It's a Match!</h4>
          <div className="grid grid-cols-2 gap-3">
            {matches.map(n => (
              <div key={n.id} className="bg-gradient-to-br from-teal-50 to-white border border-teal-100 p-4 rounded-2xl flex flex-col items-center justify-center shadow-sm">
                <Heart size={20} className="text-rose-400 mb-1" fill="currentColor"/>
                <span className="font-bold text-gray-800">{n.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PlanParto() {
  const [step, setStep] = useState(1);
  
  const steps = [
    {
      id: 1, title: "Ambiente", 
      options: [
        { id: "a1", label: "Luz tenue", desc: "Ayuda a la relajación", checked: true },
        { id: "a2", label: "Música propia", desc: "Llevaré mi playlist", checked: false },
      ]
    },
    {
      id: 2, title: "Manejo del Dolor", 
      options: [
        { id: "d1", label: "Epidural", desc: "Aplicar cuando se solicite", checked: true },
        { id: "d2", label: "Pelota de pilates", desc: "Uso durante dilatación", checked: true },
      ]
    },
    {
      id: 3, title: "Post-Parto", 
      options: [
        { id: "p1", label: "Corte tardío del cordón", desc: "Esperar a que deje de latir", checked: true },
        { id: "p2", label: "Piel a Piel inmediato", desc: "Contacto al nacer sin interrumpir", checked: true },
      ]
    }
  ];

  const nextStep = () => setStep(s => Math.min(3, s + 1));
  const prevStep = () => setStep(s => Math.max(1, s - 1));

  const currentStepData = steps.find(s => s.id === step);

  return (
    <div className="flex flex-col py-2 animate-in fade-in duration-300 h-full w-full">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-800">Plan de Parto (Wizard)</h3>
        <p className="text-sm text-gray-500">Paso {step} de 3</p>
      </div>

      <div className="flex justify-center gap-2 mb-8">
        {[1,2,3].map(i => (
          <div key={i} className={`h-2 w-12 rounded-full transition-colors ${i <= step ? "bg-teal-500" : "bg-gray-200"}`}></div>
        ))}
      </div>

      {currentStepData && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 mb-6 flex-1 w-full">
          <h4 className="text-lg font-bold text-gray-800 mb-4">{currentStepData.title}</h4>
          <div className="space-y-4">
            {currentStepData.options.map(opt => (
              <label key={opt.id} className="flex items-start gap-3 p-4 rounded-2xl border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors">
                <input type="checkbox" defaultChecked={opt.checked} className="mt-1 w-5 h-5 text-teal-600 rounded focus:ring-teal-500" />
                <div>
                  <span className="font-bold text-gray-700 block">{opt.label}</span>
                  <span className="text-xs text-gray-500 block mt-0.5">{opt.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 mt-auto">
        {step > 1 && (
          <button 
            type="button"
            onClick={prevStep} 
            aria-label="Paso anterior del plan de parto"
            className="p-4 bg-gray-100 text-gray-600 rounded-2xl hover:bg-gray-200 transition-colors active:scale-95"
          >
            <ArrowLeft size={24} />
          </button>
        )}
        
        {step < 3 ? (
          <button 
            type="button"
            onClick={nextStep} 
            className="flex-1 p-4 bg-teal-600 text-white rounded-2xl font-bold flex justify-center items-center gap-2 hover:bg-teal-700 transition-colors active:scale-95"
          >
            Siguiente <ArrowRight size={20} />
          </button>
        ) : (
          <button 
            type="button"
            onClick={() => {
              window.print();
            }}
            className="flex-1 p-4 bg-gray-900 text-white rounded-2xl font-bold flex justify-center items-center gap-2 hover:bg-gray-800 transition-colors active:scale-95 shadow-md"
          >
            <FileDown size={20} /> Guardar o Imprimir Plan (PDF)
          </button>
        )}
      </div>
    </div>
  );
}
