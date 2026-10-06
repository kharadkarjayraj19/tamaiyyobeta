"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ReserveRouteAnimationProps = {
  sourceCity: string;
  destinationCity: string;
  intermediateStops: string[];
  pickupTimeLabel?: string;
  endTimeLabel?: string;
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

function truncateStopName(value: string, maxChars: number) {
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
  const isDenseRoute = stopCards.length >= 5;

  const waypointLabels = useMemo(() => {
    const labels = [sourceCity, ...intermediateStops, destinationCity]
      .map((value) => value.trim())
      .filter(Boolean);
    if (labels.length <= 1) {
      return [sourceCity, destinationCity];
    }
    return labels;
  }, [destinationCity, intermediateStops, sourceCity]);
  const stopCount = Math.max(waypointLabels.length - 2, 0);
  const stopSummary = `${stopCount} stop${stopCount === 1 ? "" : "s"} • one beautiful drive`;
  const dateSummary = pickupTimeLabel
    ? `${pickupTimeLabel}${endTimeLabel ? ` • ${endTimeLabel}` : ""}`
    : null;

  useEffect(() => {
    const pathNode = pathRef.current;
    if (!pathNode) {
      return;
    }

    const totalLength = pathNode.getTotalLength();
    let lastUpX = Number.NEGATIVE_INFINITY;
    let lastDownX = Number.NEGATIVE_INFINITY;
    const nextPoints = waypointLabels.map((label, index, list) => {
      const fraction = waypointLabels.length === 1 ? 0 : index / (waypointLabels.length - 1);
      const point = pathNode.getPointAtLength(totalLength * fraction);
      const isTerminal = index === 0 || index === list.length - 1;
      const denseGapThreshold = list.length >= 6 ? 160 : 130;
      const hasVerticalRoomAbove = point.y >= 76;
      const hasVerticalRoomBelow = point.y <= 214;
      const canUseUp = hasVerticalRoomAbove && Math.abs(point.x - lastUpX) >= denseGapThreshold;
      const canUseDown = hasVerticalRoomBelow && Math.abs(point.x - lastDownX) >= denseGapThreshold;
      let orientation: "up" | "down" = "up";

      // Keep start marker anchored down to avoid fighting with top-left header content.
      if (index === 0) {
        orientation = "down";
      } else if (index === list.length - 1) {
        orientation = hasVerticalRoomAbove ? "up" : "down";
      } else if (canUseUp || canUseDown) {
        orientation = canUseUp ? "up" : "down";
      } else {
        const upDistance = Math.abs(point.x - lastUpX);
        const downDistance = Math.abs(point.x - lastDownX);
        orientation = upDistance >= downDistance ? "up" : "down";
      }

      if (orientation === "up") {
        lastUpX = point.x;
      } else {
        lastDownX = point.x;
      }

      return {
        id: `${label}-${index}`,
        label,
        x: point.x,
        y: point.y,
        isTerminal,
        dayLabel: `DAY ${String(index + 1).padStart(2, "0")}`,
        subtitle: isTerminal ? (index === 0 ? "The starting point" : "The final destination") : "Stopover",
        orientation,
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
      </svg>
      <span className="pointer-events-none absolute left-[78%] top-[19%] h-0 w-0 -translate-x-1/2 -translate-y-1/2" aria-hidden>
        <span className="absolute left-1/2 top-1/2 h-[82px] w-[82px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#a4d6814d]" />
        <span className="absolute left-1/2 top-1/2 h-[58px] w-[58px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#a4d6814d]" />
      </span>

      <div className="relative z-10 px-3 pb-1.5 pt-1.5 md:px-4 md:pb-2 md:pt-2">
        <header className="max-w-[55%] md:max-w-[40%]">
          <p className="mb-1 inline-flex items-center gap-2 text-[clamp(8px,0.95vw,13px)] font-bold uppercase tracking-[0.17em] text-[#d9f986]">
            <span className="h-px w-[18px] bg-current" aria-hidden />
            My JOURNEY
          </p>
          <h3 className="relative [font-family:Fraunces,serif] font-semibold leading-[0.96] tracking-[0.01em] text-white md:tracking-[-0.03em] md:[text-wrap:balance] md:text-[clamp(25px,3.8vw,64px)]">
            <span aria-hidden className="absolute inset-0 -z-10 hidden text-white opacity-30 blur-[4px] md:block">
              Travel Boleto, TAMAYO!!
            </span>
            <span className="hidden [text-shadow:0_0_1px_rgba(233,244,219,0.95),0_0_8px_rgba(201,242,100,0.42),0_0_18px_rgba(201,242,100,0.2)] md:block">
              Travel Boleto, TAMAYO!!
            </span>
            <span className="block whitespace-nowrap leading-[1] [text-shadow:0_0_1px_rgba(233,244,219,0.95),0_0_6px_rgba(201,242,100,0.45),0_0_14px_rgba(201,242,100,0.24)] md:hidden">
              <span className="text-[10px] tracking-[0.05em]">Travel Boleto, </span>
              <span className="text-[15px] tracking-[0.08em]">TAMAYO!!</span>
            </span>
          </h3>
          <p className="mt-2 hidden text-[12px] text-[#a8c7a1] md:block">{stopSummary}</p>
          {dateSummary ? (
            <p className="mt-1 hidden text-[11px] text-[#a8c7a1] md:block">{dateSummary}</p>
          ) : null}
        </header>

        <div className="relative mt-0.5 h-[102px] md:mt-2 md:h-[112px]">
          <svg
            ref={svgRef}
            viewBox="0 0 1000 280"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden
          >
            <path d={ROUTE_PATH_D} className="fill-none stroke-black/35 stroke-[4px]" />
            <path d={ROUTE_PATH_D} className="fill-none stroke-[#c9f264]/20 stroke-[7px] blur-[2px]" />
            <path ref={pathRef} d={ROUTE_PATH_D} className="fill-none stroke-[#d6f96f] stroke-[1.6px]" strokeDasharray="1.5 5.5" />
          </svg>

          {stopCards.map((marker, index) => {
            const isFirst = index === 0;
            const isLast = index === stopCards.length - 1;
            const mobileAnchorClass = isFirst
              ? "left-0 -translate-x-[10%] md:left-1/2 md:-translate-x-1/2"
              : isLast
                ? "left-full -translate-x-[90%] md:left-1/2 md:-translate-x-1/2"
                : "left-1/2 -translate-x-1/2";
            const desktopAnchorClass = isFirst
              ? "md:left-0 md:translate-x-0"
              : isLast
                ? "md:left-full md:-translate-x-full"
                : "md:left-1/2 md:-translate-x-1/2";
            const isMobileUpSlot = index % 2 === 1;
            const mobileVerticalClass =
              isMobileUpSlot
                ? isDenseRoute
                  ? "-translate-y-[26px]"
                  : "-translate-y-[48px]"
                : "translate-y-2";
            const desktopVerticalClass =
              marker.orientation === "up" ? "md:-translate-y-[84px]" : "md:translate-y-3";

            return (
              <div
                key={marker.id}
                className="pointer-events-none absolute z-20"
                style={{ left: `${(marker.x / 1000) * 100}%`, top: `${(marker.y / 280) * 100}%` }}
              >
              <span
                className={`absolute left-1/2 top-1/2 inline-flex h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-[0_0_0_3px_rgba(202,242,100,0.16),0_0_12px_rgba(202,242,100,0.46)] ${
                  marker.isTerminal ? "border-[#ecffb4] bg-[#d9f986]" : "border-[#d9f986] bg-[#c9f264]"
                }`}
              />
              <div
                className={`absolute w-max max-w-[44vw] rounded-lg border border-[#e5ffbf24] bg-[#0629204f] px-2 py-1.5 backdrop-blur-[7px] md:max-w-[220px] md:rounded-xl md:px-3 md:py-2 ${mobileAnchorClass} ${desktopAnchorClass} ${mobileVerticalClass} ${desktopVerticalClass}`}
              >
                <span className="hidden text-[9px] font-bold uppercase tracking-[0.13em] text-[#d9f986] md:block">
                  {marker.dayLabel}
                </span>
                <span className="mt-0.5 block text-[9px] font-bold leading-[1.05] text-[#f0f8e7] md:text-[22px] md:leading-[1.03] md:[font-size:clamp(14px,1.1vw,22px)]">
                  <span className="block max-w-full whitespace-normal break-words md:hidden">
                    {truncateStopName(marker.label, 15)}
                  </span>
                  <span className="hidden md:-mt-0.5 md:block md:max-w-full md:whitespace-normal md:break-words">
                    {truncateStopName(marker.label, 25)}
                  </span>
                </span>
                <span className="mt-1 hidden truncate text-[10px] text-[#a8c8a5] md:block">{marker.subtitle}</span>
              </div>
            </div>
            );
          })}

          <div ref={carRef} className="pointer-events-none absolute z-30 h-[17px] w-[39px] will-change-transform md:h-[24px] md:w-[62px]">
            <div className="relative flex h-[12px] items-end justify-center rounded-[8px_12px_5px_5px] border border-[#f4ffcb] bg-[#ddfa7e] px-1 pb-0 text-[6px] font-bold text-[#063126] shadow-[0_0_18px_rgba(220,250,126,0.42)] md:h-[18px] md:px-1.5 md:pb-0.5 md:text-[8px]">
              Tamayo
              <span className="absolute -top-[4px] left-[18%] h-[6px] w-[56%] skew-x-[-13deg] rounded-[10px_14px_0_0] border border-[#f4ffcb] border-b-0 bg-[#c9ed70] md:-top-[7px] md:h-[10px]">
                <span className="absolute inset-x-[2px] top-[1px] h-[3px] rounded-[8px_10px_0_0] bg-[#7ea96d]/85 md:inset-x-[3px] md:top-[2px] md:h-[5px]" />
              </span>
              <span className="absolute -bottom-[3px] left-[2px] h-[5px] w-[5px] rounded-full border border-[#133a30] bg-[#e9f7d9] md:-bottom-[5px] md:left-[6px] md:h-[9px] md:w-[9px] md:border-2" />
              <span className="absolute -bottom-[3px] right-[2px] h-[5px] w-[5px] rounded-full border border-[#133a30] bg-[#e9f7d9] md:-bottom-[5px] md:right-[6px] md:h-[9px] md:w-[9px] md:border-2" />
            </div>
          </div>
        </div>

        <p className="mt-0.5 text-[9px] text-[#a8c7a1] md:mt-1.5 md:text-[11px]">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#d9f986] shadow-[0_0_10px_#d9f986]" />
          Travelling with Tamayo
        </p>
      </div>
    </article>
  );
}
