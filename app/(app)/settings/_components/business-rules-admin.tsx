"use client";

import { useEffect, useState } from "react";

import {
  getAllBusinessRules,
  upsertBusinessRule,
  type BusinessRule,
} from "@/lib/api/settings";
import { useI18n } from "@/lib/i18n";

export function BusinessRulesAdmin() {
  const { t } = useI18n();
  const [rules, setRules] = useState<BusinessRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadRules();
  }, []);

  async function loadRules() {
    try {
      setLoading(true);
      const data = await getAllBusinessRules();
      setRules(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load business rules"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(
    category: string,
    currentRules: Record<string, unknown>
  ) {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await upsertBusinessRule(category, currentRules);

      setSuccess(`Business rule "${category}" updated successfully`);
      await loadRules();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to update ${category}`
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">Loading...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Business Rules Configuration</h2>
        <button
          onClick={loadRules}
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded border border-green-200 bg-green-50 p-4 text-green-700">
          {success}
        </div>
      )}

      <div className="grid gap-6">
        {rules.map((rule) => (
          <div key={rule.category} className="rounded-lg border p-6">
            <h3 className="mb-4 text-lg font-semibold capitalize">
              {rule.category} Rules
            </h3>

            <div className="space-y-4">
              {Object.entries(rule.rules).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    {key}
                  </label>
                  <div className="flex items-center gap-2">
                    {typeof value === "number" ? (
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => {
                          const newRules = { ...rule.rules };
                          newRules[key] = parseFloat(e.target.value);
                          handleSave(rule.category, newRules);
                        }}
                        className="w-32 rounded border px-3 py-1"
                        disabled={saving}
                      />
                    ) : typeof value === "object" ? (
                      <pre className="max-w-md overflow-auto rounded bg-gray-50 p-2 text-xs">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    ) : (
                      <span className="text-sm text-gray-600">
                        {String(value)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {saving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-white p-6 shadow-lg">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500"></div>
            <p className="mt-4 text-center">Saving...</p>
          </div>
        </div>
      )}
    </div>
  );
}
