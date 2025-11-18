// ecolviv-app/src/utils/districts.js

/**
 * Отримати локалізовану назву району
 * @param {Object} district - об'єкт району
 * @param {Object} i18n - об'єкт i18next
 * @returns {string} - локалізована назва
 */
export const getLocalizedDistrictName = (district, i18n) => {
  if (!district) return '';
  
  const currentLang = i18n.language;
  
  // Якщо англійська мова і є nameEn або name_en
  if (currentLang === 'en') {
    return district.nameEn || district.name_en || district.name;
  }
  
  // Для української повертаємо name
  return district.name;
};

/**
 * Отримати локалізовану назву району за ID
 * @param {number} districtId - ID району
 * @param {Array} districts - масив районів
 * @param {Object} i18n - об'єкт i18next
 * @returns {string} - локалізована назва
 */
export const getDistrictNameById = (districtId, districts, i18n) => {
  const district = districts.find(d => d.id === districtId);
  return getLocalizedDistrictName(district, i18n);
};