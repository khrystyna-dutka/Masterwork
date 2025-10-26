// src/App.js
import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import MonitoringPage from './pages/MonitoringPage';
import ProfilePage from './pages/ProfilePage';
import Register from './components/Auth/Register';
import Login from './components/Auth/Login';
import { useAirQuality } from './hooks/useAirQuality';  // <-- ДОДАЙ ЦЕЙ ІМПОРТ

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  
  // Використовуємо хук для отримання реальних даних
  const { districts, loading, error, lastUpdate, refreshData } = useAirQuality();  // <-- ДОДАЙ ЦЕЙ РЯДОК

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Navigation 
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
        
        {/* Показуємо завантаження */}
        {loading && currentPage === 'home' && (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Завантаження даних...</p>
            </div>
          </div>
        )}
        
        {/* Показуємо помилку */}
        {error && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 m-4">
            <p className="text-sm text-yellow-700">{error}</p>
          </div>
        )}
        
        {!loading && (
          <>
            {currentPage === 'home' && (
              <HomePage 
                districts={districts}
                setCurrentPage={setCurrentPage}
                setSelectedDistrict={setSelectedDistrict}
                lastUpdate={lastUpdate}
                onRefresh={refreshData}
              />
            )}
            
            {currentPage === 'map' && (
              <MapPage 
                districts={districts}
                setCurrentPage={setCurrentPage}
                setSelectedDistrict={setSelectedDistrict}
                lastUpdate={lastUpdate}
                refreshData={refreshData}
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
          </>
        )}
      </div>
    </AuthProvider>
  );
}

export default App;