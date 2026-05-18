import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

const SESSION_KEY = "adm_auth";
const CORRECT_PIN = import.meta.env.VITE_ADMIN_PIN as string | undefined;

type AdminAuthContextValue = {
  isAdmin: boolean;
  login: (pin: string) => boolean;
  logout: () => void;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState<boolean>(
    () => sessionStorage.getItem(SESSION_KEY) === "1"
  );

  const login = useCallback((pin: string): boolean => {
    if (!CORRECT_PIN || pin !== CORRECT_PIN) return false;
    sessionStorage.setItem(SESSION_KEY, "1");
    setIsAdmin(true);
    return true;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAdmin(false);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return ctx;
}
