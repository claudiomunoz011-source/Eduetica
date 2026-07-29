'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/userStore';
import ThemeWrapper from '@/components/ThemeWrapper';
import MultiplayerDebate from '@/components/MultiplayerDebate';

export default function DebatePage() {
  const router = useRouter();
  const { isRegistered, profile } = useUserStore();

  useEffect(() => {
    if (!isRegistered || !profile) {
      router.push('/registro');
    }
  }, [isRegistered, profile, router]);

  if (!isRegistered || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-spin">⏳</div>
          <p className="text-sm text-slate-400">Cargando perfil de usuario...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeWrapper>
      <div className="min-h-screen bg-slate-950 text-white py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Top Bar Navigation */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <button
              onClick={() => router.push('/temas')}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700 transition-all flex items-center gap-2"
            >
              <span>←</span> Volver a Selección de Temas
            </button>

            <div className="flex items-center gap-3">
              <span className="text-2xl p-1.5 rounded-xl bg-slate-900 border border-slate-800">
                {profile.avatar}
              </span>
              <div className="hidden sm:block text-right">
                <div className="text-xs font-bold text-white">{profile.name}</div>
                <div className="text-[10px] text-cyan-400 font-mono">Modo Multijugador</div>
              </div>
            </div>
          </div>

          {/* Main Multiplayer Component */}
          <MultiplayerDebate />
        </div>
      </div>
    </ThemeWrapper>
  );
}
