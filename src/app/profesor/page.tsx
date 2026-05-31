'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import TeacherTable from '@/components/TeacherTable';
import { useUserStore } from '@/store/userStore';

const CORRECT_PASSWORD = process.env.NEXT_PUBLIC_TEACHER_PASSWORD || 'profesor2024';

export default function ProfesorPage() {
  const t = useTranslations('teacher');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const { customApiKey, setCustomApiKey } = useUserStore();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success'>('idle');

  // Load customApiKey once mounted to prevent hydration errors
  useEffect(() => {
    if (customApiKey) {
      setApiKeyInput(customApiKey);
    }
  }, [customApiKey]);

  const handleSaveApiKey = () => {
    const cleanKey = apiKeyInput.trim();
    if (cleanKey) {
      setCustomApiKey(cleanKey);
    } else {
      setCustomApiKey(null);
    }
    setSaveStatus('success');
    setTimeout(() => setSaveStatus('idle'), 3000);
  };

  useEffect(() => {
    setMounted(true);
    // Check if already authenticated in session
    const auth = sessionStorage.getItem('teacher_auth');
    if (auth === 'true') setIsAuthenticated(true);
  }, []);

  if (!mounted) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPassword = password.trim();
    // Allow either the environment variable, the custom teacher password or standard fallback
    if (
      cleanPassword === CORRECT_PASSWORD ||
      cleanPassword === 'docenteEtica2026' ||
      (cleanPassword === 'profesor2024' && !CORRECT_PASSWORD) // secure default fallback if env is unset
    ) {
      setIsAuthenticated(true);
      setError('');
      setLastRefresh(new Date());
      sessionStorage.setItem('teacher_auth', 'true');
    } else {
      setError(t('wrongPassword'));
      setPassword('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('teacher_auth');
  };

  if (!isAuthenticated) {
    return (
      <div
        className="min-h-screen animated-bg flex items-center justify-center px-4"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        {/* Background orbs */}
        <div className="fixed top-0 left-0 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #7C3AED, transparent)', transform: 'translate(-30%, -30%)' }} />
        <div className="fixed bottom-0 right-0 w-80 h-80 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #06B6D4, transparent)', transform: 'translate(30%, 30%)' }} />

        <div
          className="w-full max-w-sm animate-scale-in rounded-2xl p-8"
          style={{
            background: 'rgba(17,24,39,0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(124,58,237,0.3)',
            boxShadow: '0 20px 60px rgba(124,58,237,0.2)',
          }}
        >
          {/* Icon + Title */}
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">👨‍🏫</div>
            <h1
              className="text-2xl font-black gradient-text mb-1"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {t('title')}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t('subtitle')}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="teacher-password"
                className="block text-sm font-bold mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t('password')}
              </label>
              <input
                id="teacher-password"
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              {error && (
                <p className="text-xs mt-2" style={{ color: '#F72585' }}>
                  ⚠️ {error}
                </p>
              )}
            </div>

            <button
              id="teacher-login"
              type="submit"
              className="btn-primary w-full"
            >
              {t('access')}
            </button>
          </form>

          <div className="mt-4 text-center">
            <LanguageSwitcher />
          </div>

          {/* Footnotes removed for security */}
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen animated-bg"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* Background orbs */}
      <div className="fixed top-0 left-0 w-96 h-96 rounded-full opacity-8 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #7C3AED, transparent)', transform: 'translate(-30%, -30%)' }} />

      {/* Header */}
      <header
        className="sticky top-0 z-20 px-6 py-4 backdrop-blur-sm flex justify-between items-center"
        style={{
          borderBottom: '1px solid var(--border)',
          background: 'rgba(10,10,15,0.85)',
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">👨‍🏫</span>
          <div>
            <h1
              className="text-xl font-black gradient-text"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {t('title')}
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {t('subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs hidden sm:inline" style={{ color: 'var(--text-secondary)' }}>
              🔄 Actualización automática cada 5s
            </span>
          )}
          <LanguageSwitcher />
          <button
            onClick={handleLogout}
            className="text-sm px-3 py-1.5 rounded-lg font-semibold transition-all"
            style={{
              background: 'rgba(247,37,133,0.1)',
              border: '1px solid rgba(247,37,133,0.3)',
              color: '#F72585',
            }}
          >
            ← Salir
          </button>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 animate-fade-in">
          {[
            { label: 'Estudiantes', value: '–', emoji: '👥', color: '#06B6D4' },
            { label: 'Dilemas totales', value: '–', emoji: '🎯', color: '#A78BFA' },
            { label: 'Precisión media', value: '–', emoji: '✅', color: '#06D6A0' },
            { label: 'Tema más elegido', value: '–', emoji: '🏆', color: '#FFBE0B' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{stat.emoji}</span>
                <span className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}>
                  {stat.label}
                </span>
              </div>
              <p className="text-2xl font-black" style={{ color: stat.color }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* API Key Configuration Block */}
        <div
          className="rounded-2xl p-6 mb-8 animate-fade-in"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 20px rgba(124, 58, 237, 0.05)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🔑</span>
            <h2
              className="text-lg font-black"
              style={{ color: 'var(--text-primary)', fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Configuración de la API Key de Gemini
            </h2>
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Permite a la aplicación generar dilemas y chats del tutor IA en tiempo real. 
            Ingresa tu clave de API de Google Gemini (debe comenzar con <code className="bg-gray-800 px-1.5 py-0.5 rounded text-white font-mono text-xs">AIzaSy</code>). 
            Se guardará de forma persistente en este navegador. Si se deja en blanco, la aplicación usará la clave por defecto del servidor o el modo de respaldo.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="password"
                placeholder="Ingresa tu GEMINI_API_KEY (ej: AIzaSy...)"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="input-field w-full font-mono text-sm"
                style={{
                  background: 'rgba(10,10,15,0.6)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  color: 'white',
                }}
              />
            </div>
            <button
              onClick={handleSaveApiKey}
              className="btn-primary flex items-center justify-center gap-2 min-w-[150px] transition-all hover:scale-102 active:scale-98"
              style={{
                borderRadius: '10px',
                padding: '12px 24px',
              }}
            >
              {saveStatus === 'success' ? '¡Guardada!  ' : 'Guardar Clave 💾'}
            </button>
          </div>
          {customApiKey && (
            <p className="text-xs mt-3 flex items-center gap-1.5" style={{ color: '#06D6A0' }}>
              <span className="w-2 h-2 rounded-full bg-[#06D6A0] inline-block animate-pulse"></span>
              Clave personalizada activa en este navegador (comienza con <span className="font-mono text-xs bg-gray-900 px-1 py-0.5 rounded">{customApiKey.substring(0, 10)}...</span>)
            </p>
          )}
        </div>

        {/* Main Table */}
        <div
          className="rounded-2xl overflow-hidden animate-slide-up"
          style={{ border: '1px solid var(--border)' }}
        >
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{
              background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(6,182,212,0.1))',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <span className="text-base">📊</span>
            <h2
              className="text-base font-black"
              style={{ color: 'var(--text-primary)', fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Registro de Estudiantes
            </h2>
          </div>
          <div className="p-4" style={{ background: 'var(--bg-secondary)' }}>
            <TeacherTable />
          </div>
        </div>
      </main>
    </div>
  );
}
