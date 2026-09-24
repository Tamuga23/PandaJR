const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', 'page.tsx');
let c = fs.readFileSync(target, 'utf-8');

// ============================================================
// STEP 1: Update imports to include all new Firebase functions
// ============================================================
c = c.replace(
  /import \{ ensureAuth, createPregnancyForMom, joinPregnancyAsDad, listenToPregnancy, listenToMomStatus, updatePregnancyWeek, saveMomStatus \} from "@\/lib\/firebase\/pairing";/,
  `import { ensureAuth, createPregnancyForMom, joinPregnancyAsDad, listenToPregnancy, listenToMomStatus, updatePregnancyWeek, saveMomStatus, saveEvents, listenToEvents, saveKickSessions, listenToKickSessions, saveContractions, listenToContractions, saveBabyNames, listenToBabyNames, saveBirthPlan, listenToBirthPlan, saveChecklistProgress, listenToChecklistProgress, saveAppointmentPrep, listenToAppointmentPrep } from "@/lib/firebase/pairing";`
);

// ============================================================
// STEP 2: Role-aware text fixes (profile.role throughout)
// ============================================================

// Fix "Misión del Papá" / "Misión de la Mamá" -> "Tu Misión esta Semana"
c = c.replace(
  /\{profile\.role === "papa" \? "Misión del Papá" : "Misión de la Mamá"\}/g,
  '{profile.role === "papa" ? "Misión del Copiloto" : "Tu Misión"}'
);

// Fix "Checklists del Papá" / "Checklists de la Mamá"
c = c.replace(
  /\{profile\.role === "papa" \? "Checklists del Papá" : "Checklists de la Mamá"\}/g,
  '{profile.role === "papa" ? "Checklists del Copiloto" : "Mis Checklists"}'
);

// Fix weekData.dadMission -> role-aware mission
c = c.replace(
  /\{weekData\.dadMission\}/g,
  '{profile.role === "papa" ? weekData.dadMission : weekData.momMission}'
);

// Fix "Modo Papá" / "Modo Mamá"
c = c.replace(
  /\{profile\.role === "papa" \? "🧑 Modo Papá" : "👩 Modo Mamá"\}/g,
  '{profile.role === "papa" ? "🧑 Modo Copiloto" : "👩 Modo Mamá"}'
);

// ============================================================
// STEP 3: Sync events (agenda) via Firestore instead of localStorage
// ============================================================

// Replace the localStorage load of events with Firebase listener
const oldEventsLoad = `  // Cargar eventos guardados de localStorage y sincronizar si la pareja compartió citas (?sync_events=)
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
  }, [events]);`;

const newEventsSync = `  // Sync events via Firestore (fallback to localStorage for unlinked users)
  const eventsInitialized = React.useRef(false);
  useEffect(() => {
    if (profile?.pregnancyId) {
      const unsub = listenToEvents(profile.pregnancyId, (remoteEvents) => {
        if (remoteEvents.length > 0) {
          setEvents(remoteEvents);
          eventsInitialized.current = true;
        }
      });
      return () => unsub();
    } else {
      // Fallback: load from localStorage for unlinked users
      try {
        const saved = localStorage.getItem("pandajr_events");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) setEvents(parsed);
        }
      } catch(e) {}
    }
  }, [profile?.pregnancyId]);

  // Save events to Firestore (and localStorage as fallback)
  useEffect(() => {
    if (!eventsInitialized.current && events.length <= 3) return; // Skip initial default events
    try {
      localStorage.setItem("pandajr_events", JSON.stringify(events));
    } catch(e) {}
    if (profile?.pregnancyId) {
      saveEvents(profile.pregnancyId, events).catch(() => {});
    }
  }, [events, profile?.pregnancyId]);`;

c = c.replace(oldEventsLoad, newEventsSync);

// ============================================================
// STEP 4: Sync checklist progress via Firestore
// ============================================================
// In GuiaPapaView, the taskStatus state uses local state only.
// We need to sync it with Firestore.
const oldTaskStatus = `  const [taskStatus, setTaskStatus] = React.useState<Record<number, "completed" | "dismissed">>({});`;
const newTaskStatus = `  const [taskStatus, setTaskStatus] = React.useState<Record<number, "completed" | "dismissed">>({});
  
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
  }, [profile.pregnancyId]);`;

c = c.replace(oldTaskStatus, newTaskStatus);

// Also sync when toggling tasks
const oldToggleTask = `  const toggleTask = (catId: string, taskId: number) => {
    setTaskStatus(prev => ({
      ...prev,
      [taskId]: prev[taskId] === "completed" ? undefined : "completed"
    }) as any);
  };`;

const newToggleTask = `  const toggleTask = (catId: string, taskId: number) => {
    setTaskStatus(prev => {
      const next = { ...prev, [taskId]: prev[taskId] === "completed" ? undefined : "completed" } as any;
      // Sync to Firestore
      if (profile.pregnancyId) {
        const progress: Record<string, boolean> = {};
        Object.entries(next).forEach(([k, v]) => { progress[k] = v === "completed"; });
        saveChecklistProgress(profile.pregnancyId, progress).catch(() => {});
      }
      return next;
    });
  };`;

c = c.replace(oldToggleTask, newToggleTask);


// ============================================================
// STEP 5: Sync appointment prep via Firestore
// ============================================================
// In AppointmentPrepModal, replace localStorage with Firestore
c = c.replace(
  `      const saved = localStorage.getItem(\`pandajr_prep_\${event.id}\`);
      if (saved) {
        const { items, questions } = JSON.parse(saved);
        if (items) setCheckedItems(items);
        if (questions) setCheckedQuestions(questions);
      }
    } catch(e) {}
  }, [event.id]);`,
  `      // Try localStorage first as fallback
      const saved = localStorage.getItem(\`pandajr_prep_\${event.id}\`);
      if (saved) {
        const { items, questions } = JSON.parse(saved);
        if (items) setCheckedItems(items);
        if (questions) setCheckedQuestions(questions);
      }
    } catch(e) {}
    // Then listen to Firestore for synced prep data
    const pregnancyId = usePandaStore.getState().profile.pregnancyId;
    if (pregnancyId) {
      const unsub = listenToAppointmentPrep(pregnancyId, String(event.id), (data) => {
        if (data.items && Object.keys(data.items).length > 0) setCheckedItems(data.items);
        if (data.questions && Object.keys(data.questions).length > 0) setCheckedQuestions(data.questions);
      });
      return () => unsub();
    }
  }, [event.id]);`
);

// Sync prep toggle item to Firestore
c = c.replace(
  `      const updated = { ...prev, [item]: !prev[item] };
      try {
        localStorage.setItem(\`pandajr_prep_\${event.id}\`, JSON.stringify({ items: updated, questions: checkedQuestions }));
      } catch(e) {}
      return updated;`,
  `      const updated = { ...prev, [item]: !prev[item] };
      try { localStorage.setItem(\`pandajr_prep_\${event.id}\`, JSON.stringify({ items: updated, questions: checkedQuestions })); } catch(e) {}
      const pid = usePandaStore.getState().profile.pregnancyId;
      if (pid) saveAppointmentPrep(pid, String(event.id), { items: updated, questions: checkedQuestions }).catch(() => {});
      return updated;`
);

c = c.replace(
  `      const updated = { ...prev, [q]: !prev[q] };
      try {
        localStorage.setItem(\`pandajr_prep_\${event.id}\`, JSON.stringify({ items: checkedItems, questions: updated }));
      } catch(e) {}
      return updated;`,
  `      const updated = { ...prev, [q]: !prev[q] };
      try { localStorage.setItem(\`pandajr_prep_\${event.id}\`, JSON.stringify({ items: checkedItems, questions: updated })); } catch(e) {}
      const pid = usePandaStore.getState().profile.pregnancyId;
      if (pid) saveAppointmentPrep(pid, String(event.id), { items: checkedItems, questions: updated }).catch(() => {});
      return updated;`
);

fs.writeFileSync(target, c, 'utf-8');
console.log('STEP 1-5 done: imports, role text, events, checklist, prep sync');
