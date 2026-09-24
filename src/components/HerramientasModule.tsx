"use client";

import React, { useState, useEffect } from "react";
import { usePandaStore } from "@/store/usePandaStore";
import { ensureAuth, createPregnancyForMom, joinPregnancyAsDad, listenToPregnancy, listenToMomStatus, updatePregnancyWeek, saveMomStatus, saveEvents, listenToEvents, saveKickSessions, listenToKickSessions, saveContractions, listenToContractions, saveBabyNames, listenToBabyNames, saveBirthPlan, listenToBirthPlan, saveChecklistProgress, listenToChecklistProgress, saveAppointmentPrep, listenToAppointmentPrep } from "@/lib/firebase/pairing";
import Image from "next/image";
import { Compass, Calendar, Bot, Send, CheckCircle2, Circle, Clock, ChevronRight, ChevronLeft, HeartPulse, Baby, Utensils, Info, ChevronDown, ChevronUp, Sparkles, Activity, Heart, X, Play, Square, Plus, Users, ClipboardList, Trophy, BriefcaseMedical, ShoppingBag, Home, FileText, AlertTriangle, AlertCircle, Download, ArrowRight, ArrowLeft, History, CheckCircle, FileDown, Settings, Paperclip, MapPin, Briefcase, Package, Share2, Bell, RotateCcw, Trash2, PhoneCall, Check, Undo2, Printer, Copy, Edit3, Sun, Moon, BookOpen, ExternalLink , Wallet } from "lucide-react";

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


export function SOSSintomas() {
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


export function DiarioView({ profile, onClose }: { profile: UserProfile, onClose: () => void }) {
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

        <div className="flex flex-col gap-5">
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


export function MaletaView({ profile, onClose }: { profile: UserProfile, onClose: () => void }) {
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



export function LecturasView({ week, onClose, showToast }: { week: number, onClose: () => void, showToast: any }) {
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

export function HerramientasView({ showToast, profile }: { showToast: any, profile?: UserProfile }) {
  const [activeTool, setActiveTool] = useState<any>(null);

  const tools = [
    {
      id: "presupuesto",
      icon: <Wallet className="text-emerald-500" size={26} />,
      title: "Presupuesto",
      desc: "Control de gastos",
      color: "bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800/50",
      
    },

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

      <div className="grid grid-cols-2 gap-4 pb-24">
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

export function ContadorPatadas({ showToast }: { showToast: any }) {
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
                <p className="text-xs text-white/80 mt-0.5">10 movimientos completados en {completedSession.durationFormatted}</p>
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

          <p className="text-xs text-white/90 leading-relaxed bg-white/10 p-3 rounded-2xl">
            âš¡ <strong>Evaluación médica:</strong> Tu bebé mostró un ritmo activo y reactivo saludable. La sesión ya está registrada en el historial.
          </p>

          <div>
            <p className="text-xs font-bold tracking-tight text-white/80 mb-2">Añadir contexto a la sesión:</p>
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

export function ContadorContracciones({ showToast }: { showToast: any }) {
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
          <p className="text-xl font-black text-sage dark:text-sage/80 tabular-nums">{history.length > 0 ? formatTime(avgDuration) : "—"}</p>
        </div>
        <div className="bg-white dark:bg-[#221d2d] rounded-3xl p-4 shadow-xs border border-stone-100 dark:border-white/[0.08] flex flex-col items-center justify-center text-center">
          <p className="text-xs text-rose-800 dark:text-rose-300 font-bold tracking-tight mb-1">Frecuencia Promedio</p>
          <p className="text-xl font-black text-rose-600 dark:text-terracotta tabular-nums">{avgInterval ? formatTime(avgInterval) : "—"}</p>
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
            <p className="text-stone-600 dark:text-[#a6a1b2] leading-relaxed">• Ofrece un sorbo pequeño de agua fresca o bálsamo labial.</p>
            <p className="text-stone-600 dark:text-[#a6a1b2] leading-relaxed">• Aplica contrapresión firme con el talón de la mano en el sacro (espalda baja).</p>
            <p className="text-stone-600 dark:text-[#a6a1b2] leading-relaxed">• Recuérdale con voz serena: <em>"Respira profundo, lo estás haciendo genial."</em></p>
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
                    {item.interval ? formatTime(item.interval) : "—"}
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

export function VotadorNombres({ showToast }: { showToast: any }) {
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
            Origen: {current.origin} • {current.gender}
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

export function PlanParto({ profile, showToast }: { profile?: UserProfile, showToast: any }) {
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
        sec.options.filter(o => o.checked).map(o => `• [${sec.category}] ${o.label}`)
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
          <span className="text-sage font-serif text-lg leading-none select-none shrink-0" aria-hidden="true">“</span>
          <p className="flex-1">
            A la atención del equipo obstétrico y pediátrico: Este plan expresa nuestros deseos y preferencias para el proceso de parto y postparto inmediato, entendiendo siempre que la salud y seguridad de la madre y del bebé priman ante cualquier eventualidad médica imprevista.
          </p>
          <span className="text-sage font-serif text-lg leading-none select-none shrink-0 self-end" aria-hidden="true">”</span>
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



// --- CALCULADORA DE PRESUPUESTO DEL BEBÉ ---
export function CalculadoraPresupuesto({ onClose }: { onClose: () => void }) {
  const [budget, setBudget] = useState(5000);
  const [expenses, setExpenses] = useState<{ id: string, name: string, amount: number, category: string }[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pandajr_budget_expenses");
      if (saved) return JSON.parse(saved);
    }
    return [
      { id: "1", name: "Cuna", amount: 350, category: "Habitación" },
      { id: "2", name: "Carriola", amount: 450, category: "Transporte" },
      { id: "3", name: "Pañales RN", amount: 60, category: "Cuidado" }
    ];
  });
  const [newItem, setNewItem] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState("Cuidado");

  useEffect(() => {
    localStorage.setItem("pandajr_budget_expenses", JSON.stringify(expenses));
  }, [expenses]);

  const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const remaining = budget - totalSpent;
  const progressPercent = Math.min((totalSpent / budget) * 100, 100);

  const addExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim() || !newAmount) return;
    const amountNum = parseFloat(newAmount);
    if (isNaN(amountNum)) return;

    setExpenses([{
      id: Date.now().toString(),
      name: newItem,
      amount: amountNum,
      category: newCategory
    }, ...expenses]);
    setNewItem("");
    setNewAmount("");
  };

  const removeExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const categories = ["Cuidado", "Habitación", "Transporte", "Médico", "Ropa", "Otros"];

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1a1625] w-full max-w-lg sm:rounded-3xl rounded-t-3xl h-[85vh] sm:h-auto max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-stone-200 dark:border-white/10 animate-in slide-in-from-bottom-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 p-5 shrink-0 flex items-center justify-between text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div>
            <h2 className="text-xl font-black flex items-center gap-2 relative z-10">
              <Wallet size={24} className="text-emerald-100" />
              Presupuesto del Bebé
            </h2>
            <p className="text-emerald-100/80 text-sm mt-1 relative z-10">Control de gastos y compras</p>
          </div>
          <button onClick={onClose} className="p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors relative z-10">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* Resumen */}
          <div className="bg-stone-50 dark:bg-[#221d2d] rounded-3xl p-5 border border-stone-100 dark:border-white/5">
            <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-sm font-semibold text-stone-500 dark:text-stone-400">Restante</p>
                <p className={`text-3xl font-black tracking-tight ${remaining < 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  ${remaining.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-stone-400">Presupuesto</p>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-stone-700 dark:text-stone-300">$</span>
                  <input 
                    type="number" 
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="w-20 text-sm font-bold text-stone-700 dark:text-stone-300 bg-transparent border-b border-stone-300 dark:border-stone-600 focus:outline-none focus:border-emerald-500 text-right"
                  />
                </div>
              </div>
            </div>

            <div className="h-3 w-full bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${progressPercent > 90 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <p className="text-xs text-stone-500 mt-2 font-medium flex justify-between">
              <span>Gastado: ${totalSpent.toLocaleString()}</span>
              <span>{progressPercent.toFixed(0)}%</span>
            </p>
          </div>

          {/* Agregar Gasto */}
          <form onSubmit={addExpense} className="flex gap-2 bg-white dark:bg-[#221d2d] p-3 rounded-2xl border border-stone-200 dark:border-white/10 shadow-sm focus-within:border-emerald-500 transition-colors">
            <div className="flex-1 flex flex-col gap-2">
              <input 
                type="text" 
                placeholder="Ej. Silla de coche" 
                value={newItem}
                onChange={e => setNewItem(e.target.value)}
                className="w-full text-sm font-semibold bg-transparent focus:outline-none text-stone-700 dark:text-stone-200"
              />
              <div className="flex gap-2">
                <select 
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  className="text-xs bg-stone-100 dark:bg-[#1a1625] text-stone-600 dark:text-stone-300 rounded-lg px-2 py-1 outline-none"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="flex items-center gap-1 text-sm bg-stone-50 dark:bg-[#1a1625] px-2 py-1 rounded-lg">
                  <span className="text-stone-400 font-bold">$</span>
                  <input 
                    type="number"
                    placeholder="0.00"
                    value={newAmount}
                    onChange={e => setNewAmount(e.target.value)}
                    className="w-16 bg-transparent outline-none font-bold text-stone-700 dark:text-stone-200"
                  />
                </div>
              </div>
            </div>
            <button 
              type="submit"
              disabled={!newItem.trim() || !newAmount}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white p-3 rounded-xl transition-all h-full shrink-0 flex items-center justify-center"
            >
              <Plus size={20} />
            </button>
          </form>

          {/* Lista de Gastos */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200">Historial de Compras</h3>
            {expenses.length === 0 ? (
              <div className="text-center py-8 bg-stone-50 dark:bg-[#221d2d] rounded-2xl border border-dashed border-stone-200 dark:border-white/10">
                <Wallet className="mx-auto text-stone-300 dark:text-stone-600 mb-2" size={32} />
                <p className="text-sm font-medium text-stone-500 dark:text-stone-400">Aún no hay gastos registrados.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {expenses.map(expense => (
                  <div key={expense.id} className="flex items-center justify-between p-3 bg-white dark:bg-[#221d2d] rounded-2xl border border-stone-100 dark:border-white/5 shadow-xs group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black text-sm shrink-0">
                        {expense.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-stone-800 dark:text-stone-200 leading-tight">{expense.name}</p>
                        <p className="text-xs font-semibold text-stone-400 mt-0.5">{expense.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-black text-stone-700 dark:text-stone-300">${expense.amount.toLocaleString()}</p>
                      <button 
                        onClick={() => removeExpense(expense.id)}
                        className="text-stone-300 hover:text-rose-500 transition-colors"
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
      </div>
    </div>
  );
}
