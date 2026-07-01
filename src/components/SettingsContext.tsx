'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface PublicSettings {
  brand_name: string;
  brand_tagline: string;
  location_address: string;
  location_map_url: string;
  contact_phone1: string;
  contact_phone2: string;
  contact_email: string;
  contact_facebook: string;
  contact_instagram: string;
  contact_tiktok: string;
  contact_whatsapp: string;
}

const defaults: PublicSettings = {
  brand_name: 'El Prince Bajaj',
  brand_tagline: '',
  location_address: '35JH+PC مركز أوسيم',
  location_map_url: 'https://maps.app.goo.gl/fh1AgzDpB6K87iAs5',
  contact_phone1: '0122 137 0120',
  contact_phone2: '0155 123 3908',
  contact_email: '',
  contact_facebook: 'https://www.facebook.com/elprince.bajaj',
  contact_instagram: 'https://www.instagram.com/elprincebajaj',
  contact_tiktok: 'https://www.tiktok.com/@elprince.bajajj',
  contact_whatsapp: '201221370120',
};

const SettingsContext = createContext<PublicSettings>(defaults);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PublicSettings>(defaults);

  useEffect(() => {
    fetch('/api/v1/public/settings/')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data?.settings) {
          setSettings({ ...defaults, ...res.data.settings });
        }
      })
      .catch((err) => {
        console.error('[SettingsContext] Failed to load public settings', err);
      });
  }, []);

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}

export function usePublicSettings() {
  return useContext(SettingsContext);
}
