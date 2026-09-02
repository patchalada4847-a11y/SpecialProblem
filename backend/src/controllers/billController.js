const db = require('../config/db');

exports.getBills = async (req, res) => {
  try {
    const query = `
      SELECT 
        b.bill_id, b.month, b.year, b.rent_amount,
        b.water_unit, b.water_amount, b.electric_unit, b.electric_amount,
        b.total_amount, b.payment_status, b.due_date,
        r.room_number,
        u.first_name, u.last_name
      FROM t_bills b
      JOIN m_contracts c ON b.contract_id = c.contract_id
      JOIN m_rooms r ON c.room_id = r.room_id
      JOIN m_users u ON c.tenant_id = u.user_id
      ORDER BY b.bill_id DESC;
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createBill = async (req, res) => {
  const { contract_id, month, year, water_unit, electric_unit, due_date } = req.body;
  const WATER_RATE = 18.00;
  const ELECTRIC_RATE = 8.00;

  try {
    const contractQuery = `
      SELECT c.contract_id, r.base_price 
      FROM m_contracts c 
      JOIN m_rooms r ON c.room_id = r.room_id 
      WHERE c.contract_id = $1 AND c.status = 'active';
    `;
    const contractResult = await db.query(contractQuery, [contract_id]);

    if (contractResult.rows.length === 0) {
      return res.status(404).json({ message: 'Active contract not found' });
    }

    const rent_amount = parseFloat(contractResult.rows[0].base_price);
    const water_amount = water_unit * WATER_RATE;
    const electric_amount = electric_unit * ELECTRIC_RATE;
    const total_amount = rent_amount + water_amount + electric_amount;

    const insertQuery = `
      INSERT INTO t_bills (
        contract_id, month, year, rent_amount, 
        water_unit, water_amount, electric_unit, electric_amount, 
        total_amount, payment_status, due_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10)
      RETURNING *;
    `;

    const result = await db.query(insertQuery, [
      contract_id, month, year, rent_amount,
      water_unit, water_amount, electric_unit, electric_amount,
      total_amount, due_date
    ]);

    res.status(201).json({
      message: 'Bill created successfully',
      bill: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};