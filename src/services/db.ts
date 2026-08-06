import { supabase, isSupabaseConfigured } from './supabase';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const sanitizeUuid = (val: string | null | undefined): string | null => {
  if (!val) return null;
  if (UUID_REGEX.test(val)) return val;
  return null;
};

export interface Profile {
  id: string;
  user_id?: string;
  member_id?: string | null;
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
  portal_access: boolean;
  portal_status: 'not_granted' | 'pending' | 'active' | 'suspended' | 'revoked';
  is_subscription_accountable?: boolean;
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

export interface ArrearAdjustment {
  id: string;
  member_id: string;
  subscription_year_id: string;
  amount: number;
  reason: string;
  created_by: string | null;
  created_at: string;
}

export interface DeathRecord {
  id: string;
  deceased_name: string;
  member_id: string | null;
  father_or_husband_name: string | null;
  date_of_death: string;
  burial_date: string | null;
  burial_time: string | null;
  place_of_death: string | null;
  age: number | null;
  gender: 'male' | 'female' | 'other' | null;
  address: string | null;
  ward_or_area: string | null;
  cause_of_death: string | null;
  medically_certified: boolean;
  certifier_name: string | null;
  notes: string | null;
  certificate_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarriageRecord {
  id: string;
  groom_name: string;
  groom_member_id: string | null;
  groom_father_name: string | null;
  groom_phone: string | null;
  groom_house_number: string | null;
  groom_ward: string | null;
  groom_address: string | null;
  
  bride_type: 'member' | 'external';
  bride_name: string;
  bride_member_id: string | null;
  bride_father_name: string | null;
  bride_phone: string | null;
  bride_address: string | null;
  bride_ward: string | null;

  nikah_date: string;
  nikah_time: string | null;
  nikah_venue: string | null;
  registration_number: string | null;
  conducted_by: string | null;
  nikah_type: string | null;

  wali_name: string | null;
  wali_relationship: string | null;
  wali_phone: string | null;

  witness1_name: string | null;
  witness1_phone: string | null;
  witness2_name: string | null;
  witness2_phone: string | null;

  mahr_type: string | null;
  mahr_description: string | null;
  mahr_payment_status: string | null;
  mahr_notes: string | null;

  status: 'completed' | 'cancelled';
  certificate_url: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DonationCampaign {
  id: string;
  campaign_name: string;
  campaign_type: string;
  description: string | null;
  target_amount: number;
  start_date: string | null;
  end_date: string | null;
  cover_image: string | null;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Donation {
  id: string;
  donation_type: 'general' | 'campaign';
  campaign_id: string | null;
  donor_type?: 'member' | 'external' | 'anonymous';
  donor_name: string | null;
  donor_phone: string | null;
  donor_email?: string | null;
  donor_address?: string | null;
  donor_member_id: string | null;
  is_anonymous: boolean;
  amount: number;
  payment_method: 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other';
  donation_date: string;
  receipt_number: string | null;
  reference_number?: string | null;
  purpose?: string | null;
  status?: 'received' | 'pending' | 'cancelled' | 'refunded';
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id?: string;
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  old_data?: any;
  new_data?: any;
  created_at?: string;
}

export interface GalleryAlbum {
  id: string;
  title: string;
  programme_type: string;
  event_date: string;
  year: number;
  venue: string | null;
  description: string | null;
  cover_image: string | null;
  visibility: 'published' | 'draft';
  related_campaign_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GalleryImage {
  id: string;
  album_id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
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
    id: '00000000-0000-0000-0000-000000000001',
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
    portal_access: true,
    portal_status: 'active',
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
    portal_access: true,
    portal_status: 'active',
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
    portal_access: false,
    portal_status: 'not_granted',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'member-shakeela-uuid',
    user_id: null,
    household_id: 'house-17-uuid',
    name: 'Shakeela',
    relationship: 'Groom',
    phone: '9876543213',
    email: null,
    status: 'active',
    portal_access: false,
    portal_status: 'not_granted',
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
    portal_access: false,
    portal_status: 'not_granted',
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
    recorded_by: '00000000-0000-0000-0000-000000000001',
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
    recorded_by: '00000000-0000-0000-0000-000000000001',
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
    recorded_by: '00000000-0000-0000-0000-000000000001',
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
    recorded_by: '00000000-0000-0000-0000-000000000001',
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
    recorded_by: '00000000-0000-0000-0000-000000000001',
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
    created_by: '00000000-0000-0000-0000-000000000001',
    created_at: new Date().toISOString(),
  },
  {
    id: 'notif-2',
    title_en: 'Subscription Reminder',
    message_en: 'Your 2026 subscription balance is ₹600.',
    title_ml: 'വരിസംഖ്യ ഓർമ്മപ്പെടുത്തൽ',
    message_ml: 'നിങ്ങളുടെ 2026-ലെ വരിസംഖ്യയിൽ ₹600 ബാക്കി നിൽക്കുന്നു.',
    type: 'payment_reminder',
    created_by: '00000000-0000-0000-0000-000000000001',
    created_at: new Date().toISOString(),
  },
  {
    id: 'notif-3',
    title_en: 'New Announcement',
    message_en: 'A new Mahallu announcement is available regarding Ramadan programs.',
    title_ml: 'പുതിയ അറിയിപ്പ്',
    message_ml: 'റമദാൻ പ്രോഗ്രാമുകളെക്കുറിച്ചുള്ള പുതിയ അറിയിപ്പ് ലഭ്യമാണ്.',
    type: 'announcement',
    created_by: '00000000-0000-0000-0000-000000000001',
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

  households: {
    get: async (): Promise<Household[]> => {
      let items: Household[] = [];
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.from('households').select('*');
          if (!error && data && data.length > 0) {
            items = data as Household[];
          }
        } catch (err) {
          console.warn('Supabase households fetch notice:', err);
        }
      }
      if (items.length === 0) {
        items = getLocalData<Household>('mahal_households');
      }

      // Natural Ascending Numerical Sorting (H-1, H-2, H-17, etc.)
      return items.sort((a, b) => {
        const numA = parseInt(a.house_number.replace(/\D/g, ''), 10);
        const numB = parseInt(b.house_number.replace(/\D/g, ''), 10);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return a.house_number.localeCompare(b.house_number, undefined, { numeric: true, sensitivity: 'base' });
      });
    },
    getById: async (id: string): Promise<Household | null> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.from('households').select('*').eq('id', id).single();
          if (!error && data) return data as Household;
        } catch (err) {
          console.warn('Supabase household fetch notice:', err);
        }
      }
      return getLocalData<Household>('mahal_households').find((h) => h.id === id) || null;
    },
    create: async (household: Omit<Household, 'id' | 'created_at' | 'updated_at'>): Promise<Household> => {
      const existingList = await db.households.get();
      const cleanNum = household.house_number.trim().replace(/^([hH]-?)+/, '') || household.house_number.trim();
      const payload = { ...household, house_number: cleanNum };

      // Check duplicate against active households list (Supabase or Local)
      const duplicateExists = existingList.some(
        (h) => h.house_number.trim().replace(/^([hH]-?)+/, '') === cleanNum
      );
      if (duplicateExists) {
        throw new Error(`House number H-${cleanNum} already exists`);
      }

      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('households')
            .insert([payload])
            .select()
            .single();
          if (!error && data) {
            const list = getLocalData<Household>('mahal_households');
            list.push(data as Household);
            saveLocalData('mahal_households', list);
            return data as Household;
          }
          if (error) {
            console.warn('Supabase insert household error:', error);
            if (error.message && error.message.includes('unique')) {
              throw new Error(`House number H-${cleanNum} already exists in database`);
            }
          }
        } catch (err: any) {
          if (err.message && err.message.includes('already exists')) throw err;
          console.warn('Supabase insert household notice:', err);
        }
      }

      // Fallback local creation
      const list = getLocalData<Household>('mahal_households');
      const newHousehold: Household = {
        ...payload,
        id: 'house-' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      list.push(newHousehold);
      saveLocalData('mahal_households', list);
      return newHousehold;
    },
    update: async (id: string, updates: Partial<Household>): Promise<Household> => {
      const existingList = await db.households.get();
      const cleanUpdates = { ...updates, updated_at: new Date().toISOString() };

      if (cleanUpdates.house_number) {
        cleanUpdates.house_number = cleanUpdates.house_number.trim().replace(/^([hH]-?)+/, '') || cleanUpdates.house_number.trim();
        const targetClean = cleanUpdates.house_number;
        
        // Exclude current ID (h.id !== id) from active households list
        const duplicateExists = existingList.some(
          (h) => h.id !== id && h.house_number.trim().replace(/^([hH]-?)+/, '') === targetClean
        );
        if (duplicateExists) {
          throw new Error(`House number H-${targetClean} already exists`);
        }
      }

      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('households')
            .update(cleanUpdates)
            .eq('id', id)
            .select()
            .maybeSingle();
          if (!error && data) {
            const list = getLocalData<Household>('mahal_households');
            const idx = list.findIndex((h) => h.id === id);
            if (idx !== -1) {
              list[idx] = data as Household;
            } else {
              list.push(data as Household);
            }
            saveLocalData('mahal_households', list);
            return data as Household;
          }
          if (error) {
            console.warn('Supabase update household error:', error);
            if (error.message && error.message.includes('unique')) {
              throw new Error(`House number H-${cleanUpdates.house_number} already exists in database`);
            }
          }
        } catch (err: any) {
          if (err.message && err.message.includes('already exists')) throw err;
          console.warn('Supabase update household notice:', err);
        }
      }

      // Fallback local update
      const list = getLocalData<Household>('mahal_households');
      const idx = list.findIndex((h) => h.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...cleanUpdates };
        saveLocalData('mahal_households', list);
        return list[idx];
      }
      return { ...cleanUpdates, id } as Household;
    },
    delete: async (id: string): Promise<boolean> => {
      const list = getLocalData<Household>('mahal_households');
      const filtered = list.filter((h) => h.id !== id);
      saveLocalData('mahal_households', filtered);

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('households').delete().eq('id', id);
        } catch (err) {
          console.warn('Supabase delete household notice:', err);
        }
      }
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
        try {
          const { data, error } = await supabase.from('members').select('*').eq('id', id).maybeSingle();
          if (!error && data) return data as Member;
        } catch (e) {
          console.warn('Supabase member getById notice:', e);
        }
      }
      return getLocalData<Member>('mahal_members').find((m) => m.id === id) || null;
    },
    getByHousehold: async (householdId: string): Promise<Member[]> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('members')
            .select('*')
            .eq('household_id', householdId);
          if (!error && data) return data as Member[];
        } catch (e) {
          console.warn('Supabase member getByHousehold notice:', e);
        }
      }
      return getLocalData<Member>('mahal_members').filter((m) => m.household_id === householdId);
    },
    getByUserId: async (userId: string): Promise<Member | null> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('members')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();
          if (!error && data) return data as Member;
        } catch (e) {
          console.warn('Supabase member getByUserId notice:', e);
        }
      }
      return getLocalData<Member>('mahal_members').find((m) => m.user_id === userId) || null;
    },
    create: async (member: Omit<Member, 'id' | 'created_at' | 'updated_at'>): Promise<Member> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.from('members').insert([member]).select().single();
          if (!error && data) return data as Member;
        } catch (e) {
          console.warn('Supabase member create notice:', e);
        }
        const { portal_access, portal_status, is_subscription_accountable, ...safePayload } = member as any;
        try {
          const { data, error } = await supabase.from('members').insert([safePayload]).select().single();
          if (!error && data) return { ...data, is_subscription_accountable: member.is_subscription_accountable !== false } as Member;
        } catch (e) {
          console.warn('Supabase member safe create notice:', e);
        }
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
      const cleanUpdates = { ...updates, updated_at: new Date().toISOString() };

      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('members')
            .update(cleanUpdates)
            .eq('id', id)
            .select()
            .maybeSingle();
          if (!error && data) {
            const list = getLocalData<Member>('mahal_members');
            const idx = list.findIndex((m) => m.id === id);
            if (idx !== -1) {
              list[idx] = { ...list[idx], ...cleanUpdates };
              saveLocalData('mahal_members', list);
            }
            return { ...data, ...cleanUpdates } as Member;
          }
        } catch (e) {
          console.warn('Supabase member update notice:', e);
        }

        const { portal_access, portal_status, is_subscription_accountable, ...safeUpdates } = cleanUpdates as any;
        if (Object.keys(safeUpdates).length > 0) {
          try {
            const { data, error } = await supabase
              .from('members')
              .update(safeUpdates)
              .eq('id', id)
              .select()
              .maybeSingle();
            if (!error && data) {
              const list = getLocalData<Member>('mahal_members');
              const idx = list.findIndex((m) => m.id === id);
              if (idx !== -1) {
                list[idx] = { ...list[idx], ...cleanUpdates };
                saveLocalData('mahal_members', list);
              }
              return { ...data, ...cleanUpdates } as Member;
            }
          } catch (err) {
            console.warn('Supabase member safe update notice:', err);
          }
        }
      }

      const list = getLocalData<Member>('mahal_members');
      const idx = list.findIndex((m) => m.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...cleanUpdates };
        saveLocalData('mahal_members', list);
        return list[idx];
      }

      const fallbackMember = { id, ...cleanUpdates } as Member;
      list.push(fallbackMember);
      saveLocalData('mahal_members', list);
      return fallbackMember;
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
    grantPortalAccess: async (
      memberId: string,
      email: string,
      password?: string
    ): Promise<{ member: Member; profile: Profile }> => {
      const cleanEmail = email.trim().toLowerCase();
      const member = await db.members.getById(memberId);
      if (!member) throw new Error('Member record not found');

      let authUserId = member.user_id || 'user-' + Math.random().toString(36).substr(2, 9);

      if (isSupabaseConfigured && supabase) {
        try {
          const { data: authData, error } = await supabase.auth.signUp({
            email: cleanEmail,
            password: password || 'Mahall@12345',
            options: {
              data: {
                name: member.name,
                role: 'member',
                member_id: member.id,
              },
            },
          });
          if (!error && authData.user) {
            authUserId = authData.user.id;
          }
        } catch (authErr) {
          console.warn('Supabase auth signup notice:', authErr);
        }
      }

      const profile: Profile = {
        id: authUserId,
        user_id: authUserId,
        member_id: member.id,
        name: member.name,
        email: cleanEmail,
        phone: member.phone,
        role: 'member',
        language: 'en',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      try {
        await db.profiles.create(profile);
      } catch (e) {}

      const updatedMember = await db.members.update(memberId, {
        user_id: authUserId,
        email: cleanEmail,
        portal_access: true,
        portal_status: 'active',
      });

      return { member: updatedMember, profile };
    },
    updatePortalStatus: async (
      memberId: string,
      status: 'not_granted' | 'pending' | 'active' | 'suspended' | 'revoked'
    ): Promise<Member> => {
      const portal_access = status === 'active' || status === 'pending';
      return await db.members.update(memberId, {
        portal_access,
        portal_status: status,
      });
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

        // Auto-create member_subscriptions records in Supabase for all active members
        try {
          const activeMembers = (await db.members.get()).filter((m) => m.status === 'active');
          if (activeMembers.length > 0) {
            const subInserts = activeMembers.map((m) => ({
              member_id: m.id,
              subscription_year_id: (data as any).id,
              annual_fee: yearData.default_fee,
              previous_arrears: 0,
              total_paid: 0,
              status: 'unpaid',
            }));
            await supabase.from('member_subscriptions').insert(subInserts);
          }
        } catch (subErr) {
          console.warn('Notice auto-generating member subscriptions in Supabase:', subErr);
        }

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
    update: async (id: string, updates: Partial<SubscriptionYear>): Promise<SubscriptionYear> => {
      const cleanUpdates = { ...updates, updated_at: new Date().toISOString() };
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('subscription_years')
          .update(cleanUpdates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data as SubscriptionYear;
      }
      const list = getLocalData<SubscriptionYear>('mahal_years');
      const idx = list.findIndex((y) => y.id === id);
      if (idx === -1) throw new Error('Subscription year not found');
      list[idx] = { ...list[idx], ...cleanUpdates };
      saveLocalData('mahal_years', list);
      return list[idx];
    },
    delete: async (id: string): Promise<boolean> => {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('subscription_years').delete().eq('id', id);
        if (error) throw error;
        return true;
      }
      const list = getLocalData<SubscriptionYear>('mahal_years');
      const filtered = list.filter((y) => y.id !== id);
      saveLocalData('mahal_years', filtered);
      return true;
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
    generateLedger: async (yearId: string): Promise<{
      accountableCount: number;
      createdCount: number;
      existingCount: number;
      skippedCount: number;
    }> => {
      // Fetch target year
      let yearObj: SubscriptionYear | null = null;
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.from('subscription_years').select('*').eq('id', yearId).single();
        yearObj = data as SubscriptionYear;
      } else {
        const yearList = getLocalData<SubscriptionYear>('mahal_years');
        yearObj = yearList.find((y) => y.id === yearId) || null;
      }

      if (!yearObj) throw new Error('Subscription year record not found');

      // Fetch active accountable members
      let activeMembers: Member[] = [];
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.from('members').select('*').eq('status', 'active');
        activeMembers = (data || []).filter((m: any) => m.is_subscription_accountable !== false);
      } else {
        activeMembers = getLocalData<Member>('mahal_members').filter(
          (m) => m.status === 'active' && m.is_subscription_accountable !== false
        );
      }

      // Fetch existing member subscriptions for this year
      let existingSubs: MemberSubscription[] = [];
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.from('member_subscriptions').select('*').eq('subscription_year_id', yearId);
        existingSubs = (data || []) as MemberSubscription[];
      } else {
        existingSubs = getLocalData<MemberSubscription>('mahal_subscriptions').filter(
          (s) => s.subscription_year_id === yearId
        );
      }

      const existingMemberIds = new Set(existingSubs.map((s) => s.member_id));
      let createdCount = 0;
      let existingCount = 0;

      // Fetch all member subscriptions for arrears calculation
      let allSubs: MemberSubscription[] = [];
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.from('member_subscriptions').select('*');
        allSubs = (data || []) as MemberSubscription[];
      } else {
        allSubs = getLocalData<MemberSubscription>('mahal_subscriptions');
      }

      for (const member of activeMembers) {
        if (existingMemberIds.has(member.id)) {
          existingCount++;
          continue;
        }

        const prevBalances = allSubs
          .filter((s) => s.member_id === member.id && s.subscription_year_id !== yearId)
          .reduce((sum, s) => sum + Math.max(0, s.balance), 0);

        const newSubData = {
          member_id: member.id,
          subscription_year_id: yearId,
          annual_fee: yearObj.default_fee,
          previous_arrears: prevBalances,
          total_paid: 0,
          status: 'unpaid' as const,
        };

        if (isSupabaseConfigured && supabase) {
          await supabase.from('member_subscriptions').insert([newSubData]);
        } else {
          const list = getLocalData<MemberSubscription>('mahal_subscriptions');
          const total_due = yearObj.default_fee + prevBalances;
          list.push({
            ...newSubData,
            id: 'sub-' + Math.random().toString(36).substr(2, 9),
            total_due,
            balance: total_due,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          saveLocalData('mahal_subscriptions', list);
        }
        createdCount++;
      }

      return {
        accountableCount: activeMembers.length,
        createdCount,
        existingCount,
        skippedCount: 0,
      };
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
      const cleanPayment = {
        ...payment,
        recorded_by: sanitizeUuid(payment.recorded_by),
      };
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.from('payments').insert([cleanPayment]).select().single();
          if (error) {
            // If foreign key constraint payments_recorded_by_fkey violated, retry with recorded_by: null
            if (error.code === '23503' || error.message?.includes('foreign key')) {
              const { data: retryData, error: retryErr } = await supabase
                .from('payments')
                .insert([{ ...cleanPayment, recorded_by: null }])
                .select()
                .single();
              if (retryErr) throw retryErr;
              return retryData as Payment;
            }
            throw error;
          }
          return data as Payment;
        } catch (err: any) {
          if (err.code === '23503' || err.message?.includes('foreign key')) {
            const { data: retryData, error: retryErr } = await supabase
              .from('payments')
              .insert([{ ...cleanPayment, recorded_by: null }])
              .select()
              .single();
            if (retryErr) throw retryErr;
            return retryData as Payment;
          }
          throw err;
        }
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
      const cleanUpdates = { ...updates };
      if (cleanUpdates.recorded_by) {
        cleanUpdates.recorded_by = sanitizeUuid(cleanUpdates.recorded_by);
      }
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('payments')
            .update(cleanUpdates)
            .eq('id', id)
            .select()
            .single();
          if (error) {
            if (error.code === '23503' || error.message?.includes('foreign key')) {
              const { data: retryData, error: retryErr } = await supabase
                .from('payments')
                .update({ ...cleanUpdates, recorded_by: null })
                .eq('id', id)
                .select()
                .single();
              if (retryErr) throw retryErr;
              return retryData as Payment;
            }
            throw error;
          }
          return data as Payment;
        } catch (err: any) {
          if (err.code === '23503' || err.message?.includes('foreign key')) {
            const { data: retryData, error: retryErr } = await supabase
              .from('payments')
              .update({ ...cleanUpdates, recorded_by: null })
              .eq('id', id)
              .select()
              .single();
            if (retryErr) throw retryErr;
            return retryData as Payment;
          }
          throw err;
        }
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
      const cleanNotifData = {
        ...notifData,
        created_by: sanitizeUuid(notifData.created_by),
      };
      if (isSupabaseConfigured && supabase) {
        const { data: newNotif, error: notifErr } = await supabase
          .from('notifications')
          .insert([cleanNotifData])
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
    getById: async (id: string): Promise<Notification | null> => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('notifications').select('*').eq('id', id).single();
        if (error) throw error;
        return data as Notification;
      }
      return getLocalData<Notification>('mahal_notifications').find((n) => n.id === id) || null;
    },
    update: async (id: string, updates: Partial<Notification>): Promise<Notification> => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('notifications')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data as Notification;
      }
      const list = getLocalData<Notification>('mahal_notifications');
      const idx = list.findIndex((n) => n.id === id);
      if (idx === -1) throw new Error('Notification record not found');
      list[idx] = { ...list[idx], ...updates };
      saveLocalData('mahal_notifications', list);
      return list[idx];
    },
    delete: async (id: string): Promise<boolean> => {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('notifications').delete().eq('id', id);
        if (error) throw error;
        return true;
      }
      const list = getLocalData<Notification>('mahal_notifications');
      const filtered = list.filter((n) => n.id !== id);
      saveLocalData('mahal_notifications', filtered);
      return true;
    },
  },

  // ARREARS
  arrears: {
    get: async (): Promise<ArrearAdjustment[]> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.from('arrears').select('*').order('created_at', { ascending: false });
          if (!error && data) return data as ArrearAdjustment[];
        } catch (e) {
          console.warn('Supabase arrears fetch notice:', e);
        }
      }
      return getLocalData<ArrearAdjustment>('mahal_arrears').sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    getByMember: async (memberId: string): Promise<ArrearAdjustment[]> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.from('arrears').select('*').eq('member_id', memberId).order('created_at', { ascending: false });
          if (!error && data) return data as ArrearAdjustment[];
        } catch (e) {
          console.warn('Supabase arrears getByMember notice:', e);
        }
      }
      return getLocalData<ArrearAdjustment>('mahal_arrears')
        .filter((a) => a.member_id === memberId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    create: async (data: Omit<ArrearAdjustment, 'id' | 'created_at'>): Promise<ArrearAdjustment> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: created, error } = await supabase.from('arrears').insert([data]).select().single();
          if (!error && created) return created as ArrearAdjustment;
        } catch (e) {
          console.warn('Supabase arrears create notice:', e);
        }
      }
      const list = getLocalData<ArrearAdjustment>('mahal_arrears');
      const newRecord: ArrearAdjustment = {
        ...data,
        id: 'arrear-' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
      };
      list.push(newRecord);
      saveLocalData('mahal_arrears', list);
      return newRecord;
    },
  },

  // DEATHS
  deaths: {
    get: async (): Promise<DeathRecord[]> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.from('death_records').select('*').order('date_of_death', { ascending: false });
          if (!error && data) return data as DeathRecord[];
        } catch (e) {
          console.warn('Supabase deaths fetch notice:', e);
        }
      }
      return getLocalData<DeathRecord>('mahal_deaths').sort(
        (a, b) => new Date(b.date_of_death).getTime() - new Date(a.date_of_death).getTime()
      );
    },
    create: async (data: Omit<DeathRecord, 'id' | 'created_at' | 'updated_at'>): Promise<DeathRecord> => {
      const cleanData = {
        deceased_name: data.deceased_name,
        member_id: sanitizeUuid(data.member_id),
        father_or_husband_name: data.father_or_husband_name || null,
        date_of_death: data.date_of_death,
        burial_date: data.burial_date || null,
        burial_time: data.burial_time || null,
        place_of_death: data.place_of_death || null,
        age: data.age ? Number(data.age) : null,
        gender: data.gender || 'male',
        address: data.address || null,
        ward_or_area: data.ward_or_area || null,
        cause_of_death: data.cause_of_death || null,
        medically_certified: data.medically_certified ?? false,
        certifier_name: data.certifier_name || null,
        notes: data.notes || null,
        certificate_url: data.certificate_url || null,
        created_by: sanitizeUuid(data.created_by),
      };
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: created, error } = await supabase.from('death_records').insert([cleanData]).select().single();
          if (!error && created) return created as DeathRecord;
          if (error && (error.code === '23503' || error.message?.includes('foreign key'))) {
            const { data: retryData, error: retryErr } = await supabase
              .from('death_records')
              .insert([{ ...cleanData, member_id: null, created_by: null }])
              .select()
              .single();
            if (!retryErr && retryData) return retryData as DeathRecord;
          }
          if (error) {
            console.error('Supabase deaths insert error:', error);
          }
        } catch (e) {
          console.warn('Supabase deaths create notice:', e);
        }
      }
      const list = getLocalData<DeathRecord>('mahal_deaths');
      const newRecord: DeathRecord = {
        ...cleanData,
        id: 'death-' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      list.push(newRecord);
      saveLocalData('mahal_deaths', list);
      return newRecord;
    },
    update: async (id: string, updates: Partial<DeathRecord>): Promise<DeathRecord> => {
      const cleanUpdates: any = { ...updates, updated_at: new Date().toISOString() };
      if ('member_id' in cleanUpdates) cleanUpdates.member_id = sanitizeUuid(cleanUpdates.member_id);
      if ('created_by' in cleanUpdates) cleanUpdates.created_by = sanitizeUuid(cleanUpdates.created_by);

      if (isSupabaseConfigured && supabase) {
        try {
          const { data: updated, error } = await supabase.from('death_records').update(cleanUpdates).eq('id', id).select().single();
          if (!error && updated) return updated as DeathRecord;
        } catch (e) {
          console.warn('Supabase deaths update notice:', e);
        }
      }
      const list = getLocalData<DeathRecord>('mahal_deaths');
      const idx = list.findIndex((d) => d.id === id);
      if (idx === -1) throw new Error('Death record not found');
      list[idx] = { ...list[idx], ...cleanUpdates };
      saveLocalData('mahal_deaths', list);
      return list[idx];
    },
    delete: async (id: string): Promise<boolean> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { error } = await supabase.from('death_records').delete().eq('id', id);
          if (!error) return true;
        } catch (e) {
          console.warn('Supabase deaths delete notice:', e);
        }
      }
      const list = getLocalData<DeathRecord>('mahal_deaths').filter((d) => d.id !== id);
      saveLocalData('mahal_deaths', list);
      return true;
    },
  },

  // MARRIAGES
  marriages: {
    get: async (): Promise<MarriageRecord[]> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.from('marriage_records').select('*').order('nikah_date', { ascending: false });
          if (!error && data) return data as MarriageRecord[];
        } catch (e) {
          console.warn('Supabase marriages fetch notice:', e);
        }
      }
      return getLocalData<MarriageRecord>('mahal_marriages').sort(
        (a, b) => new Date(b.nikah_date).getTime() - new Date(a.nikah_date).getTime()
      );
    },
    create: async (data: Omit<MarriageRecord, 'id' | 'created_at' | 'updated_at'>): Promise<MarriageRecord> => {
      const cleanData = {
        ...data,
        groom_member_id: sanitizeUuid(data.groom_member_id),
        bride_member_id: sanitizeUuid(data.bride_member_id),
        created_by: sanitizeUuid(data.created_by),
      };
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: created, error } = await supabase.from('marriage_records').insert([cleanData]).select().single();
          if (!error && created) return created as MarriageRecord;
          if (error && (error.code === '23503' || error.message?.includes('foreign key'))) {
            const { data: retryData, error: retryErr } = await supabase
              .from('marriage_records')
              .insert([{ ...cleanData, groom_member_id: null, bride_member_id: null, created_by: null }])
              .select()
              .single();
            if (!retryErr && retryData) return retryData as MarriageRecord;
          }
        } catch (e) {
          console.warn('Supabase marriages create notice:', e);
        }
      }
      const list = getLocalData<MarriageRecord>('mahal_marriages');
      const newRecord: MarriageRecord = {
        ...data,
        id: 'marriage-' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      list.push(newRecord);
      saveLocalData('mahal_marriages', list);
      return newRecord;
    },
    update: async (id: string, updates: Partial<MarriageRecord>): Promise<MarriageRecord> => {
      const cleanUpdates = { ...updates, updated_at: new Date().toISOString() };
      if (cleanUpdates.created_by) cleanUpdates.created_by = sanitizeUuid(cleanUpdates.created_by);
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: updated, error } = await supabase.from('marriage_records').update(cleanUpdates).eq('id', id).select().single();
          if (!error && updated) return updated as MarriageRecord;
        } catch (e) {
          console.warn('Supabase marriages update notice:', e);
        }
      }
      const list = getLocalData<MarriageRecord>('mahal_marriages');
      const idx = list.findIndex((m) => m.id === id);
      if (idx === -1) throw new Error('Marriage record not found');
      list[idx] = { ...list[idx], ...cleanUpdates };
      saveLocalData('mahal_marriages', list);
      return list[idx];
    },
    delete: async (id: string): Promise<boolean> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { error } = await supabase.from('marriage_records').delete().eq('id', id);
          if (!error) return true;
        } catch (e) {
          console.warn('Supabase marriages delete notice:', e);
        }
      }
      const list = getLocalData<MarriageRecord>('mahal_marriages').filter((m) => m.id !== id);
      saveLocalData('mahal_marriages', list);
      return true;
    },
  },

  // DONATION CAMPAIGNS
  donationCampaigns: {
    get: async (): Promise<DonationCampaign[]> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.from('donation_campaigns').select('*').order('created_at', { ascending: false });
          if (!error && data) return data as DonationCampaign[];
        } catch (e) {
          console.warn('Supabase donationCampaigns fetch notice:', e);
        }
      }
      return getLocalData<DonationCampaign>('mahal_campaigns');
    },
    create: async (data: Omit<DonationCampaign, 'id' | 'created_at' | 'updated_at'>): Promise<DonationCampaign> => {
      const cleanData = { ...data, created_by: sanitizeUuid(data.created_by) };
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: created, error } = await supabase.from('donation_campaigns').insert([cleanData]).select().single();
          if (!error && created) return created as DonationCampaign;
        } catch (e) {
          console.warn('Supabase donationCampaigns create notice:', e);
        }
      }
      const list = getLocalData<DonationCampaign>('mahal_campaigns');
      const newRecord: DonationCampaign = {
        ...data,
        id: 'camp-' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      list.push(newRecord);
      saveLocalData('mahal_campaigns', list);
      return newRecord;
    },
    update: async (id: string, updates: Partial<DonationCampaign>): Promise<DonationCampaign> => {
      const cleanUpdates = { ...updates, updated_at: new Date().toISOString() };
      if (cleanUpdates.created_by) cleanUpdates.created_by = sanitizeUuid(cleanUpdates.created_by);
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: updated, error } = await supabase.from('donation_campaigns').update(cleanUpdates).eq('id', id).select().single();
          if (!error && updated) return updated as DonationCampaign;
        } catch (e) {
          console.warn('Supabase donationCampaigns update notice:', e);
        }
      }
      const list = getLocalData<DonationCampaign>('mahal_campaigns');
      const idx = list.findIndex((c) => c.id === id);
      if (idx === -1) throw new Error('Campaign record not found');
      list[idx] = { ...list[idx], ...cleanUpdates };
      saveLocalData('mahal_campaigns', list);
      return list[idx];
    },
    delete: async (id: string): Promise<boolean> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { error } = await supabase.from('donation_campaigns').delete().eq('id', id);
          if (!error) return true;
        } catch (e) {
          console.warn('Supabase donationCampaigns delete notice:', e);
        }
      }
      const list = getLocalData<DonationCampaign>('mahal_campaigns').filter((c) => c.id !== id);
      saveLocalData('mahal_campaigns', list);
      return true;
    },
  },

  // DONATIONS
  donations: {
    get: async (): Promise<Donation[]> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.from('donations').select('*').order('donation_date', { ascending: false });
          if (!error && data) return data as Donation[];
        } catch (e) {
          console.warn('Supabase donations fetch notice:', e);
        }
      }
      return getLocalData<Donation>('mahal_donations').sort(
        (a, b) => new Date(b.donation_date).getTime() - new Date(a.donation_date).getTime()
      );
    },
    create: async (data: Omit<Donation, 'id' | 'created_at' | 'updated_at'>): Promise<Donation> => {
      const cleanData = {
        ...data,
        campaign_id: sanitizeUuid(data.campaign_id),
        donor_member_id: sanitizeUuid(data.donor_member_id),
        recorded_by: sanitizeUuid(data.recorded_by),
      };

      if (isSupabaseConfigured && supabase) {
        // Try full payload first
        const fullPayload: any = {
          donation_type: cleanData.donation_type || 'general',
          campaign_id: cleanData.campaign_id,
          donor_type: cleanData.donor_type || 'external',
          donor_member_id: cleanData.donor_member_id,
          donor_name: cleanData.donor_name || 'Anonymous',
          donor_phone: cleanData.donor_phone,
          donor_email: cleanData.donor_email,
          is_anonymous: cleanData.is_anonymous || false,
          amount: cleanData.amount || 0,
          payment_method: cleanData.payment_method || 'cash',
          donation_date: cleanData.donation_date || new Date().toISOString().split('T')[0],
          receipt_number: cleanData.receipt_number,
          reference_number: cleanData.reference_number,
          notes: cleanData.notes,
          recorded_by: cleanData.recorded_by,
        };

        try {
          const { data: created, error } = await supabase.from('donations').insert([fullPayload]).select().maybeSingle();
          if (!error && created) {
            const result = { ...cleanData, ...created } as Donation;
            const list = getLocalData<Donation>('mahal_donations');
            list.push(result);
            saveLocalData('mahal_donations', list);
            return result;
          }
        } catch (e) {
          console.warn('Supabase donations full insert notice:', e);
        }

        // Retry with base payload if full insert encountered schema mismatch
        const basePayload: any = {
          donor_name: cleanData.donor_name || 'Anonymous',
          amount: cleanData.amount || 0,
          payment_method: cleanData.payment_method || 'cash',
          donation_date: cleanData.donation_date || new Date().toISOString().split('T')[0],
        };
        if (cleanData.donor_phone) basePayload.donor_phone = cleanData.donor_phone;
        if (cleanData.donor_email) basePayload.donor_email = cleanData.donor_email;
        if (cleanData.receipt_number) basePayload.receipt_number = cleanData.receipt_number;
        if (cleanData.reference_number) basePayload.reference_number = cleanData.reference_number;
        if (cleanData.notes) basePayload.notes = cleanData.notes;
        if (cleanData.campaign_id) basePayload.campaign_id = cleanData.campaign_id;
        if (cleanData.donor_member_id) basePayload.donor_member_id = cleanData.donor_member_id;
        if (cleanData.recorded_by) basePayload.recorded_by = cleanData.recorded_by;

        try {
          const { data: created, error } = await supabase.from('donations').insert([basePayload]).select().maybeSingle();
          if (!error && created) {
            const result = { ...cleanData, ...created } as Donation;
            const list = getLocalData<Donation>('mahal_donations');
            list.push(result);
            saveLocalData('mahal_donations', list);
            return result;
          }
        } catch (e) {
          console.warn('Supabase donations base insert notice:', e);
        }
      }

      const list = getLocalData<Donation>('mahal_donations');
      const newRecord: Donation = {
        ...data,
        id: 'don-' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      list.push(newRecord);
      saveLocalData('mahal_donations', list);
      return newRecord;
    },
    update: async (id: string, updates: Partial<Donation>): Promise<Donation> => {
      const cleanUpdates: Partial<Donation> = {
        ...updates,
        updated_at: new Date().toISOString(),
      };
      if (updates.campaign_id !== undefined) cleanUpdates.campaign_id = sanitizeUuid(updates.campaign_id);
      if (updates.donor_member_id !== undefined) cleanUpdates.donor_member_id = sanitizeUuid(updates.donor_member_id);
      if (updates.recorded_by !== undefined) cleanUpdates.recorded_by = sanitizeUuid(updates.recorded_by);

      if (isSupabaseConfigured && supabase) {
        const { donation_type, donor_type, is_anonymous, ...baseUpdates } = cleanUpdates as any;
        if (Object.keys(baseUpdates).length > 0) {
          try {
            const { data: updated, error } = await supabase
              .from('donations')
              .update(baseUpdates)
              .eq('id', id)
              .select()
              .maybeSingle();
            if (!error && updated) {
              const list = getLocalData<Donation>('mahal_donations');
              const idx = list.findIndex((d) => d.id === id);
              if (idx !== -1) {
                list[idx] = { ...list[idx], ...cleanUpdates };
                saveLocalData('mahal_donations', list);
              }
              return { ...updated, ...cleanUpdates } as Donation;
            }
          } catch (e) {
            console.warn('Supabase donations update notice:', e);
          }
        }
      }

      const list = getLocalData<Donation>('mahal_donations');
      const idx = list.findIndex((d) => d.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...cleanUpdates };
        saveLocalData('mahal_donations', list);
        return list[idx];
      }
      const fallbackDonation = { id, ...cleanUpdates } as Donation;
      list.push(fallbackDonation);
      saveLocalData('mahal_donations', list);
      return fallbackDonation;
    },
    delete: async (id: string): Promise<boolean> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { error } = await supabase.from('donations').delete().eq('id', id);
          if (!error) return true;
        } catch (e) {
          console.warn('Supabase donations delete notice:', e);
        }
      }
      const list = getLocalData<Donation>('mahal_donations').filter((d) => d.id !== id);
      saveLocalData('mahal_donations', list);
      return true;
    },
    deleteMultiple: async (ids: string[]): Promise<boolean> => {
      if (ids.length === 0) return true;
      if (isSupabaseConfigured && supabase) {
        try {
          const { error } = await supabase.from('donations').delete().in('id', ids);
          if (!error) return true;
        } catch (e) {
          console.warn('Supabase donations deleteMultiple notice:', e);
        }
      }
      const list = getLocalData<Donation>('mahal_donations').filter((d) => !ids.includes(d.id));
      saveLocalData('mahal_donations', list);
      return true;
    },
  },

  // GALLERY ALBUMS
  galleryAlbums: {
    get: async (): Promise<GalleryAlbum[]> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.from('gallery_albums').select('*').order('event_date', { ascending: false });
          if (!error && data) return data as GalleryAlbum[];
        } catch (e) {
          console.warn('Supabase galleryAlbums fetch notice:', e);
        }
      }
      return getLocalData<GalleryAlbum>('mahal_albums').sort(
        (a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
      );
    },
    create: async (data: Omit<GalleryAlbum, 'id' | 'created_at' | 'updated_at'>): Promise<GalleryAlbum> => {
      const cleanData = {
        ...data,
        related_campaign_id: sanitizeUuid(data.related_campaign_id),
        created_by: sanitizeUuid(data.created_by),
      };
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: created, error } = await supabase.from('gallery_albums').insert([cleanData]).select().single();
          if (!error && created) return created as GalleryAlbum;
          if (error && (error.code === '23503' || error.message?.includes('foreign key'))) {
            const { data: retryData, error: retryErr } = await supabase
              .from('gallery_albums')
              .insert([{ ...cleanData, related_campaign_id: null, created_by: null }])
              .select()
              .single();
            if (!retryErr && retryData) return retryData as GalleryAlbum;
          }
        } catch (e) {
          console.warn('Supabase galleryAlbums create notice:', e);
        }
      }
      const list = getLocalData<GalleryAlbum>('mahal_albums');
      const newRecord: GalleryAlbum = {
        ...data,
        id: 'album-' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      list.push(newRecord);
      saveLocalData('mahal_albums', list);
      return newRecord;
    },
    update: async (id: string, updates: Partial<GalleryAlbum>): Promise<GalleryAlbum> => {
      const cleanUpdates = { ...updates, updated_at: new Date().toISOString() };
      if (cleanUpdates.created_by) cleanUpdates.created_by = sanitizeUuid(cleanUpdates.created_by);
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: updated, error } = await supabase.from('gallery_albums').update(cleanUpdates).eq('id', id).select().single();
          if (!error && updated) return updated as GalleryAlbum;
        } catch (e) {
          console.warn('Supabase galleryAlbums update notice:', e);
        }
      }
      const list = getLocalData<GalleryAlbum>('mahal_albums');
      const idx = list.findIndex((a) => a.id === id);
      if (idx === -1) throw new Error('Album record not found');
      list[idx] = { ...list[idx], ...cleanUpdates };
      saveLocalData('mahal_albums', list);
      return list[idx];
    },
    delete: async (id: string): Promise<boolean> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { error } = await supabase.from('gallery_albums').delete().eq('id', id);
          if (!error) return true;
        } catch (e) {
          console.warn('Supabase galleryAlbums delete notice:', e);
        }
      }
      const list = getLocalData<GalleryAlbum>('mahal_albums').filter((a) => a.id !== id);
      saveLocalData('mahal_albums', list);
      return true;
    },
  },

  // GALLERY IMAGES
  galleryImages: {
    getByAlbum: async (albumId: string): Promise<GalleryImage[]> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.from('gallery_images').select('*').eq('album_id', albumId).order('sort_order', { ascending: true });
          if (!error && data) return data as GalleryImage[];
        } catch (e) {
          console.warn('Supabase galleryImages fetch notice:', e);
        }
      }
      return getLocalData<GalleryImage>('mahal_images')
        .filter((img) => img.album_id === albumId)
        .sort((a, b) => a.sort_order - b.sort_order);
    },
    create: async (data: Omit<GalleryImage, 'id' | 'created_at'>): Promise<GalleryImage> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: created, error } = await supabase.from('gallery_images').insert([data]).select().single();
          if (!error && created) return created as GalleryImage;
        } catch (e) {
          console.warn('Supabase galleryImages create notice:', e);
        }
      }
      const list = getLocalData<GalleryImage>('mahal_images');
      const newRecord: GalleryImage = {
        ...data,
        id: 'img-' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
      };
      list.push(newRecord);
      saveLocalData('mahal_images', list);
      return newRecord;
    },
    delete: async (id: string): Promise<boolean> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { error } = await supabase.from('gallery_images').delete().eq('id', id);
          if (!error) return true;
        } catch (e) {
          console.warn('Supabase galleryImages delete notice:', e);
        }
      }
      const list = getLocalData<GalleryImage>('mahal_images').filter((img) => img.id !== id);
      saveLocalData('mahal_images', list);
      return true;
    },
  },

  // AUDIT LOGS
  auditLogs: {
    log: async (entry: AuditLog): Promise<void> => {
      const cleanEntry = {
        ...entry,
        user_id: sanitizeUuid(entry.user_id),
        entity_id: sanitizeUuid(entry.entity_id),
      };
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('audit_logs').insert([cleanEntry]);
          return;
        } catch (e) {
          console.warn('Supabase audit_logs insert notice:', e);
        }
      }
      const list = getLocalData<AuditLog>('mahal_audit_logs');
      list.push({
        ...cleanEntry,
        id: 'audit-' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
      });
      saveLocalData('mahal_audit_logs', list);
    },
  },
};
