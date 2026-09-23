"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ReserveRouteAnimationProps = {
  sourceCity: string;
  destinationCity: string;
  intermediateStops: string[];
  pickupTimeLabel: string;
  endTimeLabel: string;
};

type MarkerPoint = {
  id: string;
  label: string;
  x: number;
  y: number;
  isTerminal: boolean;
};

type StopCard = MarkerPoint & {
  dayLabel: string;
  subtitle: string;
  orientation: "up" | "down";
};

const ROUTE_PATH_D = "M60 200 C160 95, 270 240, 390 175 S560 96, 650 132 S810 210, 930 120";
const BACKDROP_LINE_ONE = "M-30 80 C200 20 290 160 470 95 S760 35 920 120 S1180 190 1450 60";
const BACKDROP_LINE_TWO = "M-30 245 C170 145 270 300 470 225 S770 170 940 260 S1190 325 1450 190";

function truncateStopName(value: string, maxChars = 9) {
  const normalized = value.trim();
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, maxChars)}…`;
}

export function ReserveRouteAnimation({
  sourceCity,
  destinationCity,
  intermediateStops,
  pickupTimeLabel,
  endTimeLabel,
}: ReserveRouteAnimationProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const carRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [stopCards, setStopCards] = useState<StopCard[]>([]);

  const waypointLabels = useMemo(() => {
    const labels = [sourceCity, ...intermediateStops, destinationCity]
      .map((value) => value.trim())
      .filter(Boolean);
    if (labels.length <= 1) {
      return [sourceCity, destinationCity];
    }
    return labels;
  }, [destinationCity, intermediateStops, sourceCity]);

  useEffect(() => {
    const pathNode = pathRef.current;
    if (!pathNode) {
      return;
    }

    const totalLength = pathNode.getTotalLength();
    const nextPoints = waypointLabels.map((label, index, list) => {
      const fraction = waypointLabels.length === 1 ? 0 : index / (waypointLabels.length - 1);
      const point = pathNode.getPointAtLength(totalLength * fraction);
      const isTerminal = index === 0 || index === list.length - 1;
      return {
        id: `${label}-${index}`,
        label,
        x: point.x,
        y: point.y,
        isTerminal,
        dayLabel: `DAY ${String(index + 1).padStart(2, "0")}`,
        subtitle: isTerminal ? (index === 0 ? "The starting point" : "The final destination") : "Stopover",
        orientation: index % 2 === 0 ? "up" : "down",
      } satisfies StopCard;
    });

    setStopCards(nextPoints);
  }, [waypointLabels]);

  useEffect(() => {
    const pathNode = pathRef.current;
    const svgNode = svgRef.current;
    const carNode = carRef.current;
    if (!pathNode || !svgNode || !carNode) {
      return;
    }

    const totalLength = pathNode.getTotalLength();
    const durationMs = 9000;
    let startAt: number | null = null;

    const animate = (timestamp: number) => {
      if (startAt === null) {
        startAt = timestamp;
      }
      const progress = ((timestamp - startAt) % durationMs) / durationMs;
      const current = pathNode.getPointAtLength(totalLength * progress);
      const next = pathNode.getPointAtLength(totalLength * Math.min(progress + 0.002, 1));

      const svgRect = svgNode.getBoundingClientRect();
      const scaleX = svgRect.width / 1000;
      const scaleY = svgRect.height / 280;
      const angle = (Math.atan2((next.y - current.y) * scaleY, (next.x - current.x) * scaleX) * 180) / Math.PI;

      carNode.style.transform = `translate(${current.x * scaleX - carNode.offsetWidth / 2}px, ${current.y * scaleY - carNode.offsetHeight / 2}px) rotate(${angle}deg)`;
      animationFrameRef.current = window.requestAnimationFrame(animate);
    };

    animationFrameRef.current = window.requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <article className="relative isolate overflow-hidden rounded-2xl border border-emerald-200 bg-[linear-gradient(115deg,#062d24_0%,#0d4935_48%,#083126_100%)] text-white shadow-sm">
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(222,248,182,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(222,248,182,0.16)_1px,transparent_1px)] [background-size:38px_38px]" />
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-40" viewBox="0 0 1400 420" preserveAspectRatio="none" aria-hidden>
        <path d={BACKDROP_LINE_ONE} fill="none" stroke="#9ecf7a" strokeWidth="1.1" />
        <path d={BACKDROP_LINE_TWO} fill="none" stroke="#93bf79" strokeWidth="1" />
        <circle cx="1240" cy="78" r="52" fill="none" stroke="#a4d681" strokeWidth="1" />
        <circle cx="1240" cy="78" r="72" fill="none" stroke="#a4d681" strokeWidth="1" />
      </svg>

      <div className="relative z-10 px-3 pb-2 pt-2 md:px-5 md:pb-2.5 md:pt-3">
        <header className="hidden max-w-[41%] md:block md:max-w-[34%]">
          <p className="mb-[9px] inline-flex items-center gap-2 text-[clamp(9px,1.05vw,15px)] font-bold uppercase tracking-[0.17em] text-[#d9f986]">
            <span className="h-px w-[18px] bg-current" aria-hidden />
            {`${waypointLabels.length} stops • one beautiful drive`}
          </p>
          <h3 className="relative [font-family:Fraunces,serif] text-[clamp(25px,3.8vw,64px)] font-semibold leading-[0.96] tracking-[-0.055em] text-white [text-wrap:balance]">
            <span aria-hidden className="absolute inset-0 -z-10 text-white opacity-20 blur-[3px]">
              Travel boleto, Tamayo!!
            </span>
            <span className="[text-shadow:0_0_1px_rgba(233,244,219,0.9),0_0_10px_rgba(201,242,100,0.2)]">
              Travel boleto, Tamayo!!
            </span>
          </h3>
          <p className="mt-[13px] text-[clamp(10px,1.1vw,16px)] text-[#acc6a7] tracking-[0.02em]">
            {pickupTimeLabel}
            {endTimeLabel ? ` • ${endTimeLabel}` : ""}
          </p>
        </header>

        <div className="relative mt-1 h-[156px] md:mt-3 md:h-[152px]">
          <svg
            ref={svgRef}
            viewBox="0 0 1000 280"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden
          >
            <path d={ROUTE_PATH_D} className="fill-none stroke-black/35 stroke-[4px]" />
            <path d={ROUTE_PATH_D} className="fill-none stroke-[#c9f264]/20 stroke-[7px] blur-[2px]" />
            <path ref={pathRef} d={ROUTE_PATH_D} className="fill-none stroke-[#d6f96f] stroke-[1.8px]" strokeDasharray="2 5" />
          </svg>

          {stopCards.map((marker, index) => (
            <div
              key={marker.id}
              className="pointer-events-none absolute z-20"
              style={{ left: `${(marker.x / 1000) * 100}%`, top: `${(marker.y / 280) * 100}%` }}
            >
              <span
                className={`absolute left-1/2 top-1/2 inline-flex h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
                  marker.isTerminal ? "border-[#ecffb4] bg-[#d9f986]" : "border-[#d9f986] bg-[#c9f264]"
                }`}
              />
              <div
                className={`absolute left-1/2 w-[122px] -translate-x-1/2 rounded-lg border border-[#e5ffbf24] bg-[#0629204f] px-2 py-1.5 backdrop-blur-[7px] md:w-[160px] md:rounded-xl md:px-3 md:py-2 ${
                  // Keep the first mobile stop label below the marker so it does not clip near the card edge.
                  marker.orientation === "up"
                    ? index === 0
                      ? "translate-y-3 md:-translate-y-[84px]"
                      : "-translate-y-[84px]"
                    : "translate-y-3"
                }`}
              >
                <span className="hidden text-[10px] font-bold uppercase tracking-[0.13em] text-[#d9f986] md:block">
                  {marker.dayLabel}
                </span>
                <span className="mt-0.5 block truncate text-[8px] font-bold leading-[1.05] text-[#f0f8e7] md:text-[29px] md:leading-[1.03] md:[font-size:clamp(18px,1.45vw,29px)]">
                  <span className="md:hidden">{truncateStopName(marker.label)}</span>
                  <span className="hidden md:inline">{marker.label}</span>
                </span>
                <span className="mt-1 hidden truncate text-[11px] text-[#a8c8a5] md:block">{marker.subtitle}</span>
              </div>
            </div>
          ))}

          <div ref={carRef} className="pointer-events-none absolute z-30 h-[20px] w-[46px] will-change-transform md:h-[30px] md:w-[74px]">
            <div className="relative flex h-[14px] items-end justify-center rounded-[9px_13px_5px_5px] border border-[#f4ffcb] bg-[#ddfa7e] px-1 pb-0 text-[7px] font-bold text-[#063126] shadow-[0_0_20px_rgba(220,250,126,0.45)] md:h-[23px] md:px-2 md:pb-1 md:text-[10px]">
              tamayo
              <span className="absolute -top-[5px] left-[16%] h-[7px] w-[59%] skew-x-[-13deg] rounded-[12px_16px_0_0] border border-[#f4ffcb] border-b-0 bg-[#c9ed70] md:-top-[9px] md:h-[13px]" />
              <span className="absolute -bottom-[3px] left-[4px] h-[5px] w-[5px] rounded-full border border-[#133a30] bg-[#e9f7d9] md:-bottom-[5px] md:left-[8px] md:h-2 md:w-2 md:border-2" />
              <span className="absolute -bottom-[3px] right-[4px] h-[5px] w-[5px] rounded-full border border-[#133a30] bg-[#e9f7d9] md:-bottom-[5px] md:right-[8px] md:h-2 md:w-2 md:border-2" />
            </div>
          </div>
        </div>

        <p className="mt-1 text-[10px] text-[#a8c7a1] md:mt-2 md:text-[12px]">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#d9f986] shadow-[0_0_10px_#d9f986]" />
          Travelling with Tamayo
        </p>
      </div>
    </article>
  );
}
