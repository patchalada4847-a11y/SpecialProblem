const db = require('../config/db');

exports.getBills = async (req, res) => {
  try {
    const query = `
      SELECT 
        b.bill_id, b.month, b.year, b.rent_amount,
        b.water_unit, b.water_amount, b.electric_unit, b.electric_amount,
        b.water_old_meter, b.water_new_meter,
        b.electric_old_meter, b.electric_new_meter,
        b.total_amount, b.payment_status, b.due_date,
        b.slip_image,
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

// ดึงเลขมิเตอร์ล่าสุดของสัญญาห้องพักนี้ (เพื่อนำไปเป็นมิเตอร์เก่า)
exports.getLastMeter = async (req, res) => {
  const { contract_id } = req.params;
  try {
    const query = `
      SELECT 
        COALESCE(water_new_meter, 0) AS last_water_meter,
        COALESCE(electric_new_meter, 0) AS last_electric_meter
      FROM t_bills 
      WHERE contract_id = $1 
      ORDER BY bill_id DESC 
      LIMIT 1;
    `;
    const result = await db.query(query, [contract_id]);
    
    if (result.rows.length === 0) {
      return res.json({ last_water_meter: 0, last_electric_meter: 0 });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ออกบิลประจำเดือน
exports.createBill = async (req, res) => {
  const { 
    contract_id, month, year, 
    water_old_meter, water_new_meter, 
    electric_old_meter, electric_new_meter, 
    due_date 
  } = req.body || {};

  try {
    const parsedWaterOld = Number(water_old_meter || 0);
    const parsedWaterNew = Number(water_new_meter || 0);
    const parsedElectricOld = Number(electric_old_meter || 0);
    const parsedElectricNew = Number(electric_new_meter || 0);

    if (parsedWaterNew < parsedWaterOld) {
      return res.status(400).json({ error: 'เลขมิเตอร์น้ำใหม่ ต้องไม่น้อยกว่ามิเตอร์น้ำเก่า' });
    }
    if (parsedElectricNew < parsedElectricOld) {
      return res.status(400).json({ error: 'เลขมิเตอร์ไฟใหม่ ต้องไม่น้อยกว่ามิเตอร์ไฟเก่า' });
    }

    // คำนวณจำนวนหน่วยที่ใช้จริง
    const water_unit = parsedWaterNew - parsedWaterOld;
    const electric_unit = parsedElectricNew - parsedElectricOld;

    // ดึงค่าเช่าห้องตามสัญญา
    const contractQuery = `
      SELECT c.contract_id, r.base_price 
      FROM m_contracts c 
      JOIN m_rooms r ON c.room_id = r.room_id 
      WHERE c.contract_id = $1;
    `;
    const contractResult = await db.query(contractQuery, [contract_id]);

    if (contractResult.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบสัญญาเช่าที่ระบุ' });
    }

    const rent_amount = parseFloat(contractResult.rows[0].base_price || 0);
    const ratesResult = await db.query(
      'SELECT water_rate, electric_rate FROM m_billing_settings WHERE setting_id = 1'
    );
    const { water_rate, electric_rate } = ratesResult.rows[0];
    const water_amount = water_unit * Number(water_rate);
    const electric_amount = electric_unit * Number(electric_rate);
    const total_amount = rent_amount + water_amount + electric_amount;

    const insertQuery = `
      INSERT INTO t_bills (
        contract_id, month, year, rent_amount, 
        water_old_meter, water_new_meter, water_unit, water_amount,
        electric_old_meter, electric_new_meter, electric_unit, electric_amount, 
        total_amount, payment_status, due_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending', $14)
      RETURNING *;
    `;

    const result = await db.query(insertQuery, [
      contract_id, month, year, rent_amount,
      parsedWaterOld, parsedWaterNew, water_unit, water_amount,
      parsedElectricOld, parsedElectricNew, electric_unit, electric_amount,
      total_amount, due_date
    ]);

    res.status(201).json({
      message: 'ออกบิลสำเร็จ',
      bill: result.rows[0]
    });
  } catch (err) {
    console.error('Error in createBill:', err);
    res.status(500).json({ error: err.message });
  }
};