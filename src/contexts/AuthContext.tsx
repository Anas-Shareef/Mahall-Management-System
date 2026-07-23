import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { db } from '../services/db';
import type { Profile } from '../services/db';

interface UserSession {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  role: 'admin' | 'member';
  language: 'en' | 'ml';
}

interface AuthContextProps {
  user: UserSession | null;
  loading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<UserSession>;
  sendOTP: (phone: string) => Promise<boolean>;
  verifyOTP: (phone: string, code: string) => Promise<UserSession>;
  logout: () => Promise<void>;
  updateUserLanguage: (lang: 'en' | 'ml') => Promise<void>;
  updateUserProfile: (data: { name?: string; email?: string | null; phone?: string | null }) => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Load session on startup
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (isSupabaseConfigured && supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const profile = await db.profiles.getById(session.user.id);
            if (profile) {
              setUser({
                id: profile.id,
                email: profile.email,
                phone: profile.phone,
                name: profile.name,
                role: profile.role,
                language: profile.language,
              });
            }
          }
          
          // Listen to changes
          supabase.auth.onAuthStateChange(async (_event, currentSession) => {
            if (currentSession?.user) {
              const profile = await db.profiles.getById(currentSession.user.id);
              if (profile) {
                setUser({
                  id: profile.id,
                  email: profile.email,
                  phone: profile.phone,
                  name: profile.name,
                  role: profile.role,
                  language: profile.language,
                });
              }
            } else {
              setUser(null);
            }
          });
        } else {
          // Local storage session fallback
          const savedSession = localStorage.getItem('mahal_session');
          if (savedSession) {
            setUser(JSON.parse(savedSession));
          }
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const loginWithEmail = async (email: string, password: string): Promise<UserSession> => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data.user) throw new Error('Authentication failed');
        
        const profile = await db.profiles.getById(data.user.id);
        if (!profile) throw new Error('User profile not found');
        
        const session: UserSession = {
          id: profile.id,
          email: profile.email,
          phone: profile.phone,
          name: profile.name,
          role: profile.role,
          language: profile.language,
        };
        setUser(session);
        return session;
      } else {
        // Mock Admin credentials
        if (email.trim() === 'admin@mahal.com' && password === 'admin') {
          const profiles = JSON.parse(localStorage.getItem('mahal_profiles') || '[]');
          const adminProf = profiles.find((p: any) => p.role === 'admin') || {
            id: 'admin-uuid',
            name: 'Mahallu Admin',
            email: 'admin@mahal.com',
            phone: '9999999999',
            role: 'admin',
            language: 'en',
          };
          const session: UserSession = {
            id: adminProf.id,
            email: adminProf.email,
            phone: adminProf.phone,
            name: adminProf.name,
            role: adminProf.role,
            language: adminProf.language,
          };
          localStorage.setItem('mahal_session', JSON.stringify(session));
          setUser(session);
          return session;
        } else {
          throw new Error('Invalid email or password');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const sendOTP = async (phone: string): Promise<boolean> => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      return true;
    }
    
    // Mock check if member phone is registered in active profiles
    const profiles: Profile[] = JSON.parse(localStorage.getItem('mahal_profiles') || '[]');
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const userProfile = profiles.find((p) => p.phone && p.phone.replace(/[^0-9]/g, '') === cleanPhone);
    
    if (!userProfile) {
      throw new Error('This phone number is not registered. Please contact the Admin.');
    }
    return true;
  };

  const verifyOTP = async (phone: string, code: string): Promise<UserSession> => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.verifyOtp({
          phone,
          token: code,
          type: 'sms',
        });
        if (error) throw error;
        if (!data.user) throw new Error('Verification failed');
        
        const profile = await db.profiles.getById(data.user.id);
        if (!profile) throw new Error('User profile not found');
        
        const session: UserSession = {
          id: profile.id,
          email: profile.email,
          phone: profile.phone,
          name: profile.name,
          role: profile.role,
          language: profile.language,
        };
        setUser(session);
        return session;
      } else {
        // Mock verification
        if (code === '123456' || code === '654321') {
          const profiles: Profile[] = JSON.parse(localStorage.getItem('mahal_profiles') || '[]');
          const cleanPhone = phone.replace(/[^0-9]/g, '');
          const profile = profiles.find((p) => p.phone && p.phone.replace(/[^0-9]/g, '') === cleanPhone);
          
          if (!profile) throw new Error('User profile not found');
          
          const session: UserSession = {
            id: profile.id,
            email: profile.email,
            phone: profile.phone,
            name: profile.name,
            role: profile.role,
            language: profile.language,
          };
          localStorage.setItem('mahal_session', JSON.stringify(session));
          setUser(session);
          return session;
        } else {
          throw new Error('Incorrect OTP. Try 123456');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
      localStorage.removeItem('mahal_session');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async (data: { name?: string; email?: string | null; phone?: string | null }) => {
    if (!user) return;
    try {
      const updatedUser: UserSession = {
        ...user,
        name: data.name !== undefined ? data.name : user.name,
        email: data.email !== undefined ? data.email : user.email,
        phone: data.phone !== undefined ? data.phone : user.phone,
      };
      setUser(updatedUser);
      localStorage.setItem('mahal_session', JSON.stringify(updatedUser));
    } catch (err) {
      console.error('Failed to update user profile in context:', err);
    }
  };

  const updateUserLanguage = async (lang: 'en' | 'ml') => {
    if (!user) return;
    try {
      await db.profiles.update(user.id, { language: lang });
      const updatedUser = { ...user, language: lang };
      setUser(updatedUser);
      if (!isSupabaseConfigured) {
        localStorage.setItem('mahal_session', JSON.stringify(updatedUser));
      }
    } catch (err) {
      console.error('Failed to update language in backend:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithEmail,
        sendOTP,
        verifyOTP,
        logout,
        updateUserLanguage,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
export type { UserSession };
