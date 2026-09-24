const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', 'page.tsx');
let c = fs.readFileSync(target, 'utf-8');

// Fix MomStatusCard to use real remote data
const oldMomStatus = `function MomStatusCard({ profile, remoteMomStatus }: { profile: UserProfile, remoteMomStatus?: any }) {
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
          <span className="text-xs">✨</span>
          <span className="text-[11px] font-bold text-terracotta dark:text-terracotta">Muy feliz y relajada</span>
        </div>
      </div>
      
      {/* Mobile status badge fallback */}
      <div className="sm:hidden flex items-center gap-1.5 bg-terracotta/10 dark:bg-[#2d273a] px-3 py-1.5 rounded-full border border-terracotta/20 dark:border-white/[0.06] mb-3 w-fit">
        <span className="text-xs">✨</span>
        <span className="text-[11px] font-bold text-terracotta dark:text-terracotta">Muy feliz y relajada</span>
      </div>
      
      {/* Quote bubble */}
      <div className="bg-stone-50 dark:bg-[#1a1724] rounded-2xl p-4 mb-4 border border-stone-100 dark:border-white/[0.04] relative">
        <p className="text-sm italic text-stone-700 dark:text-[#eae6e1]/90">
          "¡El masaje de pies fue la gloria! Y el bebé no paró de responder a las caricias antes de cenar 🐼"
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
}`;

const newMomStatus = `function MomStatusCard({ profile, remoteMomStatus }: { profile: UserProfile, remoteMomStatus?: any }) {
  const isMom = profile.role === "mama";
  const nameToUse = isMom ? "tú" : (profile.name || "Mamá");
  const displayStatus = remoteMomStatus?.text || (isMom ? "Aún no has compartido tu estado hoy" : "Mamá no ha compartido su estado hoy");
  const displayEmoji = remoteMomStatus?.emoji || "🤍";
  const timeText = remoteMomStatus?.lastUpdated || "Sin actualizaciones";

  return (
    <div className="bg-white dark:bg-[#221d2d] rounded-3xl shadow-sm border border-stone-200/80 dark:border-white/[0.08] p-5 animate-in fade-in transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-stone-100 border border-stone-200 dark:border-white/[0.06] shrink-0">
            <div className="w-full h-full bg-terracotta/20 flex items-center justify-center text-terracotta font-bold text-lg">
              {isMom ? profile.name?.charAt(0).toUpperCase() || "M" : "M"}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-800 dark:text-[#eae6e1] leading-tight">¿Cómo te sientes {nameToUse}?</h3>
            <p className="text-xs text-stone-500 dark:text-[#a6a1b2] mt-0.5">{timeText}</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 bg-terracotta/10 dark:bg-[#2d273a] px-3 py-1.5 rounded-full border border-terracotta/20 dark:border-white/[0.06] shrink-0">
          <span className="text-xs">{displayEmoji}</span>
          <span className="text-[11px] font-bold text-terracotta dark:text-terracotta">Estado actual</span>
        </div>
      </div>
      
      <div className="sm:hidden flex items-center gap-1.5 bg-terracotta/10 dark:bg-[#2d273a] px-3 py-1.5 rounded-full border border-terracotta/20 dark:border-white/[0.06] mb-3 w-fit">
        <span className="text-xs">{displayEmoji}</span>
        <span className="text-[11px] font-bold text-terracotta dark:text-terracotta">Estado actual</span>
      </div>
      
      <div className="bg-stone-50 dark:bg-[#1a1724] rounded-2xl p-4 mb-4 border border-stone-100 dark:border-white/[0.04] relative">
        <p className="text-sm italic text-stone-700 dark:text-[#eae6e1]/90">
          "{displayStatus}"
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        {isMom ? (
           <button className="w-full sm:flex-1 bg-sage/10 hover:bg-sage/20 dark:bg-sage/20 dark:hover:bg-sage/30 text-sage dark:text-sage-hover border border-sage/20 rounded-xl py-2.5 text-xs font-bold transition-colors flex items-center justify-center gap-2">
             <Heart size={16} />
             Actualizar Estado
           </button>
        ) : (
           <button onClick={() => alert("¡Abrazo virtual enviado a mamá! 💕")} className="w-full sm:flex-1 bg-terracotta hover:bg-terracotta-hover text-white rounded-xl py-2.5 text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm">
             <Heart size={16} />
             Enviar abrazo
           </button>
        )}
      </div>
    </div>
  );
}`;

c = c.replace(oldMomStatus, newMomStatus);

// In AgendaView there is a title that says "Sugerencias del Copiloto IA"
c = c.replace(
  />Sugerencias del Copiloto IA/g,
  '>Sugerencias de PandaIA'
);

fs.writeFileSync(target, c, 'utf-8');
console.log('MomStatusCard polished');
