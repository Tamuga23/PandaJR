import { useId, type ButtonHTMLAttributes, type ReactNode, type Ref } from "react";
import { ArrowUpRight, ChevronRight } from "lucide-react";

/**
 * Primitivas de lista (fase 6): la app se lee en secciones y listas con divisores, no en tarjetas.
 * - Section: título (Alegreya) + acción opcional + descripción, y su contenido.
 * - ListGroup: UN contenedor de filas con divisores internos. Nunca dentro de otro ListGroup ni de una
 *   tarjeta. Tono "plain" (por defecto): sin caja, sangra hasta el borde de la columna (--gutter).
 *   Tono "inset": una sola caja suave (surface + line-strong) para agrupar dentro de un fondo largo.
 * - ListRow: fila ≥48px. Interactiva como <button> (onClick), <a> (href) o switch (toggle); estática si
 *   no tiene ninguno (entonces trailing puede llevar un control, p. ej. <RowButton>).
 * - RowButton: botón compacto (≥44px) para el trailing de una fila estática o la acción de una sección.
 * - Divider y BotanicalRule: separadores; BotanicalRule es decorativo (aria-hidden), máx. uno por pantalla.
 * Reglas de uso: DESIGN.md › Components.
 */

const FOCUS_INSET = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-terracotta-ink";
const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ---------------------------------- Section ---------------------------------- */

export function Section({
  title,
  as: Heading = "h2",
  size,
  action,
  description,
  children,
  className,
  id,
  headingId,
}: {
  title: ReactNode;
  /** Nivel semántico del título. */
  as?: "h2" | "h3";
  /** Tamaño visual: "md" = text-subtitle (20px, por defecto en h2), "sm" = 16px Alegreya (por defecto en h3). */
  size?: "md" | "sm";
  /** Acción a la derecha del título (p. ej. <SectionAction>Ver todo</SectionAction>). */
  action?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
  id?: string;
  /** id del título, si otro elemento necesita apuntarlo (aria-labelledby). */
  headingId?: string;
}) {
  const autoId = useId();
  const hid = headingId ?? `sec-${autoId}`;
  const visual = size ?? (Heading === "h2" ? "md" : "sm");
  return (
    <section id={id} aria-labelledby={hid} className={className}>
      <div className="mb-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <Heading
            id={hid}
            className={cx(
              "font-display text-ink",
              visual === "md" ? "text-subtitle" : "text-body font-bold tracking-[0.005em]"
            )}
          >
            {title}
          </Heading>
          {description && <p className="mt-0.5 text-meta text-ink-muted">{description}</p>}
        </div>
        {action && <div className="-mb-1.5 flex shrink-0 items-center">{action}</div>}
      </div>
      {children}
    </section>
  );
}

/** Acción de texto para la cabecera de una Section (≥44px de alto, tinta terracota). */
export function SectionAction({ className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cx(
        "-me-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-meta font-bold text-terracotta-ink transition-colors hover:bg-surface-hover disabled:text-ink-disabled",
        FOCUS_RING,
        className
      )}
      {...props}
    />
  );
}

/* --------------------------------- ListGroup --------------------------------- */

export function ListGroup({
  children,
  tone = "plain",
  bleed = true,
  edges = false,
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
}: {
  children: ReactNode;
  /** plain: sin caja (por defecto). inset: una caja suave con borde. */
  tone?: "plain" | "inset";
  /** plain: las filas llegan al borde de la columna (margen negativo = --gutter). false: se quedan dentro. */
  bleed?: boolean;
  /** plain: filetes arriba y abajo del grupo. */
  edges?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}) {
  return (
    <ul
      // role explícito: Safari quita la semántica de lista a un <ul> con list-style: none.
      role="list"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      className={cx(
        // Divisor entre filas: filete sobre el cuerpo de la fila, que empieza tras el icono (inset).
        "m-0 list-none p-0 [&>li+li_.pj-row-body]:border-t [&>li+li_.pj-row-body]:border-line",
        tone === "inset"
          ? "overflow-hidden rounded-2xl border border-line-strong bg-surface [--gutter:1rem]"
          : cx(bleed && "mx-[calc(var(--gutter)*-1)]", edges && "border-y border-line"),
        className
      )}
    >
      {children}
    </ul>
  );
}

/* ---------------------------------- ListRow ---------------------------------- */

type RowBase = {
  title: ReactNode;
  /** Línea secundaria (14px, ink-muted). */
  meta?: ReactNode;
  /**
   * Icono o ilustración a la izquierda (decorativo: se oculta al lector). Un icono lucide a 20px, en
   * ink-muted: un icono no es estado. Si marca completado, el propio icono lleva text-sage-ink.
   */
  leading?: ReactNode;
  /**
   * "chevron" (navega a otra vista), "external" (sale de la app) o contenido propio.
   * En filas interactivas el trailing debe ser pasivo (texto, AuthorChip…); un control va en fila estática.
   */
  trailing?: "chevron" | "external" | ReactNode;
  /** danger: título en tinta terracota (urgencia, acción destructiva). */
  tone?: "default" | "danger";
  /** Peso del título: bold (por defecto, 700) o medium (500) para listas largas y tranquilas. */
  weight?: "bold" | "medium";
  className?: string;
  /** Clases extra para el título (p. ej. line-through al completar). */
  titleClassName?: string;
};

type ButtonRowProps = RowBase & {
  onClick: () => void;
  href?: never;
  toggle?: never;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-haspopup"?: ButtonHTMLAttributes<HTMLButtonElement>["aria-haspopup"];
  "aria-expanded"?: boolean;
  "aria-pressed"?: boolean;
  "aria-current"?: boolean | "page" | "step" | "true";
  buttonRef?: Ref<HTMLButtonElement>;
};

type LinkRowProps = RowBase & {
  href: string;
  /** Abre en otra pestaña (target=_blank, rel=noopener). tel:/mailto: no lo necesitan. */
  external?: boolean;
  onClick?: () => void;
  toggle?: never;
  "aria-label"?: string;
};

type SwitchRowProps = RowBase & {
  /** La fila entera es el switch (role="switch"): objetivo grande, estado en aria-checked. */
  toggle: { checked: boolean; onChange: (next: boolean) => void; disabled?: boolean };
  onClick?: never;
  href?: never;
};

type StaticRowProps = RowBase & { onClick?: never; href?: never; toggle?: never };

export type ListRowProps = ButtonRowProps | LinkRowProps | SwitchRowProps | StaticRowProps;

const ROW = "flex w-full min-h-12 items-stretch ps-[var(--gutter)] text-left";
const ROW_INTERACTIVE = cx(
  ROW,
  "cursor-pointer transition-colors hover:bg-surface-hover active:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent",
  FOCUS_INSET
);

function Chevron({ kind }: { kind: "chevron" | "external" }) {
  const Icon = kind === "external" ? ArrowUpRight : ChevronRight;
  return <Icon size={18} strokeWidth={1.75} className="shrink-0 text-ink-subtle" aria-hidden="true" />;
}

function SwitchVisual({ checked, disabled }: { checked: boolean; disabled?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors",
        checked ? "border-transparent bg-[var(--sage-ink)]" : "border-line-control bg-surface-sunken",
        disabled && "opacity-50"
      )}
    >
      <span
        className={cx(
          "absolute left-[3px] size-4 rounded-full transition-transform duration-200",
          checked ? "translate-x-4 bg-[var(--ground)]" : "translate-x-0 bg-[var(--line-control)]"
        )}
      />
    </span>
  );
}

export function ListRow(props: ListRowProps) {
  const { title, meta, leading, trailing, tone = "default", weight = "bold", className, titleClassName } = props;
  const uid = useId();
  const titleId = `row-${uid}-t`;
  const metaId = `row-${uid}-m`;

  const isSwitch = "toggle" in props && props.toggle !== undefined;
  const glyph = trailing === "chevron" ? "chevron" : trailing === "external" ? "external" : null;
  const trailingNode = glyph ? <Chevron kind={glyph} /> : ((trailing as ReactNode) ?? null);

  const body = (
    <>
      {leading && (
        <span aria-hidden="true" className={cx("flex shrink-0 items-center pe-3", tone === "danger" ? "text-terracotta-ink" : "text-ink-muted")}>
          {leading}
        </span>
      )}
      <span className="pj-row-body flex min-w-0 flex-1 items-center gap-3 py-2.5 pe-[var(--gutter)]">
        <span className="min-w-0 flex-1">
          <span
            id={titleId}
            className={cx(
              "block text-body",
              weight === "medium" ? "font-medium" : "font-bold",
              tone === "danger" ? "text-terracotta-ink" : "text-ink",
              titleClassName
            )}
          >
            {title}
          </span>
          {meta && (
            <span id={metaId} className="mt-0.5 block text-meta text-ink-muted">
              {meta}
            </span>
          )}
        </span>
        {isSwitch ? (
          <SwitchVisual checked={(props as SwitchRowProps).toggle.checked} disabled={(props as SwitchRowProps).toggle.disabled} />
        ) : (
          trailingNode && <span className="-my-1.5 flex shrink-0 items-center gap-2 text-meta text-ink-muted">{trailingNode}</span>
        )}
      </span>
    </>
  );

  let row: ReactNode;
  if (isSwitch) {
    const { toggle } = props as SwitchRowProps;
    row = (
      <button
        type="button"
        role="switch"
        aria-checked={toggle.checked}
        aria-labelledby={titleId}
        aria-describedby={meta ? metaId : undefined}
        disabled={toggle.disabled}
        onClick={() => toggle.onChange(!toggle.checked)}
        className={cx(ROW_INTERACTIVE, className)}
      >
        {body}
      </button>
    );
  } else if ("href" in props && props.href !== undefined) {
    const p = props as LinkRowProps;
    row = (
      <a
        href={p.href}
        onClick={p.onClick}
        aria-label={p["aria-label"]}
        {...(p.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className={cx(ROW_INTERACTIVE, className)}
      >
        {body}
      </a>
    );
  } else if ("onClick" in props && props.onClick !== undefined) {
    const {
      buttonRef,
      onClick,
      disabled,
      "aria-label": ariaLabel,
      "aria-haspopup": ariaHaspopup,
      "aria-expanded": ariaExpanded,
      "aria-pressed": ariaPressed,
      "aria-current": ariaCurrent,
    } = props as ButtonRowProps;
    row = (
      <button
        ref={buttonRef}
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup={ariaHaspopup}
        aria-expanded={ariaExpanded}
        aria-pressed={ariaPressed}
        aria-current={ariaCurrent}
        className={cx(ROW_INTERACTIVE, className)}
      >
        {body}
      </button>
    );
  } else {
    row = <div className={cx(ROW, className)}>{body}</div>;
  }

  return <li className="relative">{row}</li>;
}

/* --------------------------------- RowButton --------------------------------- */

export function RowButton({
  tone = "default",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  /** default: contorno neutro · primary: relleno terracota (acción principal) · danger: contorno, tinta terracota. */
  tone?: "default" | "primary" | "danger";
}) {
  return (
    <button
      type={type}
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-4 text-meta font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        tone === "primary" && "bg-terracotta-ink text-on-accent hover:bg-terracotta-ink-hover",
        tone === "default" && "border border-line-control text-ink hover:bg-surface-hover",
        tone === "danger" && "border border-line-control text-terracotta-ink hover:bg-terracotta-wash",
        FOCUS_RING,
        className
      )}
      {...props}
    />
  );
}

/* ------------------------------ Divider / Rule ------------------------------- */

/** Filete de 1px. inset: empieza en el margen de la columna (--gutter). decorative: oculto al lector. */
export function Divider({ inset = false, decorative = false, className }: { inset?: boolean; decorative?: boolean; className?: string }) {
  return (
    <hr
      aria-hidden={decorative || undefined}
      className={cx("h-px border-0 bg-line", inset && "ms-[var(--gutter)]", className)}
    />
  );
}

/**
 * Separador botánico: filete fino con un ramito en el centro (trazo sage-ink de 1.5px).
 * Decorativo (aria-hidden). Úsalo para cerrar un bloque grande (p. ej. tras la semana en la Guía),
 * no entre filas; máximo uno por pantalla.
 */
export function BotanicalRule({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cx("flex items-center gap-3 text-sage-ink", className)}>
      <span className="h-px flex-1 bg-line-strong" />
      <svg width="30" height="14" viewBox="0 0 30 14" fill="none" className="shrink-0">
        <path d="M3 11.5 C9 11.5 15 10 27 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M11 10.6 C10.4 7.6 12.4 5.4 15.2 5.2 C15.4 8 13.6 10.2 11 10.6Z" fill="var(--sage)" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M18.6 8.6 C19.8 10.8 22.6 11.4 24.6 10.2 C23.4 8 20.8 7.4 18.6 8.6Z" fill="var(--sage)" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      <span className="h-px flex-1 bg-line-strong" />
    </div>
  );
}
