"use client";

import React, { useCallback, useId, useRef, useState } from "react";
import { Check, CircleAlert, LoaderCircle, RotateCw, X } from "lucide-react";
import { usePandaStore } from "@/store/usePandaStore";
import { useCareTeam } from "@/lib/useCareTeam";
import { ModalPortal } from "@/components/ModalPortal";
import { useModalDialog } from "@/lib/useModalDialog";
import { Z_CLASS } from "@/lib/layers";

type FormValues = {
  obName: string;
  obPhone: string;
  hospitalName: string;
  hospitalAddress: string;
  emergencyNumber: string;
  crisisLine: string;
};

type PhoneField = "obPhone" | "emergencyNumber" | "crisisLine";

const MIN_DIGITS: Record<PhoneField, number> = { obPhone: 7, emergencyNumber: 3, crisisLine: 3 };

/** Algunas líneas de crisis se marcan con * (Chile *4141, Uruguay *0767). */
function phoneProblem(value: string, minDigits: number, allowStar = false): string | null {
  const v = value.trim();
  if (!v) return null;
  if ((allowStar ? /[^\d+*#\s().-]/ : /[^\d+\s().-]/).test(v))
    return allowStar ? "Usa solo números, espacios, guiones, * o el signo +." : "Usa solo números, espacios, guiones o el signo +.";
  const digits = v.replace(/\D/g, "");
  if (digits.length < minDigits) return `Parece incompleto: revisa que tenga al menos ${minDigits} dígitos.`;
  if (digits.length > 15) return "Parece demasiado largo: revisa el número.";
  return null;
}

const inputClass =
  // Campo = pozo (surface-sunken) sobre el panel de la hoja (surface-raised), como en la Agenda.
  "w-full min-h-[48px] rounded-2xl border bg-surface-sunken px-4 py-2.5 text-body text-ink " +
  // Borde ≥3:1 con el panel (1.4.11): line-control 3.6:1 sobre raised claro · 3.7:1 sobre raised oscuro.
  // El placeholder usa --placeholder (globals.css, ≥4.5:1 sobre los pozos de los dos temas).
  "border-line-control " +
  // Foco: anillo de tinta de 2px con separación (visible también en modo de alto contraste).
  "transition-colors focus:border-terracotta-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink " +
  "aria-[invalid=true]:border-terracotta-ink disabled:opacity-60";

const labelClass = "block text-meta font-bold text-ink mb-1.5";
const helpClass = "mt-1.5 text-meta text-ink-muted";
const errorClass = "mt-1.5 flex items-start gap-1.5 text-meta font-medium text-terracotta-ink";

export function CareTeamForm({ onSaved, onCancel }: { onSaved?: () => void; onCancel?: () => void }) {
  const { careTeam, save, saving, error, defaults } = useCareTeam();
  // Lo que fija el país (elegido en Ajustes o detectado): número de emergencias y línea de crisis.
  const detected = defaults.emergency;
  const defaultCrisis = defaults.crisis;
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
    crisisLine: `${uid}-crisis`,
  };

  // Número de emergencias: con detección confiable se prellena; si no, queda vacío con el
  // detectado como ejemplo, para que guardar el obstetra no lo dé por confirmado.
  const [initialEmergency] = useState(() => careTeam.emergencyNumber ?? (detected.confident ? detected.number : ""));
  const hadCustomEmergency = !!careTeam.emergencyNumber;
  // Línea de crisis: igual que emergencias. La del país se prellena (en forma marcable) y solo se guarda
  // como propia si se escribe otra; vacía = vuelve a la del país.
  const [initialCrisis] = useState(() => {
    if (careTeam.crisisLine) return careTeam.crisisLine;
    if (!defaultCrisis) return "";
    return /^[\d+*#\s().-]+$/.test(defaultCrisis.display) ? defaultCrisis.display : defaultCrisis.dial;
  });
  const hadCustomCrisis = !!careTeam.crisisLine;
  const [values, setValues] = useState<FormValues>(() => ({
    obName: careTeam.obName ?? "",
    obPhone: careTeam.obPhone ?? "",
    hospitalName: careTeam.hospitalName ?? "",
    hospitalAddress: careTeam.hospitalAddress ?? "",
    emergencyNumber: initialEmergency,
    crisisLine: initialCrisis,
  }));
  const [touched, setTouched] = useState<Partial<Record<PhoneField, boolean>>>({});
  const [savedOk, setSavedOk] = useState(false);
  const obPhoneRef = useRef<HTMLInputElement>(null);
  const emergencyRef = useRef<HTMLInputElement>(null);
  const crisisRef = useRef<HTMLInputElement>(null);

  const errors: Record<PhoneField, string | null> = {
    obPhone: phoneProblem(values.obPhone, MIN_DIGITS.obPhone),
    emergencyNumber: phoneProblem(values.emergencyNumber, MIN_DIGITS.emergencyNumber),
    crisisLine: phoneProblem(values.crisisLine, MIN_DIGITS.crisisLine, true),
  };
  const showError = (field: PhoneField) => (touched[field] ? errors[field] : null);

  const update = (field: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSavedOk(false);
    setValues((prev) => ({ ...prev, [field]: e.target.value }));
  };
  const markTouched = (field: PhoneField) => () => setTouched((prev) => ({ ...prev, [field]: true }));

  const submit = async () => {
    if (saving) return;
    setTouched({ obPhone: true, emergencyNumber: true, crisisLine: true });
    if (errors.obPhone) {
      obPhoneRef.current?.focus();
      return;
    }
    if (errors.emergencyNumber) {
      emergencyRef.current?.focus();
      return;
    }
    if (errors.crisisLine) {
      crisisRef.current?.focus();
      return;
    }
    // Solo se guarda (y se comparte con la pareja) si ya era propio o la usuaria lo escribió;
    // si no, cada teléfono sigue usando el número detectado para su región.
    const emergencyEdited = values.emergencyNumber.trim() !== initialEmergency.trim();
    const crisisEdited = values.crisisLine.trim() !== initialCrisis.trim();
    try {
      await save({
        ...values,
        emergencyNumber: hadCustomEmergency || emergencyEdited ? values.emergencyNumber : undefined,
        crisisLine: hadCustomCrisis || crisisEdited ? values.crisisLine : undefined,
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
  const crisisError = showError("crisisLine");
  const place = defaults.countryName && defaults.country !== "OTHER" ? defaults.countryName : null;
  const emergencyHelp = hadCustomEmergency
    ? defaults.chosen && place
      ? `Número guardado. Para ${place} es el ${detected.number}; bórralo para usar ese.`
      : `Número guardado. En este teléfono detectamos el ${detected.number}; bórralo para usar el detectado.`
    : detected.confident
      ? defaults.chosen && place
        ? `El de ${place}: ${detected.number}. Cámbialo si no es correcto.`
        : `Detectado para tu región: ${detected.number}. Cámbialo si no es correcto.`
      : "No pudimos confirmar tu país: revisa el número de emergencias (o elige tu país en Ajustes).";
  const crisisDefaultText = defaultCrisis ? `${defaultCrisis.name} · ${defaultCrisis.display} (${defaultCrisis.hint})` : null;
  const crisisHelp = hadCustomCrisis
    ? crisisDefaultText && place
      ? `Línea guardada. Para ${place} está ${crisisDefaultText}; bórrala para usar esa.`
      : "Línea guardada."
    : crisisDefaultText && place
      ? `Para ${place}: ${crisisDefaultText}. Aparece junto a Emergencias cuando se trata de salud mental.`
      : defaults.country === "OTHER"
        ? "Para «Otro país» no tenemos una línea verificada. Si conoces una, escríbela."
        : place
          ? `Para ${place} no tenemos una línea verificada. Si conoces una, escríbela.`
          : "Elige tu país en Ajustes para ver su línea, o escribe una que conozcas.";

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6" aria-busy={saving}>
      <p className="text-meta text-ink-muted">
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
            Dirección <span className="font-normal text-ink-muted">(opcional)</span>
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

      <div>
        <label htmlFor={ids.crisisLine} className={labelClass}>
          Línea de crisis <span className="font-normal text-ink-muted">(salud mental)</span>
        </label>
        <input
          ref={crisisRef}
          id={ids.crisisLine}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          maxLength={40}
          placeholder={defaultCrisis ? `Ej. ${defaultCrisis.dial}` : "Ej. 800 911 2000"}
          value={values.crisisLine}
          onChange={update("crisisLine")}
          onBlur={markTouched("crisisLine")}
          disabled={saving}
          aria-invalid={crisisError ? true : undefined}
          aria-describedby={`${ids.crisisLine}-help${crisisError ? ` ${ids.crisisLine}-error` : ""}`}
          className={`${inputClass} tabular-nums`}
        />
        <p id={`${ids.crisisLine}-help`} className={helpClass}>{crisisHelp}</p>
        {crisisError && (
          <p id={`${ids.crisisLine}-error`} className={errorClass}>
            <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            {crisisError}
          </p>
        )}
      </div>

      {error && (
        <div role="alert" className="flex flex-col gap-2 rounded-2xl bg-terracotta-wash p-4">
          <p className="flex items-start gap-2 text-meta text-ink">
            <CircleAlert size={18} className="mt-0.5 shrink-0 text-terracotta-ink" aria-hidden="true" />
            {error}
          </p>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className="self-start inline-flex items-center gap-1.5 min-h-[44px] px-3 -ml-1 rounded-xl text-meta font-bold text-terracotta-ink hover:bg-surface-hover disabled:opacity-60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
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
          className="w-full min-h-[52px] inline-flex items-center justify-center gap-2 rounded-2xl bg-terracotta-ink hover:bg-terracotta-ink-hover text-on-accent text-body font-bold transition-[background-color,transform] active:scale-[0.98] motion-reduce:active:scale-100 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
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
            className="w-full min-h-[48px] rounded-2xl text-body font-bold text-ink-muted hover:bg-surface-hover disabled:opacity-60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
          >
            Cancelar
          </button>
        )}
        <p role="status" className="min-h-0 text-meta font-bold text-sage-ink">
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
          className="absolute inset-0 bg-scrim"
          onClick={onClose}
          aria-hidden="true"
        />
        <div
          ref={setPanel}
          {...dialogRest}
          className="relative w-full max-w-md max-h-[min(92dvh,var(--sheet-max))] flex flex-col bg-surface-raised text-ink rounded-t-3xl sm:rounded-3xl border border-line shadow-sheet outline-none"
        >
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-line">
            <div className="min-w-0">
              <h2 id={titleId} className="font-display text-title text-ink text-balance">Tu equipo de salud</h2>
              <p id={descId} className="mt-1 text-meta text-ink-muted">
                A quién llamar y a dónde ir, a un toque de distancia.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="shrink-0 -mr-1 w-11 h-11 inline-flex items-center justify-center rounded-full text-ink-muted hover:bg-surface-hover hover:text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
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
