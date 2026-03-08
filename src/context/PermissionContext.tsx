import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { rolePermissionService } from '../services/rolePermissionService';
import { tenantMenuService } from '../services/tenantMenuService';

interface PermissionContextType {
  allowedKeys: Set<string>;
  tenantHiddenKeys: Set<string>;
  isLoading: boolean;
  /** true if current user is Admin or has the specific menu key */
  hasAccess: (menuKey: string) => boolean;
  /** true if the current user can access the given path */
  canAccessPath: (path: string) => boolean;
  /** reload permissions from server */
  refresh: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

// Build path → menuKey map once
import { buildPathToKeyMap } from '../utils/menuKeys';
const pathToKeyMap = buildPathToKeyMap();

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [allowedKeys, setAllowedKeys] = useState<Set<string>>(new Set());
  const [tenantHiddenKeys, setTenantHiddenKeys] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const loadPermissions = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setAllowedKeys(new Set());
      setTenantHiddenKeys(new Set());
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // Load permissions and tenant hidden keys independently — 
      // if one fails, the other still works
      const [keys, hidden] = await Promise.all([
        rolePermissionService.getMyPermissions().catch((err) => {
          console.error('[Permissions] Failed to load role permissions:', err);
          return [] as string[];
        }),
        tenantMenuService.getHiddenKeys().catch((err) => {
          console.error('[Permissions] Failed to load tenant hidden keys:', err);
          return [] as string[];
        }),
      ]);
      console.log('[Permissions] Loaded for role:', user.role, '→', keys);
      console.log('[Permissions] Tenant hidden menus:', hidden);
      setAllowedKeys(new Set(keys));
      setTenantHiddenKeys(new Set(hidden));
    } catch (err) {
      console.error('[Permissions] Unexpected error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const hasAccess = useCallback(
    (menuKey: string): boolean => {
      if (tenantHiddenKeys.has(menuKey)) return false; // Hidden for tenant
      if (allowedKeys.has('*')) return true; // Admin
      return allowedKeys.has(menuKey);
    },
    [allowedKeys, tenantHiddenKeys]
  );

  const canAccessPath = useCallback(
    (path: string): boolean => {
      const menuKey = pathToKeyMap[path];
      if (!menuKey) return true; // Path not in menu → allow (e.g. profile, auth pages)
      if (tenantHiddenKeys.has(menuKey)) return false; // Hidden for tenant
      if (allowedKeys.has('*')) return true; // Admin
      return allowedKeys.has(menuKey);
    },
    [allowedKeys, tenantHiddenKeys]
  );

  return (
    <PermissionContext.Provider value={{ allowedKeys, tenantHiddenKeys, isLoading, hasAccess, canAccessPath, refresh: loadPermissions }}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = (): PermissionContextType => {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error('usePermissions must be used within a PermissionProvider');
  return ctx;
};
