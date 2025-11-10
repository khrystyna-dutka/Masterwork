// src/components/LanguageSwitcher.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => changeLanguage('uk')}
        className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
          i18n.language === 'uk'
            ? 'bg-blue-100 text-blue-600'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        УКР
      </button>
      <button
        onClick={() => changeLanguage('en')}
        className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
          i18n.language === 'en'
            ? 'bg-blue-100 text-blue-600'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        ENG
      </button>
    </div>
  );
};

export default LanguageSwitcher;