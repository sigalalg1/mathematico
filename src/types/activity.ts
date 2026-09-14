export interface ActivityMistake {
  questionId: string;
  selectedAnswer: string;
  correctAnswer: string;
}

export interface GameSession {
  id: string;
  userId: string | null;
  gameId: string;
  startedAt: string;
  completedAt: string | null;
  questionsCount: number;
  correctCount: number;
  mistakes: ActivityMistake[];
}
