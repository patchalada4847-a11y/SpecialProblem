import { Link, useNavigate, Outlet } from 'react-router-dom';
import { Home, Users, KeyRound, Receipt, LogOut, Building, User, UserCheck } from 'lucide-react';

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
    { name: 'แดชบอร์ด', icon: Home, path: '/dashboard' },
    { name: 'ตรวจสอบ KYC', icon: UserCheck, path: '/kyc-approval' },
    { name: 'จัดการห้องพัก', icon: KeyRound, path: '/rooms' },
    { name: 'จัดการผู้เช่า', icon: Users, path: '/tenants' },
    { name: 'การแจ้งชำระเงิน', icon: Receipt, path: '/bills' },
  ];

  // เมนูของ ผู้เช่า (Tenant)
  const tenantMenuItems = [
    { name: 'ข้อมูลของฉัน & บิล', icon: User, path: '/my-dashboard' },
  ];

  // เลือกใช้เมนูกลุ่มตาม Role
  const menuItems = role === 'admin' ? adminMenuItems : tenantMenuItems;

  return (
    <div className="flex h-screen bg-gray-100 text-gray-800">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 p-6 border-b border-slate-800">
            <Building className="text-indigo-400" size={28} />
            <span className="font-bold text-lg tracking-wide">Dorm Manager</span>
          </div>
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-indigo-400 rounded-lg transition"
              >
                <item.icon size={20} />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
          >
            <LogOut size={20} />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}