import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export type ActiveSheet = 'none' | 'preset' | 'breakdown' | 'log';
export type ActiveTab = 'dashboard' | 'analytics' | 'presets' | 'settings';

export interface ToastConfig {
  id: string;
  message: string;
  durationMs?: number;
}

export interface UIState {
  activeTab: ActiveTab;
  activeSheet: ActiveSheet;
  isDockExpanded: boolean;
  isSearchOpen: boolean;
  searchQuery: string;
  toast: ToastConfig | null;
}

export interface UIActions {
  setActiveTab: (tab: ActiveTab) => void;
  openSheet: (sheet: ActiveSheet) => void;
  closeSheet: () => void;
  setDockExpanded: (expanded: boolean) => void;
  toggleDock: () => void;
  toggleSearch: () => void;
  setSearchQuery: (query: string) => void;
  showToast: (message: string, durationMs?: number) => void;
  hideToast: () => void;
}

const UIContext = createContext<(UIState & UIActions) | null>(null);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sheet = params.get('sheet');
      if (sheet === 'preset' || sheet === 'breakdown' || sheet === 'log') {
        return sheet;
      }
    }
    return 'none';
  });
  const [isDockExpanded, setIsDockExpanded] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('sheet') === 'log';
    }
    return false;
  });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<ToastConfig | null>(null);

  const openSheet = useCallback((sheet: ActiveSheet) => {
    setActiveSheet(sheet);
  }, []);

  const closeSheet = useCallback(() => {
    setActiveSheet('none');
  }, []);

  const setDockExpanded = useCallback((expanded: boolean) => {
    setIsDockExpanded(expanded);
  }, []);

  const toggleDock = useCallback(() => {
    setIsDockExpanded((prev) => !prev);
  }, []);

  const toggleSearch = useCallback(() => {
    setIsSearchOpen((prev) => !prev);
  }, []);

  const showToast = useCallback((message: string, durationMs: number = 2000) => {
    const id = String(Date.now());
    setToast({ id, message, durationMs });
    window.setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, durationMs);
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  const value: UIState & UIActions = {
    activeTab,
    activeSheet,
    isDockExpanded,
    isSearchOpen,
    searchQuery,
    toast,
    setActiveTab,
    openSheet,
    closeSheet,
    setDockExpanded,
    toggleDock,
    toggleSearch,
    setSearchQuery,
    showToast,
    hideToast,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = () => {
  const ctx = useContext(UIContext);
  if (!ctx) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return ctx;
};

