import { useState, useEffect } from 'react';
import { UserPlus, X, Home, User } from 'lucide-react';
import api from '../api/axios';

export default function Tenants() {
  const [contracts, setContracts] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [availableTenants, setAvailableTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    room_id: '',
    tenant_id: '',
    deposit: '',
    start_date: '',
    end_date: ''
  });

  const fetchData = async () => {
    try {
      const [resContracts, resRooms, resTenants] = await Promise.all([
        api.get('/contracts'),
        api.get('/rooms'),
        api.get('/tenant/available-tenants') // ดึงผู้เช่าที่สมัครแล้วแต่ยังไม่มีห้อง
      ]);
      setContracts(resContracts.data);
      setRooms(resRooms.data.filter(r => r.status === 'vacant')); // กรองเฉพาะห้องว่าง
      setAvailableTenants(resTenants.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssignRoom = async (e) => {
    e.preventDefault();
    try {
      await api.post('/contracts', {
        room_id: Number(form.room_id),
        tenant_id: Number(form.tenant_id),
        start_date: form.start_date,
        end_date: form.end_date,
        deposit: Number(form.deposit || 0)
      });

      alert('จัดสรรผู้เช่าเข้าห้องพักและสร้างสัญญาสำเร็จ!');
      setShowModal(false);
      setForm({ room_id: '', tenant_id: '', deposit: '', start_date: '', end_date: '' });
      fetchData(); // โหลดข้อมูลใหม่ ผู้เช่าและห้องที่ผูกแล้วจะหายจาก Dropdown อัตโนมัติ
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || 'ไม่สามารถจัดสรรห้องพักได้');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">จัดการผู้เช่าและสัญญา</h1>
          <p className="text-sm text-gray-500">จัดสรรห้องพักให้กับผู้เช่าที่สมัครสมาชิกเข้ามา</p>
        </div>
        <button 
          onClick={() => setShowModal(true)} 
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg transition shadow-sm font-medium cursor-pointer"
        >
          <UserPlus size={18} /> จัดสรรห้องให้ผู้เช่า
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
                  <th className="p-3">เลขที่สัญญา</th>
                  <th className="p-3">ห้องพัก</th>
                  <th className="p-3">ผู้เช่า</th>
                  <th className="p-3">เบอร์โทร</th>
                  <th className="p-3">เงินประกัน</th>
                  <th className="p-3">ระยะเวลาสัญญา</th>
                  <th className="p-3">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => (
                  <tr key={c.contract_id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-semibold text-gray-800">#{c.contract_id}</td>
                    <td className="p-3 font-semibold text-indigo-600">ห้อง {c.room_number}</td>
                    <td className="p-3 font-medium text-gray-800">{c.first_name} {c.last_name}</td>
                    <td className="p-3">{c.phone || '-'}</td>
                    <td className="p-3">฿{Number(c.deposit).toLocaleString()}</td>
                    <td className="p-3 text-xs text-gray-500">
                      {c.start_date ? new Date(c.start_date).toLocaleDateString('th-TH') : ''} - {c.end_date ? new Date(c.end_date).toLocaleDateString('th-TH') : ''}
                    </td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                        {c.status === 'active' ? 'กำลังเช่าอยู่' : c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal จัดสรรผู้เช่าเข้าห้อง */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-gray-800">จัดสรรห้องพักให้ผู้เช่า</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAssignRoom} className="space-y-4">
              {/* Dropdown เลือกผู้เช่าที่สมัครแล้ว */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">เลือกผู้เช่า (ที่สมัครสมาชิกไว้)</label>
                <select
                  required
                  value={form.tenant_id}
                  onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}
                  className="w-full border p-2.5 rounded-lg text-sm bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- เลือกรายชื่อผู้เช่า --</option>
                  {availableTenants.map((t) => (
                    <option key={t.user_id} value={t.user_id}>
                      {t.first_name} {t.last_name} ({t.username}) - {t.phone || 'ไม่มีเบอร์'}
                    </option>
                  ))}
                </select>
                {availableTenants.length === 0 && (
                  <span className="text-[11px] text-amber-600 mt-1 block">* ยังไม่มีผู้เช่าว่างที่รอจัดสรรห้อง</span>
                )}
              </div>

              {/* Dropdown เลือกห้องว่าง */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">เลือกห้องพักที่ว่าง</label>
                <select
                  required
                  value={form.room_id}
                  onChange={(e) => setForm({ ...form, room_id: e.target.value })}
                  className="w-full border p-2.5 rounded-lg text-sm bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- เลือกห้องพัก --</option>
                  {rooms.map((r) => (
                    <option key={r.room_id} value={r.room_id}>
                      ห้อง {r.room_number} (ชั้น {r.floor} - {r.room_type}) - ฿{Number(r.base_price).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">เงินมัดจำ/ประกัน (Deposit)</label>
                <input
                  type="number"
                  required
                  value={form.deposit}
                  onChange={(e) => setForm({ ...form, deposit: e.target.value })}
                  className="w-full border p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="เช่น 5000"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">วันเริ่มสัญญา</label>
                  <input
                    type="date"
                    required
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full border p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">วันสิ้นสุดสัญญา</label>
                  <input
                    type="date"
                    required
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full border p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={availableTenants.length === 0 || rooms.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-medium py-2.5 rounded-lg transition shadow-md mt-2 cursor-pointer"
              >
                บันทึกสัญญาและจัดสรรห้อง
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}