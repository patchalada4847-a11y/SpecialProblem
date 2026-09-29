import { useEffect, useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { LayoutDashboard, UsersRound, DoorOpen, ReceiptText, LogOut, House, BadgeCheck, SlidersHorizontal, ChartNoAxesCombined, UserRound, Camera, Wrench } from 'lucide-react';
import api from '../api/axios';
import useToast from './useToast';
import AppInfo from './AppInfo';

export default function Layout() {
  const navigate = useNavigate();
  const notify = useToast();
  const role = localStorage.getItem('role');
  const [profile, setProfile] = useState(null);
  const [dormitoryName, setDormitoryName] = useState('ระบบจัดการหอพัก');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    let mounted = true;
    api.get('/auth/me')
      .then((response) => {
        if (mounted) setProfile(response.data);
      })
      .catch((error) => {
        console.error('Unable to load current user profile:', error);
      });
    api.get('/settings/public')
      .then((response) => {
        if (mounted) setDormitoryName(response.data.dormitory_name || 'ระบบจัดการหอพัก');
      })
      .catch((error) => {
        console.error('Unable to load dormitory name:', error);
      });
    const handleDormitorySettingsUpdate = (event) => {
      setDormitoryName(event.detail || 'ระบบจัดการหอพัก');
    };
    window.addEventListener('dormitory-settings-updated', handleDormitorySettingsUpdate);
    return () => {
      mounted = false;
      window.removeEventListener('dormitory-settings-updated', handleDormitorySettingsUpdate);
    };
  }, []);

  const handleProfilePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      notify('เลือกรูป JPG, PNG หรือ WebP ขนาดไม่เกิน 5MB', 'error');
      return;
    }

    setUploadingPhoto(true);
    try {
      const profileImage = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('อ่านไฟล์รูปไม่สำเร็จ'));
        reader.readAsDataURL(file);
      });
      const response = await api.put('/auth/profile-image', { profile_image: profileImage });
      setProfile((current) => ({ ...current, profile_image: response.data.profile_image }));
      notify('เปลี่ยนรูปโปรไฟล์สำเร็จ', 'success');
    } catch (error) {
      notify(error.response?.data?.error || error.message || 'เปลี่ยนรูปโปรไฟล์ไม่สำเร็จ', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  // เมนูของ Admin
  const adminMenuItems = [
    { name: 'แดชบอร์ด', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'ตรวจสอบเอกสาร', icon: BadgeCheck, path: '/kyc-approval' },
    { name: 'จัดการห้องพัก', icon: DoorOpen, path: '/rooms' },
    { name: 'จัดการผู้เช่า', icon: UsersRound, path: '/tenants' },
    { name: 'บิลและการชำระเงิน', icon: ReceiptText, path: '/bills' },
    { name: 'ตั้งค่าอัตราและห้อง', icon: SlidersHorizontal, path: '/settings' },
    { name: 'รายงานและการเงิน', icon: ChartNoAxesCombined, path: '/reports' },
    { name: 'ต่อสัญญา / เคสแจ้งปัญหา', icon: Wrench, path: '/tenant-services' },
  ];

  // เมนูของ ผู้เช่า (Tenant)
  const tenantMenuItems = [
    { name: 'ข้อมูลห้องพักและบิล', icon: House, path: '/my-dashboard' },
    { name: 'ต่อสัญญา / แจ้งปัญหา', icon: Wrench, path: '/tenant-services' },
  ];

  // เลือกใช้เมนูกลุ่มตาม Role
  const menuItems = role === 'admin' ? adminMenuItems : tenantMenuItems;

  return (
    <div className="flex h-screen bg-transparent text-slate-800">
      {/* Sidebar Navigation */}
      <aside className="w-64 text-white flex flex-col justify-between">
        <div>
          <div className="brand-panel flex items-center gap-3 border-b border-white/20 p-6">
            <label className="profile-photo-picker" title="เปลี่ยนรูปโปรไฟล์">
              {profile?.profile_image ? (
                <img src={profile.profile_image} alt="รูปโปรไฟล์" className="brand-image profile-avatar" />
              ) : (
                <span className="brand-image profile-avatar profile-avatar-placeholder">
                  <UserRound size={24} />
                </span>
              )}
              <span className="profile-photo-camera"><Camera size={12} /></span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleProfilePhotoChange}
                disabled={uploadingPhoto}
                className="sr-only"
                aria-label="เปลี่ยนรูปโปรไฟล์"
              />
            </label>
            <div>
              <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-teal-100">Residence</span>
              <span className="block max-w-40 truncate font-semibold tracking-wide text-white" title={dormitoryName}>{dormitoryName}</span>
              {profile && <span className="block truncate text-xs text-slate-500">{profile.first_name} {profile.last_name}</span>}
            </div>
          </div>
          <nav className="space-y-1 p-3">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/dashboard'}
                className="flex items-center gap-3 px-3 py-3 text-sm"
              >
                <item.icon size={19} strokeWidth={1.8} />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="border-t border-white/20 p-4">
          <AppInfo className="mb-2 px-3" />
          <button
            onClick={handleLogout}
            className="flex w-full cursor-pointer items-center gap-3 px-3 py-3 text-sm text-rose-200 transition hover:bg-rose-400/15 hover:text-white"
          >
            <LogOut size={19} strokeWidth={1.8} />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-5 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}