'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getLeaderboard } from '@/lib/session';
import type { StudentRecord } from '@/lib/session';

const AVATAR_EMOJI: Record<string, string> = {
  rocket: '🚀', star: '⭐', fox: '🦊', robot: '🤖',
  dragon: '🐉', wizard: '🧙', ninja: '🥷', owl: '🦉',
  koala: '🐨', unicorn: '🦄', alien: '👽', panda: '🐼',
  detective: '🕵️', cat: '🐱', superhero: '🦸', lion: '🦁',
};

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

interface LeaderboardProps {
  course: string;
  establishment: string;
  currentUserId: string;
  refreshTrigger: number;
}

export default function Leaderboard({
  course,
  establishment,
  currentUserId,
  refreshTrigger,
}: LeaderboardProps) {
  const t = useTranslations('dilemma');
  const [entries, setEntries] = useState<StudentRecord[]>([]);

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        const res = await fetch(`/api/leaderboard?course=${encodeURIComponent(course)}&establishment=${encodeURIComponent(establishment)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.source === 'supabase' && Array.isArray(data.leaderboard)) {
            const mapped: StudentRecord[] = data.leaderboard.map((item: any) => {
              const tot = parseInt(item.total_answers) || 0;
              const correct = parseInt(item.correct_answers) || 0;
              const wrong = parseInt(item.wrong_answers) || 0;
              const avg = parseFloat(item.avg_response_time_ms) || 0;
              return {
                profile: {
                  id: item.session_id,
                  name: item.name || '',
                  course: item.course || '',
                  establishment: item.establishment || '',
                  avatar: item.avatar || 'rocket',
                  age: item.age || 12,
                  language: 'es', // default placeholder
                  startedAt: new Date().toISOString(),
                },
                totalAnswers: tot,
                correctAnswers: correct,
                wrongAnswers: wrong,
                totalTimeMs: avg * tot, // reverse math for avgTime computation
                chatInteractions: parseInt(item.total_chat_interactions) || 0,
                understoodCount: parseInt(item.understood_count) || 0,
              };
            });
            setEntries(mapped);
            return;
          }
        }
      } catch (err) {
        console.error('[Leaderboard Component] API fetch error:', err);
      }

      // LocalStorage Fallback
      const all = getLeaderboard();
      const filtered = all
        .filter(
          (r) =>
            r.profile.course === course &&
            r.profile.establishment === establishment
        )
        .sort((a, b) => {
          if (b.correctAnswers !== a.correctAnswers)
            return b.correctAnswers - a.correctAnswers;
          const avgA = a.totalAnswers > 0 ? a.totalTimeMs / a.totalAnswers : Infinity;
          const avgB = b.totalAnswers > 0 ? b.totalTimeMs / b.totalAnswers : Infinity;
          return avgA - avgB;
        });
      setEntries(filtered);
    }

    loadLeaderboard();
  }, [course, establishment, refreshTrigger]);

  const formatTime = (ms: number) => {
    if (ms === 0) return '--';
    const s = Math.round(ms / 1000);
    return `${s}s`;
  };

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col h-full"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        maxHeight: '100%',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{
          background: 'linear-gradient(135deg, var(--accent), #4F46E5)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span className="text-lg">🏆</span>
        <h3 className="font-black text-white text-sm uppercase tracking-wider">
          {t('leaderboard')}
        </h3>
      </div>

      {/* Column headers */}
      <div
        className="grid grid-cols-12 gap-1 px-3 py-2 text-xs font-bold uppercase tracking-wider"
        style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}
      >
        <span className="col-span-1">{t('rank')}</span>
        <span className="col-span-6">{t('player')}</span>
        <span className="col-span-3 text-center">{t('score')}</span>
        <span className="col-span-2 text-right">{t('time')}</span>
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {entries.length === 0 ? (
          <div
            className="text-center py-8 text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            <div className="text-3xl mb-2">👤</div>
            <p>Sé el primero en responder</p>
          </div>
        ) : (
          entries.map((entry, index) => {
            const isCurrentUser = entry.profile.id === currentUserId;
            const avgTime =
              entry.totalAnswers > 0
                ? entry.totalTimeMs / entry.totalAnswers
                : 0;

            return (
              <div
                key={entry.profile.id}
                className={`leaderboard-row ${
                  index === 0
                    ? 'rank-1'
                    : index === 1
                    ? 'rank-2'
                    : index === 2
                    ? 'rank-3'
                    : ''
                }`}
                style={{
                  outline: isCurrentUser
                    ? '2px solid var(--accent)'
                    : 'none',
                  outlineOffset: '1px',
                }}
              >
                {/* Rank */}
                <div className="col-span-1 w-6 text-center flex-shrink-0">
                  {index < 3 ? (
                    <span className="text-base">{RANK_MEDALS[index]}</span>
                  ) : (
                    <span
                      className="text-xs font-bold"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {index + 1}
                    </span>
                  )}
                </div>

                {/* Avatar + Name */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="text-base flex-shrink-0">
                    {AVATAR_EMOJI[entry.profile.avatar] || '👤'}
                  </span>
                  <div className="min-w-0">
                    <p
                      className="text-xs font-bold truncate"
                      style={{
                        color: isCurrentUser ? 'var(--accent)' : 'var(--text-primary)',
                      }}
                    >
                      {entry.profile.name}
                      {isCurrentUser && (
                        <span className="ml-1 text-xs opacity-70">(tú)</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Score */}
                <div className="flex flex-col items-center flex-shrink-0 w-10">
                  <span
                    className="text-sm font-black"
                    style={{ color: '#06D6A0' }}
                  >
                    {entry.correctAnswers}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    /{entry.totalAnswers}
                  </span>
                </div>

                {/* Avg Time */}
                <div
                  className="text-xs font-semibold flex-shrink-0 w-8 text-right"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {formatTime(avgTime)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {entries.length > 0 && (
        <div
          className="px-3 py-2 text-xs text-center"
          style={{
            color: 'var(--text-secondary)',
            borderTop: '1px solid var(--border)',
          }}
        >
          📡 {entries.length} estudiante{entries.length !== 1 ? 's' : ''} en {course}
        </div>
      )}
    </div>
  );
}
