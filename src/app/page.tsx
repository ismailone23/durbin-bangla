"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ADDRESS,
  PHONE,
  SiteFooter,
  SiteHeader,
  SiteRoot,
  WallTrail,
} from "@/components/site";
import { usePoll } from "@/lib/client";
import { dhakaDay, fmtDay, fmtTime } from "@/lib/format";

type Status = {
  now: number;
  serviceOpen: boolean;
  queue: {
    open: boolean;
    waiting: number;
    eta: number;
    nowServing: number | null;
  };
  nextSlot: { day: string; slot: string; free: number } | null;
};

const d = (i: number) => ({ "--i": i }) as React.CSSProperties;
const PLACE = "Durbin Bangla, Mohakhali, Dhaka";
const MAPS = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(PLACE)}`;
const MAP_EMBED = `https://www.google.com/maps?q=${encodeURIComponent(PLACE)}&output=embed`;

const NAME = ["Durbin Bangla", "দূরবীন বাংলা"];

/** What the lens shows, in turn. All photographed at Durbin Bangla. */
const LENS = [
  ["/photos/thali.jpg", "A brass tray of curries at Durbin Bangla"],
  ["/photos/curries.jpg", "Curries and roti at Durbin Bangla"],
  ["/photos/rasgulla.jpg", "Rasgulla made in the Durbin Bangla kitchen"],
  ["/photos/cha.jpg", "Malai cha in Durbin Bangla's own cups"],
  ["/photos/dal.jpg", "A bowl of dal at Durbin Bangla"],
];

function Lens() {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setN((x) => (x + 1) % LENS.length), 3500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="absolute left-1/2 top-[34%] size-[46vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full sm:top-[36%] sm:size-[clamp(260px,27vw,400px)]">
      {LENS.map(([src, alt], i) => (
        <img
          key={src}
          src={src}
          alt={i === n ? alt : ""}
          aria-hidden={i !== n}
          width={1200}
          height={1200}
          fetchPriority={i === 0 ? "high" : undefined}
          className="absolute inset-0 size-full object-cover transition-opacity duration-1000"
          style={{ opacity: i === n ? 1 : 0 }}
        />
      ))}
      <div className="absolute inset-0 bg-black/25" />
    </div>
  );
}

/** Real reviews, copied word for word. Sources: Google Maps via bdplaces.com and restaurantguru.com; moumachi.com.bd. */
const REVIEWS: { name: string; source: string; stars?: number; sub?: string; text: string }[] = [
  { name: "Nusrat N.", source: "Google review", sub: "Food 4 · Service 4 · Atmosphere 4", text: "Had a wonderful dining experience at Durbin Bangla! The Bengali cuisine was authentic and full of flavor." },
  { name: "Paritosh H.", source: "Google review", stars: 5, text: "Tasty Bangla Khabar." },
  { name: "Md. Tariqul Islam S.", source: "Moumachi review", text: "I love their food. Food was outstanding. I strongly recommend this restaurant." },
  { name: "Abu Tamanna H.", source: "Google review", text: "Delicious food with reasonable price..." },
  { name: "Abdullah A.", source: "Moumachi review", text: "Had their food today morning... Foods were delicious. Recommended." },
];

function Stars({ n }: { n: number }) {
  return (
    <span role="img" aria-label={`${n} out of 5 stars`} className="inline-flex gap-1 align-[-0.1em]">
      {Array.from({ length: n }, (_, i) => (
        <svg key={i} viewBox="0 0 20 20" className="size-[1em]" fill="currentColor" aria-hidden>
          <path d="M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L1.6 7.7l5.8-.8z" />
        </svg>
      ))}
    </span>
  );
}

export default function Home() {
  const { data } = usePoll<Status>("/api/status", 10000);
  const today = data ? dhakaDay(data.now) : undefined;

  return (
    <SiteRoot>
      <span id="top" />
      <SiteHeader />
      {/* ── The lens: the name slides across a round view of the kitchen's dishes. ── */}
      <section
        className="deep relative isolate flex min-h-140 flex-col overflow-hidden"
        style={{ height: "100svh" }}
      >
        <WallTrail opacity={0.12} />
        <div className="relative mt-(--header-h,72px) flex-1">
          <Lens />
          <h1 className="absolute inset-x-0 top-[34%] -translate-y-1/2 sm:top-[36%]">
            <span className="sr-only">Durbin Bangla</span>
            <span
              aria-hidden
              className="marquee display text-[30vw] leading-none sm:text-[clamp(120px,16vw,250px)]"
            >
              {[0, 1].map((k) => (
                <span key={k} className="flex">
                  {[...NAME, ...NAME].map((n, i) => (
                    <span key={i} className="flex items-center">
                      <span
                        className={
                          i % 2
                            ? "bn normal-case font-semibold tracking-normal"
                            : ""
                        }
                      >
                        {n}
                      </span>
                      <span className="mx-[0.25em] inline-block size-[0.14em] rounded-full bg-current" />
                    </span>
                  ))}
                </span>
              ))}
            </span>
          </h1>
          <div className="frame absolute inset-x-0 top-[58%] text-center sm:top-[70%]">
            <p className="mx-auto max-w-[34ch] text-(length:--step-lead) leading-snug">
              Bengal&apos;s home cooking, brought close. Book a table or hold
              your place in the queue from your phone.
            </p>
            <p
              className="mt-5 text-(length:--step-small) tabular-nums"
              style={{ color: "var(--deep-soft)" }}
              aria-live="polite"
            >
              {data?.queue.open
                ? `Walk-in wait now about ${data.queue.eta} min`
                : "Open every day, 7 am to 11 pm"}
            </p>
          </div>
        </div>

        <div className="frame relative z-20 flex flex-col gap-2 pb-6 sm:flex-row sm:items-end sm:justify-between sm:pb-10">
          <p className="text-(length:--step-small)">
            <a href={MAPS} target="_blank" rel="noreferrer" className="link font-semibold">
              <Stars n={1} /> 4.2 on Google · 2,170 reviews
            </a>
            <span className="block mt-1">
              Mohakhali, opposite BRAC University&apos;s old campus
            </span>
          </p>
          <p className="text-(length:--step-small)">
            Breakfast · Lunch · Tea · Dinner
          </p>
        </div>
      </section>

      {/* ── The name, beside the room it describes. ── */}
      <section className="frame grid gap-12 py-[clamp(96px,14vw,200px)] lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-[18svh]">
            <h2 data-reveal className="display text-(length:--step-head)">
              Named for a telescope
            </h2>
            <p
              data-reveal
              style={d(1)}
              className="mt-10 text-(length:--step-state) leading-[1.2]"
            >
              A দূরবীন brings faraway things close. We do the same for the
              Bengali dishes people rarely get to eat.
            </p>
            <p data-reveal style={d(2)} className="mt-8 max-w-[46ch]">
              Ghee malai shuji, makkhon chicken soup, shobji gulisthan, murgh
              polao, illish paturi, and chanar rosh golla made in our own
              kitchen. From seven in the morning to eleven at night, under lamps
              made from old tea kettles.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-[14svh] lg:col-span-6 lg:col-start-7">
          <figure data-reveal className="w-[78%]">
            <img
              src="/photos/interior.jpg"
              alt="The Durbin Bangla dining room: ochre walls, arched niches, hanging lamps and wooden tables"
              width={900}
              height={1200}
              loading="lazy"
              className="aspect-3/4 w-full object-cover"
            />
            <figcaption className="mt-3 text-(length:--step-small)">
              The dining room
            </figcaption>
          </figure>
          <figure data-reveal className="w-[70%] self-end">
            <img
              src="/photos/brass-wall.jpg"
              alt="Brass plates, bowls and pots hung on an orange wall"
              width={960}
              height={1200}
              loading="lazy"
              className="aspect-4/5 w-full object-cover object-right"
            />
            <figcaption className="mt-3 text-(length:--step-small)">
              The brass wall
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ── The queue is real: the press line, the Google count, the entrance. ── */}
      <section className="deep relative isolate overflow-hidden">
        <WallTrail />
        <div className="frame grid gap-14 pt-[clamp(96px,12vw,180px)] lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 data-reveal className="display text-(length:--step-head)">
              The queue is famous
            </h2>
            <blockquote data-reveal style={d(1)} className="mt-10">
              <p className="text-(length:--step-state) leading-[1.2]">
                &ldquo;Their early mornings witness a long waiting queue for the
                mutton paya, the ghee malai suji, and the paper-thin rumali
                roti.&rdquo;
              </p>
              <footer
                className="mt-6 text-(length:--step-small)"
                style={{ color: "var(--deep-soft)" }}
              >
                <a
                  href="https://www.thedailystar.net/my-dhaka/news/heart-chaos-i-find-dhakas-flavour-4002711"
                  className="link"
                  target="_blank"
                  rel="noreferrer"
                >
                  The Daily Star, My Dhaka
                </a>
              </footer>
            </blockquote>
            <p data-reveal style={d(2)} className="mt-12 max-w-[46ch]">
              So the wait moved to your phone. Book a time, or take a token at
              the gate and come back when you&apos;re called.
            </p>
          </div>
          <div className="flex flex-col justify-end gap-10 lg:col-span-4 lg:col-start-9">
            <div data-reveal style={d(2)}>
              <p className="display text-(length:--step-xl)">4.2</p>
              <p className="mt-3">
                out of 5, from 2,170 reviews on Google Maps
              </p>
            </div>
            <blockquote data-reveal style={d(3)}>
              <p className="text-(length:--step-lead)">
                &ldquo;Tasty Bangla Khabar.&rdquo;
              </p>
              <footer
                className="mt-2 text-(length:--step-small)"
                style={{ color: "var(--deep-soft)" }}
              >
                Paritosh H., Google review
              </footer>
            </blockquote>
          </div>
        </div>
        <figure data-reveal className="frame pb-[clamp(96px,12vw,180px)] pt-16">
          <img
            src="/photos/entrance.jpg"
            alt="The Durbin Bangla entrance: a dusty-pink wall with the Bangla sign and a hanging clay pot"
            width={1600}
            height={900}
            loading="lazy"
            className="aspect-video w-full object-cover"
          />
          <figcaption
            className="mt-3 text-(length:--step-small)"
            style={{ color: "var(--deep-soft)" }}
          >
            The entrance, opposite BRAC University&apos;s old campus
          </figcaption>
        </figure>
      </section>

      {/* ── Real reviews, verbatim. Stars only where the source shows them. ── */}
      <section aria-labelledby="reviews-h" className="frame py-[clamp(96px,12vw,180px)]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 id="reviews-h" data-reveal className="display text-(length:--step-head)">
            What diners say
          </h2>
          <a data-reveal href={MAPS} target="_blank" rel="noreferrer" className="link font-semibold">
            Read all 2,170 reviews on Google
          </a>
        </div>
        <div className="mt-14 gap-10 sm:columns-2 lg:columns-3">
          {REVIEWS.map((r, i) => (
            <blockquote key={r.name} data-reveal style={d(i % 3)} className="mb-12 break-inside-avoid">
              {r.stars && (
                <p className="text-(length:--step-lead) text-primary">
                  <Stars n={r.stars} />
                </p>
              )}
              {r.sub && <p className="text-(length:--step-small) font-semibold text-primary">{r.sub}</p>}
              <p className="mt-3 text-(length:--step-lead) leading-snug">&ldquo;{r.text}&rdquo;</p>
              <footer className="mt-3 text-(length:--step-small) text-muted-foreground">
                {r.name}, {r.source}
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      {/* ── Three ways in, down a diagonal. ── */}
      <section className="frame py-[clamp(96px,14vw,200px)]">
        <div className="grid gap-y-14 md:grid-cols-12 md:gap-x-8">
          <figure data-reveal className="md:col-span-4 md:row-start-1">
            <img
              src="/photos/cha.jpg"
              alt="Two cups of malai cha in Durbin Bangla's own cups"
              width={900}
              height={1200}
              loading="lazy"
              className="aspect-3/4 w-full object-cover"
            />
          </figure>
          <div className="max-md:order-first md:col-span-5 md:col-start-6 md:row-start-1">
            <h2 data-reveal className="display text-(length:--step-head)">
              Three ways in
            </h2>
            <Way
              i={1}
              title="Before you leave home."
              href="/book"
              cta="Book a table"
            >
              Book a 45-minute table for the morning rush, today or up to three
              days ahead, and go straight to your seat. Later in the day, just
              walk in.
              {data?.nextSlot && (
                <>
                  {" "}
                  Next free table:{" "}
                  <strong>{fmtTime(data.nextSlot.slot)}</strong>,{" "}
                  {fmtDay(data.nextSlot.day, today)
                    .split(" · ")[0]
                    .toLowerCase()}
                  .
                </>
              )}
            </Way>
          </div>

          <figure
            data-reveal
            className="w-[62%] justify-self-end md:col-span-3 md:col-start-6 md:mt-10 md:w-full"
          >
            <img
              src="/photos/rasgulla.jpg"
              alt="Rasgulla in syrup, made in the Durbin Bangla kitchen"
              width={1200}
              height={1200}
              loading="lazy"
              className="aspect-square w-full object-cover"
            />
          </figure>
          <div className="md:col-span-4 md:col-start-9 md:mt-10">
            <Way i={0} title="At the gate." href="/book#queue" cta="How the queue works">
              Scan the code at the gate and take a token on your phone. Wait
              wherever you like; your place updates live and your phone buzzes
              when you&apos;re called.
              {data?.queue.open && (
                <>
                  {" "}
                  Right now: <strong>{data.queue.waiting} waiting</strong>
                  {data.queue.nowServing
                    ? `, serving #${data.queue.nowServing}`
                    : ""}
                  .
                </>
              )}
            </Way>
          </div>

          <div className="order-last md:order-0 md:col-span-5 md:col-start-2 md:mt-45">
            <Way
              i={0}
              title="On the way to work, or home."
              href="/order"
              cta="Order takeaway"
            >
              Pre-order from the menu for a 15-minute pickup window. Pay at the
              counter when you collect.
            </Way>
          </div>
          <figure
            data-reveal
            className="w-[78%] md:col-span-5 md:col-start-8 md:mt-45 md:w-full"
          >
            <img
              src="/photos/curries.jpg"
              alt="Bowls of curry with roti at Durbin Bangla"
              width={1600}
              height={1000}
              loading="lazy"
              className="aspect-16/10 w-full object-cover"
            />
          </figure>
        </div>
      </section>

      {/* ── Visit: the real map and the real door. ── */}
      <section
        id="visit"
        className="frame scroll-mt-20 py-[clamp(96px,12vw,180px)]"
      >
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 data-reveal className="display text-(length:--step-head)">
              Find the lane
            </h2>
            <p
              data-reveal
              style={d(1)}
              className="mt-8 max-w-[30ch] text-(length:--step-state) leading-[1.2]"
            >
              Opposite BRAC University&apos;s old campus in Mohakhali. Look for
              the pink wall.
            </p>
            <div data-reveal style={d(2)} className="mt-10">
              <p>{ADDRESS}</p>
              <dl className="mt-6 grid grid-cols-[1fr_auto] gap-y-2 tabular-nums">
                <dt>Saturday to Thursday</dt>
                <dd className="text-right">7:00 am – 11:00 pm</dd>
                <dt>Friday</dt>
                <dd className="text-right">6:30 am – 11:00 pm</dd>
              </dl>
              <p className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
                <a
                  href={`tel:${PHONE.replace(/[^+\d]/g, "")}`}
                  className="link font-semibold"
                >
                  {PHONE}
                </a>
                <a
                  href={MAPS}
                  className="link font-semibold"
                  target="_blank"
                  rel="noreferrer"
                >
                  Directions
                </a>
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-8 lg:col-span-6 lg:col-start-7">
            <iframe
              data-reveal
              title="Map showing Durbin Bangla in Mohakhali, Dhaka"
              src={MAP_EMBED}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="aspect-4/3 w-full border-0 lg:aspect-auto lg:h-full lg:min-h-120"
            />
          </div>
        </div>
      </section>

      <SiteFooter />
    </SiteRoot>
  );
}

function Way({
  i,
  title,
  href,
  cta,
  children,
}: {
  i: number;
  title: string;
  href: string;
  cta: string;
  children: React.ReactNode;
}) {
  return (
    <div data-reveal style={d(i)} className={i ? "mt-10" : ""}>
      <p className="max-w-[40ch]">
        <strong>{title}</strong> {children}
      </p>
      <Link href={href} className="link mt-4 inline-block font-semibold">
        {cta}
      </Link>
    </div>
  );
}
