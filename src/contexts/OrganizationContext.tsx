import React, { createContext, useContext, useState, useEffect } from 'react';

export interface OrganizationBranding {
  organizationName: string;
  organizationNameMalayalam: string;
  shortName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  contactEmail: string;
  phone: string;
  website: string;
  address: string;
  registrationNumber: string;
  adminDisplayName: string;
  adminTitle: string;
  defaultLanguage: 'en' | 'ml';
}

interface OrganizationContextProps {
  branding: OrganizationBranding;
  updateBranding: (updates: Partial<OrganizationBranding>) => void;
  getInitials: (name?: string) => string;
}

const DEFAULT_BRANDING: OrganizationBranding = {
  organizationName: 'VM ONE',
  organizationNameMalayalam: 'ഒരുമ · സേവനം · വളർച്ച',
  shortName: 'VM ONE',
  logoUrl: null,
  faviconUrl: null,
  primaryColor: '#01A350',
  secondaryColor: '#0746D3',
  accentColor: '#1FBE68',
  contactEmail: 'contact@vmone.org',
  phone: '+91 98765 43210',
  website: 'https://vmone.org',
  address: 'Vellikkeel Mahallu Organization, Wayanad, Kerala',
  registrationNumber: 'VMONE-2026-REG-88',
  adminDisplayName: 'Muhammed Anas',
  adminTitle: 'Administrator',
  defaultLanguage: 'en',
};

const OrganizationContext = createContext<OrganizationContextProps | undefined>(undefined);

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBrandingState] = useState<OrganizationBranding>(() => {
    try {
      const saved = localStorage.getItem('mahall_organization_branding');
      let loaded = DEFAULT_BRANDING;

      if (saved) {
        const parsed = JSON.parse(saved);
        // Auto-migrate legacy brand parameters
        if (parsed.organizationName === 'Lessa Mahallu Management' || !parsed.organizationName) {
          parsed.organizationName = 'VM ONE';
        }
        if (parsed.organizationNameMalayalam === 'മഹല്ല് പോർട്ടൽ' || !parsed.organizationNameMalayalam) {
          parsed.organizationNameMalayalam = 'ഒരുമ · സേവനം · വളർച്ച';
        }
        if (parsed.primaryColor === '#00966b') {
          parsed.primaryColor = '#01A350';
        }
        if (!parsed.secondaryColor || parsed.secondaryColor === '#047857') {
          parsed.secondaryColor = '#0746D3';
        }
        loaded = { ...DEFAULT_BRANDING, ...parsed };
      }

      // Persist updated branding
      localStorage.setItem('mahall_organization_branding', JSON.stringify(loaded));
      return loaded;
    } catch {
      return DEFAULT_BRANDING;
    }
  });

  // Dynamic Document Title & Favicon Sync
  useEffect(() => {
    if (branding.organizationName) {
      document.title = `${branding.organizationName} • Admin Portal`;
    }

    if (branding.faviconUrl || branding.logoUrl) {
      const link: HTMLLinkElement =
        document.querySelector("link[rel*='icon']") || document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      link.href = branding.faviconUrl || branding.logoUrl!;
      document.getElementsByTagName('head')[0].appendChild(link);
    }
  }, [branding.organizationName, branding.faviconUrl, branding.logoUrl]);

  const updateBranding = (updates: Partial<OrganizationBranding>) => {
    setBrandingState((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem('mahall_organization_branding', JSON.stringify(next));

      // Keep legacy keys synced
      if (updates.organizationName) localStorage.setItem('mahal_setting_name', updates.organizationName);
      if (updates.phone) localStorage.setItem('mahal_setting_phone', updates.phone);
      if (updates.contactEmail) localStorage.setItem('mahal_setting_email', updates.contactEmail);
      if (updates.address) localStorage.setItem('mahal_setting_address', updates.address);
      if (updates.registrationNumber) localStorage.setItem('mahal_setting_reg', updates.registrationNumber);
      if (updates.adminDisplayName) localStorage.setItem('admin_display_name', updates.adminDisplayName);
      if (updates.logoUrl !== undefined) {
        if (updates.logoUrl) localStorage.setItem('mahal_setting_logo', updates.logoUrl);
        else localStorage.removeItem('mahal_setting_logo');
      }

      return next;
    });
  };

  const getInitials = (name?: string): string => {
    const target = name || branding.organizationName || 'Mahallu Central';
    const parts = target.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return target.slice(0, 2).toUpperCase();
  };

  return (
    <OrganizationContext.Provider value={{ branding, updateBranding, getInitials }}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};
