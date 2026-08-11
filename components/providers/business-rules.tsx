"use client";

import * as React from "react";

import { fetchAllBusinessRules, type BusinessRule } from "@/lib/api/settings";

type BusinessRulesContextValue = {
  rules: Record<string, Record<string, unknown>>;
  loading: boolean;
  error: string | null;
  fetchRules: () => Promise<void>;
  getRule: (category: string, key: string, fallback: unknown) => unknown;
};

const BusinessRulesContext =
  React.createContext<BusinessRulesContextValue | null>(null);

export function useBusinessRules(): BusinessRulesContextValue {
  const ctx = React.useContext(BusinessRulesContext);
  if (!ctx) {
    // Return a safe fallback if used outside provider
    return {
      rules: {},
      loading: false,
      error: null,
      fetchRules: async () => {},
      getRule: (_category: string, _key: string, fallback: unknown) => fallback,
    };
  }
  return ctx;
}

type BusinessRulesProviderProps = {
  children: React.ReactNode;
};

export function BusinessRulesProvider({
  children,
}: BusinessRulesProviderProps) {
  const [rules, setRules] = React.useState<
    Record<string, Record<string, unknown>>
  >({});
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchRules = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: Record<
        string,
        Record<string, unknown>
      > = await fetchAllBusinessRules();
      setRules(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch business rules"
      );
      // Keep existing rules on error (don't clear)
    } finally {
      setLoading(false);
    }
  }, []);

  const getRule = React.useCallback(
    (category: string, key: string, fallback: unknown) => {
      const categoryRules = rules[category];
      if (categoryRules && key in categoryRules) {
        return categoryRules[key];
      }
      return fallback;
    },
    [rules]
  );

  const value = React.useMemo(
    () => ({
      rules,
      loading,
      error,
      fetchRules,
      getRule,
    }),
    [rules, loading, error, fetchRules, getRule]
  );

  return (
    <BusinessRulesContext.Provider value={value}>
      {children}
    </BusinessRulesContext.Provider>
  );
}

// ============================================================================
// Helper hooks for specific rule categories
// ============================================================================

export function usePrestasiPoints() {
  const { getRule } = useBusinessRules();

  return {
    ptsBase: (getRule("prestasi", "pts_base", 10) as number) ?? 10,
    ptsOntime: (getRule("prestasi", "pts_ontime", 2) as number) ?? 2,
    ptsSleep: (getRule("prestasi", "pts_sleep", 3) as number) ?? 3,
    ptsStreakStep: (getRule("prestasi", "pts_streak_step", 2) as number) ?? 2,
    ptsStreakCap: (getRule("prestasi", "pts_streak_cap", 10) as number) ?? 10,
    ptsCover: (getRule("prestasi", "pts_cover", 5) as number) ?? 5,
    sleepMinGreat:
      (getRule("prestasi", "sleep_min_great", 420) as number) ?? 420,
    periodDays: (getRule("prestasi", "period_days", {
      week: 7,
      month: 30,
      quarter: 90,
    }) as Record<string, number>) ?? { week: 7, month: 30, quarter: 90 },
  };
}

export function useFtwThresholds() {
  const { getRule } = useBusinessRules();

  return {
    sleepFitMin: (getRule("ftw", "sleep_fit_min", 330) as number) ?? 330,
    sleepSpare1hMin:
      (getRule("ftw", "sleep_spare_1h_min", 300) as number) ?? 300,
    sleepSpare2hMin:
      (getRule("ftw", "sleep_spare_2h_min", 240) as number) ?? 240,
  };
}

export function useFleetConfig() {
  const { getRule } = useBusinessRules();

  return {
    maxUnits: (getRule("fleet", "max_units", 13) as number) ?? 13,
  };
}

export function useAuthPolicy() {
  const { getRule } = useBusinessRules();

  return {
    passwordMinLength:
      (getRule("auth", "password_min_length", 8) as number) ?? 8,
  };
}

export function useWeatherConfig() {
  const { getRule } = useBusinessRules();

  return {
    refreshIntervalMs:
      (getRule("weather", "refresh_interval_ms", 900000) as number) ?? 900000,
  };
}
