const express = require('express');
const router = express.Router();
const MoneyController = require('../../controllers/MoneyController');

// Money routes
router.get("/getPaymentMethods", MoneyController.getPaymentMethods);
router.get("/getBanks", MoneyController.getBanks);
router.get("/getUsers", MoneyController.getUsers);
router.post("/saveTransection", MoneyController.saveTransection);
router.get("/getRecentTransection", MoneyController.getRecentTransection);
router.get("/getTransection", MoneyController.getTransection);
router.get("/getTransectionSummary", MoneyController.getTransectionSummary);
router.get("/getBankBalance", MoneyController.getBankBalance);
router.get("/getBankDetails", MoneyController.getBankDetails);

// Export Router
module.exports = router;