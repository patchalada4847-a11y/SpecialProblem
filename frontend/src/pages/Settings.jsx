import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import api from '../api/axios';
import useToast from '../components/useToast';

export default function Settings() {
  const notify = useToast();
  const [rates, setRates] = useState({ water_rate: '', electric_rate: '' });
  const [roomTypes, setRoomTypes] = useState([]);
  const [newType, setNewType] = useState({ room_type: '', base_price: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadSettings = async () => {
      try {
        const res = await api.get('/settings');
        if (cancelled) return;
        setRates({
          water_rate: res.data.water_rate,
          electric_rate: res.data.electric_rate
        });
        setRoomTypes(res.data.room_types);
      } catch (err) {
        if (!cancelled) notify(err.response?.data?.error || 'โหลดการตั้งค่าไม่สำเร็จ', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadSettings();
    return () => {
      cancelled = true;
    };
  }, [notify]);

  const handleSaveRates = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put('/settings/rates', {
        water_rate: Number(rates.water_rate),
        electric_rate: Number(rates.electric_rate)
      });
      setRates(res.data);
      notify('บันทึกอัตราค่าน้ำและค่าไฟแล้ว', 'success');
    } catch (err) {
      notify(err.response?.data?.error || 'บันทึกอัตราค่าน้ำและค่าไฟไม่สำเร็จ', 'error');
    }
  };

  const handleAddRoomType = async (e) => {
    e.preventDefault();
    try {
      await api.post('/settings/room-types', {
        room_type: newType.room_type,
        base_price: Number(newType.base_price)
      });
      setNewType({ room_type: '', base_price: '' });
      const res = await api.get('/settings');
      setRates({
        water_rate: res.data.water_rate,
        electric_rate: res.data.electric_rate
      });
      setRoomTypes(res.data.room_types);
    } catch (err) {
      notify(err.response?.data?.error || 'เพิ่มประเภทห้องไม่สำเร็จ', 'error');
    }
  };

  const handleSaveRoomType = async (roomType) => {
    try {
      const res = await api.put(`/settings/room-types/${roomType.type_id}`, {
        base_price: Number(roomType.base_price)
      });
      setRoomTypes((current) => current.map((item) => (
        item.type_id === res.data.type_id ? res.data : item
      )));
    } catch (err) {
      notify(err.response?.data?.error || 'บันทึกราคาห้องไม่สำเร็จ', 'error');
    }
  };

  const handleDeleteRoomType = async (roomType) => {
    if (!confirm(`ยืนยันลบประเภทห้อง "${roomType.room_type}"?`)) return;
    try {
      await api.delete(`/settings/room-types/${roomType.type_id}`);
      setRoomTypes((current) => current.filter((item) => item.type_id !== roomType.type_id));
    } catch (err) {
      notify(err.response?.data?.error || 'ลบประเภทห้องไม่สำเร็จ', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">ตั้งค่าราคา</h1>
        <p className="text-sm text-gray-500">กำหนดอัตราค่าน้ำ ค่าไฟ และราคาเริ่มต้นตามประเภทห้อง</p>
      </div>

      {loading ? (
        <p className="text-center py-6 text-gray-500">กำลังโหลดการตั้งค่า...</p>
      ) : (
        <>
          <form onSubmit={handleSaveRates} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <h2 className="font-semibold text-gray-800">อัตราค่าสาธารณูปโภค</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="text-sm text-gray-700">
                ค่าน้ำ (บาท / หน่วย)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={rates.water_rate}
                  onChange={(e) => setRates({ ...rates, water_rate: e.target.value })}
                  className="mt-1 w-full border p-2.5 rounded-lg"
                />
              </label>
              <label className="text-sm text-gray-700">
                ค่าไฟ (บาท / หน่วย)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={rates.electric_rate}
                  onChange={(e) => setRates({ ...rates, electric_rate: e.target.value })}
                  className="mt-1 w-full border p-2.5 rounded-lg"
                />
              </label>
            </div>
            <button className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
              <Save size={16} /> บันทึกอัตรา
            </button>
          </form>

          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-5">
            <div>
              <h2 className="font-semibold text-gray-800">ประเภทห้องและราคา</h2>
              <p className="text-sm text-gray-500 mt-1">ราคาเหล่านี้จะถูกนำไปใช้เมื่อเพิ่มห้องใหม่</p>
            </div>
            {roomTypes.length > 0 ? (
              <div className="divide-y">
                {roomTypes.map((roomType) => (
                  <div key={roomType.type_id} className="py-3 flex flex-wrap items-center gap-3">
                    <span className="font-medium text-gray-800 flex-1 min-w-32">{roomType.room_type}</span>
                    <label className="text-sm text-gray-600 flex items-center gap-2">
                      ราคา/เดือน
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={roomType.base_price}
                        onChange={(e) => setRoomTypes((current) => current.map((item) => (
                          item.type_id === roomType.type_id
                            ? { ...item, base_price: e.target.value }
                            : item
                        )))}
                        className="w-36 border p-2 rounded-lg"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => handleSaveRoomType(roomType)}
                      className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50"
                      title="บันทึกราคา"
                    >
                      <Save size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRoomType(roomType)}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                      title="ลบประเภทห้อง"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">ยังไม่มีประเภทห้อง กรุณาเพิ่มประเภทห้องด้านล่างก่อนสร้างห้อง</p>
            )}

            <form onSubmit={handleAddRoomType} className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 border-t pt-4">
              <input
                type="text"
                required
                value={newType.room_type}
                onChange={(e) => setNewType({ ...newType, room_type: e.target.value })}
                placeholder="ชื่อประเภท เช่น ห้องกลาง"
                className="border p-2.5 rounded-lg"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={newType.base_price}
                onChange={(e) => setNewType({ ...newType, base_price: e.target.value })}
                placeholder="ค่าเช่าต่อเดือน"
                className="border p-2.5 rounded-lg"
              />
              <button className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
                <Plus size={16} /> เพิ่มประเภท
              </button>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
