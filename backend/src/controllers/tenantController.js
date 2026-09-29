const db = require('../config/db');
const { parsePagination, respondWithPagination } = require('../utils/pagination');

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
      ORDER BY c.contract_id DESC
      LIMIT 1
    `;

    const result = await db.query(query, [userId]);
    const rows = result.rows || [];

    if (rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้' });
    }

    res.json(rows[0]);
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
    (phone != null && typeof phone !== 'string')
  ) {
    return res.status(400).json({ error: 'กรุณาระบุชื่อและนามสกุลให้ถูกต้อง' });
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
        `SELECT user_id, first_name, last_name, username, kyc_document
         FROM m_users WHERE user_id = $1 AND role = 'tenant'`,
        [tenantId]
      ),
      db.query(
        `SELECT rr.request_id, rr.contract_id, rr.proposed_end_date::text AS proposed_end_date,
                rr.agreement_document, rr.signed_document, rr.status, rr.submitted_at, r.room_number
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
        ...(tenantResult.rows[0].kyc_document ? [{
          id: `application-${tenantId}`,
          title: 'เอกสารที่แนบตอนสมัคร',
          submitted_at: null,
          status: 'application',
          document: tenantResult.rows[0].kyc_document
        }] : []),
        ...renewalResult.rows.flatMap((request) => [
          ...(request.agreement_document ? [{
            id: `renewal-draft-${request.request_id}`,
            title: `ร่างสัญญาต่ออายุ · ห้อง ${request.room_number}`,
            submitted_at: request.submitted_at,
            status: request.status,
            document: request.agreement_document
          }] : []),
          ...(request.signed_document ? [{
            id: `renewal-signed-${request.request_id}`,
            title: `สัญญาที่ผู้เช่าลงนามแล้ว · ห้อง ${request.room_number}`,
            submitted_at: request.submitted_at,
            status: request.status,
            document: request.signed_document
          }] : [])
        ])
      ]
    });
  } catch (error) {
    console.error('Error fetching tenant documents:', error);
    res.status(500).json({ error: 'ไม่สามารถโหลดเอกสารผู้เช่าได้' });
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
        b.slip_image,
        b.created_at
      FROM t_bills b
      INNER JOIN m_contracts c ON b.contract_id = c.contract_id
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
    const { bill_id, slip_image } = req.body;

    if (!bill_id || !slip_image) {
      return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน (ต้องระบุ bill_id และ slip_image)' });
    }

    // ตรวจสอบว่าบิลนี้เป็นของสัญญาผู้เช่าคนนี้จริงไหม
    const checkQuery = `
      SELECT b.bill_id, b.payment_status 
      FROM t_bills b
      INNER JOIN m_contracts c ON b.contract_id = c.contract_id
      WHERE b.bill_id = $1 AND c.tenant_id = $2
    `;
    const checkResult = await db.query(checkQuery, [bill_id, userId]);

    if (checkResult.rows.length === 0) {
      return res.status(403).json({ error: 'คุณไม่มีสิทธิ์อัปโหลดสลิปสำหรับบิลนี้' });
    }

    if (checkResult.rows[0].payment_status === 'paid') {
      return res.status(400).json({ error: 'บิลนี้ได้รับการชำระเงินเรียบร้อยแล้ว' });
    }

    // อัปเดตรูปสลิป
    await db.query('UPDATE t_bills SET slip_image = $1 WHERE bill_id = $2', [slip_image, bill_id]);

    res.json({ message: 'แนบสลิปโอนเงินเรียบร้อยแล้ว รอผู้ดูแลระบบตรวจสอบ' });
  } catch (error) {
    console.error('Error in uploadSlip:', error);
    res.status(500).json({ error: error.message });
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
      `SELECT user_id, username, first_name, last_name, phone, status, kyc_document, created_at 
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