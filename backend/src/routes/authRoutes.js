const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: สมัครสมาชิก / เพิ่มผู้ใช้งานใหม่
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password, first_name, last_name, role]
 *             properties:
 *               username: { type: string, example: "tenant01" }
 *               password: { type: string, example: "123456" }
 *               first_name: { type: string, example: "สมชาย" }
 *               last_name: { type: string, example: "ใจดี" }
 *               phone: { type: string, example: "0812345678" }
 *               role: { type: string, enum: [admin, tenant], example: "tenant" }
 *     responses:
 *       201: { description: "Success" }
 * 
 * /api/auth/login:
 *   post:
 *     summary: เข้าสู่ระบบเพื่อรับ Token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string, example: "tenant01" }
 *               password: { type: string, example: "123456" }
 *     responses:
 *       200: { description: "Login successful" }
 */
router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router;