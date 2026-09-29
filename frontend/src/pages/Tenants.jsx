import { useState, useEffect } from 'react';
import { UserPlus, X, User, Edit2, Search } from 'lucide-react';
import api from '../api/axios';
import useToast from '../components/useToast';

export default function Tenants() {
  const notify = useToast();
  const [contracts, setContracts] = useState([]);
  const [tenantDirectory, setTenantDirectory] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [availableTenants, setAvailableTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [editingContract, setEditingContract] = useState(null);
  const [search, setSearch] = useState('');
  const [tenantForm, setTenantForm] = useState({ first_name: '', last_name: '', phone: '' });
  const [contractForm, setContractForm] = useState({ start_date: '', end_date: '', deposit: '', status: 'active' });

  const [form, setForm] = useState({
    room_id: '',
    tenant_id: '',
    deposit: '',
    start_date: '',
    end_date: ''
  });

  const requestTenantData = () => Promise.all([
        api.get('/contracts'),
        api.get('/rooms'),
        api.get('/tenant/available-tenants'), // ดึงผู้เช่าที่สมัครแล้วแต่ยังไม่มีห้อง
        api.get('/reports/tenants')
      ]);

  const applyTenantData = ([resContracts, resRooms, resTenants, resDirectory]) => {
      setContracts(resContracts.data);
      setRooms(resRooms.data.filter(r => r.status === 'vacant')); // กรองเฉพาะห้องว่าง
      setAvailableTenants(resTenants.data);
      setTenantDirectory(resDirectory.data);
  };

  const fetchData = async () => {
    try {
      const data = await requestTenantData();
      applyTenantData(data);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadInitialData = async () => {
      try {
        const data = await requestTenantData();
        if (!cancelled) applyTenantData(data);
      } catch (err) {
        if (!cancelled) console.error('Error fetching data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadInitialData();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAssignRoom = async (e) => {
    e.preventDefault();
    try {
      await api.post('/contracts', {
        room_id: Number(form.room_id),
        tenant_id: Number(form.tenant_id),
        start_date: form.start_date,
        end_date: form.end_date,
        deposit: Number(form.deposit || 0)
      });

      notify('จัดสรรผู้เช่าเข้าห้องพักและสร้างสัญญาสำเร็จ!', 'success');
      setShowModal(false);
      setForm({ room_id: '', tenant_id: '', deposit: '', start_date: '', end_date: '' });
      fetchData(); // โหลดข้อมูลใหม่ ผู้เช่าและห้องที่ผูกแล้วจะหายจาก Dropdown อัตโนมัติ
    } catch (err) {
      notify(err.response?.data?.error || err.response?.data?.message || 'ไม่สามารถจัดสรรห้องพักได้', 'error');
    }
  };

  const openTenantEditor = (contract) => {
    setEditingTenant({ ...contract, tenant_id: contract.tenant_id || contract.user_id });
    setTenantForm({
      first_name: contract.first_name || '',
      last_name: contract.last_name || '',
      phone: contract.phone || ''
    });
  };

  const saveTenant = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/tenant/admin/tenants/${editingTenant.tenant_id}`, tenantForm);
      setEditingTenant(null);
      fetchData();
    } catch (err) {
      notify(err.response?.data?.error || 'บันทึกข้อมูลผู้เช่าไม่สำเร็จ', 'error');
    }
  };

  const openContractEditor = (contract) => {
    setEditingContract(contract);
    setContractForm({
      start_date: String(contract.start_date).slice(0, 10),
      end_date: String(contract.end_date).slice(0, 10),
      deposit: contract.deposit,
      status: contract.status
    });
  };

  const saveContract = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/contracts/${editingContract.contract_id}`, {
        ...contractForm,
        deposit: Number(contractForm.deposit)
      });
      setEditingContract(null);
      fetchData();
    } catch (err) {
      notify(err.response?.data?.error || 'บันทึกสัญญาไม่สำเร็จ', 'error');
    }
  };

  const searchTerm = search.trim().toLocaleLowerCase();
  const filteredTenantDirectory = tenantDirectory.filter((tenant) => (
    [
      tenant.first_name,
      tenant.last_name,
      tenant.username,
      tenant.phone,
      tenant.room_number,
      tenant.account_status
    ].some((value) => String(value || '').toLocaleLowerCase().includes(searchTerm))
  ));
  const filteredContracts = contracts.filter((contract) => (
    [
      contract.first_name,
      contract.last_name,
      contract.phone,
      contract.room_number,
      contract.contract_id,
      contract.status
    ].some((value) => String(value || '').toLocaleLowerCase().includes(searchTerm))
  ));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">จัดการผู้เช่าและสัญญา</h1>
          <p className="text-sm text-gray-500">จัดสรรห้องพักให้กับผู้เช่าที่สมัครสมาชิกเข้ามา</p>
        </div>
        <button 
          onClick={() => setShowModal(true)} 
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg transition shadow-sm font-medium cursor-pointer"
        >
          <UserPlus size={18} /> จัดสรรห้องให้ผู้เช่า
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">ข้อมูลผู้เช่าทั้งหมด</h2>
          <p className="text-sm text-gray-500">รวมผู้เช่าที่ยังไม่ได้รับการจัดสรรห้อง</p>
        </div>
        <div className="relative max-w-sm">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ เบอร์โทร ชื่อผู้ใช้ หรือห้อง"
            className="w-full rounded-lg border p-2.5 pl-9 text-sm"
          />
        </div>
        {loading ? (
          <p className="text-center py-4 text-gray-500">กำลังโหลดข้อมูล...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 border-b">
                <tr><th className="p-3">ชื่อผู้เช่า</th><th className="p-3">เบอร์โทร</th><th className="p-3">ห้องปัจจุบัน</th><th className="p-3">สถานะบัญชี</th><th className="p-3 text-center">จัดการ</th></tr>
              </thead>
              <tbody>
                {filteredTenantDirectory.map((tenant) => (
                  <tr key={tenant.user_id} className="border-b">
                    <td className="p-3 font-medium text-gray-800">{tenant.first_name} {tenant.last_name}<span className="ml-2 text-xs text-gray-400">{tenant.username}</span></td>
                    <td className="p-3">{tenant.phone || '-'}</td>
                    <td className="p-3">{tenant.room_number ? `ห้อง ${tenant.room_number}` : 'ยังไม่ได้จัดสรร'}</td>
                    <td className="p-3">{tenant.account_status || '-'}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => openTenantEditor(tenant)} className="inline-flex items-center gap-1 rounded-lg p-2 text-indigo-600 hover:bg-indigo-50" title="แก้ไขข้อมูลผู้เช่า">
                        <Edit2 size={16} /> แก้ไข
                      </button>
                    </td>
                  </tr>
                ))}
                {!filteredTenantDirectory.length && <tr><td colSpan="5" className="p-5 text-center text-gray-400">{tenantDirectory.length ? 'ไม่พบผู้เช่าที่ค้นหา' : 'ยังไม่มีข้อมูลผู้เช่า'}</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        {loading ? (
          <p className="text-center py-6 text-gray-500">กำลังโหลดข้อมูล...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 uppercase border-b">
                <tr>
                  <th className="p-3">เลขที่สัญญา</th>
                  <th className="p-3">ห้องพัก</th>
                  <th className="p-3">ผู้เช่า</th>
                  <th className="p-3">เบอร์โทร</th>
                  <th className="p-3">เงินประกัน</th>
                  <th className="p-3">ระยะเวลาสัญญา</th>
                  <th className="p-3">สถานะ</th>
                  <th className="p-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.map((c) => (
                  <tr key={c.contract_id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-semibold text-gray-800">#{c.contract_id}</td>
                    <td className="p-3 font-semibold text-indigo-600">ห้อง {c.room_number}</td>
                    <td className="p-3 font-medium text-gray-800">{c.first_name} {c.last_name}</td>
                    <td className="p-3">{c.phone || '-'}</td>
                    <td className="p-3">฿{Number(c.deposit).toLocaleString()}</td>
                    <td className="p-3 text-xs text-gray-500">
                      {c.start_date ? new Date(c.start_date).toLocaleDateString('th-TH') : ''} - {c.end_date ? new Date(c.end_date).toLocaleDateString('th-TH') : ''}
                    </td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                        {c.status === 'active' ? 'กำลังเช่าอยู่' : c.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => openTenantEditor(c)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          title="แก้ไขข้อมูลผู้เช่า"
                        >
                          <User size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openContractEditor(c)}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg"
                          title="แก้ไขสัญญา"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredContracts.length && (
                  <tr><td colSpan="8" className="p-5 text-center text-gray-400">
                    {contracts.length ? 'ไม่พบสัญญาที่ค้นหา' : 'ยังไม่มีข้อมูลสัญญา'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal จัดสรรผู้เช่าเข้าห้อง */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-gray-800">จัดสรรห้องพักให้ผู้เช่า</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAssignRoom} className="space-y-4">
              {/* Dropdown เลือกผู้เช่าที่สมัครแล้ว */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">เลือกผู้เช่า (ที่สมัครสมาชิกไว้)</label>
                <select
                  required
                  value={form.tenant_id}
                  onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}
                  className="w-full border p-2.5 rounded-lg text-sm bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- เลือกรายชื่อผู้เช่า --</option>
                  {availableTenants.map((t) => (
                    <option key={t.user_id} value={t.user_id}>
                      {t.first_name} {t.last_name} ({t.username}) - {t.phone || 'ไม่มีเบอร์'}
                    </option>
                  ))}
                </select>
                {availableTenants.length === 0 && (
                  <span className="text-[11px] text-amber-600 mt-1 block">* ยังไม่มีผู้เช่าว่างที่รอจัดสรรห้อง</span>
                )}

                {editingTenant && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <form onSubmit={saveTenant} className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
                      <div className="flex justify-between items-center border-b pb-3">
                        <h3 className="font-bold text-lg">แก้ไขข้อมูลผู้เช่า</h3>
                        <button type="button" onClick={() => setEditingTenant(null)} className="text-gray-400"><X size={20} /></button>
                      </div>
                      <label className="block text-sm">ชื่อ
                        <input required value={tenantForm.first_name} onChange={(e) => setTenantForm({ ...tenantForm, first_name: e.target.value })} className="mt-1 w-full border p-2 rounded-lg" />
                      </label>
                      <label className="block text-sm">นามสกุล
                        <input required value={tenantForm.last_name} onChange={(e) => setTenantForm({ ...tenantForm, last_name: e.target.value })} className="mt-1 w-full border p-2 rounded-lg" />
                      </label>
                      <label className="block text-sm">เบอร์โทรศัพท์
                        <input value={tenantForm.phone} onChange={(e) => setTenantForm({ ...tenantForm, phone: e.target.value })} className="mt-1 w-full border p-2 rounded-lg" />
                      </label>
                      <button className="w-full bg-indigo-600 text-white py-2 rounded-lg">บันทึกข้อมูล</button>
                    </form>
                  </div>
                )}

                {editingContract && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <form onSubmit={saveContract} className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
                      <div className="flex justify-between items-center border-b pb-3">
                        <h3 className="font-bold text-lg">แก้ไขสัญญา #{editingContract.contract_id}</h3>
                        <button type="button" onClick={() => setEditingContract(null)} className="text-gray-400"><X size={20} /></button>
                      </div>
                      <label className="block text-sm">วันเริ่มสัญญา
                        <input type="date" required value={contractForm.start_date} onChange={(e) => setContractForm({ ...contractForm, start_date: e.target.value })} className="mt-1 w-full border p-2 rounded-lg" />
                      </label>
                      <label className="block text-sm">วันสิ้นสุดสัญญา
                        <input type="date" required value={contractForm.end_date} onChange={(e) => setContractForm({ ...contractForm, end_date: e.target.value })} className="mt-1 w-full border p-2 rounded-lg" />
                      </label>
                      <label className="block text-sm">เงินประกัน
                        <input type="number" min="0" required value={contractForm.deposit} onChange={(e) => setContractForm({ ...contractForm, deposit: e.target.value })} className="mt-1 w-full border p-2 rounded-lg" />
                      </label>
                      <label className="block text-sm">สถานะสัญญา
                        <select value={contractForm.status} onChange={(e) => setContractForm({ ...contractForm, status: e.target.value })} className="mt-1 w-full border p-2 rounded-lg">
                          <option value="active">กำลังเช่า</option>
                          <option value="terminated">สิ้นสุดสัญญา</option>
                          <option value="expired">หมดอายุ</option>
                        </select>
                      </label>
                      <button className="w-full bg-indigo-600 text-white py-2 rounded-lg">บันทึกสัญญา</button>
                    </form>
                  </div>
                )}
              </div>

              {/* Dropdown เลือกห้องว่าง */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">เลือกห้องพักที่ว่าง</label>
                <select
                  required
                  value={form.room_id}
                  onChange={(e) => setForm({ ...form, room_id: e.target.value })}
                  className="w-full border p-2.5 rounded-lg text-sm bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- เลือกห้องพัก --</option>
                  {rooms.map((r) => (
                    <option key={r.room_id} value={r.room_id}>
                      ห้อง {r.room_number} (ชั้น {r.floor} - {r.room_type}) - ฿{Number(r.base_price).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">เงินมัดจำ/ประกัน (Deposit)</label>
                <input
                  type="number"
                  required
                  value={form.deposit}
                  onChange={(e) => setForm({ ...form, deposit: e.target.value })}
                  className="w-full border p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="เช่น 5000"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">วันเริ่มสัญญา</label>
                  <input
                    type="date"
                    required
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full border p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">วันสิ้นสุดสัญญา</label>
                  <input
                    type="date"
                    required
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full border p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={availableTenants.length === 0 || rooms.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-medium py-2.5 rounded-lg transition shadow-md mt-2 cursor-pointer"
              >
                บันทึกสัญญาและจัดสรรห้อง
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}