"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { useTour, TOUR_STEPS } from "@/store/useTour";

const TIP_W   = 380;
const TIP_H   = 330; // conservative estimate for clamping
const GAP     = 16;  // gap between spotlight edge and tooltip
const SPOT_PAD = 8;  // padding around highlighted element

interface SpotRect { top: number; left: number; w: number; h: number }
interface TipPos   { top: number; left: number }

function computeLayout(
  step: (typeof TOUR_STEPS)[number],
  vw: number,
  vh: number,
): { spot: SpotRect | null; tip: TipPos } {
  const center: TipPos = {
    top:  Math.round(vh / 2 - TIP_H / 2),
    left: Math.round(vw / 2 - TIP_W / 2),
  };

  if (!step.tourId) return { spot: null, tip: center };

  const el = document.querySelector(`[data-tour-id="${step.tourId}"]`);
  if (!el) return { spot: null, tip: center };

  const r = el.getBoundingClientRect();
  const spot: SpotRect = {
    top:  r.top    - SPOT_PAD,
    left: r.left   - SPOT_PAD,
    w:    r.width  + SPOT_PAD * 2,
    h:    r.height + SPOT_PAD * 2,
  };

  let top = 0, left = 0;

  switch (step.pos) {
    case "right":
      left = r.right + SPOT_PAD + GAP;
      top  = r.top + r.height / 2 - TIP_H / 2;
      if (left + TIP_W > vw - 20) left = r.left - SPOT_PAD - GAP - TIP_W;
      break;
    case "left":
      left = r.left - SPOT_PAD - GAP - TIP_W;
      top  = r.top + r.height / 2 - TIP_H / 2;
      if (left < 20) left = r.right + SPOT_PAD + GAP;
      break;
    case "bottom":
      top  = r.bottom + SPOT_PAD + GAP;
      left = r.left + r.width / 2 - TIP_W / 2;
      break;
    case "top":
      top  = r.top - SPOT_PAD - GAP - TIP_H;
      left = r.left + r.width / 2 - TIP_W / 2;
      break;
    default:
      return { spot, tip: center };
  }

  // Clamp to viewport with margin
  top  = Math.max(20, Math.min(top,  vh - TIP_H - 20));
  left = Math.max(20, Math.min(left, vw - TIP_W - 20));

  return { spot, tip: { top: Math.round(top), left: Math.round(left) } };
}

export function TourGuide() {
  const { active, step, next, prev, stop } = useTour();
  const cur   = TOUR_STEPS[step];
  const total = TOUR_STEPS.length;

  const [spot, setSpot] = useState<SpotRect | null>(null);
  const [tip,  setTip]  = useState<TipPos>({ top: 0, left: 0 });
  const rafRef = useRef<number | null>(null);
  const isFirst = step === 0;
  const isLast  = step === total - 1;

  const measure = useCallback(() => {
    if (!cur) return;
    const layout = computeLayout(cur, window.innerWidth, window.innerHeight);
    setSpot(layout.spot);
    setTip(layout.tip);
  }, [cur]);

  // Re-measure when step changes or tour activates
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(measure, 80);
    return () => clearTimeout(t);
  }, [active, step, measure]);

  // Re-measure on resize
  useEffect(() => {
    if (!active) return;
    const handler = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    };
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("resize", handler);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, measure]);

  if (!active || !cur) return null;

  const accent = cur.badgeColor;
  const isAI   = cur.badge === "AI Feature" || cur.badge === "AI Copilot";

  return (
    <AnimatePresence>
      {active && (
        <>
          {/* Dark overlay */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={stop}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9998,
              background: "rgba(0,0,0,0.72)",
              backdropFilter: "blur(1px)",
            }}
          />

          {/* Spotlight — spring-animated hole through the overlay */}
          <AnimatePresence>
            {spot && (
              <motion.div
                key="spot"
                initial={false}
                animate={{
                  top:    spot.top,
                  left:   spot.left,
                  width:  spot.w,
                  height: spot.h,
                  opacity: 1,
                }}
                transition={{ type: "spring", stiffness: 260, damping: 28 }}
                style={{
                  position: "fixed",
                  zIndex: 9999,
                  borderRadius: 12,
                  pointerEvents: "none",
                  boxShadow: `0 0 0 9999px rgba(0,0,0,0.72), 0 0 0 2px ${accent}70, 0 0 24px ${accent}30`,
                }}
              />
            )}
          </AnimatePresence>

          {/* Tooltip card — pure top/left positioning, zero transform */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "fixed",
                top:    tip.top,
                left:   tip.left,
                width:  TIP_W,
                zIndex: 10000,
                borderRadius: 20,
                overflow: "hidden",
                background: "#0F1022",
                border: `1px solid ${accent}28`,
                boxShadow: `0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04), 0 0 48px ${accent}12`,
              }}
            >
              {/* Gradient top accent bar */}
              <div style={{
                height: 4,
                background: `linear-gradient(90deg, ${accent}, ${accent}60)`,
              }} />

              {/* Card body */}
              <div style={{ padding: "20px 22px 22px" }}>

                {/* Row 1: icon + badge + step counter + close */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    {/* Icon */}
                    <div style={{
                      width: 46, height: 46,
                      borderRadius: 13,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 22,
                      background: `${accent}18`,
                      border: `1px solid ${accent}28`,
                      flexShrink: 0,
                    }}>
                      {cur.icon}
                    </div>

                    <div>
                      {/* Badge chip */}
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "3px 9px",
                        borderRadius: 100,
                        fontSize: 10, fontWeight: 700,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        background: `${accent}22`,
                        color: accent,
                        border: `1px solid ${accent}30`,
                        marginBottom: 3,
                      }}>
                        {isAI && <Sparkles style={{ width: 9, height: 9 }} />}
                        {cur.badge}
                      </div>
                      {/* Step counter */}
                      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.28)" }}>
                        Step {step + 1} of {total}
                      </div>
                    </div>
                  </div>

                  {/* Close button */}
                  <button
                    onClick={stop}
                    title="Skip tour"
                    style={{
                      width: 28, height: 28,
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.06)",
                      cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "rgba(255,255,255,0.38)",
                      flexShrink: 0,
                    }}
                  >
                    <X style={{ width: 13, height: 13 }} />
                  </button>
                </div>

                {/* Title */}
                <h3 style={{
                  margin: "0 0 4px",
                  fontSize: 16, fontWeight: 800,
                  lineHeight: 1.25,
                  color: "#fff",
                  letterSpacing: "-0.015em",
                }}>
                  {cur.title}
                </h3>

                {/* Subtitle */}
                <p style={{
                  margin: "0 0 10px",
                  fontSize: 11, fontWeight: 500,
                  color: accent,
                  opacity: 0.85,
                }}>
                  {cur.subtitle}
                </p>

                {/* Description */}
                <p style={{
                  margin: "0 0 14px",
                  fontSize: 12.5,
                  lineHeight: 1.65,
                  color: "rgba(255,255,255,0.55)",
                }}>
                  {cur.desc}
                </p>

                {/* Highlights */}
                <div style={{
                  display: "flex", flexDirection: "column", gap: 5,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: `${accent}09`,
                  border: `1px solid ${accent}18`,
                  marginBottom: 20,
                }}>
                  {cur.highlights.map((h, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <div style={{
                        width: 15, height: 15,
                        borderRadius: 4,
                        background: `${accent}28`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, marginTop: 1,
                      }}>
                        <span style={{ fontSize: 8, color: accent, fontWeight: 800 }}>✓</span>
                      </div>
                      <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.78)", lineHeight: 1.5 }}>
                        {h}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Progress pills + navigation */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  {/* Pill dots */}
                  <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "nowrap", maxWidth: 160, overflow: "hidden" }}>
                    {TOUR_STEPS.map((_, i) => (
                      <div key={i} style={{
                        height: 5,
                        width:  i === step ? 18 : 5,
                        borderRadius: 3,
                        background: i === step ? accent : `${accent}28`,
                        transition: "width 0.3s cubic-bezier(0.4,0,0.2,1), background 0.3s",
                        flexShrink: 0,
                      }} />
                    ))}
                  </div>

                  {/* Buttons */}
                  <div style={{ display: "flex", gap: 6 }}>
                    {!isFirst && (
                      <button
                        onClick={prev}
                        style={{
                          height: 33,
                          padding: "0 13px",
                          borderRadius: 9,
                          border: "1px solid rgba(255,255,255,0.12)",
                          background: "rgba(255,255,255,0.06)",
                          cursor: "pointer",
                          fontSize: 12, fontWeight: 600,
                          color: "rgba(255,255,255,0.6)",
                          display: "flex", alignItems: "center", gap: 4,
                        }}
                      >
                        <ChevronLeft style={{ width: 13, height: 13 }} />
                        Back
                      </button>
                    )}
                    <button
                      onClick={next}
                      style={{
                        height: 33,
                        padding: "0 18px",
                        borderRadius: 9,
                        border: "none",
                        background: `linear-gradient(135deg, ${accent}, ${accent}bb)`,
                        cursor: "pointer",
                        fontSize: 12, fontWeight: 700,
                        color: "#fff",
                        display: "flex", alignItems: "center", gap: 4,
                        boxShadow: `0 4px 16px ${accent}44`,
                      }}
                    >
                      {isLast ? "Let's Go! 🎉" : "Next"}
                      {!isLast && <ChevronRight style={{ width: 13, height: 13 }} />}
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
