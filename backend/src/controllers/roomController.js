const db = require('../config/db');

exports.getRooms = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM m_rooms ORDER BY room_number ASC');
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