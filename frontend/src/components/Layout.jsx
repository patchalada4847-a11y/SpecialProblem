import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { LayoutDashboard, UsersRound, DoorOpen, ReceiptText, LogOut, House, BadgeCheck, SlidersHorizontal, ChartNoAxesCombined } from 'lucide-react';
import dormitoryImage from '../assets/dormitory.svg';

export default function Layout() {
  const navigate = useNavigate();
  const role = localStorage.getItem('role');

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
  ];

  // เมนูของ ผู้เช่า (Tenant)
  const tenantMenuItems = [
    { name: 'ข้อมูลห้องพักและบิล', icon: House, path: '/my-dashboard' },
  ];

  // เลือกใช้เมนูกลุ่มตาม Role
  const menuItems = role === 'admin' ? adminMenuItems : tenantMenuItems;

  return (
    <div className="flex h-screen bg-transparent text-slate-800">
      {/* Sidebar Navigation */}
      <aside className="w-64 text-white flex flex-col justify-between">
        <div>
          <div className="brand-panel flex items-center gap-3 border-b border-white/20 p-6">
            <img src={dormitoryImage} alt="" className="brand-image" />
            <div>
              <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-teal-100">Residence</span>
              <span className="font-semibold tracking-wide text-white">Dorm Manager</span>
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