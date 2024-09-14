const express = require('express');
const router = express.Router();
const MoneyController = require('../../controllers/MoneyController');

// Money routes
router.get("/getPaymentMethods", MoneyController.getPaymentMethods);
router.get("/getBanks", MoneyController.getBanks);
router.get("/getUsers", MoneyController.getUsers);
router.post("/saveTransection", MoneyController.saveTransection);
router.get("/getRecentTransection", MoneyController.getRecentTransection);
router.get("/getTransectionSummary", MoneyController.getTransectionSummary);
router.get("/getBankBalance", MoneyController.getBankBalance);

// Export Router
module.exports = router;