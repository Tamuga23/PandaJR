"use client";

import React, { useState, useEffect } from "react";
import { Compass, Calendar, Bot, Send, CheckCircle2, Circle, Clock, ChevronRight, ChevronLeft, HeartPulse, Baby, Utensils, Info, ChevronDown, ChevronUp, Sparkles, Activity, Heart, X, Play, Square, Plus, Users, ClipboardList, Trophy, BriefcaseMedical, ShoppingBag, Home, FileText, AlertTriangle, Download, ArrowRight, ArrowLeft, History, CheckCircle, FileDown, Settings, Paperclip, MapPin, Briefcase, Package } from "lucide-react";

type Tab = "planificacion" | "agenda" | "herramientas" | "pandaia";

export default function PandaJRApp() {
    const [activeTab, setActiveTab] = useState<Tab>("planificacion");
  
  const [events, setEvents] = useState([
    { id: 1, date: "15 Oct", rawDate: "2026-10-15", time: "10:30 AM", title: "Ecografía de las 12 Semanas (Tamizaje)", doctor: "Dra. Ramírez" },
    { id: 2, date: "28 Oct", rawDate: "2026-10-28", time: "09:00 AM", title: "Exámenes de laboratorio", doctor: "Laboratorio Central" },
  ]);

  const handleAIAddEvent = (title: string, date: string, time: string, doctor: string, rawDate?: string) => {
    setEvents(prev => [...prev, { id: Date.now(), date, rawDate: rawDate || "", time, title, doctor }]);
  };
  
  const [toast, setToast] = useState<{message: string, onUndo: () => void} | null>(null);
  const showToast = (message: string, onUndo: () => void) => {
    setToast({ message, onUndo });
    setTimeout(() => setToast(null), 5000);
  };


  return (
    <div className="flex flex-col min-h-screen w-full max-w-md mx-auto bg-gray-50 text-gray-900 font-sans relative pb-16 shadow-2xl overflow-x-hidden">
      {/* Header */}
      <header className="bg-white px-6 py-4 shadow-sm sticky top-0 z-40 w-full">
        <h1 className="text-xl font-bold text-teal-600 flex items-center gap-2">
          PandaJR
        </h1>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full overflow-y-auto pb-6">
        <div className={activeTab === "planificacion" ? "block w-full h-full" : "hidden"}>
          <GuiaPapaView showToast={showToast} />
        </div>
        <div className={activeTab === "agenda" ? "block w-full h-full" : "hidden"}>
          <AgendaView showToast={showToast} events={events} setEvents={setEvents} />
        </div>
        <div className={activeTab === "herramientas" ? "block w-full h-full" : "hidden"}>
          <HerramientasView showToast={showToast} />
        </div>
        <div className={activeTab === "pandaia" ? "block w-full h-full" : "hidden"}>
          <PandaIAView showToast={showToast} addEvent={handleAIAddEvent} />
        </div>
      </main>

      {/* Floating Toast Notification with Undo */}
      {toast && (
        <div className="fixed bottom-20 left-4 right-4 max-w-[calc(28rem-2rem)] mx-auto bg-gray-900/95 text-white px-4 py-3 rounded-2xl shadow-2xl z-50 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200 backdrop-blur-sm border border-gray-800">
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
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 flex justify-around items-center px-2 py-3 z-50">
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
        isActive ? "text-teal-600" : "text-gray-400 hover:text-gray-600"
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

function GuiaPapaView({ showToast }: { showToast: any }) {
  const [week, setWeek] = useState(14);
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

        {/* Misión del Papá */}
        <div className="bg-teal-50 border-t border-teal-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={18} className="text-teal-600" />
            <h3 className="font-bold text-teal-800 text-sm">Misión del Papá</h3>
          </div>
          <p className="text-teal-900 text-sm leading-relaxed">
            {weekData.dadMission}
          </p>
        </div>
      </div>

      {/* 2. Checklist Module */}
      <div>
        <div className="flex justify-between items-end mb-3">
          <h2 className="text-xl font-bold text-gray-800">Checklists del Papá</h2>
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
                    <p className="text-xs text-gray-400 text-left">
                      {cat.tasks.filter(t => t.completed).length} de {cat.tasks.length} completadas
                    </p>
                  </div>
                </div>
                {cat.expanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
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
function AgendaView({ showToast, events, setEvents }: { showToast: any, events: any[], setEvents: any }) {
  const [profile, setProfile] = React.useState<"mama"|"papa">("papa");

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState<any>(null);
  
  const [newEvent, setNewEvent] = React.useState({ title: "", date: "", time: "", doctor: "" });

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

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 relative h-full flex flex-col">
      {/* Header destacado */}
      <div className="bg-teal-600 px-6 py-8 text-white rounded-b-3xl shadow-md shrink-0">
        <p className="text-teal-100 text-sm font-medium mb-1">Etapa actual</p>
        <h2 className="text-2xl font-bold">Semana 12 <br/><span className="text-lg font-medium text-teal-200">(Fin del primer trimestre)</span></h2>
        <div className="mt-4 bg-white/20 rounded-full h-1.5 w-full overflow-hidden">
          <div className="bg-white h-full w-[30%] rounded-full"></div>
        </div>
        <p className="text-teal-50 text-xs mt-2 text-right">Faltan 28 semanas</p>
      </div>

      <div className="p-5 flex-1 overflow-y-auto space-y-6 pb-20">
        
        {/* Toggle Perfil */}
        <div>
          <div className="flex bg-gray-100 rounded-full p-1 mb-3">
            <button 
              onClick={() => setProfile("mama")}
              className={`flex-1 py-1.5 text-sm font-bold rounded-full transition-colors ${profile === "mama" ? "bg-white text-teal-600 shadow-sm" : "text-gray-500"}`}
            >
              Perfil: Mamá
            </button>
            <button 
              onClick={() => setProfile("papa")}
              className={`flex-1 py-1.5 text-sm font-bold rounded-full transition-colors ${profile === "papa" ? "bg-white text-teal-600 shadow-sm" : "text-gray-500"}`}
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
              {(profile === "mama" ? suggestions.mama : suggestions.papa).map((s) => (
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
              {(profile === "mama" ? suggestions.mama : suggestions.papa).length === 0 && (
                <p className="text-sm text-gray-400 italic text-center py-2">No hay más sugerencias por ahora.</p>
              )}
            </div>
          </div>
        </div>

        {/* Citas */}
        <div>
          <div className="flex justify-between items-end mb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Calendar className="text-teal-500" size={20}/> Agenda Médica</h3>
          </div>
          
          <div className="space-y-3">
            {events.length === 0 && (
              <div className="bg-gray-50 rounded-2xl p-6 text-center border border-dashed border-gray-200">
                <Calendar className="mx-auto text-gray-300 mb-2" size={32} />
                <p className="text-gray-500 text-sm font-medium">No hay citas agendadas</p>
              </div>
            )}
            {events.map(event => (
              <div key={event.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 relative group">
                <button 
                  onClick={() => openEdit(event)}
                  className="flex-1 flex items-center gap-4 text-left focus:outline-none focus:ring-2 focus:ring-teal-500 rounded-xl"
                  aria-label={`Editar cita: ${event.title}, el ${event.date}`}
                >
                  <div className="bg-teal-50 text-teal-700 rounded-xl w-14 h-14 flex flex-col justify-center items-center shrink-0">
                    <span className="text-xs font-bold uppercase">{event.date.split(" ")[1]}</span>
                    <span className="text-xl font-bold leading-none">{event.date.split(" ")[0]}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800 text-base">{event.title}</h4>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1"><Clock size={14} /> {event.time}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-1">{event.doctor}</p>
                  </div>
                </button>
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
        <div className="absolute inset-0 bg-gray-900/40 z-50 flex items-end sm:items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white w-full max-h-[90%] overflow-y-auto sm:w-[90%] sm:rounded-3xl rounded-t-3xl p-6 pb-12 animate-in slide-in-from-bottom-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">{editingEvent ? "Editar Cita" : "Nueva Cita Médica"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="bg-gray-100 p-2 rounded-full text-gray-500 hover:bg-gray-200">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Título / Motivo</label>
                <input 
                  type="text" 
                  value={newEvent.title} 
                  onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Ej. Ecografía 3D" 
                />
              </div>
              
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Fecha</label>
                  <input 
                    type="date" 
                    value={newEvent.date} 
                    onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500" 
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Hora</label>
                  <input 
                    type="time" 
                    value={newEvent.time} 
                    onChange={e => setNewEvent({...newEvent, time: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500" 
                  />
                </div>
              </div>
              
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Doctor o Clínica</label>
                <input 
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
function PandaIAView({ showToast, addEvent }: { showToast: any, addEvent: any }) {
  const [messages, setMessages] = useState<any[]>([
    { id: 1, sender: "ai", text: "¡Hola! Soy PandaIA. ¿En qué te ayudo hoy?" }
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showContextModal, setShowContextModal] = useState(false);

  // Escape key handler for modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowContextModal(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);


    const [smartChips, setSmartChips] = useState([
    "Recordatorio: Cita médica el 28 de septiembre",
    "Agendar cita para ecografía 3D",
    "¿Cuándo podremos conocer el sexo del bebé?",
    "¿Qué evalúan en la ecografía de las 12 semanas?"
  ]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    
    const newMsg = { id: Date.now(), sender: "user", text };
    setSmartChips(prev => prev.filter(c => c !== text));
    setMessages(prev => [...prev, newMsg]);
    setInputText("");
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const lower = text.toLowerCase();
      
      // Reconocer intenciones de agendar / cita / recordatorio
      if (
        lower.includes("agendar") || 
        lower.includes("cita") || 
        lower.includes("recordatorio") || 
        lower.includes("anotar") || 
        lower.includes("agregar")
      ) {
        let extractedTitle = "Cita Médica";
        let extractedDate = "Próximamente";
        let extractedRawDate = new Date().toISOString().split("T")[0];
        
        // Detectar fechas comunes en español (ej: "28 de septiembre", "15 de oct", etc.)
        const dateMatch = text.match(/(\d{1,2})\s*(?:de)?\s*([a-zA-ZáéíóúÁÉÍÓÚ]+)/i);
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, "0");
          const rawMonth = dateMatch[2].toLowerCase();
          const monthMap: Record<string, string> = {
            enero: "Ene", ene: "Ene",
            febrero: "Feb", feb: "Feb",
            marzo: "Mar", mar: "Mar",
            abril: "Abr", abr: "Abr",
            mayo: "May", may: "May",
            junio: "Jun", jun: "Jun",
            julio: "Jul", jul: "Jul",
            agosto: "Ago", ago: "Ago",
            septiembre: "Sep", sep: "Sep", setiembre: "Sep",
            octubre: "Oct", oct: "Oct",
            noviembre: "Nov", nov: "Nov",
            diciembre: "Dic", dic: "Dic"
          };
          const monthNumMap: Record<string, string> = {
            enero: "01", ene: "01",
            febrero: "02", feb: "02",
            marzo: "03", mar: "03",
            abril: "04", abr: "04",
            mayo: "05", may: "05",
            junio: "06", jun: "06",
            julio: "07", jul: "07",
            agosto: "08", ago: "08",
            septiembre: "09", sep: "09", setiembre: "09",
            octubre: "10", oct: "10",
            noviembre: "11", nov: "11",
            diciembre: "12", dic: "12"
          };
          const formattedMonth = monthMap[rawMonth] || rawMonth.slice(0, 3);
          const monthNum = monthNumMap[rawMonth] || "09";
          extractedDate = `${parseInt(day, 10)} ${formattedMonth}`;
          const currentYear = new Date().getFullYear();
          extractedRawDate = `${currentYear}-${monthNum}-${day}`;
        }

        // Extraer título relevante
        if (lower.includes("cita de") || lower.includes("cita medica") || lower.includes("cita médica")) {
          extractedTitle = "Cita Médica";
        }
        if (lower.includes("ecografía") || lower.includes("ecografia")) {
          extractedTitle = "Ecografía Prenatal";
        } else if (lower.includes("laboratorio") || lower.includes("examen")) {
          extractedTitle = "Exámenes de Laboratorio";
        } else if (lower.includes("pediatra")) {
          extractedTitle = "Consulta Pediatra";
        } else if (lower.includes("cuna") || lower.includes("cochecito") || lower.includes("comprar")) {
          extractedTitle = "Compras del Bebé";
        } else if (text.length < 50) {
          // Si el texto es corto, usarlo directamente
          extractedTitle = text.replace(/^(agregar|agendar|recordar|poner)\s*(un|una)?\s*(recordatorio\s*de|cita\s*(medica|médica)?\s*(de|para)?)/i, "").trim();
          if (!extractedTitle) extractedTitle = "Recordatorio Médico";
        }

        if (addEvent) {
          addEvent(extractedTitle, extractedDate, "Por definir", "Generado por PandaIA", extractedRawDate);
        }

        setMessages(prev => [...prev, {
          id: Date.now(),
          sender: "ai",
          text: `¡Listo! He agendado "${extractedTitle}" para el ${extractedDate} en tu Agenda. Puedes ir a la pestaña "Agenda" para ajustar la hora exacta o el nombre del doctor.`
        }]);
        return;
      }

      if (text === "¿Qué evalúan en la ecografía de las 12 semanas?") {
        setMessages(prev => [...prev, { 
          id: Date.now(), 
          sender: "ai", 
          text: "¡Es una ecografía muy emocionante e importante! Principalmente se realiza el tamizaje genético o medición de la traslucencia nucal, y se revisa la anatomía básica del bebé.",
          card: {
            title: "Ecografía de 12 Semanas 🩺",
            desc: "Confirma la edad gestacional, revisa el hueso nasal y mide el pliegue nucal para descartar anomalías cromosómicas. ¡Es probable que también escuchen el corazón!"
          }
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: Date.now(),
          sender: "ai",
          text: "¡Excelente pregunta! Entrando a la semana 12 hay muchos cambios y novedades. Recuerda que también puedo agendar citas o recordatorios médicos si me dices 'agendar cita el 28 de septiembre'."
        }]);
      }
    }, 1200);
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
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block animate-pulse"></span> En línea - Entrenado para tu rutina
            </p>
          </div>
        </div>
        <button onClick={() => setShowContextModal(true)} className="p-2 text-teal-600 hover:bg-teal-50 rounded-full transition-colors">
          <Settings size={20} />
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
            <button className="p-2 text-gray-400 hover:text-teal-600 transition-colors shrink-0">
              <Paperclip size={20} />
            </button>
            <textarea 
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

      {/* CONTEXT MODAL (Simulated) */}
      {showContextModal && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-teal-600 p-4 flex justify-between items-center text-white">
              <h3 className="font-bold">Contexto del Asistente</h3>
              <button onClick={() => setShowContextModal(false)} className="text-teal-100 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-500 mb-4">La IA adapta sus respuestas basándose en este perfil:</p>
              
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="bg-teal-100 text-teal-600 p-2 rounded-full"><MapPin size={18}/></div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ubicación</p>
                  <p className="font-semibold text-gray-800">Managua, Nicaragua</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="bg-teal-100 text-teal-600 p-2 rounded-full"><Briefcase size={18}/></div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Trabajo</p>
                  <p className="font-semibold text-gray-800">Centro de Operaciones Agrícolas / E-commerce (Pandastore)</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="bg-teal-100 text-teal-600 p-2 rounded-full"><Baby size={18}/></div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bebé en camino</p>
                  <p className="font-semibold text-gray-800">Sorpresa (Semana 12)</p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 text-center">
              <button onClick={() => setShowContextModal(false)} className="text-teal-600 font-bold text-sm w-full py-2 hover:bg-teal-50 rounded-xl transition-colors">Cerrar</button>
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
            <div className="grid grid-cols-3 bg-gray-50 p-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">
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
  const [names, setNames] = useState([
    { id: 1, text: "Valentina", origin: "Latín", meaning: "Valerosa, vigorosa.", status: "pending", partnerLiked: true, gender: "niña" },
    { id: 2, text: "Mateo", origin: "Hebreo", meaning: "El gran regalo de Dios.", status: "pending", partnerLiked: false, gender: "niño" },
    { id: 3, text: "Noa", origin: "Hebreo", meaning: "Delicia, descanso.", status: "pending", partnerLiked: true, gender: "neutro" },
    { id: 4, text: "Emilio", origin: "Latín", meaning: "El que se esfuerza.", status: "pending", partnerLiked: true, gender: "niño" },
    { id: 5, text: "Lucía", origin: "Latín", meaning: "La que nació a la luz del día.", status: "pending", partnerLiked: false, gender: "niña" },
    { id: 6, text: "Alex", origin: "Griego", meaning: "Defensor/a.", status: "pending", partnerLiked: true, gender: "neutro" },
  ]);

  const [genderFilter, setGenderFilter] = useState<"todos"|"niño"|"niña"|"neutro">("todos");

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
        {matches.length > 0 && (
          <div className="bg-rose-100 text-rose-600 font-bold px-3 py-1 rounded-full text-xs flex items-center gap-1 animate-pulse">
            <Heart size={12} fill="currentColor"/> {matches.length} Matches
          </div>
        )}
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
            <button onClick={() => vote(current.id, "disliked")} className="bg-white border-2 border-gray-100 p-5 rounded-full shadow-sm hover:bg-gray-50 text-gray-400 transition-transform active:scale-90">
              <X size={32} />
            </button>
            <button onClick={() => vote(current.id, "liked")} className="bg-rose-500 p-5 rounded-full shadow-lg hover:bg-rose-600 text-white transition-transform active:scale-90">
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
              onClick={() => {
                showToast("Buscando 10 nombres más...", () => {});
              }}
              className="bg-teal-600 text-white font-bold py-3 px-6 rounded-full shadow-md hover:bg-teal-700 transition-colors flex items-center gap-2 active:scale-95"
            >
              <Bot size={18} /> Pedir más ideas a PandaIA
            </button>
            <button 
              onClick={() => {
                 setNames(prev => prev.map(n => ({...n, status: "pending"})));
              }}
              className="mt-4 text-xs font-bold text-gray-400 hover:text-gray-600 uppercase tracking-wider transition-colors focus:outline-none"
            >
              Volver a votar
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
          <button onClick={prevStep} className="p-4 bg-gray-100 text-gray-600 rounded-2xl hover:bg-gray-200 transition-colors">
            <ArrowLeft size={24} />
          </button>
        )}
        
        {step < 3 ? (
          <button onClick={nextStep} className="flex-1 p-4 bg-teal-600 text-white rounded-2xl font-bold flex justify-center items-center gap-2 hover:bg-teal-700 transition-colors">
            Siguiente <ArrowRight size={20} />
          </button>
        ) : (
          <button className="flex-1 p-4 bg-gray-900 text-white rounded-2xl font-bold flex justify-center items-center gap-2 hover:bg-gray-800 transition-colors">
            <FileDown size={20} /> Generar PDF
          </button>
        )}
      </div>
    </div>
  );
}
