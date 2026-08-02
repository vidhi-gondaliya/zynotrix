"use client";

import { useState, useEffect } from "react";
import { isFeatureInPlan, type PlanFeature } from "@/lib/plan-gate";

interface PlanState {
  planId: string;
  planName: string;
  seats: number;
  loading: boolean;
}

// Module-level cache so every component that calls usePlan() shares one fetch
let _cache: { planId: string; planName: string; seats: number; ts: number } | null = null;
const TTL = 60_000; // 1 minute

let _inflight: Promise<void> | null = null;

export function usePlan(): PlanState & { can: (feature: PlanFeature) => boolean } {
  const [state, setState] = useState<PlanState>(() =>
    _cache
      ? { planId: _cache.planId, planName: _cache.planName, seats: _cache.seats, loading: false }
      : { planId: "FREE", planName: "Free", seats: 1, loading: true }
  );

  useEffect(() => {
    if (_cache && Date.now() - _cache.ts < TTL) {
      setState({ planId: _cache.planId, planName: _cache.planName, seats: _cache.seats, loading: false });
      return;
    }

    if (!_inflight) {
      _inflight = fetch("/api/billing/subscription")
        .then((r) => r.json())
        .then((data) => {
          const planId   = data.subscription?.plan ?? data.plan?.id ?? "FREE";
          const planName = data.plan?.name ?? planId;
          const seats    = data.subscription?.seats ?? 1;
          _cache = { planId, planName, seats, ts: Date.now() };
        })
        .catch(() => {
          _cache = { planId: "FREE", planName: "Free", seats: 1, ts: Date.now() };
        })
        .finally(() => { _inflight = null; });
    }

    _inflight.then(() => {
      if (_cache) {
        setState({ planId: _cache.planId, planName: _cache.planName, seats: _cache.seats, loading: false });
      }
    });
  }, []);

  return {
    ...state,
    can: (feature: PlanFeature) => isFeatureInPlan(state.planId, feature),
  };
}

/** Invalidate the plan cache (call after a successful plan change). */
export function invalidatePlanCache() {
  _cache = null;
}
