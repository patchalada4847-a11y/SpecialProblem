const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const renewalController = require('../controllers/renewalController');
const supportController = require('../controllers/supportController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

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
router.put('/admin/tenants/:id', verifyToken, authorizeRoles('admin'), tenantController.updateTenantProfile);
router.get('/admin/tenants/:id/documents', verifyToken, authorizeRoles('admin'), tenantController.getTenantDocuments);
router.get('/available-tenants', verifyToken, authorizeRoles('admin'), tenantController.getAvailableTenants);
router.post('/upload-slip', verifyToken, tenantController.uploadSlip);
router.get('/renewals', verifyToken, authorizeRoles('tenant'), renewalController.getMyRenewals);
router.post('/renewals', verifyToken, authorizeRoles('tenant'), renewalController.createMyRenewal);
router.put('/renewals/:id/signed-document', verifyToken, authorizeRoles('tenant'), renewalController.uploadSignedRenewal);
router.get('/support-tickets', verifyToken, authorizeRoles('tenant'), supportController.getMyTickets);
router.post('/support-tickets', verifyToken, authorizeRoles('tenant'), supportController.createTicket);
router.put('/support-tickets/:id/close', verifyToken, authorizeRoles('tenant'), supportController.closeMyTicket);

router.get('/pending-kyc', verifyToken, authorizeRoles('admin'), tenantController.getPendingKYC);
router.post('/verify-kyc', verifyToken, authorizeRoles('admin'), tenantController.verifyKYC);

module.exports = router;