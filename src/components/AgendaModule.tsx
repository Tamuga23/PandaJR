"use client";

export interface AppointmentPrepInfo { category: string; badge: string; whatToBring: string[]; whatToAsk: string[]; tip: string; }
import { HerramientasView } from "@/components/HerramientasModule";
﻿
import React, { useState, useEffect } from "react";
import { usePandaStore } from "@/store/usePandaStore";
import { ensureAuth, createPregnancyForMom, joinPregnancyAsDad, listenToPregnancy, listenToMomStatus, updatePregnancyWeek, saveMomStatus, saveEvents, listenToEvents, saveKickSessions, listenToKickSessions, saveContractions, listenToContractions, saveBabyNames, listenToBabyNames, saveBirthPlan, listenToBirthPlan, saveChecklistProgress, listenToChecklistProgress, saveAppointmentPrep, listenToAppointmentPrep } from "@/lib/firebase/pairing";
import Image from "next/image";
import { Compass, Calendar, Bot, Send, CheckCircle2, Circle, Clock, ChevronRight, ChevronLeft, HeartPulse, Baby, Utensils, Info, ChevronDown, ChevronUp, Sparkles, Activity, Heart, X, Play, Square, Plus, Users, ClipboardList, Trophy, BriefcaseMedical, ShoppingBag, Home, FileText, AlertTriangle, AlertCircle, Download, ArrowRight, ArrowLeft, History, CheckCircle, FileDown, Settings, Paperclip, MapPin, Briefcase, Package, Share2, Bell, RotateCcw, Trash2, PhoneCall, Check, Undo2, Printer, Copy, Edit3, Sun, Moon, BookOpen, ExternalLink } from "lucide-react";

type Tab = "planificacion" | "agenda" | "herramientas" | "pandaia";

export interface UserProfile {
  role: "papa" | "mama";
  name: string;
  week: number;
  location?: string;
  notes?: string;
  pregnancyId?: string;
  inviteCode?: string;
    comparisonTheme?: "frutas" | "geek";
}



function getAppointmentPrep(title: string): AppointmentPrepInfo {
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

function getCountdownText(eventDate: Date): { text: string; isClose: boolean; daysLeft: number } {
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

function downloadIcsCalendar(ev: any, prep: AppointmentPrepInfo) {
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
    ...prep.whatToBring.map((item: any) => `• ${item}`),
    "",
    "â“ PREGUNTAS CLAVE PARA EL MÉDICO:",
    ...prep.whatToAsk.map((item: any) => `• ${item}`),
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

function openGoogleCalendar(ev: any, prep: AppointmentPrepInfo) {
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
    "â“ PREGUNTAS PARA EL DOCTOR:",
    ...prep.whatToAsk.map(i => `• ${i}`),
    "",
    `CONSEJO PANDAJR: ${prep.tip}`
  ].join("\n");

  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`👶 Cita: ${ev.title}`)}&dates=${startIso}/${endIso}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(ev.doctor || "")}`;
  window.open(url, "_blank");
}

async function requestBrowserNotification(upcomingEvent?: any): Promise<boolean> {
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

export function AppointmentPrepModal({
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
      <div className="bg-white dark:bg-[#221d2d] w-full max-h-[92vh] sm:max-w-md sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl flex flex-col animate-in slide-in-from-bottom-6 border border-stone-100 dark:border-white/[0.08]">
        {/* Header con gradiente */}
        <div className="bg-sage p-5 text-white shrink-0 relative">
          <button 
            onClick={onClose} 
            className="absolute top-3.5 right-3.5 bg-white/20 hover:bg-white/30 text-white min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-colors active:scale-95"
            aria-label="Cerrar guía de preparación"
          >
            <X size={20} />
          </button>
          
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full tracking-wide">
              {prep.badge}
            </span>
            {countdown && (
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${countdown.isClose ? "bg-terracotta text-terracotta font-black shadow-xs" : "bg-sage/80 text-sage/20"}`}>
                {countdown.text}
              </span>
            )}
          </div>

          <h3 id="prep-modal-title" className="text-xl font-black leading-tight pr-6">{event.title}</h3>
          
          <div className="flex items-center gap-4 mt-2.5 text-xs text-sage/20 font-medium">
            <span className="flex items-center gap-1.5"><Calendar size={14} className="text-sage/80" /> {event.date}</span>
            <span className="flex items-center gap-1.5"><Clock size={14} className="text-sage/80" /> {event.time}</span>
            {event.doctor && <span className="line-clamp-1">{event.doctor}</span>}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-6 overflow-y-auto flex-1 text-stone-800 dark:text-[#eae6e1]">
          
          {/* Tip destacado */}
          <div className="bg-terracotta/10/90 dark:bg-[#241b12] border border-terracotta/30/90 dark:border-terracotta/100/20 rounded-2xl p-3.5 flex gap-3 items-start shadow-xs">
            <Sparkles className="text-terracotta/100 shrink-0 mt-0.5" size={18} />
            <p className="text-xs text-terracotta dark:text-terracotta/30 leading-relaxed font-medium">
              <strong className="font-bold">Consejo de preparación:</strong> {prep.tip}
            </p>
          </div>

          {/* Sección 1: Qué llevar */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="font-bold text-stone-800 dark:text-[#eae6e1] text-sm flex items-center gap-2">
                <ShoppingBag size={17} className="text-terracotta dark:text-sage" /> ¿Qué debes llevar?
              </h4>
              <span className="text-xs font-semibold text-stone-500 dark:text-[#a6a1b2]">
                {Object.values(checkedItems).filter(Boolean).length} de {prep.whatToBring.length} listos
              </span>
            </div>
            <div className="space-y-2">
              {prep.whatToBring.map((item: any, idx: number) => {
                const isChecked = !!checkedItems[item];
                return (
                  <button
                    key={idx}
                    type="button"
                    role="checkbox"
                    aria-checked={isChecked}
                    onClick={() => toggleItem(item)}
                    className={`w-full text-left p-3 rounded-xl border text-xs leading-relaxed transition-all flex items-start gap-2.5 ${
                      isChecked 
                        ? "bg-sage/10/70 dark:bg-[#1a1724] border-sage/30 dark:border-sage/100/30 text-sage dark:text-sage/80 line-through opacity-80" 
                        : "bg-white dark:bg-[#221d2d] border-stone-200/90 dark:border-white/[0.08] hover:border-sage/30 dark:hover:border-sage text-stone-700 dark:text-[#eae6e1] shadow-xs"
                    }`}
                  >
                    <div className={`mt-0.5 shrink-0 transition-colors ${isChecked ? "text-terracotta dark:text-sage" : "text-stone-400 dark:text-[#a6a1b2]"}`}>
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
              <h4 className="font-bold text-stone-800 dark:text-[#eae6e1] text-sm flex items-center gap-2">
                <ClipboardList size={17} className="text-terracotta dark:text-sage" /> Preguntas clave para el doctor
              </h4>
              <span className="text-xs font-semibold text-stone-500 dark:text-[#a6a1b2]">
                {Object.values(checkedQuestions).filter(Boolean).length} de {prep.whatToAsk.length} hechas
              </span>
            </div>
            <div className="space-y-2">
              {prep.whatToAsk.map((q: any, idx: number) => {
                const isChecked = !!checkedQuestions[q];
                return (
                  <button
                    key={idx}
                    type="button"
                    role="checkbox"
                    aria-checked={isChecked}
                    onClick={() => toggleQuestion(q)}
                    className={`w-full text-left p-3 rounded-xl border text-xs leading-relaxed transition-all flex items-start gap-2.5 ${
                      isChecked 
                        ? "bg-sage/10/70 dark:bg-[#1a1724] border-sage/30 dark:border-sage/100/30 text-sage dark:text-sage/80 line-through opacity-80" 
                        : "bg-white dark:bg-[#221d2d] border-stone-200/90 dark:border-white/[0.08] hover:border-sage/30 dark:hover:border-sage text-stone-700 dark:text-[#eae6e1] shadow-xs"
                    }`}
                  >
                    <div className={`mt-0.5 shrink-0 transition-colors ${isChecked ? "text-terracotta dark:text-sage" : "text-stone-400 dark:text-[#a6a1b2]"}`}>
                      {isChecked ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                    </div>
                    <span className="flex-1 font-medium">{q}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Opciones de Recordatorio y Calendario */}
          <div className="bg-stone-50 dark:bg-[#2d273a]/70 border border-stone-200/80 dark:border-white/[0.08] rounded-2xl p-4 space-y-3">
            <p className="text-xs font-bold text-stone-700 dark:text-[#eae6e1] flex items-center gap-1.5">
              <Bell size={15} className="text-terracotta dark:text-sage" /> Sincronizar Alarmas de Recordatorio
            </p>
            <p className="text-xs text-stone-500 dark:text-[#a6a1b2] leading-snug">
              Añade esta cita a tu calendario del teléfono con 2 alarmas automáticas (24h y 2h antes) y todas estas preguntas guardadas en las notas.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => downloadIcsCalendar(event, prep)}
                className="py-2.5 px-3 bg-white dark:bg-[#221d2d] hover:bg-stone-100 dark:hover:bg-[#2d273a] text-stone-800 dark:text-[#eae6e1] font-bold text-xs rounded-xl border border-stone-200 dark:border-white/10 shadow-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all text-center"
              >
                <span>📅 Apple / iCal (.ics)</span>
              </button>
              <button
                type="button"
                onClick={() => openGoogleCalendar(event, prep)}
                className="py-2.5 px-3 bg-white dark:bg-[#221d2d] hover:bg-stone-100 dark:hover:bg-[#2d273a] text-sage dark:text-sage/80 font-bold text-xs rounded-xl border border-sage/30 dark:border-white/10 shadow-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all text-center"
              >
                <span>🗓️ Google Calendar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer con botón de consulta a PandaIA */}
        <div className="p-4 border-t border-stone-200/80 dark:border-white/[0.08] bg-stone-50 dark:bg-[#221d2d] flex gap-2">
          {onAskPandaIA && (
            <button
              type="button"
              onClick={() => onAskPandaIA(`Tengo una cita de "${event.title}" con ${event.doctor || "mi médico"} el ${event.date}. ¿Qué otros consejos o preparaciones me recomiendas como ${event.title}?`)}
              className="flex-1 py-3 px-4 bg-terracotta hover:bg-terracotta-hover text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
            >
              <Bot size={16} /> Consultar con PandaIA
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[70px] py-3 px-5 bg-stone-200 hover:bg-stone-300 dark:bg-[#2d273a] dark:hover:bg-[#2a2e38] text-stone-800 dark:text-[#eae6e1] rounded-xl font-bold text-xs transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}




export function AgendaView({ 
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
  const [errors, setErrors] = React.useState<{ title?: string; date?: string }>({});
  const [touched, setTouched] = React.useState<{ title?: boolean; date?: boolean }>({});

  const closeModal = () => {
    setIsModalOpen(false);
    setErrors({});
    setTouched({});
    setEditingEvent(null);
  };

  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
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
    const validationErrors: { title?: string; date?: string } = {};
    if (!newEvent.title.trim()) {
      validationErrors.title = "El título o motivo de la consulta es obligatorio.";
    }
    if (!newEvent.date) {
      validationErrors.date = "La fecha de la cita médica es obligatoria.";
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setTouched({ title: true, date: true });
      return;
    }
    
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
      title: newEvent.title.trim(),
      doctor: newEvent.doctor.trim()
    };

    if (editingEvent) {
      setEvents(events.map(e => e.id === editingEvent.id ? eventObj : e));
    } else {
      setEvents([...events, eventObj]);
    }
    
    closeModal();
    setNewEvent({ title: "", date: "", time: "", doctor: "" });
  };

  const openEdit = (ev: any) => {
    setEditingEvent(ev);
    setErrors({});
    setTouched({});
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
    setErrors({});
    setTouched({});
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
  const [isSuggestionsOpen, setIsSuggestionsOpen] = React.useState(false);

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
      <div className="bg-terracotta dark:bg-[#1a1724] dark:border-b dark:border-white/[0.08] px-6 py-7 text-white dark:text-[#eae6e1] rounded-b-3xl shadow-sm shrink-0 transition-colors">
        <p className="text-sage/20 dark:text-sage/80/80 text-xs font-semibold tracking-tight mb-1">Etapa actual</p>
        <h2 className="text-2xl font-bold tracking-tight">Semana {profile.week} <span className="text-base font-medium text-sage/20/90 dark:text-[#a6a1b2] ml-1">({profile.week <= 13 ? "Primer trimestre" : profile.week <= 27 ? "Segundo trimestre" : "Tercer trimestre"})</span></h2>
        <div className="mt-3.5 bg-white/20 dark:bg-white/10 rounded-full h-1.5 w-full overflow-hidden">
          <div className="bg-white dark:bg-sage h-full transition-all duration-500 rounded-full" style={{ width: `${Math.min(100, Math.round((profile.week / 40) * 100))}%` }}></div>
        </div>
        <p className="text-sage/10 dark:text-[#a6a1b2] text-xs mt-2 text-right font-medium">Faltan {Math.max(0, 40 - profile.week)} semanas</p>
      </div>

      <div className="p-5 flex-1 overflow-y-auto space-y-6 pb-20">
        
        {/* Banner de Recordatorio de Próxima Cita */}
        {nextUpcoming && (
          <button 
            type="button"
            onClick={() => onOpenPrep(nextUpcoming)}
            className="w-full text-left bg-terracotta/10/70 dark:bg-[#1f1b15] border border-terracotta/30/80 dark:border-terracotta/100/20 rounded-3xl p-4 shadow-sm hover:shadow-md cursor-pointer transition-all active:scale-[0.99] group relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-terracotta/100"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="bg-terracotta/20 dark:bg-[#2c2217] text-terracotta dark:text-terracotta/80 p-2.5 rounded-2xl shrink-0 mt-0.5 group-hover:scale-105 transition-transform shadow-xs">
                  <Bell size={20} className="animate-pulse text-amber-600 dark:text-terracotta" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold tracking-tight text-terracotta dark:text-terracotta/30 bg-terracotta/30/80 dark:bg-terracotta/100/20 px-2 py-0.5 rounded-full">
                      Recordatorio de Cita
                    </span>
                    <span className="text-xs font-bold text-terracotta dark:text-terracotta/80">
                      {getCountdownText(parseEventDate(nextUpcoming)!).text}
                    </span>
                  </div>
                  <h4 className="font-bold text-stone-900 dark:text-[#eae6e1] text-base mt-1 leading-tight">{nextUpcoming.title}</h4>
                  <p className="text-xs text-stone-600 dark:text-[#a6a1b2] mt-1 flex items-center gap-2">
                    <span>📅 {nextUpcoming.date} ({nextUpcoming.time})</span>
                    {nextUpcoming.doctor && <span>· {nextUpcoming.doctor}</span>}
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-terracotta/100 dark:text-terracotta shrink-0 mt-2 group-hover:translate-x-1 transition-transform" />
            </div>

            <div className="mt-3.5 pt-2.5 border-t border-terracotta/30/60 dark:border-terracotta/100/15 flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-terracotta dark:text-terracotta/80">
                <ClipboardList size={13} className="text-terracotta dark:text-terracotta" /> Preparación: ¿Qué llevar y qué preguntar?
              </span>
              <span className="text-sage dark:text-sage group-hover:underline">Abrir â†’</span>
            </div>
          </button>
        )}

        {/* Acordeón Compacto de Sugerencias del Copiloto IA */}
        {((profile.role === "mama" ? suggestions.mama : suggestions.papa).length > 0 || isSuggestionsOpen) && (
          <div className="bg-white dark:bg-[#221d2d] rounded-2xl shadow-xs border border-sage/20 dark:border-white/[0.08] overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setIsSuggestionsOpen(prev => !prev)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-sage/10/50 dark:hover:bg-[#2d273a]/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sage/100"
              aria-expanded={isSuggestionsOpen}
            >
              <div className="flex items-center gap-2.5">
                <div className="bg-sage/20 dark:bg-[#1a1724] text-sage dark:text-sage/80 p-1.5 rounded-xl">
                  <Sparkles size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-stone-800 dark:text-[#eae6e1] block">
                    Sugerencias del Copiloto IA ({(profile.role === "mama" ? suggestions.mama : suggestions.papa).length})
                  </span>
                  <span className="text-xs text-stone-500 dark:text-[#a6a1b2] block">
                    {isSuggestionsOpen ? "Toca para ocultar" : "Toca para ver recomendaciones para ti"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-sage dark:text-sage/80 bg-sage/20 dark:bg-[#1a1724] px-2 py-0.5 rounded-full tracking-wider uppercase border border-transparent dark:border-sage/100/20">
                  {profile.role === "mama" ? "Mamá" : "Papá"}
                </span>
                <ChevronDown size={16} className={`text-stone-400 dark:text-[#a6a1b2] transition-transform duration-200 ${isSuggestionsOpen ? "rotate-180" : ""}`} />
              </div>
            </button>

            {isSuggestionsOpen && (
              <div className="p-4 pt-1 space-y-2 border-t border-sage/10/80 dark:border-white/[0.06] animate-in fade-in">
                {(profile.role === "mama" ? suggestions.mama : suggestions.papa).map((s) => (
                  <div key={s.id} className="flex gap-2.5 items-start p-2.5 rounded-xl bg-stone-50 dark:bg-[#2d273a] border border-stone-200/80 dark:border-white/[0.06]">
                    <div className="mt-0.5 flex-shrink-0 w-4 h-4 bg-sage/20 dark:bg-[#1a1724] rounded-full flex items-center justify-center">
                      <CheckCircle2 size={11} className="text-sage dark:text-sage/80" />
                    </div>
                    <p className="text-xs text-stone-700 dark:text-[#eae6e1] leading-snug flex-1 font-medium">{s.text}</p>
                    <button 
                      type="button"
                      onClick={() => dismissSuggestion(s.id)} 
                      aria-label="Descartar sugerencia" 
                      className="text-stone-400 dark:text-[#a6a1b2] hover:text-stone-700 dark:hover:text-[#eae6e1] p-1 rounded-lg hover:bg-stone-200/60 dark:hover:bg-[#2c303b] transition-colors flex items-center justify-center"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
                {(profile.role === "mama" ? suggestions.mama : suggestions.papa).length === 0 && (
                  <p className="text-xs text-stone-400 dark:text-[#a6a1b2] italic text-center py-2">No hay más sugerencias por ahora.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Citas */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-stone-800 dark:text-[#eae6e1] flex items-center gap-2">
              <Calendar className="text-terracotta dark:text-sage" size={20}/> Agenda Médica
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                onClick={async () => {
                  const ok = await requestBrowserNotification(nextUpcoming);
                  if (ok) showToast("Recordatorios de citas activados en este teléfono 🔔", () => {});
                  else showToast("Permiso de notificaciones del navegador no concedido", () => {});
                }}
                className="text-xs font-bold text-sage dark:text-sage/80 bg-sage/10 dark:bg-[#1a1724] hover:bg-sage/20 dark:hover:bg-[#19322c] px-2.5 py-1.5 rounded-xl border border-sage/30/60 dark:border-sage/100/25 flex items-center gap-1 transition-colors shadow-xs active:scale-95"
                title="Activar alertas en el teléfono"
              >
                <Bell size={13} /> Alertas
              </button>
              {events.length > 0 && (
                <button
                  onClick={shareWithPartner}
                  className="text-xs font-bold text-sage dark:text-sage/80 bg-sage/10 dark:bg-[#1a1724] hover:bg-sage/20 dark:hover:bg-[#19322c] px-2.5 py-1.5 rounded-xl border border-sage/30/60 dark:border-sage/100/25 flex items-center gap-1 transition-colors shadow-xs active:scale-95"
                  title="Compartir citas con tu pareja para sincronizarlas"
                >
                  <Share2 size={13} /> Sincronizar
                </button>
              )}
            </div>
          </div>
          
          <div className="space-y-3">
            {events.length === 0 && (
              <div className="bg-stone-50 dark:bg-[#221d2d]/60 rounded-2xl p-6 text-center border border-dashed border-stone-200 dark:border-white/[0.08]">
                <Calendar className="mx-auto text-stone-300 dark:text-[#a6a1b2]/60 mb-2" size={32} />
                <p className="text-stone-500 dark:text-[#a6a1b2] text-sm font-medium">No hay citas agendadas</p>
              </div>
            )}
            {events.map(event => (
              <div key={event.id} className="bg-white dark:bg-[#221d2d] rounded-2xl p-4 shadow-xs border border-stone-200/80 dark:border-white/[0.08] flex items-start gap-4 relative group transition-colors">
                <div className="flex-1 flex items-start gap-4">
                  <button 
                    type="button"
                    onClick={() => openEdit(event)}
                    className="bg-sage/10 dark:bg-[#1a1724] text-sage dark:text-sage/80 rounded-xl w-14 h-14 flex flex-col justify-center items-center shrink-0 mt-0.5 hover:bg-sage/20 dark:hover:bg-[#19322c] focus:outline-none focus:ring-2 focus:ring-sage/100 transition-colors"
                    aria-label={`Ver o editar cita del ${event.date}`}
                  >
                    <span className="text-xs font-bold uppercase">{event.date.split(" ")[1]}</span>
                    <span className="text-xl font-bold leading-none">{event.date.split(" ")[0]}</span>
                  </button>
                  <div className="flex-1">
                    <button 
                      type="button"
                      onClick={() => openEdit(event)}
                      className="text-left group/title focus:outline-none focus:ring-2 focus:ring-sage/100 rounded block w-full"
                      aria-label={`Editar cita: ${event.title}, el ${event.date}`}
                    >
                      <h4 className="font-bold text-stone-800 dark:text-[#eae6e1] text-base leading-snug group-hover/title:text-sage dark:group-hover/title:text-sage/80 transition-colors">{event.title}</h4>
                      <div className="flex items-center gap-3 mt-1 text-sm text-stone-500 dark:text-[#a6a1b2]">
                        <span className="flex items-center gap-1"><Clock size={14} /> {event.time}</span>
                      </div>
                      {event.doctor && <p className="text-xs text-stone-500 dark:text-[#a6a1b2] mt-0.5 line-clamp-1">{event.doctor}</p>}
                    </button>
                    
                    {/* Botón de Preparación Rápida */}
                    <div className="flex items-center gap-2 mt-2.5">
                      <button 
                        type="button"
                        onClick={() => onOpenPrep(event)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sage/10 dark:bg-[#1a1724] hover:bg-sage/20 dark:hover:bg-[#19322c] text-sage dark:text-sage/80 text-xs font-bold border border-sage/30/70 dark:border-sage/100/25 shadow-xs active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-sage/100"
                      >
                        <ClipboardList size={13} className="text-terracotta dark:text-sage" />
                        <span>¿Qué llevar y preguntar?</span>
                      </button>
                    </div>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => deleteEvent(event.id)} 
                  aria-label={`Eliminar cita: ${event.title}`} 
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center text-stone-400 dark:text-[#a6a1b2] hover:text-rose-600 dark:hover:text-terracotta hover:bg-stone-100 dark:hover:bg-[#2d273a] transition-colors p-2 z-10 rounded-xl"
                >
                  <X size={18}/>
                </button>
              </div>
            ))}
          </div>
          
          <button onClick={openNew} className="w-full mt-4 py-3 rounded-xl border-2 border-dashed border-sage/30 dark:border-sage/100/30 text-terracotta dark:text-sage/80 font-bold flex items-center justify-center gap-2 hover:bg-sage/10 dark:hover:bg-[#1a1724]/50 transition-colors">
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
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          className="absolute inset-0 bg-stone-900/40 dark:bg-black/70 z-50 flex items-end sm:items-center justify-center animate-in fade-in duration-200"
        >
          <div className="bg-white dark:bg-[#221d2d] w-full max-h-[90%] overflow-y-auto sm:w-[90%] sm:rounded-3xl rounded-t-3xl p-6 pb-12 animate-in slide-in-from-bottom-8 border border-stone-100 dark:border-white/[0.08] shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 id="agenda-modal-title" className="text-xl font-bold text-stone-800 dark:text-[#eae6e1]">{editingEvent ? "Editar Cita" : "Nueva Cita Médica"}</h3>
              <button 
                onClick={closeModal} 
                className="bg-stone-100 dark:bg-[#2d273a] p-2 rounded-full text-stone-500 dark:text-[#a6a1b2] hover:bg-stone-200 dark:hover:bg-[#2a2d36] transition-colors"
                aria-label="Cerrar modal de cita"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex flex-col gap-5">
              <div>
                <label htmlFor="event-title" className="text-xs font-bold text-stone-700 dark:text-[#eae6e1] tracking-tight mb-1 flex items-center justify-between">
                  <span>Título / Motivo <span className="text-terracotta/100">*</span></span>
                  {touched.title && errors.title && (
                    <span className="text-terracotta/100 text-xs font-medium lowercase tracking-normal flex items-center gap-1 animate-in fade-in" role="alert">
                      <AlertCircle size={12} /> {errors.title}
                    </span>
                  )}
                </label>
                <input 
                  id="event-title"
                  type="text" 
                  value={newEvent.title} 
                  onChange={e => {
                    const val = e.target.value;
                    setNewEvent({...newEvent, title: val});
                    if (touched.title) {
                      setErrors(prev => ({ ...prev, title: val.trim() ? undefined : "El título o motivo de la consulta es obligatorio." }));
                    }
                  }}
                  onBlur={() => {
                    setTouched(t => ({ ...t, title: true }));
                    if (!newEvent.title.trim()) {
                      setErrors(prev => ({ ...prev, title: "El título o motivo de la consulta es obligatorio." }));
                    }
                  }}
                  aria-invalid={touched.title && !!errors.title}
                  className={`w-full bg-stone-50 dark:bg-[#2d273a] border rounded-xl px-4 py-3 text-stone-800 dark:text-[#eae6e1] transition-colors focus:outline-none focus:ring-2 placeholder-gray-400 dark:placeholder-[#a6a1b2]/60 ${
                    touched.title && errors.title
                      ? "border-terracotta bg-terracotta/10/20 dark:bg-rose-950/20 focus:ring-terracotta"
                      : "border-stone-200 dark:border-white/10 focus:ring-sage/100"
                  }`}
                  placeholder="Ej. Ecografía Morfológica o Control Prenatal" 
                />
              </div>
              
              <div className="flex gap-3">
                <div className="flex-1">
                  <label htmlFor="event-date" className="text-xs font-bold text-stone-700 dark:text-[#eae6e1] tracking-tight mb-1 flex items-center justify-between">
                    <span>Fecha <span className="text-terracotta/100">*</span></span>
                    {touched.date && errors.date && (
                      <span className="text-terracotta/100 text-xs font-medium lowercase tracking-normal flex items-center gap-1 animate-in fade-in" role="alert">
                        <AlertCircle size={12} /> Requerida
                      </span>
                    )}
                  </label>
                  <input 
                    id="event-date"
                    type="date" 
                    value={newEvent.date} 
                    onChange={e => {
                      const val = e.target.value;
                      setNewEvent({...newEvent, date: val});
                      if (touched.date) {
                        setErrors(prev => ({ ...prev, date: val ? undefined : "La fecha de la cita médica es obligatoria." }));
                      }
                    }}
                    onBlur={() => {
                      setTouched(t => ({ ...t, date: true }));
                      if (!newEvent.date) {
                        setErrors(prev => ({ ...prev, date: "La fecha de la cita médica es obligatoria." }));
                      }
                    }}
                    aria-invalid={touched.date && !!errors.date}
                    className={`w-full bg-stone-50 dark:bg-[#2d273a] border rounded-xl px-4 py-3 text-stone-800 dark:text-[#eae6e1] transition-colors focus:outline-none focus:ring-2 ${
                      touched.date && errors.date
                        ? "border-terracotta bg-terracotta/10/20 dark:bg-rose-950/20 focus:ring-terracotta"
                        : "border-stone-200 dark:border-white/10 focus:ring-sage/100"
                    }`} 
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="event-time" className="text-xs font-bold text-stone-700 dark:text-[#eae6e1] tracking-tight mb-1 block">Hora</label>
                  <input 
                    id="event-time"
                    type="time" 
                    value={newEvent.time} 
                    onChange={e => setNewEvent({...newEvent, time: e.target.value})}
                    className="w-full bg-stone-50 dark:bg-[#2d273a] border border-stone-200 dark:border-white/10 rounded-xl px-4 py-3 text-stone-800 dark:text-[#eae6e1] focus:outline-none focus:ring-2 focus:ring-sage/100" 
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="event-doctor" className="text-xs font-bold text-stone-700 dark:text-[#eae6e1] tracking-tight mb-1 block">Doctor o Clínica</label>
                <input 
                  id="event-doctor"
                  type="text" 
                  value={newEvent.doctor} 
                  onChange={e => setNewEvent({...newEvent, doctor: e.target.value})}
                  className="w-full bg-stone-50 dark:bg-[#2d273a] border border-stone-200 dark:border-white/10 rounded-xl px-4 py-3 text-stone-800 dark:text-[#eae6e1] focus:outline-none focus:ring-2 focus:ring-sage/100 placeholder-gray-400 dark:placeholder-[#a6a1b2]/60"
                  placeholder="Dra. Ramírez / Hospital Los Olivos" 
                />
              </div>
              
              <button 
                type="button"
                onClick={handleSaveEvent}
                className="w-full bg-terracotta hover:bg-terracotta-hover text-white font-bold py-4 rounded-xl mt-4 transition-colors shadow-xs active:scale-[0.99]"
              >
                {editingEvent ? "Actualizar Cita" : "Guardar Cita"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- VISTA 3: PANDA IA (ASISTENTE CLíNICO Y COPILOTO DE PATERNIDAD) ---