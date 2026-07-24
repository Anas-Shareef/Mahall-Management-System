import { supabase, isSupabaseConfigured } from './supabase';

export interface Profile {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: 'admin' | 'member';
  language: 'en' | 'ml';
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Household {
  id: string;
  house_number: string;
  house_owner_name: string;
  house_owner_phone: string | null;
  address: string | null;
  area: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  user_id: string | null;
  household_id: string;
  name: string;
  relationship: string;
  phone: string | null;
  email: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface SubscriptionYear {
  id: string;
  year: number;
  default_fee: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface MemberSubscription {
  id: string;
  member_id: string;
  subscription_year_id: string;
  annual_fee: number;
  previous_arrears: number;
  total_due: number; // annual_fee + previous_arrears
  total_paid: number;
  balance: number; // total_due - total_paid
  status: 'paid' | 'partially_paid' | 'unpaid';
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  member_id: string;
  subscription_id: string;
  amount: number;
  payment_method: 'cash' | 'upi' | 'bank_transfer' | 'other';
  payment_date: string;
  reference_number: string | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  title_en: string;
  message_en: string;
  title_ml: string;
  message_ml: string;
  type: 'payment_recorded' | 'payment_reminder' | 'arrears_reminder' | 'announcement';
  created_by: string | null;
  created_at: string;
}

export interface NotificationRecipient {
  id: string;
  notification_id: string;
  user_id: string;
  read_at: string | null;
  created_at: string;
}

// LOCAL STORAGE INITIALIZATION (MOCK DATA)
const MOCK_PROFILES: Profile[] = [
  {
    id: 'admin-uuid',
    name: 'Mahallu Admin',
    email: 'admin@mahal.com',
    phone: '9999999999',
    role: 'admin',
    language: 'en',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ashraf-user-uuid',
    name: 'Ashraf',
    email: 'ashraf@mahal.com',
    phone: '9876543210',
    role: 'member',
    language: 'ml',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ameer-user-uuid',
    name: 'Ameer',
    email: 'ameer@mahal.com',
    phone: '9876543211',
    role: 'member',
    language: 'en',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const MOCK_HOUSEHOLDS: Household[] = [
  {
    id: 'house-17-uuid',
    house_number: '17',
    house_owner_name: 'Ashraf',
    house_owner_phone: '9876543210',
    address: 'Vellikkeel House',
    area: 'Ward 2',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'house-18-uuid',
    house_number: '18',
    house_owner_name: 'Saidu K.',
    house_owner_phone: '9876543220',
    address: 'Hidayath Nagar',
    area: 'Ward 4',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const MOCK_MEMBERS: Member[] = [
  {
    id: 'member-ashraf-uuid',
    user_id: 'ashraf-user-uuid',
    household_id: 'house-17-uuid',
    name: 'Ashraf',
    relationship: 'Self (Owner)',
    phone: '9876543210',
    email: 'ashraf@mahal.com',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'member-ameer-uuid',
    user_id: 'ameer-user-uuid',
    household_id: 'house-17-uuid',
    name: 'Ameer',
    relationship: 'Son',
    phone: '9876543211',
    email: 'ameer@mahal.com',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'member-ajwa-uuid',
    user_id: null,
    household_id: 'house-17-uuid',
    name: 'Ajwa',
    relationship: 'Daughter',
    phone: '9876543212',
    email: null,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'member-shakeela-uuid',
    user_id: null,
    household_id: 'house-17-uuid',
    name: 'Shakeela',
    relationship: 'Spouse',
    phone: '9876543213',
    email: null,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'member-saidu-uuid',
    user_id: null,
    household_id: 'house-18-uuid',
    name: 'Saidu K.',
    relationship: 'Self (Owner)',
    phone: '9876543220',
    email: 'saidu@mahal.com',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const MOCK_YEARS: SubscriptionYear[] = [
  {
    id: 'year-2026-uuid',
    year: 2026,
    default_fee: 1000,
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const MOCK_SUBSCRIPTIONS: MemberSubscription[] = [
  {
    id: 'sub-ashraf-2026',
    member_id: 'member-ashraf-uuid',
    subscription_year_id: 'year-2026-uuid',
    annual_fee: 1000,
    previous_arrears: 100,
    total_due: 1100,
    total_paid: 1100,
    balance: 0,
    status: 'paid',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sub-ameer-2026',
    member_id: 'member-ameer-uuid',
    subscription_year_id: 'year-2026-uuid',
    annual_fee: 1000,
    previous_arrears: 100,
    total_due: 1100,
    total_paid: 500,
    balance: 600,
    status: 'partially_paid',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sub-ajwa-2026',
    member_id: 'member-ajwa-uuid',
    subscription_year_id: 'year-2026-uuid',
    annual_fee: 1200,
    previous_arrears: 0,
    total_due: 1200,
    total_paid: 0,
    balance: 1200,
    status: 'unpaid',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sub-shakeela-2026',
    member_id: 'member-shakeela-uuid',
    subscription_year_id: 'year-2026-uuid',
    annual_fee: 1300,
    previous_arrears: 0,
    total_due: 1300,
    total_paid: 500,
    balance: 800,
    status: 'partially_paid',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sub-saidu-2026',
    member_id: 'member-saidu-uuid',
    subscription_year_id: 'year-2026-uuid',
    annual_fee: 1000,
    previous_arrears: 400,
    total_due: 1400,
    total_paid: 1400,
    balance: 0,
    status: 'paid',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const MOCK_PAYMENTS: Payment[] = [
  {
    id: 'payment-ameer-1',
    member_id: 'member-ameer-uuid',
    subscription_id: 'sub-ameer-2026',
    amount: 200,
    payment_method: 'cash',
    payment_date: '2026-01-10',
    reference_number: 'REC-001',
    notes: 'Paid cash at committee office',
    recorded_by: 'admin-uuid',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'payment-ameer-2',
    member_id: 'member-ameer-uuid',
    subscription_id: 'sub-ameer-2026',
    amount: 300,
    payment_method: 'upi',
    payment_date: '2026-03-15',
    reference_number: 'UPI9823489234',
    notes: 'GPay payment',
    recorded_by: 'admin-uuid',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'payment-ashraf-1',
    member_id: 'member-ashraf-uuid',
    subscription_id: 'sub-ashraf-2026',
    amount: 1100,
    payment_method: 'bank_transfer',
    payment_date: '2026-01-12',
    reference_number: 'TXN8732948239',
    notes: 'Direct Bank Transfer',
    recorded_by: 'admin-uuid',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'payment-shakeela-1',
    member_id: 'member-shakeela-uuid',
    subscription_id: 'sub-shakeela-2026',
    amount: 500,
    payment_method: 'cash',
    payment_date: '2026-02-14',
    reference_number: 'REC-002',
    notes: 'Paid cash to ward representative',
    recorded_by: 'admin-uuid',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'payment-saidu-1',
    member_id: 'member-saidu-uuid',
    subscription_id: 'sub-saidu-2026',
    amount: 1400,
    payment_method: 'cash',
    payment_date: '2026-01-15',
    reference_number: 'REC-003',
    notes: 'Paid fully including arrears',
    recorded_by: 'admin-uuid',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    title_en: 'Payment Recorded',
    message_en: 'Your payment of ₹300 has been recorded successfully.',
    title_ml: 'പണമടവ് രേഖപ്പെടുത്തി',
    message_ml: 'നിങ്ങളുടെ ₹300 പണമടവ് വിജയകരമായി രേഖപ്പെടുത്തിയിരിക്കുന്നു.',
    type: 'payment_recorded',
    created_by: 'admin-uuid',
    created_at: new Date().toISOString(),
  },
  {
    id: 'notif-2',
    title_en: 'Subscription Reminder',
    message_en: 'Your 2026 subscription balance is ₹600.',
    title_ml: 'വരിസംഖ്യ ഓർമ്മപ്പെടുത്തൽ',
    message_ml: 'നിങ്ങളുടെ 2026-ലെ വരിസംഖ്യയിൽ ₹600 ബാക്കി നിൽക്കുന്നു.',
    type: 'payment_reminder',
    created_by: 'admin-uuid',
    created_at: new Date().toISOString(),
  },
  {
    id: 'notif-3',
    title_en: 'New Announcement',
    message_en: 'A new Mahallu announcement is available regarding Ramadan programs.',
    title_ml: 'പുതിയ അറിയിപ്പ്',
    message_ml: 'റമദാൻ പ്രോഗ്രാമുകളെക്കുറിച്ചുള്ള പുതിയ അറിയിപ്പ് ലഭ്യമാണ്.',
    type: 'announcement',
    created_by: 'admin-uuid',
    created_at: new Date().toISOString(),
  },
];

const MOCK_RECIPIENTS: NotificationRecipient[] = [
  {
    id: 'recip-1',
    notification_id: 'notif-1',
    user_id: 'ameer-user-uuid',
    read_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'recip-2',
    notification_id: 'notif-2',
    user_id: 'ameer-user-uuid',
    read_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'recip-3',
    notification_id: 'notif-3',
    user_id: 'ameer-user-uuid',
    read_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'recip-4',
    notification_id: 'notif-3',
    user_id: 'ashraf-user-uuid',
    read_at: null,
    created_at: new Date().toISOString(),
  },
];

// Localstorage state initialization
const initializeLocalStorage = () => {
  const checkAndSet = (key: string, initialData: any) => {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(initialData));
    }
  };
  checkAndSet('mahal_profiles', MOCK_PROFILES);
  checkAndSet('mahal_households', MOCK_HOUSEHOLDS);
  checkAndSet('mahal_members', MOCK_MEMBERS);
  checkAndSet('mahal_years', MOCK_YEARS);
  checkAndSet('mahal_subscriptions', MOCK_SUBSCRIPTIONS);
  checkAndSet('mahal_payments', MOCK_PAYMENTS);
  checkAndSet('mahal_notifications', MOCK_NOTIFICATIONS);
  checkAndSet('mahal_recipients', MOCK_RECIPIENTS);
};

initializeLocalStorage();

// Helper to interact with LocalStorage
const getLocalData = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const saveLocalData = <T>(key: string, data: T[]): void => {
  localStorage.setItem(key, JSON.stringify(data));
};

// EXPORTED SERVICES (Dual mode: Supabase OR LocalStorage)
export const db = {
  // PROFILES
  profiles: {
    get: async (): Promise<Profile[]> => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('profiles').select('*');
        if (error) throw error;
        return data as Profile[];
      }
      return getLocalData<Profile>('mahal_profiles');
    },
    getById: async (id: string): Promise<Profile | null> => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
        if (error && error.code !== 'PGRST116') throw error;
        return data ? (data as Profile) : null;
      }
      const list = getLocalData<Profile>('mahal_profiles');
      return list.find((p) => p.id === id) || null;
    },
    create: async (profile: Partial<Profile> & { id: string; name: string; role: 'admin' | 'member' }): Promise<Profile> => {
      const fullProfile: Profile = {
        id: profile.id,
        name: profile.name,
        email: profile.email || null,
        phone: profile.phone || null,
        role: profile.role,
        language: profile.language || 'en',
        status: profile.status || 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Save locally first for instant, bulletproof persistence
      const list = getLocalData<Profile>('mahal_profiles');
      const idx = list.findIndex((p) => p.id === profile.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...fullProfile };
      } else {
        list.push(fullProfile);
      }
      saveLocalData('mahal_profiles', list);

      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.from('profiles').upsert(fullProfile).select().single();
          if (!error && data) return data as Profile;
        } catch (err) {
          console.warn('Supabase profile creation notice:', err);
        }
      }
      return fullProfile;
    },
    update: async (id: string, updates: Partial<Profile>): Promise<Profile> => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data as Profile;
      }
      const list = getLocalData<Profile>('mahal_profiles');
      const idx = list.findIndex((p) => p.id === id);
      if (idx === -1) throw new Error('Profile not found');
      list[idx] = { ...list[idx], ...updates, updated_at: new Date().toISOString() };
      saveLocalData('mahal_profiles', list);
      return list[idx];
    },
  },

  // HOUSEHOLDS
  households: {
    get: async (): Promise<Household[]> => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('households').select('*').order('house_number');
        if (error) throw error;
        return data as Household[];
      }
      return getLocalData<Household>('mahal_households').sort((a, b) =>
        a.house_number.localeCompare(b.house_number, undefined, { numeric: true, sensitivity: 'base' })
      );
    },
    getById: async (id: string): Promise<Household | null> => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('households').select('*').eq('id', id).single();
        if (error) throw error;
        return data as Household;
      }
      return getLocalData<Household>('mahal_households').find((h) => h.id === id) || null;
    },
    create: async (household: Omit<Household, 'id' | 'created_at' | 'updated_at'>): Promise<Household> => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('households')
          .insert([household])
          .select()
          .single();
        if (error) throw error;
        return data as Household;
      }
      const list = getLocalData<Household>('mahal_households');
      const newHousehold: Household = {
        ...household,
        id: 'house-' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      // Check unique house number
      if (list.some((h) => h.house_number === household.house_number)) {
        throw new Error('House number already exists');
      }
      list.push(newHousehold);
      saveLocalData('mahal_households', list);
      return newHousehold;
    },
    update: async (id: string, updates: Partial<Household>): Promise<Household> => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('households')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data as Household;
      }
      const list = getLocalData<Household>('mahal_households');
      const idx = list.findIndex((h) => h.id === id);
      if (idx === -1) throw new Error('Household not found');
      // Unique check
      if (updates.house_number && updates.house_number !== list[idx].house_number) {
        if (list.some((h) => h.house_number === updates.house_number)) {
          throw new Error('House number already exists');
        }
      }
      list[idx] = { ...list[idx], ...updates, updated_at: new Date().toISOString() };
      saveLocalData('mahal_households', list);
      return list[idx];
    },
    delete: async (id: string): Promise<boolean> => {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('households').delete().eq('id', id);
        if (error) throw error;
        return true;
      }
      const list = getLocalData<Household>('mahal_households');
      const filtered = list.filter((h) => h.id !== id);
      saveLocalData('mahal_households', filtered);
      return true;
    },
  },

  // MEMBERS
  members: {
    get: async (): Promise<Member[]> => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('members').select('*').order('name');
        if (error) throw error;
        return data as Member[];
      }
      return getLocalData<Member>('mahal_members').sort((a, b) => a.name.localeCompare(b.name));
    },
    getById: async (id: string): Promise<Member | null> => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('members').select('*').eq('id', id).single();
        if (error) throw error;
        return data as Member;
      }
      return getLocalData<Member>('mahal_members').find((m) => m.id === id) || null;
    },
    getByHousehold: async (householdId: string): Promise<Member[]> => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .eq('household_id', householdId);
        if (error) throw error;
        return data as Member[];
      }
      return getLocalData<Member>('mahal_members').filter((m) => m.household_id === householdId);
    },
    getByUserId: async (userId: string): Promise<Member | null> => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        if (error) throw error;
        return data as Member;
      }
      return getLocalData<Member>('mahal_members').find((m) => m.user_id === userId) || null;
    },
    create: async (member: Omit<Member, 'id' | 'created_at' | 'updated_at'>): Promise<Member> => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('members').insert([member]).select().single();
        if (error) throw error;
        return data as Member;
      }
      const list = getLocalData<Member>('mahal_members');
      const newMember: Member = {
        ...member,
        id: 'member-' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      list.push(newMember);
      saveLocalData('mahal_members', list);

      // Auto-generate subscriptions for existing active years
      const years = getLocalData<SubscriptionYear>('mahal_years');
      const subs = getLocalData<MemberSubscription>('mahal_subscriptions');
      years.forEach((yr) => {
        const subId = 'sub-' + newMember.id + '-' + yr.year;
        subs.push({
          id: subId,
          member_id: newMember.id,
          subscription_year_id: yr.id,
          annual_fee: yr.default_fee,
          previous_arrears: 0,
          total_due: yr.default_fee,
          total_paid: 0,
          balance: yr.default_fee,
          status: 'unpaid',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      });
      saveLocalData('mahal_subscriptions', subs);

      return newMember;
    },
    update: async (id: string, updates: Partial<Member>): Promise<Member> => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('members')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data as Member;
      }
      const list = getLocalData<Member>('mahal_members');
      const idx = list.findIndex((m) => m.id === id);
      if (idx === -1) throw new Error('Member not found');
      list[idx] = { ...list[idx], ...updates, updated_at: new Date().toISOString() };
      saveLocalData('mahal_members', list);
      return list[idx];
    },
    delete: async (id: string): Promise<boolean> => {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('members').delete().eq('id', id);
        if (error) throw error;
        return true;
      }
      const list = getLocalData<Member>('mahal_members');
      const filtered = list.filter((m) => m.id !== id);
      saveLocalData('mahal_members', filtered);
      return true;
    },
  },

  // SUBSCRIPTION YEARS
  years: {
    get: async (): Promise<SubscriptionYear[]> => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('subscription_years').select('*').order('year', { ascending: false });
        if (error) throw error;
        return data as SubscriptionYear[];
      }
      return getLocalData<SubscriptionYear>('mahal_years').sort((a, b) => b.year - a.year);
    },
    create: async (
      yearData: Omit<SubscriptionYear, 'id' | 'created_at' | 'updated_at'>
    ): Promise<SubscriptionYear> => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('subscription_years')
          .insert([yearData])
          .select()
          .single();
        if (error) throw error;
        return data as SubscriptionYear;
      }
      const list = getLocalData<SubscriptionYear>('mahal_years');
      const newYear: SubscriptionYear = {
        ...yearData,
        id: 'year-' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (list.some((y) => y.year === yearData.year)) {
        throw new Error('Subscription year already configured');
      }
      list.push(newYear);
      saveLocalData('mahal_years', list);

      // Auto create Member subscriptions for all active members
      const activeMembers = getLocalData<Member>('mahal_members').filter((m) => m.status === 'active');
      const subs = getLocalData<MemberSubscription>('mahal_subscriptions');

      activeMembers.forEach((member) => {
        // Find if they have balance from previous active subscription years
        let unpaidArrears = 0;
        const prevSubs = subs.filter((s) => s.member_id === member.id);
        if (prevSubs.length > 0) {
          // Sort by year descending to find the last balance
          // For simplicity: aggregate all outstanding balances from previous years
          unpaidArrears = prevSubs.reduce((sum, s) => sum + s.balance, 0);
        }

        subs.push({
          id: 'sub-' + member.id + '-' + newYear.year,
          member_id: member.id,
          subscription_year_id: newYear.id,
          annual_fee: newYear.default_fee,
          previous_arrears: unpaidArrears,
          total_due: newYear.default_fee + unpaidArrears,
          total_paid: 0,
          balance: newYear.default_fee + unpaidArrears,
          status: 'unpaid',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      });
      saveLocalData('mahal_subscriptions', subs);

      return newYear;
    },
  },

  // MEMBER SUBSCRIPTIONS
  subscriptions: {
    get: async (): Promise<MemberSubscription[]> => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('member_subscriptions').select('*');
        if (error) throw error;
        return data as MemberSubscription[];
      }
      return getLocalData<MemberSubscription>('mahal_subscriptions');
    },
    getById: async (id: string): Promise<MemberSubscription | null> => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('member_subscriptions')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        return data as MemberSubscription;
      }
      return getLocalData<MemberSubscription>('mahal_subscriptions').find((s) => s.id === id) || null;
    },
    getByMember: async (memberId: string): Promise<MemberSubscription[]> => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('member_subscriptions')
          .select('*')
          .eq('member_id', memberId);
        if (error) throw error;
        return data as MemberSubscription[];
      }
      return getLocalData<MemberSubscription>('mahal_subscriptions').filter(
        (s) => s.member_id === memberId
      );
    },
    update: async (id: string, updates: Partial<MemberSubscription>): Promise<MemberSubscription> => {
      if (isSupabaseConfigured && supabase) {
        // Strip out generated always columns (total_due, balance) before updating in Supabase
        const { total_due, balance, ...cleanUpdates } = updates as any;
        const { data, error } = await supabase
          .from('member_subscriptions')
          .update(cleanUpdates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data as MemberSubscription;
      }
      const list = getLocalData<MemberSubscription>('mahal_subscriptions');
      const idx = list.findIndex((s) => s.id === id);
      if (idx === -1) throw new Error('Subscription not found');

      const annual_fee = updates.annual_fee !== undefined ? updates.annual_fee : list[idx].annual_fee;
      const previous_arrears =
        updates.previous_arrears !== undefined ? updates.previous_arrears : list[idx].previous_arrears;
      const total_paid = updates.total_paid !== undefined ? updates.total_paid : list[idx].total_paid;

      const total_due = annual_fee + previous_arrears;
      const balance = total_due - total_paid;

      let status = list[idx].status;
      if (total_paid >= total_due) {
        status = 'paid';
      } else if (total_paid > 0) {
        status = 'partially_paid';
      } else {
        status = 'unpaid';
      }

      list[idx] = {
        ...list[idx],
        ...updates,
        annual_fee,
        previous_arrears,
        total_due,
        total_paid,
        balance,
        status,
        updated_at: new Date().toISOString(),
      };
      saveLocalData('mahal_subscriptions', list);
      return list[idx];
    },
    create: async (
      subData: Omit<MemberSubscription, 'id' | 'created_at' | 'updated_at'>
    ): Promise<MemberSubscription> => {
      const annual_fee = subData.annual_fee || 0;
      const previous_arrears = subData.previous_arrears || 0;
      const total_paid = subData.total_paid || 0;
      const total_due = annual_fee + previous_arrears;
      const balance = total_due - total_paid;

      let status = subData.status;
      if (total_paid >= total_due && total_due > 0) {
        status = 'paid';
      } else if (total_paid > 0) {
        status = 'partially_paid';
      } else {
        status = 'unpaid';
      }

      const fullRecord = {
        ...subData,
        annual_fee,
        previous_arrears,
        total_due,
        total_paid,
        balance,
        status,
      };

      if (isSupabaseConfigured && supabase) {
        // Strip out generated always columns (total_due, balance) before inserting in Supabase
        const { total_due, balance, ...insertPayload } = fullRecord as any;
        const { data, error } = await supabase
          .from('member_subscriptions')
          .insert([insertPayload])
          .select()
          .single();
        if (error) throw error;
        return data as MemberSubscription;
      }

      const list = getLocalData<MemberSubscription>('mahal_subscriptions');
      const newSub: MemberSubscription = {
        ...fullRecord,
        id: 'sub-' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      list.push(newSub);
      saveLocalData('mahal_subscriptions', list);
      return newSub;
    },
    delete: async (id: string): Promise<boolean> => {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('member_subscriptions').delete().eq('id', id);
        if (error) throw error;
        return true;
      }
      const list = getLocalData<MemberSubscription>('mahal_subscriptions');
      const filtered = list.filter((s) => s.id !== id);
      saveLocalData('mahal_subscriptions', filtered);
      return true;
    },
  },

  // PAYMENTS
  payments: {
    get: async (): Promise<Payment[]> => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .order('payment_date', { ascending: false });
        if (error) throw error;
        return data as Payment[];
      }
      return getLocalData<Payment>('mahal_payments').sort(
        (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
      );
    },
    getByMember: async (memberId: string): Promise<Payment[]> => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .eq('member_id', memberId)
          .order('payment_date', { ascending: false });
        if (error) throw error;
        return data as Payment[];
      }
      return getLocalData<Payment>('mahal_payments')
        .filter((p) => p.member_id === memberId)
        .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
    },
    create: async (payment: Omit<Payment, 'id' | 'created_at' | 'updated_at'>): Promise<Payment> => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('payments').insert([payment]).select().single();
        if (error) throw error;
        return data as Payment;
      }
      const list = getLocalData<Payment>('mahal_payments');
      const newPayment: Payment = {
        ...payment,
        id: 'payment-' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      list.push(newPayment);
      saveLocalData('mahal_payments', list);

      // Now trigger the database hook to update subscription stats
      const subs = getLocalData<MemberSubscription>('mahal_subscriptions');
      const subIdx = subs.findIndex((s) => s.id === payment.subscription_id);
      if (subIdx !== -1) {
        const totalPaid = subs[subIdx].total_paid + payment.amount;
        const totalDue = subs[subIdx].total_due;
        const balance = totalDue - totalPaid;
        let status: 'paid' | 'partially_paid' | 'unpaid' = 'unpaid';
        if (totalPaid >= totalDue) {
          status = 'paid';
        } else if (totalPaid > 0) {
          status = 'partially_paid';
        }

        subs[subIdx] = {
          ...subs[subIdx],
          total_paid: totalPaid,
          balance,
          status,
          updated_at: new Date().toISOString(),
        };
        saveLocalData('mahal_subscriptions', subs);
      }

      // Add a notification for the member
      const member = getLocalData<Member>('mahal_members').find((m) => m.id === payment.member_id);
      if (member && member.user_id) {
        const notif: Notification = {
          id: 'notif-' + Math.random().toString(36).substr(2, 9),
          title_en: 'Payment Recorded',
          message_en: `Your payment of ₹${payment.amount} has been recorded successfully.`,
          title_ml: 'പണമടവ് രേഖപ്പെടുത്തി',
          message_ml: `നിങ്ങളുടെ ₹${payment.amount} പണമടവ് വിജയകരമായി രേഖപ്പെടുത്തിയിരിക്കുന്നു.`,
          type: 'payment_recorded',
          created_by: payment.recorded_by,
          created_at: new Date().toISOString(),
        };
        const notifs = getLocalData<Notification>('mahal_notifications');
        notifs.push(notif);
        saveLocalData('mahal_notifications', notifs);

        const recipients = getLocalData<NotificationRecipient>('mahal_recipients');
        recipients.push({
          id: 'recip-' + Math.random().toString(36).substr(2, 9),
          notification_id: notif.id,
          user_id: member.user_id,
          read_at: null,
          created_at: new Date().toISOString(),
        });
        saveLocalData('mahal_recipients', recipients);
      }

      return newPayment;
    },
    getById: async (id: string): Promise<Payment | null> => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('payments').select('*').eq('id', id).single();
        if (error) throw error;
        return data as Payment;
      }
      return getLocalData<Payment>('mahal_payments').find((p) => p.id === id) || null;
    },
    update: async (id: string, updates: Partial<Payment>): Promise<Payment> => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('payments')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data as Payment;
      }
      const list = getLocalData<Payment>('mahal_payments');
      const idx = list.findIndex((p) => p.id === id);
      if (idx === -1) throw new Error('Payment record not found');
      list[idx] = { ...list[idx], ...updates, updated_at: new Date().toISOString() };
      saveLocalData('mahal_payments', list);
      return list[idx];
    },
    delete: async (id: string): Promise<boolean> => {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('payments').delete().eq('id', id);
        if (error) throw error;
        return true;
      }
      const list = getLocalData<Payment>('mahal_payments');
      const filtered = list.filter((p) => p.id !== id);
      saveLocalData('mahal_payments', filtered);
      return true;
    },
  },

  // NOTIFICATIONS
  notifications: {
    get: async (): Promise<Notification[]> => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data as Notification[];
      }
      return getLocalData<Notification>('mahal_notifications').sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    getUserNotifications: async (userId: string): Promise<(Notification & { read_at: string | null; recipient_id: string })[]> => {
      const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      if (isSupabaseConfigured && supabase && isValidUuid) {
        try {
          const { data, error } = await supabase
            .from('notification_recipients')
            .select(`
              id,
              read_at,
              notifications (
                id,
                title_en,
                message_en,
                title_ml,
                message_ml,
                type,
                created_by,
                created_at
              )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (!error && data) {
            return data.map((d: any) => ({
              ...d.notifications,
              read_at: d.read_at,
              recipient_id: d.id,
            }));
          }
        } catch (e) {
          console.warn('Supabase notifications fetch notice:', e);
        }
      }

      // Mock join fallback
      const recipients = getLocalData<NotificationRecipient>('mahal_recipients').filter(
        (r) => r.user_id === userId
      );
      const notifs = getLocalData<Notification>('mahal_notifications');

      return recipients
        .map((recip) => {
          const n = notifs.find((notif) => notif.id === recip.notification_id);
          if (!n) return null;
          return {
            ...n,
            read_at: recip.read_at,
            recipient_id: recip.id,
          };
        })
        .filter((x): x is Notification & { read_at: string | null; recipient_id: string } => x !== null)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    createBroadcast: async (
      notifData: Omit<Notification, 'id' | 'created_at'>,
      target: 'all' | 'pending' | 'arrears' | string, // can be a specific user_id, or recipient list
      specificIds?: string[] // specific profile IDs
    ): Promise<Notification> => {
      if (isSupabaseConfigured && supabase) {
        const { data: newNotif, error: notifErr } = await supabase
          .from('notifications')
          .insert([notifData])
          .select()
          .single();
        
        if (notifErr) throw notifErr;

        // Fetch targets based on selection
        let userIds: string[] = [];
        if (specificIds && specificIds.length > 0) {
          userIds = specificIds;
        } else if (target === 'all') {
          const { data } = await supabase.from('profiles').select('id');
          userIds = data?.map((p) => p.id) || [];
        } else if (target === 'pending') {
          // get members with balance > 0
          const { data } = await supabase
            .from('member_subscriptions')
            .select('member(user_id)')
            .gt('balance', 0);
          userIds = data?.map((x: any) => x.member?.user_id).filter(Boolean) || [];
        } else if (target === 'arrears') {
          const { data } = await supabase
            .from('member_subscriptions')
            .select('member(user_id)')
            .gt('previous_arrears', 0);
          userIds = data?.map((x: any) => x.member?.user_id).filter(Boolean) || [];
        }

        if (userIds.length > 0) {
          const recipientRecords = userIds.map((uid) => ({
            notification_id: newNotif.id,
            user_id: uid,
          }));
          await supabase.from('notification_recipients').insert(recipientRecords);
        }

        return newNotif as Notification;
      }

      // Mock logic
      const notifs = getLocalData<Notification>('mahal_notifications');
      const newNotif: Notification = {
        ...notifData,
        id: 'notif-' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
      };
      notifs.push(newNotif);
      saveLocalData('mahal_notifications', notifs);

      // Recipients mapping
      let userIds: string[] = [];
      const profiles = getLocalData<Profile>('mahal_profiles');
      const members = getLocalData<Member>('mahal_members');
      const subs = getLocalData<MemberSubscription>('mahal_subscriptions');

      if (specificIds && specificIds.length > 0) {
        userIds = specificIds;
      } else if (target === 'all') {
        userIds = profiles.filter((p) => p.role === 'member').map((p) => p.id);
      } else if (target === 'pending') {
        // Members with balance > 0
        const pendingMemberIds = subs.filter((s) => s.balance > 0).map((s) => s.member_id);
        userIds = members
          .filter((m) => pendingMemberIds.includes(m.id) && m.user_id)
          .map((m) => m.user_id as string);
      } else if (target === 'arrears') {
        const arrearsMemberIds = subs.filter((s) => s.previous_arrears > 0).map((s) => s.member_id);
        userIds = members
          .filter((m) => arrearsMemberIds.includes(m.id) && m.user_id)
          .map((m) => m.user_id as string);
      } else {
        // Assume target is specific household or member ID
        // Check if member
        const matchedMember = members.find((m) => m.id === target);
        if (matchedMember && matchedMember.user_id) {
          userIds = [matchedMember.user_id];
        } else {
          // Check if household
          const householdMembers = members.filter((m) => m.household_id === target && m.user_id);
          userIds = householdMembers.map((m) => m.user_id as string);
        }
      }

      if (userIds.length > 0) {
        const recipients = getLocalData<NotificationRecipient>('mahal_recipients');
        userIds.forEach((uid) => {
          recipients.push({
            id: 'recip-' + Math.random().toString(36).substr(2, 9),
            notification_id: newNotif.id,
            user_id: uid,
            read_at: null,
            created_at: new Date().toISOString(),
          });
        });
        saveLocalData('mahal_recipients', recipients);
      }

      return newNotif;
    },
    markAsRead: async (recipientId: string): Promise<void> => {
      if (isSupabaseConfigured && supabase) {
        await supabase
          .from('notification_recipients')
          .update({ read_at: new Date().toISOString() })
          .eq('id', recipientId);
        return;
      }
      const list = getLocalData<NotificationRecipient>('mahal_recipients');
      const idx = list.findIndex((r) => r.id === recipientId);
      if (idx !== -1) {
        list[idx].read_at = new Date().toISOString();
        saveLocalData('mahal_recipients', list);
      }
    },
  },
};
