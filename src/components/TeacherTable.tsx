'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getLeaderboard } from '@/lib/session';

const TOPIC_LABELS: Record<string, string> = {
  climate: '🌍 Cambio Climático', animals: '🐾 Derechos Animales',
  cyberbullying: '💻 Ciberacoso', justice: '⚖️ Justicia',
  corruption: '🏛️ Corrupción', euthanasia: '💊 Eutanasia',
  abortion: '🔒 Aborto', deathPenalty: '⚠️ Pena de Muerte',
};

const AVATAR_EMOJI: Record<string, string> = {
  rocket: '🚀', star: '⭐', fox: '🦊', robot: '🤖',
  dragon: '🐉', wizard: '🧙', ninja: '🥷', owl: '🦉',
  koala: '🐨', unicorn: '🦄', alien: '👽', panda: '🐼',
  detective: '🕵️', cat: '🐱', superhero: '🦸', lion: '🦁',
};

function formatDuration(ms: number) {
  if (!ms || isNaN(ms)) return '--';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

interface NormalizedRecord {
  id: string;
  name: string;
  course: string;
  establishment: string;
  avatar: string;
  age: number;
  selectedTopic: string;
  totalAnswers: number;
  correctAnswers: number;
  wrongAnswers: number;
  avgTimeMs: number;
  chatInteractions: number;
  understoodCount: number;
  understandingPct: number;
}

export default function TeacherTable() {
  const t = useTranslations('teacher');
  const [records, setRecords] = useState<NormalizedRecord[]>([]);
  const [sortKey, setSortKey] = useState<keyof NormalizedRecord>('correctAnswers');
  const [sortDesc, setSortDesc] = useState(true);
  const [filterCourse, setFilterCourse] = useState('');
  const [filterEstablishment, setFilterEstablishment] = useState('');
  const [mounted, setMounted] = useState(false);
  const [isSupabase, setIsSupabase] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      // Try to fetch from API (Supabase)
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        if (data.source === 'supabase' && Array.isArray(data.leaderboard)) {
          setIsSupabase(true);
          const normalized: NormalizedRecord[] = data.leaderboard.map((item: any) => ({
            id: item.session_id,
            name: item.name || '',
            course: item.course || '',
            establishment: item.establishment || '',
            avatar: item.avatar || 'rocket',
            age: item.age || 12,
            selectedTopic: item.selected_topic || '',
            totalAnswers: parseInt(item.total_answers) || 0,
            correctAnswers: parseInt(item.correct_answers) || 0,
            wrongAnswers: parseInt(item.wrong_answers) || 0,
            avgTimeMs: parseFloat(item.avg_response_time_ms) || 0,
            chatInteractions: parseInt(item.total_chat_interactions) || 0,
            understoodCount: parseInt(item.understood_count) || 0,
            understandingPct: parseInt(item.understanding_pct) || 0,
          }));
          setRecords(normalized);
          return;
        }
      }
    } catch (err) {
      console.error('[TeacherTable] Error fetching leaderboard API:', err);
    }

    // Fallback: localStorage
    setIsSupabase(false);
    const localData = getLeaderboard();
    const normalizedLocal: NormalizedRecord[] = localData.map((item) => {
      const tot = item.totalAnswers || 0;
      const correct = item.correctAnswers || 0;
      const wrong = item.wrongAnswers || 0;
      const time = item.totalTimeMs || 0;
      const avg = tot > 0 ? time / tot : 0;
      const understood = item.understoodCount || 0;
      const pct = tot > 0 ? Math.round((understood / tot) * 100) : 0;
      return {
        id: item.profile.id,
        name: item.profile.name || '',
        course: item.profile.course || '',
        establishment: item.profile.establishment || '',
        avatar: item.profile.avatar || 'rocket',
        age: item.profile.age || 12,
        selectedTopic: item.profile.selectedTopic || '',
        totalAnswers: tot,
        correctAnswers: correct,
        wrongAnswers: wrong,
        avgTimeMs: avg,
        chatInteractions: item.chatInteractions || 0,
        understoodCount: understood,
        understandingPct: pct,
      };
    });
    setRecords(normalizedLocal);
  };

  if (!mounted) return null;

  const courses = Array.from(new Set(records.map((r) => r.course))).filter(Boolean);
  const establishments = Array.from(new Set(records.map((r) => r.establishment))).filter(Boolean);

  const filtered = records.filter((r) => {
    if (filterCourse && r.course !== filterCourse) return false;
    if (filterEstablishment && r.establishment !== filterEstablishment) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const valA = a[sortKey];
    const valB = b[sortKey];
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortDesc ? valB - valA : valA - valB;
    }
    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
    }
    return 0;
  });

  const handleSort = (key: keyof NormalizedRecord) => {
    if (sortKey === key) setSortDesc(!sortDesc);
    else {
      setSortKey(key);
      setSortDesc(true);
    }
  };

  const handleExportCSV = () => {
    const header = [
      t('student'), t('age'), 'Curso', 'Establecimiento',
      t('topic'), 'T. Resp Promedio', t('dilemmas'), t('correct'), t('wrong'), t('chat'), 'Comprensión (RAG)',
    ].join(',');

    const rows = sorted.map((r) => [
      `"${r.name}"`,
      r.age,
      `"${r.course}"`,
      `"${r.establishment}"`,
      `"${TOPIC_LABELS[r.selectedTopic] || r.selectedTopic || '--'}"`,
      `"${formatDuration(r.avgTimeMs)}"`,
      r.totalAnswers,
      r.correctAnswers,
      r.wrongAnswers,
      r.chatInteractions,
      `"${r.understoodCount} (${r.understandingPct}%)"`,
    ].join(','));

    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edeuetica_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortHeader = ({ label, field }: { label: string; field: keyof NormalizedRecord }) => (
    <th
      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider cursor-pointer select-none group"
      style={{ color: sortKey === field ? 'var(--accent)' : 'var(--text-secondary)' }}
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        <span className="opacity-0 group-hover:opacity-100 transition-opacity">
          {sortKey === field ? (sortDesc ? '↓' : '↑') : '↕'}
        </span>
      </span>
    </th>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Filters + Export */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <select
            value={filterEstablishment}
            onChange={(e) => setFilterEstablishment(e.target.value)}
            className="input-field !w-auto text-sm py-1.5"
          >
            <option value="">Todos los establecimientos</option>
            {establishments.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="input-field !w-auto text-sm py-1.5"
          >
            <option value="">Todos los cursos</option>
            {courses.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {isSupabase && (
            <span className="text-xs px-2.5 py-1 rounded-full font-bold self-center"
              style={{ background: 'rgba(6,214,160,0.15)', color: '#06D6A0', border: '1px solid rgba(6,214,160,0.3)' }}>
              🟢 Supabase Conectado
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {sorted.length} estudiante{sorted.length !== 1 ? 's' : ''}
          </span>
          <button
            id="export-csv"
            onClick={handleExportCSV}
            disabled={sorted.length === 0}
            className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5"
            style={{ opacity: sorted.length === 0 ? 0.5 : 1 }}
          >
            <span>📥</span> {t('export')}
          </button>
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--border)' }}
      >
        {sorted.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">👨‍🎓</div>
            <p style={{ color: 'var(--text-secondary)' }}>{t('noData')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ background: 'var(--surface)' }}>
              <thead style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider w-8"
                    style={{ color: 'var(--text-secondary)' }}>
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider"
                    style={{ color: 'var(--text-secondary)' }}>
                    {t('student')}
                  </th>
                  <SortHeader label={t('age')} field="age" />
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider"
                    style={{ color: 'var(--text-secondary)' }}>
                    {t('topic')}
                  </th>
                  <SortHeader label="T. Promedio" field="avgTimeMs" />
                  <SortHeader label={t('dilemmas')} field="totalAnswers" />
                  <SortHeader label={t('correct')} field="correctAnswers" />
                  <SortHeader label={t('wrong')} field="wrongAnswers" />
                  <SortHeader label={t('chat')} field="chatInteractions" />
                  <SortHeader label="Comprensión" field="understoodCount" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, idx) => {
                  const accuracy = r.totalAnswers > 0
                    ? Math.round((r.correctAnswers / r.totalAnswers) * 100)
                    : 0;
                  return (
                    <tr
                      key={r.id}
                      className="transition-colors"
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: idx % 2 === 0 ? 'var(--surface)' : 'var(--bg-secondary)',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.06)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          idx % 2 === 0 ? 'var(--surface)' : 'var(--bg-secondary)';
                      }}
                    >
                      {/* Rank */}
                      <td className="px-4 py-3 text-sm font-bold"
                        style={{ color: 'var(--text-secondary)' }}>
                        {idx + 1}
                      </td>

                      {/* Student */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{AVATAR_EMOJI[r.avatar] || '👤'}</span>
                          <div>
                            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                              {r.name}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              {r.course} · {r.establishment}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Age */}
                      <td className="px-4 py-3 text-sm font-semibold"
                        style={{ color: 'var(--text-primary)' }}>
                        {r.age}
                        <span className="text-xs ml-1 px-1.5 py-0.5 rounded-full font-bold"
                          style={{
                            background: r.age < 14 ? 'rgba(255,107,53,0.15)' : 'rgba(124,58,237,0.15)',
                            color: r.age < 14 ? '#FF6B35' : '#A78BFA',
                          }}>
                          {r.age < 14 ? 'J' : 'S'}
                        </span>
                      </td>

                      {/* Topic */}
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>
                        {TOPIC_LABELS[r.selectedTopic] || r.selectedTopic || (
                          <span style={{ color: 'var(--text-secondary)' }}>—</span>
                        )}
                      </td>

                      {/* Avg Time */}
                      <td className="px-4 py-3 text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                        {formatDuration(r.avgTimeMs)}
                      </td>

                      {/* Dilemmas */}
                      <td className="px-4 py-3 text-sm font-bold text-center"
                        style={{ color: 'var(--text-primary)' }}>
                        {r.totalAnswers}
                      </td>

                      {/* Correct */}
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-black" style={{ color: '#06D6A0' }}>
                          {r.correctAnswers}
                        </span>
                        {r.totalAnswers > 0 && (
                          <span className="text-xs ml-1" style={{ color: 'var(--text-secondary)' }}>
                            ({accuracy}%)
                          </span>
                        )}
                      </td>

                      {/* Wrong */}
                      <td className="px-4 py-3 text-sm font-bold text-center"
                        style={{ color: '#F72585' }}>
                        {r.wrongAnswers}
                      </td>

                      {/* Chat */}
                      <td className="px-4 py-3 text-sm text-center"
                        style={{ color: 'var(--text-secondary)' }}>
                        {r.chatInteractions}
                      </td>

                      {/* Understood */}
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-black" style={{ color: '#A78BFA' }}>
                          {r.understoodCount}
                        </span>
                        {r.totalAnswers > 0 && (
                          <span className="text-xs ml-1" style={{ color: 'var(--text-secondary)' }}>
                            ({r.understandingPct}%)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
