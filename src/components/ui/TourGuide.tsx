"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useTour, TOUR_STEPS } from "@/store/useTour";

const PAD = 10;

export function TourGuide() {
  const { active, step, next, prev, stop } = useTour();
  const [rect, setRect] = useState<DOMRect | null>(null);

  const cur = TOUR_STEPS[step];

  const measure = useCallback(() => {
    if (!active || !cur?.tourId) { setRect(null); return; }
    const el = document.querySelector(`[data-tour-id="${cur.tourId}"]`);
    if (el) setRect(el.getBoundingClientRect());
    else setRect(null);
  }, [active, cur?.tourId]);

  useEffect(() => {
    if (!active) return;
    measure();
    const id = setInterval(measure, 300);
    window.addEventListener("resize", measure);
    return () => { clearInterval(id); window.removeEventListener("resize", measure); };
  }, [active, measure]);

  if (!active || !cur) return null;

  const hasSpot = !!rect;

  // ── tooltip position ──────────────────────────────────────────────────
  const tooltipW = 300;
  let style: React.CSSProperties = {};

  if (!hasSpot || cur.pos === "center") {
    style = { top: "50%", left: "50%", transform: "translate(-50%,-50%)" };
  } else if (rect) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (cur.pos === "right") {
      const left = Math.min(rect.right + PAD + 16, vw - tooltipW - 16);
      style = { top: rect.top + rect.height / 2, left, transform: "translateY(-50%)" };
    } else if (cur.pos === "bottom") {
      style = { top: rect.bottom + PAD + 12, left: Math.min(rect.left + rect.width / 2, vw - tooltipW / 2 - 16), transform: "translateX(-50%)" };
    } else if (cur.pos === "top") {
      style = { bottom: vh - rect.top + PAD + 12, left: Math.min(rect.left + rect.width / 2, vw - tooltipW / 2 - 16), transform: "translateX(-50%)" };
    } else if (cur.pos === "left") {
      style = { top: rect.top + rect.height / 2, right: vw - rect.left + PAD + 16, transform: "translateY(-50%)" };
    }
  }

  return (
    <>
      {/* ── Click catcher (backdrop) ─────────────────────────── */}
      <div
        onClick={next}
        style={{
          position: "fixed", inset: 0, zIndex: 9997,
          background: hasSpot ? "transparent" : "rgba(5,5,20,0.72)",
          cursor: "pointer",
        }}
      />

      {/* ── Spotlight ring ───────────────────────────────────── */}
      {hasSpot && rect && (
        <div
          style={{
            position: "fixed",
            top:    rect.top    - PAD,
            left:   rect.left   - PAD,
            width:  rect.width  + PAD * 2,
            height: rect.height + PAD * 2,
            borderRadius: 16,
            boxShadow: "0 0 0 9999px rgba(5,5,20,0.72)",
            border: "2px solid rgba(157,107,255,0.55)",
            zIndex: 9998,
            pointerEvents: "none",
            transition: "top .3s, left .3s, width .3s, height .3s",
          }}
        />
      )}

      {/* ── Tooltip card ─────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.94, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: -6 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            ...style,
            zIndex: 10000,
            width: tooltipW,
            background: "linear-gradient(145deg, #1C1D40 0%, #0F1022 100%)",
            border: "1px solid rgba(157,107,255,0.28)",
            borderRadius: 20,
            padding: "20px 20px 16px",
            boxShadow: "0 24px 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.04), 0 0 60px rgba(157,107,255,0.1)",
            pointerEvents: "all",
          }}
        >
          {/* Progress bar row */}
          <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
            {TOUR_STEPS.map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 99,
                background: i <= step ? "#9D6BFF" : "rgba(255,255,255,0.1)",
                transition: "background .3s",
              }} />
            ))}
          </div>

          {/* Close */}
          <button
            onClick={stop}
            title="Skip tour"
            style={{
              position: "absolute", top: 14, right: 14,
              background: "rgba(255,255,255,0.07)", border: "none",
              borderRadius: 8, cursor: "pointer",
              color: "rgba(255,255,255,0.4)", padding: 4, lineHeight: 1,
              display: "flex", alignItems: "center",
            }}
          >
            <X size={12} />
          </button>

          {/* Content */}
          <p style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 7, lineHeight: 1.35 }}>
            {cur.title}
          </p>
          <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.58)", lineHeight: 1.65, marginBottom: 18 }}>
            {cur.desc}
          </p>

          {/* Nav row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {step > 0 && (
              <button onClick={prev}
                style={{
                  padding: "7px 14px", borderRadius: 10,
                  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                <ChevronLeft size={13} /> Back
              </button>
            )}

            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.25)" }}>
                {step + 1} / {TOUR_STEPS.length}
              </span>
              <button onClick={next}
                style={{
                  padding: "7px 18px", borderRadius: 10,
                  background: "linear-gradient(135deg,#9D6BFF,#7C3AED)",
                  border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 5,
                  boxShadow: "0 4px 16px rgba(124,58,237,0.45)",
                }}>
                {step === TOUR_STEPS.length - 1
                  ? "Finish 🎉"
                  : (<>Next <ChevronRight size={13} /></>)
                }
              </button>
            </div>
          </div>

          {/* Hint */}
          <p style={{ textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.18)", marginTop: 12 }}>
            Click anywhere outside to advance
          </p>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
