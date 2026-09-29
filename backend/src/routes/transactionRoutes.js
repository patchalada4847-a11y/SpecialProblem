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
 * /api/transactions/expenses:
 *   post:
 *     summary: บันทึกรายจ่ายของหอพัก (Admin เท่านั้น)
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [category, amount, description]
 *             properties:
 *               category: { type: string, example: "ค่าซ่อมบำรุง" }
 *               amount: { type: number, example: 1500 }
 *               description: { type: string, example: "ซ่อมปั๊มน้ำ" }
 *               transaction_date: { type: string, format: date, example: "2026-09-29" }
 *     responses:
 *       201: { description: "Expense recorded" }
 */
router.get('/', verifyToken, authorizeRoles('admin'), transactionController.getTransactions);
router.post('/expenses', verifyToken, authorizeRoles('admin'), transactionController.createExpense);
router.put('/expenses/:id', verifyToken, authorizeRoles('admin'), transactionController.updateExpense);
router.delete('/expenses/:id', verifyToken, authorizeRoles('admin'), transactionController.deleteExpense);
router.post('/pay-bill', verifyToken, authorizeRoles('admin'), transactionController.payBill);

module.exports = router;