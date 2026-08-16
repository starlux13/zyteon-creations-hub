import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type PanelContextValue = {
  dirty: boolean;
  setDirty: (value: boolean) => void;
  /** Contador del IDS: navegaciones "atrás" interceptadas de forma consecutiva. */
  backAttempts: number;
  registerBackAttempt: () => number;
  resetBackAttempts: () => void;
};

const PanelContext = createContext<PanelContextValue | null>(null);

export function PanelProvider({ children }: { children: React.ReactNode }) {
  const [dirty, setDirty] = useState(false);
  const [backAttempts, setBackAttempts] = useState(0);
  const counter = useRef(0);

  const registerBackAttempt = useCallback(() => {
    counter.current += 1;
    setBackAttempts(counter.current);
    return counter.current;
  }, []);

  const resetBackAttempts = useCallback(() => {
    counter.current = 0;
    setBackAttempts(0);
  }, []);

  const value = useMemo(
    () => ({ dirty, setDirty, backAttempts, registerBackAttempt, resetBackAttempts }),
    [dirty, backAttempts, registerBackAttempt, resetBackAttempts],
  );

  return <PanelContext.Provider value={value}>{children}</PanelContext.Provider>;
}

export function usePanel() {
  const ctx = useContext(PanelContext);
  if (!ctx) throw new Error("usePanel debe usarse dentro de PanelProvider");
  return ctx;
}
