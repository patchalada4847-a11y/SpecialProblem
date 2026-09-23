const db = require('../config/db');

exports.getRooms = async (req, res) => {
  try {
    const query = `
      SELECT 
        r.room_id,
        r.room_number,
        r.floor,
        r.room_type,
        r.base_price,
        r.status,
        c.contract_id,
        c.start_date,
        c.end_date,
        c.deposit,
        u.user_id AS tenant_id,
        u.first_name,
        u.last_name,
        u.phone,
        u.username
      FROM m_rooms r
      LEFT JOIN m_contracts c ON r.room_id = c.room_id AND c.status = 'active'
      LEFT JOIN m_users u ON c.tenant_id = u.user_id
      ORDER BY r.floor ASC, r.room_number ASC;
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createRoom = async (req, res) => {
  const { room_number, floor, room_type, base_price, status } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO m_rooms (room_number, floor, room_type, base_price, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [room_number, floor, room_type || 'Standard', base_price, status || 'vacant']
    );
    res.status(201).json({ message: 'Room created successfully', room: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateRoom = async (req, res) => {
  const { id } = req.params;
  const { room_number, floor, room_type, base_price, status } = req.body;
  try {
    const result = await db.query(
      `UPDATE m_rooms 
       SET room_number = $1, floor = $2, room_type = $3, base_price = $4, status = $5 
       WHERE room_id = $6 RETURNING *`,
      [room_number, floor, room_type, base_price, status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Room not found' });
    res.json({ message: 'Room updated successfully', room: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteRoom = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM m_rooms WHERE room_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Room not found' });
    res.json({ message: 'Room deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};