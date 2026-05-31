'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useUserStore } from '@/store/userStore';
import { saveSession } from '@/lib/session';
import AvatarPicker from '@/components/AvatarPicker';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import type { AppLanguage } from '@/store/userStore';

const PARTICLES_KID = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  emoji: ['⭐', '🌟', '✨', '💫', '🎮', '🎯', '🔮', '🌈'][i % 8],
  size: 20 + Math.random() * 20,
  left: `${Math.random() * 90 + 5}%`,
  top: `${Math.random() * 80 + 10}%`,
  delay: `${Math.random() * 3}s`,
  duration: `${3 + Math.random() * 4}s`,
}));

export default function RegistroPage() {
  const t = useTranslations('register');
  const router = useRouter();
  const { setProfile, setTheme, theme, language } = useUserStore();

  const [form, setForm] = useState({
    name: '',
    establishment: '',
    course: '',
    age: '',
    avatar: 'rocket',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewAge, setPreviewAge] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    useUserStore.persist.rehydrate();
  }, []);

  const handleAgeChange = (val: string) => {
    setForm(prev => ({ ...prev, age: val }));
    const num = parseInt(val);
    if (!isNaN(num) && num >= 8 && num <= 18) {
      setPreviewAge(num);
      setTheme(num);
    } else {
      setPreviewAge(null);
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = t('requiredError');
    if (!form.establishment.trim()) errs.establishment = t('requiredError');
    if (!form.course.trim()) errs.course = t('requiredError');
    const age = parseInt(form.age);
    if (!form.age || isNaN(age) || age < 8 || age > 18)
      errs.age = t('ageError');
    if (!form.avatar) errs.avatar = t('requiredError');
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setIsSubmitting(true);
    try {
      const age = parseInt(form.age);
      const profile = await saveSession({
        name: form.name.trim(),
        establishment: form.establishment.trim(),
        course: form.course.trim(),
        age,
        avatar: form.avatar,
        language,
      });
      setProfile({
        ...profile,
        language: language as AppLanguage,
        selectedTopic: null,
      });
      router.push('/temas');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isKid = previewAge !== null ? previewAge < 14 : false;
  const currentTheme = theme || (isKid ? 'kid' : 'teen');

  if (!mounted) return null;

  return (
    <div
      className="min-h-screen animated-bg relative overflow-hidden flex flex-col"
      style={{ fontFamily: 'var(--font-family)' }}
    >
      {/* Floating particles for kid theme */}
      {isKid &&
        PARTICLES_KID.map((p) => (
          <div
            key={p.id}
            className="absolute pointer-events-none select-none z-0"
            style={{
              left: p.left,
              top: p.top,
              fontSize: `${p.size}px`,
              animationName: 'float',
              animationDuration: p.duration,
              animationDelay: p.delay,
              animationIterationCount: 'infinite',
              animationTimingFunction: 'ease-in-out',
              opacity: 0.6,
            }}
          >
            {p.emoji}
          </div>
        ))}

      {/* Glowing orbs for teen theme */}
      {!isKid && (
        <>
          <div
            className="absolute top-20 left-10 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none"
            style={{ background: 'radial-gradient(circle, #7C3AED, transparent)' }}
          />
          <div
            className="absolute bottom-20 right-10 w-80 h-80 rounded-full opacity-15 blur-3xl pointer-events-none"
            style={{ background: 'radial-gradient(circle, #06B6D4, transparent)' }}
          />
        </>
      )}

      {/* Header */}
      <header className="relative z-10 flex justify-between items-center px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{isKid ? '🎮' : '⚡'}</span>
          <span
            className="text-xl font-black gradient-text"
            style={{ fontFamily: isKid ? 'Nunito, sans-serif' : 'Space Grotesk, sans-serif' }}
          >
            EduÉtica
          </span>
        </div>
        <LanguageSwitcher />
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div
          className="w-full max-w-lg animate-slide-up"
          style={{
            background: isKid
              ? 'rgba(255,255,255,0.9)'
              : 'rgba(17, 24, 39, 0.85)',
            backdropFilter: 'blur(20px)',
            borderRadius: isKid ? '28px' : '16px',
            border: isKid
              ? '3px solid rgba(255,107,53,0.25)'
              : '1px solid rgba(124,58,237,0.3)',
            boxShadow: isKid
              ? '0 20px 60px rgba(255,107,53,0.2), 0 0 0 1px rgba(255,255,255,0.5)'
              : '0 20px 60px rgba(124,58,237,0.25)',
            padding: '2rem',
          }}
        >
          {/* Title */}
          <div className="text-center mb-6">
            {isKid ? (
              <>
                <div className="text-5xl mb-2 animate-bounce-slow">🎯</div>
                <h1
                  className="text-3xl font-black mb-1"
                  style={{ color: '#FF6B35', fontFamily: 'Nunito, sans-serif' }}
                >
                  {t('title')}
                </h1>
                <p className="text-sm" style={{ color: '#666' }}>
                  {t('subtitle')}
                </p>
              </>
            ) : (
              <>
                <div className="mb-3">
                  <span
                    className="text-3xl font-black gradient-text"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    {t('title')}
                  </span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {t('subtitle')}
                </p>
              </>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-bold mb-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t('nameLabel')}
              </label>
              <input
                id="name"
                type="text"
                className="input-field"
                placeholder={t('namePlaceholder')}
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                maxLength={50}
              />
              {errors.name && (
                <p className="text-xs mt-1" style={{ color: '#F72585' }}>
                  {errors.name}
                </p>
              )}
            </div>

            {/* Establishment + Course */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="establishment"
                  className="block text-sm font-bold mb-1.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {t('establishmentLabel')}
                </label>
                <input
                  id="establishment"
                  type="text"
                  className="input-field"
                  placeholder={t('establishmentPlaceholder')}
                  value={form.establishment}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, establishment: e.target.value }))
                  }
                  maxLength={60}
                />
                {errors.establishment && (
                  <p className="text-xs mt-1" style={{ color: '#F72585' }}>
                    {errors.establishment}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="course"
                  className="block text-sm font-bold mb-1.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {t('courseLabel')}
                </label>
                <input
                  id="course"
                  type="text"
                  className="input-field"
                  placeholder={t('coursePlaceholder')}
                  value={form.course}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, course: e.target.value }))
                  }
                  maxLength={30}
                />
                {errors.course && (
                  <p className="text-xs mt-1" style={{ color: '#F72585' }}>
                    {errors.course}
                  </p>
                )}
              </div>
            </div>

            {/* Age — CRITICAL: triggers theme change */}
            <div>
              <label
                htmlFor="age"
                className="block text-sm font-bold mb-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t('ageLabel')}
                {previewAge !== null && (
                  <span
                    className="ml-2 text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{
                      background: isKid ? '#FF6B35' : '#7C3AED',
                      color: 'white',
                    }}
                  >
                    {isKid ? '🎮 Modo Joven' : '⚡ Modo Pro'}
                  </span>
                )}
              </label>
              <input
                id="age"
                type="number"
                className="input-field"
                placeholder={t('agePlaceholder')}
                value={form.age}
                onChange={(e) => handleAgeChange(e.target.value)}
                min={8}
                max={18}
              />
              {errors.age && (
                <p className="text-xs mt-1" style={{ color: '#F72585' }}>
                  {errors.age}
                </p>
              )}
            </div>

            {/* Avatar Picker */}
            <AvatarPicker
              selected={form.avatar}
              onSelect={(id) => setForm((p) => ({ ...p, avatar: id }))}
              theme={currentTheme}
            />
            {errors.avatar && (
              <p className="text-xs" style={{ color: '#F72585' }}>
                {errors.avatar}
              </p>
            )}

            {/* Submit */}
            <button
              id="submit-register"
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full text-center mt-2"
              style={{
                fontSize: isKid ? '1.1rem' : '1rem',
                padding: '14px 28px',
                borderRadius: isKid ? '16px' : '10px',
                fontFamily: isKid ? 'Nunito, sans-serif' : 'Inter, sans-serif',
              }}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="spinner" style={{ width: 20, height: 20 }} />
                  {t('submitButton')}
                </span>
              ) : (
                t('submitButton')
              )}
            </button>
            
            {/* Teacher Dashboard Shortcut */}
            <div className="text-center mt-6 pt-4 border-t" style={{ borderColor: isKid ? 'rgba(255,107,53,0.15)' : 'rgba(255,255,255,0.08)' }}>
              <button
                type="button"
                onClick={() => router.push('/profesor')}
                className="transition-all hover:scale-102 active:scale-98 font-bold flex items-center justify-center gap-2 mx-auto"
                style={{
                  background: isKid ? 'rgba(255,107,53,0.08)' : 'rgba(124,58,237,0.12)',
                  color: isKid ? '#FF6B35' : '#A78BFA',
                  border: `1.5px dashed ${isKid ? '#FF6B35' : '#7C3AED'}`,
                  padding: '10px 24px',
                  borderRadius: isKid ? '16px' : '10px',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                }}
              >
                <span>👨‍🏫</span> Portal de Docentes (Acceso Profesor)
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
