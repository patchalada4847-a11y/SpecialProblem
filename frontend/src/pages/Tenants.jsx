import { useState, useEffect } from 'react';
import { UserPlus, X } from 'lucide-react';
import api from '../api/axios';

export default function Tenants() {
  const [contracts, setContracts] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ room_id: '', tenant_id: '', start_date: '', end_date: '', deposit: '' });

  const fetchData = async () => {
    try {
      const [resContracts, resRooms] = await Promise.all([
        api.get('/contracts'),
        api.get('/rooms')
      ]);
      setContracts(resContracts.data);
      setRooms(resRooms.data.filter(r => r.status === 'vacant')); // แสดงเฉพาะห้องว่าง
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateContract = async (e) => {
    e.preventDefault();
    try {
      await api.post('/contracts', {
        room_id: Number(form.room_id),
        tenant_id: Number(form.tenant_id),
        start_date: form.start_date,
        end_date: form.end_date,
        deposit: Number(form.deposit)
      });
      setShowModal(false);
      setForm({ room_id: '', tenant_id: '', start_date: '', end_date: '', deposit: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || 'ไม่สามารถสร้างสัญญาได้');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">จัดการผู้เช่าและสัญญา</h1>
        <button 
          onClick={() => setShowModal(true)} 
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition cursor-pointer"
        >
          <UserPlus size={18} /> ทำสัญญาเช่าใหม่
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        {loading ? (
          <p className="text-center py-4 text-gray-500">กำลังโหลดข้อมูล...</p>
        ) : (
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 uppercase border-b">
              <tr>
                <th className="p-3">สัญญา #</th>
                <th className="p-3">ห้องพัก</th>
                <th className="p-3">ผู้เช่า</th>
                <th className="p-3">เบอร์โทร</th>
                <th className="p-3">เงินประกัน</th>
                <th className="p-3">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.contract_id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-semibold text-gray-800">#{c.contract_id}</td>
                  <td className="p-3 font-semibold text-indigo-600">ห้อง {c.room_number}</td>
                  <td className="p-3 font-medium text-gray-800">{c.first_name} {c.last_name}</td>
                  <td className="p-3">{c.phone}</td>
                  <td className="p-3">฿{Number(c.deposit).toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-gray-800">ทำสัญญาเช่าใหม่</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateContract} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">เลือกห้องพัก (เฉพาะห้องว่าง)</label>
                <select required value={form.room_id} onChange={(e) => setForm({...form, room_id: e.target.value})} className="w-full border p-2 rounded-lg text-sm">
                  <option value="">-- เลือกห้องพัก --</option>
                  {rooms.map(r => <option key={r.room_id} value={r.room_id}>ห้อง {r.room_number} (฿{r.base_price})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">User ID ของผู้เช่า (tenant_id)</label>
                <input type="number" required value={form.tenant_id} onChange={(e) => setForm({...form, tenant_id: e.target.value})} className="w-full border p-2 rounded-lg text-sm" placeholder="เช่น 1" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">เงินประกัน (Deposit)</label>
                <input type="number" required value={form.deposit} onChange={(e) => setForm({...form, deposit: e.target.value})} className="w-full border p-2 rounded-lg text-sm" placeholder="5000" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">วันเริ่มสัญญา</label>
                <input type="date" required value={form.start_date} onChange={(e) => setForm({...form, start_date: e.target.value})} className="w-full border p-2 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">วันสิ้นสุดสัญญา</label>
                <input type="date" required value={form.end_date} onChange={(e) => setForm({...form, end_date: e.target.value})} className="w-full border p-2 rounded-lg text-sm" />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 mt-2">สร้างสัญญาเช่า</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}