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
        b.electric_unit,
        b.water_amount,
        b.electric_amount,
        b.rent_amount,
        b.total_amount,
        b.payment_status,
        b.due_date,
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