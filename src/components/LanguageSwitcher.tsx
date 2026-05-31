'use client';

import { useUserStore } from '@/store/userStore';
import type { AppLanguage } from '@/store/userStore';

const LANGUAGES: { code: AppLanguage; flag: string; label: string }[] = [
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
];

export default function LanguageSwitcher() {
  const { language, setLanguage } = useUserStore();

  const handleChange = (lang: AppLanguage) => {
    setLanguage(lang);
    // Set cookie for next-intl server-side detection
    document.cookie = `NEXT_LOCALE=${lang}; path=/; max-age=31536000`;
    // Reload to apply server-side translations
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl" 
         style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          onClick={() => handleChange(lang.code)}
          title={lang.label}
          className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200"
          style={{
            background: language === lang.code ? 'var(--accent)' : 'transparent',
            color: language === lang.code ? 'white' : 'var(--text-secondary)',
          }}
        >
          <span className="text-base">{lang.flag}</span>
          <span className="hidden sm:inline text-xs">{lang.code.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
}
