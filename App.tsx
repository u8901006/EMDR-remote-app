import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import TherapistSession from './pages/TherapistSession';
import ClientSession from './pages/ClientSession';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/therapist" element={<TherapistSession />} />
        <Route path="/client" element={<ClientSession />} />
      </Routes>
    </Router>
  );
};

export default App;