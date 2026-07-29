import { AnswerType } from '@/lib/gemini';

export interface ArgumentEvaluation {
  score: number; // 0 to 100
  congratulations: string; // 👏 Puntos fuertes
  corrections: string; // ❌ Errores lógicos, falacias o falta de precisión
  suggestions: string; // 💡 Sugerencias concretas para mejorar la postura
  verdictSummary: string; // 📝 Resumen del impacto argumentativo
}

export interface DebateParticipant {
  id: string;
  name: string;
  avatar: string;
  age: number;
  establishment?: string;
  course?: string;
  selectedAnswer?: AnswerType;
  argumentText?: string;
  evaluation?: ArgumentEvaluation;
  isReady: boolean;
  submittedAt?: string;
}

export interface DebateRoom {
  code: string;
  hostId: string;
  topic: string;
  status: 'waiting' | 'active' | 'evaluating' | 'finished';
  dilemmaScenario: string;
  dilemmaQuestion: string;
  correctAnswer: AnswerType;
  academicExplanation: string;
  participants: DebateParticipant[];
  createdAt: string;
  winnerId?: string;
  winnerReasoning?: string;
}

export interface EvaluateArgumentPayload {
  roomCode: string;
  topic: string;
  dilemmaScenario: string;
  correctAnswer: AnswerType;
  selectedAnswer: AnswerType;
  argumentText: string;
  studentName: string;
  studentAge: number;
  language?: string;
  customApiKey?: string;
}
