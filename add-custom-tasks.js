const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(target, 'utf-8');

const customTasksHook = `
  const [customTasks, setCustomTasks] = React.useState<any[]>([]);
  const [isAddingTask, setIsAddingTask] = React.useState(false);
  const [newTaskText, setNewTaskText] = React.useState("");

  useEffect(() => {
    if (profile.pregnancyId) {
      import('@/lib/firebase/pairing').then(({ listenToCustomTasks }) => {
        return listenToCustomTasks(profile.pregnancyId!, (tasks) => setCustomTasks(tasks));
      });
    }
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
`;

content = content.replace(
  /const categories = React\.useMemo\(\(\) => \{/,
  customTasksHook + '\n  const categories = React.useMemo(() => {'
);

const customTaskRender = `
              {/* Custom Tasks */}
              {customTasks.filter(t => t.trimester === cat.trimester).map(task => (
                <div key={task.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => handleToggleCustomTask(task.id, task.completed)}>
                  <button className={\`mt-0.5 shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-colors \${task.completed ? 'bg-emerald-500 text-white' : 'border-2 border-stone-300 dark:border-stone-600'}\`}>
                    {task.completed && <Check size={14} strokeWidth={3} />}
                  </button>
                  <div className={\`text-sm transition-all \${task.completed ? 'text-stone-400 line-through' : 'text-stone-700 dark:text-stone-300'}\`}>
                    {task.text}
                  </div>
                </div>
              ))}
              
              {/* Add Custom Task Button */}
              {isAddingTask ? (
                <div className="flex gap-2 p-3">
                  <input autoFocus type="text" value={newTaskText} onChange={e => setNewTaskText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCustomTask()} placeholder="Ej. Pintar el cuarto..." className="flex-1 bg-white dark:bg-black border border-stone-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-stone-800 dark:text-white" />
                  <button onClick={handleAddCustomTask} className="bg-terracotta text-white px-3 py-2 rounded-lg text-sm font-bold">Añadir</button>
                  <button onClick={() => setIsAddingTask(false)} className="text-stone-500 px-2"><X size={18} /></button>
                </div>
              ) : (
                <button onClick={() => setIsAddingTask(true)} className="flex items-center gap-2 px-3 py-3 text-sm text-terracotta font-bold hover:bg-terracotta/5 rounded-xl transition-colors w-full">
                  <Plus size={16} /> Añadir tarea propia
                </button>
              )}
`;

content = content.replace(
  /\{cat\.tasks\.map\(\(task, index\) => \([^]+?\}\)\)/m,
  (match) => match + customTaskRender
);

fs.writeFileSync(target, content, 'utf-8');
console.log('Added custom tasks UI properly');
