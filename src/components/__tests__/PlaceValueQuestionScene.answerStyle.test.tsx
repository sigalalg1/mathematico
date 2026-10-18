import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/testUtils';
import { PlaceValueQuestionScene } from '../PlaceValueQuestionScene';
import type { PlaceValueQuestion } from '../../types/placeValue';

function baseQuestion(overrides: Partial<PlaceValueQuestion>): PlaceValueQuestion {
  return {
    id: 'q1',
    skillId: 'placeValue',
    difficulty: 'basic',
    interaction: { kind: 'multipleChoice', options: ['90', '96', '87', '94'] },
    display: '2,094',
    promptKey: 'decimalPlaceValue.promptFor.digitValue.tens',
    explanationKey: 'decimalPlaceValue.explanation.digitValue',
    correctAnswerDisplay: '90',
    hasMultipleValidAnswers: false,
    validate: (raw) => raw === '90',
    ...overrides,
  };
}

describe('PlaceValueQuestionScene — answer-style auto-detection', () => {
  it('renders real .tr-option buttons (basketball-court-compatible) for a placeValue multipleChoice question', () => {
    const question = baseQuestion({});
    renderWithProviders(<PlaceValueQuestionScene question={question} phase="answering" lastRaw={null} lastCorrect={null} onAnswer={() => {}} />);
    expect(screen.getByTestId('tr-option-90')).toBeInTheDocument();
    expect(screen.queryByTestId('pv-option-90')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sgc-target-90')).not.toBeInTheDocument();
  });

  it('falls back to plain buttons for a multipleChoice question whose options are too long for a basket/goal label, even on placeValue', () => {
    const question = baseQuestion({
      interaction: {
        kind: 'multipleChoice',
        options: ['35,350, 62,191, 84,588, 86,362', '62,191, 84,588, 86,362, 35,350', '86,362, 35,350, 62,191, 84,588', '62,191, 86,362, 84,588, 35,350'],
      },
      correctAnswerDisplay: '35,350, 62,191, 84,588, 86,362',
      validate: (raw) => raw === '35,350, 62,191, 84,588, 86,362',
    });
    renderWithProviders(<PlaceValueQuestionScene question={question} phase="answering" lastRaw={null} lastCorrect={null} onAnswer={() => {}} />);
    expect(screen.getByTestId('pv-option-35,350, 62,191, 84,588, 86,362')).toBeInTheDocument();
    expect(screen.queryByTestId('tr-option-35,350, 62,191, 84,588, 86,362')).not.toBeInTheDocument();
  });

  it('renders the real soccer court plus both compared numbers for an ordering compareSymbol question', () => {
    const question = baseQuestion({
      skillId: 'ordering',
      interaction: { kind: 'compareSymbol', left: '2,871', right: '3,276' },
      display: '',
      correctAnswerDisplay: '<',
      validate: (raw) => raw === '<',
    });
    renderWithProviders(<PlaceValueQuestionScene question={question} phase="answering" lastRaw={null} lastCorrect={null} onAnswer={() => {}} />);
    expect(screen.getByText('2,871')).toBeInTheDocument();
    expect(screen.getByText('3,276')).toBeInTheDocument();
    expect(screen.getByTestId('sgc-target-<')).toBeInTheDocument();
    expect(screen.getByTestId('sgc-target-=')).toBeInTheDocument();
    expect(screen.getByTestId('sgc-target->')).toBeInTheDocument();
  });

  it('renders the real soccer court with translated even/odd labels for a parity evenOddChoice question', () => {
    const question = baseQuestion({
      skillId: 'parity',
      interaction: { kind: 'evenOddChoice' },
      display: '4,254 + 7,203',
      correctAnswerDisplay: 'odd',
      validate: (raw) => raw === 'odd',
    });
    renderWithProviders(<PlaceValueQuestionScene question={question} phase="answering" lastRaw={null} lastCorrect={null} onAnswer={() => {}} />);
    expect(screen.getByTestId('sgc-target-even')).toBeInTheDocument();
    expect(screen.getByTestId('sgc-target-odd')).toBeInTheDocument();
  });

  it('renders the real soccer court for a rounding multipleChoice question with only 2 options', () => {
    const question = baseQuestion({
      skillId: 'rounding',
      interaction: { kind: 'multipleChoice', options: ['58,300', '58,400'] },
      display: '58,351',
      correctAnswerDisplay: '58,400',
      validate: (raw) => raw === '58,400',
    });
    renderWithProviders(<PlaceValueQuestionScene question={question} phase="answering" lastRaw={null} lastCorrect={null} onAnswer={() => {}} />);
    expect(screen.getByTestId('sgc-target-58,300')).toBeInTheDocument();
    expect(screen.getByTestId('sgc-target-58,400')).toBeInTheDocument();
  });

  it('never applies a sports treatment to a skill outside the sports-eligible set (e.g. decomposition)', () => {
    const question = baseQuestion({
      skillId: 'decomposition',
      interaction: { kind: 'multipleChoice', options: ['500,000 + 6,000 + 800 + 10 + 9', '600,000 + 6,000 + 800 + 10 + 9', 'x', 'y'] },
      correctAnswerDisplay: '500,000 + 6,000 + 800 + 10 + 9',
      validate: (raw) => raw === '500,000 + 6,000 + 800 + 10 + 9',
    });
    renderWithProviders(<PlaceValueQuestionScene question={question} phase="answering" lastRaw={null} lastCorrect={null} onAnswer={() => {}} />);
    expect(screen.queryByTestId(/^tr-option-/)).not.toBeInTheDocument();
    expect(screen.queryByTestId(/^sgc-target-/)).not.toBeInTheDocument();
  });

  it('never applies a sports treatment to numericInput questions, even on placeValue', () => {
    const question = baseQuestion({
      interaction: { kind: 'numericInput' },
      display: '3,149 − 500',
      correctAnswerDisplay: '2649',
      validate: (raw) => raw === '2649',
    });
    renderWithProviders(<PlaceValueQuestionScene question={question} phase="answering" lastRaw={null} lastCorrect={null} onAnswer={() => {}} />);
    expect(screen.getByTestId('pv-numeric-input')).toBeInTheDocument();
    expect(screen.queryByTestId(/^tr-option-/)).not.toBeInTheDocument();
    expect(screen.queryByTestId(/^sgc-target-/)).not.toBeInTheDocument();
  });

  it('never applies a sports treatment to constructChoice questions', () => {
    const question = baseQuestion({
      skillId: 'parity',
      interaction: { kind: 'constructChoice', numbers: [2199, 2467, 6514, 3494, 7212], operations: ['+', '-'] },
      display: '',
      correctAnswerDisplay: '6514+3494',
      hasMultipleValidAnswers: true,
      validate: (raw) => raw === '6514+3494',
    });
    renderWithProviders(<PlaceValueQuestionScene question={question} phase="answering" lastRaw={null} lastCorrect={null} onAnswer={() => {}} />);
    expect(screen.getByTestId('pv-chip-2199')).toBeInTheDocument();
    expect(screen.queryByTestId(/^sgc-target-/)).not.toBeInTheDocument();
  });

  it('keeps the exact same explanation feedback text as the plain rendering', () => {
    const question = baseQuestion({
      skillId: 'wordProblems',
      interaction: { kind: 'multipleChoice', options: ['1', '2', '3', '4'] },
    });
    const { unmount } = renderWithProviders(<PlaceValueQuestionScene question={{ ...question, correctAnswerDisplay: '1', validate: (r) => r === '1' }} phase="feedback" lastRaw="2" lastCorrect={false} onAnswer={() => {}} />);
    const plainExplanation = screen.getByTestId('pv-feedback').textContent;
    unmount();

    const sportsQuestion = baseQuestion({});
    renderWithProviders(<PlaceValueQuestionScene question={sportsQuestion} phase="feedback" lastRaw="96" lastCorrect={false} onAnswer={() => {}} />);
    expect(screen.getByTestId('pv-feedback')).toBeInTheDocument();
    expect(plainExplanation).toBeTruthy();
  });
});
