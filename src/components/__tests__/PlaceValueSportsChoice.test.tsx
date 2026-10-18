import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/testUtils';
import { PlaceValueSportsChoice } from '../PlaceValueSportsChoice';

const OPTIONS = [
  { value: '90', label: '90' },
  { value: '96', label: '96' },
  { value: '87', label: '87' },
  { value: '94', label: '94' },
];

describe('PlaceValueSportsChoice', () => {
  it('renders one target per option, regardless of count (basketball)', () => {
    renderWithProviders(
      <PlaceValueSportsChoice sport="basketball" options={OPTIONS} validate={(raw) => raw === '90'} locked={false} lastRaw={null} answered={false} onAnswer={() => {}} />,
    );
    for (const option of OPTIONS) {
      expect(screen.getByTestId(`psc-target-${option.value}`)).toBeInTheDocument();
    }
  });

  it('renders exactly two targets for a 2-option soccer question', () => {
    renderWithProviders(
      <PlaceValueSportsChoice
        sport="soccer"
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
    expect(screen.getByTestId('psc-target-<')).toBeInTheDocument();
    expect(screen.getByTestId('psc-target->')).toBeInTheDocument();
  });

  it('calls onAnswer with the clicked option value', () => {
    const onAnswer = vi.fn();
    renderWithProviders(
      <PlaceValueSportsChoice sport="basketball" options={OPTIONS} validate={(raw) => raw === '90'} locked={false} lastRaw={null} answered={false} onAnswer={onAnswer} />,
    );
    fireEvent.click(screen.getByTestId('psc-target-96'));
    expect(onAnswer).toHaveBeenCalledWith('96');
  });

  it('never calls onAnswer while locked', () => {
    const onAnswer = vi.fn();
    renderWithProviders(
      <PlaceValueSportsChoice sport="basketball" options={OPTIONS} validate={(raw) => raw === '90'} locked onAnswer={onAnswer} lastRaw={null} answered={false} />,
    );
    fireEvent.click(screen.getByTestId('psc-target-90'));
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it('marks the true correct target via validate, not the clicked one, once answered', () => {
    renderWithProviders(
      <PlaceValueSportsChoice sport="soccer" options={OPTIONS} validate={(raw) => raw === '90'} locked lastRaw="96" answered onAnswer={() => {}} />,
    );
    expect(screen.getByTestId('psc-target-90')).toHaveClass('is-correct');
    expect(screen.getByTestId('psc-target-96')).toHaveClass('is-wrong');
    expect(screen.getByTestId('psc-target-87')).not.toHaveClass('is-correct');
    expect(screen.getByTestId('psc-target-87')).not.toHaveClass('is-wrong');
  });

  it('disables every target while locked', () => {
    renderWithProviders(<PlaceValueSportsChoice sport="basketball" options={OPTIONS} validate={(raw) => raw === '90'} locked lastRaw={null} answered={false} onAnswer={() => {}} />);
    for (const option of OPTIONS) {
      expect(screen.getByTestId(`psc-target-${option.value}`)).toBeDisabled();
    }
  });

  it('renders translated/custom ReactNode labels, not just the raw value', () => {
    renderWithProviders(
      <PlaceValueSportsChoice
        sport="basketball"
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
    expect(screen.getByTestId('psc-target-even')).toHaveTextContent('Even');
    expect(screen.getByTestId('psc-target-odd')).toHaveTextContent('Odd');
  });
});
