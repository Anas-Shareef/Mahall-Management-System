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

interface SignUpData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'admin' | 'member';
}

interface AuthContextProps {
  user: UserSession | null;
  loading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<UserSession>;
  signUpWithEmail: (data: SignUpData) => Promise<UserSession>;
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
            let profile = await db.profiles.getById(session.user.id);
            if (!profile) {
              // Auto-create profile if missing
              const fallbackProfile = {
                id: session.user.id,
                name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
                email: session.user.email || null,
                phone: session.user.phone || null,
                role: (session.user.user_metadata?.role || 'member') as 'admin' | 'member',
                language: 'en' as const,
                status: 'active' as const,
              };
              try {
                profile = await db.profiles.create(fallbackProfile);
              } catch (e) {
                profile = fallbackProfile as Profile;
              }
            }
            setUser({
              id: profile.id,
              email: profile.email,
              phone: profile.phone,
              name: profile.name,
              role: profile.role,
              language: profile.language,
            });
          }
          
          // Listen to auth changes
          supabase.auth.onAuthStateChange(async (_event, currentSession) => {
            if (currentSession?.user) {
              let profile = await db.profiles.getById(currentSession.user.id);
              if (!profile) {
                const fallbackProfile = {
                  id: currentSession.user.id,
                  name: currentSession.user.user_metadata?.name || currentSession.user.email?.split('@')[0] || 'User',
                  email: currentSession.user.email || null,
                  phone: currentSession.user.phone || null,
                  role: (currentSession.user.user_metadata?.role || 'member') as 'admin' | 'member',
                  language: 'en' as const,
                  status: 'active' as const,
                };
                try {
                  profile = await db.profiles.create(fallbackProfile);
                } catch (e) {
                  profile = fallbackProfile as Profile;
                }
              }
              setUser({
                id: profile.id,
                email: profile.email,
                phone: profile.phone,
                name: profile.name,
                role: profile.role,
                language: profile.language,
              });
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

  const signUpWithEmail = async (data: SignUpData): Promise<UserSession> => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              name: data.name,
              role: data.role,
              phone: data.phone || null,
            }
          }
        });
        
        if (error) throw error;
        if (!authData.user) throw new Error('Registration failed');

        // Create profile record in database table
        const newProfile: Profile = {
          id: authData.user.id,
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          role: data.role,
          language: 'en',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        try {
          await db.profiles.create(newProfile);
        } catch (e) {
          console.warn('Profile sync notice:', e);
        }

        const session: UserSession = {
          id: newProfile.id,
          email: newProfile.email,
          phone: newProfile.phone,
          name: newProfile.name,
          role: newProfile.role,
          language: newProfile.language,
        };
        setUser(session);
        return session;
      } else {
        // Mock signup
        const profiles = JSON.parse(localStorage.getItem('mahal_profiles') || '[]');
        const newProfile = {
          id: 'user-' + Date.now(),
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          role: data.role,
          language: 'en',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        profiles.push(newProfile);
        localStorage.setItem('mahal_profiles', JSON.stringify(profiles));

        const session: UserSession = {
          id: newProfile.id,
          email: newProfile.email,
          phone: newProfile.phone,
          name: newProfile.name,
          role: newProfile.role,
          language: 'en',
        };
        localStorage.setItem('mahal_session', JSON.stringify(session));
        setUser(session);
        return session;
      }
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, password: string): Promise<UserSession> => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        // Attempt sign in with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        
        if (error) {
          // If demo admin login is attempted and fails, auto-register demo admin on Supabase!
          if (email.trim() === 'admin@mahal.com' && password === 'admin') {
            return await signUpWithEmail({
              name: 'Mahallu Admin',
              email: 'admin@mahal.com',
              password: 'admin',
              role: 'admin',
            });
          }
          throw error;
        }

        if (!data.user) throw new Error('Authentication failed');
        
        let profile = await db.profiles.getById(data.user.id);
        if (!profile) {
          // Auto-create missing profile
          const fallbackProfile: Profile = {
            id: data.user.id,
            name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Admin User',
            email: data.user.email || email,
            phone: data.user.phone || null,
            role: (data.user.user_metadata?.role || 'admin') as 'admin' | 'member',
            language: 'en',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          try {
            profile = await db.profiles.create(fallbackProfile);
          } catch (e) {
            profile = fallbackProfile;
          }
        }

        const validProfile = profile as Profile;
        const session: UserSession = {
          id: validProfile.id,
          email: validProfile.email,
          phone: validProfile.phone,
          name: validProfile.name,
          role: validProfile.role,
          language: validProfile.language,
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
          // Try custom mock user
          const profiles = JSON.parse(localStorage.getItem('mahal_profiles') || '[]');
          const userProf = profiles.find((p: any) => p.email === email);
          if (userProf) {
            const session: UserSession = {
              id: userProf.id,
              email: userProf.email,
              phone: userProf.phone,
              name: userProf.name,
              role: userProf.role,
              language: userProf.language || 'en',
            };
            localStorage.setItem('mahal_session', JSON.stringify(session));
            setUser(session);
            return session;
          }
          throw new Error('Invalid email or password. You can Sign Up to create an account.');
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
      // For demo convenience: auto-allow demo numbers 9876543210 & 9876543211
      if (cleanPhone === '9876543210' || cleanPhone === '9876543211') return true;
      throw new Error('This phone number is not registered. Please Sign Up or contact Admin.');
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
        
        let profile = await db.profiles.getById(data.user.id);
        if (!profile) {
          const fallbackProfile: Profile = {
            id: data.user.id,
            name: data.user.user_metadata?.name || 'Member',
            email: data.user.email || null,
            phone: phone,
            role: 'member',
            language: 'en',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          try {
            profile = await db.profiles.create(fallbackProfile);
          } catch (e) {
            profile = fallbackProfile;
          }
        }

        const validProfile = profile as Profile;
        const session: UserSession = {
          id: validProfile.id,
          email: validProfile.email,
          phone: validProfile.phone,
          name: validProfile.name,
          role: validProfile.role,
          language: validProfile.language,
        };
        setUser(session);
        return session;
      } else {
        // Mock verification
        if (code === '123456' || code === '654321') {
          const profiles: Profile[] = JSON.parse(localStorage.getItem('mahal_profiles') || '[]');
          const cleanPhone = phone.replace(/[^0-9]/g, '');
          let profile = profiles.find((p) => p.phone && p.phone.replace(/[^0-9]/g, '') === cleanPhone);
          
          if (!profile) {
            profile = {
              id: 'member-' + Date.now(),
              name: 'Member (' + phone + ')',
              phone: phone,
              email: null,
              role: 'member',
              language: 'en',
              status: 'active',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          }
          
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
        signUpWithEmail,
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
export type { UserSession, SignUpData };
