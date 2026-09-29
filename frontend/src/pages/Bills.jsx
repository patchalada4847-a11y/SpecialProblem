import { useState, useEffect } from 'react';
import { FileText, CheckCircle, Clock, X, Image as ImageIcon, Check, Calculator } from 'lucide-react';
import api from '../api/axios';
import useToast from '../components/useToast';

export default function Bills() {
  const notify = useToast();
  const [bills, setBills] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewSlip, setViewSlip] = useState(null);
  const [rates, setRates] = useState({ water_rate: 18, electric_rate: 8 });

  // ฟอร์มออกบิล
  const [form, setForm] = useState({
    contract_id: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    water_old_meter: 0,
    water_new_meter: '',
    electric_old_meter: 0,
    electric_new_meter: '',
    due_date: ''
  });

  const [selectedContractPrice, setSelectedContractPrice] = useState(0);

  const fetchData = async () => {
    try {
      const [resBills, resContracts, resSettings] = await Promise.all([
        api.get('/bills'),
        api.get('/contracts'),
        api.get('/settings')
      ]);
      setBills(resBills.data);
      setContracts(resContracts.data.filter(c => c.status === 'active'));
      setRates({
        water_rate: Number(resSettings.data.water_rate),
        electric_rate: Number(resSettings.data.electric_rate)
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // เมื่อเลือกสัญญา ให้ไปดึงมิเตอร์เก่า และค่าเช่าห้องมาตั้งต้น
  const handleContractChange = async (contractId) => {
    const found = contracts.find(c => c.contract_id === Number(contractId));
    setSelectedContractPrice(found ? Number(found.base_price || 0) : 0);

    if (!contractId) {
      setForm(prev => ({
        ...prev,
        contract_id: '',
        water_old_meter: 0,
        electric_old_meter: 0
      }));
      return;
    }

    try {
      const res = await api.get(`/bills/last-meter/${contractId}`);
      setForm(prev => ({
        ...prev,
        contract_id: contractId,
        water_old_meter: Number(res.data.last_water_meter || 0),
        water_new_meter: '',
        electric_old_meter: Number(res.data.last_electric_meter || 0),
        electric_new_meter: ''
      }));
    } catch (err) {
      console.error(err);
    }
  };

  // คำนวณสรุปหน่วยและราคาทันที
  const waterUnits = Math.max(0, Number(form.water_new_meter || 0) - Number(form.water_old_meter || 0));
  const waterCost = waterUnits * rates.water_rate;
  const electricUnits = Math.max(0, Number(form.electric_new_meter || 0) - Number(form.electric_old_meter || 0));
  const electricCost = electricUnits * rates.electric_rate;
  const estimatedTotal = selectedContractPrice + waterCost + electricCost;

  const handleCreateBill = async (e) => {
    e.preventDefault();
    if (Number(form.water_new_meter) < Number(form.water_old_meter)) {
      notify('เลขมิเตอร์น้ำใหม่ ต้องไม่น้อยกว่ามิเตอร์เก่า', 'error');
      return;
    }
    if (Number(form.electric_new_meter) < Number(form.electric_old_meter)) {
      notify('เลขมิเตอร์ไฟใหม่ ต้องไม่น้อยกว่ามิเตอร์เก่า', 'error');
      return;
    }

    try {
      await api.post('/bills', {
        contract_id: Number(form.contract_id),
        month: Number(form.month),
        year: Number(form.year),
        water_old_meter: Number(form.water_old_meter),
        water_new_meter: Number(form.water_new_meter),
        electric_old_meter: Number(form.electric_old_meter),
        electric_new_meter: Number(form.electric_new_meter),
        due_date: form.due_date
      });

      notify('ออกบิลสำเร็จเรียบร้อย', 'success');
      setShowModal(false);
      setForm({
        contract_id: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        water_old_meter: 0,
        water_new_meter: '',
        electric_old_meter: 0,
        electric_new_meter: '',
        due_date: ''
      });
      fetchData();
    } catch (err) {
      notify(err.response?.data?.error || err.response?.data?.message || 'ไม่สามารถออกบิลได้', 'error');
    }
  };

  const handlePayBill = async (billId) => {
    if (!confirm('ยืนยันว่าได้รับยอดเงินและต้องการอนุมัติการชำระเงิน?')) return;
    try {
      await api.post('/transactions/pay-bill', { bill_id: billId });
      notify('อนุมัติการชำระเงินสำเร็จ', 'success');
      setViewSlip(null);
      fetchData();
    } catch (err) {
      notify(err.response?.data?.error || 'ไม่สามารถทำรายการได้', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">การแจ้งชำระเงิน</h1>
          <p className="text-sm text-gray-500">ออกบิลมิเตอร์น้ำ-ไฟ และตรวจสอบการชำระเงิน</p>
        </div>
        <button 
          onClick={() => setShowModal(true)} 
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition cursor-pointer font-medium shadow-sm"
        >
          <FileText size={18} /> ออกบิลประจำเดือน
        </button>
      </div>

      {/* ตารางแสดงบิล */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        {loading ? (
          <p className="text-center py-6 text-gray-500">กำลังโหลดข้อมูล...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 uppercase border-b">
                <tr>
                  <th className="p-3">บิล #</th>
                  <th className="p-3">ห้อง / ผู้เช่า</th>
                  <th className="p-3">รอบเดือน</th>
                  <th className="p-3">มิเตอร์น้ำ (เก่า ➔ ใหม่)</th>
                  <th className="p-3">มิเตอร์ไฟ (เก่า ➔ ใหม่)</th>
                  <th className="p-3">ยอดรวม</th>
                  <th className="p-3">สถานะ</th>
                  <th className="p-3">สลิป</th>
                  <th className="p-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => (
                  <tr key={b.bill_id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-semibold text-gray-800">#{b.bill_id}</td>
                    <td className="p-3">
                      <div className="font-semibold text-gray-800">ห้อง {b.room_number}</div>
                      <div className="text-xs text-gray-400">{b.first_name} {b.last_name}</div>
                    </td>
                    <td className="p-3">{b.month}/{b.year}</td>
                    <td className="p-3 text-xs">
                      {b.water_old_meter ?? 0} ➔ {b.water_new_meter ?? b.water_unit}
                      <span className="text-indigo-600 block font-medium">({b.water_unit} หน่วย = ฿{b.water_amount})</span>
                    </td>
                    <td className="p-3 text-xs">
                      {b.electric_old_meter ?? 0} ➔ {b.electric_new_meter ?? b.electric_unit}
                      <span className="text-indigo-600 block font-medium">({b.electric_unit} หน่วย = ฿{b.electric_amount})</span>
                    </td>
                    <td className="p-3 font-semibold text-indigo-600">฿{Number(b.total_amount).toLocaleString()}</td>
                    <td className="p-3">
                      {b.payment_status === 'paid' ? (
                        <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full text-xs w-fit font-medium">
                          <CheckCircle size={14} /> ชำระแล้ว
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full text-xs w-fit font-medium">
                          <Clock size={14} /> รอชำระ
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {b.slip_image ? (
                        <button
                          onClick={() => setViewSlip(b)}
                          className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition"
                        >
                          <ImageIcon size={14} /> ดูสลิป
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">ยังไม่แนบ</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {b.payment_status === 'pending' ? (
                        <button 
                          onClick={() => handlePayBill(b.bill_id)} 
                          className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          <Check size={14} /> ยืนยันการจ่าย
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal ออกบิลคำนวณมิเตอร์ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <Calculator className="text-indigo-600" size={20} /> ออกบิลประจำเดือน (คำนวณมิเตอร์)
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateBill} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">เลือกสัญญาเช่า / ห้องพัก</label>
                <select 
                  required 
                  value={form.contract_id} 
                  onChange={(e) => handleContractChange(e.target.value)} 
                  className="w-full border p-2.5 rounded-lg text-sm bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- เลือกสัญญาเช่า --</option>
                  {contracts.map(c => (
                    <option key={c.contract_id} value={c.contract_id}>
                      ห้อง {c.room_number} - คุณ{c.first_name} {c.last_name} (ค่าห้อง ฿{Number(c.base_price).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">ประจำเดือน (1-12)</label>
                  <input type="number" min="1" max="12" required value={form.month} onChange={(e) => setForm({...form, month: e.target.value})} className="w-full border p-2 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">ปี (ค.ศ.)</label>
                  <input type="number" required value={form.year} onChange={(e) => setForm({...form, year: e.target.value})} className="w-full border p-2 rounded-lg text-sm" />
                </div>
              </div>

              {/* บล็อกมิเตอร์น้ำ */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-blue-900">มิเตอร์น้ำ (หน่วยละ {rates.water_rate} บาท)</span>
                  <span className="text-xs font-medium text-blue-700">ใช้ไป: {waterUnits} หน่วย (฿{waterCost.toLocaleString()})</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">มิเตอร์เก่า</label>
                    <input type="number" readOnly value={form.water_old_meter} className="w-full border bg-gray-100 p-2 rounded-lg text-sm text-gray-600 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-blue-700 font-medium mb-1">มิเตอร์ใหม่ล่าสุด *</label>
                    <input 
                      type="number" 
                      required 
                      value={form.water_new_meter} 
                      onChange={(e) => setForm({...form, water_new_meter: e.target.value})} 
                      className="w-full border p-2 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" 
                      placeholder={`>= ${form.water_old_meter}`}
                    />
                  </div>
                </div>
              </div>

              {/* บล็อกมิเตอร์ไฟ */}
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-amber-900">มิเตอร์ไฟ (หน่วยละ {rates.electric_rate} บาท)</span>
                  <span className="text-xs font-medium text-amber-700">ใช้ไป: {electricUnits} หน่วย (฿{electricCost.toLocaleString()})</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">มิเตอร์เก่า</label>
                    <input type="number" readOnly value={form.electric_old_meter} className="w-full border bg-gray-100 p-2 rounded-lg text-sm text-gray-600 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-amber-700 font-medium mb-1">มิเตอร์ใหม่ล่าสุด *</label>
                    <input 
                      type="number" 
                      required 
                      value={form.electric_new_meter} 
                      onChange={(e) => setForm({...form, electric_new_meter: e.target.value})} 
                      className="w-full border p-2 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-amber-500" 
                      placeholder={`>= ${form.electric_old_meter}`}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">กำหนดชำระ (Due Date)</label>
                <input type="date" required value={form.due_date} onChange={(e) => setForm({...form, due_date: e.target.value})} className="w-full border p-2 rounded-lg text-sm" />
              </div>

              {/* ยอดประเมินรวม */}
              <div className="p-3 bg-gray-50 rounded-xl flex justify-between items-center text-sm font-semibold">
                <span className="text-gray-700">ยอดรวมทั้งสิ้น (ค่าห้อง+น้ำ+ไฟ):</span>
                <span className="text-indigo-600 text-base">฿{estimatedTotal.toLocaleString()}</span>
              </div>

              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition shadow-md cursor-pointer">
                คำนวณและออกบิล
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal ดูสลิป */}
      {viewSlip && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-gray-800 text-sm">หลักฐานการโอนเงิน ห้อง {viewSlip.room_number}</h3>
              <button onClick={() => setViewSlip(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="max-h-[380px] overflow-auto flex justify-center bg-gray-50 rounded-lg p-2">
              <img src={viewSlip.slip_image} alt="Slip" className="max-w-full rounded-md shadow" />
            </div>
            <div className="space-y-2 pt-1">
              {viewSlip.payment_status === 'pending' && (
                <button
                  onClick={() => handlePayBill(viewSlip.bill_id)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Check size={16} /> ยืนยันยอดเงินและอนุมัติบิลนี้
                </button>
              )}
              <button onClick={() => setViewSlip(null)} className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium">ปิด</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}