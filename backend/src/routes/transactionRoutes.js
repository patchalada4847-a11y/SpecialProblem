const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

/**
 * @openapi
 * /api/transactions:
 *   get:
 *     summary: ดึงรายการประวัติทางการเงินทั้งหมด
 *     tags: [Transactions]
 *     responses:
 *       200: { description: "Success" }
 * /api/transactions/pay-bill:
 *   post:
 *     summary: ชำระเงินบิลประจำเดือน
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bill_id]
 *             properties:
 *               bill_id: { type: integer, example: 1 }
 *     responses:
 *       200: { description: "Payment success" }
 */
router.get('/', verifyToken, authorizeRoles('admin'), transactionController.getTransactions);
router.post('/pay-bill', verifyToken, transactionController.payBill);

module.exports = router;