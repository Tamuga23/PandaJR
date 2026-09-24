"use client";

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

function ProfileModal({ 
  profile, 
  onSave, 
  onClose,
  isDark,
  toggleTheme
}: { 
  profile: UserProfile;
  onSave: (p: UserProfile) => void;
  onClose: () => void;
  isDark: boolean;
  toggleTheme: () => void;
}) {
  const [form, setForm] = useState(profile);
  const [confirmUnlink, setConfirmUnlink] = useState(false);

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
      <div className="bg-white dark:bg-[#221d2d] rounded-3xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-stone-200/80 dark:border-white/[0.08] flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="bg-stone-50 dark:bg-[#1a1724] p-4 flex justify-between items-center border-b border-stone-100 dark:border-white/[0.04]">
          <h3 id="profile-modal-title" className="font-bold text-stone-800 dark:text-[#eae6e1] flex items-center gap-2">
            <Settings size={18} className="text-stone-500" /> Ajustes
          </h3>
          <button 
            type="button"
            onClick={onClose} 
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl text-stone-400 hover:text-stone-800 dark:hover:text-[#eae6e1] bg-white dark:bg-[#2d273a] shadow-sm transition-colors" 
            aria-label="Cerrar ventana de ajustes"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-5 space-y-6 overflow-y-auto flex-1">
          
          {/* Vínculo Familiar */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-stone-400 dark:text-[#a6a1b2] uppercase tracking-wider">Familia</h4>
            <div className="bg-stone-50 dark:bg-[#1a1724] border border-stone-200 dark:border-white/[0.04] rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${form.role === 'mama' ? 'bg-terracotta/10 text-terracotta' : 'bg-sage/10 text-sage'}`}>
                  {form.role === 'mama' ? <Baby size={20} /> : <Users size={20} />}
                </div>
                <div>
                  <p className="font-bold text-stone-800 dark:text-[#eae6e1] text-sm">
                    {form.role === 'mama' ? 'Modo Mamá' : 'Modo Copiloto'}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-[#a6a1b2]">{form.name}</p>
                </div>
              </div>
              <button 
                onClick={() => { if (confirmUnlink) { usePandaStore.getState().setProfile({ name: "", pregnancyId: "", inviteCode: "" } as any); onClose(); } else { setConfirmUnlink(true); setTimeout(() => setConfirmUnlink(false), 3000); } }}
                className={`text-xs font-bold min-h-[44px] min-w-[44px] px-4 rounded-lg shadow-sm transition-colors ${confirmUnlink ? 'bg-terracotta/100 text-white border-transparent' : 'text-stone-500 bg-white dark:bg-[#2d273a] border border-stone-200 dark:border-white/[0.06]'}`}
              >
                {confirmUnlink ? '¿Seguro?' : 'Desvincular'}
              </button>
            </div>
            
            {form.role === 'papa' && (
              <div className="bg-stone-50 dark:bg-white/[0.02] p-4 rounded-2xl flex items-center justify-between border border-stone-100 dark:border-white/[0.05]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-800 dark:text-white mb-0.5">Tema de Comparación</p>
                    <p className="text-xs text-stone-500 dark:text-[#a6a1b2]">Frutas o estilo Geek</p>
                  </div>
                </div>
                <button 
                  onClick={() => setForm({...form, comparisonTheme: form.comparisonTheme === 'geek' ? 'frutas' : 'geek'})}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.comparisonTheme === 'geek' ? 'bg-indigo-500' : 'bg-stone-300 dark:bg-stone-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.comparisonTheme === 'geek' ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            )}

            {form.role === 'mama' && (
              <div className="bg-stone-900 dark:bg-[#2d273a] text-white p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mb-0.5">Código de Pareja</p>
                  <p className="font-mono font-bold tracking-widest text-lg">{form.inviteCode || "PANDA-----"}</p>
                </div>
                <button className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-xl transition-colors" aria-label="Copiar código">
                  <ClipboardList size={18} />
                </button>
              </div>
            )}
          </div>

          {/* Preferencias Médicas */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-stone-400 dark:text-[#a6a1b2] uppercase tracking-wider">Gestación & Detalles</h4>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-bold text-stone-700 dark:text-[#eae6e1]">Semana {form.week}</label>
                <span className="text-xs text-stone-500">Actualizar</span>
              </div>
              <input 
                type="range" min="1" max="40" 
                value={form.week} onChange={(e) => setForm({...form, week: parseInt(e.target.value)})}
                className="w-full accent-terracotta"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-stone-700 dark:text-[#eae6e1] block mb-1">Ciudad o País</label>
              <input 
                type="text" 
                value={form.location || ""} 
                onChange={(e) => setForm({...form, location: e.target.value})}
                placeholder="Para recomendaciones locales"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-white/[0.1] bg-stone-50 dark:bg-[#1a1724] dark:text-[#eae6e1] text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-stone-700 dark:text-[#eae6e1] block mb-1">Notas de rutina</label>
              <textarea 
                value={form.notes || ""} 
                onChange={(e) => setForm({...form, notes: e.target.value})}
                placeholder="Ej. Trabajo en turnos, parto programado..."
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-white/[0.1] bg-stone-50 dark:bg-[#1a1724] dark:text-[#eae6e1] text-sm resize-none"
              />
            </div>
          </div>

          {/* Modo Oscuro Toggle */}
          <div className="flex items-center justify-between p-4 bg-stone-50 dark:bg-[#1a1724] rounded-2xl border border-stone-200/80 dark:border-white/[0.04]">
            <div className="flex items-center gap-3">
              <div className="bg-stone-200 dark:bg-[#2d273a] p-2 rounded-xl text-stone-600 dark:text-[#a6a1b2]">
                {isDark ? <Moon size={18} /> : <Sun size={18} />}
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-stone-800 dark:text-[#eae6e1]">Modo Oscuro</p>
                <p className="text-xs text-stone-500 dark:text-[#a6a1b2]">Ideal para la noche</p>
              </div>
            </div>
            <div className="min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer" onClick={toggleTheme}>
              <button
                type="button"
                role="switch"
                aria-checked={isDark}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors pointer-events-none ${isDark ? "bg-terracotta" : "bg-stone-300"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDark ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-100 dark:border-white/[0.04] bg-white dark:bg-[#221d2d]">
          <button
            type="button"
            onClick={() => onSave(form)}
            className="w-full min-h-[44px] bg-stone-900 hover:bg-stone-800 dark:bg-[#eae6e1] dark:hover:bg-white dark:text-stone-900 text-white rounded-xl py-3 text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2"
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}

// --- SISTEMA DE PREPARACIÓN CLíNICA Y RECORDATORIOS DE CITAS ---
export interface AppointmentPrepInfo {
  category: string;
  badge: string;
  whatToBring: string[];
  whatToAsk: string[];
  tip: string;
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

function parseEventDate(ev: { rawDate?: string; date?: string; time?: string }): Date | null {
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
    ...prep.whatToBring.map(item => `â€¢ ${item}`),
    "",
    "â“ PREGUNTAS CLAVE PARA EL MÉDICO:",
    ...prep.whatToAsk.map(item => `â€¢ ${item}`),
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
    ...prep.whatToBring.map(i => `â€¢ ${i}`),
    "",
    "â“ PREGUNTAS PARA EL DOCTOR:",
    ...prep.whatToAsk.map(i => `â€¢ ${i}`),
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
              {prep.whatToBring.map((item, idx) => {
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
              {prep.whatToAsk.map((q, idx) => {
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


function OnboardingModal({ onComplete, onSkip }: { onComplete: (profile: UserProfile) => void; onSkip?: () => void; }) {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<"mama" | "papa" | null>(null);
  const [name, setName] = useState("");
  const [week, setWeek] = useState(14);
  const [code, setCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [tempPregnancyId, setTempPregnancyId] = useState("");

  const handleNext = async () => {
    setErrorMsg("");
    if (step === 1 && role) {
      setStep(2);
    } else if (step === 2) {
      if (role === "mama" && name) {
        setIsLoading(true);
        try {
          const uid = await ensureAuth();
          if (!uid) throw new Error("No auth");
          const { inviteCode, pregnancyId } = await createPregnancyForMom(uid, name);
          setGeneratedCode(inviteCode);
          setTempPregnancyId(pregnancyId);
          setStep(3); // Show code
        } catch (e) {
          console.error(e);
          setErrorMsg("Error al crear. Asegúrate de habilitar Firestore y Auth Anónimo.");
        } finally {
          setIsLoading(false);
        }
      } else if (role === "papa" && code.length > 4) {
        setIsLoading(true);
        try {
          const uid = await ensureAuth();
          if (!uid) throw new Error("No auth");
          const { pregnancyId, babyName, week } = await joinPregnancyAsDad(uid, code);
          onComplete({ role: "papa", name: "Copiloto de " + babyName, week: week || 14, location: "", notes: "", pregnancyId });
        } catch (e: any) {
          setErrorMsg(e.message || "Código inválido");
        } finally {
          setIsLoading(false);
        }
      }
    } else if (step === 3) {
      onComplete({ role: "mama", name, week, location: "", notes: "", pregnancyId: tempPregnancyId, inviteCode: generatedCode });
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-50 dark:bg-[#181520] z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#221d2d] rounded-3xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-500 border border-stone-200/80 dark:border-white/[0.08] p-6 text-center">
        
        {step === 1 && (
          <div className="space-y-6">
            <div className="w-24 h-24 rounded-3xl overflow-hidden mx-auto mb-4 border border-stone-200 dark:border-white/[0.08] shadow-sm">
                <Image src="/panda-icon.jpg" alt="PandaJR Icon" width={96} height={96} className="w-full h-full object-cover" priority />
              </div>
            <h2 className="text-2xl font-black text-stone-800 dark:text-[#eae6e1]">Bienvenido a PandaJR</h2>
            <p className="text-sm text-stone-500 dark:text-[#a6a1b2]">¿Quién eres en esta hermosa aventura?</p>
            
            <div className="space-y-3 mt-4">
              <button 
                onClick={() => setRole("mama")}
                className={`w-full p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${role === "mama" ? "border-terracotta bg-terracotta/5" : "border-stone-100 dark:border-white/[0.06] hover:border-stone-300 dark:hover:border-white/[0.12]"}`}
              >
                <Baby size={28} className={role === "mama" ? "text-terracotta" : "text-stone-400"} />
                <span className={`font-bold ${role === "mama" ? "text-terracotta" : "text-stone-600 dark:text-[#a6a1b2]"}`}>Soy la futura mamá</span>
              </button>
              <button 
                onClick={() => setRole("papa")}
                className={`w-full p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${role === "papa" ? "border-sage bg-sage/5" : "border-stone-100 dark:border-white/[0.06] hover:border-stone-300 dark:hover:border-white/[0.12]"}`}
              >
                <Users size={28} className={role === "papa" ? "text-sage" : "text-stone-400"} />
                <span className={`font-bold ${role === "papa" ? "text-sage" : "text-stone-600 dark:text-[#a6a1b2]"}`}>Soy el copiloto (pareja)</span>
              </button>
            </div>

          {/* Botón de Skip (P0) */}
          <button 
            onClick={() => onSkip && onSkip()} 
            className="w-full mt-4 py-3 min-h-[44px] text-sm font-bold text-stone-400 hover:text-stone-600 dark:text-[#a6a1b2] dark:hover:text-white transition-colors"
          >
            Explorar como invitado por ahora
          </button>
            <button 
              onClick={handleNext}
              disabled={!role}
              className="w-full bg-stone-900 hover:bg-stone-800 dark:bg-[#eae6e1] dark:hover:bg-white dark:text-stone-900 text-white rounded-xl py-3.5 font-bold disabled:opacity-50 transition-all mt-4"
            >
              {isLoading ? "Conectando..." : "Continuar"}
              </button>
          </div>
        )}

        {step === 2 && role === "mama" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-stone-800 dark:text-[#eae6e1]">Tu perfil</h2>
            <p className="text-sm text-stone-500 dark:text-[#a6a1b2]">Configura tu embarazo para personalizar la experiencia.</p>
            
            {errorMsg && <div className="text-sm text-rose-500 bg-rose-50 dark:bg-rose-950/30 p-3 rounded-xl border border-rose-100 dark:border-rose-900">{errorMsg}</div>}
              <div className="space-y-4 text-left">
              <div>
                <label className="text-xs font-bold text-stone-600 dark:text-[#a6a1b2] mb-1 block">Tu nombre</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Elena"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-white/[0.1] bg-stone-50 dark:bg-[#1a1724] dark:text-[#eae6e1]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-600 dark:text-[#a6a1b2] mb-1 block">Semana de embarazo ({week})</label>
                <input 
                  type="range" min="1" max="40" 
                  value={week} onChange={(e) => setWeek(parseInt(e.target.value))}
                  className="w-full accent-terracotta"
                />
              </div>
            </div>
            <button 
              onClick={handleNext}
              disabled={!name}
              className="w-full bg-terracotta hover:bg-terracotta-hover text-white rounded-xl py-3.5 font-bold disabled:opacity-50 transition-all"
            >
              Generar mi código
            </button>
          </div>
        )}

        {step === 2 && role === "papa" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-stone-800 dark:text-[#eae6e1]">Vincular Cuenta</h2>
            <p className="text-sm text-stone-500 dark:text-[#a6a1b2]">Pídele a tu pareja su código de vinculación para compartir el diario.</p>
            {errorMsg && <div className="text-sm text-rose-500 bg-rose-50 dark:bg-rose-950/30 p-3 rounded-xl border border-rose-100 dark:border-rose-900 mt-4">{errorMsg}</div>}
            
            <div className="pt-4">
              <label className="text-xs font-bold text-stone-600 dark:text-[#a6a1b2] mb-1 block text-left">Código de invitación</label>
              <input 
                type="text" 
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="PANDA-XXXX"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-white/[0.1] bg-stone-50 dark:bg-[#1a1724] dark:text-[#eae6e1] text-center font-mono font-bold tracking-widest text-lg uppercase"
              />
            </div>
            <button 
                onClick={handleNext}
                disabled={code.length < 5 || isLoading}
                className="w-full bg-sage hover:bg-sage-hover text-white rounded-xl py-3.5 font-bold disabled:opacity-50 transition-all"
              >
                {isLoading ? "Conectando..." : "Conectar"}
              </button>
          </div>
        )}

        {step === 3 && role === "mama" && (
          <div className="space-y-6">
            <div className="bg-sage/10 dark:bg-sage/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="text-sage" size={32} />
            </div>
            <h2 className="text-2xl font-black text-stone-800 dark:text-[#eae6e1]">¡Todo listo!</h2>
            <p className="text-sm text-stone-500 dark:text-[#a6a1b2]">Comparte este código con tu pareja para que se vincule a tu embarazo.</p>
            
            <div className="bg-stone-50 dark:bg-[#1a1724] p-4 rounded-2xl border border-stone-200 dark:border-white/[0.1]">
              <p className="font-mono text-2xl font-black tracking-widest text-terracotta">{generatedCode}</p>
            </div>
            
            <button 
              onClick={handleNext}
              className="w-full bg-stone-900 hover:bg-stone-800 dark:bg-[#eae6e1] dark:hover:bg-white dark:text-stone-900 text-white rounded-xl py-3.5 font-bold transition-all"
            >
              Entrar al Diario
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PandaJRApp() {
  const [activeTab, setActiveTab] = useState<Tab>("planificacion");

  // Perfil global de usuario (compartido en toda la app)
  // Zustand Global Store
  const profile = usePandaStore(state => state.profile);
  const setProfile = usePandaStore(state => state.setProfile);
  const isDark = usePandaStore(state => state.isDark);
  const toggleThemeStore = usePandaStore(state => state.toggleTheme);
  // --- Firebase Real-time Sync ---
  const [remoteMomStatus, setRemoteMomStatus] = useState<any>(null);

  useEffect(() => {
    if (profile?.pregnancyId) {
      const unsubPreg = listenToPregnancy(profile.pregnancyId, (data) => {
        if (data.week && data.week !== profile.week) {
          // Sync week to local store
          setProfile({ week: data.week });
        }
      });
      const unsubStatus = listenToMomStatus(profile.pregnancyId, (status) => {
        setRemoteMomStatus({
          text: status.statusText,
          emoji: status.emoji,
          lastUpdated: "recién actualizado"
        });
      });
      return () => {
        unsubPreg();
        unsubStatus();
      };
    }
  }, [profile?.pregnancyId, profile?.week]);
  // -------------------------------

  const hasHydrated = usePandaStore(state => state.hasHydrated);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedPrepEvent, setSelectedPrepEvent] = useState<any | null>(null);
  const [aiInitialQuery, setAiInitialQuery] = useState<string>("");

  

  const toggleTheme = () => {
    const nextDark = !isDark;
    toggleThemeStore();
    if (nextDark) {
      document.documentElement.classList.add("dark");
      try { localStorage.setItem("pandajr_theme", "dark"); } catch(e) {}
    } else {
      document.documentElement.classList.remove("dark");
      try { localStorage.setItem("pandajr_theme", "light"); } catch(e) {}
    }
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(25); } catch(e) {}
    }
  };

  // Detectar si el usuario necesita Onboarding
  useEffect(() => {
    if (hasHydrated && !profile.name) {
      setShowOnboarding(true);
    }
  }, [hasHydrated, profile.name]);

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(updates);
    if (updates.pregnancyId && updates.week) {
      updatePregnancyWeek(updates.pregnancyId, updates.week);
    }
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

  // Atajo de teclado: tecla Escape para cerrar modales abiertos
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isProfileModalOpen) setIsProfileModalOpen(false);
        if (selectedPrepEvent) setSelectedPrepEvent(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isProfileModalOpen, selectedPrepEvent]);

  

  if (!hasHydrated) return null;

  return (
    <div className={`flex flex-col ${activeTab === "pandaia" ? "h-screen overflow-hidden" : "min-h-screen pb-16"} w-full max-w-md mx-auto bg-[#faf9f5] dark:bg-[#181520] text-stone-900 dark:text-[#eae6e1] font-sans relative shadow-2xl overflow-x-hidden transition-colors duration-200 border-x border-stone-200/60 dark:border-white/[0.08]`}>
      {/* Header con Logo, Switch Modo Oscuro, Alerta de Cita y Selector Global de Perfil */}
      <header className="bg-white/95 dark:bg-[#181520]/95 backdrop-blur-md px-3 sm:px-4 py-2.5 shadow-xs border-b border-stone-200/70 dark:border-white/[0.08] sticky top-0 z-40 w-full flex items-center justify-between shrink-0 transition-colors">
        <div className="flex items-center">
          <h1 className="sr-only">PandaJR</h1>
          <Image 
            src="/logo.png" 
            alt="PandaJR" 
            width={136} 
            height={36} 
            priority 
            className="h-8 sm:h-9 w-auto object-contain dark:brightness-110"
          />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          

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
              className={`min-w-[44px] min-h-[44px] p-2.5 rounded-full border transition-all active:scale-95 relative flex items-center justify-center ${
                nextUpcomingEvent 
                  ? "bg-terracotta/10 dark:bg-[#241b12] border-terracotta/30 dark:border-terracotta/100/25 text-terracotta dark:text-terracotta/80 hover:bg-terracotta/20 dark:hover:bg-[#2c2217]" 
                  : "bg-stone-50 dark:bg-[#2d273a] border-stone-200 dark:border-white/10 text-stone-400 dark:text-[#a6a1b2] hover:bg-stone-100 dark:hover:bg-[#2a2e38]"
              }`}
              title={nextUpcomingEvent ? `Recordatorio de cita: ${nextUpcomingEvent.title}` : "Citas médicas"}
              aria-label="Recordatorio de citas médicas"
            >
              <Bell size={16} />
              {nextUpcomingEvent && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-terracotta/100 rounded-full animate-ping"></span>
              )}
              {nextUpcomingEvent && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-terracotta/100 rounded-full border-2 border-white dark:border-[#181520]"></span>
              )}
            </button>
          )}

          {/* Botón Global de Perfil / Switcher */}
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-full bg-sage/10 dark:bg-[#1a1724] border border-sage/30/70 dark:border-sage/100/25 hover:bg-sage/20 dark:hover:bg-[#1b322c] transition-all text-xs font-bold text-sage dark:text-sage/80 active:scale-95 shadow-xs"
            title="Configurar tu rol y perfil en este dispositivo"
          >
            <span className="text-base">{profile.role === "papa" ? "👨" : "👩"}</span>
            <span>{profile.name || (profile.role === "papa" ? "Papá" : "Mamá")}</span>
            <Settings size={13} className="text-terracotta opacity-70 ml-0.5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`flex-1 w-full ${activeTab === "pandaia" ? "overflow-hidden flex flex-col pb-16" : "overflow-y-auto pb-6"}`}>
        <div className={activeTab === "planificacion" ? "block w-full h-full" : "hidden"}>
          <GuiaPapaView showToast={showToast} profile={profile} updateProfile={updateProfile} remoteMomStatus={remoteMomStatus} />
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
          <HerramientasView showToast={showToast} profile={profile} />
        </div>
        <div className={activeTab === "pandaia" ? "flex-1 flex flex-col w-full h-full overflow-hidden" : "hidden"}>
          <PandaIAView 
            showToast={showToast} 
            addEvent={handleAIAddEvent} 
            profile={profile} 
            initialQuery={aiInitialQuery}
            clearInitialQuery={() => setAiInitialQuery("")}
            setActiveTab={setActiveTab}
          />
        </div>
      </main>

      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModal 
          onComplete={(newProfile) => {
            setProfile(newProfile);
            setShowOnboarding(false);
          }}
          onSkip={() => {
            setProfile({ name: 'Invitado', role: 'papa', week: 1 });
            setShowOnboarding(false);
          }}
        />
      )}
      
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
          isDark={isDark}
          toggleTheme={toggleTheme}
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
        <div className="fixed bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] left-4 right-4 max-w-[calc(28rem-2rem)] mx-auto bg-stone-900/95 text-white px-4 py-3 rounded-2xl shadow-2xl z-50 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200 backdrop-blur-sm border border-gray-800">
          <span className="text-sm font-medium">{toast.message}</span>
          <button 
            onClick={() => { toast.onUndo(); setToast(null); }}
            className="text-sage font-bold text-xs tracking-tight hover:text-sage/80 transition-colors px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 shrink-0"
          >
            Deshacer
          </button>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav aria-label="Navegación principal" className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 dark:bg-[#181520]/95 backdrop-blur-md border-t border-stone-200/80 dark:border-white/[0.08] flex justify-around items-center px-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-50 transition-colors">
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
      type="button"
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={`flex flex-col items-center gap-1 w-full p-2 transition-colors duration-200 ${
        isActive ? "text-terracotta dark:text-sage font-semibold" : "text-stone-500 hover:text-stone-700 dark:text-[#a6a1b2] dark:hover:text-[#eae6e1]"
      }`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function PregnancyProgressBar({ week }: { week: number }) {
  const percent = Math.min(100, Math.max(0, (week / 40) * 100));
  
  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-2 px-1">
        <span className="text-[11px] font-medium text-stone-500 dark:text-[#a6a1b2]">Inicio dulce</span>
        <span className="text-sm font-bold text-stone-800 dark:text-[#eae6e1]">Semana {week} ({Math.round(percent)}%)</span>
        <span className="text-[11px] font-medium text-stone-500 dark:text-[#a6a1b2]">Llegada soñada</span>
      </div>
      <div className="h-2 w-full bg-stone-100 dark:bg-[#2d273a] rounded-full overflow-hidden">
        <div 
          className="h-full bg-sage rounded-full transition-all duration-500 ease-out" 
          style={{ width: `${percent}%` }}
        ></div>
      </div>
    </div>
  );
}

function MomStatusCard({ profile, remoteMomStatus }: { profile: UserProfile, remoteMomStatus?: any }) {
  return (
    <div className="bg-white dark:bg-[#221d2d] rounded-3xl shadow-sm border border-stone-200/80 dark:border-white/[0.08] p-5 animate-in fade-in transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-stone-100 border border-stone-200 dark:border-white/[0.06] shrink-0">
            {/* Avatar placeholder */}
            <div className="w-full h-full bg-terracotta/20 flex items-center justify-center text-terracotta font-bold text-lg">
              {profile.name ? profile.name.charAt(0).toUpperCase() : "E"}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-800 dark:text-[#eae6e1] leading-tight">¿Cómo se siente {profile.name || "Elena"} hoy?</h3>
            <p className="text-xs text-stone-500 dark:text-[#a6a1b2] mt-0.5">Actualizado hace 40 min por ella</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 bg-terracotta/10 dark:bg-[#2d273a] px-3 py-1.5 rounded-full border border-terracotta/20 dark:border-white/[0.06] shrink-0">
          <span className="text-xs">🥰</span>
          <span className="text-[11px] font-bold text-terracotta dark:text-terracotta">Muy feliz y relajada</span>
        </div>
      </div>
      
      {/* Mobile status badge fallback */}
      <div className="sm:hidden flex items-center gap-1.5 bg-terracotta/10 dark:bg-[#2d273a] px-3 py-1.5 rounded-full border border-terracotta/20 dark:border-white/[0.06] mb-3 w-fit">
        <span className="text-xs">🥰</span>
        <span className="text-[11px] font-bold text-terracotta dark:text-terracotta">Muy feliz y relajada</span>
      </div>
      
      {/* Quote bubble */}
      <div className="bg-stone-50 dark:bg-[#1a1724] rounded-2xl p-4 mb-4 border border-stone-100 dark:border-white/[0.04] relative">
        <p className="text-sm italic text-stone-700 dark:text-[#eae6e1]/90">
          "¡El masaje de pies fue la gloria! Y el bebé no paró de responder a las caricias antes de cenar ✨"
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button className="w-full sm:flex-1 bg-sage/10 hover:bg-sage/20 dark:bg-sage/20 dark:hover:bg-sage/30 text-sage dark:text-sage-hover border border-sage/20 rounded-xl py-2.5 text-xs font-bold transition-colors flex items-center justify-center gap-2">
          <CheckCircle2 size={16} />
          Masaje completado
        </button>
        <button className="w-full sm:flex-1 bg-terracotta hover:bg-terracotta-hover text-white rounded-xl py-2.5 text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm">
          <Heart size={16} />
          Charla en la cama
        </button>
      </div>
    </div>
  );
}

    // --- VISTA 1: GUÍA DEL PAPÁ ---
const masterCategories = [
  // TRIMESTRE 1 (Semanas 1-13)
  {
    id: "t1_nutricion", trimester: 1, defaultExpanded: true,
    title: "Neuro-Nutrición (Pilar 1)",
    icon: <Utensils className="text-terracotta/100" size={20} />, color: "bg-terracotta/10",
    tasks: [
      { id: 110, text: "Garantizar Suplemento de Ácido Fólico diario" },
      { id: 111, text: "Mantener su termo de agua lleno (volumen amniótico)" },
      { id: 112, text: "Snacks secos en su buró (contra náuseas matutinas)" },
    ]
  },
  {
    id: "t1_toxicos", trimester: 1, defaultExpanded: true,
    title: "Escudo Ambiental (Pilar 2)",
    icon: <AlertTriangle className="text-terracotta/100" size={20} />, color: "bg-terracotta/10",
    tasks: [
      { id: 113, text: "Tirar/Donar tuppers de plástico (BPA interfiere hormonas)" },
      { id: 114, text: "Asumir tú la limpieza con químicos (evitar VOCs)" },
      { id: 115, text: "Asumir tú la caja del gato 100% (Prevención Toxoplasmosis)" },
    ]
  },
  {
    id: "t1_citas", trimester: 1, defaultExpanded: false,
    title: "Salud y Citas Médicas",
    icon: <Activity className="text-terracotta" size={20} />, color: "bg-sage/10",
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
    icon: <Utensils className="text-terracotta/100" size={20} />, color: "bg-terracotta/10",
    tasks: [
      { id: 210, text: "Suplemento DHA/Omega-3 (Desarrollo corteza frontal)" },
      { id: 211, text: "Garantizar Colina en dieta (Huevos, pollo magro)" },
      { id: 212, text: "Monitorear hierro (Prevenir anemia por dilución de sangre)" },
    ]
  },
  {
    id: "t2_estres", trimester: 2, defaultExpanded: true,
    title: "Gestor de Cortisol (Pilar 3)",
    icon: <Heart className="text-terracotta/100" size={20} />, color: "bg-terracotta/10",
    tasks: [
      { id: 213, text: "Asumir la carga mental de planear las cenas" },
      { id: 214, text: "Agendarle un masaje prenatal o día de descanso total" },
      { id: 215, text: "Bloquear críticas o estrés externo hacia ella" },
    ]
  },
  {
    id: "t2_compras", trimester: 2, defaultExpanded: false,
    title: "Primeras compras",
    icon: <ShoppingBag className="text-terracotta" size={20} />, color: "bg-sage/10",
    tasks: [
      { id: 204, text: "Cotizar cochecito/carriola" },
      { id: 205, text: "Comprar almohada de embarazo (Alineación pélvica)" },
    ]
  },
  // TRIMESTRE 3 (Semanas 28+)
  {
    id: "t3_biomecanica", trimester: 3, defaultExpanded: true,
    title: "Microbioma y Pelvis (Pilar 4)",
    icon: <Activity className="text-terracotta" size={20} />, color: "bg-sage/10",
    tasks: [
      { id: 310, text: "Vacuna DTPa para ambos (Anticuerpos pasivos al feto)" },
      { id: 311, text: "Probióticos en dieta (Yogur/Kefir) para sembrar microbioma" },
      { id: 312, text: "Ejercicios en pelota de pilates para abrir pelvis" },
    ]
  },
  {
    id: "t3_maleta", trimester: 3, defaultExpanded: true,
    title: "Maleta de hospital",
    icon: <BriefcaseMedical className="text-terracotta/100" size={20} />, color: "bg-terracotta/10",
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
    icon: <MapPin className="text-terracotta" size={20} />, color: "bg-sage/10",
    tasks: [
      { id: 305, text: "Instalar silla de coche y aprender a usarla" },
      { id: 306, text: "Simulacro de ruta al hospital (medir tiempos)" },
      { id: 307, text: "Imprimir plan de parto" },
    ]
  }
];

function getWeekData(week: number, theme: "frutas"|"geek" = "frutas") {
  const data = [
      { week: 4, size: { frutas: "Semilla de amapola 🌑", geek: "Dado D20 en miniatura 🎲" }, len: "0.1 cm", weight: "1 g" },
      { week: 8, size: { frutas: "Frambuesa 🍓", geek: "Ficha de LEGO de 1x1 🧱" }, len: "1.6 cm", weight: "1 g" },
      { week: 12, size: { frutas: "Ciruela 🍑", geek: "Dado D6 estándar 🎲" }, len: "5.4 cm", weight: "14 g" },
      { week: 14, size: { frutas: "Limón 🍋", geek: "Goma de borrar ✏️" }, len: "8.7 cm", weight: "43 g" },
      { week: 16, size: { frutas: "Aguacate 🥑", geek: "Mouse de computadora 🖱️" }, len: "11.6 cm", weight: "100 g" },
      { week: 20, size: { frutas: "Plátano 🍌", geek: "Control de Nintendo Switch (Joy-Con) 🎮" }, len: "25.6 cm", weight: "300 g" },
      { week: 24, size: { frutas: "Mazorca de maíz 🌽", geek: "Sable de luz (mango) 🔦" }, len: "30.0 cm", weight: "600 g" },
      { week: 27, size: { frutas: "Vegetal nutritivo 🥦", geek: "iPad Mini 📱" }, len: "33.8 cm", weight: "2922 g" },
      { week: 30, size: { frutas: "Repollo 🥬", geek: "Casco de realidad virtual 🥽" }, len: "39.9 cm", weight: "1319 g" },
      { week: 34, size: { frutas: "Melón cantalupo 🍈", geek: "Consola Steam Deck 🕹️" }, len: "45.0 cm", weight: "2146 g" },
      { week: 40, size: { frutas: "Sandía pequeña 🍉", geek: "PlayStation 5 (en proporción) 🎮" }, len: "51.2 cm", weight: "3462 g" },
    ];
  let closest = data[0];
  for (let d of data) {
    if (d.week <= week) closest = d;
  }
  return {
    size: closest.size[theme] || closest.size.frutas,
    length: closest.len,
    weight: closest.weight,
    milestone: week <= 12 ? "Fin de la organogénesis crítica" : week <= 20 ? "Glándula tiroides funcional" : "Desarrollo de sentidos y corteza cerebral",
    momMission: week <= 12 ? "Tu cuerpo está formando órganos vitales. Prioriza descanso, ácido fólico y evita cargar peso." : week <= 24 ? "Tu bebé ya escucha tu voz. Mantén una dieta rica en hierro y calcio, y camina 20 min diarios." : "Practica ejercicios de Kegel, usa la almohada de embarazo para dormir y prepara tu plan de parto.",
    dadMission: week <= 12 ? "El cerebro fetal triplica su sinapsis. Prepara cenas ricas en Colina (huevos) y DHA (salmón)." : "Ten lista la logística de transporte, tanque de gasolina lleno y números de emergencia a mano."
  };
}

function GuiaPapaView({ showToast, profile, updateProfile, remoteMomStatus }: { showToast: any, profile: UserProfile, updateProfile: (u: Partial<UserProfile>) => void, remoteMomStatus?: any }) {
  const [week, setWeek] = useState(profile.week || 14);
  useEffect(() => {
    if (profile.week) setWeek(profile.week);
  }, [profile.week]);
  const weekData = getWeekData(week, profile.comparisonTheme || "frutas");

  // Checklist state
    const currentTrimester = React.useMemo(() => week <= 13 ? 1 : week <= 27 ? 2 : 3, [week]);
  
  const [taskStatus, setTaskStatus] = React.useState<Record<number, "completed" | "dismissed">>({});
  
  // Sync checklist progress with Firestore
  useEffect(() => {
    if (profile.pregnancyId) {
      const unsub = listenToChecklistProgress(profile.pregnancyId, (progress) => {
        const mapped: Record<number, "completed" | "dismissed"> = {};
        Object.entries(progress).forEach(([k, v]) => { if (v) mapped[Number(k)] = "completed"; });
        setTaskStatus(mapped);
      });
      return () => unsub();
    }
  }, [profile.pregnancyId]);
  const [expandedCats, setExpandedCats] = React.useState<Record<string, boolean>>({});

  
  const [customTasks, setCustomTasks] = React.useState<any[]>([]);
  const [isAddingTask, setIsAddingTask] = React.useState(false);
  const [newTaskText, setNewTaskText] = React.useState("");

  useEffect(() => {
    let unsub: (() => void) | null = null;
    if (profile.pregnancyId) {
      import('@/lib/firebase/pairing').then(({ listenToCustomTasks }) => {
        unsub = listenToCustomTasks(profile.pregnancyId!, (tasks) => setCustomTasks(tasks));
      });
    }
    return () => { if (unsub) unsub(); };
  }, [profile.pregnancyId]);

  const handleAddCustomTask = async () => {
    if (newTaskText.trim() && profile.pregnancyId) {
      const { addCustomTask } = await import('@/lib/firebase/pairing');
      await addCustomTask(profile.pregnancyId, newTaskText.trim(), currentTrimester);
      setNewTaskText("");
      setIsAddingTask(false);
    }
  };

  const handleToggleCustomTask = async (id: string, current: boolean) => {
    if (profile.pregnancyId) {
      const { toggleCustomTask } = await import('@/lib/firebase/pairing');
      await toggleCustomTask(profile.pregnancyId, id, !current);
    }
  };

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
      <div className="bg-white dark:bg-[#221d2d] rounded-3xl shadow-sm border border-stone-200/80 dark:border-white/[0.08] overflow-hidden transition-colors">
        {/* Selector */}
        <div className="bg-gradient-to-r from-sage to-sage/100 dark:from-[#1a1724] dark:to-[#1f1b2b] dark:border-b dark:border-white/[0.08] p-4 text-white dark:text-[#eae6e1] flex items-center justify-between transition-colors">
          <button aria-label="Semana anterior"
            onClick={() => setWeek(w => Math.max(1, w - 1))}
            className="p-2 hover:bg-white/20 dark:hover:bg-white/10 rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="text-center">
            <p className="text-sage/20 dark:text-sage/80/80 text-xs font-semibold tracking-tight mb-1">Semana de Gestación</p>
            <h2 className="text-3xl font-black">{week}</h2>
          </div>
          <button aria-label="Semana siguiente"
            onClick={() => setWeek(w => Math.min(40, w + 1))}
            className="p-2 hover:bg-white/20 dark:hover:bg-white/10 rounded-full transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Fetal Size Info */}
        <div className="p-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-stone-500 dark:text-[#a6a1b2] text-xs uppercase font-bold mb-1">Tamaño comparativo</p>
              <p className="text-xl font-bold text-stone-800 dark:text-[#eae6e1]">{weekData.size}</p>
            </div>
            <div className="bg-sage/10 dark:bg-[#1a1724] p-3 rounded-2xl">
              <Baby size={32} className="text-terracotta dark:text-sage" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-stone-50 dark:bg-[#2d273a] rounded-2xl p-3 border border-stone-200/80 dark:border-white/[0.06]">
              <p className="text-stone-500 dark:text-[#a6a1b2] text-xs font-bold mb-1">Longitud</p>
              <p className="font-bold text-stone-800 dark:text-[#eae6e1]">{weekData.length}</p>
            </div>
            <div className="bg-stone-50 dark:bg-[#2d273a] rounded-2xl p-3 border border-stone-200/80 dark:border-white/[0.06]">
              <p className="text-stone-500 dark:text-[#a6a1b2] text-xs font-bold mb-1">Peso est.</p>
              <p className="font-bold text-stone-800 dark:text-[#eae6e1]">{weekData.weight}</p>
            </div>
          </div>

          <div className="bg-terracotta/10/80 dark:bg-[#241b12] border border-terracotta/30/80 dark:border-terracotta/100/20 rounded-2xl p-4 flex gap-3">
            <Sparkles size={24} className="text-terracotta/100 shrink-0" />
            <div>
              <p className="text-terracotta dark:text-terracotta/80 text-xs font-bold uppercase mb-1">Hito de la semana</p>
              <p className="text-terracotta dark:text-[#eae6e1] text-sm font-medium">{weekData.milestone}</p>
            </div>
          </div>
        </div>

          <div className="border-t border-stone-100 dark:border-white/[0.06] pt-5 mt-5 pb-5">
            <PregnancyProgressBar week={week} />
          </div>
        {/* Misión */}
        <div className="bg-sage/10/70 dark:bg-[#1a1724] border-t border-sage/20 dark:border-sage/100/20 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={18} className="text-terracotta dark:text-sage" />
            <h3 className="font-bold text-sage dark:text-sage/80 text-sm">
              {profile.role === "papa" ? "Misión del Copiloto" : "Tu Misión"}
            </h3>
          </div>
          <p className="text-sage dark:text-[#eae6e1] text-sm leading-relaxed">
            {profile.role === "papa" ? weekData.dadMission : weekData.momMission}
          </p>
        </div>
      </div>

      {/* 1.5 Mom Status (New Pareja Module) */}
      <MomStatusCard profile={profile} remoteMomStatus={remoteMomStatus} />

      {/* 2. Checklist Module */}
      <div>
        <div className="flex justify-between items-end mb-3">
          <h2 className="text-xl font-bold text-stone-800 dark:text-[#eae6e1]">
            {profile.role === "papa" ? "Checklists del Copiloto" : "Mis Checklists"}
          </h2>
          <span className="text-terracotta dark:text-sage font-bold text-sm">{progressPercent}% completado</span>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-stone-200 dark:bg-[#2d273a] rounded-full h-2.5 mb-5 overflow-hidden">
          <div className="bg-terracotta h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
        </div>

        <div className="space-y-4">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-white dark:bg-[#221d2d] rounded-2xl shadow-sm border border-stone-200/80 dark:border-white/[0.08] overflow-hidden transition-colors">
              <button 
                onClick={() => toggleExpand(cat.id)}
                className="w-full p-4 flex items-center justify-between bg-white dark:bg-[#221d2d] hover:bg-stone-50 dark:hover:bg-[#2d273a]/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`${cat.color} dark:bg-opacity-20 p-2 rounded-xl`}>
                    {cat.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-800 dark:text-[#eae6e1] text-left">{cat.title}</h3>
                    <p className="text-xs text-stone-500 dark:text-[#a6a1b2] text-left">
                      {cat.tasks.filter(t => t.completed).length} de {cat.tasks.length} completadas
                    </p>
                  </div>
                </div>
                {cat.expanded ? <ChevronUp size={20} className="text-stone-500 dark:text-[#a6a1b2]" /> : <ChevronDown size={20} className="text-stone-500 dark:text-[#a6a1b2]" />}
              </button>
              
              {cat.expanded && (
                <div className="p-4 pt-0 border-t border-stone-100 dark:border-white/[0.06] bg-stone-50/50 dark:bg-[#181520]/60">
                  <div className="space-y-2 mt-3">
                    {cat.tasks.map(task => (
                      <button 
                        key={task.id} 
                        onClick={() => toggleTask(cat.id, task.id)}
                        aria-checked={task.completed}
                        role="switch"
                        className="w-full text-left flex items-start gap-3 p-3 bg-white dark:bg-[#2d273a] rounded-xl border border-stone-200/80 dark:border-white/[0.06] cursor-pointer hover:border-sage/30 dark:hover:border-sage transition-colors group focus:outline-none focus:ring-2 focus:ring-sage/100"
                      >
                        <div className={`mt-0.5 shrink-0 transition-colors ${task.completed ? "text-terracotta" : "text-stone-400 dark:text-[#a6a1b2] group-hover:text-sage"}`}>
                          {task.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                        </div>
                        <span className={`text-sm leading-snug ${task.completed ? "text-stone-400 dark:text-[#a6a1b2]/60 line-through" : "text-stone-700 dark:text-[#eae6e1]"}`}>
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
      
      const summary = events.map(e => `â€¢ ${e.date} (${e.time}): ${e.title} - ${e.doctor}`).join("\n");
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
            
            <div className="space-y-4">
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
function PandaIAView({ 
  showToast, 
  addEvent, 
  profile, 
  initialQuery,
  clearInitialQuery,
  setActiveTab
}: { 
  showToast: any, 
  addEvent: any, 
  profile: UserProfile, 
  initialQuery?: string,
  clearInitialQuery?: () => void,
  setActiveTab?: (tab: Tab) => void
}) {
  const getContextualChips = (week: number, role: "papa" | "mama") => {
    if (week <= 13) {
      return role === "papa" ? [
        "Alimentos con Colina y DHA para el cerebro",
        "¿Cómo aliviar las náuseas matutinas de mamá?",
        "Agendar ecografía semana 12 (Traslucencia Nucal)",
        "Tareas domésticas y químicos que debo asumir hoy"
      ] : [
        "¿Es normal tener tanta fatiga y sueño?",
        "Alimentos que debo evitar en el 1er trimestre",
        "¿Cuándo se empieza a notar la pancita?",
        "Agendar mi control prenatal de este mes"
      ];
    } else if (week <= 27) {
      return role === "papa" ? [
        "¿Qué evalúa la ecografía morfológica (semana 20)?",
        "¿Cuándo empezaremos a sentir las patadas?",
        "Agendar cita para ecografía 3D / 4D",
        "¿Cómo apoyar a mamá con los dolores de espalda?"
      ] : [
        "¿Cuándo se siente el hipo del bebé?",
        "Cuidados de la piel y suelo pélvico en 2º trimestre",
        "Alimentos recomendados para prevenir anemia",
        "¿Qué dudas llevar a la ecografía morfológica?"
      ];
    } else {
      return role === "papa" ? [
        "Checklist esencial para la maleta del hospital",
        "¿Cómo reconocer las contracciones de parto activo?",
        "Agendar monitoreo fetal preparto",
        "¿Cómo acompañar a mamá en el dolor de parto?"
      ] : [
        "Signos de alarma en el tercer trimestre",
        "Masaje perineal: ¿cómo y cuándo empezar?",
        "¿Cómo saber si rompí bolsa o es flujo?",
        "Revisar las cláusulas de nuestro Plan de Parto"
      ];
    }
  };

  const getUltrasoundItems = (week: number) => {
    if (week <= 13) {
      return [
        {
          title: "Ecografía 11-14: Traslucencia Nucal (TN)",
          desc: "Cribado genético del primer trimestre y hueso nasal",
          prompt: `¿Qué evalúa la Traslucencia Nucal (TN) y el Hueso Nasal en la ecografía de semana ${week} (semanas 11 a 14)?`
        },
        {
          title: `Medidas en Semana ${week}: LCR y DBP`,
          desc: "Longitud cráneo-raudal y diámetro biparietal del bebé",
          prompt: `¿Qué significan las medidas LCR (longitud cráneo-raudal) y DBP en mi ecografía de semana ${week}?`
        },
        {
          title: "Frecuencia Cardíaca Fetal y Vitalidad",
          desc: "Latidos por minuto y flujo en el primer trimestre",
          prompt: `¿Cuál es el rango normal de latidos cardíacos fetales en la semana ${week} y qué indica la vitalidad?`
        },
        {
          title: "Hematomas Subcoriónicos o Cuello Uterino",
          desc: "¿Qué significa si el informe menciona hematoma o sangrado?",
          prompt: `¿Qué significa un hematoma subcoriónico en el primer trimestre (semana ${week}) y qué cuidados se recomiendan?`
        }
      ];
    } else if (week <= 27) {
      return [
        {
          title: "Ecografía Morfológica (Semana 20-22)",
          desc: "Revisión anatómica completa de órganos, corazón y cerebro",
          prompt: `¿Qué evalúa la ecografía morfológica de alta resolución en esta etapa (semana ${week})?`
        },
        {
          title: "Medidas Fetales (DBP, LF, CA, CC)",
          desc: "Diámetros craneales, longitud femoral y perímetro abdominal",
          prompt: `¿Qué significan las siglas DBP, LF, CA y CC en el informe ecográfico de la semana ${week}?`
        },
        {
          title: "Percentiles de Crecimiento y Peso Fetal",
          desc: "¿Cómo interpretar si mi bebé está en percentil 25, 50 o 90?",
          prompt: `¿Qué significa el percentil fetal de crecimiento y peso estimado en la semana ${week}?`
        },
        {
          title: "Doppler de Arterias Uterinas y Placenta",
          desc: "¿Qué evalúa el Doppler uterino y la madurez placentaria?",
          prompt: `¿Qué evalúa el Doppler de arterias uterinas y qué significa el grado placentario en la semana ${week}?`
        }
      ];
    } else {
      return [
        {
          title: `Percentil de Peso en 3er Trimestre (Sem ${week})`,
          desc: "Monitoreo del peso estimado y curvas de crecimiento",
          prompt: `¿Cómo se evalúa el percentil de peso y crecimiento fetal en la semana ${week}?`
        },
        {
          title: "índice de Líquido Amniótico (ILA)",
          desc: "¿Qué significa un índice de líquido amniótico normal o alterado?",
          prompt: `¿Qué significa el índice de Líquido Amniótico (ILA) en la semana ${week} y cuáles son sus rangos normales?`
        },
        {
          title: "Doppler Fetal (Arteria Umbilical y Cerebral Media)",
          desc: "Oxigenación fetal y bienestar hemodinámico",
          prompt: `¿Qué evalúa el Doppler fetal de arteria umbilical y cerebral media en la semana ${week}?`
        },
        {
          title: "Posición Fetal y Grado Placentario",
          desc: "¿Está en posición cefálica? Grado II / III de placenta",
          prompt: `¿Qué significa la posición cefálica o podálica y el grado de madurez placentaria en la semana ${week}?`
        }
      ];
    }
  };

  const getWelcomeText = (week: number, role: "papa" | "mama", name?: string) => {
    return role === "papa"
      ? `¡Hola ${name || "Papá"}! 👨 Soy PandaIA, tu copiloto clínico en esta Semana ${week}.\n\nPregúntame sobre el **desarrollo del bebé en la semana ${week}**, neuro-nutrición prenatal (DHA, colina), qué preguntar en la próxima consulta médica, o pídeme que **agende una cita médica** para ustedes directamente en la Agenda.`
      : `¡Hola ${name || "Mamá"}! 👩 Soy PandaIA, tu espacio de orientación y tranquilidad en esta Semana ${week}.\n\nPuedes consultarme sobre los cambios y síntomas de la **semana ${week}**, nutrición o pedirme que **registre tus próximas citas médicas**.`;
  };

  const [messages, setMessages] = useState<any[]>(() => [
    { id: 1, sender: "ai", text: getWelcomeText(profile.week || 14, profile.role, profile.name) }
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [smartChips, setSmartChips] = useState<string[]>(() => getContextualChips(profile.week || 14, profile.role));
  const [isUltrasoundModalOpen, setIsUltrasoundModalOpen] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-scroll al recibir o enviar mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Actualizar chips cuando cambia el perfil o semana
  useEffect(() => {
    setSmartChips(getContextualChips(profile.week || 14, profile.role));
  }, [profile.week, profile.role]);

  // Sincronizar mensaje de bienvenida automáticamente con la semana y rol elegidos
  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].id === 1) {
        return [{ id: 1, sender: "ai", text: getWelcomeText(profile.week || 14, profile.role, profile.name) }];
      }
      return prev;
    });
  }, [profile.week, profile.role, profile.name]);

  // Si se envió una consulta desde otra pantalla (ej. modal de preparación)
  useEffect(() => {
    if (initialQuery) {
      setInputText(initialQuery);
      if (clearInitialQuery) clearInitialQuery();
      textareaRef.current?.focus();
    }
  }, [initialQuery, clearInitialQuery]);

  // Atajo de teclado: Escape para cerrar el decodificador de ecografías
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsUltrasoundModalOpen(false);
      }
    };
    if (isUltrasoundModalOpen) {
      window.addEventListener("keydown", handleEsc);
      return () => window.removeEventListener("keydown", handleEsc);
    }
  }, [isUltrasoundModalOpen]);

  const copyMessage = (id: number, text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      showToast?.("Mensaje copiado al portapapeles 📋", () => {});
      setTimeout(() => setCopiedId(null), 2000);
    } catch(e) {}
  };

  const clearChat = () => {
    setMessages([
      { id: Date.now(), sender: "ai", text: getWelcomeText(profile.week || 14, profile.role, profile.name) }
    ]);
    setSmartChips(getContextualChips(profile.week || 14, profile.role));
    showToast?.(`Conversación reiniciada para la Semana ${profile.week || 14} âœ¨`, () => {});
  };

  const handleUltrasoundSelect = (query: string) => {
    setIsUltrasoundModalOpen(false);
    handleSend(query);
  };

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
            trimester: (profile.week || 14) <= 13 ? 1 : (profile.week || 14) <= 27 ? 2 : 3,
            userRole: profile.role,
            userName: profile.name || "",
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
      showToast?.(`Cita agendada: ${data.appointment.title} 📅`, () => {});
      }

      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: "ai",
        text: data.reply || "He procesado tu consulta.",
        card: data.card || (data.appointment ? {
          title: data.appointment.title,
          desc: `Programada para el ${data.appointment.date} (${data.appointment.time || "Hora por definir"}). ¡Ya está en tu Agenda Médica!`
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

  // Renderizador de Markdown simple para formato clínico
  const renderFormattedMessage = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      const trimmed = line.trim();

      // Encabezados Markdown: ### o ##
      const isHeader = trimmed.startsWith("### ") || trimmed.startsWith("## ");
      if (isHeader) {
        const headerText = trimmed.replace(/^#{2,3}\s+/, "");
        return (
          <h4 key={idx} className="font-bold text-teal-950 dark:text-sage/80 text-sm mt-3 mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-terracotta inline-block"></span>
            <span>{headerText}</span>
          </h4>
        );
      }

      // Listas numeradas: 1. , 2. 
      const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
      if (numberedMatch) {
        const num = numberedMatch[1];
        const itemContent = numberedMatch[2];
        const parts = itemContent.split(/(\*\*.*?\*\*)/g);
        return (
          <div key={idx} className="flex items-start gap-2 my-1 pl-1">
            <span className="text-xs font-bold text-sage dark:text-sage/30 bg-sage/20/90 dark:bg-[#1a1724] px-1.5 py-0.5 rounded-md shrink-0 mt-0.5">{num}</span>
            <span className="flex-1 leading-relaxed text-stone-700 dark:text-[#eae6e1]/90">
              {parts.map((p, pIdx) => p.startsWith("**") && p.endsWith("**") ? <strong key={pIdx} className="font-bold text-stone-900 dark:text-[#eae6e1]">{p.slice(2, -2)}</strong> : p)}
            </span>
          </div>
        );
      }

      const isBullet = trimmed.startsWith("â€¢ ") || trimmed.startsWith("- ") || trimmed.startsWith("* ");
      const cleanLine = isBullet ? trimmed.replace(/^([â€¢\-*]\s+)/, "") : line;

      const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
      const content = parts.map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={pIdx} className="font-bold text-stone-900 dark:text-[#eae6e1]">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={idx} className="flex items-start gap-2 my-1 pl-1">
            <span className="text-terracotta dark:text-sage font-bold shrink-0 mt-0.5">â€¢</span>
            <span className="flex-1 leading-relaxed text-stone-700 dark:text-[#eae6e1]/90">{content}</span>
          </div>
        );
      }

      if (!trimmed) {
        return <div key={idx} className="h-1.5" />;
      }

      return (
        <p key={idx} className="leading-relaxed mb-1 last:mb-0">
          {content}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col flex-1 h-full w-full animate-in fade-in duration-300 bg-[#faf9f5] dark:bg-[#181520] relative overflow-hidden">
      
      {/* HEADER CON ESTADO Y ACCIONES */}
      <div className="px-4 py-2.5 border-b border-stone-200/80 dark:border-white/[0.08] bg-white/95 dark:bg-[#181520]/95 backdrop-blur-sm shadow-xs flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="bg-sage/20 dark:bg-[#1a1724] text-sage dark:text-sage/80 p-2 rounded-2xl relative shadow-xs">
            <Bot size={20} />
            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-[#181520] rounded-full animate-pulse"></span>
          </div>
          <div>
            <h2 className="font-bold text-stone-900 dark:text-[#eae6e1] leading-tight flex items-center gap-1.5 text-sm">
              <span>PandaIA</span>
              <span className="text-xs font-bold text-sage dark:text-sage/80 bg-sage/10 dark:bg-[#1a1724] border border-sage/30/80 dark:border-sage/100/25 px-2 py-0.5 rounded-full tracking-tight">
                Copiloto
              </span>
            </h2>
            <p className="text-xs font-semibold text-sage dark:text-sage/80 flex items-center gap-1.5">
              <span>{profile.role === "papa" ? "👨" : "👩"}</span>
              <span>· Sem {profile.week}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button 
            type="button"
            onClick={clearChat}
            className="p-2 text-stone-500 dark:text-[#a6a1b2] hover:text-stone-800 dark:hover:text-[#eae6e1] hover:bg-stone-100 dark:hover:bg-[#2d273a] rounded-xl transition-all active:scale-95"
            title="Reiniciar conversación con la semana actual"
            aria-label="Reiniciar conversación"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* CHAT AREA CON AUTO-SCROLL */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 flex flex-col no-scrollbar">
        {messages.map(msg => (
          <div 
            key={msg.id} 
            className={`flex items-end gap-2 max-w-[88%] animate-in fade-in slide-in-from-bottom-2 duration-200 ${
              msg.sender === 'user' ? 'self-end flex-row-reverse' : ''
            }`}
          >
            {msg.sender === 'ai' && (
              <div className="bg-sage/20 dark:bg-[#1a1724] text-sage dark:text-sage/80 p-1.5 rounded-xl shrink-0 mb-1 shadow-xs">
                <Bot size={16} />
              </div>
            )}
            
            <div className={`flex flex-col gap-2 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`p-4 rounded-3xl shadow-xs text-sm relative group ${
                msg.sender === 'user' 
                  ? 'bg-terracotta text-white rounded-br-none' 
                  : 'bg-white dark:bg-[#221d2d] border border-stone-100 dark:border-white/[0.08] text-stone-800 dark:text-[#eae6e1] rounded-bl-none shadow-xs'
              }`}>
                {msg.sender === 'ai' ? renderFormattedMessage(msg.text) : <p className="leading-relaxed">{msg.text}</p>}

                {/* Botón de Copiar para Mensajes del Asistente */}
                {msg.sender === 'ai' && (
                  <div className="pt-2 mt-2 border-t border-stone-100 dark:border-white/[0.06] flex justify-end">
                    <button
                      type="button"
                      onClick={() => copyMessage(msg.id, msg.text)}
                      className="text-xs font-bold text-stone-400 dark:text-[#a6a1b2] hover:text-sage dark:hover:text-sage/80 flex items-center gap-1 transition-colors p-1"
                      title="Copiar respuesta"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check size={12} className="text-terracotta dark:text-sage" />
                          <span className="text-sage dark:text-sage/80">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
              
              {/* Tarjeta de Acción / Cita Agendada */}
              {msg.card && (
                <div className="bg-gradient-to-br from-sage/10 via-emerald-50/40 to-white dark:from-[#221d2d] dark:to-[#1a1724] border border-sage/30 dark:border-sage/100/25 shadow-xs rounded-2xl p-4 w-full max-w-sm animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-sage dark:text-sage/80 font-bold text-xs tracking-tight">
                      <BriefcaseMedical size={15} className="text-sage dark:text-sage" />
                      <span>Cita Médica Agendada</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/90 dark:bg-[#1a1724] px-2 py-0.5 rounded-full">
                      En Agenda
                    </span>
                  </div>
                  <h5 className="font-bold text-stone-900 dark:text-[#eae6e1] text-sm">{msg.card.title}</h5>
                  <p className="text-xs text-stone-600 dark:text-[#a6a1b2] mt-1 leading-relaxed">
                    {msg.card.desc}
                  </p>
                  
                  {setActiveTab && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("agenda")}
                      className="mt-3 w-full py-2.5 bg-terracotta hover:bg-terracotta-hover active:scale-95 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Calendar size={13} />
                      <span>Ver en Agenda Médica â†’</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-end gap-2 max-w-[85%] animate-in fade-in duration-150">
            <div className="bg-sage/20 dark:bg-[#1a1724] text-sage dark:text-sage/80 p-1.5 rounded-xl shrink-0 mb-1 shadow-xs">
              <Bot size={16} />
            </div>
            <div className="bg-white dark:bg-[#221d2d] px-4 py-3 rounded-2xl rounded-bl-none shadow-xs border border-stone-100 dark:border-white/[0.08] flex gap-2 items-center">
              <div className="flex gap-1 items-center">
                <div className="w-2 h-2 bg-terracotta rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-terracotta rounded-full animate-pulse" style={{ animationDelay: "0.15s" }}></div>
                <div className="w-2 h-2 bg-terracotta rounded-full animate-pulse" style={{ animationDelay: "0.3s" }}></div>
              </div>
              <span className="text-xs text-stone-400 dark:text-[#a6a1b2] font-medium">PandaIA está respondiendo...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* INPUT AREA CON SMART CHIPS CONTEXTUALES */}
      <div className="bg-white dark:bg-[#221d2d] border-t border-stone-200 dark:border-white/[0.08] shrink-0">
        {/* Smart Chips Dinámicos por Trimestre */}
        <div className="flex overflow-x-auto gap-2 p-2.5 no-scrollbar border-b border-stone-100 dark:border-white/[0.06]">
          {smartChips.map((chip, idx) => (
            <button 
              key={idx}
              type="button"
              onClick={() => handleSend(chip)}
              className="whitespace-nowrap bg-sage/10/80 dark:bg-[#2d273a] border border-sage/30/70 dark:border-white/10 text-sage dark:text-sage/80 text-xs font-semibold px-3.5 py-1.5 rounded-full hover:bg-sage/20 dark:hover:bg-[#383147] active:scale-95 transition-all shadow-2xs"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Text Input Ergonómico */}
        <div className="p-2.5">
          <div className="flex items-end gap-2 bg-stone-50 dark:bg-[#2d273a] border border-stone-200 dark:border-white/10 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-sage/100 focus-within:border-transparent transition-all shadow-xs">
            <button 
              type="button"
              aria-label="Cargar consulta sobre ecografías"
              onClick={() => setIsUltrasoundModalOpen(true)}
              className="p-2 text-stone-400 dark:text-[#a6a1b2] hover:text-sage dark:hover:text-sage/80 transition-colors shrink-0 rounded-xl hover:bg-white dark:hover:bg-[#221d2d]"
              title="Preguntas frecuentes sobre ecografías"
            >
              <Paperclip size={18} />
            </button>
            <textarea 
              ref={textareaRef}
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
              placeholder="Pregúntale a PandaIA sobre síntomas, nutrición o citas..." 
              className="flex-1 bg-transparent border-none focus:outline-none text-base sm:text-sm py-2 resize-none max-h-32 min-h-[40px] text-stone-800 dark:text-[#eae6e1] placeholder-gray-400 dark:placeholder-[#a6a1b2]/60 overflow-y-auto no-scrollbar"
            />
            <button 
              type="button"
              aria-label="Enviar mensaje a PandaIA"
              onClick={() => handleSend(inputText)}
              disabled={!inputText.trim() || isTyping}
              className={`p-2.5 rounded-xl transition-all shrink-0 active:scale-90 ${
                inputText.trim() && !isTyping 
                  ? "bg-terracotta text-white hover:bg-terracotta-hover shadow-xs" 
                  : "bg-stone-200 dark:bg-[#2a2e37] text-stone-400 dark:text-[#a6a1b2]/60 cursor-not-allowed"
              }`}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL / SHEET DECODIFICADOR DE ECOGRAFíAS */}
      {isUltrasoundModalOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="ultrasound-modal-title"
          onClick={(e) => { if (e.target === e.currentTarget) setIsUltrasoundModalOpen(false); }}
          className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white dark:bg-[#221d2d] rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4 duration-200 border border-stone-100 dark:border-white/[0.08]">
            <div className="bg-gradient-to-r from-sage to-sage p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <div className="bg-white/10 p-2 rounded-xl">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 id="ultrasound-modal-title" className="font-bold text-sm leading-tight">
                    Decodificador de Ecografía
                  </h3>
                  <p className="text-xs text-sage/20">
                    Preguntas rápidas para interpretar tu ecografía
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsUltrasoundModalOpen(false)}
                className="text-sage/20 hover:text-white p-1 rounded-lg transition-colors"
                aria-label="Cerrar ventana de ecografías"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-2 max-h-[70vh] overflow-y-auto">
              <p className="text-xs text-stone-500 dark:text-[#a6a1b2] mb-3">
                Selecciona una consulta frecuente para que PandaIA te explique los valores clínicos con calma:
              </p>

              {getUltrasoundItems(profile.week || 14).map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleUltrasoundSelect(item.prompt)}
                  className="w-full text-left p-3.5 rounded-2xl border border-stone-100 dark:border-white/[0.08] bg-stone-50/70 dark:bg-[#2d273a]/60 hover:bg-sage/10/60 dark:hover:bg-[#2d273a] hover:border-sage/30 dark:hover:border-sage/100/30 transition-all flex items-start justify-between gap-3 group active:scale-[0.99]"
                >
                  <div className="flex-1">
                    <p className="text-xs font-bold text-stone-900 dark:text-[#eae6e1] group-hover:text-sage dark:group-hover:text-sage/80 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-terracotta shrink-0"></span>
                      <span>{item.title}</span>
                    </p>
                    <p className="text-xs text-stone-500 dark:text-[#a6a1b2] mt-0.5 leading-snug">
                      {item.desc}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-stone-400 dark:text-[#a6a1b2] group-hover:text-terracotta dark:group-hover:text-sage/80 shrink-0 mt-1" />
                </button>
              ))}
            </div>

            <div className="p-3 bg-stone-50 dark:bg-[#221d2d] border-t border-stone-100 dark:border-white/[0.08] flex justify-end">
              <button
                type="button"
                onClick={() => setIsUltrasoundModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-[#a6a1b2] hover:text-stone-800 dark:hover:text-[#eae6e1] transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

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
      icon: <Utensils className="text-terracotta/100" size={20} />,
      color: "bg-terracotta/10 dark:bg-[#241b12]",
      content: (
        <ul className="text-sm text-stone-600 dark:text-[#a6a1b2] space-y-2 mt-2 list-disc pl-5">
          <li><strong className="text-stone-900 dark:text-[#eae6e1]">Estómago con colchón:</strong> Coman galletas saladas o tostadas antes de levantarse de la cama.</li>
          <li><strong className="text-stone-900 dark:text-[#eae6e1]">Hidratación táctica:</strong> Beber agua muy fría en pequeños tragos. Rodajas de limón o jengibre fresco son magia pura.</li>
          <li><strong className="text-stone-900 dark:text-[#eae6e1]">Vitamina B6:</strong> Consulten con su médico materno-fetal si pueden recetar un suplemento de B6.</li>
          <li><strong className="text-stone-900 dark:text-[#eae6e1]">Oler alcohol:</strong> Una toallita de alcohol isopropílico bajo la nariz ayuda a cortar el mareo agudo al instante.</li>
        </ul>
      )
    },
    {
      id: "acidez",
      title: "Acidez y Reflujo",
      icon: <Heart className="text-terracotta/100" size={20} />,
      color: "bg-terracotta/10 dark:bg-[#251518]",
      content: (
        <ul className="text-sm text-stone-600 dark:text-[#a6a1b2] space-y-2 mt-2 list-disc pl-5">
          <li><strong className="text-stone-900 dark:text-[#eae6e1]">Poco pero seguido:</strong> 5 o 6 comidas pequeñas al día en lugar de 3 grandes para no sobrecargar el esfínter.</li>
          <li><strong className="text-stone-900 dark:text-[#eae6e1]">Física básica:</strong> Esperar al menos 2 horas después de cenar para ir a la cama (gravedad a su favor).</li>
          <li><strong className="text-stone-900 dark:text-[#eae6e1]">Evitar disparadores:</strong> Cítricos, tomate, chocolate, y comidas muy grasas o picantes.</li>
          <li><strong className="text-stone-900 dark:text-[#eae6e1]">Leche fría o almendras:</strong> Neutralizan la acidez al instante de forma natural.</li>
        </ul>
      )
    },
    {
      id: "ciatica",
      title: "Dolor de Espalda (Ciática)",
      icon: <Activity className="text-blue-500" size={20} />,
      color: "bg-blue-50 dark:bg-[#1a2230]",
      content: (
        <ul className="text-sm text-stone-600 dark:text-[#a6a1b2] space-y-2 mt-2 list-disc pl-5">
          <li><strong className="text-stone-900 dark:text-[#eae6e1]">Compresas tibias:</strong> Aplicar calor en la espalda baja por 15-20 minutos (tú puedes encargarte de prepararlas).</li>
          <li><strong className="text-stone-900 dark:text-[#eae6e1]">Postura al dormir:</strong> Siempre del lado izquierdo, con la almohada de embarazo entre las rodillas.</li>
          <li><strong className="text-stone-900 dark:text-[#eae6e1]">Estiramientos suaves:</strong> Ayúdala con ejercicios de yoga prenatal (postura del gato-vaca) para aliviar la presión del útero.</li>
        </ul>
      )
    },
    {
      id: "alarma",
      title: "🚨 Señales de Alarma Médica",
      icon: <AlertTriangle className="text-rose-600 dark:text-terracotta" size={20} />,
      color: "bg-terracotta/10 dark:bg-[#251518]",
      content: (
        <ul className="text-sm text-rose-800 dark:text-rose-300 font-medium space-y-2 mt-2 list-disc pl-5">
          <li><strong className="text-rose-950 dark:text-rose-200">Sangrado vaginal</strong> (cualquier cantidad, contactar al médico).</li>
          <li><strong className="text-rose-950 dark:text-rose-200">Dolor abdominal intenso</strong> o cólicos persistentes que no ceden al descansar.</li>
          <li><strong className="text-rose-950 dark:text-rose-200">Dolor de cabeza severo</strong> o visión borrosa (riesgo de preeclampsia).</li>
          <li><strong className="text-rose-950 dark:text-rose-200">Hinchazón repentina extrema</strong> en cara, manos o pies.</li>
          <li><strong className="text-rose-950 dark:text-rose-200">Disminución de movimientos fetales</strong> (si sienten menos de 10 en 2 horas después de la semana 24).</li>
        </ul>
      )
    }
  ];

  return (
    <div className="flex flex-col py-2 animate-in fade-in duration-300 h-full w-full">
      

      {/* Banner de Emergencia Rápida */}
      <div className="bg-gradient-to-r from-terracotta/10 to-red-50 dark:from-[#251518] dark:to-[#201316] border border-rose-200 dark:border-terracotta/100/25 rounded-2xl p-4 mb-4 flex items-center justify-between gap-3 shadow-xs">
        <div>
          <h4 className="font-bold text-rose-800 dark:text-rose-300 text-sm flex items-center gap-1.5">
            <AlertTriangle size={16} className="text-rose-600 shrink-0" /> ¿Emergencia o Alarma?
          </h4>
          <p className="text-xs text-rose-600 dark:text-terracotta mt-0.5">Acceso rápido ante signos de alerta</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <a
            href="tel:911"
            className="bg-rose-600 hover:bg-terracotta active:scale-95 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-all"
            aria-label="Llamar a Urgencias médicas"
          >
            📞 Llamar
          </a>
          <a
            href="https://maps.google.com/?q=hospital+maternidad"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white dark:bg-[#221d2d] hover:bg-terracotta/20/50 dark:hover:bg-[#2d273a] active:scale-95 border border-rose-200 dark:border-terracotta/100/25 text-terracotta dark:text-rose-300 font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-all"
            aria-label="Ver ruta al hospital más cercano"
          >
            🏥 Hospital
          </a>
        </div>
      </div>

      <div className="space-y-3 overflow-y-auto pb-8">
        {symptoms.map(sym => (
          <div key={sym.id} className="bg-white dark:bg-[#221d2d] rounded-2xl shadow-xs border border-stone-200/80 dark:border-white/[0.08] overflow-hidden">
            <button 
              type="button"
              onClick={() => setExpanded(expanded === sym.id ? null : sym.id)}
              className="w-full p-4 flex items-center justify-between text-left transition-colors hover:bg-stone-50 dark:hover:bg-[#2d273a]/50"
            >
              <div className="flex items-center gap-3">
                <div className={`${sym.color} p-2 rounded-full`}>{sym.icon}</div>
                <span className="font-bold text-stone-800 dark:text-[#eae6e1]">{sym.title}</span>
              </div>
              {expanded === sym.id ? <ChevronUp size={20} className="text-stone-400 dark:text-[#a6a1b2]" /> : <ChevronDown size={20} className="text-stone-400 dark:text-[#a6a1b2]" />}
            </button>
            {expanded === sym.id && (
              <div className="p-4 pt-0 bg-stone-50 dark:bg-[#2d273a]/30 border-t border-stone-100 dark:border-white/[0.06] animate-in slide-in-from-top-2">
                {sym.content}
                {sym.id === "alarma" && (
                  <div className="mt-4 pt-3 border-t border-rose-200 dark:border-terracotta/100/30 flex gap-2">
                    <a
                      href="tel:911"
                      className="flex-1 bg-rose-600 hover:bg-terracotta active:scale-95 text-white font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all text-center"
                    >
                      📞 Llamar al Obstetra / 911
                    </a>
                    <a
                      href="https://maps.google.com/?q=hospital+maternidad"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-white dark:bg-[#221d2d] hover:bg-terracotta/10 dark:hover:bg-[#2d273a] active:scale-95 border border-rose-300 dark:border-terracotta/100/30 text-rose-800 dark:text-rose-300 font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all text-center"
                    >
                      🏥 Hospital
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


function DiarioView({ profile, onClose }: { profile: UserProfile, onClose: () => void }) {
  const [entries, setEntries] = React.useState<any[]>([]);
  const [newEntry, setNewEntry] = React.useState("");

  useEffect(() => {
    let unsub: (() => void) | null = null;
    if (profile.pregnancyId) {
      import('@/lib/firebase/pairing').then(({ listenToJournal }) => {
        unsub = listenToJournal(profile.pregnancyId!, (data) => setEntries(data));
      });
    }
    return () => { if (unsub) unsub(); };
  }, [profile.pregnancyId]);

  const handlePost = async () => {
    if (newEntry.trim() && profile.pregnancyId) {
      const { addJournalEntry } = await import('@/lib/firebase/pairing');
      await addJournalEntry(profile.pregnancyId, profile.role, profile.name, newEntry.trim());
      setNewEntry("");
    }
  };

  return (
    <div className="w-full">
      <div className="p-4 max-w-lg mx-auto">
        <div className="bg-white dark:bg-[#181a20] rounded-2xl p-4 shadow-sm border border-stone-200 dark:border-white/[0.05] mb-6">
          <textarea 
            value={newEntry}
            onChange={e => setNewEntry(e.target.value)}
            placeholder="Escribe un recuerdo, un pensamiento o un mensaje para el bebé..."
            className="w-full bg-transparent resize-none h-24 text-stone-800 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:outline-none"
          />
          <div className="flex justify-between items-center mt-2 border-t border-stone-100 dark:border-white/5 pt-3">
            <span className="text-xs font-bold text-stone-400 dark:text-stone-500">Publicando como {profile.name}</span>
            <button 
              onClick={handlePost}
              disabled={!newEntry.trim()}
              className="bg-terracotta text-white px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <Send size={16} /> Guardar
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {entries.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-sage/20 rounded-full flex items-center justify-center mx-auto mb-4 text-sage">
                <FileText size={24} />
              </div>
              <h3 className="font-bold text-stone-800 dark:text-white mb-1">El diario está vacío</h3>
              <p className="text-sm text-stone-500 dark:text-stone-400">Escribe el primer recuerdo de este hermoso viaje.</p>
            </div>
          ) : (
            entries.map(entry => (
              <div key={entry.id} className="bg-white dark:bg-[#181a20] rounded-2xl p-4 shadow-sm border border-stone-100 dark:border-white/[0.05]">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${entry.authorRole === 'mama' ? 'bg-terracotta/20 text-terracotta' : 'bg-sage/20 text-sage'}`}>
                    {entry.authorName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-800 dark:text-white">{entry.authorName}</p>
                    <p className="text-[10px] text-stone-400 dark:text-stone-500">{entry.createdAt?.toDate ? entry.createdAt.toDate().toLocaleString() : 'Justo ahora'}</p>
                  </div>
                </div>
                <p className="text-stone-600 dark:text-stone-300 text-sm whitespace-pre-wrap">{entry.text}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


function MaletaView({ profile, onClose }: { profile: UserProfile, onClose: () => void }) {
  const [bag, setBag] = React.useState<Record<string, boolean>>({});

  useEffect(() => {
    let unsub: (() => void) | null = null;
    if (profile.pregnancyId) {
      import('@/lib/firebase/pairing').then(({ listenToGoBag }) => {
        unsub = listenToGoBag(profile.pregnancyId!, (data) => setBag(data));
      });
    }
    return () => { if (unsub) unsub(); };
  }, [profile.pregnancyId]);

  const toggleItem = async (id: string, checked: boolean) => {
    setBag(prev => ({ ...prev, [id]: !checked })); // optimistic
    if (profile.pregnancyId) {
      const { toggleGoBagItem } = await import('@/lib/firebase/pairing');
      await toggleGoBagItem(profile.pregnancyId, id, !checked);
    }
  };

  const items = {
    mama: [
      { id: 'm1', label: 'Documentos médicos y de identidad' },
      { id: 'm2', label: 'Ropa cómoda y batas (abiertas adelante)' },
      { id: 'm3', label: 'Pantuflas y calcetines gruesos' },
      { id: 'm4', label: 'Artículos de aseo personal' },
      { id: 'm5', label: 'Ropa interior desechable o grande' },
      { id: 'm6', label: 'Ropa para salir del hospital' }
    ],
    bebe: [
      { id: 'b1', label: 'Pañales de recién nacido' },
      { id: 'b2', label: 'Toallitas húmedas' },
      { id: 'b3', label: 'Bodys y pijamas (3-4 mudas)' },
      { id: 'b4', label: 'Manta de algodón o lana' },
      { id: 'b5', label: 'Gorrito y calcetines' },
      { id: 'b6', label: 'Asiento de auto (instalado)' }
    ],
    papa: [
      { id: 'p1', label: 'Snacks y botellas de agua' },
      { id: 'p2', label: 'Cargador de celular (cable largo)' },
      { id: 'p3', label: 'Ropa de cambio cómoda' },
      { id: 'p4', label: 'Artículos de aseo personal' },
      { id: 'p5', label: 'Cámara o espacio en celular' }
    ]
  };

  return (
    <div className="w-full">
      <div className="p-4 max-w-lg mx-auto space-y-6 pb-20">
        
        {Object.entries(items).map(([category, list]) => (
          <div key={category}>
            <h3 className="font-black text-sm text-stone-400 uppercase tracking-wider mb-3">
              {category === 'mama' ? 'Para Mamá' : category === 'bebe' ? 'Para el Bebé' : 'Para Papá / Copiloto'}
            </h3>
            <div className="bg-white dark:bg-[#181a20] rounded-2xl shadow-sm border border-stone-200 dark:border-white/[0.05] overflow-hidden">
              {list.map((item, i) => (
                <div 
                  key={item.id} 
                  onClick={() => toggleItem(item.id, bag[item.id] || false)}
                  className={`flex items-center gap-3 p-4 cursor-pointer transition-colors hover:bg-stone-50 dark:hover:bg-white/[0.02] ${i !== list.length - 1 ? 'border-b border-stone-100 dark:border-white/5' : ''}`}
                >
                  <div className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${bag[item.id] ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stone-300 dark:border-stone-600'}`}>
                    {bag[item.id] && <Check size={14} strokeWidth={3} />}
                  </div>
                  <span className={`text-sm font-medium transition-all ${bag[item.id] ? 'text-stone-400 dark:text-stone-500 line-through' : 'text-stone-700 dark:text-stone-200'}`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}



function LecturasView({ week, onClose, showToast }: { week: number, onClose: () => void, showToast: any }) {
  const currentTrimester = week <= 13 ? 1 : week <= 27 ? 2 : 3;
  const [selectedTri, setSelectedTri] = useState(currentTrimester);

  const articles = {
    1: [
      {
        title: "Sobreviviendo a las Náuseas Matutinas",
        desc: "Estrategias de neuro-nutrición e hidratación táctica para las primeras semanas.",
        readTime: "4 min",
        type: "Artículo",
        url: "#"
      },
      {
        title: "El Ácido Fólico y el Tubo Neural",
        desc: "Por qué este suplemento es el superhéroe indiscutible del primer trimestre.",
        readTime: "3 min",
        type: "Ciencia",
        url: "#"
      },
      {
        title: "Comunicando la Noticia",
        desc: "¿Cuándo y cómo decirle a la familia, amigos y al trabajo? Tiempos recomendados.",
        readTime: "5 min",
        type: "Guía",
        url: "#"
      }
    ],
    2: [
      {
        title: "Desarrollo Cerebral y Omega-3 (DHA)",
        desc: "La importancia del pescado bajo en mercurio en el segundo trimestre para su corteza frontal.",
        readTime: "6 min",
        type: "Nutrición",
        url: "#"
      },
      {
        title: "Conectando con tu Bebé",
        desc: "El oído fetal se desarrolla: cómo la voz de papá y mamá estimulan su cerebro en esta etapa.",
        readTime: "4 min",
        type: "Artículo",
        url: "#"
      },
      {
        title: "Preparando el 'Nido'",
        desc: "Toxinas a evitar al pintar el cuarto o armar muebles nuevos.",
        readTime: "5 min",
        type: "Guía Ambiental",
        url: "#"
      }
    ],
    3: [
      {
        title: "Entendiendo las Contracciones",
        desc: "Braxton Hicks vs. Trabajo de Parto real. Qué es y cómo aplicar la regla del 5-1-1.",
        readTime: "4 min",
        type: "Guía Médica",
        url: "#"
      },
      {
        title: "Masaje Perineal y Preparación",
        desc: "Técnicas basadas en evidencia para reducir el riesgo de desgarros en el parto vaginal.",
        readTime: "7 min",
        type: "Artículo",
        url: "#"
      },
      {
        title: "El Cuarto Trimestre (Posparto)",
        desc: "Salud mental materna, privación de sueño y cómo el copiloto debe tomar el mando de la casa.",
        readTime: "8 min",
        type: "Lectura Esencial",
        url: "#"
      }
    ]
  };

  return (
    <div className="w-full flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="px-1 py-3 flex gap-2 overflow-x-auto hide-scrollbar shrink-0 mb-2">
        {[1, 2, 3].map(t => (
          <button 
            key={t}
            onClick={() => setSelectedTri(t)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${selectedTri === t ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-md' : 'bg-stone-200 dark:bg-[#2d273a] text-stone-600 dark:text-[#a6a1b2]'}`}
          >
            Trimestre ${t}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-4 pb-12">
        {articles[selectedTri as 1|2|3].map((art, i) => (
          <div key={i} onClick={() => alert("Artículo completo próximamente...")} className="bg-white dark:bg-[#221d2d] border border-stone-200 dark:border-white/[0.06] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow group cursor-pointer">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] uppercase tracking-wider font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-full">
                {art.type}
              </span>
              <span className="text-xs font-medium text-stone-400 dark:text-[#a6a1b2] flex items-center gap-1">
                <Clock size={12} /> {art.readTime}
              </span>
            </div>
            <h3 className="text-base font-bold text-stone-800 dark:text-[#eae6e1] leading-tight mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {art.title}
            </h3>
            <p className="text-sm text-stone-600 dark:text-[#a6a1b2] leading-relaxed">
              {art.desc}
            </p>
            <div className="mt-4 flex items-center text-xs font-bold text-blue-500 dark:text-blue-400 gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
              Leer artículo <ExternalLink size={14} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HerramientasView({ showToast, profile }: { showToast: any, profile?: UserProfile }) {
  const [activeTool, setActiveTool] = useState<any>(null);

  const tools = [
    { id: "sos", label: "SOS Síntomas", icon: <HeartPulse size={24} />, desc: "Síntomas de alarma", color: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400", border: "border-rose-100 dark:border-rose-500/20" },
    { id: "contracciones", label: "Contracciones", icon: <Activity size={24} />, desc: "Contador 5-1-1", color: "bg-terracotta/10 text-terracotta", border: "border-terracotta/20" },
    { id: "patadas", label: "Patadas", icon: <Baby size={24} />, desc: "Monitor Cardiff", color: "bg-sage/10 text-sage", border: "border-sage/20" },
    { id: "diario", label: "Diario", icon: <FileText size={24} />, desc: "Memorias del bebé", color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400", border: "border-indigo-100 dark:border-indigo-500/20" },
    { id: "maleta", label: "Maleta", icon: <Package size={24} />, desc: "Hospital Go-Bag", color: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400", border: "border-amber-100 dark:border-amber-500/20" },
    { id: "nombres", label: "Nombres", icon: <Users size={24} />, desc: "Votador en pareja", color: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400", border: "border-sky-100 dark:border-sky-500/20" },
    { id: "parto", label: "Plan de Parto", icon: <ClipboardList size={24} />, desc: "PDF Clínico", color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400", border: "border-emerald-100 dark:border-emerald-500/20" },
      { id: "lecturas", label: "Lecturas", icon: <BookOpen size={24} />, desc: "Por trimestre", color: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400", border: "border-blue-100 dark:border-blue-500/20" },
  ];

  if (activeTool) {
    const tool = tools.find(t => t.id === activeTool);
    return (
      <div className="flex flex-col h-full w-full bg-stone-50 dark:bg-[#120f18] animate-in fade-in zoom-in-95 duration-200">
        <div className="sticky top-0 z-20 bg-white/80 dark:bg-[#181520]/80 backdrop-blur-md px-4 py-3 flex items-center gap-3 border-b border-stone-200 dark:border-white/5">
          <button onClick={() => setActiveTool(null)} className="w-10 h-10 rounded-full bg-stone-100 dark:bg-white/5 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-white/10 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="font-bold text-lg text-stone-800 dark:text-white leading-tight">{tool?.label}</h2>
            <p className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-[#a6a1b2] font-bold">{tool?.desc}</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {activeTool === 'diario' && profile && <DiarioView profile={profile} onClose={() => setActiveTool(null)} />}
          {activeTool === 'maleta' && profile && <MaletaView profile={profile} onClose={() => setActiveTool(null)} />}
          {activeTool === 'sos' && <SOSSintomas />}
          {activeTool === 'patadas' && <ContadorPatadas showToast={showToast} />}
          {activeTool === 'contracciones' && <ContadorContracciones showToast={showToast} />}
          {activeTool === 'nombres' && <VotadorNombres showToast={showToast} />}
          {activeTool === 'parto' && <PlanParto profile={profile} showToast={showToast} />}
          {activeTool === 'lecturas' && profile && <LecturasView week={profile.week} onClose={() => setActiveTool(null)} showToast={showToast} />}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-stone-50 dark:bg-[#120f18] p-5 overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="mb-6 mt-4">
        <h1 className="text-2xl font-black text-stone-800 dark:text-white tracking-tight leading-none mb-1">
          Herramientas
        </h1>
        <p className="text-sm text-stone-500 dark:text-[#a6a1b2]">Todo lo que necesitas a un toque de distancia.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 pb-20">
        {/* SOS takes full width */}
        <button 
          onClick={() => setActiveTool('sos')}
          className="col-span-2 bg-rose-500 text-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-rose-600/50 hover:bg-rose-600 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <HeartPulse size={28} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-lg leading-tight">SOS Síntomas</h3>
              <p className="text-rose-100 text-xs">Cuándo ir a urgencias</p>
            </div>
          </div>
          <ChevronRight size={24} className="opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </button>

        {/* Other tools */}
        {tools.filter(t => t.id !== 'sos').map(tool => (
          <button 
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={`bg-white dark:bg-[#181520] rounded-2xl p-4 flex flex-col gap-3 shadow-sm border border-stone-200/60 dark:border-white/[0.04] hover:border-stone-300 dark:hover:border-white/10 hover:shadow-md transition-all text-left group`}
          >
            <div className={`w-12 h-12 rounded-2xl ${tool.color} border ${tool.border} flex items-center justify-center group-hover:scale-105 transition-transform`}>
              {tool.icon}
            </div>
            <div>
              <h3 className="font-bold text-stone-800 dark:text-white text-sm">{tool.label}</h3>
              <p className="text-[11px] text-stone-500 dark:text-[#a6a1b2] font-medium leading-tight mt-0.5">{tool.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}


interface KickRecord {
  id: number;
  timeStr: string;
  intervalSecs: number | null;
}

interface KickSessionItem {
  id: number;
  timestamp: number;
  dateFormatted: string;
  count: number;
  durationSeconds: number;
  durationFormatted: string;
  note?: string;
}

function ContadorPatadas({ showToast }: { showToast: any }) {
  const [count, setCount] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [kicks, setKicks] = useState<KickRecord[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [completedSession, setCompletedSession] = useState<KickSessionItem | null>(null);
  const [selectedNote, setSelectedNote] = useState<string>("");

  // Historial con persistencia real en localStorage
  const [sessions, setSessions] = useState<KickSessionItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("pandajr_kick_sessions");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    // Sesiones de referencia clínica inicial
    return [
      {
        id: 1,
        timestamp: Date.now() - 86400000,
        dateFormatted: "Ayer, 08:30 PM",
        count: 10,
        durationSeconds: 1380,
        durationFormatted: "23 min",
        note: "En reposo nocturno"
      },
      {
        id: 2,
        timestamp: Date.now() - 172800000,
        dateFormatted: "Hace 2 días, 01:15 PM",
        count: 10,
        durationSeconds: 1020,
        durationFormatted: "17 min",
        note: "Después de almorzar"
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem("pandajr_kick_sessions", JSON.stringify(sessions));
      const pid = usePandaStore.getState().profile.pregnancyId;
      if (pid) saveKickSessions(pid, sessions).catch(() => {});
    } catch (e) {}
  }, [sessions]);

  // Cronómetro activo durante la sesión
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (startTime && count < 10) {
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [startTime, count]);

  const formatTimer = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60).toString().padStart(2, '0');
    const s = (totalSecs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const formatDurationText = (totalSecs: number) => {
    if (totalSecs < 60) return `${totalSecs} seg`;
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (secs === 0) return `${mins} min`;
    return `${mins} min ${secs} seg`;
  };

  const formatCurrentDate = () => {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `Hoy, ${time}`;
  };

  const handleKick = () => {
    const now = Date.now();
    const newCount = count + 1;
    let actualStart = startTime;

    if (count === 0 || !startTime) {
      actualStart = now;
      setStartTime(now);
      setElapsedSeconds(0);
    }

    // Vibración táctil si el dispositivo lo soporta (iPhone/Android)
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(35);
      } catch (e) {}
    }

    const timeStr = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const intervalSecs = kicks.length > 0 && actualStart 
      ? Math.floor((now - (kicks[kicks.length - 1]?.id || actualStart)) / 1000) 
      : null;

    setKicks(prev => [...prev, { id: now, timeStr, intervalSecs }]);
    setCount(newCount);

    if (newCount === 10) {
      const durSecs = Math.floor((now - (actualStart || now)) / 1000);
      const newSessionItem: KickSessionItem = {
        id: now,
        timestamp: now,
        dateFormatted: formatCurrentDate(),
        count: 10,
        durationSeconds: durSecs,
        durationFormatted: formatDurationText(durSecs),
        note: ""
      };
      setCompletedSession(newSessionItem);
      setSessions(prev => [newSessionItem, ...prev]);
      setStartTime(null);
      showToast("🔔", () => {});
    }
  };

  const handleUndo = () => {
    if (count <= 0) return;
    setCount(prev => prev - 1);
    setKicks(prev => prev.slice(0, -1));
    if (count === 1) {
      setStartTime(null);
      setElapsedSeconds(0);
    }
    showToast("Último movimiento deshecho (-1)", () => {});
  };

  // Atajo de teclado: Barra espaciadora para registrar patada
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
         target.tagName === "TEXTAREA" ||
         target.tagName === "SELECT" ||
         target.isContentEditable)
      ) {
        return;
      }

      if ((e.code === "Space" || e.key === " ") && count < 10) {
        e.preventDefault();
        handleKick();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [count, startTime, kicks]);

  const reset = () => {
    setCount(0);
    setStartTime(null);
    setElapsedSeconds(0);
    setKicks([]);
    setSelectedNote("");
    setCompletedSession(null);
    setShowTimeline(false);
  };

  const deleteSession = (id: number) => {
    const sessionToRestore = sessions.find(s => s.id === id);
    setSessions(prev => prev.filter(s => s.id !== id));
    if (sessionToRestore) {
      showToast("Sesión eliminada del historial", () => {
        setSessions(prev => [sessionToRestore, ...prev].sort((a, b) => b.timestamp - a.timestamp));
      });
    }
  };

  const saveSessionNote = (noteText: string) => {
    if (!completedSession) return;
    setSessions(prev => prev.map(s => s.id === completedSession.id ? { ...s, note: noteText } : s));
    setSelectedNote(noteText);
    showToast("Nota de la sesión guardada", () => {});
  };

  // Estadísticas inteligentes
  const validSessions = sessions.filter(s => s.count === 10);
  const avgDurationMinutes = validSessions.length > 0
    ? Math.round(validSessions.reduce((acc, s) => acc + (s.durationSeconds / 60), 0) / validSessions.length)
    : null;

  // Alerta de más de 90 min (Cardiff timeout warning)
  const isOvertime = startTime !== null && elapsedSeconds >= 5400 && count < 10;

  return (
    <div className="flex flex-col py-2 animate-in fade-in duration-300 w-full space-y-6">
      
      {/* HEADER CON PROTOCOLO CARDIFF Y GUíA */}
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 bg-sage/10 dark:bg-[#1a1724] border border-sage/30/80 dark:border-sage/100/25 px-3 py-1 rounded-full text-xs font-bold text-sage dark:text-sage/80 mb-2 shadow-xs">
          <Baby size={14} className="text-terracotta dark:text-sage" /> Protocolo Cardiff (Contar hasta 10)
        </div>
        <h3 className="text-2xl font-black text-stone-800 dark:text-[#eae6e1]">Monitor Fetal Inteligente</h3>
        <p className="text-xs text-stone-500 dark:text-[#a6a1b2] max-w-xs mx-auto mt-1 leading-relaxed">
          Monitorea el bienestar del bebé registrando 10 movimientos activos en menos de 2 horas.
        </p>

        {/* Botón para desplegar guía médica */}
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="mt-3 text-xs font-bold text-sage dark:text-sage/80 hover:text-sage dark:hover:text-sage/30 inline-flex items-center gap-1 bg-sage/10/60 dark:bg-[#1a1724] hover:bg-sage/20/70 dark:hover:bg-[#19322c] px-3 py-1.5 rounded-xl border border-sage/30/60 dark:border-sage/100/25 transition-colors"
        >
          <Info size={14} className="text-terracotta dark:text-sage" />
          <span>{showGuide ? "Ocultar guía clínica" : "¿Cómo y cuándo contar patadas?"}</span>
          {showGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* GUíA MÉDICA DESPLEGABLE */}
      {showGuide && (
        <div className="bg-gradient-to-br from-sage/10/90 to-emerald-50/70 dark:from-[#221d2d] dark:to-[#1a1724] border border-sage/30 dark:border-sage/100/25 rounded-3xl p-5 text-left text-xs text-stone-700 dark:text-[#eae6e1]/90 space-y-3 shadow-xs animate-in fade-in slide-in-from-top-2">
          <h4 className="font-bold text-sage dark:text-sage/80 text-sm flex items-center gap-2">
            <ClipboardList size={16} className="text-sage dark:text-sage" /> Guía Obstétrica: Protocolo Cardiff
          </h4>
          <ul className="space-y-2 leading-relaxed text-stone-600 dark:text-[#a6a1b2]">
            <li className="flex items-start gap-2">
              <span className="text-terracotta dark:text-sage font-bold">1.</span>
              <span><strong>¿Cuándo iniciar?</strong> Recomendado a partir de la semana 28 (o semana 24 si tu médico lo indicó).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-terracotta dark:text-sage font-bold">2.</span>
              <span><strong>Mejor momento:</strong> 30 a 60 minutos después de comer o por la noche, cuando el feto recibe más glucosa y la madre está en reposo.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-terracotta dark:text-sage font-bold">3.</span>
              <span><strong>Postura recomendada:</strong> Recuéstate sobre tu costado izquierdo para maximizar la oxigenación placentaria.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-terracotta dark:text-sage font-bold">4.</span>
              <span><strong>¿Qué cuenta como movimiento?</strong> Patadas, aleteos, giros o presiones claras. El hipo rítmico no se cuenta como patada voluntaria.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-terracotta dark:text-sage font-bold">5.</span>
              <span><strong>Meta normal:</strong> Sentir 10 movimientos. La gran mayoría de bebés lo logra en menos de 30 a 45 minutos.</span>
            </li>
          </ul>
        </div>
      )}

      {/* ALERTA CLíNICA CARDIFF (>90 MIN) */}
      {isOvertime && (
        <div className="bg-terracotta/10 dark:bg-[#241b12] border-2 border-terracotta/80 dark:border-terracotta/100/40 rounded-3xl p-4 text-left shadow-md animate-in fade-in" role="alert">
          <div className="flex gap-3 items-start">
            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={22} />
            <div>
              <h4 className="font-bold text-terracotta dark:text-terracotta/80 text-sm">Sesión Prolongada (+90 min sin 10 patadas)</h4>
              <p className="text-xs text-terracotta dark:text-terracotta/30 mt-1 leading-relaxed">
                Si el bebé está inactivo, prueba estos pasos clínicos de estimulación:
              </p>
              <ul className="text-xs text-terracotta/90 dark:text-terracotta/30/90 list-disc list-inside mt-1.5 space-y-0.5">
                <li>Bebe un vaso de agua muy fría o jugo de frutas natural.</li>
                <li>Recuéstate 20 minutos sobre tu costado izquierdo en completo silencio.</li>
                <li>Toca suavemente tu abdomen o pon música suave.</li>
              </ul>
              <p className="text-xs font-semibold text-rose-800 dark:text-rose-300 mt-2">
                Si tras 2 horas completas el bebé no alcanza 10 movimientos o notas una reducción drástica, contacta a tu equipo médico de inmediato.
              </p>
              <div className="mt-3 pt-2.5 border-t border-terracotta/30 dark:border-terracotta/100/30 flex gap-2">
                <a
                  href="tel:911"
                  className="inline-flex items-center gap-1.5 bg-rose-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs hover:bg-terracotta active:scale-95 transition-all"
                >
                  <PhoneCall size={14} /> Llamada al Médico / SOS
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TRACKER VISUAL DE 10 PASOS */}
      <div className="bg-white dark:bg-[#221d2d] rounded-3xl p-4 shadow-xs border border-stone-100 dark:border-white/[0.08] space-y-3">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-stone-700 dark:text-[#eae6e1]">Progreso de la Sesión</span>
          <span className="text-sage dark:text-sage/80">{count} de 10 patadas</span>
        </div>

        {/* 10 Pills Indicadoras */}
        <div className="grid grid-cols-10 gap-1.5">
          {Array.from({ length: 10 }).map((_, idx) => {
            const isDone = idx < count;
            const isCurrent = idx === count && startTime !== null;
            return (
              <div
                key={idx}
                className={`h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                  isDone
                    ? "bg-terracotta text-white shadow-xs scale-100"
                    : isCurrent
                    ? "bg-terracotta/20 dark:bg-[#241b12] text-terracotta dark:text-terracotta/80 border-2 border-terracotta animate-pulse scale-105"
                    : "bg-stone-100 dark:bg-[#2d273a] text-stone-400 dark:text-[#a6a1b2]/60"
                }`}
              >
                {isDone ? <Check size={14} /> : idx + 1}
              </div>
            );
          })}
        </div>

        {/* Barra de progreso suave */}
        <div className="w-full bg-stone-100 dark:bg-[#2d273a] rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-sage/100 to-emerald-500 h-full transition-all duration-300 rounded-full"
            style={{ width: `${Math.min(100, (count / 10) * 100)}%` }}
          />
        </div>
      </div>

      {/* BOTÓN PRINCIPAL DE CONTEO ERGONÓMICO */}
      <div className="relative flex flex-col items-center justify-center py-2">
        <button 
          type="button"
          onClick={handleKick}
          disabled={count >= 10}
          aria-label={count >= 10 ? "Meta de 10 patadas completada" : "Registrar movimiento o patada del bebé"}
          className={`relative z-10 w-60 h-60 rounded-full shadow-2xl flex flex-col items-center justify-center transition-all duration-200 transform active:scale-95 select-none focus:outline-none focus:ring-4 focus:ring-sage/80 dark:focus:ring-sage ${
            count >= 10 
              ? "bg-gradient-to-br from-emerald-500 to-sage dark:from-[#15342c] dark:to-[#0f241e] text-white border-4 border-white dark:border-sage/100/30 cursor-default" 
              : count === 0
              ? "bg-gradient-to-br from-sage/100 to-sage dark:from-[#221d2d] dark:to-[#181520] text-white dark:text-[#eae6e1] border-4 border-white dark:border-sage/100/30 hover:shadow-sage/30/80 hover:scale-[1.02]"
              : "bg-gradient-to-br from-sage/100 via-sage to-sage-hover dark:from-[#183a31] dark:to-[#102721] text-white dark:text-[#eae6e1] border-4 border-white dark:border-sage/100/40 hover:scale-[1.02]"
          }`}
        >
          {count < 10 ? (
            <>
              <span className="text-8xl font-black tracking-tighter leading-none">{count}</span>
              <span className="text-xs font-black uppercase tracking-widest mt-2 bg-white/20 px-3 py-1 rounded-full text-sage/10">
                {count === 0 ? "Toca para Iniciar" : "Registrar Patada"}
              </span>
              <span className="text-xs text-sage/20 mt-1 opacity-90 font-medium">
                {count === 0 ? "1ª patada activa el tiempo" : `Faltan ${10 - count} para la meta`}
              </span>
            </>
          ) : (
            <>
              <Sparkles size={40} className="text-terracotta/80 mb-1 animate-pulse motion-reduce:animate-none" />
              <span className="text-4xl font-black tracking-tight leading-tight">¡Meta 10!</span>
              <span className="text-xs font-bold tracking-tight text-emerald-100 mt-1">Completada con éxito</span>
            </>
          )}
        </button>

        {/* Botón Deshacer (-1) cuando hay conteo activo */}
        {count > 0 && count < 10 && (
          <button
            type="button"
            onClick={handleUndo}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 dark:text-[#eae6e1] hover:text-stone-900 dark:hover:text-white bg-white dark:bg-[#2d273a] border border-stone-200 dark:border-white/10 hover:bg-stone-50 dark:hover:bg-[#2a2e37] px-3.5 py-1.5 rounded-full shadow-xs active:scale-95 transition-all"
            aria-label="Deshacer último movimiento registrado"
          >
            <Undo2 size={13} /> Deshacer última patada (-1)
          </button>
        )}

        {/* Atajo de teclado accesible */}
        {count < 10 && (
          <div className="mt-3 text-xs text-stone-500 dark:text-[#a6a1b2] font-medium flex items-center gap-1.5 select-none">
            <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-stone-100 dark:bg-[#2d273a] border border-stone-300 dark:border-white/10 rounded text-stone-700 dark:text-[#eae6e1] shadow-2xs">
              Espacio
            </kbd>
            <span>en teclado para registrar movimiento</span>
          </div>
        )}
      </div>

      {/* TARJETA DE CRONÓMETRO Y ACCIONES DE SESIÓN */}
      <div className="bg-white dark:bg-[#221d2d] w-full rounded-3xl shadow-xs border border-stone-100 dark:border-white/[0.08] p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-sage/10 dark:bg-[#1a1724] text-sage dark:text-sage/80 p-2.5 rounded-2xl">
              <Clock size={22} className={startTime ? "animate-pulse text-terracotta dark:text-sage" : ""} />
            </div>
            <div>
              <p className="text-xs text-sage dark:text-sage/80 font-bold tracking-tight">Tiempo de Sesión</p>
              <p className="text-2xl font-black text-stone-800 dark:text-[#eae6e1] tracking-tight font-mono tabular-nums">{formatTimer(elapsedSeconds)}</p>
            </div>
          </div>
          
          <button 
            type="button"
            onClick={reset} 
            className="text-terracotta dark:text-rose-300 hover:text-rose-800 dark:hover:text-rose-200 font-bold text-xs bg-terracotta/10/70 dark:bg-[#251518] hover:bg-terracotta/20/80 dark:hover:bg-[#301c20] px-3.5 py-2 rounded-xl transition-colors tracking-tight flex items-center gap-1.5 active:scale-95 border border-rose-200/60 dark:border-terracotta/100/25"
            title="Reiniciar conteo y cronómetro"
          >
            <RotateCcw size={13} /> Reiniciar
          </button>
        </div>

        {/* Desplegable de Ritmo/Timeline de Patadas Registradas */}
        {kicks.length > 0 && (
          <div className="pt-2 border-t border-stone-100 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={() => setShowTimeline(!showTimeline)}
              className="w-full flex items-center justify-between text-xs font-bold text-stone-600 dark:text-[#a6a1b2] hover:text-sage dark:hover:text-sage/80 py-1 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Activity size={14} className="text-terracotta dark:text-sage" />
                <span>Ver ritmo de movimientos ({kicks.length} registrados)</span>
              </span>
              {showTimeline ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showTimeline && (
              <div className="mt-2.5 space-y-1.5 max-h-48 overflow-y-auto no-scrollbar pt-1">
                {kicks.map((k, idx) => (
                  <div key={k.id} className="flex justify-between items-center text-xs bg-slate-50 dark:bg-[#2d273a]/60 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-white/[0.06]">
                    <span className="font-bold text-stone-700 dark:text-[#eae6e1]">Patada #{idx + 1}</span>
                    <span className="text-stone-500 dark:text-[#a6a1b2] font-mono">{k.timeStr}</span>
                    <span className="text-sage dark:text-sage/80 font-semibold text-xs">
                      {k.intervalSecs !== null ? `+${formatDurationText(k.intervalSecs)}` : "Inicio"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* TARJETA DE CELEBRACIÓN Y NOTA AL COMPLETAR */}
      {completedSession && (
        <div className="bg-gradient-to-br from-emerald-500 to-sage text-white rounded-3xl p-5 shadow-lg space-y-4 animate-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2.5 rounded-2xl">
                <Sparkles size={24} className="text-terracotta/80" />
              </div>
              <div>
                <h4 className="text-lg font-black leading-tight">¡Sesión Exitosa Registrada!</h4>
                <p className="text-xs text-sage/20 mt-0.5">10 movimientos completados en {completedSession.durationFormatted}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCompletedSession(null)}
              className="text-white/80 hover:text-white min-w-[40px] min-h-[40px] flex items-center justify-center p-2 rounded-xl hover:bg-white/10 transition-colors"
              aria-label="Cerrar aviso de sesión completada"
            >
              <X size={18} />
            </button>
          </div>

          <p className="text-xs text-sage/10 leading-relaxed bg-white/10 p-3 rounded-2xl">
            âš¡ <strong>Evaluación médica:</strong> Tu bebé mostró un ritmo activo y reactivo saludable. La sesión ya está registrada en el historial.
          </p>

          <div>
            <p className="text-xs font-bold tracking-tight text-sage/30 mb-2">Añadir contexto a la sesión:</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "🍽️ Después de comer",
                  "🛋️ En reposo",
                  "🎵 Con música",
                  "🌙 Por la noche",
                  "☀️ En la mañana",
                  "🚶 Tras caminar"
                ].map(note => (
                <button
                  key={note}
                  type="button"
                  onClick={() => saveSessionNote(note)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all ${
                    selectedNote === note
                      ? "bg-white text-sage font-bold shadow-sm"
                      : "bg-white/15 text-white hover:bg-white/25"
                  }`}
                >
                  {note}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={reset}
            className="w-full py-3 bg-white text-sage rounded-2xl font-bold text-xs hover:bg-sage/10 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
          >
            <RotateCcw size={14} /> Iniciar Nueva Sesión
          </button>
        </div>
      )}

      {/* ESTADíSTICAS INTELIGENTES Y PROMEDIO */}
      {avgDurationMinutes !== null && (
        <div className="bg-gradient-to-br from-sage/10/70 to-emerald-50/60 dark:from-[#221d2d] dark:to-[#1a1724] rounded-3xl p-4 border border-sage/20 dark:border-sage/100/25 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="bg-sage/20 dark:bg-[#1a1724] text-sage dark:text-sage/80 p-2.5 rounded-2xl">
              <Trophy size={20} className="text-sage dark:text-sage" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-800 dark:text-[#eae6e1]">Promedio Personal (10 Patadas)</p>
              <p className="text-lg font-black text-sage dark:text-sage/80 font-mono">~{avgDurationMinutes} minutos</p>
            </div>
          </div>
          <span className="text-xs font-bold text-sage dark:text-sage/80 bg-sage/20/80 dark:bg-[#1a1724] px-2.5 py-1 rounded-full tracking-tight">
            Ritmo Normal
          </span>
        </div>
      )}

      {/* HISTORIAL CLíNICO DE SESIONES CON PERSISTENCIA */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-bold text-stone-800 dark:text-[#eae6e1] flex items-center gap-2 text-sm">
            <History size={18} className="text-terracotta dark:text-sage/80"/> Historial Clínico ({sessions.length})
          </h4>
          <span className="text-xs font-semibold text-stone-500 dark:text-[#a6a1b2]">Guardado automático</span>
        </div>

        {sessions.length === 0 ? (
          <div className="bg-stone-50 dark:bg-[#221d2d]/60 rounded-2xl p-6 text-center border border-dashed border-stone-200 dark:border-white/[0.08]">
            <Baby className="mx-auto text-stone-300 dark:text-[#a6a1b2]/50 mb-2" size={32} />
            <p className="text-stone-500 dark:text-[#a6a1b2] text-xs font-medium">Aún no hay sesiones guardadas. Completa 10 patadas para archivar tu primer registro.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {sessions.map(s => (
              <div key={s.id} className="bg-white dark:bg-[#221d2d] p-3.5 rounded-2xl border border-stone-200/80 dark:border-white/[0.08] shadow-xs flex justify-between items-center group hover:border-sage/30 dark:hover:border-sage/100/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-50 dark:bg-[#1a1724] text-sage-hover dark:text-sage/80 p-2 rounded-xl shrink-0">
                    <CheckCircle size={18}/>
                  </div>
                  <div>
                    <span className="font-bold text-stone-800 dark:text-[#eae6e1] text-xs leading-tight block">{s.dateFormatted}</span>
                    {s.note && (
                      <span className="text-xs font-medium text-sage dark:text-sage/80 bg-sage/10 dark:bg-[#1a1724] px-2 py-0.5 rounded-md inline-block mt-0.5">
                        {s.note}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs font-black text-stone-800 dark:text-[#eae6e1]">{s.count} patadas</p>
                    <p className="text-xs font-semibold text-stone-500 dark:text-[#a6a1b2] font-mono">en {s.durationFormatted}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteSession(s.id)}
                    aria-label={`Eliminar sesión de ${s.dateFormatted}`}
                    className="min-w-[40px] min-h-[40px] flex items-center justify-center text-stone-400 dark:text-[#a6a1b2] hover:text-rose-600 dark:hover:text-terracotta hover:bg-stone-100 dark:hover:bg-[#2d273a] p-2 rounded-xl transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

function ContadorContracciones({ showToast }: { showToast: any }) {
  const [isRecording, setIsRecording] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentDuration, setCurrentDuration] = useState(0);
  const [lastEndedAt, setLastEndedAt] = useState<number | null>(null);
  const [restSeconds, setRestSeconds] = useState(0);

  // Historial con persistencia en localStorage sin alarmas falsas en la primera carga
  const [history, setHistory] = useState<{ id: number, start: number, duration: number, interval: number | null }[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("pandajr_contractions_history");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {}
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem("pandajr_contractions_history", JSON.stringify(history));
      const pid2 = usePandaStore.getState().profile.pregnancyId;
      if (pid2) saveContractions(pid2, history).catch(() => {});
    } catch (e) {}
  }, [history]);

  // Cronómetro de contracción activa
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && startTime) {
      interval = setInterval(() => {
        setCurrentDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, startTime]);

  // Cronómetro de intervalo de descanso entre contracciones
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!isRecording && lastEndedAt) {
      interval = setInterval(() => {
        setRestSeconds(Math.floor((Date.now() - lastEndedAt) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, lastEndedAt]);

  const toggleRecording = () => {
    const now = Date.now();
    if (!isRecording) {
      setStartTime(now);
      setCurrentDuration(0);
      setIsRecording(true);
    } else {
      if (startTime) {
        const durationSecs = Math.max(1, Math.floor((now - startTime) / 1000));
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
        setLastEndedAt(now);
        setRestSeconds(0);
      }
      setIsRecording(false);
      setStartTime(null);
    }
  };

  // Atajo de teclado: Barra espaciadora para iniciar/detener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        toggleRecording();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRecording, startTime, history]);

  const formatTime = (secs: number) => {
    if (secs < 60) return `${secs}s`;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  const clearHistory = () => {
    if (history.length === 0) return;
    const backup = [...history];
    setHistory([]);
    setLastEndedAt(null);
    setRestSeconds(0);
    showToast("Historial de contracciones reiniciado", () => setHistory(backup));
  };

  const deleteItem = (id: number) => {
    const backup = [...history];
    setHistory(prev => prev.filter(h => h.id !== id));
    showToast("Contracción eliminada", () => setHistory(backup));
  };

  // Cálculos de promedios
  const avgDuration = history.length > 0 ? Math.round(history.reduce((acc, h) => acc + h.duration, 0) / history.length) : 0;
  const intervals = history.filter(h => h.interval !== null);
  const avgInterval = intervals.length > 0 ? Math.round(intervals.reduce((acc, h) => acc + (h.interval || 0), 0) / intervals.length) : 0;

  // Regla 5-1-1: Frecuencia <= 5-6 min (360s), Duración >= 45s, al menos 3 consecutivas
  const is511 = history.length >= 3 && avgDuration >= 45 && avgInterval > 0 && avgInterval <= 360;

  return (
    <div className="flex flex-col py-2 animate-in fade-in duration-300 w-full space-y-4">
      
      {/* Alerta de Parto Activo (Regla 5-1-1) */}
      {is511 && (
        <div className="bg-terracotta/10 dark:bg-[#251518] border border-rose-200 dark:border-terracotta/100/25 p-4 rounded-3xl shadow-xs animate-in slide-in-from-top-3" role="alert" aria-live="assertive">
          <div className="flex gap-3">
            <div className="bg-terracotta/20 dark:bg-[#341b21] text-rose-600 dark:text-rose-300 p-2.5 rounded-2xl shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h4 className="font-bold text-rose-950 dark:text-rose-300 text-sm">¡Regla 5-1-1 Detectada! (Parto Activo)</h4>
              <p className="text-rose-800 dark:text-rose-300/90 text-xs mt-1 leading-snug">
                Tus contracciones vienen cada ~{Math.round(avgInterval / 60)} min y duran ~{avgDuration}s. Es momento de acudir al hospital o contactar a tu obstetra o matrona.
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-rose-200/80 dark:border-terracotta/100/20 flex gap-2">
            <a
              href="tel:911"
              className="flex-1 bg-rose-600 hover:bg-terracotta active:scale-95 text-white font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all text-center"
            >
              📞 Llamar al Obstetra
            </a>
            <a
              href="https://maps.google.com/?q=hospital+maternidad"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-white dark:bg-[#221d2d] hover:bg-terracotta/20/50 dark:hover:bg-[#2d273a] active:scale-95 border border-rose-300 dark:border-terracotta/100/30 text-terracotta dark:text-rose-300 font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all text-center"
            >
              🏥 Hospital
            </a>
          </div>
        </div>
      )}

      {/* Tarjetas de Promedios */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-[#221d2d] rounded-3xl p-4 shadow-xs border border-stone-100 dark:border-white/[0.08] flex flex-col items-center justify-center text-center">
          <p className="text-xs text-sage dark:text-sage/80 font-bold tracking-tight mb-1">Duración Promedio</p>
          <p className="text-xl font-black text-sage dark:text-sage/80 tabular-nums">{history.length > 0 ? formatTime(avgDuration) : "â€”"}</p>
        </div>
        <div className="bg-white dark:bg-[#221d2d] rounded-3xl p-4 shadow-xs border border-stone-100 dark:border-white/[0.08] flex flex-col items-center justify-center text-center">
          <p className="text-xs text-rose-800 dark:text-rose-300 font-bold tracking-tight mb-1">Frecuencia Promedio</p>
          <p className="text-xl font-black text-rose-600 dark:text-terracotta tabular-nums">{avgInterval ? formatTime(avgInterval) : "â€”"}</p>
        </div>
      </div>
      
      {/* Botón Principal del Cronómetro */}
      <button 
        type="button"
        onClick={toggleRecording}
        className={`w-full py-7 rounded-3xl shadow-xl text-white font-bold text-xl flex flex-col items-center justify-center gap-2 transition-all duration-300 transform active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-sage ${
          isRecording 
            ? "bg-terracotta/100 hover:bg-rose-600 ring-4 ring-rose-200 dark:ring-terracotta/100/30" 
            : "bg-terracotta hover:bg-terracotta-hover"
        }`}
        aria-label={isRecording ? "Detener registro de contracción" : "Iniciar registro de contracción"}
      >
        <div className="flex items-center gap-2">
          {isRecording ? <Square size={32} /> : <Play size={32} />}
          <span className="text-2xl font-black tracking-tight tabular-nums">
            {isRecording ? formatTime(currentDuration) : "Iniciar Contracción"}
          </span>
        </div>
        <span className="text-xs font-medium opacity-90">
          {isRecording ? "Toca o presiona Espacio al terminar" : "Toca o presiona Espacio al sentir que inicia"}
        </span>
      </button>

      {/* MODO RECUPERACIÓN Y RESPIRACIÓN GUIADA ENTRE CONTRACCIONES */}
      {!isRecording && history.length > 0 && (
        <div className="bg-gradient-to-br from-sage/10/80 via-emerald-50/50 to-white dark:from-[#221d2d] dark:to-[#1a1724] rounded-3xl p-5 border border-sage/30/80 dark:border-sage/100/25 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-sage/20 dark:border-white/[0.06] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <h4 className="text-xs font-bold text-teal-950 dark:text-sage/80 tracking-tight">Intervalo de Descanso Activo</h4>
            </div>
            <span className="text-xs font-bold text-sage dark:text-sage/80 font-mono tabular-nums">
              Descanso: {formatTime(restSeconds)}
            </span>
          </div>

          {/* Pacer Visual de Respiración */}
          <div className="flex flex-col items-center justify-center py-2 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sage/20 to-emerald-400/30 border-2 border-sage/100 flex items-center justify-center animate-pulse motion-reduce:animate-none">
              <HeartPulse size={32} className="text-terracotta dark:text-sage" />
            </div>
            <p className="font-bold text-stone-800 dark:text-[#eae6e1] text-sm mt-3">Inhala lento en 4s ... Exhala suave en 6s</p>
            <p className="text-xs text-stone-500 dark:text-[#a6a1b2] max-w-xs mt-0.5">
              Suelta mandíbula y hombros para relajar la musculatura del suelo pélvico.
            </p>
          </div>

          {/* Guía Rápida para el Acompañante */}
          <div className="bg-white/90 dark:bg-[#2d273a]/80 rounded-2xl p-3 border border-sage/20/90 dark:border-white/10 text-xs space-y-1">
            <p className="font-bold text-sage dark:text-sage/80 flex items-center gap-1">
              <span>🤝 Acompañamiento del Papá / Pareja:</span>
            </p>
            <p className="text-stone-600 dark:text-[#a6a1b2] leading-relaxed">â€¢ Ofrece un sorbo pequeño de agua fresca o bálsamo labial.</p>
            <p className="text-stone-600 dark:text-[#a6a1b2] leading-relaxed">â€¢ Aplica contrapresión firme con el talón de la mano en el sacro (espalda baja).</p>
            <p className="text-stone-600 dark:text-[#a6a1b2] leading-relaxed">â€¢ Recuérdale con voz serena: <em>"Respira profundo, lo estás haciendo genial."</em></p>
          </div>
        </div>
      )}

      {/* Historial o Estado Inicial */}
      {history.length === 0 ? (
        <div className="bg-white dark:bg-[#221d2d] rounded-3xl p-6 border border-dashed border-stone-200 dark:border-white/[0.08] text-center shadow-xs">
          <div className="bg-sage/10 dark:bg-[#1a1724] w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 text-terracotta dark:text-sage/80">
            <HeartPulse size={24} />
          </div>
          <h4 className="font-bold text-stone-800 dark:text-[#eae6e1] text-sm mb-1">Sin contracciones registradas</h4>
          <p className="text-xs text-stone-500 dark:text-[#a6a1b2] max-w-xs mx-auto leading-relaxed">
            Cuando sientas que tu abdomen se tensa o empiece una contracción, toca el botón grande. El sistema calculará la duración, el intervalo y te avisará si cumples la regla 5-1-1 para acudir al hospital.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-stone-800 dark:text-[#eae6e1] text-sm flex items-center gap-2">
              <Activity size={18} className="text-terracotta dark:text-sage/80"/> Historial ({history.length})
            </h4>
            <button
              type="button"
              onClick={clearHistory}
              className="text-xs font-bold text-stone-400 dark:text-[#a6a1b2] hover:text-rose-600 dark:hover:text-terracotta transition-colors"
            >
              Reiniciar historial
            </button>
          </div>

          <div className="bg-white dark:bg-[#221d2d] rounded-3xl shadow-xs border border-stone-200/80 dark:border-white/[0.08] overflow-hidden">
            <div className="grid grid-cols-4 bg-stone-50 dark:bg-[#2d273a]/50 p-3 text-xs font-bold text-stone-500 dark:text-[#a6a1b2] tracking-tight text-center">
              <div>Hora</div>
              <div>Duración</div>
              <div>Frecuencia</div>
              <div>Quitar</div>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-white/[0.06] text-xs text-center">
              {history.map((item) => (
                <div key={item.id} className="grid grid-cols-4 p-3.5 items-center hover:bg-stone-50/70 dark:hover:bg-[#2d273a]/40 transition-colors">
                  <div className="text-stone-600 dark:text-[#a6a1b2] font-medium">
                    {new Date(item.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div>
                    <span className="font-bold text-sage dark:text-sage/80 bg-sage/10 dark:bg-[#1a1724] py-1 px-2 rounded-lg inline-block tabular-nums">
                      {formatTime(item.duration)}
                    </span>
                  </div>
                  <div className="font-bold text-rose-600 dark:text-terracotta tabular-nums">
                    {item.interval ? formatTime(item.interval) : "â€”"}
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => deleteItem(item.id)}
                      aria-label="Eliminar contracción"
                      className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center text-stone-400 dark:text-[#a6a1b2] hover:text-rose-600 dark:hover:text-terracotta hover:bg-stone-100 dark:hover:bg-[#2d273a] p-2 rounded-xl transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
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
  // Firestore sync for baby names
  useEffect(() => {
    const pid = usePandaStore.getState().profile.pregnancyId;
    if (pid) {
      const unsub = listenToBabyNames(pid, (remoteNames) => {
        if (remoteNames.length > 0) setNames(remoteNames);
      });
      return () => unsub();
    }
  }, []);

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
    const pidNames = usePandaStore.getState().profile.pregnancyId;
    if (pidNames) saveBabyNames(pidNames, names).catch(() => {});
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
          ? `¡PandaIA generó ${formatted.length} nuevos nombres únicos con IA! âœ¨` 
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
  const [lastVotedId, setLastVotedId] = useState<number | null>(null);

  const vote = (id: number, status: "liked" | "disliked") => {
    setLastVotedId(id);
    setNames(prev => prev.map(n => n.id === id ? { ...n, status } : n));
  };

  const undoLastVote = () => {
    if (lastVotedId !== null) {
      setNames(prev => prev.map(n => n.id === lastVotedId ? { ...n, status: "pending" } : n));
      setLastVotedId(null);
      showToast("Último voto deshecho", () => {});
    }
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
          <h3 className="text-xl font-bold text-stone-800 dark:text-[#eae6e1]">Nombres del Bebé</h3>
          <p className="text-xs text-stone-500 dark:text-[#a6a1b2]">¿Hará match con tu pareja?</p>
        </div>
        <div className="flex items-center gap-2">
          {matches.length > 0 && (
            <div className="bg-terracotta/20 dark:bg-[#251518] text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-terracotta/100/20 font-bold px-3 py-1 rounded-full text-xs flex items-center gap-1 animate-pulse">
              <Heart size={12} fill="currentColor"/> {matches.length} Matches
            </div>
          )}
          <button
            type="button"
            onClick={handleRequestMoreNames}
            disabled={isLoadingMore}
            className="text-xs font-bold text-sage dark:text-sage/80 bg-sage/10 dark:bg-[#1a1724] hover:bg-sage/20 dark:hover:bg-[#19322c] px-3 py-1.5 min-h-[38px] rounded-full border border-sage/30/70 dark:border-sage/100/25 flex items-center gap-1.5 transition-colors disabled:opacity-60 shadow-xs active:scale-95"
            title="Pedir más nombres a PandaIA"
          >
            {isLoadingMore ? (
              <div className="w-3 h-3 border-2 border-sage dark:border-sage/80 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Sparkles size={12} className="text-terracotta/100" />
            )}
            <span>+ Nombres</span>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {["todos", "niña", "niño", "neutro"].map(f => (
            <button 
              key={f}
              onClick={() => setGenderFilter(f as any)}
              className={`px-3.5 py-2 min-h-[40px] rounded-full text-xs font-bold uppercase transition-colors whitespace-nowrap active:scale-95 ${
                genderFilter === f 
                  ? "bg-terracotta text-white shadow-xs" 
                  : "bg-stone-100 dark:bg-[#2d273a] text-stone-600 dark:text-[#a6a1b2] hover:bg-stone-200 dark:hover:bg-[#383147]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {lastVotedId !== null && (
          <button
            type="button"
            onClick={undoLastVote}
            className="text-xs font-bold text-stone-600 dark:text-[#eae6e1] hover:text-stone-900 dark:hover:text-white bg-white dark:bg-[#2d273a] border border-stone-200 dark:border-white/10 hover:bg-stone-100 dark:hover:bg-[#383147] px-3 py-2 min-h-[40px] rounded-full shadow-xs active:scale-95 transition-all flex items-center gap-1 shrink-0 ml-2"
            title="Deshacer el último voto de nombre"
          >
            <Undo2 size={13} /> Deshacer
          </button>
        )}
      </div>
      
      {current ? (
        <div 
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ transform: touchStart !== null ? `translateX(${swipeOffset}px) rotate(${swipeOffset * 0.05}deg)` : "translateX(0) rotate(0)", transition: touchStart !== null ? "none" : "transform 0.3s ease-out" }}
          className="bg-white dark:bg-[#221d2d] rounded-3xl shadow-xl border border-stone-100 dark:border-white/[0.08] p-8 flex flex-col items-center text-center relative overflow-hidden mb-6 select-none touch-pan-y w-full"
        >
          <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-sage to-terracotta"></div>
          <h2 className="text-4xl font-black text-stone-800 dark:text-[#eae6e1] mb-2 mt-4">{current.text}</h2>
          <span className="text-xs font-bold uppercase tracking-widest text-sage dark:text-sage/80 bg-sage/10 dark:bg-[#1a1724] px-3 py-1 rounded-full mb-4">
            Origen: {current.origin} â€¢ {current.gender}
          </span>
          <p className="text-sm text-stone-500 dark:text-[#a6a1b2] italic mb-8 max-w-[200px]">"{current.meaning}"</p>
          
          <div className="flex gap-6 w-full justify-center">
            <button 
              type="button"
              onClick={() => vote(current.id, "disliked")} 
              aria-label={`Descartar el nombre ${current.text}`}
              className="bg-white dark:bg-[#2d273a] border-2 border-stone-100 dark:border-white/10 p-5 rounded-full shadow-xs hover:bg-stone-50 dark:hover:bg-[#383147] text-stone-400 dark:text-[#a6a1b2] hover:text-stone-600 dark:hover:text-[#eae6e1] transition-transform active:scale-90 focus:outline-none focus:ring-2 focus:ring-rose-300"
            >
              <X size={32} />
            </button>
            <button 
              type="button"
              onClick={() => vote(current.id, "liked")} 
              aria-label={`Guardar como favorito el nombre ${current.text}`}
              className="bg-terracotta/100 p-5 rounded-full shadow-lg hover:bg-rose-600 text-white transition-transform active:scale-90 focus:outline-none focus:ring-2 focus:ring-rose-300"
            >
              <Heart size={32} fill="currentColor" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-sage/10 to-terracotta/10 dark:from-[#221d2d] dark:to-[#1a1724] rounded-3xl border border-sage/20 dark:border-sage/100/25 p-8 text-center mb-6 shadow-xs flex flex-col items-center w-full">
            <div className="bg-white dark:bg-[#2d273a] p-4 rounded-full mb-4 shadow-xs">
              <Sparkles className="text-terracotta/100" size={32} />
            </div>
            <h4 className="text-xl font-bold text-stone-800 dark:text-[#eae6e1] mb-2">
              {matches.length > 0 ? "¡Excelente trabajo en equipo!" : "¡Sigue buscando!"}
            </h4>
            <p className="text-stone-600 dark:text-[#a6a1b2] text-sm mb-6 leading-relaxed">
              {matches.length > 0 
                ? `Han coincidido en ${matches.length} nombre${matches.length > 1 ? "s" : ""}. Este bebé ya tiene opciones increíbles.` 
                : "Has revisado esta lista, pero aún no hay coincidencias. ¡No te rindas, el nombre perfecto está ahí afuera!"}
            </p>
            <button 
              type="button"
              disabled={isLoadingMore}
              onClick={handleRequestMoreNames}
              className="bg-terracotta text-white font-bold py-3.5 px-6 rounded-full shadow-md hover:bg-terracotta-hover transition-colors flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60 w-full max-w-xs"
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
              className="mt-4 text-xs font-bold text-stone-500 dark:text-[#a6a1b2] hover:text-stone-700 dark:hover:text-[#eae6e1] tracking-tight transition-colors focus:outline-none"
            >
              Volver a votar los anteriores
            </button>
          </div>
        )}

      {matches.length > 0 && (
        <div className="mt-4">
          <h4 className="font-bold text-stone-800 dark:text-[#eae6e1] mb-3 flex items-center gap-2"><Sparkles size={18} className="text-terracotta/100"/> ¡It's a Match!</h4>
          <div className="grid grid-cols-2 gap-3">
            {matches.map(n => (
              <div key={n.id} className="bg-gradient-to-br from-sage/10 to-white dark:from-[#221d2d] dark:to-[#2d273a] border border-sage/20 dark:border-white/[0.08] p-4 rounded-2xl flex flex-col items-center justify-center shadow-xs">
                <Heart size={20} className="text-terracotta mb-1" fill="currentColor"/>
                <span className="font-bold text-stone-800 dark:text-[#eae6e1]">{n.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface PlanOption {
  id: string;
  label: string;
  desc: string;
  checked: boolean;
}

interface PlanSection {
  id: number;
  category: string;
  title: string;
  subtitle: string;
  options: PlanOption[];
}

const DEFAULT_PLAN_SECTIONS: PlanSection[] = [
  {
    id: 1,
    category: "Ambiente",
    title: "1. Acompañamiento y Ambiente de Parto",
    subtitle: "Tus preferencias para un entorno sereno, seguro y respetado.",
    options: [
      { id: "a1", label: "Acompañante continuo en todo momento", desc: "Deseo que mi pareja o acompañante esté presente en dilatación, expulsivo y recuperación sin interrupción.", checked: true },
      { id: "a2", label: "Ambiente con luz tenue y silencioso", desc: "Reducir la iluminación artificial y el ruido en la sala para favorecer la producción de oxitocina natural.", checked: true },
      { id: "a3", label: "Música propia y ropa cómoda", desc: "Llevaré mi propia lista de música relajante y ropa personal en lugar de la bata institucional abierta.", checked: true },
      { id: "a4", label: "Libertad de movimiento y esferodinamia", desc: "Poder caminar, cambiar de postura libremente y utilizar pelota de pilates durante la fase de dilatación.", checked: true },
      { id: "a5", label: "Hidratación y líquidos claros", desc: "Poder beber agua, infusiones o caldos ligeros para mantener energía durante el trabajo de parto.", checked: true },
      { id: "a6", label: "Acceso a ducha o hidroterapia con agua caliente", desc: "Uso del agua tibia como método fisiológico y natural para el alivio del dolor de las contracciones.", checked: true }
    ]
  },
  {
    id: 2,
    category: "Dolor y Procedimientos",
    title: "2. Manejo del Dolor y Procedimientos Médicos",
    subtitle: "Intervenciones farmacológicas y monitoreo clínico informado.",
    options: [
      { id: "d1", label: "Alivio no farmacológico primero", desc: "Masajes lumbares por mi acompañante, técnicas de respiración guiada, compresas y libertad postural.", checked: true },
      { id: "d2", label: "Anestesia Epidural a demanda informada", desc: "Deseo que la epidural esté disponible y se aplique cuando yo lo solicite expresamente, sin apresurar.", checked: true },
      { id: "d3", label: "Rotura espontánea de bolsa amniótica", desc: "Permitir que las membranas rompan de forma fisiológica; evitar la amniotomía artificial rutinaria.", checked: true },
      { id: "d4", label: "Uso de Oxitocina sintética solo con justificación", desc: "No administrar goteo de oxitocina de rutina para acelerar el parto, salvo necesidad médica justificada.", checked: true },
      { id: "d5", label: "Mínimo número de tactos vaginales", desc: "Realizar exploraciones vaginales únicamente cuando sea indispensable y avisando previamente con delicadeza.", checked: true }
    ]
  },
  {
    id: 3,
    category: "Expulsivo",
    title: "3. Periodo Expulsivo y Nacimiento",
    subtitle: "Cómo deseas vivir el momento exacto en que nace tu bebé.",
    options: [
      { id: "e1", label: "Libertad de postura para dar a luz", desc: "Poder parir en la postura más instintiva y cómoda (semisentada, cuclillas, lateral o cuatro apoyos), evitando litotomía forzada.", checked: true },
      { id: "e2", label: "Pujos espontáneos y fisiológicos", desc: "Pujar al compás natural de mis contracciones corporales en vez de pujos dirigidos en apnea forzada.", checked: true },
      { id: "e3", label: "Protección perineal (No episiotomía de rutina)", desc: "Aplicación de compresas tibias y masajes perineales; realizar episiotomía solo ante riesgo fetal inminente.", checked: true },
      { id: "e4", label: "Corte del cordón por el padre / acompañante", desc: "Deseo que mi acompañante tenga la oportunidad de cortar el cordón umbilical guiado por la matrona.", checked: true },
      { id: "e5", label: "Contacto visual o tocar la cabecita al coronar", desc: "Deseo poder ver con espejo o tocar suavemente a mi bebé cuando empiece a coronar.", checked: false }
    ]
  },
  {
    id: 4,
    category: "Recién Nacido",
    title: "4. Cuidados Inmediatos del Recién Nacido (Hora Dorada)",
    subtitle: "Apego temprano, corte de cordón y alimentación inicial.",
    options: [
      { id: "n1", label: "Corte tardío del cordón umbilical", desc: "Esperar al menos 2 a 3 minutos o hasta que el cordón deje de pulsar para maximizar el aporte de hierro y células madre.", checked: true },
      { id: "n2", label: "Contacto Piel con Piel inmediato e ininterrumpido", desc: "Colocar al bebé directamente sobre mi pecho desnudo al nacer durante la primera hora de vida (Hora Dorada).", checked: true },
      { id: "n3", label: "Retrasar procedimientos de rutina no urgentes", desc: "Pesar, medir, bañar y administrar gotas/vitamina K solo después de la primera hora de apego sobre el pecho.", checked: true },
      { id: "n4", label: "Inicio precoz de Lactancia Materna", desc: "Facilitar el primer agarre espontáneo al pecho durante los primeros 60 minutos de vida con apoyo de matrona.", checked: true },
      { id: "n5", label: "No suministrar suero, fórmula ni chupetes", desc: "Alimentación exclusiva al pecho salvo prescripción médica estricta y previamente consensuada con los padres.", checked: true }
    ]
  },
  {
    id: 5,
    category: "Cesárea y Notas",
    title: "5. En caso de Cesárea y Cuidados Especiales",
    subtitle: "Cesárea humanizada y notas médicas particulares.",
    options: [
      { id: "c1", label: "Acompañante presente en quirófano", desc: "Que mi pareja esté a mi lado en todo momento durante la cesárea y en la sala de recuperación postoperatoria.", checked: true },
      { id: "c2", label: "Piel con piel inmediato en quirófano o con el padre", desc: "Si la madre no puede por la intervención, que el padre realice el contacto piel con piel sin separarse del bebé.", checked: true },
      { id: "c3", label: "Bajar pantalla en el alumbramiento", desc: "Permitirnos ver el momento exacto en que sacan al bebé si las condiciones quirúrgicas lo permiten.", checked: true },
      { id: "c4", label: "Co-alojamiento conjunto 24 horas en habitación", desc: "Que el recién nacido permanezca en todo momento en la habitación con la madre, sin traslados rutinarios a nido.", checked: true }
    ]
  }
];

function PlanParto({ profile, showToast }: { profile?: UserProfile, showToast: any }) {
  // Firestore sync for birth plan
  useEffect(() => {
    const pid = usePandaStore.getState().profile.pregnancyId;
    if (pid) {
      const unsub = listenToBirthPlan(pid, (data) => {
        if (data.patient && Object.keys(data.patient).length > 0) setPatientData((prev: any) => ({ ...prev, ...data.patient }));
        if (data.sections && data.sections.length > 0) setSections(data.sections);
      });
      return () => unsub();
    }
  }, []);

  const [step, setStep] = useState(1);
  const [viewMode, setViewMode] = useState<"wizard" | "document">("wizard");

  // Datos del paciente editables y guardados
  const [patientData, setPatientData] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("pandajr_birth_plan_patient");
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      motherName: profile?.role === "mama" ? profile.name : "",
      partnerName: profile?.role === "papa" ? profile.name : "",
      hospital: profile?.location || "Hospital / Clínica de Maternidad",
      week: profile?.week || 36,
      doctor: "",
      notes: profile?.notes || ""
    };
  });

  // Secciones y opciones guardadas en localStorage
  const [sections, setSections] = useState<PlanSection[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("pandajr_birth_plan_sections");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === DEFAULT_PLAN_SECTIONS.length) return parsed;
        }
      } catch (e) {}
    }
    return DEFAULT_PLAN_SECTIONS;
  });

  // Guardar cambios en localStorage
  useEffect(() => {
    try {
      localStorage.setItem("pandajr_birth_plan_patient", JSON.stringify(patientData));
      localStorage.setItem("pandajr_birth_plan_sections", JSON.stringify(sections));
    } catch (e) {}
  }, [patientData, sections]);

  const toggleOption = (sectionId: number, optionId: string) => {
    setSections(prev => prev.map(sec => {
      if (sec.id !== sectionId) return sec;
      return {
        ...sec,
        options: sec.options.map(opt => opt.id === optionId ? { ...opt, checked: !opt.checked } : opt)
      };
    }));
  };

  const handlePrint = () => {
    showToast("Generando vista de impresión para PDF... 📄", () => {});
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const sharePlanWhatsApp = () => {
    try {
      const checkedOptions = sections.flatMap(sec => 
        sec.options.filter(o => o.checked).map(o => `â€¢ [${sec.category}] ${o.label}`)
      );

      const text = [
        `📋 *PLAN DE PARTO Y NACIMIENTO PANDAJR*`,
        `🤰 *Madre:* ${patientData.motherName || "Gestante"}`,
        `👨 *Acompañante:* ${patientData.partnerName || "Pareja"}`,
        `🏥 *Centro Médico:* ${patientData.hospital}`,
        `📅 *Semana de Gestación:* ${patientData.week}`,
        patientData.doctor ? `🩺 *Especialista:* ${patientData.doctor}` : "",
        "",
        `âœ¨ *PREFERENCIAS Y CLÁUSULAS ACTIVAS (${checkedOptions.length}):*`,
        ...checkedOptions,
        "",
        patientData.notes ? `📝 *Notas Especiales:* ${patientData.notes}\n` : "",
        `👉 *Documento generado y coordinado con PandaJR*`
      ].filter(Boolean).join("\n");

      if (navigator.share) {
        navigator.share({
          title: "Plan de Parto PandaJR",
          text: text
        }).catch(() => {});
      } else {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
      }
    } catch(err) {
      console.error(err);
      showToast("No se pudo abrir el compartidor", () => {});
    }
  };

  const resetToDefaults = () => {
    setSections(DEFAULT_PLAN_SECTIONS);
    showToast("Plan restablecido a los valores clínicos recomendados", () => {});
  };

  const currentSection = sections.find(s => s.id === step);
  const totalCheckedCount = sections.reduce((acc, s) => acc + s.options.filter(o => o.checked).length, 0);

  return (
    <div className="flex flex-col py-2 animate-in fade-in duration-300 w-full">

      {/* DOCUMENTO CLINICO IMPRESO (SOLO VISIBLE AL IMPRIMIR CON WINDOW.PRINT) */}
      <div className="hidden print:block text-black bg-white p-8 max-w-4xl mx-auto space-y-6 text-sm">
        <div className="border-b-2 border-sage pb-4 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-sage">PLAN DE PARTO Y NACIMIENTO INFORMADO</h1>
            <p className="text-xs text-stone-600 mt-0.5">Expresión de voluntades y preferencias clínicas para la atención del parto y recién nacido</p>
          </div>
          <div className="text-right text-xs text-stone-500 font-mono">
            <p>PandaJR Copiloto Fetal</p>
            <p>Fecha: {new Date().toLocaleDateString("es-ES")}</p>
          </div>
        </div>

        {/* Ficha de Identificación de Pacientes */}
        <div className="grid grid-cols-2 gap-4 bg-stone-50 border border-stone-200 p-4 rounded-xl text-xs">
          <div>
            <p><strong>Madre Gestante:</strong> {patientData.motherName || "Por definir"}</p>
            <p className="mt-1"><strong>Acompañante / Pareja:</strong> {patientData.partnerName || "Por definir"}</p>
            <p className="mt-1"><strong>Semana Gestacional:</strong> Semana {patientData.week}</p>
          </div>
          <div>
            <p><strong>Hospital / Clínica:</strong> {patientData.hospital || "Centro de maternidad"}</p>
            <p className="mt-1"><strong>Obstetra / Matrona:</strong> {patientData.doctor || "Equipo de guardia"}</p>
            {patientData.notes && <p className="mt-1"><strong>Observaciones:</strong> {patientData.notes}</p>}
          </div>
        </div>

        {/* Cláusula Introductoria de Respeto Clínico */}
        <blockquote className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs text-stone-700 italic flex items-start gap-2.5">
          <span className="text-sage font-serif text-lg leading-none select-none shrink-0" aria-hidden="true">â€œ</span>
          <p className="flex-1">
            A la atención del equipo obstétrico y pediátrico: Este plan expresa nuestros deseos y preferencias para el proceso de parto y postparto inmediato, entendiendo siempre que la salud y seguridad de la madre y del bebé priman ante cualquier eventualidad médica imprevista.
          </p>
          <span className="text-sage font-serif text-lg leading-none select-none shrink-0 self-end" aria-hidden="true">â€</span>
        </blockquote>

        {/* Secciones y Preferencias Seleccionadas */}
        <div className="space-y-5">
          {sections.map(sec => {
            const activeOpts = sec.options.filter(o => o.checked);
            if (activeOpts.length === 0) return null;
            return (
              <div key={sec.id} className="space-y-1.5 break-inside-avoid">
                <h3 className="font-bold text-teal-950 text-sm border-b border-stone-200 pb-1 tracking-tight">{sec.title}</h3>
                <ul className="space-y-1 text-xs text-stone-800 pt-1">
                  {activeOpts.map(opt => (
                    <li key={opt.id} className="flex items-start gap-2">
                      <span className="text-sage font-bold">â˜‘</span>
                      <div>
                        <strong>{opt.label}:</strong> <span className="text-stone-600">{opt.desc}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Sección de Firmas Formales */}
        <div className="pt-8 mt-8 border-t border-stone-300 grid grid-cols-3 gap-6 text-center text-xs break-inside-avoid">
          <div className="border-t border-stone-400 pt-2">
            <p className="font-bold text-stone-800">{patientData.motherName || "Firma de la Madre"}</p>
            <p className="text-xs text-stone-500">Madre Gestante</p>
          </div>
          <div className="border-t border-stone-400 pt-2">
            <p className="font-bold text-stone-800">{patientData.partnerName || "Firma del Acompañante"}</p>
            <p className="text-xs text-stone-500">Pareja / Acompañante</p>
          </div>
          <div className="border-t border-stone-400 pt-2">
            <p className="font-bold text-stone-800">Recibido por Equipo Obstétrico</p>
            <p className="text-xs text-stone-500">Firma y Sello del Profesional</p>
          </div>
        </div>
      </div>

      {/* HEADER DE CONTROL EN LA APLICACIÓN (NO-PRINT) */}
      <div className="no-print space-y-4">
        <div className="flex justify-between items-start gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-sage/10 dark:bg-[#1a1724] border border-sage/30/80 dark:border-sage/100/25 px-2.5 py-0.5 rounded-full text-xs font-bold text-sage dark:text-sage/80 mb-1">
              <ClipboardList size={13} className="text-terracotta dark:text-sage" /> Plan de Parto Respetado
            </div>
            <h3 className="text-2xl font-black text-stone-800 dark:text-[#eae6e1]">Tu Plan de Parto</h3>
            <p className="text-xs text-stone-500 dark:text-[#a6a1b2]">
              Personaliza tus preferencias para el hospital y expórtalas en un PDF oficial.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrint}
              className="p-2.5 bg-stone-900 dark:bg-[#2d273a] hover:bg-stone-800 dark:hover:bg-[#383147] text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 text-xs font-bold active:scale-95 border border-transparent dark:border-white/10"
              title="Guardar o imprimir en PDF"
            >
              <Printer size={16} />
              <span className="hidden sm:inline">Imprimir PDF</span>
            </button>
            <button
              type="button"
              onClick={sharePlanWhatsApp}
              className="p-2.5 bg-terracotta hover:bg-terracotta-hover text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 text-xs font-bold active:scale-95"
              title="Compartir por WhatsApp"
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>

        {/* SELECTOR DE VISTA: WIZARD VS DOCUMENTO OFICIAL */}
        <div className="flex bg-stone-100 dark:bg-[#221d2d] p-1 rounded-2xl border border-transparent dark:border-white/[0.08]">
          <button
            type="button"
            onClick={() => setViewMode("wizard")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              viewMode === "wizard" 
                ? "bg-white dark:bg-[#2d273a] text-sage dark:text-sage/80 shadow-xs" 
                : "text-stone-500 dark:text-[#a6a1b2] hover:text-stone-800 dark:hover:text-[#eae6e1]"
            }`}
          >
            <Edit3 size={14} /> Asistente Paso a Paso ({step}/5)
          </button>
          <button
            type="button"
            onClick={() => setViewMode("document")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              viewMode === "document" 
                ? "bg-white dark:bg-[#2d273a] text-sage dark:text-sage/80 shadow-xs" 
                : "text-stone-500 dark:text-[#a6a1b2] hover:text-stone-800 dark:hover:text-[#eae6e1]"
            }`}
          >
            <FileText size={14} /> Vista Previa Documento ({totalCheckedCount} seleccionadas)
          </button>
        </div>
      </div>

      {/* VISTA 1: ASISTENTE PASO A PASO (WIZARD) */}
      {viewMode === "wizard" && (
        <div className="no-print mt-4 space-y-5">
          {/* Progress Bar Steps */}
          <div className="flex items-center gap-1.5">
            {sections.map(s => {
              const isPast = s.id < step;
              const isCurrent = s.id === step;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStep(s.id)}
                  aria-label={`Ir al paso ${s.id}: ${s.category}`}
                  className="flex-1 py-2 min-h-[40px] flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-sage/100 rounded-full"
                >
                  <div className={`h-2 w-full rounded-full transition-all duration-300 ${
                    isPast ? "bg-terracotta" : isCurrent ? "bg-terracotta ring-2 ring-sage/30 dark:ring-sage/100/30" : "bg-stone-200 dark:bg-[#2d273a]"
                  }`} />
                </button>
              );
            })}
          </div>

          {/* Current Section Card */}
          {currentSection && (
            <div className="bg-white dark:bg-[#221d2d] rounded-3xl shadow-xs border border-stone-200/80 dark:border-white/[0.08] p-5 space-y-4 animate-in fade-in">
              <div className="border-b border-stone-100 dark:border-white/[0.06] pb-3">
                <span className="text-xs font-bold tracking-tight text-sage dark:text-sage/80 bg-sage/10 dark:bg-[#1a1724] px-2.5 py-0.5 rounded-full">
                  Paso {step} de 5 · {currentSection.category}
                </span>
                <h4 className="text-lg font-black text-stone-800 dark:text-[#eae6e1] mt-1 leading-tight">{currentSection.title}</h4>
                <p className="text-xs text-stone-500 dark:text-[#a6a1b2] mt-0.5">{currentSection.subtitle}</p>
              </div>

              {/* Opciones Interactivas con Switches */}
              <div className="space-y-3">
                {currentSection.options.map(opt => (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                      opt.checked
                        ? "bg-sage/10/60 dark:bg-[#2d273a] border-sage/30 dark:border-sage/100/30 shadow-xs"
                        : "bg-white dark:bg-[#221d2d] border-stone-200/80 dark:border-white/[0.08] hover:border-stone-300 dark:hover:border-white/20 opacity-70"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={opt.checked}
                      onChange={() => toggleOption(currentSection.id, opt.id)}
                      className="mt-1 w-4 h-4 text-terracotta rounded border-stone-300 dark:border-white/20 dark:bg-[#2d273a] focus:ring-sage/100"
                    />
                    <div className="flex-1">
                      <span className={`text-xs font-bold block leading-snug ${opt.checked ? "text-teal-950 dark:text-sage/80" : "text-stone-700 dark:text-[#eae6e1]"}`}>
                        {opt.label}
                      </span>
                      <span className="text-xs text-stone-500 dark:text-[#a6a1b2] block mt-0.5 leading-relaxed">
                        {opt.desc}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Botones de Navegación del Wizard */}
          <div className="flex gap-2 pt-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(s => Math.max(1, s - 1))}
                aria-label="Paso anterior"
                className="py-3 px-4 bg-stone-100 dark:bg-[#2d273a] text-stone-700 dark:text-[#eae6e1] rounded-2xl hover:bg-stone-200 dark:hover:bg-[#383147] transition-colors font-bold text-xs flex items-center gap-1 active:scale-95"
              >
                <ArrowLeft size={16} /> Anterior
              </button>
            )}

            {step < 5 ? (
              <button
                type="button"
                onClick={() => setStep(s => Math.min(5, s + 1))}
                className="flex-1 py-3 px-5 bg-terracotta hover:bg-terracotta-hover text-white rounded-2xl font-bold text-xs flex justify-center items-center gap-2 transition-all shadow-xs active:scale-95"
              >
                Siguiente Paso ({step + 1}/5) <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setViewMode("document")}
                className="flex-1 py-3 px-5 bg-stone-900 dark:bg-[#2d273a] hover:bg-stone-800 dark:hover:bg-[#383147] text-white rounded-2xl font-bold text-xs flex justify-center items-center gap-2 transition-all shadow-md active:scale-95 border border-transparent dark:border-white/10"
              >
                <FileText size={16} /> Ver Documento Final
              </button>
            )}
          </div>
        </div>
      )}

      {/* VISTA 2: VISTA PREVIA DEL DOCUMENTO COMPLETO (INTERACTIVA) */}
      {viewMode === "document" && (
        <div className="no-print mt-4 space-y-5 animate-in fade-in">
          {/* Card de Datos del Paciente / Hospital */}
          <div className="bg-white dark:bg-[#221d2d] rounded-3xl p-5 shadow-xs border border-stone-100 dark:border-white/[0.08] space-y-3">
            <div className="flex justify-between items-center border-b border-stone-100 dark:border-white/[0.06] pb-2">
              <h4 className="text-xs font-bold text-stone-800 dark:text-[#eae6e1] tracking-tight flex items-center gap-1.5">
                <Settings size={14} className="text-terracotta dark:text-sage" /> Datos de la Ficha Médica
              </h4>
              <span className="text-xs text-stone-500 dark:text-[#a6a1b2]">Se imprimirán en el encabezado</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label htmlFor="plan-mother-name" className="font-semibold text-stone-600 dark:text-[#eae6e1] block mb-1">Nombre de la Madre:</label>
                <input
                  id="plan-mother-name"
                  type="text"
                  value={patientData.motherName}
                  onChange={e => setPatientData({ ...patientData, motherName: e.target.value })}
                  placeholder="Ej. Sofía Martínez"
                  className="w-full bg-stone-50 dark:bg-[#2d273a] border border-stone-200 dark:border-white/10 rounded-xl px-3 py-2 text-stone-800 dark:text-[#eae6e1] placeholder-gray-400 dark:placeholder-[#a6a1b2]/50 focus:outline-none focus:ring-2 focus:ring-sage/100"
                />
              </div>

              <div>
                <label htmlFor="plan-partner-name" className="font-semibold text-stone-600 dark:text-[#eae6e1] block mb-1">Acompañante / Pareja:</label>
                <input
                  id="plan-partner-name"
                  type="text"
                  value={patientData.partnerName}
                  onChange={e => setPatientData({ ...patientData, partnerName: e.target.value })}
                  placeholder="Ej. Carlos Pérez"
                  className="w-full bg-stone-50 dark:bg-[#2d273a] border border-stone-200 dark:border-white/10 rounded-xl px-3 py-2 text-stone-800 dark:text-[#eae6e1] placeholder-gray-400 dark:placeholder-[#a6a1b2]/50 focus:outline-none focus:ring-2 focus:ring-sage/100"
                />
              </div>

              <div>
                <label htmlFor="plan-hospital" className="font-semibold text-stone-600 dark:text-[#eae6e1] block mb-1">Hospital / Clínica:</label>
                <input
                  id="plan-hospital"
                  type="text"
                  value={patientData.hospital}
                  onChange={e => setPatientData({ ...patientData, hospital: e.target.value })}
                  placeholder="Ej. Hospital Materno Infantil"
                  className="w-full bg-stone-50 dark:bg-[#2d273a] border border-stone-200 dark:border-white/10 rounded-xl px-3 py-2 text-stone-800 dark:text-[#eae6e1] placeholder-gray-400 dark:placeholder-[#a6a1b2]/50 focus:outline-none focus:ring-2 focus:ring-sage/100"
                />
              </div>

              <div>
                <label htmlFor="plan-doctor" className="font-semibold text-stone-600 dark:text-[#eae6e1] block mb-1">Obstetra / Matrona:</label>
                <input
                  id="plan-doctor"
                  type="text"
                  value={patientData.doctor}
                  onChange={e => setPatientData({ ...patientData, doctor: e.target.value })}
                  placeholder="Ej. Dra. Gómez / Matrona de turno"
                  className="w-full bg-stone-50 dark:bg-[#2d273a] border border-stone-200 dark:border-white/10 rounded-xl px-3 py-2 text-stone-800 dark:text-[#eae6e1] placeholder-gray-400 dark:placeholder-[#a6a1b2]/50 focus:outline-none focus:ring-2 focus:ring-sage/100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="plan-notes" className="font-semibold text-stone-600 dark:text-[#eae6e1] block mb-1 text-xs">Observaciones Especiales o Alergias:</label>
              <textarea
                id="plan-notes"
                rows={2}
                value={patientData.notes}
                onChange={e => setPatientData({ ...patientData, notes: e.target.value })}
                placeholder="Ej. Alergia a la penicilina, deseo donar sangre de cordón, etc."
                className="w-full bg-stone-50 dark:bg-[#2d273a] border border-stone-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-stone-800 dark:text-[#eae6e1] placeholder-gray-400 dark:placeholder-[#a6a1b2]/50 focus:outline-none focus:ring-2 focus:ring-sage/100 resize-none"
              />
            </div>
          </div>

          {/* Resumen Estructurado del Documento */}
          <div className="bg-white dark:bg-[#221d2d] rounded-3xl p-5 shadow-xs border border-stone-100 dark:border-white/[0.08] space-y-4">
            <div className="flex justify-between items-center border-b border-stone-100 dark:border-white/[0.06] pb-2">
              <h4 className="text-sm font-bold text-stone-800 dark:text-[#eae6e1] flex items-center gap-2">
                <FileText size={16} className="text-terracotta dark:text-sage" /> Vista Previa del Documento
              </h4>
              <span className="text-xs font-bold text-sage dark:text-sage/80 bg-sage/10 dark:bg-[#1a1724] px-2.5 py-0.5 rounded-full">
                {totalCheckedCount} deseos activos
              </span>
            </div>

            <div className="space-y-4 text-xs">
              {sections.map(sec => {
                const active = sec.options.filter(o => o.checked);
                return (
                  <div key={sec.id} className="bg-slate-50/70 dark:bg-[#2d273a]/50 p-3.5 rounded-2xl border border-slate-100 dark:border-white/[0.06] space-y-2">
                    <h5 className="font-bold text-stone-900 dark:text-[#eae6e1] text-xs flex justify-between items-center">
                      <span>{sec.title}</span>
                      <span className="text-stone-500 dark:text-[#a6a1b2] font-normal">{active.length} de {sec.options.length}</span>
                    </h5>
                    {active.length === 0 ? (
                      <p className="text-stone-400 dark:text-[#a6a1b2]/60 italic text-xs">Sin preferencias seleccionadas en este apartado.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {active.map(opt => (
                          <li key={opt.id} className="flex items-start gap-2 text-stone-700 dark:text-[#eae6e1]/90">
                            <CheckCircle2 size={14} className="text-terracotta dark:text-sage shrink-0 mt-0.5" />
                            <span><strong>{opt.label}:</strong> {opt.desc}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Barra de Acciones de Exportación */}
          <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-sage dark:from-[#221d2d] dark:via-[#1c2027] dark:to-[#1a1724] border border-transparent dark:border-white/[0.08] text-white p-5 rounded-3xl shadow-lg space-y-3">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2.5 rounded-2xl">
                <Printer size={22} className="text-sage/80" />
              </div>
              <div>
                <h4 className="font-bold text-sm">¿Todo listo para el día del parto?</h4>
                <p className="text-xs text-stone-300">Imprime 2 copias (una para el historial y otra para la matrona) o guárdalo como PDF en tu teléfono.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handlePrint}
                className="py-3 px-4 bg-terracotta hover:bg-sage text-teal-950 font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 active:scale-95"
              >
                <Printer size={15} /> Imprimir / PDF
              </button>
              <button
                type="button"
                onClick={sharePlanWhatsApp}
                className="py-3 px-4 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Share2 size={15} /> WhatsApp
              </button>
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={resetToDefaults}
                className="text-xs text-stone-400 hover:text-white underline transition-colors"
              >
                Restablecer opciones predeterminadas
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
