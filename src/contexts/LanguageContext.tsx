import React, { createContext, useContext, useState } from 'react';
import en from '../locales/en.json';
import ml from '../locales/ml.json';

type Language = 'en' | 'ml';


interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
}

const translations: Record<Language, any> = { en, ml };

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('mahal_language');
    return (saved === 'en' || saved === 'ml' ? saved : 'en') as Language;
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('mahal_language', lang);
  };

  const formatFallbackKey = (rawKey: string): string => {
    const overrides: Record<string, string> = {
      'Household.householdsTitle': 'Households',
      'Household.addHousehold': 'Add Household',
      'Member.membersTitle': 'Members',
      'Member.addMember': 'Add Member',
      'Subscription.subscriptionTitle': 'Subscriptions',
      'Payment.paymentsTitle': 'Payments',
      'Notifications.notificationsTitle': 'Notifications',
      'Reports.reportsTitle': 'Reports',
    };
    if (overrides[rawKey]) return overrides[rawKey];

    const lastPart = rawKey.includes('.') ? rawKey.split('.').pop() || rawKey : rawKey;
    let formatted = lastPart.replace(/([A-Z])/g, ' $1').trim();
    formatted = formatted.replace(/\s*Title$/i, '');
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const t = (key: string, variables?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let current: any = translations[language];
    
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        // Fallback to English if key is missing in Malayalam
        if (language === 'ml') {
          let enCurrent: any = translations['en'];
          for (const ek of keys) {
            if (enCurrent && typeof enCurrent === 'object' && ek in enCurrent) {
              enCurrent = enCurrent[ek];
            } else {
              enCurrent = null;
              break;
            }
          }
          if (typeof enCurrent === 'string') {
            current = enCurrent;
            break;
          }
        }
        return formatFallbackKey(key);
      }
    }

    if (typeof current !== 'string') {
      return formatFallbackKey(key);
    }

    let text = current;
    if (variables) {
      Object.entries(variables).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
export type { Language };
