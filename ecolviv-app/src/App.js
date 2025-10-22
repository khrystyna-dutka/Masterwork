// src/App.jsx

import React, { useState } from 'react';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import MonitoringPage from './pages/MonitoringPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import { districts } from './data/districts';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation 
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        isLoggedIn={isLoggedIn}
      />
      
      {currentPage === 'home' && (
        <HomePage 
          districts={districts}
          setCurrentPage={setCurrentPage}
          setSelectedDistrict={setSelectedDistrict}
          isLoggedIn={isLoggedIn}
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
        <LoginPage 
          setIsLoggedIn={setIsLoggedIn}
          setUserData={setUserData}
          setCurrentPage={setCurrentPage}
        />
      )}
      
      {currentPage === 'profile' && (
        <ProfilePage 
          userData={userData}
          setUserData={setUserData}
          setIsLoggedIn={setIsLoggedIn}
          setCurrentPage={setCurrentPage}
          districts={districts}
        />
      )}
    </div>
  );
}

export default App;