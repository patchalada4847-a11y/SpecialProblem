import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, UploadCloud, FileCheck } from 'lucide-react';
import dormitoryImage from '../assets/dormitory.svg';
import api from '../api/axios';
import useToast from '../components/useToast';

export default function Register() {
  const notify = useToast();
  const [form, setForm] = useState({
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    kyc_document: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      notify('ขนาดไฟล์ต้องไม่เกิน 5MB', 'error');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({ ...prev, kyc_document: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.kyc_document) {
      setError('กรุณาแนบรูปภาพเอกสารยืนยันตัวตนหรือสัญญาเช่า');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/register', form);
      notify(res.data.message || 'ลงทะเบียนสำเร็จ', 'success');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'ไม่สามารถลงทะเบียนได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen min-h-screen flex items-center justify-center p-4">
      <div className="auth-panel w-full max-w-md border border-white/60 p-8">
        <div className="mb-6 flex min-h-24 items-end gap-3 text-left">
          <div className="inline-flex h-12 w-12 items-center justify-center border border-white/70 bg-white/75 backdrop-blur">
            <img src={dormitoryImage} alt="" className="h-10 w-10 object-cover" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">Residence Management</p>
            <h2 className="text-2xl font-bold text-gray-800">ลงทะเบียนเข้าใช้งาน</h2>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-600 p-3 rounded-lg text-sm mb-4 border border-rose-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">ชื่อจริง</label>
              <input
                type="text"
                required
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">นามสกุล</label>
              <input
                type="text"
                required
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
            <input
              type="text"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="08X-XXX-XXXX"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">ชื่อผู้ใช้ (Username)</label>
            <input
              type="text"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">รหัสผ่าน (Password)</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* อัปโหลดเอกสาร KYC */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">แนบเอกสารยืนยันตัวตน / ใบสัญญา</label>
            <label className="border-2 border-dashed border-gray-300 hover:border-indigo-500 rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer bg-gray-50 transition">
              {fileName ? (
                <div className="flex items-center gap-2 text-indigo-600 text-xs font-medium">
                  <FileCheck size={16} /> {fileName}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-gray-500 text-xs">
                  <UploadCloud size={20} className="text-gray-400" />
                  <span>คลิกเพื่อเลือกไฟล์รูปภาพ</span>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition flex items-center justify-center gap-2 mt-2"
          >
            <UserPlus size={18} />
            <span>{loading ? 'กำลังส่งข้อมูล...' : 'ลงทะเบียนและส่งตรวจ KYC'}</span>
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-500">
          มีบัญชีอยู่แล้ว? <Link to="/login" className="text-indigo-600 font-semibold hover:underline">เข้าสู่ระบบ</Link>
        </div>
      </div>
    </div>
  );
}