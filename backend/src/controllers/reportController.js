const db = require('../config/db');

exports.getDashboardSummary = async (req, res) => {
  try {
    const roomStats = await db.query(`
      SELECT status, COUNT(*) as count 
      FROM m_rooms GROUP BY status
    `);

    const financialStats = await db.query(`
      SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense,
        (SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) - 
         SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END)) as net_profit
      FROM t_transactions
    `);

    const pendingBills = await db.query(`
      SELECT COUNT(*) as unpaid_count, SUM(total_amount) as unpaid_amount 
      FROM t_bills WHERE payment_status = 'pending'
    `);

    res.json({
      room_summary: roomStats.rows,
      financial_summary: financialStats.rows[0],
      pending_bills_summary: pendingBills.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMonthlyFinancialReport = async (req, res) => {
  try {
    const query = `
      SELECT 
        TO_CHAR(transaction_date, 'YYYY-MM') as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
      FROM t_transactions
      GROUP BY TO_CHAR(transaction_date, 'YYYY-MM')
      ORDER BY month ASC;
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};