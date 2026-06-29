'use client';

import { useEffect, useState } from 'react';

interface FeatureFlagState {
  enabled: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Client-side hook to check a feature flag.
 * Fetches from /api/v1/features/check?key=... on mount.
 */
export function useFeatureFlag(key: string): FeatureFlagState {
  const [state, setState] = useState<FeatureFlagState>({
    enabled: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch(`/api/v1/features/check?key=${encodeURIComponent(key)}`);
        const data = await res.json();
        if (!cancelled) {
          setState({
            enabled: data.success ? Boolean(data.data?.enabled) : false,
            loading: false,
            error: data.success ? null : data.error || 'Failed to check feature',
          });
        }
      } catch {
        if (!cancelled) {
          setState({ enabled: false, loading: false, error: 'Network error' });
        }
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return state;
}

/**
 * Hook to fetch all feature flags at once.
 */
export function useFeatureFlags(): { flags: Record<string, boolean>; loading: boolean; error: string | null } {
  const [state, setState] = useState<{
    flags: Record<string, boolean>;
    loading: boolean;
    error: string | null;
  }>({ flags: {}, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/v1/features');
        const data = await res.json();
        if (!cancelled) {
          const flags: Record<string, boolean> = {};
          if (data.success && Array.isArray(data.data)) {
            for (const flag of data.data) {
              flags[flag.key] = Boolean(flag.enabled);
            }
          }
          setState({ flags, loading: false, error: data.success ? null : data.error || 'Failed to load flags' });
        }
      } catch {
        if (!cancelled) {
          setState({ flags: {}, loading: false, error: 'Network error' });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
