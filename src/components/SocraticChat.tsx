'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { AnswerType } from '@/components/ClassifyButtons';
import type { UserProfile } from '@/lib/session';
import { useUserStore } from '@/store/userStore';

// ---- Types ------------------------------------------------

interface DilemmaData {
  scenario: string;
  question: string;
  correct_answer: AnswerType;
  explanation: string;
  options_hint?: string;
}

interface ChatMessage {
  role: 'tutor' | 'student';
  message: string;
  turn_number?: number;
  timestamp: string;
}

export interface SocraticResult {
  understood: boolean;
  studentWasCorrect: boolean;
  correctAnswer: AnswerType;
  turnCount: number;
  chatInteractions: number;
  dialogueHistory: ChatMessage[];
}

interface SocraticChatProps {
  isOpen: boolean;
  dilemma: DilemmaData;
  selectedAnswer: AnswerType;
  profile: UserProfile;
  dilemmaId?: string;
  responseTimeMs: number;
  onComplete: (result: SocraticResult) => void;
  onSkip: () => void;
}

// ---- Avatar mapping ----------------------------------------

const AVATAR_EMOJI: Record<string, string> = {
  rocket: '🚀', star: '⭐', fox: '🦊', robot: '🤖',
  dragon: '🐉', wizard: '🧙', ninja: '🥷', owl: '🦉',
  koala: '🐨', unicorn: '🦄', alien: '👽', panda: '🐼',
  detective: '🕵️', cat: '🐱', superhero: '🦸', lion: '🦁',
};

const ANSWER_LABELS: Record<string, string> = {
  moral: '🟢 Moral', inmoral: '🔴 Inmoral', amoral: '⚪ Amoral',
  negligente: '😴 Negligencia', ignorancia: '🟡 Ignorancia Vencible',
};

const ANSWER_COLORS: Record<string, string> = {
  moral: '#06D6A0', inmoral: '#F72585', amoral: '#9CA3AF',
  negligente: '#FFBE0B', ignorancia: '#A78BFA',
};

// ---- Component ---------------------------------------------

export default function SocraticChat({
  isOpen,
  dilemma,
  selectedAnswer,
  profile,
  dilemmaId,
  responseTimeMs,
  onComplete,
  onSkip,
}: SocraticChatProps) {
  const t = useTranslations('dilemma');
  const { customApiKey } = useUserStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [turnNumber, setTurnNumber] = useState(0); // 0 = not started
  const [isLoading, setIsLoading] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [finalResult, setFinalResult] = useState<SocraticResult | null>(null);
  const [chatStarted, setChatStarted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const canSkip = profile.age >= 8 && profile.age <= 10;
  const isKid = profile.age < 14;

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-start dialogue when opened
  useEffect(() => {
    if (isOpen && !chatStarted) {
      setChatStarted(true);
      startDialogue();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Reset when a new dilemma is opened
  useEffect(() => {
    if (isOpen) {
      setMessages([]);
      setInputValue('');
      setTurnNumber(0);
      setIsLoading(false);
      setIsFinished(false);
      setFinalResult(null);
      setChatStarted(false);
    }
  }, [dilemma.scenario]); // Reset when scenario changes

  const addMessage = (msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  };

  // ── Start: Tutor sends first Socratic question ────────────
  const startDialogue = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: profile.id,
          dilemma_id: dilemmaId,
          topic: profile.selectedTopic,
          age: profile.age,
          language: profile.language,
          selected_answer: selectedAnswer,
          correct_answer: dilemma.correct_answer,
          dilemma_scenario: dilemma.scenario,
          history: [],
          student_message: `El estudiante clasificó la conducta como: ${ANSWER_LABELS[selectedAnswer]}`,
          turn_number: 1,
          response_time_ms: responseTimeMs,
          custom_api_key: customApiKey,
        }),
      });
      const data = await res.json();
      const tutorMsg: ChatMessage = {
        role: 'tutor',
        message: data.message,
        turn_number: 1,
        timestamp: new Date().toISOString(),
      };
      addMessage(tutorMsg);
      setTurnNumber(1);
    } catch (err) {
      console.error('Chat start error:', err);
      const defaultQuestions = [
        '¿Por qué elegiste esa clasificación? Explícame tu razonamiento.',
        '¿Qué elemento de la situación fue el más determinante para tu elección?',
        '¿Podrías justificar tu respuesta describiendo qué pensabas al elegir esa opción?'
      ];
      const randomMsg = defaultQuestions[Math.floor(Math.random() * defaultQuestions.length)];
      addMessage({
        role: 'tutor',
        message: randomMsg,
        turn_number: 1,
        timestamp: new Date().toISOString(),
      });
      setTurnNumber(1);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [profile, dilemma, selectedAnswer, dilemmaId, responseTimeMs, customApiKey]);

  // ── Student sends a response ──────────────────────────────
  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isLoading || isFinished) return;

    const studentMsg: ChatMessage = {
      role: 'student',
      message: text,
      timestamp: new Date().toISOString(),
    };
    addMessage(studentMsg);
    setInputValue('');
    setIsLoading(true);

    const nextTurn = turnNumber + 1;
    const allHistory = [...messages, studentMsg];

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: profile.id,
          dilemma_id: dilemmaId,
          topic: profile.selectedTopic,
          age: profile.age,
          language: profile.language,
          selected_answer: selectedAnswer,
          correct_answer: dilemma.correct_answer,
          dilemma_scenario: dilemma.scenario,
          history: allHistory,
          student_message: text,
          turn_number: nextTurn,
          response_time_ms: responseTimeMs,
          custom_api_key: customApiKey,
        }),
      });

      const data = await res.json();
      const tutorMsg: ChatMessage = {
        role: 'tutor',
        message: data.message,
        turn_number: nextTurn,
        timestamp: new Date().toISOString(),
      };
      addMessage(tutorMsg);
      setTurnNumber(nextTurn);

      // Check if this is the final verdict
      if (data.is_final) {
        setIsFinished(true);
        const result: SocraticResult = {
          understood: data.understood ?? false,
          studentWasCorrect: data.student_was_correct ?? false,
          correctAnswer: dilemma.correct_answer,
          turnCount: nextTurn,
          chatInteractions: nextTurn,
          dialogueHistory: [...allHistory, tutorMsg],
        };
        setFinalResult(result);
      }
    } catch (err) {
      console.error('Chat send error:', err);
      addMessage({
        role: 'tutor',
        message: 'Lo siento, ocurrió un error. Por favor intenta de nuevo.',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleComplete = () => {
    if (finalResult) onComplete(finalResult);
  };

  if (!isOpen) return null;

  // ── Progress indicator ────────────────────────────────────
  const maxTurns = 5;
  const progressPct = Math.min((turnNumber / maxTurns) * 100, 100);
  const progressColor = isFinished ? '#06D6A0' : 'var(--accent)';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-2xl flex flex-col animate-scale-in"
        style={{
          height: 'min(90vh, 700px)',
          background: isKid ? 'rgba(255,255,255,0.97)' : '#111827',
          borderRadius: isKid ? '28px' : '20px',
          border: `2px solid ${isKid ? 'rgba(255,107,53,0.3)' : 'rgba(124,58,237,0.4)'}`,
          boxShadow: isKid
            ? '0 24px 64px rgba(255,107,53,0.25)'
            : '0 24px 64px rgba(124,58,237,0.3)',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{
            background: isKid
              ? 'linear-gradient(135deg, #FF6B35, #F72585)'
              : 'linear-gradient(135deg, #7C3AED, #4F46E5)',
          }}
        >
          {/* Tutor info */}
          <div className="flex items-center gap-3">
            <div
              className="text-3xl rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            >
              {isKid ? '🧑🏫' : '🧙'}
            </div>
            <div>
              <p className="text-white font-black text-sm">
                {isKid ? 'Profe IA' : 'Tutor Socrático'}
              </p>
              <p className="text-white text-xs opacity-80">
                {isFinished ? '✅ Diálogo completado' : `Pregunta ${turnNumber} (Máx: 5)`}
              </p>
            </div>
          </div>

          {/* Progress bar + skip */}
          <div className="flex items-center gap-3">
            {/* Circular progress */}
            <svg width="44" height="44" viewBox="0 0 44 44">
              <circle cx="22" cy="22" r="17" fill="none" strokeWidth="3"
                stroke="rgba(255,255,255,0.25)" />
              <circle cx="22" cy="22" r="17" fill="none" strokeWidth="3"
                stroke="white"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 17}`}
                strokeDashoffset={`${2 * Math.PI * 17 * (1 - progressPct / 100)}`}
                transform="rotate(-90 22 22)"
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
              <text x="22" y="27" textAnchor="middle" fontSize="11"
                fontWeight="bold" fill="white">
                {isFinished ? '✓' : `${turnNumber}`}
              </text>
            </svg>

            {/* Skip button - only for ages 8-10 */}
            {canSkip && !isFinished && (
              <button
                onClick={onSkip}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.4)',
                }}
              >
                Saltar ⏩
              </button>
            )}
          </div>
        </div>

        {/* ── Selected Answer Badge ── */}
        <div
          className="px-5 py-2 flex items-center gap-2 flex-shrink-0"
          style={{
            background: isKid ? 'rgba(255,107,53,0.08)' : 'rgba(124,58,237,0.1)',
            borderBottom: `1px solid ${isKid ? 'rgba(255,107,53,0.15)' : 'rgba(124,58,237,0.2)'}`,
          }}
        >
          <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Tu clasificación:
          </span>
          <span
            className="text-xs font-black px-2 py-0.5 rounded-full"
            style={{
              background: `${ANSWER_COLORS[selectedAnswer]}20`,
              color: ANSWER_COLORS[selectedAnswer],
              border: `1px solid ${ANSWER_COLORS[selectedAnswer]}40`,
            }}
          >
            {ANSWER_LABELS[selectedAnswer]}
          </span>
          <span className="text-xs ml-auto" style={{ color: 'var(--text-secondary)' }}>
            {isFinished ? 'Diálogo finalizado' : 'Responde las preguntas del tutor'}
          </span>
        </div>

        {/* ── Messages ── */}
        <div
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
          style={{ background: isKid ? '#FFF9F0' : '#0D1117' }}
        >
          {messages.map((msg, idx) => {
            const isTutor = msg.role === 'tutor';
            return (
              <div
                key={idx}
                className={`flex gap-3 ${isTutor ? '' : 'flex-row-reverse'} animate-fade-in`}
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0 self-end"
                  style={{
                    background: isTutor
                      ? isKid
                        ? 'rgba(255,107,53,0.15)'
                        : 'rgba(124,58,237,0.2)'
                      : isKid
                      ? 'rgba(78,205,196,0.15)'
                      : 'rgba(6,182,212,0.2)',
                    border: `1.5px solid ${isTutor
                      ? isKid ? '#FF6B35' : '#7C3AED'
                      : isKid ? '#4ECDC4' : '#06B6D4'}`,
                  }}
                >
                  {isTutor ? (isKid ? '🧑🏫' : '🧙') : (AVATAR_EMOJI[profile.avatar] || '👤')}
                </div>

                {/* Bubble */}
                <div
                  className="max-w-xs sm:max-w-md rounded-2xl px-4 py-3"
                  style={{
                    background: isTutor
                      ? isKid ? '#FFFBF5' : '#161B22'
                      : isKid ? '#FF6B35' : '#7C3AED',
                    color: isTutor
                      ? isKid ? '#1C1917' : '#F9FAFB'
                      : 'white',
                    border: isTutor
                      ? isKid ? '2px solid #FF6B35' : '2px solid #7C3AED'
                      : 'none',
                    borderRadius: isTutor
                      ? '4px 18px 18px 18px'
                      : '18px 4px 18px 18px',
                    boxShadow: isTutor
                      ? `0 4px 12px ${isKid ? 'rgba(255,107,53,0.15)' : 'rgba(124,58,237,0.15)'}`
                      : `0 4px 12px ${isKid ? 'rgba(255,107,53,0.25)' : 'rgba(124,58,237,0.25)'}`,
                    fontSize: isKid ? '1.05rem' : '0.95rem',
                    fontWeight: isTutor ? 600 : 400,
                    fontFamily: isKid ? 'Nunito, sans-serif' : 'Inter, sans-serif',
                    lineHeight: 1.6,
                  }}
                >
                  <p>{msg.message}</p>
                  <p
                    className="text-xs mt-1 opacity-60"
                    style={{ textAlign: isTutor ? 'left' : 'right' }}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3 animate-fade-in">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                style={{
                  background: isKid ? 'rgba(255,107,53,0.15)' : 'rgba(124,58,237,0.2)',
                  border: `1.5px solid ${isKid ? '#FF6B35' : '#7C3AED'}`,
                }}
              >
                {isKid ? '🧑🏫' : '🧙'}
              </div>
              <div
                className="px-4 py-3 rounded-2xl flex items-center gap-1.5"
                style={{ background: isKid ? 'white' : '#1F2937', borderRadius: '4px 18px 18px 18px' }}
              >
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{
                      background: isKid ? '#FF6B35' : '#7C3AED',
                      animationDelay: `${i * 150}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Final verdict actions */}
          {isFinished && finalResult && (
            <div
              className="rounded-2xl p-4 mt-2 text-center animate-scale-in"
              style={{
                background: finalResult.studentWasCorrect
                  ? 'rgba(6,214,160,0.15)'
                  : 'rgba(124,58,237,0.15)',
                border: `2px solid ${finalResult.studentWasCorrect ? '#06D6A0' : '#7C3AED'}`,
              }}
            >
              <div className="text-3xl mb-2">
                {finalResult.studentWasCorrect ? '🎉' : finalResult.understood ? '💡' : '📚'}
              </div>
              <p className="font-black text-sm mb-1" style={{ color: isKid ? '#2D2D2D' : '#F9FAFB' }}>
                {finalResult.studentWasCorrect
                  ? '¡Clasificación correcta!'
                  : finalResult.understood
                  ? '¡Comprendiste el concepto!'
                  : 'Sigue practicando'}
              </p>
              <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                Respuesta correcta:
                <span
                  className="ml-1 font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: `${ANSWER_COLORS[finalResult.correctAnswer]}20`,
                    color: ANSWER_COLORS[finalResult.correctAnswer],
                  }}
                >
                  {ANSWER_LABELS[finalResult.correctAnswer]}
                </span>
              </p>
              <button
                id="complete-dialogue"
                onClick={handleComplete}
                className="btn-primary px-6 py-2 text-sm"
                style={{ borderRadius: isKid ? '12px' : '8px' }}
              >
                Siguiente dilema →
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Input ── */}
        {!isFinished && (
          <div
            className="px-4 py-3 flex items-end gap-3 flex-shrink-0"
            style={{
              background: isKid ? 'white' : '#111827',
              borderTop: `1px solid ${isKid ? 'rgba(255,107,53,0.15)' : 'rgba(124,58,237,0.2)'}`,
            }}
          >
            <textarea
              ref={inputRef}
              id="chat-input"
              rows={2}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isKid
                ? '¿Qué piensas? Escribe tu respuesta...'
                : 'Escribe tu argumento... (Enter para enviar)'
              }
              disabled={isLoading || turnNumber === 0}
              className="flex-1 resize-none rounded-xl px-4 py-2.5 text-sm outline-none"
              style={{
                background: isKid ? '#FFF9F0' : '#1F2937',
                border: `1.5px solid ${isKid ? 'rgba(255,107,53,0.3)' : 'rgba(124,58,237,0.3)'}`,
                color: isKid ? '#2D2D2D' : '#F9FAFB',
                fontFamily: isKid ? 'Nunito, sans-serif' : 'Inter, sans-serif',
                maxHeight: '100px',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading || turnNumber === 0}
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
              style={{
                background: !inputValue.trim() || isLoading
                  ? 'var(--border)'
                  : isKid
                  ? 'linear-gradient(135deg, #FF6B35, #F72585)'
                  : 'linear-gradient(135deg, #7C3AED, #4F46E5)',
                color: 'white',
                cursor: !inputValue.trim() || isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
