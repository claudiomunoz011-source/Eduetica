'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useUserStore } from '@/store/userStore';

const AVATARS = [
  { id: 'rocket', emoji: '🚀' },
  { id: 'star', emoji: '⭐' },
  { id: 'fox', emoji: '🦊' },
  { id: 'robot', emoji: '🤖' },
  { id: 'dragon', emoji: '🐉' },
  { id: 'wizard', emoji: '🧙' },
  { id: 'ninja', emoji: '🥷' },
  { id: 'owl', emoji: '🦉' },
  { id: 'koala', emoji: '🐨' },
  { id: 'unicorn', emoji: '🦄' },
  { id: 'alien', emoji: '👽' },
  { id: 'panda', emoji: '🐼' },
  { id: 'detective', emoji: '🕵️' },
  { id: 'cat', emoji: '🐱' },
  { id: 'superhero', emoji: '🦸' },
  { id: 'lion', emoji: '🦁' },
];

interface AvatarPickerProps {
  selected: string;
  onSelect: (id: string) => void;
  theme: 'kid' | 'teen' | null;
}

export default function AvatarPicker({ selected, onSelect, theme }: AvatarPickerProps) {
  const t = useTranslations('register');
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div>
      <label
        className="block text-sm font-bold mb-3"
        style={{ color: 'var(--text-secondary)' }}
      >
        {t('avatarLabel')}
      </label>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5 max-h-48 overflow-y-auto p-1 scrollbar-thin">
        {AVATARS.map((avatar) => (
          <button
            key={avatar.id}
            type="button"
            onClick={() => onSelect(avatar.id)}
            onMouseEnter={() => setHovered(avatar.id)}
            onMouseLeave={() => setHovered(null)}
            className="avatar-option flex flex-col items-center gap-1 group"
            style={{
              border: selected === avatar.id
                ? `3px solid var(--accent)`
                : '3px solid transparent',
              boxShadow:
                selected === avatar.id
                  ? '0 0 0 4px rgba(124, 58, 237, 0.25)'
                  : 'none',
              borderRadius: '50%',
              padding: '2px',
              background: 'transparent',
              cursor: 'pointer',
              transform: hovered === avatar.id || selected === avatar.id
                ? 'scale(1.1)'
                : 'scale(1)',
              transition: 'all 0.2s ease',
            }}
            aria-label={avatar.emoji}
          >
            <div
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-2xl"
              style={{
                background:
                  selected === avatar.id
                    ? 'var(--surface)'
                    : 'var(--bg-secondary)',
                border:
                  selected === avatar.id
                    ? '2px solid var(--accent)'
                    : '2px solid transparent',
                transition: 'all 0.2s',
              }}
            >
              {avatar.emoji}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export { AVATARS };
