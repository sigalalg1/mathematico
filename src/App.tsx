import { Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { GradePage } from './pages/GradePage';
import { ArithmeticFluencyPage } from './pages/ArithmeticFluencyPage';
import { ArithmeticFluencyActivityPage } from './pages/ArithmeticFluencyActivityPage';
import { CoordinateSystemPage } from './pages/CoordinateSystemPage';
import { DivisionWithRemainderPage } from './pages/DivisionWithRemainderPage';
import { SimpleFractionsPage } from './pages/SimpleFractionsPage';
import { MultiplicationPage } from './pages/MultiplicationPage';
import { MonkeyBalloonShooterPage } from './pages/MonkeyBalloonShooterPage';
import { MultiplicationTablesPage } from './pages/MultiplicationTablesPage';
import { CoordinateVocabularyPage } from './pages/CoordinateVocabularyPage';
import { MeetTheAxesPage } from './pages/MeetTheAxesPage';
import { HitTheTargetPage } from './pages/HitTheTargetPage';
import { LaunchSpaceshipPage } from './pages/LaunchSpaceshipPage';
import { QuadrantChallengePage } from './pages/QuadrantChallengePage';
import { CoordinateDetectivePage } from './pages/CoordinateDetectivePage';
import { FindThePointPage } from './pages/FindThePointPage';
import { DistancesSegmentsPage } from './pages/DistancesSegmentsPage';
import { ShapesOnPlanePage } from './pages/ShapesOnPlanePage';
import { CoordinateMissionPage } from './pages/CoordinateMissionPage';
import { DrawByCoordinatesPage } from './pages/DrawByCoordinatesPage';
import { CoordinateScalePage } from './pages/CoordinateScalePage';
import { SignedNumbersPage } from './pages/SignedNumbersPage';
import { NumberLinePlacePage } from './pages/NumberLinePlacePage';
import { CompareSignedPage } from './pages/CompareSignedPage';
import { AbsoluteValuePage } from './pages/AbsoluteValuePage';
import { SignedAddSubPage } from './pages/SignedAddSubPage';
import { SignRulesPage } from './pages/SignRulesPage';
import { AlgebraPage } from './pages/AlgebraPage';
import { AlgebraPatternsPage } from './pages/AlgebraPatternsPage';
import { AlgebraExpressionsPage } from './pages/AlgebraExpressionsPage';
import { AlgebraSubstitutionPage } from './pages/AlgebraSubstitutionPage';
import { AlgebraEquivalentPage } from './pages/AlgebraEquivalentPage';
import { AlgebraLikeTermsPage } from './pages/AlgebraLikeTermsPage';
import { AlgebraEquationMeaningPage } from './pages/AlgebraEquationMeaningPage';
import { AlgebraSolvingPage } from './pages/AlgebraSolvingPage';
import { AlgebraWordProblemsPage } from './pages/AlgebraWordProblemsPage';
import { DecimalExamPrepPage } from './pages/DecimalExamPrepPage';
import { DecimalPlaceValuePage } from './pages/DecimalPlaceValuePage';
import { DecimalDecompositionPage } from './pages/DecimalDecompositionPage';
import { DecimalOrderingPage } from './pages/DecimalOrderingPage';
import { DecimalRoundingPage } from './pages/DecimalRoundingPage';
import { DecimalArithmeticPage } from './pages/DecimalArithmeticPage';
import { DecimalParityPage } from './pages/DecimalParityPage';
import { DecimalConstraintsPage } from './pages/DecimalConstraintsPage';
import { DecimalWordProblemsPage } from './pages/DecimalWordProblemsPage';
import { DecimalDiagnosticPage } from './pages/DecimalDiagnosticPage';
import { DecimalMockExamPage } from './pages/DecimalMockExamPage';
import { AccountPage } from './pages/AccountPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ActivityPage } from './pages/ActivityPage';
import { useDocumentDirection } from './i18n/useDocumentDirection';
import { PenaltyShootoutPage } from './pages/PenaltyShootoutPage';
import { FractionsPart1Page } from './pages/FractionsPart1Page';
import { FractionsPart1ActivityPage } from './pages/FractionsPart1ActivityPage';
import { GeometryAnglesTrianglesPage } from './pages/GeometryAnglesTrianglesPage';
import { GeometryActivityPage } from './pages/GeometryActivityPage';
import { GeometryGrade7Page } from './pages/GeometryGrade7Page';
import { AnglesIdentifyPage } from './pages/AnglesIdentifyPage';
import { AnglesTypesPage } from './pages/AnglesTypesPage';
import { AnglesNotationPage } from './pages/AnglesNotationPage';
import { AnglesComparePage } from './pages/AnglesComparePage';
import { AnglesConstructPage } from './pages/AnglesConstructPage';
import { AnglesMeasurePage } from './pages/AnglesMeasurePage';
import { AnglesQuickRecapPage } from './pages/AnglesQuickRecapPage';
import { BasketballMonkeyPage } from './pages/BasketballMonkeyPage';
import { DevEnvironmentBanner } from './components/DevEnvironmentBanner';

function App() {
  useDocumentDirection();

  return (
    <>
      <DevEnvironmentBanner />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/grade/:gradeId" element={<GradePage />} />
        <Route path="/grade/2/arithmetic-fluency" element={<ArithmeticFluencyPage />} />
        <Route path="/grade/2/arithmetic-fluency/:activityId" element={<ArithmeticFluencyActivityPage />} />
        <Route path="/grade/4/division-with-remainder" element={<DivisionWithRemainderPage />} />
        <Route path="/grade/3/geometry-angles-triangles" element={<GeometryAnglesTrianglesPage />} />
        <Route path="/grade/3/geometry-angles-triangles/:activityId" element={<GeometryActivityPage />} />
        <Route path="/grade/4/penalty-shootout" element={<PenaltyShootoutPage />} />
        <Route path="/grade/4/simple-fractions" element={<SimpleFractionsPage />} />
        <Route path="/grade/4/fractions-part-1" element={<FractionsPart1Page />} />
        <Route path="/grade/4/fractions-part-1/:activityId" element={<FractionsPart1ActivityPage />} />
        <Route path="/grade/4/multiplication" element={<MultiplicationPage />} />
        <Route path="/grade/4/multiplication/multiplication-tables" element={<MultiplicationTablesPage />} />
        <Route path="/grade/4/multiplication/basketball-monkey" element={<BasketballMonkeyPage />} />
        <Route path="/grade/4/multiplication/monkey-balloon-shooter" element={<MonkeyBalloonShooterPage />} />
        <Route path="/grade/7/coordinate-system" element={<CoordinateSystemPage />} />
        <Route path="/grade/7/coordinate-system/coordinate-vocabulary" element={<CoordinateVocabularyPage />} />
        <Route path="/grade/7/coordinate-system/meet-the-axes" element={<MeetTheAxesPage />} />
        <Route path="/grade/7/coordinate-system/hit-the-target" element={<HitTheTargetPage />} />
        <Route path="/grade/7/coordinate-system/launch-the-spaceship" element={<LaunchSpaceshipPage />} />
        <Route path="/grade/7/coordinate-system/quadrant-challenge" element={<QuadrantChallengePage />} />
        <Route path="/grade/7/coordinate-system/coordinate-detective" element={<CoordinateDetectivePage />} />
        <Route path="/grade/7/coordinate-system/find-the-point" element={<FindThePointPage />} />
        <Route path="/grade/7/coordinate-system/distances-segments" element={<DistancesSegmentsPage />} />
        <Route path="/grade/7/coordinate-system/shapes-on-plane" element={<ShapesOnPlanePage />} />
        <Route path="/grade/7/coordinate-system/coordinate-mission" element={<CoordinateMissionPage />} />
        <Route path="/grade/7/coordinate-system/draw-by-coordinates" element={<DrawByCoordinatesPage />} />
        <Route path="/grade/7/coordinate-system/coordinate-scale" element={<CoordinateScalePage />} />
        <Route path="/grade/7/signed-numbers" element={<SignedNumbersPage />} />
        <Route path="/grade/7/signed-numbers/find-the-spot" element={<NumberLinePlacePage />} />
        <Route path="/grade/7/signed-numbers/which-is-greater" element={<CompareSignedPage />} />
        <Route path="/grade/7/signed-numbers/distance-from-zero" element={<AbsoluteValuePage />} />
        <Route path="/grade/7/signed-numbers/steps-on-the-line" element={<SignedAddSubPage />} />
        <Route path="/grade/7/signed-numbers/the-sign-rule" element={<SignRulesPage />} />
        <Route path="/grade/7/algebra" element={<AlgebraPage />} />
        <Route path="/grade/7/algebra/patterns-and-variables" element={<AlgebraPatternsPage />} />
        <Route path="/grade/7/algebra/build-an-expression" element={<AlgebraExpressionsPage />} />
        <Route path="/grade/7/algebra/substitution" element={<AlgebraSubstitutionPage />} />
        <Route path="/grade/7/algebra/equivalent-expressions" element={<AlgebraEquivalentPage />} />
        <Route path="/grade/7/algebra/combining-like-terms" element={<AlgebraLikeTermsPage />} />
        <Route path="/grade/7/algebra/understanding-equations" element={<AlgebraEquationMeaningPage />} />
        <Route path="/grade/7/algebra/solving-equations" element={<AlgebraSolvingPage />} />
        <Route path="/grade/7/algebra/from-words-to-equations" element={<AlgebraWordProblemsPage />} />
        <Route path="/grade/7/geometry" element={<GeometryGrade7Page />} />
        <Route path="/grade/7/geometry/rays-and-angles" element={<AnglesIdentifyPage />} />
        <Route path="/grade/7/geometry/angle-types" element={<AnglesTypesPage />} />
        <Route path="/grade/7/geometry/angle-notation" element={<AnglesNotationPage />} />
        <Route path="/grade/7/geometry/compare-angles" element={<AnglesComparePage />} />
        <Route path="/grade/7/geometry/construct-an-angle" element={<AnglesConstructPage />} />
        <Route path="/grade/7/geometry/measure-an-angle" element={<AnglesMeasurePage />} />
        <Route path="/grade/7/geometry/quick-recap" element={<AnglesQuickRecapPage />} />
        <Route path="/grade/4/decimal-place-value" element={<DecimalExamPrepPage />} />
        <Route path="/grade/4/decimal-place-value/place-value-and-conversions" element={<DecimalPlaceValuePage />} />
        <Route path="/grade/4/decimal-place-value/build-and-break-numbers" element={<DecimalDecompositionPage />} />
        <Route path="/grade/4/decimal-place-value/comparing-and-sequences" element={<DecimalOrderingPage />} />
        <Route path="/grade/4/decimal-place-value/rounding-and-estimation" element={<DecimalRoundingPage />} />
        <Route path="/grade/4/decimal-place-value/addition-and-subtraction" element={<DecimalArithmeticPage />} />
        <Route path="/grade/4/decimal-place-value/reasoning-without-calculating" element={<DecimalParityPage />} />
        <Route path="/grade/4/decimal-place-value/missing-numbers-and-puzzles" element={<DecimalConstraintsPage />} />
        <Route path="/grade/4/decimal-place-value/word-problems" element={<DecimalWordProblemsPage />} />
        <Route path="/grade/4/decimal-place-value/diagnostic" element={<DecimalDiagnosticPage />} />
        <Route path="/grade/4/decimal-place-value/mock-exam" element={<DecimalMockExamPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/activity" element={<ActivityPage />} />
      </Routes>
    </>
  );
}

export default App;
