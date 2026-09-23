import { useEffect, useState } from 'react';
import { ShieldCheck, Check, X, Image as ImageIcon } from 'lucide-react';
import api from '../api/axios';

export default function KYCApproval() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewDoc, setViewDoc] = useState(null);

  const fetchKYC = async () => {
    try {
      const res = await api.get('/tenant/pending-kyc');
      setList(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKYC();
  }, []);

  const handleVerify = async (userId, status) => {
    const actionText = status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ';
    if (!confirm(`ยืนยันการ${actionText}ผู้ใช้งานนี้?`)) return;

    try {
      await api.post('/tenant/verify-kyc', { user_id: userId, status });
      alert(`ดำเนินการ${actionText}สำเร็จ`);
      setViewDoc(null);
      fetchKYC();
    } catch (err) {
      alert('เกิดข้อผิดพลาด');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">ตรวจสอบเอกสารยืนยันตัวตน (KYC)</h1>
        <p className="text-sm text-gray-500">ตรวจสอบเอกสารการสมัครสมาชิกก่อนอนุญาตให้เข้าใช้งานระบบ</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        {loading ? (
          <p className="text-center py-6 text-gray-500">กำลังโหลดข้อมูล...</p>
        ) : list.length === 0 ? (
          <div className="text-center py-8 text-gray-400">ไม่มีรายการที่รอตรวจสอบ</div>
        ) : (
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 uppercase border-b">
              <tr>
                <th className="p-3">ผู้สมัคร</th>
                <th className="p-3">Username</th>
                <th className="p-3">เบอร์โทร</th>
                <th className="p-3">เอกสารแนบ</th>
                <th className="p-3 text-center">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.user_id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-semibold text-gray-800">{u.first_name} {u.last_name}</td>
                  <td className="p-3">{u.username}</td>
                  <td className="p-3">{u.phone || '-'}</td>
                  <td className="p-3">
                    {u.kyc_document ? (
                      <button
                        onClick={() => setViewDoc(u)}
                        className="inline-flex items-center gap-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-2.5 py-1 rounded-md font-medium"
                      >
                        <ImageIcon size={14} /> ตรวจสอบเอกสาร
                      </button>
                    ) : (
                      <span className="text-xs text-rose-500">ไม่มีเอกสาร</span>
                    )}
                  </td>
                  <td className="p-3 text-center space-x-2">
                    <button
                      onClick={() => handleVerify(u.user_id, 'approved')}
                      className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-xs font-semibold"
                    >
                      <Check size={14} /> อนุมัติ
                    </button>
                    <button
                      onClick={() => handleVerify(u.user_id, 'rejected')}
                      className="inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1 rounded-lg text-xs font-semibold"
                    >
                      <X size={14} /> ปฏิเสธ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal ดูเอกสาร KYC */}
      {viewDoc && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-gray-800 text-sm">เอกสารของ {viewDoc.first_name} {viewDoc.last_name}</h3>
              <button onClick={() => setViewDoc(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="max-h-[400px] overflow-auto flex justify-center bg-gray-50 rounded-lg p-2">
              <img src={viewDoc.kyc_document} alt="KYC Document" className="max-w-full rounded-md shadow" />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => handleVerify(viewDoc.user_id, 'approved')}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-medium"
              >
                อนุมัติเอกสาร
              </button>
              <button
                onClick={() => handleVerify(viewDoc.user_id, 'rejected')}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2 rounded-lg text-sm font-medium"
              >
                ปฏิเสธ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}