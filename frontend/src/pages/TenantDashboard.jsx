import { useEffect, useState } from 'react';
import { Building, User, Edit2, X, FileText, CheckCircle, Clock, UploadCloud, Image as ImageIcon } from 'lucide-react';
import api from '../api/axios';

export default function TenantDashboard() {
  const [profile, setProfile] = useState(null);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', phone: '' });

  // จัดการอัปโหลดสลิป
  const [uploadingBillId, setUploadingBillId] = useState(null);
  const [selectedSlipModal, setSelectedSlipModal] = useState(null);

  const fetchData = async () => {
    try {
      const [profileRes, billsRes] = await Promise.all([
        api.get('/tenant/me'),
        api.get('/tenant/my-bills')
      ]);

      const profileData = profileRes.data || {};
      setProfile(profileData);
      setBills(Array.isArray(billsRes.data) ? billsRes.data : []);

      setEditForm({
        first_name: profileData.first_name || '',
        last_name: profileData.last_name || '',
        phone: profileData.phone || ''
      });
    } catch (err) {
      console.error('Error fetching tenant data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await api.put('/tenant/update-profile', editForm);
      alert('แก้ไขข้อมูลส่วนตัวสำเร็จ');
      setShowEditModal(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'ไม่สามารถแก้ไขข้อมูลได้');
    }
  };

  // จัดการแปลงไฟล์รูปเป็น Base64 แล้วส่งไปบันทึก
  const handleFileChange = (e, billId) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('ขนาดไฟล์รูปต้องไม่เกิน 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        setUploadingBillId(billId);
        await api.post('/tenant/upload-slip', {
          bill_id: billId,
          slip_image: reader.result
        });
        alert('อัปโหลดสลิปสำเร็จ รอแอดมินตรวจสอบ');
        fetchData();
      } catch (err) {
        alert(err.response?.data?.error || 'อัปโหลดสลิปไม่สำเร็จ');
      } finally {
        setUploadingBillId(null);
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) return <p className="text-center py-8 text-gray-500">กำลังโหลดข้อมูลผู้เช่า...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">แดชบอร์ดผู้เช่า</h1>

      {/* ข้อมูลโปรไฟล์ และห้องพัก */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <User className="text-indigo-600" size={20} /> ข้อมูลส่วนตัว
            </h2>
            <button 
              onClick={() => setShowEditModal(true)} 
              className="text-xs text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              <Edit2 size={14} /> แก้ไขข้อมูล
            </button>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <p><span className="font-semibold text-gray-700">ชื่อ-นามสกุล:</span> {profile?.first_name} {profile?.last_name}</p>
            <p><span className="font-semibold text-gray-700">เบอร์โทรศัพท์:</span> {profile?.phone || '-'}</p>
            <p><span className="font-semibold text-gray-700">ชื่อผู้ใช้:</span> {profile?.username}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Building className="text-indigo-600" size={20} /> สัญญาเช่าห้องพัก
          </h2>
          {profile?.room_number ? (
            <div className="space-y-2 text-sm text-gray-600">
              <p><span className="font-semibold text-gray-700">ห้องพัก:</span> <span className="text-indigo-600 font-bold">ห้อง {profile.room_number}</span> (ชั้น {profile.floor})</p>
              <p><span className="font-semibold text-gray-700">ประเภทห้อง:</span> {profile.room_type}</p>
              <p><span className="font-semibold text-gray-700">ค่าเช่า:</span> ฿{Number(profile.base_price || 0).toLocaleString()} / เดือน</p>
              <p><span className="font-semibold text-gray-700">เงินประกัน:</span> ฿{Number(profile.deposit || 0).toLocaleString()}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">ยังไม่มีสัญญาเช่าที่ใช้งานอยู่</p>
          )}
        </div>
      </div>

      {/* ประวัติบิลและการชำระเงิน */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <FileText className="text-indigo-600" size={20} /> บิลและประวัติการชำระเงิน
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 uppercase border-b">
              <tr>
                <th className="p-3">รอบเดือน/ปี</th>
                <th className="p-3">ค่าเช่า</th>
                <th className="p-3">ค่าน้ำ</th>
                <th className="p-3">ค่าไฟ</th>
                <th className="p-3">ยอดรวม</th>
                <th className="p-3">สถานะ</th>
                <th className="p-3">การแนบสลิป</th>
              </tr>
            </thead>
            <tbody>
              {bills.length > 0 ? (
                bills.map((b) => (
                  <tr key={b.bill_id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-semibold text-gray-800">{b.month}/{b.year}</td>
                    <td className="p-3">฿{Number(b.rent_amount || 0).toLocaleString()}</td>
                    <td className="p-3">฿{Number(b.water_amount || 0).toLocaleString()} ({b.water_unit} หน่วย)</td>
                    <td className="p-3">฿{Number(b.electric_amount || 0).toLocaleString()} ({b.electric_unit} หน่วย)</td>
                    <td className="p-3 font-semibold text-gray-800">฿{Number(b.total_amount || 0).toLocaleString()}</td>
                    <td className="p-3">
                      {b.payment_status === 'paid' ? (
                        <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full text-xs w-fit">
                          <CheckCircle size={14} /> ชำระแล้ว
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full text-xs w-fit">
                          <Clock size={14} /> รอชำระ
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {b.payment_status === 'paid' ? (
                        <span className="text-gray-400 text-xs">เสร็จสิ้น</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-medium transition">
                            <UploadCloud size={14} />
                            <span>{uploadingBillId === b.bill_id ? 'กำลังส่ง...' : b.slip_image ? 'เปลี่ยนสลิป' : 'แนบสลิป'}</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              disabled={uploadingBillId === b.bill_id}
                              onChange={(e) => handleFileChange(e, b.bill_id)} 
                            />
                          </label>

                          {b.slip_image && (
                            <button
                              onClick={() => setSelectedSlipModal(b.slip_image)}
                              className="p-1.5 text-gray-500 hover:text-indigo-600 rounded-md transition"
                              title="ดูสลิปที่แนบไว้"
                            >
                              <ImageIcon size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-gray-400">ยังไม่มีประวัติการแจ้งชำระเงิน</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal ดูภาพสลิป */}
      {selectedSlipModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-gray-800 text-sm">หลักฐานการโอนเงิน</h3>
              <button onClick={() => setSelectedSlipModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="max-h-96 overflow-auto flex justify-center bg-gray-50 rounded-lg p-2">
              <img src={selectedSlipModal} alt="Slip" className="max-w-full rounded-md shadow" />
            </div>
            <button 
              onClick={() => setSelectedSlipModal(null)} 
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium transition cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* Modal แก้ไขข้อมูลส่วนตัว */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-gray-800">แก้ไขข้อมูลส่วนตัว</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdateProfile} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">ชื่อจริง</label>
                <input 
                  type="text" 
                  value={editForm.first_name} 
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} 
                  className="w-full border p-2 rounded-lg text-sm" 
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">นามสกุล</label>
                <input 
                  type="text" 
                  value={editForm.last_name} 
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} 
                  className="w-full border p-2 rounded-lg text-sm" 
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">เบอร์โทรศัพท์</label>
                <input 
                  type="text" 
                  value={editForm.phone} 
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} 
                  className="w-full border p-2 rounded-lg text-sm" 
                />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 mt-2">
                บันทึกการเปลี่ยนแปลง
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}