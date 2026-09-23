const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// 1. ฟังก์ชันสมัครสมาชิก (Register พร้อมแนบเอกสาร KYC)
exports.register = async (req, res) => {
  const { username, password, first_name, last_name, phone, role = 'tenant', kyc_document } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    // ผู้เช่าตั้งค่าเริ่มต้นเป็น pending เพื่อรอแอดมินอนุมัติ ส่วน admin เป็น approved ทันที
    const userStatus = role === 'admin' ? 'approved' : 'pending';

    const result = await db.query(
      `INSERT INTO m_users (username, password, first_name, last_name, phone, role, status, kyc_document)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING user_id, username, role, status`,
      [username, hashedPassword, first_name, last_name, phone, role, userStatus, kyc_document || null]
    );

    res.status(201).json({
      message: role === 'tenant' 
        ? 'ลงทะเบียนสำเร็จ กรุณารอผู้ดูแลระบบตรวจสอบและอนุมัติเอกสาร' 
        : 'ลงทะเบียนสำเร็จ สามารถเข้าสู่ระบบได้ทันที',
      user: result.rows[0]
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' });
    }
    res.status(500).json({ error: err.message });
  }
};

// 2. ฟังก์ชันเข้าสู่ระบบ (Login)
exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const userQuery = await db.query('SELECT * FROM m_users WHERE username = $1', [username]);
    if (userQuery.rows.length === 0) return res.status(404).json({ message: 'User not found' });

    const user = userQuery.rows[0];

    // ตรวจสอบรหัสผ่าน
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: 'Invalid password' });

    // ตรวจสอบสถานะการอนุมัติเอกสาร (KYC) หลังถอดรหัสผ่านผ่านแล้ว
    if (user.status === 'pending') {
      return res.status(403).json({ message: 'บัญชีของคุณอยู่ระหว่างรอผู้ดูแลระบบตรวจสอบเอกสาร (KYC)' });
    }
    if (user.status === 'rejected') {
      return res.status(403).json({ message: 'เอกสารของคุณไม่ผ่านการอนุมัติ กรุณาติดต่อผู้ดูแลหอพัก' });
    }

    // สร้าง Token
    const token = jwt.sign(
      { user_id: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { user_id: user.user_id, username: user.username, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};