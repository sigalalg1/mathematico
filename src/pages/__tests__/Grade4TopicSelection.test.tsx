import { afterEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import App from '../../App';
import i18n from '../../i18n';
import { Grade4TopicCards } from '../../components/Grade4TopicCards';
import { getTopicsForGrade } from '../../data/topics';
import { renderWithProviders, resetLanguage, useLanguage } from '../../test/testUtils';

const grade4Topics = getTopicsForGrade(4);

afterEach(async () => {
  await resetLanguage();
});

describe('Grade 4 topic selection', () => {
  it('renders every real visible topic once, in data order, with its real route', () => {
    const { container } = renderWithProviders(<App />, ['/grade/4']);
    const section = screen.getByRole('region', { name: i18n.t('app.chooseTopic') });
    const cards = within(section).getAllByRole('link');

    expect(cards).toHaveLength(grade4Topics.length);
    cards.forEach((card, index) => {
      const topic = grade4Topics[index];
      expect(card).toHaveAttribute('href', topic.path);
      expect(card).toHaveTextContent(i18n.t(`topics.${topic.id}.name`));
      expect(card).toHaveTextContent(i18n.t(`topics.${topic.id}.description`));
    });

    expect(container.querySelectorAll('.g4-pizza')).toHaveLength(1);
    expect(container.querySelectorAll('.g4-balloons')).toHaveLength(1);
    expect(container.querySelectorAll('.g4-goal')).toHaveLength(1);
  });

  it('does not expose hidden topics or invented reward content', () => {
    renderWithProviders(<App />, ['/grade/4']);

    expect(screen.queryByText(i18n.t('topics.divisionWithRemainder.name'))).not.toBeInTheDocument();
    expect(screen.queryByText(i18n.t('topics.simpleFractions.name'))).not.toBeInTheDocument();
    expect(screen.queryByText(/coins?|xp|leaderboard|troph/i)).not.toBeInTheDocument();
  });

  it('uses Hebrew labels in the RTL document', () => {
    renderWithProviders(<App />, ['/grade/4']);

    expect(document.documentElement.dir).toBe('rtl');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('בחרו נושא');
    expect(screen.getByRole('link', { name: /שברים – חלק א׳/ })).toHaveAttribute(
      'href',
      '/grade/4/fractions-part-1',
    );
  });

  it('uses English labels and routes unchanged in LTR', async () => {
    await useLanguage('en');
    renderWithProviders(<App />, ['/grade/4']);

    expect(document.documentElement.dir).toBe('ltr');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Choose a topic');
    expect(screen.getByRole('link', { name: /Penalty Shootout/ })).toHaveAttribute(
      'href',
      '/grade/4/penalty-shootout',
    );
  });

  it('keeps unavailable topics non-interactive and visibly labelled', () => {
    renderWithProviders(
      <Grade4TopicCards
        topics={[{ id: 'fractions', gradeId: 4, enabled: false }]}
        sectionLabel="Choose a topic"
        titleFor={() => 'Fractions'}
        descriptionFor={() => 'Coming soon'}
        comingSoonLabel="Coming soon"
      />,
    );

    const section = screen.getByRole('region', { name: 'Choose a topic' });
    expect(within(section).queryByRole('link')).not.toBeInTheDocument();
    expect(within(section).getByText('Coming soon')).toBeInTheDocument();
    expect(section.querySelector('[aria-disabled="true"]')).toBeInTheDocument();
  });
});
