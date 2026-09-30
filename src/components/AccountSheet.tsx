"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, ChevronLeft, LoaderCircle, Mail, X } from "lucide-react";
import { ModalPortal } from "@/components/ModalPortal";
import { RowButton } from "@/components/ui/List";
import { useModalDialog } from "@/lib/useModalDialog";
import { Z_CLASS } from "@/lib/layers";
import { useAccount } from "@/lib/useAccount";
import {
  ACCOUNT_MESSAGES,
  clearAccessLinkFromUrl,
  linkEmailLink,
  linkGoogle,
  normalizeEmail,
  restoreAccount,
  sendAccessLink,
  signInEmailLink,
  signInGoogle,
  signOutDevice,
  switchDeviceToAccount,
  type AccessLink,
  type AccessLinkMode,
  type AccountMethod,
  type LinkResult,
  type MemberRole,
  type RestoredAccount,
} from "@/lib/firebase/pairing";

/**
 * Cuenta opcional (Google o enlace por correo) para usar PandaJR en varios dispositivos con el mismo acceso.
 * - manage: desde Ajustes. Anónimo → guardar el acceso; con cuenta → ver la cuenta y cerrar sesión aquí.
 * - signin: desde la bienvenida («Ya uso PandaJR en otro dispositivo») → entrar y restaurar el perfil.
 * - return: la vuelta de un enlace por correo (se completa una sola vez).
 * Nada se escribe hasta que la persona actúa (el clic o abrir el enlace que pidió).
 */
export type AccountSheetMode = "manage" | "signin" | "return";

type Conflict = Extract<LinkResult, { ok: false }>;

type View =
  | { kind: "choose" }
  | { kind: "email" }
  | { kind: "sent"; email: string; mode: AccessLinkMode }
  | { kind: "linked" }
  | { kind: "account" }
  | { kind: "signOut" }
  | { kind: "conflict"; conflict: Conflict }
  | { kind: "needEmail" }
  | { kind: "empty" }
  | { kind: "working" }
  | { kind: "failed" };

const PRIMARY =
  "w-full min-h-[52px] inline-flex items-center justify-center gap-2 rounded-2xl bg-terracotta-ink hover:bg-terracotta-ink-hover text-on-accent text-body font-bold transition-[background-color,transform] active:scale-[0.98] motion-reduce:active:scale-100 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink";
const QUIET =
  "w-full min-h-[48px] rounded-2xl text-body font-bold text-ink-muted hover:bg-surface-hover hover:text-ink disabled:opacity-60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink";
const INPUT =
  "w-full min-h-[48px] rounded-2xl border border-line-control bg-surface-sunken px-4 py-2.5 text-body text-ink transition-colors focus:border-terracotta-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink aria-[invalid=true]:border-terracotta-ink disabled:opacity-60";
const BODY = "text-body text-ink-muted";

function messageOf(e: unknown): string {
  if (e && typeof e === "object" && (e as { human?: unknown }).human === true && typeof (e as Error).message === "string") {
    return (e as Error).message;
  }
  return ACCOUNT_MESSAGES.generic;
}

const METHOD_LABEL: Record<AccountMethod, string> = { google: "Google", email: "enlace por correo" };

export function AccountSheet({
  mode,
  link,
  current,
  onClose,
  onRestored,
  onSignedOut,
}: {
  mode: AccountSheetMode;
  /** Solo en mode="return": el enlace que se está completando. */
  link?: AccessLink | null;
  /** Perfil de este dispositivo (para decidir si puede cambiar de cuenta). */
  current: { pregnancyId?: string; role?: MemberRole };
  onClose: () => void;
  /** Entró (o cambió) a una cuenta con embarazo: la página reconstruye el perfil. */
  onRestored: (restored: RestoredAccount, how: "entered" | "switched") => void;
  /** Cerró sesión en este dispositivo: la página limpia el perfil local. */
  onSignedOut?: () => void;
}) {
  const account = useAccount();
  const titleId = useId();
  const descId = useId();
  const emailId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);

  const returnWithEmail = mode === "return" && !!link?.email;
  const [view, setView] = useState<View>(() => {
    if (mode === "return") return link?.email ? { kind: "working" } : { kind: "needEmail" };
    if (mode === "manage" && !account.anonymous) return { kind: "account" };
    return { kind: "choose" };
  });
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(returnWithEmail);
  const [error, setError] = useState("");

  const { dialogProps } = useModalDialog({
    open: true,
    onClose: () => { if (!busy) onClose(); },
    labelledBy: titleId,
    describedBy: descId,
    initialFocusRef: panelRef,
  });
  const { ref: dialogRef, ...dialogRest } = dialogProps;
  const setPanel = useCallback(
    (el: HTMLDivElement | null) => {
      panelRef.current = el;
      dialogRef(el);
    },
    [dialogRef]
  );

  const mamaLocked = current.role === "mama" && !!current.pregnancyId;

  /** Tras entrar con una cuenta: su embarazo → perfil; sin embarazo → se explica y sigue la bienvenida. */
  const afterSignIn = useCallback(
    async (uid: string) => {
      const restored = await restoreAccount(uid);
      if (restored) onRestored(restored, "entered");
      else setView({ kind: "empty" });
    },
    [onRestored]
  );

  const showLinkResult = (r: LinkResult) => {
    if (r.ok) setView({ kind: "linked" });
    else setView({ kind: "conflict", conflict: r });
  };

  /** Completa la vuelta del enlace por correo (una sola vez por enlace). */
  const runReturn = useCallback(
    async (address: string) => {
      if (!link) return;
      try {
        if (link.mode === "vincular") {
          const r = await linkEmailLink(link, address);
          if (r.ok) setView({ kind: "linked" });
          else setView({ kind: "conflict", conflict: r });
        } else if (link.mode === "entrar") {
          const uid = await signInEmailLink(link, address);
          await afterSignIn(uid);
        } else {
          const restored = await switchDeviceToAccount({ link, email: address }, current);
          onRestored(restored, "switched");
        }
      } catch (e) {
        setError(messageOf(e));
        setView({ kind: "failed" });
      } finally {
        clearAccessLinkFromUrl();
        setBusy(false);
      }
    },
    [link, current, afterSignIn, onRestored]
  );

  // La vuelta del enlace se completa sola (la persona acaba de abrir el enlace que pidió), una vez.
  const startedRef = useRef(false);
  useEffect(() => {
    if (!returnWithEmail || !link?.email || startedRef.current) return;
    startedRef.current = true;
    void runReturn(link.email);
  }, [returnWithEmail, link, runReturn]);

  // --- Acciones (la ventana de Google se abre directamente en el clic, sin esperas antes) ---
  const onGoogle = () => {
    setError("");
    const done = (p: Promise<void>) => {
      setBusy(true);
      p.catch((e) => setError(messageOf(e))).finally(() => setBusy(false));
    };
    if (mode === "manage") done(linkGoogle().then(showLinkResult));
    else done(signInGoogle().then(afterSignIn));
  };

  const sendLink = async (linkMode: AccessLinkMode, address: string) => {
    setError("");
    const clean = normalizeEmail(address);
    if (!clean) { setError(ACCOUNT_MESSAGES.invalidEmail); return; }
    setBusy(true);
    try {
      await sendAccessLink(clean, linkMode);
      setView({ kind: "sent", email: clean, mode: linkMode });
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  const onSwitchGoogle = (conflict: Conflict) => {
    if (!conflict.credential) return;
    setError("");
    setBusy(true);
    switchDeviceToAccount({ credential: conflict.credential }, current)
      .then((restored) => onRestored(restored, "switched"))
      .catch((e) => setError(messageOf(e)))
      .finally(() => setBusy(false));
  };

  const onSignOut = () => {
    setError("");
    setBusy(true);
    signOutDevice()
      .then(() => onSignedOut?.())
      .catch((e) => { setError(messageOf(e)); setBusy(false); });
  };

  // --- Textos por vista ---
  let title = "Usar PandaJR en otro dispositivo";
  let description: React.ReactNode =
    "Guarda tu acceso con una cuenta. Así puedes entrar desde tu celular y tu computadora, y no pierdes el acceso si borras los datos del navegador.";
  if (mode === "signin") {
    title = "Entrar con tu cuenta";
    description = "Si guardaste tu acceso en otro dispositivo, entra con la misma cuenta y seguirás donde lo dejaste.";
  }
  switch (view.kind) {
    case "email":
      description = mode === "signin"
        ? "Te enviaremos un enlace para entrar. Ábrelo en este mismo dispositivo."
        : "Te enviaremos un enlace para guardar tu acceso. Ábrelo en este mismo navegador.";
      break;
    case "sent":
      title = "Revisa tu correo";
      description = view.mode === "entrar"
        ? `Te enviamos un enlace a ${view.email}. Ábrelo en este dispositivo para entrar.`
        : view.mode === "cambiar"
          ? `Te enviamos un enlace a ${view.email}. Ábrelo en este mismo navegador para cambiar este dispositivo a esa cuenta.`
          : `Te enviamos un enlace a ${view.email}. Ábrelo en este mismo navegador para terminar de guardar tu acceso.`;
      break;
    case "linked":
      title = "Tu acceso quedó guardado";
      description = `${account.email ? `Cuenta: ${account.email}. ` : ""}En tu otro dispositivo, abre PandaJR y elige «Ya uso PandaJR en otro dispositivo».`;
      break;
    case "account":
      title = "Tu acceso";
      description = `Guardado con ${account.methods.map((m) => METHOD_LABEL[m]).join(" y ") || "una cuenta"}${account.email ? `: ${account.email}` : ""}. En tu otro dispositivo, abre PandaJR, elige «Ya uso PandaJR en otro dispositivo» y entra con esta misma cuenta.`;
      break;
    case "signOut":
      title = "¿Cerrar sesión en este dispositivo?";
      description = `Lo compartido sigue guardado y sigues en el embarazo. Para volver aquí, entra con ${account.email ?? "tu cuenta"}.`;
      break;
    case "conflict":
      title = "Esa cuenta ya está en uso";
      description = mamaLocked
        ? ACCOUNT_MESSAGES.mamaSwitch
        : `Esa cuenta${view.conflict.email ? ` (${view.conflict.email})` : ""} ya guarda el acceso de otro dispositivo. Puedes cambiar este dispositivo a esa cuenta: entrarás como en tu otro dispositivo${current.pregnancyId ? " y este acceso saldrá de la lista de personas con acceso" : ""}.`;
      break;
    case "needEmail":
      title = "Confirma tu correo";
      description = "Escribe el correo al que llegó el enlace para terminar.";
      break;
    case "empty":
      title = "Esta cuenta aún no está en ningún embarazo";
      description = "Sigue con la bienvenida para crear el tuyo o unirte con el código de tu pareja: quedará guardado en esta cuenta.";
      break;
    case "working":
      title = "Un momento…";
      description = "Estamos terminando con el enlace de tu correo.";
      break;
    case "failed":
      title = "No pudimos terminar";
      description = "Puedes volver a intentarlo desde Ajustes o desde la bienvenida.";
      break;
  }

  const spinner = <LoaderCircle size={18} strokeWidth={2} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />;
  const errorBox = error ? (
    <p role="alert" className="mt-4 rounded-xl bg-terracotta-wash p-3 text-meta font-bold text-terracotta-ink">{error}</p>
  ) : null;

  const emailForm = (onSubmit: (address: string) => void, submitLabel: string) => (
    <form
      className="mt-5"
      onSubmit={(e) => { e.preventDefault(); if (!busy) onSubmit(email); }}
      noValidate
    >
      <label htmlFor={emailId} className="mb-1.5 block text-meta font-bold text-ink">Tu correo</label>
      <input
        id={emailId}
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-invalid={error === ACCOUNT_MESSAGES.invalidEmail || undefined}
        disabled={busy}
        placeholder="nombre@correo.com"
        className={INPUT}
      />
      <button type="submit" disabled={busy || !email.trim()} className={`${PRIMARY} mt-4`}>
        {busy ? spinner : <Mail size={18} strokeWidth={1.75} aria-hidden="true" />}
        {busy ? "Enviando…" : submitLabel}
      </button>
    </form>
  );

  let body: React.ReactNode = null;
  switch (view.kind) {
    case "choose":
      body = (
        <div className="mt-5 flex flex-col gap-2">
          <button type="button" onClick={onGoogle} disabled={busy} className={PRIMARY}>
            {busy && spinner}
            {busy ? "Esperando a Google…" : "Continuar con Google"}
          </button>
          <button type="button" onClick={() => { setError(""); setView({ kind: "email" }); }} disabled={busy} className={QUIET}>
            Prefiero un enlace por correo
          </button>
        </div>
      );
      break;
    case "email":
      body = (
        <>
          {emailForm((address) => void sendLink(mode === "signin" ? "entrar" : "vincular", address), "Enviar enlace")}
          <button type="button" onClick={() => { setError(""); setView({ kind: "choose" }); }} disabled={busy} className={`${QUIET} mt-2 inline-flex items-center justify-center gap-1`}>
            <ChevronLeft size={18} strokeWidth={1.75} aria-hidden="true" />
            Volver
          </button>
        </>
      );
      break;
    case "sent":
      body = (
        <>
          <p className="mt-4 text-meta text-ink-muted">Si no llega en unos minutos, revisa la carpeta de spam o pide otro.</p>
          <button type="button" onClick={onClose} className={`${PRIMARY} mt-5`}>Entendido</button>
          <button type="button" onClick={() => { setError(""); setView({ kind: "email" }); }} className={`${QUIET} mt-2`}>
            Usar otro correo
          </button>
        </>
      );
      break;
    case "linked":
      body = (
        <>
          <p className="mt-4 inline-flex items-center gap-1.5 text-meta font-bold text-sage-ink">
            <Check size={16} strokeWidth={2} aria-hidden="true" /> Mismo acceso, ahora en cualquier dispositivo
          </p>
          <button type="button" onClick={onClose} className={`${PRIMARY} mt-5`}>Entendido</button>
        </>
      );
      break;
    case "account":
      body = (
        <div className="mt-5 flex flex-col gap-2">
          <button type="button" onClick={onClose} className={PRIMARY}>Listo</button>
          <RowButton tone="danger" onClick={() => { setError(""); setView({ kind: "signOut" }); }} className="w-full min-h-12">
            Cerrar sesión en este dispositivo
          </RowButton>
        </div>
      );
      break;
    case "signOut":
      body = (
        <div className="mt-5 flex flex-col gap-2">
          <button type="button" onClick={onSignOut} disabled={busy} className={PRIMARY}>
            {busy && spinner}
            {busy ? "Cerrando sesión…" : "Cerrar sesión"}
          </button>
          <button type="button" onClick={() => setView({ kind: "account" })} disabled={busy} className={QUIET}>Cancelar</button>
        </div>
      );
      break;
    case "conflict": {
      const c = view.conflict;
      body = mamaLocked ? (
        <button type="button" onClick={() => setView({ kind: "choose" })} className={`${PRIMARY} mt-5`}>Entendido</button>
      ) : (
        <div className="mt-5 flex flex-col gap-2">
          {c.method === "google" && c.credential ? (
            <button type="button" onClick={() => onSwitchGoogle(c)} disabled={busy} className={PRIMARY}>
              {busy && spinner}
              {busy ? "Cambiando…" : "Cambiar a esa cuenta"}
            </button>
          ) : (
            <button type="button" onClick={() => void sendLink("cambiar", c.email ?? email)} disabled={busy || !(c.email ?? email)} className={PRIMARY}>
              {busy && spinner}
              {busy ? "Enviando…" : "Enviarme un enlace para cambiar"}
            </button>
          )}
          <button type="button" onClick={() => setView({ kind: "choose" })} disabled={busy} className={QUIET}>Cancelar</button>
        </div>
      );
      break;
    }
    case "needEmail":
      body = emailForm((address) => {
        const clean = normalizeEmail(address);
        if (!clean) { setError(ACCOUNT_MESSAGES.invalidEmail); return; }
        setError("");
        setBusy(true);
        setView({ kind: "working" });
        void runReturn(clean);
      }, "Continuar");
      break;
    case "empty":
      body = <button type="button" onClick={onClose} className={`${PRIMARY} mt-5`}>Seguir con la bienvenida</button>;
      break;
    case "working":
      body = <p className="mt-5 inline-flex items-center gap-2 text-meta font-bold text-ink-muted">{spinner} Terminando…</p>;
      break;
    case "failed":
      body = <button type="button" onClick={onClose} className={`${PRIMARY} mt-5`}>Cerrar</button>;
      break;
  }

  return (
    <ModalPortal>
      <div className={`fixed inset-0 ${Z_CLASS.careTeam} flex items-end sm:items-center justify-center sm:p-4`}>
        <div className="absolute inset-0 bg-scrim" onClick={() => { if (!busy) onClose(); }} aria-hidden="true" />
        <div
          ref={setPanel}
          {...dialogRest}
          aria-busy={busy || undefined}
          className="relative w-full max-w-md max-h-[92dvh] flex flex-col bg-surface-raised text-ink rounded-t-3xl sm:rounded-3xl border border-line shadow-sheet outline-none"
        >
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-line">
            <h2 id={titleId} className="min-w-0 font-display text-title text-ink text-balance">{title}</h2>
            <button
              type="button"
              onClick={() => { if (!busy) onClose(); }}
              aria-label="Cerrar"
              aria-disabled={busy || undefined}
              className="shrink-0 -mr-1 w-11 h-11 inline-flex items-center justify-center rounded-full text-ink-muted hover:bg-surface-hover hover:text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <div className="overflow-y-auto overscroll-contain px-5 pt-4 pb-[calc(1.25rem+var(--safe-bottom))]">
            <p id={descId} className={BODY} aria-live="polite">{description}</p>
            {errorBox}
            {body}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
