import { useTranslation } from 'react-i18next';
import { Navigate, useParams } from 'react-router-dom';
import { BasketballMonkeyCourt } from '../components/BasketballMonkeyCourt';
import { MonkeyBalloonScene } from '../components/MonkeyBalloonScene';
import { SoundToggle } from '../components/SoundToggle';
import { useSound } from '../audio/useSound';
import { ARITHMETIC_FLUENCY_PATH } from '../data/games';
import {
  findArithmeticSkillBySlug,
  getArithmeticActivity,
  type ArithmeticSkillPresentation,
} from '../data/games/arithmeticFluencyData';
import { TrainingActivityScreen } from '../training/components/TrainingActivityScreen';
import type { TrainingQuestionRenderProps } from '../training/components/TrainingPlayScreen';

/**
 * The balloon scene's dart flight plus its pop (or its bounce) run a little
 * longer than the plain answer buttons need, so the feedback beat is stretched
 * to let the animation finish. The engine excludes every feedback beat from the
 * child's measured think time, so a longer one cannot cost them their pace.
 */
const BALLOON_FEEDBACK_TIMING = { correct: 900, wrong: 1400 };

/**
 * One grade 2 fluency skill, rendered inside whichever monkey game the skill is
 * presented in.
 *
 * Both games are plugged in the same way: the arithmetic generator feeds a
 * normal training session, and the game only ever sees a prompt, a set of
 * options and which one is right. Neither scene contains a single line of
 * arithmetic — the identical wiring drives the multiplication versions.
 */
export function ArithmeticFluencyActivityPage() {
  const { activityId } = useParams<{ activityId: string }>();
  const skill = findArithmeticSkillBySlug(activityId);

  if (!skill) return <Navigate to={ARITHMETIC_FLUENCY_PATH} replace />;
  return skill.scene === 'balloons' ? <BalloonSkill skill={skill} /> : <CourtSkill skill={skill} />;
}

/** Shared page-shell wiring, so the two scenes differ only in what wraps them. */
function useSkillScreenProps(skill: ArithmeticSkillPresentation) {
  const { t } = useTranslation();
  const prefix = `arithmeticFluency.skills.${skill.skillId}`;

  return {
    activity: getArithmeticActivity(skill.skillId),
    titleKey: `${prefix}.gameName`,
    promptKey: `${prefix}.prompt`,
    contextLabel: t('grades.2'),
    backTo: ARITHMETIC_FLUENCY_PATH,
    backLabel: t('arithmeticFluencyPage.title'),
  };
}

function BalloonSkill({ skill }: { skill: ArithmeticSkillPresentation }) {
  const screen = useSkillScreenProps(skill);
  const { enabled, play, toggle } = useSound();

  const renderQuestion = ({ question, phase, index, promptLabel, submit }: TrainingQuestionRenderProps) => (
    // `.mb-game` carries the scene's colour variables.
    <div className="mb-game">
      <MonkeyBalloonScene
        prompt={question.prompt}
        promptLabel={promptLabel}
        options={question.options}
        correctAnswer={question.answer}
        // A new question is a fresh scene; the balloons never carry over.
        resetKey={`${index}-${question.id}`}
        // The session, not the scene, decides when to move on: the scene just
        // finishes its animation while the shared feedback beat plays out.
        locked={phase !== 'answering'}
        onShoot={submit}
        // Progress lives in the shared HUD above, so the scene's own bar is
        // left off and the top strip carries only the sound control.
        hudExtra={<SoundToggle enabled={enabled} onToggle={toggle} />}
        play={play}
      />
    </div>
  );

  return <TrainingActivityScreen {...screen} renderQuestion={renderQuestion} feedbackTiming={BALLOON_FEEDBACK_TIMING} />;
}

function CourtSkill({ skill }: { skill: ArithmeticSkillPresentation }) {
  const screen = useSkillScreenProps(skill);

  return (
    <BasketballMonkeyCourt>
      <TrainingActivityScreen {...screen} />
    </BasketballMonkeyCourt>
  );
}
