'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useUserStore } from '@/store/userStore';
import { recordDialogueResult, getCachedDilemma, cacheDilemma } from '@/lib/session';
import ClassifyButtons, { AnswerType } from '@/components/ClassifyButtons';
import Leaderboard from '@/components/Leaderboard';
import SocraticChat, { SocraticResult } from '@/components/SocraticChat';

const AVATAR_EMOJI: Record<string, string> = {
  rocket: '🚀', star: '⭐', fox: '🦊', robot: '🤖',
  dragon: '🐉', wizard: '🧙', ninja: '🥷', owl: '🦉',
  koala: '🐨', unicorn: '🦄', alien: '👽', panda: '🐼',
  detective: '🕵️', cat: '🐱', superhero: '🦸', lion: '🦁',
};

const TOPIC_LABELS: Record<string, string> = {
  climate: '🌍 Cambio Climático', animals: '🐾 Derechos Animales',
  cyberbullying: '💻 Ciberacoso', justice: '⚖️ Justicia',
  corruption: '🏛️ Corrupción', euthanasia: '💊 Eutanasia',
  abortion: '🔒 Aborto', deathPenalty: '⚠️ Pena de Muerte',
};

interface DilemmaData {
  scenario: string;
  question: string;
  correct_answer: AnswerType;
  explanation: string;
  options_hint?: string;
}

const TIMER_SECONDS = 60;

export default function DilemaPage() {
  const t = useTranslations('dilemma');
  const router = useRouter();
  const { profile, theme, seenDilemmas, addSeenDilemma, customApiKey } = useUserStore();

  // ── Dilemma state ─────────────────────────────────────────
  const [dilemma, setDilemma] = useState<DilemmaData | null>(null);
  const [dilemmaId, setDilemmaId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Classification state ──────────────────────────────────
  const [selectedAnswer, setSelectedAnswer] = useState<AnswerType | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  // ── After dialogue ────────────────────────────────────────
  const [dialogueResult, setDialogueResult] = useState<SocraticResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  // ── Timer ─────────────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [timerActive, setTimerActive] = useState(false);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Score ─────────────────────────────────────────────────
  const [dilemmaCount, setDilemmaCount] = useState(0);
  const [score, setScore] = useState(0);
  const [leaderboardRefresh, setLeaderboardRefresh] = useState(0);
  const [mounted, setMounted] = useState(false);
  const hasFetchedRef = useRef(false);

  const isKid = theme === 'kid';

  // ── Fetch dilemma ─────────────────────────────────────────
  const fetchDilemma = useCallback(async () => {
    if (!profile?.selectedTopic) return;
    setIsLoading(true);
    setError(null);
    setSelectedAnswer(null);
    setChatOpen(false);
    setDialogueResult(null);
    setShowResult(false);
    setTimeLeft(TIMER_SECONDS);
    setDilemmaId(undefined);

    const ageGroup = profile.age < 14 ? 'junior' : 'senior';
    const lang = profile.language;

    // Try localStorage cache first (only if it hasn't been seen in this session)
    const cached = getCachedDilemma(profile.selectedTopic, lang, ageGroup, seenDilemmas);
    if (cached) {
      setDilemma(cached as DilemmaData);
      addSeenDilemma((cached as DilemmaData).scenario);
      setIsLoading(false);
      setTimerActive(true);
      startTimeRef.current = Date.now();
      return;
    }

    try {
      const res = await fetch('/api/dilema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: profile.selectedTopic,
          age: profile.age,
          language: lang,
          session_id: profile.id,
          exclude: seenDilemmas,
          custom_api_key: customApiKey,
        }),
      });
      if (!res.ok) throw new Error('Failed to generate dilemma');
      const data = await res.json();
      const loadedDilemma = data.dilemma as DilemmaData;
      setDilemma(loadedDilemma);
      setDilemmaId(data.dilemma_id);
      addSeenDilemma(loadedDilemma.scenario);
      cacheDilemma(profile.selectedTopic, lang, ageGroup, loadedDilemma);
    } catch (err) {
      console.error(err);
      setError('No se pudo generar el dilema. Verifica tu GEMINI_API_KEY.');
    } finally {
      setIsLoading(false);
      setTimerActive(true);
      startTimeRef.current = Date.now();
    }
  }, [profile, seenDilemmas, addSeenDilemma, customApiKey]);

  // ── Timer ─────────────────────────────────────────────────
  useEffect(() => {
    if (!timerActive || chatOpen || showResult) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setTimerActive(false);
          // Time's up — skip to next
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [timerActive, chatOpen, showResult]);

  // ── Mount ─────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    useUserStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (mounted && !profile) {
      router.replace('/registro');
    } else if (mounted && !profile?.selectedTopic) {
      router.replace('/temas');
    } else if (mounted && profile && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchDilemma();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, profile, router]);

  if (!mounted || !profile) return null;

  // ── Handle classification button press ────────────────────
  const handleAnswer = (answer: AnswerType) => {
    if (selectedAnswer || !dilemma) return;
    clearInterval(timerRef.current!);
    setTimerActive(false);
    setSelectedAnswer(answer);
    setChatOpen(true); // Open Socratic chat
  };

  // ── Socratic chat completed ───────────────────────────────
  const handleChatComplete = async (result: SocraticResult) => {
    setChatOpen(false);
    setDialogueResult(result);
    setShowResult(true);

    const elapsed = Date.now() - startTimeRef.current;
    if (result.studentWasCorrect) setScore((s) => s + 1);

    // Record to localStorage + Supabase
    await recordDialogueResult({
      dilemmaId,
      selectedAnswer: selectedAnswer || '',
      isCorrect: result.studentWasCorrect,
      responseTimeMs: elapsed,
      turnCount: result.chatInteractions,
      understood: result.understood,
      dialogueHistory: result.dialogueHistory,
    });

    setLeaderboardRefresh((n) => n + 1);
  };

  // ── Skip (only ages 8-10) ─────────────────────────────────
  const handleSkip = () => {
    setChatOpen(false);
    const elapsed = Date.now() - startTimeRef.current;
    recordDialogueResult({
      dilemmaId,
      selectedAnswer: selectedAnswer || '',
      isCorrect: false,
      responseTimeMs: elapsed,
      turnCount: 0,
      understood: false,
      dialogueHistory: [],
    });
    handleNext();
  };

  const handleNext = () => {
    setDilemmaCount((n) => n + 1);
    fetchDilemma();
  };

  // ── Timer ring ────────────────────────────────────────────
  const timerRatio = timeLeft / TIMER_SECONDS;
  const circumference = 2 * Math.PI * 20;
  const strokeOffset = circumference * (1 - timerRatio);
  const timerColor = timeLeft > 30 ? '#06D6A0' : timeLeft > 15 ? '#FFBE0B' : '#F72585';

  return (
    <div
      className="min-h-screen animated-bg"
      style={{ fontFamily: 'var(--font-family)' }}
    >
      {/* Background glows (teen) */}
      {!isKid && (
        <>
          <div className="fixed top-0 left-0 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
            style={{ background: 'radial-gradient(circle, #7C3AED, transparent)', transform: 'translate(-50%,-50%)' }} />
          <div className="fixed bottom-0 right-0 w-80 h-80 rounded-full opacity-10 blur-3xl pointer-events-none"
            style={{ background: 'radial-gradient(circle, #06B6D4, transparent)', transform: 'translate(50%,50%)' }} />
        </>
      )}

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-20 flex justify-between items-center px-4 py-3 backdrop-blur-sm"
        style={{ borderBottom: '1px solid var(--border)', background: isKid ? 'rgba(255,249,240,0.9)' : 'rgba(10,10,15,0.85)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/temas')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={{ background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            ← Cambiar tema
          </button>
          <button
            onClick={() => router.push('/profesor')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
            style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--accent-3)', border: '1px solid var(--border)' }}
          >
            <span>👨‍🏫</span> <span className="hidden sm:inline">Panel Profesor</span>
          </button>
          <div className="flex items-center gap-1.5">
            <span>{TOPIC_LABELS[profile.selectedTopic!]?.split(' ')[0] || '🎯'}</span>
            <span className="text-sm font-bold hidden sm:inline" style={{ color: 'var(--text-primary)' }}>
              {TOPIC_LABELS[profile.selectedTopic!]?.slice(2) || profile.selectedTopic}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Score */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <span className="text-sm">✅</span>
            <span className="text-sm font-black" style={{ color: '#06D6A0' }}>{score}</span>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>/{dilemmaCount + 1}</span>
          </div>
          {/* User */}
          <div className="flex items-center gap-2">
            <span className="text-xl">{AVATAR_EMOJI[profile.avatar] || '👤'}</span>
            <span className="text-sm font-bold hidden sm:inline" style={{ color: 'var(--text-primary)' }}>
              {profile.name}
            </span>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <div className="flex h-[calc(100vh-57px)]">
        <main className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-5">

          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="spinner" style={{ width: 48, height: 48 }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('loading')}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl p-6 text-center"
              style={{ background: 'rgba(247,37,133,0.1)', border: '1px solid rgba(247,37,133,0.3)' }}>
              <p className="text-base font-bold mb-3" style={{ color: '#F72585' }}>⚠️ {error}</p>
              <button onClick={fetchDilemma} className="btn-primary text-sm">Reintentar</button>
            </div>
          )}

          {/* Dilemma */}
          {!isLoading && !error && dilemma && (
            <>
              {/* Timer + count */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-3 py-1 rounded-full"
                  style={{ background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  Dilema #{dilemmaCount + 1}
                </span>
                {/* Circular Timer — hide when chat is open */}
                {!chatOpen && !showResult && (
                  <div className="flex items-center gap-2">
                    <svg width="52" height="52" viewBox="0 0 52 52">
                      <circle cx="26" cy="26" r="20" fill="none" strokeWidth="3" stroke="var(--border)" />
                      <circle cx="26" cy="26" r="20" fill="none" strokeWidth="3"
                        stroke={timerColor} strokeLinecap="round"
                        strokeDasharray={circumference} strokeDashoffset={strokeOffset}
                        transform="rotate(-90 26 26)"
                        style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
                      />
                      <text x="26" y="31" textAnchor="middle" fontSize="12"
                        fontWeight="bold" fill={timerColor}>{timeLeft}</text>
                    </svg>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('timer')}</span>
                  </div>
                )}
              </div>

              {/* Scenario Card */}
              <div
                className="rounded-2xl p-6 animate-fade-in"
                style={{
                  background: isKid ? '#FFFFFF' : '#1E293B',
                  border: `2px solid ${isKid ? 'rgba(255,107,53,0.3)' : 'rgba(124,58,237,0.3)'}`,
                  boxShadow: isKid ? '0 12px 32px rgba(255, 107, 53, 0.1)' : '0 12px 32px rgba(0, 0, 0, 0.3)',
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">📖</span>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: isKid ? '#FF6B35' : '#A78BFA' }}>
                    Caso de estudio
                  </span>
                </div>
                <p
                  className="leading-relaxed font-medium"
                  style={{
                    color: isKid ? '#1E293B' : '#F8FAFC',
                    fontSize: isKid ? '1.15rem' : '1.05rem',
                    fontFamily: isKid ? 'Nunito, sans-serif' : 'Inter, sans-serif',
                  }}
                >
                  {dilemma.scenario}
                </p>
                {dilemma.options_hint && !selectedAnswer && (
                  <p className="mt-3 text-xs italic" style={{ color: isKid ? '#475569' : '#9CA3AF' }}>
                    💡 {dilemma.options_hint}
                  </p>
                )}
              </div>

              {/* Question */}
              <p
                className="font-extrabold text-center px-4"
                style={{
                  color: isKid ? '#E34F10' : '#A78BFA',
                  fontSize: isKid ? '1.25rem' : '1.15rem',
                  fontFamily: isKid ? 'Nunito, sans-serif' : 'Space Grotesk, sans-serif',
                  textShadow: isKid ? 'none' : '0 2px 10px rgba(124,58,237,0.25)',
                }}
              >
                {dilemma.question}
              </p>

              {/* Classify Buttons — shown when no answer yet or result revealed */}
              {!showResult && (
                <ClassifyButtons
                  onAnswer={handleAnswer}
                  disabled={!!selectedAnswer}
                  selected={selectedAnswer}
                  correctAnswer={showResult ? dilemma.correct_answer : null}
                  revealed={showResult}
                />
              )}

              {/* After Socratic Dialogue — final result card */}
              {showResult && dialogueResult && (
                <div
                  className="rounded-2xl p-6 animate-scale-in"
                  style={{
                    background: dialogueResult.studentWasCorrect
                      ? isKid ? '#ECFDF5' : 'rgba(6,214,160,0.12)'
                      : dialogueResult.understood
                      ? isKid ? '#F5F3FF' : 'rgba(124,58,237,0.12)'
                      : isKid ? '#FFFFFF' : '#1E293B',
                    border: `2px solid ${
                      dialogueResult.studentWasCorrect ? '#06D6A0'
                      : dialogueResult.understood ? '#7C3AED'
                      : 'var(--border)'
                    }`,
                    boxShadow: 'var(--shadow)',
                  }}
                >
                  {/* Badges */}
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span className="text-2xl">
                      {dialogueResult.studentWasCorrect ? '🎉' : dialogueResult.understood ? '💡' : '📚'}
                    </span>
                    <span
                      className="text-base font-black"
                      style={{
                        color: dialogueResult.studentWasCorrect ? '#06D6A0'
                          : dialogueResult.understood ? '#A78BFA'
                          : 'var(--text-secondary)',
                      }}
                    >
                      {dialogueResult.studentWasCorrect
                        ? '¡Clasificación correcta!'
                        : dialogueResult.understood
                        ? '¡Comprendiste el concepto!'
                        : 'Sigue practicando'}
                    </span>
                    {dialogueResult.chatInteractions > 0 && (
                      <span className="ml-auto text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                        💬 {dialogueResult.chatInteractions} turnos
                      </span>
                    )}
                  </div>

                  {/* Explanation from Gemini */}
                  <p className="text-sm leading-relaxed mb-4 font-medium" style={{ color: isKid ? '#1E293B' : '#F8FAFC', fontStyle: 'italic' }}>
                    <span className="font-extrabold not-italic" style={{ color: isKid ? '#FF6B35' : '#A78BFA' }}>{t('explanation')}: </span>
                    {dilemma.explanation}
                  </p>

                  {/* Classification buttons revealed */}
                  <ClassifyButtons
                    onAnswer={() => {}}
                    disabled={true}
                    selected={selectedAnswer}
                    correctAnswer={dilemma.correct_answer}
                    revealed={true}
                  />

                  <button
                    id="next-dilemma"
                    onClick={handleNext}
                    className="btn-primary w-full mt-4"
                    style={{ fontSize: isKid ? '1.05rem' : '0.95rem' }}
                  >
                    {t('next')} →
                  </button>
                </div>
              )}
            </>
          )}
        </main>

        {/* ── Leaderboard Sidebar ── */}
        <aside
          className="hidden lg:flex flex-col w-72 xl:w-80 border-l overflow-hidden"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
        >
          <Leaderboard
            course={profile.course}
            establishment={profile.establishment}
            currentUserId={profile.id}
            refreshTrigger={leaderboardRefresh}
          />
        </aside>
      </div>

      {/* ── Socratic Chat Overlay ── */}
      {dilemma && selectedAnswer && (
        <SocraticChat
          isOpen={chatOpen}
          dilemma={dilemma}
          selectedAnswer={selectedAnswer}
          profile={profile}
          dilemmaId={dilemmaId}
          responseTimeMs={TIMER_SECONDS * 1000 - timeLeft * 1000}
          onComplete={handleChatComplete}
          onSkip={handleSkip}
        />
      )}
    </div>
  );
}
