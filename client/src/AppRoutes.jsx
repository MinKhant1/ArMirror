import { Navigate, Routes, Route } from 'react-router-dom';
import ThemeSelection from './pages/ThemeSelection.jsx';
import MirrorGame from './pages/MirrorGame.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ThemeSelection />} />
      <Route path="/mirror/:themeId" element={<MirrorGame />} />
      <Route path="/wild-four" element={<Navigate to="/mirror/wild-four" replace />} />
      <Route path="/mirror/four-of-a-kind" element={<Navigate to="/mirror/wild-four" replace />} />
      <Route path="/soul-echo" element={<Navigate to="/mirror/galactic-universe" replace />} />
      <Route path="/mirror/soul-echo" element={<Navigate to="/mirror/galactic-universe" replace />} />
    </Routes>
  );
}
