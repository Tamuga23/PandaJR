"use client";

import React, { useCallback, useId, useRef, useState } from "react";
import { Check, CircleAlert, LoaderCircle, RotateCw, X } from "lucide-react";
import { usePandaStore } from "@/store/usePandaStore";
import { useCareTeam, useDetectedEmergency } from "@/lib/useCareTeam";
import { ModalPortal } from "@/components/ModalPortal";
import { useModalDialog } from "@/lib/useModalDialog";
import { Z_CLASS } from "@/lib/layers";

type FormValues = {
  obName: string;
  obPhone: string;
  hospitalName: string;
  hospitalAddress: string;
  emergencyNumber: string;
};

type PhoneField = "obPhone" | "emergencyNumber";

const MIN_DIGITS: Record<PhoneField, number> = { obPhone: 7, emergencyNumber: 3 };

function phoneProblem(value: string, minDigits: number): string | null {
  const v = value.trim();
  if (!v) return null;
  if (/[^\d+\s().-]/.test(v)) return "Usa solo números, espacios, guiones o el signo +.";
  const digits = v.replace(/\D/g, "");
  if (digits.length < minDigits) return `Parece incompleto: revisa que tenga al menos ${minDigits} dígitos.`;
  if (digits.length > 15) return "Parece demasiado largo: revisa el número.";
  return null;
}

const inputClass =
  "w-full min-h-[48px] rounded-xl border bg-white dark:bg-[#181520] px-4 py-2.5 text-base text-stone-900 dark:text-[#eae6e1] " +
  // Borde ≥3:1 con el fondo de la hoja (1.4.11): stone-500 4.63:1 sobre #fdfbf7 · white/40 3.73:1 sobre #221d2d.
  "placeholder:text-stone-500 dark:placeholder:text-[#948fa1] border-stone-500 dark:border-white/40 " +
  // Foco: anillo de tinta de 2px con separación (visible también en modo de alto contraste).
  "transition-colors focus:border-terracotta-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink " +
  "aria-[invalid=true]:border-terracotta-ink disabled:opacity-60";

const labelClass = "block text-sm font-semibold text-stone-800 dark:text-[#eae6e1] mb-1.5";
const helpClass = "mt-1.5 text-sm leading-snug text-stone-600 dark:text-[#a6a1b2]";
const errorClass = "mt-1.5 flex items-start gap-1.5 text-sm leading-snug font-medium text-terracotta-ink";

export function CareTeamForm({ onSaved, onCancel }: { onSaved?: () => void; onCancel?: () => void }) {
  const { careTeam, save, saving, error } = useCareTeam();
  const detected = useDetectedEmergency();
  const pregnancyId = usePandaStore((s) => s.profile.pregnancyId);
  // El papá también completa la hoja: "su obstetra" (el de la mamá), como en CallActions.
  const isPapa = usePandaStore((s) => s.profile.role) === "papa";
  const whose = isPapa ? "su" : "tu";
  const uid = useId();
  const ids = {
    obName: `${uid}-ob-name`,
    obPhone: `${uid}-ob-phone`,
    hospitalName: `${uid}-hospital`,
    hospitalAddress: `${uid}-address`,
    emergencyNumber: `${uid}-emergency`,
  };

  // Número de emergencias: con detección confiable se prellena; si no, queda vacío con el
  // detectado como ejemplo, para que guardar el obstetra no lo dé por confirmado.
  const [initialEmergency] = useState(() => careTeam.emergencyNumber ?? (detected.confident ? detected.number : ""));
  const hadCustomEmergency = !!careTeam.emergencyNumber;
  const [values, setValues] = useState<FormValues>(() => ({
    obName: careTeam.obName ?? "",
    obPhone: careTeam.obPhone ?? "",
    hospitalName: careTeam.hospitalName ?? "",
    hospitalAddress: careTeam.hospitalAddress ?? "",
    emergencyNumber: initialEmergency,
  }));
  const [touched, setTouched] = useState<Partial<Record<PhoneField, boolean>>>({});
  const [savedOk, setSavedOk] = useState(false);
  const obPhoneRef = useRef<HTMLInputElement>(null);
  const emergencyRef = useRef<HTMLInputElement>(null);

  const errors: Record<PhoneField, string | null> = {
    obPhone: phoneProblem(values.obPhone, MIN_DIGITS.obPhone),
    emergencyNumber: phoneProblem(values.emergencyNumber, MIN_DIGITS.emergencyNumber),
  };
  const showError = (field: PhoneField) => (touched[field] ? errors[field] : null);

  const update = (field: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSavedOk(false);
    setValues((prev) => ({ ...prev, [field]: e.target.value }));
  };
  const markTouched = (field: PhoneField) => () => setTouched((prev) => ({ ...prev, [field]: true }));

  const submit = async () => {
    if (saving) return;
    setTouched({ obPhone: true, emergencyNumber: true });
    if (errors.obPhone) {
      obPhoneRef.current?.focus();
      return;
    }
    if (errors.emergencyNumber) {
      emergencyRef.current?.focus();
      return;
    }
    // Solo se guarda (y se comparte con la pareja) si ya era propio o la usuaria lo escribió;
    // si no, cada teléfono sigue usando el número detectado para su región.
    const emergencyEdited = values.emergencyNumber.trim() !== initialEmergency.trim();
    try {
      await save({
        ...values,
        emergencyNumber: hadCustomEmergency || emergencyEdited ? values.emergencyNumber : undefined,
      });
      setSavedOk(true);
      onSaved?.();
    } catch {
      // El hook ya expone un mensaje legible en `error`; los datos quedaron en el teléfono.
    }
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void submit();
  };

  const obPhoneError = showError("obPhone");
  const emergencyError = showError("emergencyNumber");
  const emergencyHelp = hadCustomEmergency
    ? `Número guardado. En este teléfono detectamos el ${detected.number}; bórralo para usar el detectado.`
    : detected.confident
      ? `Detectado para tu región: ${detected.number}. Cámbialo si no es correcto.`
      : "No pudimos detectar tu región: confirma el número de emergencias de tu país.";

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6" aria-busy={saving}>
      <p className="text-sm leading-relaxed text-stone-600 dark:text-[#a6a1b2]">
        {pregnancyId
          ? "Se comparte con tu pareja para que los dos tengan los mismos números a mano."
          : "Se guarda en este teléfono."}{" "}
        Completa lo que tengas; puedes volver después.
      </p>

      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor={ids.obName} className={labelClass}>Nombre de {whose} obstetra</label>
          <input
            id={ids.obName}
            type="text"
            autoComplete="off"
            autoCapitalize="words"
            maxLength={200}
            placeholder="Ej. Dra. Ana Pérez"
            value={values.obName}
            onChange={update("obName")}
            disabled={saving}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={ids.obPhone} className={labelClass}>Teléfono de {whose} obstetra</label>
          <input
            ref={obPhoneRef}
            id={ids.obPhone}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={40}
            placeholder="Ej. +52 55 1234 5678"
            value={values.obPhone}
            onChange={update("obPhone")}
            onBlur={markTouched("obPhone")}
            disabled={saving}
            aria-invalid={obPhoneError ? true : undefined}
            aria-describedby={obPhoneError ? `${ids.obPhone}-error` : undefined}
            className={`${inputClass} tabular-nums`}
          />
          {obPhoneError && (
            <p id={`${ids.obPhone}-error`} className={errorClass}>
              <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              {obPhoneError}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor={ids.hospitalName} className={labelClass}>Hospital o clínica</label>
          <input
            id={ids.hospitalName}
            type="text"
            autoComplete="off"
            maxLength={200}
            placeholder={isPapa ? "Donde planean el parto" : "Donde planeas dar a luz"}
            value={values.hospitalName}
            onChange={update("hospitalName")}
            disabled={saving}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={ids.hospitalAddress} className={labelClass}>
            Dirección <span className="font-normal text-stone-600 dark:text-[#a6a1b2]">(opcional)</span>
          </label>
          <input
            id={ids.hospitalAddress}
            type="text"
            autoComplete="off"
            maxLength={200}
            placeholder="Calle, número y ciudad"
            value={values.hospitalAddress}
            onChange={update("hospitalAddress")}
            disabled={saving}
            aria-describedby={`${ids.hospitalAddress}-help`}
            className={inputClass}
          />
          <p id={`${ids.hospitalAddress}-help`} className={helpClass}>
            Con la dirección, el mapa encuentra el lugar con más precisión.
          </p>
        </div>
      </div>

      <div>
        <label htmlFor={ids.emergencyNumber} className={labelClass}>Número de emergencias</label>
        <input
          ref={emergencyRef}
          id={ids.emergencyNumber}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          maxLength={20}
          placeholder={`Ej. ${detected.number}`}
          value={values.emergencyNumber}
          onChange={update("emergencyNumber")}
          onBlur={markTouched("emergencyNumber")}
          disabled={saving}
          aria-invalid={emergencyError ? true : undefined}
          aria-describedby={`${ids.emergencyNumber}-help${emergencyError ? ` ${ids.emergencyNumber}-error` : ""}`}
          className={`${inputClass} tabular-nums`}
        />
        <p id={`${ids.emergencyNumber}-help`} className={helpClass}>{emergencyHelp}</p>
        {emergencyError && (
          <p id={`${ids.emergencyNumber}-error`} className={errorClass}>
            <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            {emergencyError}
          </p>
        )}
      </div>

      {error && (
        <div role="alert" className="flex flex-col gap-2 rounded-2xl bg-terracotta/10 dark:bg-terracotta/15 p-4">
          <p className="flex items-start gap-2 text-sm leading-snug text-stone-800 dark:text-[#eae6e1]">
            <CircleAlert size={18} className="mt-0.5 shrink-0 text-terracotta-ink" aria-hidden="true" />
            {error}
          </p>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className="self-start inline-flex items-center gap-1.5 min-h-[44px] px-3 -ml-1 rounded-xl text-sm font-bold text-terracotta-ink hover:bg-terracotta/10 disabled:opacity-60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
          >
            <RotateCw size={16} aria-hidden="true" />
            Reintentar
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          disabled={saving}
          className="w-full min-h-[52px] inline-flex items-center justify-center gap-2 rounded-2xl bg-terracotta-ink hover:bg-terracotta-ink-hover text-white text-base font-bold shadow-[0_2px_8px_-2px_rgba(165,72,51,0.4)] transition-[background-color,transform] active:scale-[0.98] motion-reduce:active:scale-100 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
        >
          {saving ? (
            <>
              <LoaderCircle size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Guardando…
            </>
          ) : (
            "Guardar"
          )}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="w-full min-h-[48px] rounded-2xl text-base font-semibold text-stone-700 dark:text-[#d9d4de] hover:bg-stone-100 dark:hover:bg-white/5 disabled:opacity-60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
          >
            Cancelar
          </button>
        )}
        <p role="status" className="min-h-0 text-sm font-semibold text-sage-ink">
          {savedOk && !onSaved ? (
            <span className="inline-flex items-center gap-1.5">
              <Check size={16} aria-hidden="true" /> Guardado.
            </span>
          ) : null}
        </p>
      </div>
    </form>
  );
}

/**
 * Hoja "Tu equipo de salud". Se abre sobre otras pantallas y también SOBRE Ajustes, por eso usa la
 * capa Z_CLASS.careTeam. useModalDialog gestiona Escape (solo cierra esta hoja, no la de debajo),
 * el foco atrapado, el foco de retorno, el fondo inerte y el bloqueo del scroll (con contador).
 */
export function CareTeamSheet({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  /** Tras guardar (la hoja se cierra sola): para confirmar el guardado o recolocar el foco. */
  onSaved?: () => void;
}) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  // Foco inicial en el panel: el lector anuncia el título y la descripción antes del formulario.
  const { dialogProps } = useModalDialog({ open, onClose, labelledBy: titleId, describedBy: descId, initialFocusRef: panelRef });
  const { ref: dialogRef, ...dialogRest } = dialogProps;
  const setPanel = useCallback(
    (el: HTMLDivElement | null) => {
      panelRef.current = el;
      dialogRef(el);
    },
    [dialogRef]
  );

  if (!open) return null;

  return (
    <ModalPortal>
      <div className={`fixed inset-0 ${Z_CLASS.careTeam} flex items-end sm:items-center justify-center sm:p-4`}>
        <div
          className="absolute inset-0 bg-black/50 dark:bg-black/70 animate-in fade-in duration-200 motion-reduce:animate-none"
          onClick={onClose}
          aria-hidden="true"
        />
        <div
          ref={setPanel}
          {...dialogRest}
          className="relative w-full max-w-md max-h-[92dvh] flex flex-col bg-[#fdfbf7] dark:bg-[#221d2d] text-stone-900 dark:text-[#eae6e1] rounded-t-3xl sm:rounded-3xl border border-stone-200/80 dark:border-white/[0.08] shadow-[0_-8px_32px_-8px_rgba(24,21,32,0.28)] outline-none animate-in slide-in-from-bottom-4 duration-300 motion-reduce:animate-none"
        >
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-stone-200/70 dark:border-white/[0.06]">
            <div className="min-w-0">
              <h2 id={titleId} className="text-xl font-black leading-tight text-balance">Tu equipo de salud</h2>
              <p id={descId} className="mt-1 text-sm leading-snug text-stone-600 dark:text-[#a6a1b2]">
                A quién llamar y a dónde ir, a un toque de distancia.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="shrink-0 -mr-1 w-11 h-11 inline-flex items-center justify-center rounded-full text-stone-600 dark:text-[#a6a1b2] hover:bg-stone-100 dark:hover:bg-white/10 hover:text-stone-900 dark:hover:text-[#eae6e1] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <div className="overflow-y-auto overscroll-contain px-5 pt-4 pb-[calc(1.25rem+var(--safe-bottom))]">
            <CareTeamForm onSaved={() => { onSaved?.(); onClose(); }} onCancel={onClose} />
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
