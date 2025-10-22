// src/App.jsx

import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import MonitoringPage from './pages/MonitoringPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import Register from './components/Auth/Register';
import Login from './components/Auth/Login';
import { districts } from './data/districts';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedDistrict, setSelectedDistrict] = useState(null);

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Navigation 
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
        
        {currentPage === 'home' && (
          <HomePage 
            districts={districts}
            setCurrentPage={setCurrentPage}
            setSelectedDistrict={setSelectedDistrict}
          />
        )}
        
        {currentPage === 'map' && (
          <MapPage 
            districts={districts}
            setCurrentPage={setCurrentPage}
            setSelectedDistrict={setSelectedDistrict}
          />
        )}
        
        {currentPage === 'monitoring' && (
          <MonitoringPage 
            districts={districts}
            selectedDistrict={selectedDistrict}
            setSelectedDistrict={setSelectedDistrict}
          />
        )}
        
        {currentPage === 'login' && (
          <Login setCurrentPage={setCurrentPage} />
        )}
        
        {currentPage === 'register' && (
          <Register setCurrentPage={setCurrentPage} />
        )}
        
        {currentPage === 'profile' && (
          <ProfilePage 
            setCurrentPage={setCurrentPage}
            districts={districts}
          />
        )}
      </div>
    </AuthProvider>
  );
}

export default App;