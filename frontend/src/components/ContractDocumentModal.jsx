import { useEffect, useState } from 'react';
import { Printer, X, FileText, Building, User, ShieldCheck, Download, ExternalLink, Maximize2 } from 'lucide-react';
import api from '../api/axios';
import useToast from './useToast';
import { printElement, printImage, openOrPrintPdf, downloadDataUrl } from '../utils/printHelper';

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(`${String(date).slice(0, 10)}T00:00:00`).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

const formatMoney = (val) => Number(val || 0).toLocaleString('th-TH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export default function ContractDocumentModal({ contract, onClose, documents = [] }) {
  const notify = useToast();
  const [activeTab, setActiveTab] = useState('attached'); // 'attached' | 'contract'
  const [attachedDoc, setAttachedDoc] = useState(contract?.application_document || null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(false);

  useEffect(() => {
    if (contract?.application_document) {
      setAttachedDoc(contract.application_document);
      setActiveTab('attached');
      return;
    }

    // ถ้าไม่มีใน props ให้ลองโหลดเอกสารแนบตอนสมัคร
    const role = localStorage.getItem('role');
    const tenantId = contract?.tenant_id || contract?.user_id;

    if (contract?.has_kyc_document || documents.some((d) => d.id?.startsWith('application-'))) {
      setLoadingDoc(true);
      const url = role === 'admin' && tenantId
        ? `/tenant/admin/tenants/${tenantId}/documents/application-${tenantId}`
        : `/tenant/my-documents/kyc`;

      api.get(url)
        .then((res) => {
          if (res.data?.document) {
            setAttachedDoc(res.data.document);
            setActiveTab('attached');
          } else {
            setActiveTab('contract');
          }
        })
        .catch(() => {
          setActiveTab('contract');
        })
        .finally(() => {
          setLoadingDoc(false);
        });
    } else {
      setActiveTab('contract');
    }
  }, [contract, documents]);

  if (!contract) return null;

  const handlePrint = () => {
    if (activeTab === 'attached' && attachedDoc) {
      if (attachedDoc.startsWith('data:application/pdf;')) {
        openOrPrintPdf(attachedDoc, `สัญญาเช่าห้อง-${contract.room_number}.pdf`);
      } else {
        printImage(attachedDoc, `สัญญาเช่าห้องพัก-${contract.room_number}`);
      }
    } else {
      printElement('printable-modal-contract', {
        title: `หนังสือสัญญาเช่าห้องพัก-${contract.room_number}`
      });
    }
  };

  const handleDownload = () => {
    if (!attachedDoc) return;
    const isPdf = attachedDoc.startsWith('data:application/pdf;');
    const ext = isPdf ? 'pdf' : 'png';
    downloadDataUrl(attachedDoc, `สัญญาเช่าห้อง-${contract.room_number}.${ext}`);
  };

  const statusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">ใช้งานอยู่ (Active)</span>;
      case 'terminated':
        return <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">สิ้นสุดสัญญาแล้ว</span>;
      case 'expired':
        return <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800">หมดอายุ</span>;
      default:
        return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{status || '-'}</span>;
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
        <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
          {/* Modal Header Actions */}
          <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-3.5 gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('attached')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'attached'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <ShieldCheck size={15} /> สัญญาเช่า (ฉบับแนบตอนสมัคร)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('contract')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'contract'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <FileText size={15} /> รายละเอียดสัญญาในระบบ
              </button>
            </div>

            <div className="flex items-center gap-2">
              {activeTab === 'attached' && attachedDoc && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  title="ดาวน์โหลดไฟล์เอกสาร"
                >
                  <Download size={14} /> ดาวน์โหลด
                </button>
              )}

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-indigo-700 transition cursor-pointer"
                title="พิมพ์สัญญา หรือบันทึกเป็น PDF"
              >
                <Printer size={15} /> พิมพ์ / PDF
              </button>

              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition cursor-pointer"
                aria-label="ปิดหน้าต่าง"
              >
                <X size={19} />
              </button>
            </div>
          </div>

          {/* Modal Content Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8">
            {/* VIEW 1: เอกสารสัญญาเช่าที่แนบตอนสมัคร */}
            {activeTab === 'attached' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800">
                      เอกสารสัญญาเช่าห้องพัก (ห้อง {contract.room_number})
                    </h3>
                    <p className="text-xs text-slate-500">เอกสารที่อัปโหลดแนบไว้ตอนลงทะเบียนสมัครสมาชิก</p>
                  </div>
                  {attachedDoc && !attachedDoc.startsWith('data:application/pdf;') && (
                    <button
                      type="button"
                      onClick={() => setFullscreenImage(true)}
                      className="text-xs text-teal-700 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Maximize2 size={13} /> ดูภาพขยาย
                    </button>
                  )}
                </div>

                {loadingDoc ? (
                  <p className="py-12 text-center text-sm text-slate-400">กำลังโหลดเอกสารสัญญา...</p>
                ) : attachedDoc ? (
                  attachedDoc.startsWith('data:application/pdf;') ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg text-xs text-slate-600">
                        <span>ไฟล์เอกสารสัญญาเช่ารูปแบบ PDF</span>
                        <button
                          type="button"
                          onClick={() => openOrPrintPdf(attachedDoc, `สัญญาเช่าห้อง-${contract.room_number}.pdf`)}
                          className="inline-flex items-center gap-1 text-teal-700 font-semibold hover:underline cursor-pointer"
                        >
                          <ExternalLink size={13} /> เปิดในแท็บใหม่
                        </button>
                      </div>
                      <iframe
                        title="เอกสารสัญญา PDF"
                        src={attachedDoc}
                        className="w-full h-[68vh] min-h-[500px] rounded-xl border border-slate-200"
                      />
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-center items-center overflow-auto max-h-[72vh]">
                      <img
                        src={attachedDoc}
                        alt="เอกสารสัญญาเช่า"
                        className="max-h-[68vh] max-w-full object-contain rounded-lg shadow-sm border border-slate-200 bg-white"
                      />
                    </div>
                  )
                ) : (
                  <div className="py-12 text-center space-y-2">
                    <p className="text-sm text-slate-500">ไม่พบไฟล์เอกสารสัญญาที่แนบไว้ตอนสมัครสมาชิก</p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('contract')}
                      className="text-xs text-teal-700 font-semibold hover:underline cursor-pointer"
                    >
                      ดูรายละเอียดสัญญาในระบบแทน
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* VIEW 2: รายละเอียดและข้อตกลงสัญญาในระบบ */}
            {activeTab === 'contract' && (
              <div id="printable-modal-contract" className="contract-document mx-auto max-w-3xl space-y-6 text-slate-800">
                {/* หัวหนังสือสัญญา */}
                <div className="text-center pb-6 border-b-2 border-teal-800">
                  <span className="text-xs font-semibold uppercase tracking-widest text-teal-700">Official Lease Agreement</span>
                  <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                    หนังสือสัญญาเช่าห้องพักอาศัย
                  </h1>
                  <p className="mt-1 text-base font-semibold text-teal-900">
                    {contract.dormitory_name || 'ระบบจัดการหอพัก'}
                  </p>
                  {contract.dormitory_address && (
                    <p className="text-xs text-slate-500 mt-0.5 whitespace-pre-line">
                      {contract.dormitory_address}
                    </p>
                  )}
                  {contract.contact_phone && (
                    <p className="text-xs text-slate-500">โทร. {contract.contact_phone}</p>
                  )}
                </div>

                {/* สรุปเลขที่และสถานะ */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 uppercase tracking-wider block">เลขที่สัญญา</span>
                    <span className="font-bold text-slate-800 text-base">
                      CONTRACT-#{String(contract.contract_id).padStart(6, '0')}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 uppercase tracking-wider block">วันที่เริ่มสัญญา</span>
                    <span className="font-semibold text-slate-700">{formatDate(contract.start_date)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 uppercase tracking-wider block">วันที่สิ้นสุดสัญญา</span>
                    <span className="font-semibold text-slate-700">{formatDate(contract.end_date)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 uppercase tracking-wider block">สถานะ</span>
                    {statusBadge(contract.status)}
                  </div>
                </div>

                {/* ข้อมูลคู่สัญญา */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
                    <h3 className="font-bold text-slate-800 flex items-center gap-1.5 mb-2 text-teal-800">
                      <Building size={16} /> ผู้ให้เช่า (หอพัก)
                    </h3>
                    <p><span className="text-slate-500">ชื่อหอพัก:</span> <span className="font-medium text-slate-800">{contract.dormitory_name || 'หอพัก'}</span></p>
                    <p><span className="text-slate-500">เบอร์โทรศัพท์:</span> {contract.contact_phone || '-'}</p>
                    <p className="text-xs text-slate-500 mt-1">ตัวแทนผู้มีอำนาจลงนามและบริหารจัดการห้องพัก</p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
                    <h3 className="font-bold text-slate-800 flex items-center gap-1.5 mb-2 text-teal-800">
                      <User size={16} /> ผู้เช่า (Tenant)
                    </h3>
                    <p><span className="text-slate-500">ชื่อ-นามสกุล:</span> <span className="font-medium text-slate-800">{contract.first_name} {contract.last_name}</span></p>
                    <p><span className="text-slate-500">เบอร์โทรศัพท์:</span> {contract.phone || '-'}</p>
                    <p><span className="text-slate-500">ชื่อผู้ใช้ระบบ:</span> @{contract.username || '-'}</p>
                  </div>
                </div>

                {/* รายละเอียดห้องพักและการเงิน */}
                <div className="space-y-3">
                  <h3 className="font-bold text-base text-slate-900 border-b pb-1">
                    ข้อมูลห้องพักและเงื่อนไขค่าใช้จ่าย
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-xs text-slate-500 block">ห้องพัก</span>
                      <span className="font-bold text-teal-800 text-lg">ห้อง {contract.room_number || '-'}</span>
                      <span className="text-xs text-slate-500 block">ชั้น {contract.floor || '-'} · {contract.room_type || 'ห้องพัก'}</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-xs text-slate-500 block">ค่าเช่ารายเดือน</span>
                      <span className="font-bold text-slate-800 text-lg">฿{formatMoney(contract.base_price)}</span>
                      <span className="text-xs text-slate-500 block">บาท / เดือน</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-xs text-slate-500 block">เงินประกัน</span>
                      <span className="font-bold text-slate-800 text-lg">฿{formatMoney(contract.deposit)}</span>
                      <span className="text-xs text-slate-500 block">คืนเมื่อสิ้นสุดสัญญา</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-xs text-slate-500 block">ค่าน้ำ / ค่าไฟ</span>
                      <span className="font-semibold text-slate-800 block text-xs mt-1">น้ำ: ฿{contract.water_rate || 18}/หน่วย</span>
                      <span className="font-semibold text-slate-800 block text-xs">ไฟ: ฿{contract.electricity_rate || contract.electric_rate || 8}/หน่วย</span>
                    </div>
                  </div>
                </div>

                {/* เงื่อนไข 5 ข้อ */}
                <div className="space-y-2.5 pt-2 text-xs leading-relaxed text-slate-700 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-900 text-sm mb-2">ข้อกำหนดและเงื่อนไขแห่งสัญญา:</h4>
                  <ol className="list-decimal pl-4 space-y-1.5">
                    <li>ผู้เช่าตกลงเช่าห้องพักเพื่อการพักอาศัยส่วนบุคคลเท่านั้น ห้ามนำไปประกอบการค้าที่ผิดกฎหมาย หรือให้ผู้อื่นเช่าช่วง</li>
                    <li>ผู้เช่าตกลงชำระค่าเช่า ค่าน้ำ ค่าไฟ และค่าบริการตามรอบบิลที่กำหนดภายในระยะเวลาไม่เกินกำหนดชำระ</li>
                    <li>เงินประกันความเสียหายจะได้รับการคืนเมื่อสิ้นสุดสัญญาเช่าและส่งมอบห้องพักในสภาพเรียบร้อย หักค่าเสียหายตามจริง</li>
                    <li>ผู้เช่ามีหน้าที่ดูแลรักษาความสะอาดและความเรียบร้อยของห้องพักและทรัพย์สินของหอพักให้อยู่ในสภาพดี</li>
                    <li>ผู้เช่าสามารถยื่นคำร้องขอต่อสัญญาเช่าล่วงหน้าผ่านระบบได้ 30 วันก่อนวันสิ้นสุดสัญญา</li>
                  </ol>
                </div>

                {/* ลายมือชื่อ */}
                <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs">
                  <div className="space-y-10">
                    <p className="font-semibold text-slate-800">ลงชื่อ .................................................... ผู้ให้เช่า</p>
                    <p className="text-slate-600">({contract.dormitory_name || 'ตัวแทนหอพัก'})</p>
                  </div>
                  <div className="space-y-10">
                    <p className="font-semibold text-slate-800">ลงชื่อ .................................................... ผู้เช่า</p>
                    <p className="text-slate-600">({contract.first_name} {contract.last_name})</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal ดูภาพขยายเต็มจอ */}
      {fullscreenImage && attachedDoc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-xs p-4">
          <div className="relative max-h-[95vh] max-w-[95vw] overflow-auto">
            <button
              type="button"
              onClick={() => setFullscreenImage(false)}
              className="fixed top-4 right-4 z-[70] rounded-full bg-white/90 p-2 text-slate-800 shadow-lg hover:bg-white cursor-pointer"
              aria-label="ปิดภาพขยาย"
            >
              <X size={20} />
            </button>
            <img
              src={attachedDoc}
              alt="สัญญาเช่าห้องพักขนาดเต็ม"
              className="max-h-[92vh] max-w-[92vw] object-contain rounded-xl mx-auto"
            />
          </div>
        </div>
      )}
    </>
  );
}
