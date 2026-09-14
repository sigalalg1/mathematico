export type MistakeCategory = 'swappedXY' | 'xSignError' | 'ySignError' | 'axisConfusion' | 'zeroConfusion';

export interface DetectiveChallenge {
  id: string;
  target: { x: number; y: number };
  wrongAnswer: { x: number; y: number };
  category: MistakeCategory;
  options: MistakeCategory[];
}
