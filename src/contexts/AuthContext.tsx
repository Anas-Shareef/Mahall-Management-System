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
  member_id?: string | null;
  household_id?: string | null;
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

const generateValidUuid = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  const timestamp = Date.now().toString(16).padStart(12, '0');
  return `f${timestamp.slice(0, 7)}-0000-4000-8000-${timestamp.slice(0, 12)}`;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Load session on startup
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check saved session in local storage first
        const savedSession = localStorage.getItem('mahal_session');
        if (savedSession) {
          try {
            const parsed = JSON.parse(savedSession);
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (parsed && parsed.id && !uuidRegex.test(parsed.id)) {
              // Stale non-UUID session — clear it when Supabase is configured
              // so Supabase's own getSession() below takes precedence
              if (isSupabaseConfigured) {
                localStorage.removeItem('mahal_session');
              } else {
                // Offline mode — keep the session as-is
                setUser(parsed);
              }
            } else {
              setUser(parsed);
            }
          } catch (e) {
            localStorage.removeItem('mahal_session');
          }
        }

        if (isSupabaseConfigured && supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            let profile = await db.profiles.getById(session.user.id);
            if (!profile) {
              const fallbackProfile: Profile = {
                id: session.user.id,
                name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
                email: session.user.email || null,
                phone: session.user.phone || null,
                role: (session.user.user_metadata?.role || 'member') as 'admin' | 'member',
                language: 'en' as const,
                status: 'active' as const,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              try {
                profile = await db.profiles.create(fallbackProfile);
              } catch (e) {
                profile = fallbackProfile;
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
        }
      } catch (err) {
        console.warn('Auth initialization notice:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const signUpWithEmail = async (data: SignUpData): Promise<UserSession> => {
    setLoading(true);
    const cleanEmail = data.email.trim().toLowerCase();
    let newUserId = generateValidUuid();

    try {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: authData, error } = await supabase.auth.signUp({
            email: cleanEmail,
            password: data.password,
            options: {
              data: {
                name: data.name,
                role: data.role,
                phone: data.phone || null,
              }
            }
          });

          if (!error && authData.user) {
            newUserId = authData.user.id;
          }
        } catch (supabaseErr) {
          console.warn('Supabase auth signup notice:', supabaseErr);
        }
      }

      // Create profile record in database table & local storage
      const newProfile: Profile = {
        id: newUserId,
        name: data.name,
        email: cleanEmail,
        phone: data.phone || null,
        role: data.role,
        language: 'en',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      try {
        await db.profiles.create(newProfile);
      } catch (e) {}

      // Save profiles list for offline/local matching
      const profiles = JSON.parse(localStorage.getItem('mahal_profiles') || '[]');
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
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, password: string): Promise<UserSession> => {
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      // 1. TRY SUPABASE AUTH SIGNIN FIRST IF SUPABASE IS CONFIGURED
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });

        // When Supabase IS configured, auth errors are real errors — fail immediately.
        // Do NOT fall through to offline demo mode.
        if (error) {
          if (error.message === 'Invalid login credentials') {
            throw new Error('Incorrect email or password. Please check your credentials and try again.');
          }
          throw new Error(error.message || 'Login failed. Please try again.');
        }

        if (data.user) {
          let profile = await db.profiles.getById(data.user.id);
          if (!profile) {
            const fallbackProfile: Profile = {
              id: data.user.id,
              name: data.user.user_metadata?.name || cleanEmail.split('@')[0] || 'User',
              email: data.user.email || cleanEmail,
              phone: data.user.phone || null,
              role: (data.user.user_metadata?.role || (cleanEmail.includes('admin') ? 'admin' : 'member')) as 'admin' | 'member',
              language: 'en',
              status: 'active',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            try { profile = await db.profiles.create(fallbackProfile); } catch (e) { profile = fallbackProfile; }
          }

          const validProfile = profile as Profile;

          // ENFORCE MEMBER PORTAL ACCESS STATUS
          if (validProfile.role === 'member') {
            const allMembers = await db.members.get();
            const memberRecord = validProfile.member_id 
              ? allMembers.find(m => m.id === validProfile.member_id)
              : allMembers.find(m => m.user_id === validProfile.id || (m.email && m.email.toLowerCase() === cleanEmail));

            if (!memberRecord || !memberRecord.portal_access || memberRecord.portal_status === 'not_granted') {
              throw new Error('Your Member Portal access has not been granted. Please contact your Mahall administrator.');
            }
            if (memberRecord.portal_status === 'suspended') {
              throw new Error('Your Member Portal access has been suspended. Please contact your Mahall administrator.');
            }
            if (memberRecord.portal_status === 'revoked') {
              throw new Error('Your Member Portal access has been revoked. Please contact your Mahall administrator.');
            }
            if (memberRecord.portal_status === 'pending') {
              throw new Error('Your account activation is pending. Please check your invitation email or contact your Mahall administrator.');
            }

            const session: UserSession = {
              id: validProfile.id,
              email: validProfile.email,
              phone: validProfile.phone,
              name: memberRecord.name || validProfile.name,
              role: 'member',
              language: validProfile.language || 'en',
              member_id: memberRecord.id,
              household_id: memberRecord.household_id,
            };
            setUser(session);
            localStorage.setItem('mahal_session', JSON.stringify(session));
            return session;
          }

          const session: UserSession = {
            id: validProfile.id,
            email: validProfile.email,
            phone: validProfile.phone,
            name: validProfile.name,
            role: validProfile.role,
            language: validProfile.language || 'en',
          };
          setUser(session);
          localStorage.setItem('mahal_session', JSON.stringify(session));
          return session;
        }

        throw new Error('Login failed. Please try again.');
      }

      // 2. OFFLINE / LOCAL DEMO MODE — only when Supabase is NOT configured
      if (!isSupabaseConfigured && cleanEmail === 'admin@mahal.com' && (password === 'admin' || password.length >= 4)) {
        const demoAdminSession: UserSession = {
          id: '00000000-0000-0000-0000-000000000001',
          email: 'admin@mahal.com',
          phone: '9999999999',
          name: 'Mahallu Admin',
          role: 'admin',
          language: 'en',
        };

        try {
          await db.profiles.create({
            id: demoAdminSession.id,
            name: demoAdminSession.name,
            email: demoAdminSession.email,
            phone: demoAdminSession.phone,
            role: 'admin',
            language: 'en',
            status: 'active',
          });
        } catch (e) {}

        localStorage.setItem('mahal_session', JSON.stringify(demoAdminSession));
        setUser(demoAdminSession);
        return demoAdminSession;
      }

      // 3. CHECK LOCAL REGISTERED PROFILES / MEMBERS FOR OFFLINE MODE
      const savedMembers = JSON.parse(localStorage.getItem('mahal_members') || '[]');
      const memberMatch = savedMembers.find((m: any) => m.email && m.email.toLowerCase() === cleanEmail);
      if (memberMatch) {
        if (!memberMatch.portal_access || memberMatch.portal_status === 'not_granted') {
          throw new Error('Your Member Portal access has not been granted. Please contact your Mahall administrator.');
        }
        if (memberMatch.portal_status === 'suspended') {
          throw new Error('Your Member Portal access has been suspended. Please contact your Mahall administrator.');
        }
        if (memberMatch.portal_status === 'revoked') {
          throw new Error('Your Member Portal access has been revoked. Please contact your Mahall administrator.');
        }
        if (memberMatch.portal_status === 'pending') {
          throw new Error('Your account activation is pending. Please check your invitation email or contact your Mahall administrator.');
        }

        const session: UserSession = {
          id: memberMatch.user_id || memberMatch.id,
          email: memberMatch.email,
          phone: memberMatch.phone,
          name: memberMatch.name,
          role: 'member',
          language: 'en',
          member_id: memberMatch.id,
          household_id: memberMatch.household_id,
        };
        localStorage.setItem('mahal_session', JSON.stringify(session));
        setUser(session);
        return session;
      }

      const savedProfiles = JSON.parse(localStorage.getItem('mahal_profiles') || '[]');
      const localMatch = savedProfiles.find((p: any) => p.email && p.email.toLowerCase() === cleanEmail);
      if (localMatch) {
        if (localMatch.role === 'member') {
          const m = savedMembers.find((mem: any) => mem.id === localMatch.member_id || mem.user_id === localMatch.id);
          if (!m || !m.portal_access || m.portal_status !== 'active') {
            throw new Error('Your Member Portal access is inactive. Please contact your Mahall administrator.');
          }
        }

        const session: UserSession = {
          id: localMatch.id,
          email: localMatch.email,
          phone: localMatch.phone,
          name: localMatch.name,
          role: localMatch.role,
          language: localMatch.language || 'en',
          member_id: localMatch.member_id || null,
        };
        localStorage.setItem('mahal_session', JSON.stringify(session));
        setUser(session);
        return session;
      }

      throw new Error('Invalid login credentials. Please check your email/password or contact your Mahall administrator.');
    } finally {
      setLoading(false);
    }
  };

  const sendOTP = async (phone: string): Promise<boolean> => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length >= 8) return true;
    throw new Error('Please enter a valid 10-digit phone number.');
  };

  const verifyOTP = async (phone: string, _code: string): Promise<UserSession> => {
    setLoading(true);
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    try {
      // Create or find member session
      const savedProfiles: Profile[] = JSON.parse(localStorage.getItem('mahal_profiles') || '[]');
      let profile = savedProfiles.find((p) => p.phone && p.phone.replace(/[^0-9]/g, '') === cleanPhone);

      const memberId = profile?.id || generateValidUuid();

      const memberSession: UserSession = {
        id: memberId,
        email: profile?.email || null,
        phone: cleanPhone,
        name: profile?.name || `Member (${cleanPhone})`,
        role: 'member',
        language: profile?.language || 'en',
      };

      try {
        await db.profiles.create({
          id: memberSession.id,
          name: memberSession.name,
          phone: cleanPhone,
          role: 'member',
          language: 'en',
          status: 'active',
        });
      } catch (e) {}

      localStorage.setItem('mahal_session', JSON.stringify(memberSession));
      setUser(memberSession);
      return memberSession;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        try { await supabase.auth.signOut(); } catch (e) {}
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
      localStorage.setItem('mahal_session', JSON.stringify(updatedUser));
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
