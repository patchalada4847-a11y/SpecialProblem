const db = require('../config/db');

exports.getContracts = async (req, res) => {
  try {
    const query = `
      SELECT 
        c.contract_id, c.tenant_id, c.room_id, c.start_date, c.end_date, c.deposit, c.status,
        r.room_number, r.base_price,
        u.first_name, u.last_name, u.phone
      FROM m_contracts c
      JOIN m_rooms r ON c.room_id = r.room_id
      JOIN m_users u ON c.tenant_id = u.user_id
      ORDER BY c.contract_id DESC;
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createContract = async (req, res) => {
  const { room_id, tenant_id, start_date, end_date, deposit } = req.body;
  try {
    const contractQuery = `
      INSERT INTO m_contracts (room_id, tenant_id, start_date, end_date, deposit, status)
      VALUES ($1, $2, $3, $4, $5, 'active')
      RETURNING *;
    `;
    const contractResult = await db.query(contractQuery, [room_id, tenant_id, start_date, end_date, deposit]);
    await db.query("UPDATE m_rooms SET status = 'occupied' WHERE room_id = $1", [room_id]);

    res.status(201).json({
      message: 'Contract created successfully',
      contract: contractResult.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateContractStatus = async (req, res) => {
  const { id } = req.params;
  const { status, start_date, end_date, deposit } = req.body || {};
  const validStatuses = ['active', 'terminated', 'expired'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'สถานะสัญญาไม่ถูกต้อง' });
  }
  if (deposit != null && (!Number.isFinite(Number(deposit)) || Number(deposit) < 0)) {
    return res.status(400).json({ error: 'เงินประกันต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป' });
  }
  if (start_date && end_date && new Date(start_date) > new Date(end_date)) {
    return res.status(400).json({ error: 'วันเริ่มสัญญาต้องไม่อยู่หลังวันสิ้นสุดสัญญา' });
  }
  try {
    const result = await db.query(
      `UPDATE m_contracts
       SET status = $1,
           start_date = COALESCE($2, start_date),
           end_date = COALESCE($3, end_date),
           deposit = COALESCE($4, deposit)
       WHERE contract_id = $5
       RETURNING *`,
      [status, start_date || null, end_date || null, deposit ?? null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Contract not found' });

    const contract = result.rows[0];
    const activeRoomResult = await db.query(
      "SELECT 1 FROM m_contracts WHERE room_id = $1 AND status = 'active' LIMIT 1",
      [contract.room_id]
    );
    await db.query(
      'UPDATE m_rooms SET status = $1 WHERE room_id = $2',
      [activeRoomResult.rows.length > 0 ? 'occupied' : 'vacant', contract.room_id]
    );

    res.json({ message: 'Contract status updated', contract: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};