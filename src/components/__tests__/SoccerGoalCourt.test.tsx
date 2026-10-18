import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/testUtils';
import { SoccerGoalCourt } from '../SoccerGoalCourt';

const OPTIONS = [
  { value: '90', label: '90' },
  { value: '96', label: '96' },
  { value: '87', label: '87' },
  { value: '94', label: '94' },
];

describe('SoccerGoalCourt', () => {
  it('renders one goal target per option', () => {
    renderWithProviders(<SoccerGoalCourt options={OPTIONS} validate={(raw) => raw === '90'} locked={false} lastRaw={null} answered={false} onAnswer={() => {}} />);
    for (const option of OPTIONS) {
      expect(screen.getByTestId(`sgc-target-${option.value}`)).toBeInTheDocument();
    }
  });

  it('renders exactly two targets for a 2-option question', () => {
    renderWithProviders(
      <SoccerGoalCourt
        options={[
          { value: '<', label: '<' },
          { value: '>', label: '>' },
        ]}
        validate={(raw) => raw === '<'}
        locked={false}
        lastRaw={null}
        answered={false}
        onAnswer={() => {}}
      />,
    );
    expect(screen.getByTestId('sgc-target-<')).toBeInTheDocument();
    expect(screen.getByTestId('sgc-target->')).toBeInTheDocument();
  });

  it('calls onAnswer immediately with the kicked option value, before the result animation resolves', () => {
    const onAnswer = vi.fn();
    renderWithProviders(<SoccerGoalCourt options={OPTIONS} validate={(raw) => raw === '90'} locked={false} lastRaw={null} answered={false} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByTestId('sgc-target-96'));
    expect(onAnswer).toHaveBeenCalledWith('96');
  });

  it('never calls onAnswer while locked', () => {
    const onAnswer = vi.fn();
    renderWithProviders(<SoccerGoalCourt options={OPTIONS} validate={(raw) => raw === '90'} locked onAnswer={onAnswer} lastRaw={null} answered={false} />);
    fireEvent.click(screen.getByTestId('sgc-target-90'));
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it('disables the other targets mid-kick, and shows the goal/save result banner', async () => {
    renderWithProviders(<SoccerGoalCourt options={OPTIONS} validate={(raw) => raw === '90'} locked={false} lastRaw={null} answered={false} onAnswer={() => {}} />);
    fireEvent.click(screen.getByTestId('sgc-target-90'));
    expect(screen.getByTestId('sgc-target-96')).toBeDisabled();
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument(), { timeout: 2000 });
  });

  it('marks the true correct target via validate, not the clicked one, once answered', () => {
    renderWithProviders(<SoccerGoalCourt options={OPTIONS} validate={(raw) => raw === '90'} locked lastRaw="96" answered onAnswer={() => {}} />);
    expect(screen.getByTestId('sgc-target-90')).toHaveClass('is-correct');
    expect(screen.getByTestId('sgc-target-96')).toHaveClass('is-wrong');
  });

  it('disables every target while locked', () => {
    renderWithProviders(<SoccerGoalCourt options={OPTIONS} validate={(raw) => raw === '90'} locked lastRaw={null} answered={false} onAnswer={() => {}} />);
    for (const option of OPTIONS) {
      expect(screen.getByTestId(`sgc-target-${option.value}`)).toBeDisabled();
    }
  });

  it('renders translated/custom ReactNode labels, not just the raw value', () => {
    renderWithProviders(
      <SoccerGoalCourt
        options={[
          { value: 'even', label: 'Even' },
          { value: 'odd', label: 'Odd' },
        ]}
        validate={(raw) => raw === 'even'}
        locked={false}
        lastRaw={null}
        answered={false}
        onAnswer={() => {}}
      />,
    );
    expect(screen.getByTestId('sgc-target-even')).toHaveTextContent('Even');
    expect(screen.getByTestId('sgc-target-odd')).toHaveTextContent('Odd');
  });
});
