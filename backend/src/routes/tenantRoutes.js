const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const { verifyToken } = require('../middleware/authMiddleware');

/**
 * @openapi
 * /api/tenant/me:
 *   get:
 *     summary: ดึงข้อมูลส่วนตัว สัญญาเช่า และห้องพักของผู้เช่าที่ล็อกอิน
 *     tags: [Tenant Portal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 * 
 * /api/tenant/my-bills:
 *   get:
 *     summary: ดึงรายการบิล และประวัติการชำระเงินของตนเอง
 *     tags: [Tenant Portal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 * 
 * /api/tenant/update-profile:
 *   put:
 *     summary: แก้ไขข้อมูลส่วนตัวของผู้เช่า (ชื่อ, นามสกุล, เบอร์โทร)
 *     tags: [Tenant Portal]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name: { type: string, example: "สมชาย" }
 *               last_name: { type: string, example: "ใจดี" }
 *               phone: { type: string, example: "0898765432" }
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.get('/me', verifyToken, tenantController.getMyProfileAndContract);
router.get('/my-bills', verifyToken, tenantController.getMyBills);
router.put('/update-profile', verifyToken, tenantController.updateMyProfile);

module.exports = router;