import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders, resetLanguage, useLanguage } from '../../test/testUtils';
import i18n from '../../i18n';
import App from '../../App';
import { arithmeticFluencyGames } from '../../data/games';
import { ARITHMETIC_SKILL_PRESENTATION, MINUS } from '../../data/games/arithmeticFluencyData';

/**
 * End-to-end cover for the plug-in architecture: the grade 2 arithmetic
 * generator feeding a generic training session, drawn by whichever monkey game
 * the skill is presented in. Nothing here mocks the generator — a real session
 * is played, and the expected answer is worked out from the prompt on screen,
 * so the arithmetic and the rendering are checked together.
 */

const BALLOON_ROUTE = '/grade/2/arithmetic-fluency/facts-to-20';
const CARRY_ROUTE = '/grade/2/arithmetic-fluency/addition-regrouping';
const COURT_ROUTE = '/grade/2/arithmetic-fluency/two-digit';
const BORROW_ROUTE = '/grade/2/arithmetic-fluency/subtraction-regrouping';

/** The answer to whatever expression is currently on screen. */
function expectedAnswerFrom(factText: string): number {
  const match = factText.match(/(\d+)\s*([+−-])\s*(\d+)/);
  if (!match) throw new Error(`no expression found in "${factText}"`);
  const [, left, operator, right] = match;
  return operator === '+' ? Number(left) + Number(right) : Number(left) - Number(right);
}

function balloonFact(): string {
  return screen.getByTestId('mb-question').querySelector('.mb-fact')!.textContent ?? '';
}

function courtFact(): string {
  return screen.getByTestId('tr-question').textContent ?? '';
}

function start(count?: number) {
  if (count !== undefined) fireEvent.click(screen.getByTestId(`tr-count-${count}`));
  fireEvent.click(screen.getByTestId('tr-start'));
}

/** One balloon shot: the dart's flight, the pop, then the shared feedback beat. */
function settleBalloon() {
  act(() => vi.advanceTimersByTime(1500));
}

describe('grade 2 arithmetic fluency — the balloon scene as a training renderer', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await resetLanguage();
  });

  it('offers the shared fluency setup: practice/challenge, three levels, four lengths', () => {
    renderWithProviders(<App />, [BALLOON_ROUTE]);

    expect(screen.getByTestId('tr-mode-practice')).toBeInTheDocument();
    expect(screen.getByTestId('tr-mode-challenge')).toBeInTheDocument();
    for (const difficulty of ['basic', 'intermediate', 'hard']) {
      expect(screen.getByTestId(`tr-difficulty-${difficulty}`)).toBeInTheDocument();
    }
    for (const count of [5, 10, 20, 50]) {
      expect(screen.getByTestId(`tr-count-${count}`)).toBeInTheDocument();
    }
  });

  it('draws the arithmetic question as balloons and pops the right one', () => {
    renderWithProviders(<App />, [BALLOON_ROUTE]);
    start(5);

    const answer = expectedAnswerFrom(balloonFact());
    expect(screen.getAllByTestId(/^mb-balloon-/)).toHaveLength(4);
    expect(screen.getByTestId('mb-monkey')).toHaveAttribute('data-pose', 'idle');

    fireEvent.click(screen.getByTestId(`mb-balloon-${answer}`));
    // The dart is in the air and the monkey is aiming.
    expect(screen.getByTestId('mb-dart')).toBeInTheDocument();
    expect(screen.getByTestId('mb-monkey')).toHaveAttribute('data-pose', 'aiming');

    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByTestId('mb-burst')).toBeInTheDocument();
    expect(screen.getByTestId('mb-monkey')).toHaveAttribute('data-pose', 'happy');

    act(() => vi.advanceTimersByTime(1200));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
  });

  it('counts a wrong balloon as incorrect and carries on — it never eliminates', () => {
    renderWithProviders(<App />, [BALLOON_ROUTE]);
    start(5);

    const answer = expectedAnswerFrom(balloonFact());
    const wrong = screen
      .getAllByTestId(/^mb-balloon-/)
      .find((balloon) => balloon.dataset.testid !== `mb-balloon-${answer}`)!;

    fireEvent.click(wrong);
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByTestId('mb-monkey')).toHaveAttribute('data-pose', 'puzzled');
    // The shared feedback line still reveals the right answer.
    expect(screen.getByRole('status')).toHaveTextContent(String(answer));

    settleBalloon();
    // The session moved on rather than ending or repeating the question.
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
  });

  it('plays a whole five-question session through to the shared results screen', () => {
    renderWithProviders(<App />, [BALLOON_ROUTE]);
    start(5);

    for (let i = 0; i < 5; i += 1) {
      fireEvent.click(screen.getByTestId(`mb-balloon-${expectedAnswerFrom(balloonFact())}`));
      settleBalloon();
    }

    expect(screen.getByTestId('tr-results')).toBeInTheDocument();
    expect(screen.getByText('5/5')).toBeInTheDocument();
  });

  it('only ever asks carrying questions in the regrouping skill, and they all add up', () => {
    renderWithProviders(<App />, [CARRY_ROUTE]);
    start(5);

    for (let i = 0; i < 5; i += 1) {
      const fact = balloonFact();
      const [, left, , right] = fact.match(/(\d+)\s*([+−-])\s*(\d+)/)!;
      // The skill's whole promise: the ones column always overflows.
      expect((Number(left) % 10) + (Number(right) % 10)).toBeGreaterThanOrEqual(10);
      fireEvent.click(screen.getByTestId(`mb-balloon-${expectedAnswerFrom(fact)}`));
      settleBalloon();
    }

    expect(screen.getByTestId('tr-results')).toBeInTheDocument();
  });

  it('shows the challenge timer and streak, and restricts challenge lengths', () => {
    renderWithProviders(<App />, [BALLOON_ROUTE]);
    fireEvent.click(screen.getByTestId('tr-mode-challenge'));

    expect(screen.queryByTestId('tr-count-5')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tr-count-10')).not.toBeInTheDocument();
    expect(screen.getByTestId('tr-count-20')).toBeInTheDocument();
    expect(screen.getByTestId('tr-count-50')).toBeInTheDocument();

    start();
    expect(screen.getByTestId('tr-streak')).toBeInTheDocument();
    expect(screen.getByTestId('tr-timer')).toBeInTheDocument();
  });
});

describe('grade 2 arithmetic fluency — the basketball court as a training renderer', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await resetLanguage();
  });

  it('renders the arithmetic question on the court and scores the right hoop', async () => {
    const { container } = renderWithProviders(<App />, [COURT_ROUTE]);
    start(5);

    expect(container.querySelector('.basketball-shell')).toBeInTheDocument();
    expect(container.querySelector('.bm-player')).toBeInTheDocument();

    const answer = expectedAnswerFrom(courtFact());
    fireEvent.click(screen.getByTestId(`tr-option-${answer}`));
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.querySelector('.basketball-shell')).toHaveAttribute('data-shot-result', 'correct');
    expect(screen.getByTestId(`tr-option-${answer}`)).toHaveClass('tr-option-correct');

    await act(async () => vi.advanceTimersByTime(450));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
  });

  it('only ever asks borrowing questions in the regrouping skill', async () => {
    renderWithProviders(<App />, [BORROW_ROUTE]);
    start(5);

    for (let i = 0; i < 5; i += 1) {
      const fact = courtFact();
      const [, left, , right] = fact.match(/(\d+)\s*([+−-])\s*(\d+)/)!;
      // The ones column always has to be broken open, and never goes negative.
      expect(Number(left) % 10).toBeLessThan(Number(right) % 10);
      expect(Number(left)).toBeGreaterThan(Number(right));
      fireEvent.click(screen.getByTestId(`tr-option-${expectedAnswerFrom(fact)}`));
      await act(async () => vi.advanceTimersByTime(450));
    }

    expect(screen.getByTestId('tr-results')).toBeInTheDocument();
  });
});

describe('grade 2 arithmetic fluency — navigation and language', () => {
  beforeEach(() => localStorage.clear());
  afterEach(async () => {
    await resetLanguage();
  });

  it('shows grade 2 on the home page now that it has real content', () => {
    renderWithProviders(<App />, ['/']);
    expect(screen.getByRole('link', { name: new RegExp(i18n.t('grades.2')) })).toBeInTheDocument();
  });

  it('lists the unit on the grade 2 page and its four skills inside it', () => {
    renderWithProviders(<App />, ['/grade/2']);
    expect(screen.getByText(i18n.t('topics.arithmeticFluency.name'))).toBeInTheDocument();

    renderWithProviders(<App />, ['/grade/2/arithmetic-fluency']);
    for (const game of arithmeticFluencyGames) {
      expect(screen.getByText(i18n.t(game.nameKey))).toBeInTheDocument();
    }
  });

  it('routes every skill slug to its own activity', () => {
    for (const { skillId, slug } of ARITHMETIC_SKILL_PRESENTATION) {
      const { unmount } = renderWithProviders(<App />, [`/grade/2/arithmetic-fluency/${slug}`]);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        i18n.t(`arithmeticFluency.skills.${skillId}.gameName`),
      );
      unmount();
    }
  });

  it('sends an unknown skill slug back to the unit listing', () => {
    renderWithProviders(<App />, ['/grade/2/arithmetic-fluency/not-a-skill']);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(i18n.t('arithmeticFluencyPage.title'));
  });

  it('renders Hebrew RTL with the expression still left to right', () => {
    const { container } = renderWithProviders(<App />, [BALLOON_ROUTE]);
    expect(document.documentElement.dir).toBe('rtl');
    start(5);

    const fact = container.querySelector('.mb-fact')!;
    expect(fact).toHaveAttribute('dir', 'ltr');
    // Operands read in natural numeric order regardless of the page direction.
    expect(fact.textContent).toMatch(/^\d+[+−]\d+=\?$/);
  });

  it('renders English LTR without leaking raw keys', async () => {
    await useLanguage('en');
    renderWithProviders(<App />, [COURT_ROUTE]);

    expect(document.documentElement.dir).toBe('ltr');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Two Digits, No Regrouping');
    expect(screen.queryByText(/arithmeticFluency\./)).not.toBeInTheDocument();
  });

  it('uses a real minus sign, not a hyphen, in subtraction prompts', () => {
    renderWithProviders(<App />, [BORROW_ROUTE]);
    start(5);
    expect(screen.getByTestId('tr-question').textContent).toContain(MINUS);
  });
});
