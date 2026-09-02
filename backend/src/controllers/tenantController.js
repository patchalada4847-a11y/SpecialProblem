const db = require('../config/db');

// ดึงข้อมูลห้องพัก และสัญญาเช่าของตนเอง
exports.getMyProfileAndContract = async (req, res) => {
  const userId = req.user.user_id;
  try {
    const query = `
      SELECT 
        u.user_id, u.first_name, u.last_name, u.phone, u.username,
        c.contract_id, c.start_date, c.end_date, c.deposit, c.status as contract_status,
        r.room_number, r.floor, r.room_type, r.base_price
      FROM users u
      LEFT JOIN contracts c ON u.user_id = c.tenant_id AND c.status = 'active'
      LEFT JOIN rooms r ON c.room_id = r.room_id
      WHERE u.user_id = $1;
    `;
    const result = await db.query(query, [userId]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ดึงยอดค่าเช่า/ค่าน้ำ/ค่าไฟ และประวัติการชำระเงินของตนเอง
exports.getMyBills = async (req, res) => {
  const userId = req.user.user_id;
  try {
    const query = `
      SELECT 
        b.bill_id, b.month, b.year, b.rent_amount, 
        b.water_unit, b.water_amount, b.electric_unit, b.electric_amount, 
        b.total_amount, b.payment_status, b.due_date, b.created_at
      FROM bills b
      JOIN contracts c ON b.contract_id = c.contract_id
      WHERE c.tenant_id = $1
      ORDER BY b.bill_id DESC;
    `;
    const result = await db.query(query, [userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ผู้เช่าแก้ไขข้อมูลส่วนตัว (เช่น เบอร์โทรศัพท์)
exports.updateMyProfile = async (req, res) => {
  const userId = req.user.user_id;
  const { phone, first_name, last_name } = req.body;
  try {
    const result = await db.query(
      `UPDATE users 
       SET phone = COALESCE($1, phone), 
           first_name = COALESCE($2, first_name), 
           last_name = COALESCE($3, last_name)
       WHERE user_id = $4 RETURNING user_id, username, first_name, last_name, phone, role`,
      [phone, first_name, last_name, userId]
    );
    res.json({ message: 'Profile updated successfully', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};