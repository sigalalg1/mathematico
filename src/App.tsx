import { Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { GradePage } from './pages/GradePage';
import { CoordinateSystemPage } from './pages/CoordinateSystemPage';
import { DivisionWithRemainderPage } from './pages/DivisionWithRemainderPage';
import { CargoStationPage } from './pages/CargoStationPage';
import { SimpleFractionsPage } from './pages/SimpleFractionsPage';
import { FractionFactoryPage } from './pages/FractionFactoryPage';
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
import { AccountPage } from './pages/AccountPage';
import { ActivityPage } from './pages/ActivityPage';
import { useDocumentDirection } from './i18n/useDocumentDirection';

function App() {
  useDocumentDirection();

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/grade/:gradeId" element={<GradePage />} />
      <Route path="/grade/4/division-with-remainder" element={<DivisionWithRemainderPage />} />
      <Route path="/grade/4/division-with-remainder/cargo-station" element={<CargoStationPage />} />
      <Route path="/grade/4/simple-fractions" element={<SimpleFractionsPage />} />
      <Route path="/grade/4/simple-fractions/fraction-factory" element={<FractionFactoryPage />} />
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
      <Route path="/account" element={<AccountPage />} />
      <Route path="/activity" element={<ActivityPage />} />
    </Routes>
  );
}

export default App;
