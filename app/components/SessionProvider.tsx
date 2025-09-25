'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface SessionContextType {
  user: User | null;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
}

export const SessionContext = createContext<SessionContextType | undefined>(undefined);

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include', // Include cookies
      });

      if (response.ok) {
        const data = await response.json();
        // Handle both response formats for compatibility
        if (data.success) {
          // Check for direct user property first (current format)
          if (data.user) {
            setUser(data.user);
          }
          // Fallback to nested data.user format (legacy format)
          else if (data.data && data.data.user) {
            setUser(data.data.user);
          }
          else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch session:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSession = async () => {
    setIsLoading(true);
    await fetchSession();
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const value: SessionContextType = {
    user,
    isLoading,
    refreshSession,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
