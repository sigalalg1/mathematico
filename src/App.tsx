import { Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { GradePage } from './pages/GradePage';
import { CoordinateSystemPage } from './pages/CoordinateSystemPage';
import { DivisionWithRemainderPage } from './pages/DivisionWithRemainderPage';
import { CargoStationPage } from './pages/CargoStationPage';
import { SimpleFractionsPage } from './pages/SimpleFractionsPage';
import { FractionFactoryPage } from './pages/FractionFactoryPage';
import { MultiplicationPage } from './pages/MultiplicationPage';
import { MonkeyBalloonShooterPage } from './pages/MonkeyBalloonShooterPage';
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
import { AccountPage } from './pages/AccountPage';
import { ActivityPage } from './pages/ActivityPage';
import { useDocumentDirection } from './i18n/useDocumentDirection';
import { BlockBuildersPage } from './pages/BlockBuildersPage';
import { PenaltyShootoutPage } from './pages/PenaltyShootoutPage';
import { FractionsPart1Page } from './pages/FractionsPart1Page';
import { FractionsPart1ActivityPage } from './pages/FractionsPart1ActivityPage';

function App() {
  useDocumentDirection();

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/grade/:gradeId" element={<GradePage />} />
      <Route path="/grade/4/division-with-remainder" element={<DivisionWithRemainderPage />} />
      <Route path="/grade/4/division-with-remainder/cargo-station" element={<CargoStationPage />} />
      <Route path="/grade/4/multiplication/block-builders" element={<BlockBuildersPage />} />
      <Route path="/grade/4/penalty-shootout" element={<PenaltyShootoutPage />} />
      <Route path="/grade/4/simple-fractions" element={<SimpleFractionsPage />} />
      <Route path="/grade/4/simple-fractions/fraction-factory" element={<FractionFactoryPage />} />
      <Route path="/grade/4/fractions-part-1" element={<FractionsPart1Page />} />
      <Route path="/grade/4/fractions-part-1/:activityId" element={<FractionsPart1ActivityPage />} />
      <Route path="/grade/4/multiplication" element={<MultiplicationPage />} />
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
      <Route path="/account" element={<AccountPage />} />
      <Route path="/activity" element={<ActivityPage />} />
    </Routes>
  );
}

export default App;
