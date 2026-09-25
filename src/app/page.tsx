"use client";

import { AgendaView, AppointmentPrepModal, parseEventDate } from "@/components/AgendaModule";
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
              disabled={!name || isLoading}
                className="w-full bg-terracotta hover:bg-terracotta-hover text-white rounded-xl py-3.5 font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {isLoading ? "Generando..." : "Generar mi código"}
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
                className="w-full bg-sage hover:bg-sage-hover text-white rounded-xl py-3.5 font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
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
                onClick={() => {
                  const text = `¡Hola! Únete a nuestro diario de embarazo en PandaJR. Nuestro código de vinculación es: ${generatedCode}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl py-3.5 font-bold transition-all flex items-center justify-center gap-2 shadow-sm mb-3"
              >
                <Share2 size={20} />
                Compartir por WhatsApp
              </button>
              
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

    // 1. Sincronizar eventos con Firebase o localStorage
  useEffect(() => {
    if (profile.pregnancyId) {
      const unsub = listenToEvents(profile.pregnancyId, (items) => {
        if (items && items.length > 0) {
          setEvents(items);
        } else {
          setEvents([]);
        }
      });
      return () => unsub();
    } else {
      try {
        const saved = localStorage.getItem("pandajr_events");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setEvents(parsed);
          }
        }
        
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
                const cleanUrl = new URL(window.location.href);
                cleanUrl.searchParams.delete("sync_events");
                window.history.replaceState({}, "", cleanUrl.pathname);
              }
            } catch (err) {
              console.error(err);
            }
          }
        }
      } catch (e) {}
    }
  }, [profile.pregnancyId]);

  // 2. Guardar eventos cuando cambian
  const eventsStr = JSON.stringify(events);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (profile.pregnancyId) {
          saveEvents(profile.pregnancyId, events);
        } else {
          localStorage.setItem("pandajr_events", JSON.stringify(events));
        }
      } catch (e) {}
    }, 500);
    return () => clearTimeout(timer);
  }, [eventsStr, profile.pregnancyId]);

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
    <div className={`flex flex-col ${activeTab === "pandaia" ? "h-screen overflow-hidden" : "min-h-screen pb-[calc(3.5rem+var(--safe-bottom))]"} w-full max-w-md mx-auto bg-[#faf9f5] dark:bg-[#181520] text-stone-900 dark:text-[#eae6e1] font-sans relative shadow-2xl overflow-x-hidden transition-colors duration-200 border-x border-stone-200/60 dark:border-white/[0.08]`}>
      {/* Header con Logo, Switch Modo Oscuro, Alerta de Cita y Selector Global de Perfil */}
      <header className="bg-white/95 dark:bg-[#181520]/95 backdrop-blur-md px-3 sm:px-4 pt-[var(--safe-top)] pb-2.5 shadow-xs border-b border-stone-200/70 dark:border-white/[0.08] sticky top-0 z-40 w-full flex items-center justify-between shrink-0 transition-colors">
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
            profile={profile}
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
      <nav aria-label="Navegación principal" className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 dark:bg-[#181520]/95 backdrop-blur-md border-t border-stone-200/80 dark:border-white/[0.08] flex justify-around items-center px-2 pt-2 pb-[var(--safe-bottom)] z-50 transition-colors">
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
  const [isEditing, setIsEditing] = React.useState(false);
  const [text, setText] = React.useState("");
  const [emoji, setEmoji] = React.useState("😊");

  const emojis = ["😊", "😴", "🤢", "😭", "🥰", "😡", "🧘‍♀️", "🤰"];

  const handleSave = async () => {
    if (profile.pregnancyId && profile.role === "mama") {
      import('@/lib/firebase/pairing').then(({ saveMomStatus }) => {
        saveMomStatus(profile.pregnancyId!, text || "Me siento bien", emoji);
      });
    }
    setIsEditing(false);
  };

  const statusText = remoteMomStatus?.text || (profile.role === "mama" ? "Aún no has compartido cómo te sientes hoy." : "Aún no ha actualizado su estado hoy.");
  const statusEmoji = remoteMomStatus?.emoji || "💭";
  const statusTime = remoteMomStatus?.lastUpdated || "Recientemente";

  if (isEditing) {
    return (
      <div className="bg-gradient-to-br from-terracotta/10 to-white dark:from-[#2a222f] dark:to-[#1a1724] rounded-3xl shadow-sm border border-terracotta/20 dark:border-terracotta/10 p-6 animate-in fade-in transition-colors">
        <h3 className="text-base font-black text-stone-800 dark:text-[#eae6e1] mb-3">¿Cómo te sientes hoy?</h3>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {emojis.map(e => (
            <button 
              key={e} 
              onClick={() => setEmoji(e)}
              className={`text-2xl p-2 rounded-xl transition-all ${emoji === e ? 'bg-terracotta/20 scale-110' : 'hover:bg-stone-100 dark:hover:bg-white/5 opacity-60 hover:opacity-100'}`}
            >
              {e}
            </button>
          ))}
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe un breve mensaje para tu copiloto..."
          className="w-full bg-stone-50 dark:bg-[#1a1724] rounded-xl p-3 text-sm border border-stone-200 dark:border-white/10 dark:text-white mb-4 resize-none h-24 focus:ring-2 focus:ring-terracotta/50 outline-none"
        />

        <div className="flex gap-2">
          <button onClick={() => setIsEditing(false)} className="flex-1 bg-stone-100 dark:bg-white/5 hover:bg-stone-200 dark:hover:bg-white/10 text-stone-600 dark:text-stone-300 font-bold py-2.5 rounded-xl transition-colors">Cancelar</button>
          <button onClick={handleSave} className="flex-1 bg-terracotta hover:bg-terracotta-hover text-white font-bold py-2.5 rounded-xl transition-colors">Guardar Estado</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-terracotta/10 to-white dark:from-[#2a222f] dark:to-[#1a1724] rounded-3xl shadow-sm border border-terracotta/20 dark:border-terracotta/10 p-6 animate-in fade-in transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-stone-100 border border-stone-200 dark:border-white/[0.06] shrink-0">
            <div className="w-full h-full bg-terracotta/20 flex items-center justify-center text-terracotta font-bold text-lg">
              {profile.role === "mama" ? (profile.name ? profile.name.charAt(0).toUpperCase() : "M") : (profile.name ? "M" : "E")}
            </div>
          </div>
          <div>
            <h3 className="text-base font-black text-stone-800 dark:text-[#eae6e1] tracking-tight leading-tight">
              {profile.role === "mama" ? "¿Cómo te sientes hoy?" : `Estado de mamá hoy`}
            </h3>
            <p className="text-xs text-stone-500 dark:text-[#a6a1b2] mt-0.5">
              {remoteMomStatus ? `Actualizado ${statusTime}` : "Sin actualizaciones recientes"}
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 bg-terracotta/10 dark:bg-[#2d273a] px-3 py-1.5 rounded-full border border-terracotta/20 dark:border-white/[0.06] shrink-0">
          <span className="text-xl">{statusEmoji}</span>
        </div>
      </div>
      
      <div className="sm:hidden flex items-center gap-1.5 bg-terracotta/10 dark:bg-[#2d273a] px-3 py-1.5 rounded-full border border-terracotta/20 dark:border-white/[0.06] mb-3 w-fit">
        <span className="text-xl">{statusEmoji}</span>
      </div>
      
      <div className="bg-stone-50 dark:bg-[#1a1724] rounded-2xl p-4 mb-4 border border-stone-100 dark:border-white/[0.04] relative">
        <p className="text-sm italic text-stone-700 dark:text-[#eae6e1]/90">
          "{statusText}"
        </p>
      </div>

      {profile.role === "mama" ? (
        <button 
          onClick={() => {
            setText(remoteMomStatus?.text || "");
            setEmoji(remoteMomStatus?.emoji || "😊");
            setIsEditing(true);
          }} 
          className="w-full bg-terracotta/10 hover:bg-terracotta/20 dark:bg-terracotta/20 dark:hover:bg-terracotta/30 text-terracotta dark:text-terracotta-hover border border-terracotta/20 rounded-xl py-2.5 text-xs font-bold transition-colors flex items-center justify-center gap-2"
        >
          <Edit3 size={16} />
          Actualizar mi estado
        </button>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button onClick={() => {}} className="w-full sm:flex-1 bg-sage/10 hover:bg-sage/20 dark:bg-sage/20 dark:hover:bg-sage/30 text-sage dark:text-sage-hover border border-sage/20 rounded-xl py-2.5 text-xs font-bold transition-colors flex items-center justify-center gap-2">
            <Heart size={16} />
            Mandar abrazo virtual
          </button>
        </div>
      )}
    </div>
  );
}

    // --- VISTA 1: GUÍA DEL PAPÁ ---
const masterCategories = [
  // TRIMESTRE 1 (Semanas 1-13)
  {
    id: "t1_nutricion", trimester: 1, defaultExpanded: true,
    title: "Neuro-Nutrición & Clínico",
    icon: <Utensils className="text-terracotta/100" size={20} />, color: "bg-terracotta/10",
    tasks: [
      { id: 110, text: "Garantizar Ácido Fólico (mín 400 mcg/día)", detail: "Previene defectos del tubo neural (espina bífida) en esta fase crítica." },
      { id: 111, text: "Eliminar embutidos crudos, sushi y quesos no pasteurizados", detail: "Prevención estricta de Listeriosis y Toxoplasmosis." },
      { id: 112, text: "Agendar primer control y ecografía precoz (Semanas 6-8)", detail: "Para confirmar viabilidad, ubicación uterina y latido fetal." }
    ]
  },
  {
    id: "t1_entorno", trimester: 1, defaultExpanded: true,
    title: "Escudo Ambiental & Soporte",
    icon: <AlertTriangle className="text-terracotta/100" size={20} />, color: "bg-terracotta/10",
    tasks: [
      { id: 113, text: "Asumir la limpieza de cajas de arena (Gatos)", detail: "Riesgo alto de Toxoplasmosis para la madre; el copiloto debe hacerlo." },
      { id: 114, text: "Mitigar náuseas matutinas (Hiperémesis)", detail: "Tener siempre galletas saladas en su buró antes de que se levante." },
      { id: 115, text: "Revisar productos de limpieza", detail: "Alejar parabenos, ftalatos y evitar limpiar con lejía/amoniaco en espacios cerrados." }
    ]
  },
  
  // TRIMESTRE 2 (Semanas 14-27)
  {
    id: "t2_nutricion", trimester: 2, defaultExpanded: true,
    title: "Desarrollo Fetal & Clínico",
    icon: <HeartPulse className="text-sage" size={20} />, color: "bg-sage/10",
    tasks: [
      { id: 210, text: "Incrementar ingesta de Hierro y Vitamina C", detail: "El volumen de sangre materna aumenta 50%, el hierro previene la anemia." },
      { id: 211, text: "Suplementación con DHA (Omega-3)", detail: "Fundamental para la explosión sináptica del cerebro fetal y la retina." },
      { id: 212, text: "Agendar Ecografía Morfológica (Semanas 20-22)", detail: "El ultrasonido más detallado para descartar anomalías anatómicas." },
      { id: 213, text: "Test de O'Sullivan (Semanas 24-28)", detail: "Curva de tolerancia a la glucosa para descartar diabetes gestacional." }
    ]
  },
  {
    id: "t2_preparacion", trimester: 2, defaultExpanded: true,
    title: "Preparación al Parto",
    icon: <Baby className="text-sage" size={20} />, color: "bg-sage/10",
    tasks: [
      { id: 214, text: "Acondicionar ergonomía para el descanso", detail: "Conseguir almohada de embarazo (forma de U/C) para aliviar la ciática pélvica." },
      { id: 215, text: "Inscribirse en clases de psicoprofilaxis perinatal", detail: "Aprender juntos técnicas de respiración, masaje y posiciones de parto." },
      { id: 216, text: "Pintar y ventilar la habitación del bebé", detail: "Hacerlo ahora para asegurar que los gases tóxicos (COVs) se disipen a tiempo." }
    ]
  },

  // TRIMESTRE 3 (Semanas 28-40)
  {
    id: "t3_clinico", trimester: 3, defaultExpanded: true,
    title: "Recta Final & Clínica",
    icon: <Activity className="text-amber-500" size={20} />, color: "bg-amber-100/50 dark:bg-amber-500/10",
    tasks: [
      { id: 310, text: "Aplicar vacuna Tdap materno (Semanas 27-36)", detail: "Traspasa anticuerpos al bebé contra tos ferina, tétanos y difteria." },
      { id: 311, text: "Agendar Cultivo de Estreptococo Grupo B (SGB)", detail: "Semana 35-37. Previene infecciones neonatales graves durante el parto vaginal." },
      { id: 312, text: "Conocer Regla 5-1-1 y Signos de Alarma", detail: "Practica con la app para saber exactamente cuándo ir a urgencias (sangrado, baja de movimientos)." }
    ]
  },
  {
    id: "t3_logistica", trimester: 3, defaultExpanded: true,
    title: "Logística y Supervivencia",
    icon: <ClipboardList className="text-amber-500" size={20} />, color: "bg-amber-100/50 dark:bg-amber-500/10",
    tasks: [
      { id: 313, text: "Vacunar al círculo íntimo (Estrategia Capullo)", detail: "El papá y abuelos cuidadores deben tener la vacuna Tdap e Influenza al día." },
      { id: 314, text: "Instalar y certificar la silla de auto (Car Seat)", detail: "El hospital no les dará el alta si el bebé no está asegurado correctamente en el auto." },
      { id: 315, text: "Armar maleta del hospital y simular ruta", detail: "Hacer simulacro nocturno de manejo para medir tiempos y saber por qué puerta entrar de madrugada." }
    ]
  }
];;

function getWeekData(week: number, theme: "frutas"|"geek" = "frutas") {
  const weeklyDetails = [
    { w: 1, s: { f: "Preparación", g: "Loading..." }, l: "0 cm", wg: "0 g", m: "Preparación del cuerpo", dm: "Planifica una dieta sana y comiencen a tomar vitaminas prenatales.", mm: "Tu cuerpo se prepara para la ovulación. Es un buen momento para iniciar el ácido fólico." },
    { w: 2, s: { f: "Óvulo liberado", g: "Start!" }, l: "0 cm", wg: "0 g", m: "Semana de ovulación", dm: "Días clave. Mantén un ambiente relajado y romántico.", mm: "El cuerpo libera el óvulo. Relájate y mantén un estilo de vida saludable." },
    { w: 3, s: { f: "Semilla de vainilla", g: "Píxel" }, l: "0.01 cm", wg: "0 g", m: "Fecundación", dm: "Apoya a tu pareja; es un proceso invisible pero biológicamente intenso.", mm: "El óvulo fecundado viaja al útero. Puedes sentir leves calambres." },
    { w: 4, s: { f: "Semilla de amapola", g: "Dado D20 miniatura" }, l: "0.1 cm", wg: "1 g", m: "Implantación en el útero", dm: "Eviten el alcohol y el tabaco en casa. Cocina rico y sano.", mm: "El embrión se implanta. Inicia la formación del tubo neural." },
    { w: 5, s: { f: "Grano de pimienta", g: "Tecla de teclado" }, l: "0.3 cm", wg: "1 g", m: "El corazón empieza a latir", dm: "Es normal que sienta mucho cansancio. Ofrécete a hacer las tareas pesadas.", mm: "Tu volumen de sangre aumenta. Descansa siempre que lo necesites." },
    { w: 6, s: { f: "Semilla de granada", g: "Microchip" }, l: "0.6 cm", wg: "1 g", m: "Formación de rostro y extremidades", dm: "Las náuseas pueden aparecer. Ten galletas saladas junto a la cama.", mm: "Las hormonas suben. Come pequeñas porciones y mantente hidratada." },
    { w: 7, s: { f: "Arándano", g: "Dado D6 estándar" }, l: "1.0 cm", wg: "1 g", m: "Desarrollo del cerebro a gran velocidad", dm: "El cerebro fetal genera 100 neuronas por minuto. Prepara cenas ricas en DHA (salmón).", mm: "Sentirás más ganas de ir al baño. No reduzcas tu consumo de agua." },
    { w: 8, s: { f: "Frambuesa", g: "Ficha de LEGO de 1x1" }, l: "1.6 cm", wg: "1 g", m: "Se forman los deditos", dm: "Acompáñala a la primera ecografía si es posible. ¡Escucharán el corazón!", mm: "El cordón umbilical ya funciona por completo." },
    { w: 9, s: { f: "Cereza", g: "Moneda de arcade" }, l: "2.3 cm", wg: "2 g", m: "Desarrollo de articulaciones", dm: "La sensibilidad a los olores es alta. Evita perfumes fuertes o cocinar cosas intensas.", mm: "Los pechos pueden sentirse muy sensibles; usa un sostén cómodo." },
    { w: 10, s: { f: "Fresa", g: "Tamagotchi" }, l: "3.1 cm", wg: "4 g", m: "Fin de la organogénesis crítica", dm: "Los órganos vitales ya están formados. Celebra este primer gran hito con ella.", mm: "¡Termina el periodo embrionario! El riesgo de malformaciones baja drásticamente." },
    { w: 12, s: { f: "Ciruela", g: "Mouse de computadora pequeño" }, l: "5.4 cm", wg: "14 g", m: "Reflejos incipientes", dm: "Fin del primer trimestre. Es un gran momento para planear dar la noticia.", mm: "Las náuseas suelen empezar a ceder. Tu útero crece por encima de la pelvis." },
    { w: 14, s: { f: "Limón", g: "Goma de borrar" }, l: "8.7 cm", wg: "43 g", m: "Comienza el segundo trimestre", dm: "Su energía regresará. Planeen alguna salida especial o una 'babymoon'.", mm: "Empieza la etapa más cómoda. ¡Disfruta el retorno de tu energía!" },
    { w: 16, s: { f: "Aguacate", g: "Control de Switch (Joy-Con)" }, l: "11.6 cm", wg: "100 g", m: "Glándula tiroides funcional", dm: "El bebé ya escucha. Empieza a hablarle a la barriga o léele cuentos.", mm: "Puedes empezar a sentir un 'aleteo'. Es el bebé moviéndose." },
    { w: 20, s: { f: "Plátano", g: "Nintendo Game Boy" }, l: "25.6 cm", wg: "300 g", m: "Ecografía morfológica", dm: "Cita médica crucial. Se revisa toda la anatomía del bebé.", mm: "La barriga ya es evidente. Duerme de lado (preferiblemente izquierdo)." },
    { w: 24, s: { f: "Mazorca de maíz", g: "Sable de luz (mango)" }, l: "30.0 cm", wg: "600 g", m: "Viabilidad fetal", dm: "El bebé ya podría sobrevivir fuera del útero. Hora de armar el presupuesto.", mm: "Prueba de glucosa a la vista. Mantén una dieta equilibrada." },
    { w: 27, s: { f: "Coliflor", g: "iPad Mini" }, l: "36.6 cm", wg: "875 g", m: "Abre los ojos", dm: "Tercer trimestre a la vuelta. Empiecen a cotizar sillas para el auto.", mm: "Puedes sentir hipo fetal (pequeños saltitos rítmicos)." },
    { w: 30, s: { f: "Repollo", g: "Casco de realidad virtual" }, l: "39.9 cm", wg: "1319 g", m: "Desarrollo de corteza cerebral", dm: "Ensambla la cuna. Deja la logística lista en casa.", mm: "El cansancio vuelve. Descansa con las piernas en alto para evitar hinchazón." },
    { w: 34, s: { f: "Melón cantalupo", g: "Consola Steam Deck" }, l: "45.0 cm", wg: "2146 g", m: "Maduración pulmonar", dm: "Revisen la ruta al hospital. Prepara tu maleta también.", mm: "El espacio es reducido, las patadas pueden sentirse más como estiramientos." },
    { w: 38, s: { f: "Calabaza", g: "Consola Retro grande" }, l: "49.8 cm", wg: "3083 g", m: "Embarazo a término", dm: "Ten el tanque del auto lleno y el teléfono cargado siempre.", mm: "Atenta a las contracciones regulares. Descansa todo lo que puedas." },
    { w: 40, s: { f: "Sandía pequeña", g: "PlayStation 5" }, l: "51.2 cm", wg: "3462 g", m: "¡Llegada inminente!", dm: "El gran día. Mantén la calma, respira y sé su pilar de apoyo.", mm: "Confía en tu cuerpo, está diseñado para esto. ¡Ya casi conoces a tu bebé!" },
  ];

  let closest = weeklyDetails[0];
  for (let d of weeklyDetails) {
    if (d.w <= week) closest = d;
  }
  
  return {
    size: theme === "geek" ? closest.s.g : closest.s.f,
    length: closest.l,
    weight: closest.wg,
    milestone: closest.m,
    momMission: closest.mm,
    dadMission: closest.dm
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
              <p className="text-2xl font-black tracking-tight text-stone-800 dark:text-[#eae6e1]">{weekData.size}</p>
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
      <div className="pt-2"><MomStatusCard profile={profile} remoteMomStatus={remoteMomStatus} /></div>

      {/* 2. Checklist Module */}
      <div>
        <div className="flex justify-between items-baseline mb-4">
          <h2 className="text-2xl font-black tracking-tight text-stone-800 dark:text-[#eae6e1]">
            {profile.role === "papa" ? "Checklists del Copiloto" : "Mis Checklists"}
          </h2>
          <span className="text-terracotta dark:text-sage font-bold text-sm">{progressPercent}% completado</span>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-stone-200 dark:bg-[#2d273a] rounded-full h-2.5 mb-5 overflow-hidden">
          <div className="bg-terracotta h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
        </div>

        <div className="flex flex-col gap-5">
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
                <div className="p-4 pt-0 border-t border-stone-100 dark:border-white/[0.06] bg-sage/5 dark:bg-[#181520]/60">
                  <div className="flex flex-col gap-2.5 mt-4">
                    {cat.tasks.map(task => (
                      <button 
                        key={task.id} 
                        onClick={() => toggleTask(cat.id, task.id)}
                        aria-checked={task.completed}
                        role="switch"
                        className="w-full text-left flex items-start gap-3 p-3 bg-white dark:bg-[#2d273a] rounded-xl border border-stone-200/80 dark:border-white/[0.06] cursor-pointer hover:border-sage/30 dark:hover:border-sage transition-colors group focus:outline-none focus:ring-2 focus:ring-sage/100"
                      >
                        <div className={`mt-0.5 shrink-0 transition-all duration-300 ${task.completed ? "text-terracotta scale-110" : "text-stone-400 dark:text-[#a6a1b2] group-hover:text-sage group-hover:scale-110"}`}>
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

      const isBullet = trimmed.startsWith("• ") || trimmed.startsWith("- ") || trimmed.startsWith("* ");
      const cleanLine = isBullet ? trimmed.replace(/^([•\-*]\s+)/, "") : line;

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
            <span className="text-terracotta dark:text-sage font-bold shrink-0 mt-0.5">•</span>
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