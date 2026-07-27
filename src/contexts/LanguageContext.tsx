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
        const cleanKey = key.replace(/^nav\./i, '').replace(/^common\./i, '');
        return cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1);
      }
    }

    if (typeof current !== 'string') {
      const cleanKey = key.replace(/^nav\./i, '').replace(/^common\./i, '');
      return cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1);
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
