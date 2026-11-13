"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import credits from "../../public/photos/credits.json";
import { cn } from "@/lib/utils";

export const PHONE = "+880 1730-015798";
export const ADDRESS = "40 Bir Uttam A K Khandokar Road, Mohakhali, Dhaka 1212";

const NAV = [
  { href: "/menu", label: "Menu" },
  { href: "/order", label: "Takeaway" },
  { href: "/board", label: "Gate display" },
];

/** Round lotus-over-water mark, after the emblem on the restaurant's cups. shortcut: drawn approximation, swap in their real logo file when we get it. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <circle cx="16" cy="16" r="14.5" />
      <path d="M16 8c2.2 2.4 2.2 6.6 0 9.6-2.2-3-2.2-7.2 0-9.6Z" />
      <path d="M16 17.6c-1.6-2.8-4.6-4-7-3.4.6 2.6 3.6 4 7 3.4Zm0 0c1.6-2.8 4.6-4 7-3.4-.6 2.6-3.6 4-7 3.4Z" />
      <path d="M9 21.5c1.2.8 2.3.8 3.5 0s2.3-.8 3.5 0 2.3.8 3.5 0 2.3-.8 3.5 0M11 24.5c1-.6 2-.6 3 0s2 .6 3 0 2-.6 3 0" />
    </svg>
  );
}

export function Logo({ sub = "Mohakhali" }: { sub?: string }) {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="Durbin Bangla home">
      <Mark className="size-8 text-primary" />
      <span className="leading-tight">
        <span className="block font-bn text-lg font-semibold" lang="bn">দূরবীন বাংলা</span>
        <span className="block text-xs text-muted-foreground">Durbin Bangla · {sub}</span>
      </span>
    </Link>
  );
}

/** The public site's root: theme scope, plus entrances for anything marked data-reveal. */
export function SiteRoot({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current!;
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target))),
      { rootMargin: "0px 0px -8% 0px" },
    );
    const scan = () => root.querySelectorAll("[data-reveal]:not(.in)").forEach((el) => io.observe(el));
    scan();
    root.classList.add("js");
    const mo = new MutationObserver(scan);
    mo.observe(root, { childList: true, subtree: true });
    return () => (io.disconnect(), mo.disconnect());
  }, []);
  return <div ref={ref} className={cn("site min-h-dvh", className)}>{children}</div>;
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-3", className)} aria-label="Durbin Bangla home">
      <Mark className="size-9 shrink-0" />
      <span className="leading-none">
        <span className="bn block text-[length:var(--step-lead)] font-semibold" lang="bn">দূরবীন বাংলা</span>
        <span className="mt-1 block text-[length:var(--step-small)] opacity-80">Durbin Bangla<span className="max-sm:hidden"> · Mohakhali</span></span>
      </span>
    </Link>
  );
}

/** The double dashed wave painted on Durbin Bangla's dining-room walls, drawn as a faint background.
 *  Put it in a `relative isolate` section: it sits behind the content (-z-10) and never takes clicks. */
export function WallTrail({ className, opacity = 0.16 }: { className?: string; opacity?: number }) {
  const waves = [
    "M-60 470 C 140 330 260 600 470 470 S 820 170 1010 300 S 1300 560 1500 250",
    "M-60 180 C 180 60 300 330 520 230 S 900 40 1120 150 S 1380 330 1500 120",
  ];
  return (
    <svg aria-hidden viewBox="0 0 1440 640" preserveAspectRatio="xMidYMid slice" className={cn("pointer-events-none absolute inset-0 -z-10 size-full", className)} style={{ opacity }}>
      <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeDasharray="13 13">
        {waves.flatMap((d, i) => [<path key={`${i}a`} d={d} />, <path key={`${i}b`} d={d} transform="translate(0 20)" />])}
      </g>
    </svg>
  );
}

export function SiteHeader() {
  const path = usePathname();
  const ref = useRef<HTMLElement>(null);
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const el = ref.current!;
    // Publish the header's height so the first section can start underneath it.
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty("--header-h", `${el.offsetHeight}px`));
    ro.observe(el);
    const onScroll = () => setSolid(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => (ro.disconnect(), window.removeEventListener("scroll", onScroll));
  }, []);
  return (
    <header
      ref={ref}
      className="sticky top-0 z-40 -mb-(--header-h) transition-colors duration-300"
      style={{ background: solid ? "var(--deep)" : "transparent", color: "var(--deep-ink)" }}
    >
      <div className="frame flex h-18 items-center justify-between gap-6">
        <Wordmark />
        <div className="flex items-center gap-8">
          <nav aria-label="Main" className="hidden items-center gap-7 lg:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-current={path === n.href ? "page" : undefined} className="py-2 text-[length:var(--step-small)] font-semibold underline-offset-8 hover:underline aria-[current=page]:underline">
                {n.label}
              </Link>
            ))}
          </nav>
          <Link href="/book" className="action min-h-11 whitespace-nowrap px-5 text-[length:var(--step-small)]">Book a table</Link>
        </div>
      </div>
      <nav aria-label="Main mobile" className="frame flex gap-6 overflow-x-auto pb-3 text-[length:var(--step-small)] font-semibold lg:hidden">
        {NAV.map((n) => <Link key={n.href} href={n.href} aria-current={path === n.href ? "page" : undefined} className="shrink-0 py-1 underline-offset-8 aria-[current=page]:underline">{n.label}</Link>)}
      </nav>
    </header>
  );
}

const CREDITS = credits.map((c) => ({ file: c.file.split("/").pop()!, title: c.title, creator: c.creator, license: c.license, page: c.page }));

export function SiteFooter() {
  return (
    <footer className="relative isolate overflow-hidden" style={{ background: "var(--wall)", color: "var(--wall-ink)" }}>
      <WallTrail opacity={0.18} />
      <div className="frame flex md:min-h-[72svh] flex-col justify-between gap-16 py-10">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="grid max-w-3xl gap-6 text-[length:var(--step-small)] sm:grid-cols-3">
            <Wordmark />
            <p>{ADDRESS}. In the lane opposite BRAC University&apos;s old campus.<br /><a href={`tel:${PHONE.replace(/[^+\d]/g, "")}`} className="link font-semibold">{PHONE}</a></p>
            <p>Every day 7 am to 11 pm.<br />Friday from 6:30 am.<br />Breakfast, lunch, tea and dinner.</p>
          </div>
          <a href="#top" className="link text-[length:var(--step-small)] font-semibold">Back to top</a>
        </div>
        <div>
          <p className="mb-4 text-[length:var(--step-small)]">Bangla food in Mohakhali, from the first cup of cha to dinner</p>
          <Link href="/" className="display block w-full text-[clamp(3.4rem,16.5vw,20rem)] leading-[0.9] hover:opacity-85">
            Durbin Bangla
          </Link>
          <div className="mt-10 grid gap-3 text-[length:var(--step-small)] sm:grid-cols-3 sm:items-start">
            <p className="flex flex-wrap gap-x-5 gap-y-1">
              <Link href="/book" className="link">Book</Link>
              <Link href="/order" className="link">Takeaway</Link>
              <Link href="/board" className="link">Gate display</Link>
              <Link href="/staff" className="link">Staff</Link>
            </p>
            <details className="sm:text-center">
              <summary className="cursor-pointer underline underline-offset-4">Photo credits</summary>
              <ul className="mt-3 space-y-1 text-left">
                {CREDITS.map((c) => (
                  <li key={c.file}><a href={c.page} className="link" rel="noreferrer" target="_blank">{c.title}</a>, photo by {c.creator}, {c.license}</li>
                ))}
              </ul>
            </details>
            <p className="sm:text-right">Mohakhali, Dhaka · {new Date().getFullYear()}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

/** Inner pages: a deep title band with one picture, then the task on the white field. */
/** `full`: the page lays out its own full-width sections instead of the centred task column. */
export function PageShell({ title, description, photo, alt = "", full = false, children }: { title?: string; description?: string; photo?: string; alt?: string; full?: boolean; children: React.ReactNode }) {
  return (
    <SiteRoot>
      <span id="top" />
      <SiteHeader />
      {title && (
        <section className="deep relative isolate grid md:min-h-[min(62svh,600px)] md:grid-cols-2">
          <WallTrail />
          {/* Text starts on the same left edge as the content below: the page gutter, or the centred column. */}
          <div
            className="flex flex-col justify-end pb-12 pr-(--gutter) pt-[calc(var(--header-h,72px)+2.5rem)] md:pb-16"
            style={{ paddingLeft: full ? "var(--gutter)" : "max(var(--gutter), calc((100vw - 72rem) / 2 + var(--gutter)))" }}
          >
            <h1 data-reveal className="display max-w-[14ch] text-[length:var(--step-head)]">{title}</h1>
            {description && <p data-reveal style={{ "--i": 1 } as React.CSSProperties} className="mt-8 max-w-[44ch] text-[length:var(--step-lead)] leading-snug">{description}</p>}
          </div>
          {photo && (
            <div className="relative min-h-72 md:min-h-full">
              <img src={photo} alt={alt} width={1600} height={1200} fetchPriority="high" className="absolute inset-0 size-full object-cover" />
              {/* The photo melts into the band's ground on the side that meets the text (asked for by the client). */}
              <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_bottom,var(--deep)_0%,transparent_35%)] md:bg-[linear-gradient(to_right,var(--deep)_0%,color-mix(in_oklch,var(--deep)_55%,transparent)_18%,transparent_45%)]" /> {/* taste-skill-ignore: client-requested fade */}
            </div>
          )}
        </section>
      )}
      {full ? <main>{children}</main> : <main className="frame mx-auto min-h-[50dvh] max-w-6xl py-14 sm:py-20">{children}</main>}
      <SiteFooter />
    </SiteRoot>
  );
}
