import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/testUtils';
import { PlaceValueQuestionScene } from '../PlaceValueQuestionScene';
import type { PlaceValueQuestion } from '../../../src/types/placeValue';

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

describe('PlaceValueQuestionScene — gameMode', () => {
  it('renders the plain option buttons by default (no gameMode prop)', () => {
    const question = baseQuestion({});
    renderWithProviders(<PlaceValueQuestionScene question={question} phase="answering" lastRaw={null} lastCorrect={null} onAnswer={() => {}} />);
    expect(screen.getByTestId('pv-option-90')).toBeInTheDocument();
    expect(screen.queryByTestId('psc-target-90')).not.toBeInTheDocument();
  });

  it('renders the sports picker instead of plain buttons for a short-option multipleChoice question', () => {
    const question = baseQuestion({});
    renderWithProviders(
      <PlaceValueQuestionScene question={question} phase="answering" lastRaw={null} lastCorrect={null} onAnswer={() => {}} gameMode="basketball" />,
    );
    expect(screen.getByTestId('psc-target-90')).toBeInTheDocument();
    expect(screen.queryByTestId('pv-option-90')).not.toBeInTheDocument();
  });

  it('falls back to plain buttons for a multipleChoice question whose options are too long for a basket/goal label, even with gameMode set', () => {
    const question = baseQuestion({
      interaction: {
        kind: 'multipleChoice',
        options: ['35,350, 62,191, 84,588, 86,362', '62,191, 84,588, 86,362, 35,350', '86,362, 35,350, 62,191, 84,588', '62,191, 86,362, 84,588, 35,350'],
      },
      correctAnswerDisplay: '35,350, 62,191, 84,588, 86,362',
      validate: (raw) => raw === '35,350, 62,191, 84,588, 86,362',
    });
    renderWithProviders(
      <PlaceValueQuestionScene question={question} phase="answering" lastRaw={null} lastCorrect={null} onAnswer={() => {}} gameMode="basketball" />,
    );
    expect(screen.getByTestId('pv-option-35,350, 62,191, 84,588, 86,362')).toBeInTheDocument();
    expect(screen.queryByTestId('psc-target-35,350, 62,191, 84,588, 86,362')).not.toBeInTheDocument();
  });

  it('renders a soccer picker plus both compared numbers for a compareSymbol question in gameMode', () => {
    const question = baseQuestion({
      interaction: { kind: 'compareSymbol', left: '2,871', right: '3,276' },
      display: '',
      correctAnswerDisplay: '<',
      validate: (raw) => raw === '<',
    });
    renderWithProviders(
      <PlaceValueQuestionScene question={question} phase="answering" lastRaw={null} lastCorrect={null} onAnswer={() => {}} gameMode="soccer" />,
    );
    expect(screen.getByText('2,871')).toBeInTheDocument();
    expect(screen.getByText('3,276')).toBeInTheDocument();
    expect(screen.getByTestId('psc-target-<')).toBeInTheDocument();
    expect(screen.getByTestId('psc-target-=')).toBeInTheDocument();
    expect(screen.getByTestId('psc-target->')).toBeInTheDocument();
  });

  it('renders translated even/odd labels through the sports picker for an evenOddChoice question in gameMode', () => {
    const question = baseQuestion({
      skillId: 'parity',
      interaction: { kind: 'evenOddChoice' },
      display: '4,254 + 7,203',
      correctAnswerDisplay: 'odd',
      validate: (raw) => raw === 'odd',
    });
    renderWithProviders(
      <PlaceValueQuestionScene question={question} phase="answering" lastRaw={null} lastCorrect={null} onAnswer={() => {}} gameMode="basketball" />,
    );
    expect(screen.getByTestId('psc-target-even')).toBeInTheDocument();
    expect(screen.getByTestId('psc-target-odd')).toBeInTheDocument();
  });

  it('never applies gameMode to numericInput questions — vertical arithmetic and free-entry answers are untouched', () => {
    const question = baseQuestion({
      interaction: { kind: 'numericInput' },
      display: '3,149 − 500',
      correctAnswerDisplay: '2649',
      validate: (raw) => raw === '2649',
    });
    renderWithProviders(
      <PlaceValueQuestionScene question={question} phase="answering" lastRaw={null} lastCorrect={null} onAnswer={() => {}} gameMode="basketball" />,
    );
    expect(screen.getByTestId('pv-numeric-input')).toBeInTheDocument();
    expect(screen.queryByTestId(/^psc-target-/)).not.toBeInTheDocument();
  });

  it('never applies gameMode to constructChoice questions — constructing the answer stays interactive, not a sports pick', () => {
    const question = baseQuestion({
      skillId: 'parity',
      interaction: { kind: 'constructChoice', numbers: [2199, 2467, 6514, 3494, 7212], operations: ['+', '-'] },
      display: '',
      correctAnswerDisplay: '6514+3494',
      hasMultipleValidAnswers: true,
      validate: (raw) => raw === '6514+3494',
    });
    renderWithProviders(
      <PlaceValueQuestionScene question={question} phase="answering" lastRaw={null} lastCorrect={null} onAnswer={() => {}} gameMode="basketball" />,
    );
    expect(screen.getByTestId('pv-chip-2199')).toBeInTheDocument();
    expect(screen.queryByTestId(/^psc-target-/)).not.toBeInTheDocument();
  });

  it('keeps the exact same explanation feedback whether or not gameMode is on', () => {
    const question = baseQuestion({});
    const { unmount } = renderWithProviders(
      <PlaceValueQuestionScene question={question} phase="feedback" lastRaw="96" lastCorrect={false} onAnswer={() => {}} />,
    );
    const standardExplanation = screen.getByTestId('pv-feedback').textContent;
    unmount();

    renderWithProviders(<PlaceValueQuestionScene question={question} phase="feedback" lastRaw="96" lastCorrect={false} onAnswer={() => {}} gameMode="basketball" />);
    const gameModeExplanation = screen.getByTestId('pv-feedback').textContent;

    expect(gameModeExplanation).toBe(standardExplanation);
  });
});
