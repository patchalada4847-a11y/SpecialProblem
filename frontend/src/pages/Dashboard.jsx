import { useEffect, useState } from 'react';
import { Building, Users, AlertCircle, TrendingUp } from 'lucide-react';
import api from '../api/axios';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Backend ปรับ Endpoint ไปที่ /reports/dashboard
    api.get('/reports/dashboard')
      .then((res) => setSummary(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center py-8 text-gray-500">กำลังโหลดข้อมูลแดชบอร์ด...</p>;

  const vacantCount = summary?.room_summary?.find(r => r.status === 'vacant')?.count || 0;
  const occupiedCount = summary?.room_summary?.find(r => r.status === 'occupied')?.count || 0;
  const totalRooms = Number(vacantCount) + Number(occupiedCount);
  const netIncome = Number(summary?.financial_summary?.total_income || 0);

  const stats = [
    { title: 'ห้องพักทั้งหมด', value: totalRooms, unit: 'ห้อง', icon: Building, color: 'bg-blue-500' },
    { title: 'ห้องที่มีผู้เช่า', value: occupiedCount, unit: 'ห้อง', icon: Users, color: 'bg-emerald-500' },
    { title: 'ห้องว่าง', value: vacantCount, unit: 'ห้อง', icon: AlertCircle, color: 'bg-amber-500' },
    { title: 'รายได้รวม', value: netIncome.toLocaleString(), unit: 'บาท', icon: TrendingUp, color: 'bg-indigo-500' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">แดชบอร์ดภาพรวม</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={`${stat.color} p-4 rounded-lg text-white`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.title}</p>
              <h3 className="text-2xl font-bold text-gray-800">
                {stat.value} <span className="text-xs text-gray-400 font-normal">{stat.unit}</span>
              </h3>
            </div>
          </div>
        ))}
      </div>

      {summary?.pending_bills_summary && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">สถานะการชำระเงิน</h2>
          <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
            <span>มีบิลค้างชำระทั้งหมด {summary.pending_bills_summary.unpaid_count || 0} รายการ (รวม ฿{Number(summary.pending_bills_summary.unpaid_amount || 0).toLocaleString()})</span>
          </div>
        </div>
      )}
    </div>
  );
}