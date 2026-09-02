const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

/**
 * @openapi
 * /api/bills:
 *   get:
 *     summary: ดึงรายการบิลทั้งหมด
 *     tags: [Bills]
 *     responses:
 *       200: { description: "Success" }
 *   post:
 *     summary: ออกบิลค่าน้ำ-ค่าไฟประจำเดือน (Admin เท่านั้น)
 *     tags: [Bills]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [contract_id, month, year, water_unit, electric_unit, due_date]
 *             properties:
 *               contract_id: { type: integer, example: 1 }
 *               month: { type: integer, example: 9 }
 *               year: { type: integer, example: 2026 }
 *               water_unit: { type: integer, example: 5 }
 *               electric_unit: { type: integer, example: 120 }
 *               due_date: { type: string, example: "2026-09-05" }
 *     responses:
 *       201: { description: "Bill created" }
 */
router.get('/', verifyToken, billController.getBills);
router.post('/', verifyToken, authorizeRoles('admin'), billController.createBill);

module.exports = router;