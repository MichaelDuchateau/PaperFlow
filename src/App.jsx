import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import OverviewPage    from './pages/OverviewPage.jsx';
import ReaderPage      from './pages/ReaderPage.jsx';
import SettingsPage    from './pages/SettingsPage.jsx';
import FlashcardsPage  from './pages/FlashcardsPage.jsx';

// HashRouter is used so that Electron's file:// protocol works in production.
// In dev (http://localhost:5173) it also works fine.

export default function App() {
  return (
    <HashRouter>
      <div className="h-screen flex flex-col overflow-hidden bg-gray-950 text-gray-100">
        <Routes>
          <Route path="/"                   element={<OverviewPage />} />
          <Route path="/reader/:id"         element={<ReaderPage />} />
          <Route path="/flashcards/:id"     element={<FlashcardsPage />} />
          <Route path="/settings"           element={<SettingsPage />} />
          <Route path="*"                   element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </HashRouter>
  );
}
