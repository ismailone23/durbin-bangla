"use client";
import Link from "next/link";
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Mark, PHONE } from "@/components/site";
import { usePoll } from "@/lib/client";
import { taka } from "@/lib/format";
import { type Block, type Dish, heights, paginate, type Sizes } from "@/lib/menu-layout";

/** Short English names for the printed menu's sections (used in the page links and the small line above a title). */
const EN: Record<string, string> = {
  "Shokaler Sohor": "Morning",
  "Bhor Dupure": "Midday",
  "Bharta o Bhaji'r Bhalobasha": "Bhortas",
  "Curry'r Golpo": "Curries",
  "Mache bhate Bangali": "Fish",
  "Cheka Pora": "Grill",
  "Mukh Mitha": "Sweets",
};

/** Real photos of the restaurant's food, matched to the section a light page holds. */
const PHOTOS: Record<string, [string, string]> = {
  "Shokaler Sohor": ["/photos/curries.jpg", "Curries and roti at Durbin Bangla"],
  "Bhor Dupure": ["/photos/thali.jpg", "A brass tray of curries at Durbin Bangla"],
  "Bharta o Bhaji'r Bhalobasha": ["/photos/dal.jpg", "A bowl of daal at Durbin Bangla"],
  "Curry'r Golpo": ["/photos/thali.jpg", "A brass tray of curries at Durbin Bangla"],
  "Mache bhate Bangali": ["/photos/curries.jpg", "Curries and roti at Durbin Bangla"],
  "Cheka Pora": ["/photos/busy-room.jpg", "A full dining room at Durbin Bangla"],
  "Mukh Mitha": ["/photos/rasgulla.jpg", "Rasgulla made in the Durbin Bangla kitchen"],
};
const MIN_PHOTO = 180; // px: smaller spare space stays as margin

const INK = "#2e2826";
const PAPER = "#fbf6ec";
const ACCENT = "var(--primary)";
const BLOCK_GAP = 48; // gap-12 between blocks in a column
const LIST_GAP = 24; // mt-6 between a heading and its dishes

// Paint flecks across the paper, like the printed menu: fixed positions so every render matches.
// Single quotes only inside the SVG: it sits in a CSS url("…"), where a double quote would end the value.
const FLECKS = (() => {
  let seed = 7;
  const r = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const dots = Array.from({ length: 70 }, () => `<circle cx='${(r() * 400).toFixed(1)}' cy='${(r() * 400).toFixed(1)}' r='${(0.6 + r() * 1.6).toFixed(2)}' fill='%23b8561a' fill-opacity='${(0.35 + r() * 0.5).toFixed(2)}'/>`).join("");
  return `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'>${dots}</svg>")`;
})();

/** Wide screens show two columns a page (4 spreads); below 1024px each column is its own page (8 pages). */
function useWide() {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const m = matchMedia("(min-width: 1024px)");
    const on = () => setWide(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return wide;
}

/** The padding and column grid of a page; the hidden measuring copy uses the same classes so its widths match. */
const pageGrid = (two: boolean) => `grid gap-12 px-6 pb-14 pt-4 sm:px-12 ${two ? "lg:grid-cols-2 lg:gap-20 lg:px-16" : ""}`;

export function MenuBook() {
  const { data } = usePoll<{ menu: Dish[] }>("/api/menu", 30000);
  const wide = useWide();

  const sections = useMemo(() => {
    const m = new Map<string, Dish[]>();
    for (const d of data?.menu ?? []) m.set(d.category, [...(m.get(d.category) ?? []), d]);
    return [...m.entries()];
  }, [data]);

  // Measure every heading and dish as it really renders at this width, so the pages balance on true heights.
  const measureRef = useRef<HTMLDivElement>(null);
  const [sizes, setSizes] = useState<Sizes | null>(null);
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const read = () => {
      const h = (n: Element | null) => (n ? n.getBoundingClientRect().height : 0);
      const all = (attr: string) => new Map([...el.querySelectorAll(`[${attr}]`)].map((n) => [n.getAttribute(attr)!, h(n)]));
      const heads = all("data-m-head");
      const conts = all("data-m-cont");
      const dishes = all("data-m-dish");
      setSizes({
        cover: h(el.querySelector("[data-m-cover]")),
        info: h(el.querySelector("[data-m-info]")) + BLOCK_GAP,
        head: (name) => (heads.get(name) ?? 0) + LIST_GAP + BLOCK_GAP,
        cont: (name) => (conts.get(name) ?? 0) + LIST_GAP + BLOCK_GAP,
        dish: (d) => dishes.get(String(d.id)) ?? 0,
      });
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sections, wide]);

  // Eight balanced columns: one a page on phones, two a page on wide screens.
  const pages = useMemo(() => {
    if (!sections.length) return [] as Block[][][];
    const cols = paginate(sections, sizes ?? undefined);
    // Where a column has room left, a real photo of that section's food fills it (once sizes are measured).
    if (sizes) {
      const h = heights(cols, sizes);
      const full = Math.max(...h);
      cols.forEach((col, i) => {
        const spare = full - h[i] - BLOCK_GAP;
        const sec = [...col].reverse().find((b) => b.kind === "section");
        if (spare >= MIN_PHOTO && sec?.kind === "section" && PHOTOS[sec.name] && !col.some((b) => b.kind === "info")) {
          const [src, alt] = PHOTOS[sec.name];
          col.push({ kind: "photo", src, alt, height: Math.floor(spare) });
        }
      });
    }
    if (!wide) return cols.map((c) => [c]);
    const spreads: Block[][][] = [];
    for (let i = 0; i < cols.length; i += 2) spreads.push(cols.slice(i, i + 2));
    return spreads;
  }, [sections, sizes, wide]);

  const [cur, setCur] = useState(0);
  const [drag, setDrag] = useState<{ dir: 1 | -1; p: number } | null>(null);
  const [peek, setPeek] = useState(false);
  const [calm, setCalm] = useState(false); // prefers-reduced-motion: no bending, no wobble
  useEffect(() => setCalm(matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  const start = useRef<{ x: number; w: number; id: number } | null>(null);
  const n = pages.length;
  useEffect(() => setCur((c) => Math.min(c, Math.max(0, n - 1))), [n]);
  // Keep the reader on the same content when the layout switches between 4 spreads and 8 pages.
  const wasWide = useRef(wide);
  useEffect(() => {
    if (wasWide.current !== wide) setCur((c) => (wide ? Math.floor(c / 2) : c * 2));
    wasWide.current = wide;
  }, [wide]);

  const go = (to: number) => setCur(Math.max(0, Math.min(n - 1, to)));

  // A page's fold angle: turned pages lie flat to the left (-180°, hidden by their back face).
  const angle = (k: number) => {
    if (drag?.dir === 1 && k === cur) return -180 * drag.p;
    if (drag?.dir === -1 && k === cur - 1) return -180 + 180 * drag.p;
    if (k < cur) return -180;
    if (k === cur && peek) return -9;
    return 0;
  };

  function down(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("a,button")) return;
    start.current = { x: e.clientX, w: e.currentTarget.getBoundingClientRect().width, id: e.pointerId };
  }
  function move(e: React.PointerEvent) {
    const s = start.current;
    if (!s) {
      if (e.pointerType === "mouse") {
        const r = e.currentTarget.getBoundingClientRect();
        setPeek(cur < n - 1 && e.clientX > r.right - r.width * 0.14);
      }
      return;
    }
    const dx = e.clientX - s.x;
    if (!drag && Math.abs(dx) < 8) return;
    const dir: 1 | -1 = drag?.dir ?? (dx < 0 ? 1 : -1);
    if ((dir === 1 && cur >= n - 1) || (dir === -1 && cur <= 0)) return;
    if (!drag) e.currentTarget.setPointerCapture(s.id);
    setPeek(false);
    setDrag({ dir, p: Math.max(0, Math.min(1, (dir === 1 ? -dx : dx) / (s.w * 0.9))) });
  }
  function up() {
    if (drag) {
      if (drag.p > 0.3) go(cur + drag.dir);
      setDrag(null);
    }
    start.current = null;
  }

  if (!data) return <p className="py-24 text-center">Setting the table…</p>;

  return (
    <div className="relative mx-auto max-w-6xl">
      <nav aria-label="Menu pages" className="mb-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-(length:--step-small) font-semibold">
        {pages.map((cols, k) => (
          <button key={k} type="button" onClick={() => go(k)} aria-current={k === cur ? "page" : undefined} className="underline-offset-8 hover:underline aria-[current=page]:underline">
            {[...new Set(cols.flat().flatMap((b) => (b.kind === "section" ? [EN[b.name] ?? b.name] : [])))].join(" & ") || "Welcome"}
          </button>
        ))}
      </nav>

      {/* Hidden copy of every piece, laid out at a real column's width, for measuring. */}
      <div ref={measureRef} aria-hidden inert className="pointer-events-none invisible absolute inset-x-0 top-0 -z-10" style={{ color: INK }}>
        <div className={pageGrid(wide)}>
          <div className="flex flex-col">
            <div data-m-cover>
              <Masthead />
            </div>
            <div data-m-info>
              <Info />
            </div>
            {sections.map(([name, ds], i) => (
              <Fragment key={name}>
                <div data-m-head={name}>
                  <SectionHead name={name} curved={i % 2 === 0} cont={false} idSuffix="m" />
                </div>
                <div data-m-cont={name}>
                  <SectionHead name={name} curved={false} cont idSuffix="m" />
                </div>
                <ul>
                  {ds.map((d) => (
                    <DishRow key={d.id} d={d} measure />
                  ))}
                </ul>
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      <div
        role="region"
        aria-roledescription="menu book"
        aria-label={`Menu, page ${cur + 1} of ${n}`}
        tabIndex={0}
        onKeyDown={(e) => (e.key === "ArrowRight" ? go(cur + 1) : e.key === "ArrowLeft" ? go(cur - 1) : null)}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={() => !start.current && setPeek(false)}
        className="grid cursor-grab touch-pan-y select-none outline-offset-8 [perspective:2400px] active:cursor-grabbing"
      >
        {pages.map((cols, k) => {
          const a = angle(k);
          const moving = a !== 0 && a !== -180;
          // Paper is not a board: mid-turn the sheet bows (tilt + skew peak at 90°) and shades toward the fold.
          const lift = Math.sin((-a * Math.PI) / 180);
          const bend = calm ? "" : ` rotateX(${(lift * 5).toFixed(2)}deg) skewY(${(-lift * 3).toFixed(2)}deg)`;
          return (
            <article
              key={k}
              aria-hidden={k !== cur}
              inert={k !== cur}
              className="relative flex flex-col overflow-hidden [grid-area:1/1] [backface-visibility:hidden] [transform-origin:left_center] motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-[cubic-bezier(.3,.7,.2,1)]"
              style={{
                zIndex: n - k,
                transform: `rotateY(${a}deg)${bend}`,
                // The page that has just come to rest gives a small damped wobble (name alternates so it replays on every turn).
                animation: !calm && k === cur && !drag && !peek ? `paper-settle-${cur % 2 ? "a" : "b"} 1.1s ease-out` : undefined,
                transitionDuration: drag ? "0ms" : undefined,
                background: `${FLECKS}, ${PAPER}`,
                color: INK,
                boxShadow: moving ? "0 30px 60px -20px rgb(0 0 0 / .55)" : undefined,
              }}
            >
              {moving && (
                <div aria-hidden className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(to_right,rgb(0_0_0/.45),transparent_55%)]" style={{ opacity: lift }} /> /* taste-skill-ignore: fold shading */
              )}
              {/* The name, outlined and cropped by the top edge, as on the printed menu. */}
              <p aria-hidden className="display -mt-[0.32em] whitespace-nowrap text-center text-[clamp(4rem,11vw,10rem)] leading-none text-transparent" style={{ WebkitTextStroke: `1.5px ${ACCENT}` }}>
                Durbin Bangla
              </p>
              {/* Content sits centred on the page, so any spare paper becomes even margins above and below. */}
              <div className={`${pageGrid(cols.length > 1)} flex-1`}>
                {cols.map((col, ci) => (
                  <div key={ci} className="flex flex-col justify-center gap-12">
                    {col.map((b, bi) =>
                      b.kind === "cover" ? (
                        <Masthead key="cover" />
                      ) : b.kind === "photo" ? (
                        <img key="photo" src={b.src} alt={b.alt} loading="lazy" draggable={false} className="w-full object-cover" style={{ height: b.height }} />
                      ) : b.kind === "info" ? (
                        <Info key="info" />
                      ) : (
                        <section key={`${b.name}-${bi}`} aria-label={b.cont ? `${b.name}, continued` : b.name}>
                          <SectionHead name={b.name} curved={b.curved} cont={b.cont} idSuffix={`${k}`} />
                          <ul className="mt-6 flex flex-col">
                            {b.dishes.map((d) => (
                              <DishRow key={d.id} d={d} />
                            ))}
                          </ul>
                        </section>
                      ),
                    )}
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <button type="button" onClick={() => go(cur - 1)} disabled={cur === 0} className="link font-semibold disabled:opacity-40">
          Previous page
        </button>
        <p className="text-center text-(length:--step-small)" aria-live="polite">
          Page {cur + 1} of {n}
          <span className="block opacity-70">Drag a page to turn it</span>
        </p>
        <button type="button" onClick={() => go(cur + 1)} disabled={cur >= n - 1} className="link font-semibold disabled:opacity-40">
          Next page
        </button>
      </div>
    </div>
  );
}

function Masthead() {
  return (
    <header className="flex flex-col items-center text-center">
      <Mark className="size-16" />
      <p className="display mt-3 text-[2.75rem] tracking-[0.04em]">Durbin Bangla</p>
      <p className="bn text-lg" lang="bn">দূরবীন বাংলা</p>
      <p className="mt-1 font-serif italic">The heart of Bangal, on your plate</p>
      <span aria-hidden className="mt-8 block h-px w-full" style={{ background: INK }} />
      <p className="mt-8 font-serif text-[clamp(1.6rem,1.2rem+1.2vw,2.25rem)] italic leading-tight" style={{ color: ACCENT }}>
        &ldquo;Bangalir Shaad O Oitijjo&rsquo;r Roshayon&rdquo;
      </p>
      <p className="display mt-6 text-xl tracking-[0.12em]">Every day 7 am to 11 pm</p>
      <p className="display text-xl tracking-[0.12em]">Friday from 6:30 am</p>
      <p className="mt-6 max-w-[30ch] font-serif italic">Turn the page: morning, midday, bhortas, curries, fish, the grill, and sweets with cha.</p>
    </header>
  );
}

function SectionHead({ name, curved, cont, idSuffix }: { name: string; curved: boolean; cont: boolean; idSuffix: string }) {
  const id = `arc-${name.replace(/[^a-z]/gi, "")}-${idSuffix}`;
  if (cont)
    return (
      <h2 className="display text-center text-2xl tracking-[0.1em]">
        {name} <span className="font-serif text-lg normal-case italic tracking-normal">continued</span>
      </h2>
    );
  if (curved)
    return (
      <h2 className="mx-auto max-w-sm">
        <svg viewBox="0 0 400 90" className="w-full" role="img" aria-label={name}>
          <path id={id} d="M20 82 Q200 2 380 82" fill="none" />
          <text className="display" fontSize="38" letterSpacing="2" fill={INK} textAnchor="middle" {...(name.length > 16 ? { textLength: 350, lengthAdjust: "spacingAndGlyphs" } : {})}>
            <textPath href={`#${id}`} startOffset="50%">{name.toUpperCase()}</textPath>
          </text>
        </svg>
      </h2>
    );
  return (
    <header className="text-center">
      <p className="display mb-1 text-xl tracking-[0.18em]">{EN[name] ?? ""}</p>
      <h2 className="display text-[clamp(2.25rem,1.6rem+2vw,3.5rem)] tracking-[0.03em]">{name}</h2>
      <p className="display mt-2 flex items-center justify-center gap-3 text-base tracking-[0.16em]">
        Prices in taka
        <span className="grid h-9 w-16 place-items-center text-lg" style={{ color: ACCENT, clipPath: "polygon(50% 0,100% 50%,50% 100%,0 50%)", background: ACCENT }}>
          <span className="grid h-[calc(100%-3px)] w-[calc(100%-5px)] place-items-center" style={{ background: PAPER, clipPath: "polygon(50% 0,100% 50%,50% 100%,0 50%)" }}>৳</span>
        </span>
        Plus 5% VAT
      </p>
    </header>
  );
}

function DishRow({ d, measure = false }: { d: Dish; measure?: boolean }) {
  return (
    <li data-m-dish={measure ? d.id : undefined} className={`border-b py-2.5 ${d.remaining === 0 ? "opacity-45" : ""}`} style={{ borderColor: "rgb(46 40 38 / .45)" }}>
      <div className="flex items-baseline gap-2">
        <span className="display text-[1.15rem] tracking-[0.12em]">{d.name}</span>
        <span aria-hidden className="min-w-6 flex-1 translate-y-[-0.3em] border-b-2 border-dotted" style={{ borderColor: INK }} />
        <span className="display text-[1.15rem] tracking-[0.08em] tabular-nums">{taka(d.price)}</span>
      </div>
      {d.signature || d.remaining === 0 ? <p className="font-serif italic">{d.remaining === 0 ? "Sold out today" : "House favourite"}</p> : null}
    </li>
  );
}

function Info() {
  return (
    <section aria-label="Hours and ordering" className="flex flex-col items-center gap-6 text-center">
      <p className="font-serif italic">Prices in taka. 5% VAT applies as per government rule.</p>
      <p className="display text-xl tracking-[0.12em]">{PHONE}</p>
      <div className="flex flex-wrap justify-center gap-4">
        <Link href="/order" className="action">
          Pre-order for pickup
        </Link>
        <Link href="/book" className="link self-center font-semibold">
          Book a table
        </Link>
      </div>
    </section>
  );
}
