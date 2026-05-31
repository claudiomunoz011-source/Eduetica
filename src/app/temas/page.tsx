'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useUserStore } from '@/store/userStore';
import { updateSessionTopic } from '@/lib/session';

interface Topic {
  id: string;
  key: string;
  emoji: string;
  minAge: number;
  gradient: string;
  borderColor: string;
}

const TOPICS: Topic[] = [
  { id: 'climate',      key: 'climate',      emoji: '🌍', minAge: 8,  gradient: 'from-green-500 to-teal-400',    borderColor: '#06D6A0' },
  { id: 'animals',      key: 'animals',      emoji: '🐾', minAge: 8,  gradient: 'from-orange-400 to-amber-300',  borderColor: '#FFBE0B' },
  { id: 'cyberbullying',key: 'cyberbullying',emoji: '💻', minAge: 8,  gradient: 'from-blue-500 to-cyan-400',     borderColor: '#06B6D4' },
  { id: 'justice',      key: 'justice',      emoji: '⚖️', minAge: 8,  gradient: 'from-purple-500 to-indigo-400', borderColor: '#7C3AED' },
  { id: 'corruption',   key: 'corruption',   emoji: '🏛️', minAge: 14, gradient: 'from-red-500 to-rose-400',      borderColor: '#F43F5E' },
  { id: 'euthanasia',   key: 'euthanasia',   emoji: '💊', minAge: 14, gradient: 'from-slate-500 to-gray-400',    borderColor: '#9CA3AF' },
  { id: 'abortion',     key: 'abortion',     emoji: '🔒', minAge: 14, gradient: 'from-pink-600 to-rose-500',     borderColor: '#F72585' },
  { id: 'deathPenalty', key: 'deathPenalty', emoji: '⚠️', minAge: 14, gradient: 'from-gray-700 to-gray-600',    borderColor: '#6B7280' },
];

const AVATAR_EMOJI: Record<string, string> = {
  rocket: '🚀', star: '⭐', fox: '🦊', robot: '🤖',
  dragon: '🐉', wizard: '🧙', ninja: '🥷', owl: '🦉',
  koala: '🐨', unicorn: '🦄', alien: '👽', panda: '🐼',
  detective: '🕵️', cat: '🐱', superhero: '🦸', lion: '🦁',
};

export default function TemasPage() {
  const t = useTranslations('topics');
  const router = useRouter();
  const { profile, theme, setSelectedTopic } = useUserStore();
  const [mounted, setMounted] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    useUserStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (mounted && !profile) {
      router.replace('/registro');
    }
  }, [mounted, profile, router]);

  if (!mounted || !profile) return null;

  const userAge = profile.age;
  const isKid = theme === 'kid';

  const handleSelect = async (topic: Topic) => {
    if (topic.minAge > userAge) return;
    setSelectingId(topic.id);
    setSelectedTopic(topic.id);
    updateSessionTopic(topic.id);
    setTimeout(() => {
      router.push('/dilema');
    }, 400);
  };

  return (
    <div
      className="min-h-screen animated-bg relative overflow-hidden"
      style={{ fontFamily: 'var(--font-family)' }}
    >
      {/* Background decoration */}
      {!isKid && (
        <>
          <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
            style={{ background: 'radial-gradient(circle, #7C3AED, transparent)', transform: 'translate(-30%, -30%)' }} />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-10 blur-3xl pointer-events-none"
            style={{ background: 'radial-gradient(circle, #06B6D4, transparent)', transform: 'translate(30%, 30%)' }} />
        </>
      )}

      {/* Header */}
      <header className="relative z-10 flex justify-between items-center px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/registro')}
            className="text-sm font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={{ background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            ← Volver
          </button>
          <button
            onClick={() => router.push('/profesor')}
            className="text-sm font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
            style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--accent-3)', border: '1px solid var(--border)' }}
          >
            <span>👨‍🏫</span> <span className="hidden sm:inline">Panel Profesor</span>
          </button>
          <span className="text-lg font-black gradient-text">
            {isKid ? '🎮 ' : '⚡ '}EduÉtica
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <span className="text-xl">{AVATAR_EMOJI[profile.avatar] || '👤'}</span>
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {profile.name}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: isKid ? 'rgba(255,107,53,0.2)' : 'rgba(124,58,237,0.2)', color: isKid ? '#FF6B35' : '#A78BFA' }}>
              {profile.age}y
            </span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-10 animate-fade-in">
          {isKid ? (
            <>
              <div className="text-5xl mb-3">🧩</div>
              <h1 className="text-3xl font-black mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'Nunito, sans-serif' }}>
                {t('title')}
              </h1>
              <p className="text-base" style={{ color: 'var(--text-secondary)' }}>{t('subtitle')}</p>
            </>
          ) : (
            <>
              <h1 className="text-4xl font-black mb-2 gradient-text" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {t('title')}
              </h1>
              <p className="text-base" style={{ color: 'var(--text-secondary)' }}>{t('subtitle')}</p>
            </>
          )}
        </div>

        {/* Topic Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TOPICS.map((topic, i) => {
            const isLocked = topic.minAge > userAge;
            const isSelecting = selectingId === topic.id;
            const nameKey = topic.key as keyof ReturnType<typeof t>;

            return (
              <div
                key={topic.id}
                onClick={() => !isLocked && handleSelect(topic)}
                onMouseEnter={() => !isLocked && setHoveredId(topic.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="relative rounded-2xl overflow-hidden transition-all duration-300"
                style={{
                  animationDelay: `${i * 0.08}s`,
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  transform: hoveredId === topic.id ? 'translateY(-8px) scale(1.02)' : 'none',
                  boxShadow: hoveredId === topic.id
                    ? `0 20px 40px ${topic.borderColor}40`
                    : isSelecting
                    ? `0 0 30px ${topic.borderColor}80`
                    : 'none',
                  border: `2px solid ${isLocked ? 'var(--border)' : hoveredId === topic.id ? topic.borderColor : 'var(--border)'}`,
                  background: isLocked
                    ? 'var(--surface)'
                    : isKid
                    ? 'rgba(255,255,255,0.9)'
                    : 'var(--card-bg)',
                  opacity: isLocked ? 0.55 : 1,
                  minHeight: '200px',
                }}
              >
                {/* Color band at top */}
                <div
                  className={`h-1.5 w-full bg-gradient-to-r ${topic.gradient}`}
                  style={{ opacity: isLocked ? 0.4 : 1 }}
                />

                <div className="p-5 flex flex-col h-full" style={{ minHeight: '190px' }}>
                  {/* Emoji */}
                  <div
                    className="text-4xl mb-3"
                    style={{
                      filter: isLocked ? 'grayscale(1)' : 'none',
                      animation: hoveredId === topic.id && !isLocked ? 'bounce 0.6s ease' : 'none',
                    }}
                  >
                    {isLocked ? '🔒' : topic.emoji}
                  </div>

                  {/* Title */}
                  <h3
                    className="text-base font-extrabold mb-1.5"
                    style={{
                      color: isLocked ? 'var(--text-secondary)' : 'var(--text-primary)',
                      fontFamily: isKid ? 'Nunito, sans-serif' : 'Space Grotesk, sans-serif',
                    }}
                  >
                    {(t as unknown as (key: string) => string)(`${topic.key}.name`)}
                  </h3>

                  {/* Description */}
                  <p
                    className="text-xs leading-relaxed flex-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {isLocked
                      ? t('lockedAge')
                      : (t as unknown as (key: string) => string)(`${topic.key}.desc`)}
                  </p>

                  {/* Lock badge */}
                  {isLocked && (
                    <div
                      className="mt-3 text-xs px-2 py-1 rounded-lg font-bold text-center"
                      style={{ background: 'rgba(156,163,175,0.2)', color: 'var(--text-secondary)' }}
                    >
                      {t('locked')}
                    </div>
                  )}

                  {/* Select indicator */}
                  {isSelecting && (
                    <div className="mt-3 flex items-center justify-center gap-1.5">
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: topic.borderColor, animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: topic.borderColor, animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: topic.borderColor, animationDelay: '300ms' }} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
