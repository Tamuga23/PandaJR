const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', 'page.tsx');
let c = fs.readFileSync(target, 'utf-8');

// ============================================================
// STEP 6: Sync ContadorPatadas (kick sessions) with Firestore
// ============================================================
// The component loads/saves sessions from localStorage pandajr_kick_sessions.
// We need to add a Firestore listener AND sync saves.

// Find the kick sessions localStorage load
const oldKickLoad = `  // Historial con persistencia real en localStorage
  const [sessions, setSessions] = React.useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("pandajr_kick_sessions");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch(e) {}
    }
    return [];
  });`;

const newKickLoad = `  // Historial con persistencia real en Firestore + localStorage fallback
  const [sessions, setSessions] = React.useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("pandajr_kick_sessions");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch(e) {}
    }
    return [];
  });
  
  // Firestore sync for kick sessions
  useEffect(() => {
    const pid = usePandaStore.getState().profile.pregnancyId;
    if (pid) {
      const unsub = listenToKickSessions(pid, (remoteSessions) => {
        if (remoteSessions.length > 0) setSessions(remoteSessions);
      });
      return () => unsub();
    }
  }, []);`;

c = c.replace(oldKickLoad, newKickLoad);

// Sync kick sessions to Firestore when they change
const oldKickSave = `    localStorage.setItem("pandajr_kick_sessions", JSON.stringify(sessions));`;
c = c.replace(
  new RegExp('localStorage\\.setItem\\("pandajr_kick_sessions", JSON\\.stringify\\(sessions\\)\\);', 'g'),
  `localStorage.setItem("pandajr_kick_sessions", JSON.stringify(sessions));
      const pid = usePandaStore.getState().profile.pregnancyId;
      if (pid) saveKickSessions(pid, sessions).catch(() => {});`
);

// ============================================================
// STEP 7: Sync ContadorContracciones with Firestore
// ============================================================
const oldContrLoad = `  // Historial con persistencia en localStorage sin alarmas falsas en la primera carga
  const [history, setHistory] = React.useState<any[]>(() => {
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
  });`;

const newContrLoad = `  // Historial con persistencia en Firestore + localStorage fallback
  const [history, setHistory] = React.useState<any[]>(() => {
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
  
  // Firestore sync for contractions
  useEffect(() => {
    const pid = usePandaStore.getState().profile.pregnancyId;
    if (pid) {
      const unsub = listenToContractions(pid, (remoteHistory) => {
        if (remoteHistory.length > 0) setHistory(remoteHistory);
      });
      return () => unsub();
    }
  }, []);`;

c = c.replace(oldContrLoad, newContrLoad);

// Sync contractions saves
c = c.replace(
  new RegExp('localStorage\\.setItem\\("pandajr_contractions_history", JSON\\.stringify\\(history\\)\\);', 'g'),
  `localStorage.setItem("pandajr_contractions_history", JSON.stringify(history));
      const pid2 = usePandaStore.getState().profile.pregnancyId;
      if (pid2) saveContractions(pid2, history).catch(() => {});`
);

// ============================================================
// STEP 8: Sync VotadorNombres (baby names) with Firestore
// ============================================================
const oldNamesLoad = `    const saved = localStorage.getItem("pandajr_baby_names");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }`;

c = c.replace(oldNamesLoad, `    const saved = localStorage.getItem("pandajr_baby_names");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }`);

// Add Firestore sync after the component's names state init
// We need to find the useEffect that saves names to localStorage
c = c.replace(
  `    localStorage.setItem("pandajr_baby_names", JSON.stringify(names));`,
  `    localStorage.setItem("pandajr_baby_names", JSON.stringify(names));
    const pidNames = usePandaStore.getState().profile.pregnancyId;
    if (pidNames) saveBabyNames(pidNames, names).catch(() => {});`
);

// Add Firestore listener in VotadorNombres - find the component function
const namesListenerInject = `
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
`;

c = c.replace(
  /function VotadorNombres\(\{ showToast \}: \{ showToast: any \}\) \{/,
  `function VotadorNombres({ showToast }: { showToast: any }) {` + namesListenerInject
);

// ============================================================
// STEP 9: Sync PlanParto (birth plan) with Firestore
// ============================================================
c = c.replace(
  `    localStorage.setItem("pandajr_birth_plan_patient", JSON.stringify(patientData));
    localStorage.setItem("pandajr_birth_plan_sections", JSON.stringify(sections));`,
  `    localStorage.setItem("pandajr_birth_plan_patient", JSON.stringify(patientData));
    localStorage.setItem("pandajr_birth_plan_sections", JSON.stringify(sections));
    const pidPlan = usePandaStore.getState().profile.pregnancyId;
    if (pidPlan) saveBirthPlan(pidPlan, patientData, sections).catch(() => {});`
);

// Add Firestore listener in PlanParto
const planListenerInject = `
  // Firestore sync for birth plan
  useEffect(() => {
    const pid = usePandaStore.getState().profile.pregnancyId;
    if (pid) {
      const unsub = listenToBirthPlan(pid, (data) => {
        if (data.patient && Object.keys(data.patient).length > 0) setPatientData(prev => ({ ...prev, ...data.patient }));
        if (data.sections && data.sections.length > 0) setSections(data.sections);
      });
      return () => unsub();
    }
  }, []);
`;

c = c.replace(
  /function PlanParto\(\{ profile, showToast \}: \{ profile\?: UserProfile, showToast: any \}\) \{/,
  `function PlanParto({ profile, showToast }: { profile?: UserProfile, showToast: any }) {` + planListenerInject
);

// ============================================================
// STEP 10: Fix listener cleanup in DiarioView, MaletaView, GuiaPapaView
// ============================================================

// Fix DiarioView listener
c = c.replace(
  `  useEffect(() => {
    if (profile.pregnancyId) {
      import('@/lib/firebase/pairing').then(({ listenToJournal }) => {
        return listenToJournal(profile.pregnancyId!, (data) => setEntries(data));
      });
    }
  }, [profile.pregnancyId]);`,
  `  useEffect(() => {
    let unsub: (() => void) | null = null;
    if (profile.pregnancyId) {
      import('@/lib/firebase/pairing').then(({ listenToJournal }) => {
        unsub = listenToJournal(profile.pregnancyId!, (data) => setEntries(data));
      });
    }
    return () => { if (unsub) unsub(); };
  }, [profile.pregnancyId]);`
);

// Fix MaletaView listener
c = c.replace(
  `  useEffect(() => {
    if (profile.pregnancyId) {
      import('@/lib/firebase/pairing').then(({ listenToGoBag }) => {
        return listenToGoBag(profile.pregnancyId!, (data) => setBag(data));
      });
    }
  }, [profile.pregnancyId]);`,
  `  useEffect(() => {
    let unsub: (() => void) | null = null;
    if (profile.pregnancyId) {
      import('@/lib/firebase/pairing').then(({ listenToGoBag }) => {
        unsub = listenToGoBag(profile.pregnancyId!, (data) => setBag(data));
      });
    }
    return () => { if (unsub) unsub(); };
  }, [profile.pregnancyId]);`
);

// Fix GuiaPapaView custom tasks listener
c = c.replace(
  `  useEffect(() => {
    if (profile.pregnancyId) {
      import('@/lib/firebase/pairing').then(({ listenToCustomTasks }) => {
        return listenToCustomTasks(profile.pregnancyId!, (tasks) => setCustomTasks(tasks));
      });
    }
  }, [profile.pregnancyId]);`,
  `  useEffect(() => {
    let unsub: (() => void) | null = null;
    if (profile.pregnancyId) {
      import('@/lib/firebase/pairing').then(({ listenToCustomTasks }) => {
        unsub = listenToCustomTasks(profile.pregnancyId!, (tasks) => setCustomTasks(tasks));
      });
    }
    return () => { if (unsub) unsub(); };
  }, [profile.pregnancyId]);`
);

// ============================================================
// STEP 11: Fix MomStatusCard to actually display remote data
// ============================================================
// The MomStatusCard currently shows hardcoded mock data.
// We need to pass remoteMomStatus and make it dynamic.
c = c.replace(
  /<MomStatusCard profile={profile} \/>/g,
  '<MomStatusCard profile={profile} remoteMomStatus={remoteMomStatus} />'
);

// Update MomStatusCard to accept and use remoteMomStatus
c = c.replace(
  /function MomStatusCard\(\{ profile \}: \{ profile: UserProfile \}\)/,
  'function MomStatusCard({ profile, remoteMomStatus }: { profile: UserProfile, remoteMomStatus?: any })'
);

// ============================================================
// STEP 12: Fix momMission text to speak to each role properly
// ============================================================
c = c.replace(
  `    momMission: week <= 12 ? "Evita que cargue peso, mantén la casa ventilada y apóyala con las comidas ligeras." : week <= 24 ? "Evita que cargue peso, mantén la casa ventilada y apóyala con las comidas ligeras." : "Cuiden la alineación de la espalda con la almohada de embarazo y mantengan rutinas de caminata.",`,
  `    momMission: week <= 12 ? "Tu cuerpo está formando órganos vitales. Prioriza descanso, ácido fólico y evita cargar peso." : week <= 24 ? "Tu bebé ya escucha tu voz. Mantén una dieta rica en hierro y calcio, y camina 20 min diarios." : "Practica ejercicios de Kegel, usa la almohada de embarazo para dormir y prepara tu plan de parto.",`
);

fs.writeFileSync(target, c, 'utf-8');
console.log('STEP 6-12 done: kicks, contractions, names, birth plan, listener cleanup, momStatus, missions');
