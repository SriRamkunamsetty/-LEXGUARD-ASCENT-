import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, loginWithGoogle, logoutUser } from "../lib/firebase";
import { Button } from "@/components/ui/button";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    await loginWithGoogle();
  };

  const logout = async () => {
    await logoutUser();
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#09090b] text-zinc-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-t-2 border-emerald-500 animate-spin"></div>
          <p className="text-sm font-mono text-zinc-400">Verifying Identity...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#09090b] text-zinc-100">
        <div className="w-96 p-8 border border-zinc-800 bg-zinc-950/50 rounded-xl space-y-6 text-center">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded flex items-center justify-center font-bold text-2xl mb-2">L</div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">LEXGUARD</h1>
            <p className="text-sm text-zinc-400 mt-2">Enterprise AI Rights & Contract Intelligence System</p>
          </div>
          <div className="pt-4">
            <Button onClick={login} className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
              Sign In with Google Workspace
            </Button>
          </div>
          <p className="text-[10px] text-zinc-600 font-monouppercase tracking-wider">
            SECURE ZERO-TRUST AUTHENTICATION
          </p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
};
