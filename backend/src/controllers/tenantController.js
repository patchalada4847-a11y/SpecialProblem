const db = require('../config/db');
const { parsePagination, respondWithPagination } = require('../utils/pagination');
const { validateUploadedDocument } = require('../utils/uploadedDocument');
const { verifySlip } = require('../services/slipVerification');
const { notifyAdmin } = require('../services/lineNotifications');
const { createAndSendNotification } = require('../config/socket');

// 1. ดึงข้อมูลส่วนตัว สัญญาเช่า และห้องพัก
exports.getMyProfileAndContract = async (req, res) => {
  try {
    const userId = req.user?.user_id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'ไม่พบข้อมูลผู้ใช้จาก Token' });
    }

    const query = `
      SELECT 
        u.user_id,
        u.username,
        u.first_name,
        u.last_name,
        u.phone,
        u.role,
        (u.kyc_document IS NOT NULL) AS has_kyc_document,
        u.kyc_document AS application_document,
        c.contract_id,
        c.start_date,
        c.end_date,
        c.deposit,
        c.status AS contract_status,
        r.room_id,
        r.room_number,
        r.floor,
        r.room_type,
        r.base_price
      FROM m_users u
      LEFT JOIN m_contracts c ON u.user_id = c.tenant_id
      LEFT JOIN m_rooms r ON c.room_id = r.room_id
      WHERE u.user_id = $1
      ORDER BY (c.status = 'active') DESC, c.contract_id DESC
      LIMIT 1
    `;

    const settingsQuery = `
      SELECT dormitory_name, dormitory_address, contact_phone, water_rate, electric_rate, promptpay_number, payment_instructions
      FROM m_billing_settings
      LIMIT 1
    `;

    const contractsQuery = `
      SELECT 
        c.contract_id,
        c.start_date,
        c.end_date,
        c.deposit,
        c.status AS contract_status,
        r.room_id,
        r.room_number,
        r.floor,
        r.room_type,
        r.base_price
      FROM m_contracts c
      JOIN m_rooms r ON c.room_id = r.room_id
      WHERE c.tenant_id = $1
      ORDER BY c.contract_id DESC
    `;

    const documentsQuery = `
      SELECT rr.request_id, rr.contract_id, rr.proposed_end_date::text AS proposed_end_date,
             (rr.agreement_document IS NOT NULL) AS has_agreement_document,
             (rr.signed_document IS NOT NULL) AS has_signed_document,
             rr.status, rr.submitted_at, r.room_number
      FROM m_contract_renewal_requests rr
      JOIN m_contracts c ON c.contract_id = rr.contract_id
      JOIN m_rooms r ON r.room_id = c.room_id
      WHERE rr.tenant_id = $1
      ORDER BY rr.submitted_at DESC
    `;

    const [userRes, settingsRes, contractsRes, docsRes] = await Promise.all([
      db.query(query, [userId]),
      db.query(settingsQuery),
      db.query(contractsQuery, [userId]),
      db.query(documentsQuery, [userId])
    ]);

    const rows = userRes.rows || [];
    if (rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้' });
    }

    const profile = rows[0];
    const settings = settingsRes.rows[0] || {};
    const contracts = contractsRes.rows || [];
    const renewalDocs = docsRes.rows || [];

    const documents = [
      ...(profile.has_kyc_document ? [{
        id: `application-${userId}`,
        title: 'สัญญาเช่า / เอกสารแนบตอนสมัคร',
        submitted_at: null,
        status: 'application',
        document: profile.application_document
      }] : []),
      ...renewalDocs.flatMap((req) => [
        ...(req.has_agreement_document ? [{
          id: `renewal-draft-${req.request_id}`,
          title: `ร่างสัญญาต่ออายุ · ห้อง ${req.room_number}`,
          submitted_at: req.submitted_at,
          status: req.status
        }] : []),
        ...(req.has_signed_document ? [{
          id: `renewal-signed-${req.request_id}`,
          title: `สัญญาที่ผู้เช่าลงนามแล้ว · ห้อง ${req.room_number}`,
          submitted_at: req.submitted_at,
          status: req.status
        }] : [])
      ])
    ];

    res.json({
      ...profile,
      dormitory_name: settings.dormitory_name || 'ระบบจัดการหอพัก',
      dormitory_address: settings.dormitory_address || '',
      contact_phone: settings.contact_phone || '',
      water_rate: settings.water_rate,
      electric_rate: settings.electric_rate,
      settings,
      contracts,
      documents
    });
  } catch (error) {
    console.error('Error in getMyProfileAndContract:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateTenantProfile = async (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, phone } = req.body || {};

  if (
    !Number.isInteger(Number(id)) ||
    typeof first_name !== 'string' ||
    !first_name.trim() ||
    typeof last_name !== 'string' ||
    !last_name.trim() ||
    (phone != null && (typeof phone !== 'string' || (phone.trim() && !/^\d{10}$/.test(phone.trim()))))
  ) {
    return res.status(400).json({ error: 'กรุณาระบุชื่อ นามสกุล และเบอร์โทร 10 หลักให้ถูกต้อง' });
  }

  try {
    const result = await db.query(
      `UPDATE m_users SET first_name = $1, last_name = $2, phone = $3
       WHERE user_id = $4 AND role = 'tenant'
       RETURNING user_id, first_name, last_name, phone`,
      [first_name.trim(), last_name.trim(), phone?.trim() || null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลผู้เช่า' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTenantDocuments = async (req, res) => {
  const tenantId = Number(req.params.id);
  if (!Number.isInteger(tenantId) || tenantId < 1) {
    return res.status(400).json({ error: 'หมายเลขผู้เช่าไม่ถูกต้อง' });
  }
  try {
    const [tenantResult, renewalResult] = await Promise.all([
      db.query(
        `SELECT user_id, first_name, last_name, username,
                (kyc_document IS NOT NULL) AS has_kyc_document
         FROM m_users WHERE user_id = $1 AND role = 'tenant'`,
        [tenantId]
      ),
      db.query(
        `SELECT rr.request_id, rr.contract_id, rr.proposed_end_date::text AS proposed_end_date,
                (rr.agreement_document IS NOT NULL) AS has_agreement_document,
                (rr.signed_document IS NOT NULL) AS has_signed_document,
                rr.status, rr.submitted_at, r.room_number
         FROM m_contract_renewal_requests rr
         JOIN m_contracts c ON c.contract_id = rr.contract_id
         JOIN m_rooms r ON r.room_id = c.room_id
         WHERE rr.tenant_id = $1
         ORDER BY rr.submitted_at DESC`,
        [tenantId]
      )
    ]);
    if (!tenantResult.rows.length) return res.status(404).json({ error: 'ไม่พบข้อมูลผู้เช่า' });
    res.json({
      tenant: tenantResult.rows[0],
      documents: [
        ...(tenantResult.rows[0].has_kyc_document ? [{
          id: `application-${tenantId}`,
          title: 'เอกสารที่แนบตอนสมัคร',
          submitted_at: null,
          status: 'application'
        }] : []),
        ...renewalResult.rows.flatMap((request) => [
          ...(request.has_agreement_document ? [{
            id: `renewal-draft-${request.request_id}`,
            title: `ร่างสัญญาต่ออายุ · ห้อง ${request.room_number}`,
            submitted_at: request.submitted_at,
            status: request.status
          }] : []),
          ...(request.has_signed_document ? [{
            id: `renewal-signed-${request.request_id}`,
            title: `สัญญาที่ผู้เช่าลงนามแล้ว · ห้อง ${request.room_number}`,
            submitted_at: request.submitted_at,
            status: request.status
          }] : [])
        ])
      ]
    });
  } catch (error) {
    console.error('Error fetching tenant documents:', error);
    res.status(500).json({ error: 'ไม่สามารถโหลดเอกสารผู้เช่าได้' });
  }
};

exports.getTenantDocument = async (req, res) => {
  const tenantId = Number(req.params.id);
  const documentId = String(req.params.document_id || '');
  if (!Number.isInteger(tenantId) || tenantId < 1) {
    return res.status(400).json({ error: 'หมายเลขผู้เช่าไม่ถูกต้อง' });
  }

  try {
    let result;
    if (documentId === `application-${tenantId}`) {
      result = await db.query(
        `SELECT kyc_document AS document FROM m_users
         WHERE user_id = $1 AND role = 'tenant'`,
        [tenantId]
      );
    } else {
      const match = documentId.match(/^renewal-(draft|signed)-(\d+)$/);
      if (!match) return res.status(400).json({ error: 'รหัสเอกสารไม่ถูกต้อง' });
      const column = match[1] === 'draft' ? 'agreement_document' : 'signed_document';
      result = await db.query(
        `SELECT rr.${column} AS document
         FROM m_contract_renewal_requests rr
         WHERE rr.request_id = $1 AND rr.tenant_id = $2`,
        [Number(match[2]), tenantId]
      );
    }

    if (!result.rows.length || !result.rows[0].document) {
      return res.status(404).json({ error: 'ไม่พบเอกสารที่ระบุ' });
    }
    res.json({ document: result.rows[0].document });
  } catch (error) {
    console.error('Error fetching tenant document:', error);
    res.status(500).json({ error: 'ไม่สามารถโหลดเอกสารได้' });
  }
};

// ดึงเอกสารของตนเองสำหรับผู้เช่า (สัญญา/เอกสารแนบ)
exports.getMyDocument = async (req, res) => {
  const userId = req.user?.user_id || req.user?.id;
  const documentId = String(req.params.document_id || '');
  if (!userId) {
    return res.status(401).json({ error: 'ไม่พบข้อมูลผู้ใช้' });
  }

  try {
    let result;
    if (documentId === `application-${userId}` || documentId === 'kyc') {
      result = await db.query(
        `SELECT kyc_document AS document FROM m_users
         WHERE user_id = $1 AND role = 'tenant'`,
        [userId]
      );
    } else {
      const match = documentId.match(/^renewal-(draft|signed)-(\d+)$/);
      if (!match) return res.status(400).json({ error: 'รหัสเอกสารไม่ถูกต้อง' });
      const column = match[1] === 'draft' ? 'agreement_document' : 'signed_document';
      result = await db.query(
        `SELECT rr.${column} AS document
         FROM m_contract_renewal_requests rr
         WHERE rr.request_id = $1 AND rr.tenant_id = $2`,
        [Number(match[2]), userId]
      );
    }

    if (!result.rows.length || !result.rows[0].document) {
      return res.status(404).json({ error: 'ไม่พบเอกสารที่ระบุ' });
    }
    res.json({ document: result.rows[0].document });
  } catch (error) {
    console.error('Error fetching my document:', error);
    res.status(500).json({ error: 'ไม่สามารถโหลดเอกสารได้' });
  }
};

// 2. ดึงประวัติบิลของผู้เช่า
exports.getMyBills = async (req, res) => {
  try {
    const userId = req.user?.user_id || req.user?.id;
    const pagination = parsePagination(req.query);

    // แก้ไข: ใช้ b.payment_status ตรงๆ โดยไม่เรียก b.status
    const query = `
      SELECT 
        b.bill_id,
        b.contract_id,
        b.month,
        b.year,
        b.water_unit,
        b.water_old_meter,
        b.water_new_meter,
        b.electric_unit,
        b.electric_old_meter,
        b.electric_new_meter,
        b.water_amount,
        b.electric_amount,
        b.rent_amount,
        b.total_amount,
        b.extra_charges,
        b.payment_status,
        b.due_date,
        (b.slip_image IS NOT NULL) AS has_slip,
        b.slip_verification_status,
        b.slip_verification_message,
        b.slip_verified_at,
        b.created_at,
        settings.promptpay_number
      FROM t_bills b
      INNER JOIN m_contracts c ON b.contract_id = c.contract_id
      LEFT JOIN m_billing_settings settings ON settings.setting_id = 1
      WHERE c.tenant_id = $1
      ORDER BY b.year DESC, b.month DESC
      ${pagination ? 'LIMIT $2 OFFSET $3' : ''}
    `;

    const result = await db.query(
      query,
      pagination ? [userId, pagination.pageSize, pagination.offset] : [userId]
    );
    const bills = result.rows || [];

    if (!pagination) return res.json(bills);
    const count = await db.query(
      `SELECT COUNT(*) AS total
       FROM t_bills b
       INNER JOIN m_contracts c ON b.contract_id = c.contract_id
       WHERE c.tenant_id = $1`,
      [userId]
    );
    respondWithPagination(req, res, bills, count.rows[0].total, pagination);
  } catch (error) {
    console.error('Error in getMyBills:', error);
    res.status(500).json({ error: error.message });
  }
};

// 3. อัปเดตข้อมูลส่วนตัว
exports.updateMyProfile = async (req, res) => {
  try {
    const userId = req.user?.user_id || req.user?.id;
    const body = req.body || {};
    const { first_name = '', last_name = '', phone = '' } = body;
    if (typeof phone !== 'string' || (phone && !/^\d{10}$/.test(phone))) {
      return res.status(400).json({ error: 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก' });
    }

    await db.query(
      'UPDATE m_users SET first_name = $1, last_name = $2, phone = $3 WHERE user_id = $4',
      [first_name, last_name, phone, userId]
    );

    res.json({ message: 'อัปเดตข้อมูลส่วนตัวสำเร็จ' });
  } catch (error) {
    console.error('Error in updateMyProfile:', error);
    res.status(500).json({ error: error.message });
  }
};

// ดึงรายชื่อผู้เช่าที่สมัครสมาชิกแล้ว (เฉพาะคนที่ยังไม่ได้ผูกห้อง หรือยังไม่มีสัญญา Active)
exports.getAvailableTenants = async (req, res) => {
  try {
    const pagination = parsePagination(req.query);
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || '');
    const where = `WHERE u.role = 'tenant'
        AND u.user_id NOT IN (
          SELECT tenant_id FROM m_contracts WHERE status = 'active'
        )
        AND ($1 = '' OR CONCAT_WS(' ', u.user_id, u.username, u.first_name, u.last_name, u.phone) ILIKE '%' || $1 || '%')
        AND ($2 = '' OR u.user_id = $2::bigint)`;
    const query = `
      SELECT u.user_id, u.username, u.first_name, u.last_name, u.phone
      FROM m_users u
      ${where}
      ORDER BY u.first_name ASC
      ${pagination ? 'LIMIT $3 OFFSET $4' : ''}
    `;
    const result = await db.query(
      query,
      pagination ? [search, status, pagination.pageSize, pagination.offset] : [search, status]
    );
    if (!pagination) return res.json(result.rows || []);
    const count = await db.query(
      `SELECT COUNT(*) AS total FROM m_users u ${where}`,
      [search, status]
    );
    respondWithPagination(req, res, result.rows, count.rows[0].total, pagination);
  } catch (error) {
    console.error('Error in getAvailableTenants:', error);
    res.status(500).json({ error: error.message });
  }
};

// ผู้เช่าแนบสลิปโอนเงิน
exports.uploadSlip = async (req, res) => {
  try {
    const userId = req.user?.user_id || req.user?.id;
    const billId = Number(req.body?.bill_id);
    const uploadedDocument = validateUploadedDocument(req.body?.slip_image);

    if (!Number.isInteger(billId) || billId < 1 || !uploadedDocument ||
        !uploadedDocument.mimeType.startsWith('image/')) {
      return res.status(400).json({ error: 'กรุณาระบุรหัสบิลและแนบไฟล์รูปสลิป JPEG, PNG หรือ WebP ที่ถูกต้อง (ไม่เกิน 10MB)' });
    }

    const billForVerification = await db.query(
      `SELECT b.bill_id, b.month, b.year, b.total_amount, b.payment_status,
              r.room_number,
              u.first_name, u.last_name
       FROM t_bills b
       JOIN m_contracts c ON c.contract_id = b.contract_id
       LEFT JOIN m_rooms r ON r.room_id = c.room_id
       LEFT JOIN m_users u ON u.user_id = c.tenant_id
       WHERE b.bill_id = $1 AND c.tenant_id = $2`,
      [billId, userId]
    );
    if (!billForVerification.rows.length) {
      return res.status(403).json({ error: 'คุณไม่มีสิทธิ์อัปโหลดสลิปสำหรับบิลนี้' });
    }
    if (billForVerification.rows[0].payment_status !== 'pending') {
      return res.status(400).json({ error: 'บิลนี้ได้รับการชำระเงินเรียบร้อยแล้ว' });
    }

    const bill = billForVerification.rows[0];
    const verification = await verifySlip({
      mode: process.env.SLIPOK_MODE || 'manual',
      mockResult: process.env.SLIPOK_MOCK_RESULT,
      isProduction: process.env.NODE_ENV === 'production',
      image: uploadedDocument.data,
      mimeType: uploadedDocument.mimeType,
      amount: bill.total_amount
    });
    const outcome = await db.withTransaction(async (client) => {
      const billResult = await client.query(
        `SELECT b.bill_id, b.month, b.year, b.total_amount, b.payment_status,
                r.room_number,
                u.first_name, u.last_name
         FROM t_bills b
         JOIN m_contracts c ON c.contract_id = b.contract_id
         LEFT JOIN m_rooms r ON r.room_id = c.room_id
         LEFT JOIN m_users u ON u.user_id = c.tenant_id
         WHERE b.bill_id = $1 AND c.tenant_id = $2
         FOR UPDATE OF b`,
        [billId, userId]
      );
      if (!billResult.rows.length) return { forbidden: true };

      const currentBill = billResult.rows[0];
      if (currentBill.payment_status !== 'pending') return { alreadyPaid: true };

      await client.query(
        `UPDATE t_bills
         SET slip_image = $1,
             slip_verification_status = $2,
             slip_verification_message = $3,
             slip_trans_ref = $4,
             slip_verified_at = CASE WHEN $5 THEN CURRENT_TIMESTAMP ELSE NULL END
         WHERE bill_id = $6`,
        [
          uploadedDocument.data,
          verification.status,
          verification.message,
          verification.slipData?.transRef || null,
          verification.status === 'verified' && !verification.simulated,
          billId
        ]
      );

      if (verification.status === 'verified') {
        const updated = await client.query(
          `UPDATE t_bills SET payment_status = 'paid'
           WHERE bill_id = $1 AND payment_status = 'pending'`,
          [billId]
        );
        if (updated.rowCount !== 1) return { alreadyPaid: true };

        await client.query(
          `INSERT INTO t_transactions
             (type, category, amount, description, transaction_date,
              payment_method, payment_reference, notes, bill_id)
           VALUES ('income', 'Rent Payment', $1, $2, CURRENT_DATE,
                   'bank_transfer', $3, $4, $5)`,
          [
            currentBill.total_amount,
            `ชำระบิลประจำเดือน ${currentBill.month}/${currentBill.year} (Bill ID: ${currentBill.bill_id})`,
            verification.simulated ? `DEMO-SLIPOK-${currentBill.bill_id}` : verification.slipData?.transRef || null,
            verification.simulated ? 'DEMO SIMULATION: ไม่ใช่ผลตรวจจาก SlipOK จริง' : null,
            currentBill.bill_id
          ]
        );
      }
      return { bill: currentBill };
    });

    if (outcome.forbidden) {
      return res.status(403).json({ error: 'คุณไม่มีสิทธิ์อัปโหลดสลิปสำหรับบิลนี้' });
    }
    if (outcome.alreadyPaid) {
      return res.status(400).json({ error: 'บิลนี้ได้รับการชำระเงินเรียบร้อยแล้ว' });
    }

    const formattedAmount = Number(bill.total_amount).toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    const tenantName = [bill.first_name, bill.last_name].filter(Boolean).join(' ') || 'ผู้เช่า';
    const statusText = verification.status === 'verified'
      ? '✅ ตรวจสอบสลิปผ่าน (ชำระแล้ว)'
      : verification.status === 'manual_review'
        ? '⏳ รอแอดมินตรวจสอบ'
        : verification.status === 'duplicate'
          ? '⚠️ ตรวจพบสลิปซ้ำ'
          : '❌ ตรวจสลิปไม่ผ่าน';

    const messageLines = [
      '🔔 แจ้งเตือนการชำระเงิน',
      `🏠 ห้อง: ${bill.room_number || '-'}`,
      `👤 ผู้โอน: ${tenantName}`,
      `💰 ยอดเงิน: ${formattedAmount} บาท`,
      `📅 ประจำรอบ: ${bill.month}/${bill.year} (บิล #${billId})`,
      `📊 สถานะ: ${statusText}`
    ];
    if (verification.slipData?.transRef) {
      messageLines.push(`🔖 เลขอ้างอิง: ${verification.slipData.transRef}`);
    }
    if (verification.message) {
      messageLines.push(`💬 ผลตรวจ: ${verification.message}`);
    }
    const message = messageLines.join('\n');

    let notificationWarning;
    try {
      await notifyAdmin(message);
    } catch (notificationError) {
      notificationWarning = 'บันทึกผลตรวจแล้ว แต่ส่ง LINE ไม่สำเร็จ';
      console.error('[LINE notification failed]', notificationError);
    }

    // 1. ส่งแจ้งเตือน Real-time บนเว็บหา Admin
    createAndSendNotification({
      targetRole: 'admin',
      title: verification.status === 'verified' ? 'ผู้เช่าชำระค่าเช่าสำเร็จ' : 'มีการแนบสลิปชำระเงิน',
      message: `ห้อง ${bill.room_number || '-'}: ${tenantName} ยอด ฿${formattedAmount} (${statusText})`,
      type: verification.status === 'verified' ? 'success' : (verification.status === 'manual_review' ? 'warning' : 'error'),
      link: '/bills'
    }).catch((err) => console.error('[Socket] Failed to notify admin about payment:', err));

    // 2. ถ้าตรวจผ่าน ให้ส่งแจ้งเตือนยืนยันไปยังผู้เช่าด้วย
    if (verification.status === 'verified') {
      createAndSendNotification({
        userId: userId,
        title: 'ชำระค่าเช่าสำเร็จแล้ว',
        message: `บิลประจำงวด ${bill.month}/${bill.year} ยอด ฿${formattedAmount} ได้รับการบันทึกชำระเงินเรียบร้อยแล้ว`,
        type: 'success',
        link: '/my-dashboard'
      }).catch((err) => console.error('[Socket] Failed to notify tenant about payment success:', err));
    }

    res.json({
      message: verification.message,
      verification_status: verification.status,
      simulated: Boolean(verification.simulated),
      slip_reference: verification.slipData?.transRef || null,
      notification_warning: notificationWarning
    });
  } catch (error) {
    console.error('Error in uploadSlip:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'สลิปนี้เคยใช้ชำระบิลอื่นแล้ว' });
    }
    res.status(error.statusCode || 500).json({ error: error.message || 'ไม่สามารถตรวจสอบสลิปได้' });
  }
};

// ดึงรายชื่อผู้ใช้ที่รอการยืนยันตัวตน (KYC)
exports.getPendingKYC = async (req, res) => {
  try {
    const pagination = parsePagination(req.query);
    const count = pagination
      ? await db.query(`SELECT COUNT(*) AS total FROM m_users WHERE role = 'tenant' AND status = 'pending'`)
      : null;
    const result = await db.query(
      `SELECT user_id, username, first_name, last_name, phone, status,
              (kyc_document IS NOT NULL) AS has_kyc_document, created_at
       FROM m_users 
       WHERE role = 'tenant' AND status = 'pending'
       ORDER BY created_at DESC
       ${pagination ? 'LIMIT $1 OFFSET $2' : ''}`,
      pagination ? [pagination.pageSize, pagination.offset] : []
    );
    respondWithPagination(req, res, result.rows, count?.rows[0].total, pagination);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPendingKYCDocument = async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ error: 'หมายเลขผู้สมัครไม่ถูกต้อง' });
  }
  try {
    const result = await db.query(
      `SELECT kyc_document FROM m_users
       WHERE user_id = $1 AND role = 'tenant' AND status = 'pending'`,
      [userId]
    );
    if (!result.rows.length || !result.rows[0].kyc_document) {
      return res.status(404).json({ error: 'ไม่พบเอกสารที่รอตรวจสอบ' });
    }
    res.json({ document: result.rows[0].kyc_document });
  } catch (error) {
    console.error('Error fetching pending KYC document:', error);
    res.status(500).json({ error: 'ไม่สามารถโหลดเอกสารได้' });
  }
};

// อนุมัติ หรือ ปฏิเสธ KYC
exports.verifyKYC = async (req, res) => {
  const { user_id, status } = req.body; // status: 'approved' หรือ 'rejected'
  try {
    await db.query('UPDATE m_users SET status = $1 WHERE user_id = $2', [status, user_id]);
    res.json({ message: `ดำเนินการ${status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}เรียบร้อยแล้ว` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};