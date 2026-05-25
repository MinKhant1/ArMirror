import { Routes, Route } from 'react-router-dom';
import ThemeSelection from './pages/ThemeSelection.jsx';
import MirrorGame from './pages/MirrorGame.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ThemeSelection />} />
      <Route path="/mirror/:themeId" element={<MirrorGame />} />
    </Routes>
  );
}
