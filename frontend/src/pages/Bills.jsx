import { useState, useEffect } from 'react';
import { FileText, CheckCircle, Clock, X, Image as ImageIcon, Check } from 'lucide-react';
import api from '../api/axios';

export default function Bills() {
  const [bills, setBills] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewSlip, setViewSlip] = useState(null); // ดูรูปสลิปขยายใหญ่
  const [form, setForm] = useState({ contract_id: '', month: 9, year: 2026, water_unit: '', electric_unit: '', due_date: '' });

  const fetchData = async () => {
    try {
      const [resBills, resContracts] = await Promise.all([
        api.get('/bills'),
        api.get('/contracts')
      ]);
      setBills(resBills.data);
      setContracts(resContracts.data.filter(c => c.status === 'active'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateBill = async (e) => {
    e.preventDefault();
    try {
      await api.post('/bills', {
        contract_id: Number(form.contract_id),
        month: Number(form.month),
        year: Number(form.year),
        water_unit: Number(form.water_unit || 0),
        electric_unit: Number(form.electric_unit || 0),
        due_date: form.due_date
      });
      setShowModal(false);
      setForm({ contract_id: '', month: 9, year: 2026, water_unit: '', electric_unit: '', due_date: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || 'ไม่สามารถออกบิลได้');
    }
  };

  const handlePayBill = async (billId) => {
    if (!confirm('ยืนยันว่าได้รับยอดเงินและต้องการอนุมัติการชำระเงิน?')) return;
    try {
      // เรียกใช้ Endpoint pay-bill ตาม transactionRoutes.js
      await api.post('/transactions/pay-bill', { bill_id: billId });
      alert('อนุมัติการชำระเงินสำเร็จ และบันทึกรายรับเข้าระบบเรียบร้อย');
      setViewSlip(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || 'ไม่สามารถชำระเงินได้');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">การแจ้งชำระเงิน</h1>
          <p className="text-sm text-gray-500">ตรวจสอบสลิปโอนเงิน และอนุมัติการชำระเงินประจำเดือน</p>
        </div>
        <button 
          onClick={() => setShowModal(true)} 
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition cursor-pointer font-medium shadow-sm"
        >
          <FileText size={18} /> ออกบิลประจำเดือน
        </button>
      </div>

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
                  <th className="p-3">รอบเดือน/ปี</th>
                  <th className="p-3">ยอดรวม</th>
                  <th className="p-3">สถานะ</th>
                  <th className="p-3">หลักฐานสลิป</th>
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
                          <Check size={14} /> ยืนยันว่าจ่ายแล้ว
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

      {/* Modal ดูภาพสลิปเพื่อตรวจสอบ */}
      {viewSlip && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-2">
              <div>
                <h3 className="font-bold text-gray-800 text-sm">ตรวจสอบสลิป ห้อง {viewSlip.room_number}</h3>
                <p className="text-xs text-gray-500">ยอดที่ต้องชำระ: ฿{Number(viewSlip.total_amount).toLocaleString()}</p>
              </div>
              <button onClick={() => setViewSlip(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            
            <div className="max-h-[380px] overflow-auto flex justify-center bg-gray-50 rounded-lg p-2">
              <img src={viewSlip.slip_image} alt="Slip" className="max-w-full rounded-md shadow" />
            </div>

            <div className="space-y-2 pt-1">
              {viewSlip.payment_status === 'pending' && (
                <button
                  onClick={() => handlePayBill(viewSlip.bill_id)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Check size={16} /> ยืนยันยอดเงินและอนุมัติบิลนี้
                </button>
              )}
              <button 
                onClick={() => setViewSlip(null)} 
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ออกบิล */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-gray-800">ออกบิลประจำเดือน</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateBill} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">เลือกสัญญาเช่า</label>
                <select required value={form.contract_id} onChange={(e) => setForm({...form, contract_id: e.target.value})} className="w-full border p-2 rounded-lg text-sm">
                  <option value="">-- เลือกสัญญา --</option>
                  {contracts.map(c => <option key={c.contract_id} value={c.contract_id}>สัญญา #{c.contract_id} (ห้อง {c.room_number} - {c.first_name})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">เดือน (1-12)</label>
                  <input type="number" required value={form.month} onChange={(e) => setForm({...form, month: e.target.value})} className="w-full border p-2 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">ปี (ค.ศ.)</label>
                  <input type="number" required value={form.year} onChange={(e) => setForm({...form, year: e.target.value})} className="w-full border p-2 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">หน่วยค่าน้ำ (หน่วยละ 18 บาท)</label>
                <input type="number" required value={form.water_unit} onChange={(e) => setForm({...form, water_unit: e.target.value})} className="w-full border p-2 rounded-lg text-sm" placeholder="เช่น 10" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">หน่วยค่าไฟ (หน่วยละ 8 บาท)</label>
                <input type="number" required value={form.electric_unit} onChange={(e) => setForm({...form, electric_unit: e.target.value})} className="w-full border p-2 rounded-lg text-sm" placeholder="เช่น 120" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">กำหนดชำระ (Due Date)</label>
                <input type="date" required value={form.due_date} onChange={(e) => setForm({...form, due_date: e.target.value})} className="w-full border p-2 rounded-lg text-sm" />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 mt-2">ออกบิล</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}