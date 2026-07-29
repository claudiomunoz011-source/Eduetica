import { DebateRoom, DebateParticipant, ArgumentEvaluation } from '@/types/debate';
import { AnswerType, GeneratedDilemma } from '@/lib/gemini';

const ROOM_STORAGE_PREFIX = 'eduetica_debate_room_';

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'ETH-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function saveDebateRoom(room: DebateRoom): void {
  if (typeof window === 'undefined') return;
  try {
    const key = `${ROOM_STORAGE_PREFIX}${room.code}`;
    localStorage.setItem(key, JSON.stringify(room));

    // Broadcast room update to other tabs/windows
    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel(`eduetica_room_${room.code}`);
      bc.postMessage({ type: 'ROOM_UPDATE', room });
      bc.close();
    }
  } catch (err) {
    console.error('[DebateSync] Failed to save room:', err);
  }
}

export function getDebateRoom(code: string): DebateRoom | null {
  if (typeof window === 'undefined') return null;
  try {
    const normalizedCode = code.toUpperCase().trim();
    const data = localStorage.getItem(`${ROOM_STORAGE_PREFIX}${normalizedCode}`);
    if (!data) return null;
    return JSON.parse(data) as DebateRoom;
  } catch (err) {
    console.error('[DebateSync] Failed to read room:', err);
    return null;
  }
}

export function createDebateRoom(
  host: DebateParticipant,
  topic: string,
  dilemma: GeneratedDilemma,
  customCode?: string
): DebateRoom {
  const code = customCode || generateRoomCode();
  const room: DebateRoom = {
    code,
    hostId: host.id,
    topic,
    status: 'waiting',
    dilemmaScenario: dilemma.scenario,
    dilemmaQuestion: dilemma.question,
    correctAnswer: dilemma.correct_answer,
    academicExplanation: dilemma.explanation,
    participants: [host],
    createdAt: new Date().toISOString(),
  };

  saveDebateRoom(room);
  return room;
}

export function joinDebateRoom(code: string, participant: DebateParticipant): DebateRoom | null {
  const room = getDebateRoom(code);
  if (!room) return null;

  // Check if participant already exists in room
  const existingIdx = room.participants.findIndex((p) => p.id === participant.id);
  if (existingIdx >= 0) {
    room.participants[existingIdx] = { ...room.participants[existingIdx], ...participant };
  } else {
    room.participants.push(participant);
  }

  saveDebateRoom(room);
  return room;
}

export function submitParticipantArgument(
  code: string,
  participantId: string,
  selectedAnswer: AnswerType,
  argumentText: string,
  evaluation: ArgumentEvaluation
): DebateRoom | null {
  const room = getDebateRoom(code);
  if (!room) return null;

  const idx = room.participants.findIndex((p) => p.id === participantId);
  if (idx < 0) return null;

  room.participants[idx] = {
    ...room.participants[idx],
    selectedAnswer,
    argumentText,
    evaluation,
    isReady: true,
    submittedAt: new Date().toISOString(),
  };

  // Check if all participants submitted arguments -> determine winner
  const allSubmitted = room.participants.every((p) => p.isReady && p.evaluation);
  if (allSubmitted && room.participants.length >= 1) {
    room.status = 'finished';
    
    // Sort by score descending
    const sorted = [...room.participants].sort((a, b) => (b.evaluation?.score || 0) - (a.evaluation?.score || 0));
    const winner = sorted[0];
    room.winnerId = winner.id;
    room.winnerReasoning = `${winner.name} obtuvo la puntuación más alta (${winner.evaluation?.score} pts) gracias a un argumento ético sólido, coherente y acertado.`;
  }

  saveDebateRoom(room);
  return room;
}

export function subscribeToRoom(code: string, onUpdate: (room: DebateRoom) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const normalizedCode = code.toUpperCase().trim();
  let bc: BroadcastChannel | null = null;

  if ('BroadcastChannel' in window) {
    bc = new BroadcastChannel(`eduetica_room_${normalizedCode}`);
    bc.onmessage = (event) => {
      if (event.data?.type === 'ROOM_UPDATE' && event.data.room) {
        onUpdate(event.data.room);
      }
    };
  }

  // Fallback storage polling for cross-window reactivity
  const intervalId = setInterval(() => {
    const latest = getDebateRoom(normalizedCode);
    if (latest) {
      onUpdate(latest);
    }
  }, 1000);

  return () => {
    if (bc) bc.close();
    clearInterval(intervalId);
  };
}
