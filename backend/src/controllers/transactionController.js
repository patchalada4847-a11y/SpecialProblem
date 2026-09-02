const db = require('../config/db');

// ดึงรายการประวัติการเงินทั้งหมด
exports.getTransactions = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM t_transactions ORDER BY transaction_date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ชำระเงินบิล (Pay Bill) -> เปลี่ยนสถานะบิลเป็น paid + บันทึกรายรับอัตโนมัติ
exports.payBill = async (req, res) => {
  const { bill_id } = req.body;

  try {
    // 1. ดึงข้อมูลบิล
    const billQuery = await db.query('SELECT * FROM t_bills WHERE bill_id = $1', [bill_id]);
    if (billQuery.rows.length === 0) return res.status(404).json({ message: 'Bill not found' });

    const bill = billQuery.rows[0];
    if (bill.payment_status === 'paid') {
      return res.status(400).json({ message: 'This bill has already been paid' });
    }

    // 2. อัปเดตสถานะบิลเป็น paid
    await db.query("UPDATE t_bills SET payment_status = 'paid' WHERE bill_id = $1", [bill_id]);

    // 3. บันทึกเข้าตาราง t_transactions เป็นรายรับ (income)
    const transactionQuery = `
      INSERT INTO t_transactions (type, category, amount, description, transaction_date)
      VALUES ('income', 'Rent Payment', $1, $2, CURRENT_DATE)
      RETURNING *;
    `;
    const description = `ชำระบิลประจำเดือน ${bill.month}/${bill.year} (Bill ID: ${bill.bill_id})`;
    const result = await db.query(transactionQuery, [bill.total_amount, description]);

    res.status(200).json({
      message: 'Bill paid successfully',
      transaction: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};