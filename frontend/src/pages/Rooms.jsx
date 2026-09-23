import { useState, useEffect } from 'react';
import { Plus, Home, X, Trash2, Eye, User, Phone, Calendar, ShieldCheck } from 'lucide-react';
import api from '../api/axios';

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null); // เก็บห้องที่เลือกดูรายละเอียด
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
        <div>
          <h1 className="text-2xl font-bold text-gray-800">จัดการห้องพัก</h1>
          <p className="text-sm text-gray-500">ตรวจสอบสถานะห้อง และรายละเอียดผู้เช่า</p>
        </div>
        <button 
          onClick={() => setShowModal(true)} 
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition cursor-pointer shadow-sm font-medium"
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
                <th className="p-3">ผู้เช่าปัจจุบัน</th>
                <th className="p-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.room_id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-semibold text-gray-800 flex items-center gap-2">
                    <Home size={16} className="text-indigo-500" /> ห้อง {room.room_number}
                  </td>
                  <td className="p-3">ชั้น {room.floor}</td>
                  <td className="p-3">{room.room_type}</td>
                  <td className="p-3">฿{Number(room.base_price).toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      room.status === 'vacant' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {room.status === 'vacant' ? 'ว่าง' : 'มีผู้เช่า'}
                    </span>
                  </td>
                  <td className="p-3">
                    {room.first_name ? (
                      <span className="font-medium text-gray-800">{room.first_name} {room.last_name}</span>
                    ) : (
                      <span className="text-gray-400 text-xs">- ไม่มีผู้เช่า -</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => setSelectedRoom(room)} 
                        className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-md transition"
                        title="ดูรายละเอียดห้อง"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteRoom(room.room_id)} 
                        className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition"
                        title="ลบห้องพัก"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal เพิ่มห้องพักใหม่ */}
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

      {/* Modal ดูรายละเอียดห้องและผู้เช่า */}
      {selectedRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-2">
                <Home className="text-indigo-600" size={22} />
                <h3 className="font-bold text-lg text-gray-800">รายละเอียดห้อง {selectedRoom.room_number}</h3>
              </div>
              <button onClick={() => setSelectedRoom(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* ข้อมูลห้องพัก */}
            <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">ชั้น:</span>
                <span className="font-medium text-gray-800">ชั้น {selectedRoom.floor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">ประเภทห้อง:</span>
                <span className="font-medium text-gray-800">{selectedRoom.room_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">ราคาค่าเช่า:</span>
                <span className="font-semibold text-indigo-600">฿{Number(selectedRoom.base_price).toLocaleString()} / เดือน</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">สถานะห้อง:</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  selectedRoom.status === 'vacant' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {selectedRoom.status === 'vacant' ? 'ห้องว่าง' : 'มีผู้เช่าพักอาศัย'}
                </span>
              </div>
            </div>

            {/* ข้อมูลผู้เช่าและสัญญา (ถ้ามี) */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">ข้อมูลผู้เช่าและสัญญา</h4>
              {selectedRoom.first_name ? (
                <div className="border border-gray-100 rounded-xl p-4 space-y-2.5 text-sm">
                  <div className="flex items-center gap-2 text-gray-800">
                    <User size={16} className="text-gray-400" />
                    <span className="font-medium">{selectedRoom.first_name} {selectedRoom.last_name}</span>
                    <span className="text-xs text-gray-400">({selectedRoom.username})</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone size={16} className="text-gray-400" />
                    <span>{selectedRoom.phone || 'ไม่มีเบอร์โทร'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <ShieldCheck size={16} className="text-gray-400" />
                    <span>เงินประกัน: ฿{Number(selectedRoom.deposit || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 text-xs">
                    <Calendar size={16} className="text-gray-400" />
                    <span>สัญญา: {new Date(selectedRoom.start_date).toLocaleDateString('th-TH')} ถึง {new Date(selectedRoom.end_date).toLocaleDateString('th-TH')}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed rounded-xl text-gray-400 text-sm">
                  ห้องนี้ยังว่างอยู่ ยังไม่มีสัญญาเช่า
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedRoom(null)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium transition cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}