import { useState, useEffect, useCallback, useMemo } from 'react';
import { getFormFieldConfigs, FormFieldConfig } from '../services/formFieldConfigService';

/**
 * Hook to check field visibility for a given form.
 * Usage:
 *   const { isVisible, loading } = useFieldVisibility('Customer');
 *   ...
 *   {isVisible('email') && <div>...</div>}
 */
export function useFieldVisibility(formName: string) {
  const [configs, setConfigs] = useState<FormFieldConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getFormFieldConfigs(formName);
        if (!cancelled) setConfigs(data);
      } catch {
        // If API fails, show all fields by default
        if (!cancelled) setConfigs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [formName]);

  /**
   * Map of fieldName -> isVisible for quick lookups.
   * If a field is not configured, it defaults to visible.
   */
  const visibilityMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    configs.forEach((c) => {
      map[c.fieldName] = c.isVisible;
    });
    return map;
  }, [configs]);

  /**
   * Check if a specific field should be visible.
   * Returns true if the field has no configuration entry (default = show).
   */
  const isVisible = useCallback(
    (fieldName: string): boolean => {
      if (fieldName in visibilityMap) {
        return visibilityMap[fieldName];
      }
      return true; // not configured = visible
    },
    [visibilityMap]
  );

  return { isVisible, loading, configs };
}
