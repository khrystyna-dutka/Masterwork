// routes/subscriptionsRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getUserSubscriptions,
  updateUserSubscriptions,
  addSubscription,
  deleteSubscription
} = require('../controllers/subscriptionsController');

// Всі маршрути захищені
router.use(protect);

router.get('/', getUserSubscriptions);
router.put('/', updateUserSubscriptions);
router.post('/:districtId', addSubscription);
router.delete('/:districtId', deleteSubscription);

module.exports = router;