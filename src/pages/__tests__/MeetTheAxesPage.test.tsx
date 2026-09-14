import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/testUtils';
import i18n from '../../i18n';
import { MeetTheAxesPage } from '../MeetTheAxesPage';
import { CoordinateVocabularyPage } from '../CoordinateVocabularyPage';

// Keep the question order fixed so the expected answers are known.
vi.mock('../../utils/shuffle', () => ({ shuffle: <T,>(items: T[]): T[] => [...items] }));

const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options) as string;
const progress = () => screen.getByRole('progressbar').getAttribute('aria-valuenow');

describe('Meet the Axes', () => {
  it('asks the student to click the horizontal axis on an accessible coordinate plane', () => {
    renderWithProviders(<MeetTheAxesPage />);
    expect(screen.getByText(t('exercises.meetTheAxes.questions.horizontalAxis.prompt'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('vocabulary.targets.xAxis') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('vocabulary.targets.yAxis') })).toBeInTheDocument();
  });

  it('confirms a correct axis pick and progresses on Next', () => {
    renderWithProviders(<MeetTheAxesPage />);
    fireEvent.click(screen.getByRole('button', { name: t('vocabulary.targets.xAxis') }));
    expect(screen.getByText(t('quiz.feedback.correctTitle'))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: t('quiz.actions.next') }));
    expect(progress()).toBe('2');
    expect(screen.getByText(t('exercises.meetTheAxes.questions.verticalAxis.prompt'))).toBeInTheDocument();
  });

  it('explains the mistake on a wrong axis pick without advancing by itself', () => {
    renderWithProviders(<MeetTheAxesPage />);
    fireEvent.click(screen.getByRole('button', { name: t('vocabulary.targets.yAxis') }));

    expect(screen.getByText(t('quiz.feedback.incorrectTitle'))).toBeInTheDocument();
    expect(screen.getByText(t('exercises.meetTheAxes.questions.horizontalAxis.explanation'))).toBeInTheDocument();
    expect(progress()).toBe('1');
  });

  it('runs through every question to the completion screen', () => {
    renderWithProviders(<MeetTheAxesPage />);
    const answers = ['xAxis', 'yAxis', 'right', 'up', 'left', 'down'];
    const names: Record<string, string> = {
      xAxis: t('vocabulary.targets.xAxis'),
      yAxis: t('vocabulary.targets.yAxis'),
      right: t('exercises.meetTheAxes.options.right'),
      up: t('exercises.meetTheAxes.options.up'),
      left: t('exercises.meetTheAxes.options.left'),
      down: t('exercises.meetTheAxes.options.down'),
    };

    for (const answer of answers) {
      fireEvent.click(screen.getByRole('button', { name: names[answer] }));
      fireEvent.click(
        screen.getByRole('button', { name: new RegExp(`^(${t('quiz.actions.next')}|${t('quiz.actions.finish')})$`) }),
      );
    }

    expect(screen.getByText(t('quiz.completion.title'))).toBeInTheDocument();
    expect(screen.getByText(t('quiz.completion.score', { score: 6, total: 6 }))).toBeInTheDocument();
  });
});

describe('Coordinate Vocabulary', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('teaches first, then moves into practice questions', () => {
    renderWithProviders(<CoordinateVocabularyPage />);
    // Learn phase shows a "continue" control rather than answer options.
    const continueButton = screen.getByRole('button', { name: t('quiz.actions.gotIt') });
    expect(continueButton).toBeInTheDocument();
    expect(progress()).toBe('1');
  });

  it('skips straight to practice once the intro has been seen', () => {
    localStorage.setItem('mathematico-vocab-intro-seen', 'true');
    renderWithProviders(<CoordinateVocabularyPage />);
    expect(screen.queryByRole('button', { name: t('quiz.actions.gotIt') })).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
