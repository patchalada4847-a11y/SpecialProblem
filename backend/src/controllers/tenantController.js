const db = require('../config/db');

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

// 2. ดึงประวัติบิลของผู้เช่า
exports.getMyBills = async (req, res) => {
  try {
    const userId = req.user?.user_id || req.user?.id;

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
        b.payment_status,
        b.due_date,
        b.slip_image,
        b.created_at
      FROM t_bills b
      INNER JOIN m_contracts c ON b.contract_id = c.contract_id
      WHERE c.tenant_id = $1
      ORDER BY b.year DESC, b.month DESC
    `;

    const result = await db.query(query, [userId]);
    const bills = result.rows || [];

    res.json(bills);
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
    const query = `
      SELECT u.user_id, u.username, u.first_name, u.last_name, u.phone
      FROM m_users u
      WHERE u.role = 'tenant'
        AND u.user_id NOT IN (
          SELECT tenant_id FROM m_contracts WHERE status = 'active'
        )
      ORDER BY u.first_name ASC
    `;
    const result = await db.query(query);
    res.json(result.rows || []);
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
    const result = await db.query(
      `SELECT user_id, username, first_name, last_name, phone, status, kyc_document, created_at 
       FROM m_users 
       WHERE role = 'tenant' AND status = 'pending'
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
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