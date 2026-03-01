import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { rolePermissionService } from '../services/rolePermissionService';

interface PermissionContextType {
  allowedKeys: Set<string>;
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
  const [isLoading, setIsLoading] = useState(true);

  const loadPermissions = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setAllowedKeys(new Set());
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const keys = await rolePermissionService.getMyPermissions();
      console.log('[Permissions] Loaded for role:', user.role, '→', keys);
      setAllowedKeys(new Set(keys));
    } catch (err) {
      console.error('[Permissions] Failed to load:', err);
      // If API fails, allow nothing (safe default — Admin is handled via "*")
      setAllowedKeys(new Set());
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const hasAccess = useCallback(
    (menuKey: string): boolean => {
      if (allowedKeys.has('*')) return true; // Admin
      return allowedKeys.has(menuKey);
    },
    [allowedKeys]
  );

  const canAccessPath = useCallback(
    (path: string): boolean => {
      if (allowedKeys.has('*')) return true; // Admin
      const menuKey = pathToKeyMap[path];
      if (!menuKey) return true; // Path not in menu → allow (e.g. profile, auth pages)
      return allowedKeys.has(menuKey);
    },
    [allowedKeys]
  );

  return (
    <PermissionContext.Provider value={{ allowedKeys, isLoading, hasAccess, canAccessPath, refresh: loadPermissions }}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = (): PermissionContextType => {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error('usePermissions must be used within a PermissionProvider');
  return ctx;
};
