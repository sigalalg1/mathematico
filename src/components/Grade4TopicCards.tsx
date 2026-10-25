import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Topic } from '../types';
import './Grade4TopicCards.css';

interface Grade4TopicCardsProps {
  topics: Topic[];
  sectionLabel: string;
  titleFor: (topicId: string) => string;
  descriptionFor: (topicId: string) => string;
  comingSoonLabel: string;
}

const TONES = ['violet', 'teal', 'amber'] as const;

export function Grade4TopicCards({
  topics,
  sectionLabel,
  titleFor,
  descriptionFor,
  comingSoonLabel,
}: Grade4TopicCardsProps) {
  return (
    <section className="g4-topics" aria-label={sectionLabel}>
      <div className="g4-doodles" aria-hidden="true">
        <span className="g4-doodle g4-doodle-times" dir="ltr">3 × 4</span>
        <span className="g4-doodle g4-doodle-fraction" dir="ltr">¾</span>
        <span className="g4-doodle g4-doodle-plus" dir="ltr">+</span>
        <span className="g4-doodle g4-doodle-dots">•••</span>
      </div>
      <div className="g4-topic-grid">
        {topics.map((topic, index) => (
          <Grade4TopicCard
            key={topic.id}
            topic={topic}
            title={titleFor(topic.id)}
            description={descriptionFor(topic.id)}
            comingSoonLabel={comingSoonLabel}
            tone={TONES[index % TONES.length]}
          />
        ))}
      </div>
    </section>
  );
}

interface Grade4TopicCardProps {
  topic: Topic;
  title: string;
  description: string;
  comingSoonLabel: string;
  tone: (typeof TONES)[number];
}

function Grade4TopicCard({
  topic,
  title,
  description,
  comingSoonLabel,
  tone,
}: Grade4TopicCardProps) {
  const enabled = topic.enabled && Boolean(topic.path);
  const content = (
    <>
      <span className="g4-card-art" aria-hidden="true">
        <TopicIllustration topicId={topic.id} />
      </span>
      <span className="g4-card-copy">
        <span className="g4-card-title">{title}</span>
        <span className="g4-card-description">
          {description === comingSoonLabel ? '' : description}
        </span>
        {!enabled && <span className="g4-card-badge">{comingSoonLabel}</span>}
      </span>
      {enabled && (
        <span className="g4-card-go" aria-hidden="true">
          <Arrow />
        </span>
      )}
    </>
  );

  const className = `g4-topic-card g4-topic-card-${tone}${enabled ? '' : ' is-disabled'}`;
  return enabled ? (
    <Link className={className} to={topic.path!}>
      {content}
    </Link>
  ) : (
    <div className={className} aria-disabled="true">
      {content}
    </div>
  );
}

function TopicIllustration({ topicId }: { topicId: string }) {
  const illustrations: Record<string, ReactNode> = {
    fractionsPart1: <FractionPizza />,
    multiplication: <MultiplicationBalloons />,
    penaltyShootout: <AdditionGoal />,
  };

  return illustrations[topicId] ?? <FallbackMath />;
}

function FractionPizza() {
  return (
    <svg className="g4-illustration g4-pizza" viewBox="0 0 180 150">
      <ellipse className="g4-art-shadow" cx="88" cy="132" rx="65" ry="10" />
      <g className="g4-pizza-whole">
        <circle className="g4-pizza-crust" cx="83" cy="75" r="57" />
        <circle className="g4-pizza-cheese" cx="83" cy="75" r="47" />
        <path className="g4-pizza-line" d="M83 28v94M36 75h94M50 42l66 66M50 108l66-66" />
        <circle className="g4-pepperoni" cx="65" cy="53" r="7" />
        <circle className="g4-pepperoni" cx="103" cy="54" r="7" />
        <circle className="g4-pepperoni" cx="61" cy="93" r="7" />
        <circle className="g4-pepperoni" cx="102" cy="96" r="7" />
      </g>
      <g className="g4-pizza-slice">
        <path className="g4-pizza-crust" d="M117 27q22 10 36 29l-11 7q-12-15-30-24z" />
        <path className="g4-pizza-cheese" d="m112 39 30 24-49 22z" />
        <circle className="g4-pepperoni" cx="119" cy="60" r="5" />
      </g>
      <path className="g4-spark" d="m157 20 3 8 8 3-8 3-3 8-3-8-8-3 8-3z" />
    </svg>
  );
}

function MultiplicationBalloons() {
  return (
    <svg className="g4-illustration g4-balloons" viewBox="0 0 180 150">
      <ellipse className="g4-art-shadow" cx="90" cy="135" rx="67" ry="9" />
      <path className="g4-balloon-string" d="M53 75q12 28 35 55M126 65q-10 35-38 65M91 78v52" />
      <g className="g4-balloon g4-balloon-one">
        <ellipse cx="52" cy="48" rx="28" ry="34" />
        <path d="m48 81 4 8 5-8z" />
        <text x="52" y="57">6</text>
      </g>
      <g className="g4-balloon g4-balloon-two">
        <ellipse cx="126" cy="40" rx="27" ry="33" />
        <path d="m121 72 5 8 5-8z" />
        <text x="126" y="49">8</text>
      </g>
      <g className="g4-balloon g4-balloon-three">
        <ellipse cx="91" cy="67" rx="27" ry="33" />
        <path d="m86 99 5 8 5-8z" />
        <text x="91" y="76">×</text>
      </g>
      <path className="g4-spark" d="m152 80 3 8 8 3-8 3-3 8-3-8-8-3 8-3z" />
    </svg>
  );
}

function AdditionGoal() {
  return (
    <svg className="g4-illustration g4-goal" viewBox="0 0 180 150">
      <ellipse className="g4-art-shadow" cx="92" cy="134" rx="71" ry="9" />
      <path className="g4-goal-frame" d="M28 112V34h123v78M29 49h121M51 35v77M76 35v77M101 35v77M126 35v77M28 70h123M28 91h123" />
      <g className="g4-football">
        <circle cx="97" cy="91" r="29" />
        <path d="m97 78 11 8-4 13H90l-4-13zM97 62v16M70 82l16 4M124 82l-16 4M80 111l10-12M114 111l-10-12" />
      </g>
      <g className="g4-score">
        <rect x="15" y="14" width="48" height="31" rx="10" />
        <text x="39" y="36">+</text>
      </g>
      <path className="g4-spark" d="m155 18 3 8 8 3-8 3-3 8-3-8-8-3 8-3z" />
    </svg>
  );
}

function FallbackMath() {
  return (
    <svg className="g4-illustration" viewBox="0 0 180 150">
      <ellipse className="g4-art-shadow" cx="90" cy="132" rx="62" ry="9" />
      <rect className="g4-fallback-tile" x="38" y="28" width="104" height="88" rx="25" />
      <text className="g4-fallback-mark" x="90" y="87">×</text>
    </svg>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="m9 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
