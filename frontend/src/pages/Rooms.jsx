import { useState, useEffect } from 'react';
import { Plus, Home, X, Trash2 } from 'lucide-react';
import api from '../api/axios';

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ room_number: '', floor: 1, room_type: 'Standard', base_price: '', status: 'vacant' });

  const fetchRooms = async () => {
    try {
      const res = await api.get('/rooms');
      setRooms(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      await api.post('/rooms', {
        room_number: form.room_number,
        floor: Number(form.floor),
        room_type: form.room_type,
        base_price: Number(form.base_price),
        status: form.status
      });
      setShowModal(false);
      setForm({ room_number: '', floor: 1, room_type: 'Standard', base_price: '', status: 'vacant' });
      fetchRooms();
    } catch (err) {
      alert(err.response?.data?.error || 'ไม่สามารถเพิ่มห้องพักได้');
    }
  };

  const handleDeleteRoom = async (id) => {
    if (!confirm('ยืนยันลบห้องพักนี้?')) return;
    try {
      await api.delete(`/rooms/${id}`);
      fetchRooms();
    } catch (err) {
      alert(err.response?.data?.error || 'ไม่สามารถลบห้องพักได้');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">จัดการห้องพัก</h1>
        <button 
          onClick={() => setShowModal(true)} 
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition cursor-pointer"
        >
          <Plus size={18} /> เพิ่มห้องพัก
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        {loading ? (
          <p className="text-center py-4 text-gray-500">กำลังโหลดข้อมูล...</p>
        ) : (
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 uppercase border-b">
              <tr>
                <th className="p-3">เลขห้อง</th>
                <th className="p-3">ชั้น</th>
                <th className="p-3">ประเภท</th>
                <th className="p-3">ราคา/เดือน</th>
                <th className="p-3">สถานะ</th>
                <th className="p-3">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.room_id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-semibold text-gray-800 flex items-center gap-2">
                    <Home size={16} className="text-indigo-500" /> {room.room_number}
                  </td>
                  <td className="p-3">ชั้น {room.floor}</td>
                  <td className="p-3">{room.room_type}</td>
                  <td className="p-3">฿{Number(room.base_price).toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      room.status === 'vacant' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {room.status === 'vacant' ? 'ว่าง' : 'มีผู้เช่า'}
                    </span>
                  </td>
                  <td className="p-3">
                    <button onClick={() => handleDeleteRoom(room.room_id)} className="text-red-600 hover:text-red-800 p-1">
                      <Trash2 size={16} />
                    </button>
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
              <h3 className="font-bold text-lg text-gray-800">เพิ่มห้องพักใหม่</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">เลขห้อง</label>
                <input type="text" required value={form.room_number} onChange={(e) => setForm({...form, room_number: e.target.value})} className="w-full border p-2 rounded-lg" placeholder="101" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ชั้น</label>
                <input type="number" required value={form.floor} onChange={(e) => setForm({...form, floor: e.target.value})} className="w-full border p-2 rounded-lg" placeholder="1" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ประเภทห้อง</label>
                <input type="text" required value={form.room_type} onChange={(e) => setForm({...form, room_type: e.target.value})} className="w-full border p-2 rounded-lg" placeholder="Standard / Air / Fan" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ราคาพื้นฐาน (base_price)</label>
                <input type="number" required value={form.base_price} onChange={(e) => setForm({...form, base_price: e.target.value})} className="w-full border p-2 rounded-lg" placeholder="3500" />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">บันทึก</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}