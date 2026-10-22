import { ArrowUpRight } from "lucide-react";
import { CheckGlyph } from "@/components/ui/CheckGlyph";

/**
 * Una lectura (artículo o libro) con su casilla «Leído», separada de la fila como en las tareas: la casilla
 * marca; la fila del artículo abre la fuente en otra pestaña (el libro no tiene enlace). Va dentro de un
 * ListGroup: el divisor cae sobre `pj-row-body`, después de la casilla.
 * `read === undefined`: aún no se sabe (con vínculo, antes del primer dato): el hueco de la casilla, sin
 * afirmar «sin leer»; el texto no se mueve cuando llega el dato.
 */

const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink";
const FOCUS_INSET = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-terracotta-ink";

export function ReadingRow({
  title,
  href,
  why,
  facts,
  read,
  disabled = false,
  onToggleRead,
}: {
  title: string;
  /** Artículo: abre la fuente en otra pestaña. Libro: sin enlace. */
  href?: string;
  /** Qué trae, en una frase (la biblioteca); «Hoy» va sin ella. */
  why?: string;
  /** La línea pequeña: fuente o autor, semanas, para quién y si la pareja lo leyó. */
  facts: string[];
  read: boolean | undefined;
  disabled?: boolean;
  onToggleRead: () => void;
}) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className={`block text-body font-medium text-pretty ${read ? "text-ink-muted" : "text-ink"}`}>
          {title}
          {href && <span className="sr-only"> (se abre en otra pestaña)</span>}
        </span>
        {why && <span className="mt-0.5 block text-meta text-ink-muted">{why}</span>}
        <span className="mt-1 block text-micro font-medium text-ink-subtle">{facts.join(" · ")}</span>
      </span>
      {href && <ArrowUpRight size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-ink-subtle" aria-hidden="true" />}
    </>
  );
  const bodyClass = "pj-row-body ms-0.5 flex min-w-0 flex-1 items-start gap-3 py-2.5 pe-[var(--gutter)]";

  return (
    <li className="relative">
      <div className="flex items-start ps-[var(--gutter)]">
        {read === undefined ? (
          <span aria-hidden="true" className="-ms-2.5 mt-0.5 size-11 shrink-0" />
        ) : (
          <button
            type="button"
            role="checkbox"
            aria-checked={read}
            aria-label={`Leído: ${title}`}
            disabled={disabled}
            onClick={onToggleRead}
            className={`-ms-2.5 mt-0.5 grid size-11 shrink-0 place-items-center rounded-full transition-colors hover:bg-surface-hover disabled:cursor-wait disabled:opacity-60 ${FOCUS_RING}`}
          >
            <CheckGlyph checked={read} />
          </button>
        )}
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`${bodyClass} cursor-pointer transition-colors hover:bg-surface-hover active:bg-surface-hover ${FOCUS_INSET}`}
          >
            {body}
          </a>
        ) : (
          <div className={bodyClass}>{body}</div>
        )}
      </div>
    </li>
  );
}
