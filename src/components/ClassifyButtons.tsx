'use client';

import { useTranslations } from 'next-intl';

export type AnswerType = 'moral' | 'inmoral' | 'amoral' | 'negligente' | 'ignorancia';

interface ClassifyButtonsProps {
  onAnswer: (answer: AnswerType) => void;
  disabled: boolean;
  selected: AnswerType | null;
  correctAnswer: AnswerType | null;
  revealed: boolean;
}

const BUTTONS: {
  type: AnswerType;
  emoji: string;
  labelKey: string;
  color: string;
  bgColor: string;
}[] = [
  { type: 'moral',       emoji: '🟢', labelKey: 'moral',     color: '#06D6A0', bgColor: 'rgba(6,214,160,0.12)' },
  { type: 'inmoral',     emoji: '🔴', labelKey: 'inmoral',   color: '#F72585', bgColor: 'rgba(247,37,133,0.12)' },
  { type: 'amoral',      emoji: '⚪', labelKey: 'amoral',    color: '#9CA3AF', bgColor: 'rgba(156,163,175,0.12)' },
  { type: 'negligente',  emoji: '😴', labelKey: 'negligent', color: '#FFBE0B', bgColor: 'rgba(255,190,11,0.12)' },
  { type: 'ignorancia',  emoji: '🟡', labelKey: 'ignorance', color: '#A78BFA', bgColor: 'rgba(167,139,250,0.12)' },
];

export default function ClassifyButtons({
  onAnswer,
  disabled,
  selected,
  correctAnswer,
  revealed,
}: ClassifyButtonsProps) {
  const t = useTranslations('dilemma');

  const getButtonState = (type: AnswerType) => {
    if (!revealed) return 'default';
    if (type === correctAnswer) return 'correct';
    if (type === selected && type !== correctAnswer) return 'wrong';
    return 'default';
  };

  return (
    <div className="space-y-3">
      <p
        className="text-sm font-bold uppercase tracking-wider mb-4"
        style={{ color: 'var(--text-secondary)' }}
      >
        {t('classify')}
      </p>

      {BUTTONS.map((btn, index) => {
        const state = getButtonState(btn.type);
        const isSelected = selected === btn.type;

        return (
          <button
            key={btn.type}
            id={`classify-${btn.type}`}
            onClick={() => !disabled && onAnswer(btn.type)}
            disabled={disabled}
            className="classify-btn"
            style={{
              animationDelay: `${index * 0.07}s`,
              background:
                state === 'correct'
                  ? 'rgba(6,214,160,0.25)'
                  : state === 'wrong'
                  ? 'rgba(247,37,133,0.25)'
                  : isSelected
                  ? btn.bgColor
                  : 'var(--surface)',
              border: `2px solid ${
                state === 'correct'
                  ? '#06D6A0'
                  : state === 'wrong'
                  ? '#F72585'
                  : isSelected
                  ? btn.color
                  : 'var(--border)'
              }`,
              color:
                state === 'correct'
                  ? '#06D6A0'
                  : state === 'wrong'
                  ? '#F72585'
                  : isSelected
                  ? btn.color
                  : 'var(--text-primary)',
              boxShadow:
                state === 'correct'
                  ? `0 0 20px rgba(6,214,160,0.35)`
                  : state === 'wrong'
                  ? `0 0 12px rgba(247,37,133,0.25)`
                  : 'none',
              transform:
                state === 'correct'
                  ? 'scale(1.02)'
                  : isSelected && !revealed
                  ? 'translateX(4px)'
                  : 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled && !isSelected && state === 'default' ? 0.6 : 1,
            }}
          >
            {/* Emoji indicator */}
            <span className="text-xl w-7 text-center flex-shrink-0">{btn.emoji}</span>

            {/* Label */}
            <span className="font-bold text-sm leading-tight flex-1 text-left">
              {t(btn.labelKey as Parameters<typeof t>[0])}
            </span>

            {/* State icon */}
            {revealed && state === 'correct' && (
              <span className="text-lg flex-shrink-0">✅</span>
            )}
            {revealed && state === 'wrong' && (
              <span className="text-lg flex-shrink-0">❌</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
