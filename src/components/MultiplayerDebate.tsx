'use client';

import React, { useState, useEffect } from 'react';
import { useUserStore } from '@/store/userStore';
import { AnswerType, GeneratedDilemma, getFallbackDilemma } from '@/lib/gemini';
import { DebateRoom, DebateParticipant, ArgumentEvaluation } from '@/types/debate';
import {
  createDebateRoom,
  joinDebateRoom,
  getDebateRoom,
  saveDebateRoom,
  submitParticipantArgument,
  subscribeToRoom,
  generateRoomCode,
} from '@/lib/debateSync';

const TOPICS = [
  { id: 'cambio_climatico', name: '🌍 Cambio Climático', minAge: 8 },
  { id: 'derechos_animales', name: '🐾 Derechos de los Animales', minAge: 8 },
  { id: 'ciberacoso', name: '💻 Ciberacoso', minAge: 8 },
  { id: 'justicia_equidad', name: '⚖️ Justicia y Equidad', minAge: 8 },
  { id: 'corrupcion', name: '🏛️ Corrupción', minAge: 14 },
  { id: 'eutanasia', name: '💊 Eutanasia', minAge: 14 },
  { id: 'aborto', name: '🔒 Aborto', minAge: 14 },
  { id: 'pena_muerte', name: '⚠️ Pena de Muerte', minAge: 14 },
];

const ANSWER_LABELS: Record<AnswerType, { label: string; icon: string; color: string }> = {
  moral: { label: 'Moral', icon: '🟢', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  inmoral: { label: 'Inmoral', icon: '🔴', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
  amoral: { label: 'Amoral', icon: '⚪', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  negligente: { label: 'Negligencia', icon: '😴', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  ignorancia: { label: 'Ignorancia Vencible', icon: '🟡', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
};

export default function MultiplayerDebate() {
  const { profile, theme, customApiKey } = useUserStore();
  const isKid = theme === 'kid';

  // Local state
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('justicia_equidad');
  const [activeRoom, setActiveRoom] = useState<DebateRoom | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Participant form input
  const [selectedAnswer, setSelectedAnswer] = useState<AnswerType | null>(null);
  const [argumentText, setArgumentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Subscribe to room updates
  useEffect(() => {
    if (!activeRoom?.code) return;
    const unsubscribe = subscribeToRoom(activeRoom.code, (updatedRoom) => {
      setActiveRoom(updatedRoom);
    });
    return () => unsubscribe();
  }, [activeRoom?.code]);

  // Available topics filtered by user age
  const availableTopics = TOPICS.filter((t) => (profile?.age || 13) >= t.minAge);

  // Helper to construct current user participant object
  const getCurrentParticipant = (): DebateParticipant => ({
    id: profile?.id || 'guest-' + Math.random().toString(36).substr(2, 9),
    name: profile?.name || 'Estudiante',
    avatar: profile?.avatar || '🦁',
    age: profile?.age || 14,
    establishment: profile?.establishment,
    course: profile?.course,
    isReady: false,
  });

  // Action: Create Room
  const handleCreateRoom = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const me = getCurrentParticipant();
      // Fetch dilemma using API or fallback
      let dilemma: GeneratedDilemma;
      try {
        const res = await fetch('/api/dilema', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: selectedTopic,
            age: profile?.age || 14,
            language: profile?.language || 'es',
            custom_api_key: customApiKey,
          }),
        });
        const data = await res.json();
        dilemma = data.dilemma || getFallbackDilemma(selectedTopic, profile?.language || 'es');
      } catch (e) {
        dilemma = getFallbackDilemma(selectedTopic, profile?.language || 'es');
      }

      const room = createDebateRoom(me, selectedTopic, dilemma);
      setActiveRoom(room);
    } catch (err: any) {
      setErrorMsg('Error al crear la sala: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Action: Join Room
  const handleJoinRoom = () => {
    if (!roomCodeInput.trim()) {
      setErrorMsg('Por favor ingresa un código de sala válido.');
      return;
    }
    setErrorMsg(null);
    const me = getCurrentParticipant();
    const joined = joinDebateRoom(roomCodeInput.trim(), me);
    if (!joined) {
      setErrorMsg('La sala especificada no existe. Verifica el código e intenta nuevamente.');
      return;
    }
    setActiveRoom(joined);
  };

  // Action: Add Simulated Opponent / Bot for quick testing
  const handleAddBotOpponent = () => {
    if (!activeRoom) return;
    const botId = 'bot-' + Math.random().toString(36).substr(2, 5);
    const botParticipant: DebateParticipant = {
      id: botId,
      name: 'Sofía (Compañera de Debate)',
      avatar: '🦉',
      age: activeRoom.participants[0]?.age || 14,
      isReady: false,
    };
    const updated = joinDebateRoom(activeRoom.code, botParticipant);
    if (updated) setActiveRoom(updated);
  };

  // Action: Start Debate Session
  const handleStartDebate = () => {
    if (!activeRoom) return;
    const updated: DebateRoom = { ...activeRoom, status: 'active' };
    saveDebateRoom(updated);
    setActiveRoom(updated);
  };

  // Action: Submit Student Argument to AI Evaluator API
  const handleSubmitArgument = async () => {
    if (!activeRoom || !selectedAnswer || !argumentText.trim()) {
      setErrorMsg('Debes seleccionar una clasificación y redactar tu argumento.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    const me = getCurrentParticipant();

    try {
      // 1. Call AI Evaluation API endpoint
      const res = await fetch('/api/debate/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: activeRoom.code,
          topic: activeRoom.topic,
          dilemmaScenario: activeRoom.dilemmaScenario,
          correctAnswer: activeRoom.correctAnswer,
          selectedAnswer,
          argumentText,
          studentName: me.name,
          studentAge: me.age,
          language: profile?.language || 'es',
          customApiKey,
        }),
      });

      const data = await res.json();
      const evaluation: ArgumentEvaluation = data.evaluation;

      // 2. Submit to Sync Manager
      const updated = submitParticipantArgument(
        activeRoom.code,
        me.id,
        selectedAnswer,
        argumentText,
        evaluation
      );

      // 3. If there is a Bot in the room who hasn't submitted, auto-simulate the bot argument!
      if (updated) {
        const unsubmittedBot = updated.participants.find((p) => p.id.startsWith('bot-') && !p.isReady);
        if (unsubmittedBot) {
          // Bot answer logic
          const botAns: AnswerType = activeRoom.correctAnswer;
          const botText = `En mi opinión sobre este dilema de ${activeRoom.topic}, considero que la acción es ${botAns} debido a que el personaje actuó con plena intención de beneficiarse, violando los deberes éticos fundamentales.`;
          const botEvalRes = await fetch('/api/debate/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roomCode: activeRoom.code,
              topic: activeRoom.topic,
              dilemmaScenario: activeRoom.dilemmaScenario,
              correctAnswer: activeRoom.correctAnswer,
              selectedAnswer: botAns,
              argumentText: botText,
              studentName: unsubmittedBot.name,
              studentAge: unsubmittedBot.age,
              language: profile?.language || 'es',
              customApiKey,
            }),
          });
          const botData = await botEvalRes.json();
          submitParticipantArgument(activeRoom.code, unsubmittedBot.id, botAns, botText, botData.evaluation);
        }
      }

      if (updated) setActiveRoom(getDebateRoom(activeRoom.code));
    } catch (err: any) {
      setErrorMsg('Error al evaluar argumento: ' + (err?.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper: Copy Room Code to Clipboard
  const handleCopyCode = () => {
    if (activeRoom?.code) {
      navigator.clipboard.writeText(activeRoom.code);
      alert(`¡Código ${activeRoom.code} copiado al portapapeles!`);
    }
  };

  // --------------------------------------------------------------------------
  // RENDER: LOBBY STATE (Create / Join Room)
  // --------------------------------------------------------------------------
  if (!activeRoom) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 p-4 sm:p-6">
        {/* Header Banner */}
        <div className={`p-6 sm:p-8 rounded-3xl backdrop-blur-xl border ${
          isKid
            ? 'bg-gradient-to-r from-purple-600/30 via-pink-600/30 to-blue-600/30 border-purple-400/40 shadow-xl'
            : 'bg-slate-900/80 border-cyan-500/30 shadow-2xl shadow-cyan-950/40'
        }`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                ⚔️ Modo Arena Competitiva
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Debate Ético Multijugador
              </h1>
              <p className="text-slate-300 text-sm sm:text-base mt-2 max-w-xl">
                Compite con tus compañeros en tiempo real. Redacta los mejores argumentos éticos y deja que la Inteligencia Artificial analice la solidez de tu razonamiento para declarar al ganador.
              </p>
            </div>
            <div className="text-6xl animate-bounce">⚔️</div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-sm flex items-center gap-3">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Create New Room */}
          <div className={`p-6 sm:p-8 rounded-3xl border flex flex-col justify-between transition-all ${
            isKid
              ? 'bg-purple-900/30 border-purple-500/30 hover:border-purple-400/60'
              : 'bg-slate-900/60 border-slate-800 hover:border-cyan-500/40'
          }`}>
            <div>
              <div className="text-3xl mb-3">👑</div>
              <h2 className="text-xl font-bold text-white mb-2">Crear Nueva Sala de Debate</h2>
              <p className="text-slate-400 text-xs sm:text-sm mb-6">
                Sé el anfitrión del debate. Selecciona el tema ético y comparte el código con 2 o más compañeros.
              </p>

              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Tema del Dilema Ético:
              </label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-400 mb-6"
              >
                {availableTopics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-600/30 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Creando Sala...' : '✨ Crear Sala de Debate'}
            </button>
          </div>

          {/* Card 2: Join Existing Room */}
          <div className={`p-6 sm:p-8 rounded-3xl border flex flex-col justify-between transition-all ${
            isKid
              ? 'bg-blue-900/30 border-blue-500/30 hover:border-blue-400/60'
              : 'bg-slate-900/60 border-slate-800 hover:border-blue-500/40'
          }`}>
            <div>
              <div className="text-3xl mb-3">🗝️</div>
              <h2 className="text-xl font-bold text-white mb-2">Unirse a una Sala Existente</h2>
              <p className="text-slate-400 text-xs sm:text-sm mb-6">
                Ingresa el código que te proporcionó el anfitrión de la sala para unirte al debate.
              </p>

              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Código de la Sala (Ej: ETH-4921):
              </label>
              <input
                type="text"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="ETH-XXXX"
                className="w-full p-3 rounded-xl bg-slate-800/90 border border-slate-700 text-white font-mono text-center text-lg tracking-widest uppercase focus:outline-none focus:border-blue-400 mb-6"
              />
            </div>

            <button
              onClick={handleJoinRoom}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-95"
            >
              🚪 Unirse a la Sala
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: WAITING ROOM LOBBY
  // --------------------------------------------------------------------------
  if (activeRoom.status === 'waiting') {
    const isHost = activeRoom.hostId === (profile?.id || '');

    return (
      <div className="max-w-3xl mx-auto space-y-6 p-4 sm:p-6">
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 text-center space-y-4">
          <div className="inline-block p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 text-sm font-semibold border border-cyan-500/30">
            📍 Sala de Espera Multijugador
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Código de Sala: <span className="text-cyan-400 font-mono tracking-wider">{activeRoom.code}</span>
          </h2>
          <p className="text-slate-400 text-sm">
            Comparte este código con tus compañeros para que se unan desde sus pantallas.
          </p>

          <button
            onClick={handleCopyCode}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-slate-700 transition-all"
          >
            📋 Copiar Código al Portapapeles
          </button>
        </div>

        {/* Participants list */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>👥 Participantes en la Sala</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                {activeRoom.participants.length}
              </span>
            </h3>
            <button
              onClick={handleAddBotOpponent}
              className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-bold border border-purple-500/40 transition-all"
            >
              🤖 Agregar Oponente Virtual (Bot)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeRoom.participants.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60"
              >
                <div className="text-2xl p-2 rounded-xl bg-slate-700/50">{p.avatar}</div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    {p.name}
                    {p.id === activeRoom.hostId && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Anfitrión
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">Edad: {p.age} años</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={() => setActiveRoom(null)}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold border border-slate-700"
          >
            ← Salir de la Sala
          </button>

          <button
            onClick={handleStartDebate}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-base shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
          >
            ⚔️ Comenzar Debate Ético
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: ACTIVE DEBATE ARENA (Argument Submission)
  // --------------------------------------------------------------------------
  const me = getCurrentParticipant();
  const myParticipantState = activeRoom.participants.find((p) => p.id === me.id);
  const hasSubmitted = Boolean(myParticipantState?.isReady && myParticipantState?.evaluation);

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 sm:p-6">
      {/* Top Banner: Dilemma Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-cyan-500/30 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
            ⚔️ Dilema del Debate ({activeRoom.topic})
          </span>
          <span className="text-xs font-mono text-slate-400">Sala: {activeRoom.code}</span>
        </div>

        <h2 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
          {activeRoom.dilemmaScenario}
        </h2>

        <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-800/40 text-cyan-200 text-sm font-semibold">
          ❓ Pregunta de Debate: {activeRoom.dilemmaQuestion}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-sm flex items-center gap-3">
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Submission Form Section */}
      {!hasSubmitted ? (
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white mb-3">
              1. Paso 1: Selecciona la Clasificación Ética
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {(Object.keys(ANSWER_LABELS) as AnswerType[]).map((key) => {
                const item = ANSWER_LABELS[key];
                const isSelected = selectedAnswer === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedAnswer(key)}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      isSelected
                        ? `${item.color} ring-2 ring-cyan-400 font-bold scale-105 shadow-lg`
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="text-2xl mb-1">{item.icon}</div>
                    <div className="text-xs">{item.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold text-white mb-2">
              2. Paso 2: Redacta tu Argumento Ético (Fundamentación)
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              La IA evaluará la precisión lógica, la ausencia de falacias, la claridad y el uso de conceptos éticos.
            </p>

            <textarea
              value={argumentText}
              onChange={(e) => setArgumentText(e.target.value)}
              placeholder="Explica detalladamente por qué elegiste esa clasificación. ¿Qué papel juega la intencionalidad, las consecuencias o el deber moral en esta situación?..."
              rows={5}
              className="w-full p-4 rounded-2xl bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-400 leading-relaxed placeholder:text-slate-500"
            />
          </div>

          <button
            onClick={handleSubmitArgument}
            disabled={isSubmitting || !selectedAnswer || !argumentText.trim()}
            className="w-full py-4 px-8 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-extrabold text-base shadow-xl shadow-cyan-600/30 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? '🤖 Evaluando Argumento con Inteligencia Artificial...' : '🚀 Enviar Argumento al Juicio de la IA'}
          </button>
        </div>
      ) : (
        <div className="p-6 rounded-3xl bg-cyan-950/40 border border-cyan-500/40 text-center space-y-3">
          <div className="text-4xl animate-pulse">⏳</div>
          <h3 className="text-lg font-bold text-white">¡Argumento Enviado!</h3>
          <p className="text-xs text-cyan-200">
            Esperando la evaluación y entregas de los demás estudiantes para presentar los resultados del debate...
          </p>
        </div>
      )}

      {/* Results & Live Scoreboard */}
      <div className="space-y-6">
        <h3 className="text-xl font-extrabold text-white flex items-center gap-3">
          <span>📊 Resultados & Evaluación IA del Debate</span>
          {activeRoom.status === 'finished' && (
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/40">
              🏆 Debate Concluido
            </span>
          )}
        </h3>

        {/* Winner Highlight Card if finished */}
        {activeRoom.status === 'finished' && activeRoom.winnerId && (
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-orange-500/20 border border-amber-400/50 text-white space-y-3 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="text-4xl">🏆</span>
              <div>
                <div className="text-xs uppercase font-extrabold text-amber-300 tracking-wider">
                  ¡Ganador del Debate!
                </div>
                <h4 className="text-2xl font-black text-white">
                  {activeRoom.participants.find((p) => p.id === activeRoom.winnerId)?.name}
                </h4>
              </div>
            </div>
            <p className="text-sm text-amber-100 bg-amber-950/40 p-4 rounded-2xl border border-amber-500/30">
              {activeRoom.winnerReasoning}
            </p>
          </div>
        )}

        {/* Participants AI Feedback Cards */}
        <div className="space-y-4">
          {activeRoom.participants.map((p) => {
            const hasEval = Boolean(p.evaluation);

            return (
              <div
                key={p.id}
                className={`p-6 rounded-3xl border transition-all ${
                  p.id === activeRoom.winnerId
                    ? 'bg-amber-950/30 border-amber-500/50 shadow-xl'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl p-2 rounded-2xl bg-slate-800">{p.avatar}</div>
                    <div>
                      <h4 className="text-base font-bold text-white flex items-center gap-2">
                        {p.name}
                        {p.id === activeRoom.winnerId && <span>🏆</span>}
                      </h4>
                      <div className="text-xs text-slate-400">
                        {p.selectedAnswer ? (
                          <span>
                            Clasificación: <strong className="text-cyan-300">{ANSWER_LABELS[p.selectedAnswer]?.label}</strong>
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Esperando respuesta...</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {hasEval && p.evaluation && (
                    <div className="flex items-center gap-3 bg-slate-800/90 px-4 py-2 rounded-2xl border border-slate-700">
                      <div className="text-xs text-slate-400 font-semibold uppercase">Puntaje IA:</div>
                      <div className="text-2xl font-black text-cyan-400">{p.evaluation.score} <span className="text-xs text-slate-400 font-normal">/ 100</span></div>
                    </div>
                  )}
                </div>

                {/* Argument and AI Feedback Details */}
                {hasEval && p.evaluation ? (
                  <div className="space-y-3">
                    {/* Student argument text */}
                    <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-300 italic">
                      &quot;{p.argumentText}&quot;
                    </div>

                    {/* AI Feedback Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Felicitaciones */}
                      <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs space-y-1">
                        <div className="font-bold flex items-center gap-1 text-emerald-400">
                          <span>👏 Felicitación:</span>
                        </div>
                        <p>{p.evaluation.congratulations}</p>
                      </div>

                      {/* Correcciones */}
                      <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs space-y-1">
                        <div className="font-bold flex items-center gap-1 text-rose-400">
                          <span>❌ Correcciones / Análisis:</span>
                        </div>
                        <p>{p.evaluation.corrections}</p>
                      </div>

                      {/* Sugerencias */}
                      <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 text-xs space-y-1">
                        <div className="font-bold flex items-center gap-1 text-cyan-400">
                          <span>💡 Sugerencias de Mejora:</span>
                        </div>
                        <p>{p.evaluation.suggestions}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic text-center py-2">
                    Redactando argumento en la arena...
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
