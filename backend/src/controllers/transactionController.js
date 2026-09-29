const db = require('../config/db');

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// ดึงรายการประวัติการเงินทั้งหมด
exports.getTransactions = async (req, res) => {
  const { start_date, end_date } = req.query;
  if (
    (start_date && !isValidDate(start_date)) ||
    (end_date && !isValidDate(end_date)) ||
    (start_date && end_date && start_date > end_date)
  ) {
    return res.status(400).json({ error: 'ช่วงวันที่ไม่ถูกต้อง' });
  }
  try {
    const result = await db.query(
      `SELECT * FROM t_transactions
       WHERE ($1::date IS NULL OR transaction_date >= $1::date)
         AND ($2::date IS NULL OR transaction_date <= $2::date)
       ORDER BY transaction_date DESC`,
      [start_date || null, end_date || null]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createExpense = async (req, res) => {
  const { category, amount, description, transaction_date } = req.body || {};
  const parsedAmount = Number(amount);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const parsedDate = transaction_date || today;

  if (
    typeof category !== 'string' ||
    !category.trim() ||
    typeof description !== 'string' ||
    !description.trim() ||
    !Number.isFinite(parsedAmount) ||
    parsedAmount <= 0
  ) {
    return res.status(400).json({ error: 'กรุณาระบุหมวดหมู่ รายละเอียด และจำนวนเงินที่มากกว่า 0' });
  }
  if (!isValidDate(parsedDate)) {
    return res.status(400).json({ error: 'วันที่ทำรายการไม่ถูกต้อง' });
  }

  try {
    const result = await db.query(
      `INSERT INTO t_transactions (type, category, amount, description, transaction_date)
       VALUES ('expense', $1, $2, $3, $4)
       RETURNING *`,
      [category.trim(), parsedAmount, description.trim(), parsedDate]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateExpense = async (req, res) => {
  const { id } = req.params;
  const { category, amount, description, transaction_date } = req.body || {};
  const parsedAmount = Number(amount);

  if (
    !Number.isInteger(Number(id)) ||
    typeof category !== 'string' ||
    !category.trim() ||
    typeof description !== 'string' ||
    !description.trim() ||
    !Number.isFinite(parsedAmount) ||
    parsedAmount <= 0
  ) {
    return res.status(400).json({ error: 'กรุณาระบุหมวดหมู่ รายละเอียด และจำนวนเงินที่มากกว่า 0' });
  }
  if (
    typeof transaction_date !== 'string' ||
    !isValidDate(transaction_date)
  ) {
    return res.status(400).json({ error: 'วันที่ทำรายการไม่ถูกต้อง' });
  }

  try {
    const result = await db.query(
      `UPDATE t_transactions
       SET category = $1, amount = $2, description = $3, transaction_date = $4
       WHERE transaction_id = $5 AND type = 'expense'
       RETURNING *`,
      [category.trim(), parsedAmount, description.trim(), transaction_date, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบรายการรายจ่ายที่ระบุ' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteExpense = async (req, res) => {
  const { id } = req.params;
  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ error: 'รหัสรายการไม่ถูกต้อง' });
  }

  try {
    const result = await db.query(
      `DELETE FROM t_transactions
       WHERE transaction_id = $1 AND type = 'expense'
       RETURNING transaction_id`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบรายการรายจ่ายที่ระบุ' });
    }
    res.json({ message: 'ลบรายการรายจ่ายแล้ว' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ชำระเงินบิล (Pay Bill) -> เปลี่ยนสถานะบิลเป็น paid + บันทึกรายรับอัตโนมัติ
exports.payBill = async (req, res) => {
  const { bill_id } = req.body;

  try {
    const result = await db.query(`
      WITH paid_bill AS (
        UPDATE t_bills
        SET payment_status = 'paid'
        WHERE bill_id = $1 AND payment_status <> 'paid'
        RETURNING bill_id, month, year, total_amount
      )
      INSERT INTO t_transactions (type, category, amount, description, transaction_date)
      SELECT
        'income',
        'Rent Payment',
        total_amount,
        'ชำระบิลประจำเดือน ' || month || '/' || year || ' (Bill ID: ' || bill_id || ')',
        CURRENT_DATE
      FROM paid_bill
      RETURNING *;
    `, [bill_id]);

    if (result.rows.length === 0) {
      const billResult = await db.query(
        'SELECT payment_status FROM t_bills WHERE bill_id = $1',
        [bill_id]
      );
      if (billResult.rows.length === 0) {
        return res.status(404).json({ message: 'Bill not found' });
      }
      return res.status(400).json({ message: 'This bill has already been paid' });
    }

    res.status(200).json({
      message: 'Bill paid successfully',
      transaction: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};