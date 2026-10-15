import { useEffect, useState } from 'react';
import { Building, FileText, Printer, ShieldCheck, User, Calendar, ArrowRight, Eye, X, Download, ExternalLink, Maximize2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import useToast from '../components/useToast';
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

export default function TenantContract() {
  const notify = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedContractIndex, setSelectedContractIndex] = useState(0);
  const [attachedContractDoc, setAttachedContractDoc] = useState(null);
  const [loadingAttachedDoc, setLoadingAttachedDoc] = useState(false);
  const [activeTab, setActiveTab] = useState('attached'); // 'attached' | 'details' | 'renewals'
  const [fullscreenImage, setFullscreenImage] = useState(false);

  useEffect(() => {
    let mounted = true;
    api.get('/tenant/me')
      .then(async (res) => {
        if (!mounted) return;
        const tenantData = res.data || {};
        setData(tenantData);

        // ดึงไฟล์สัญญาเช่าที่แนบตอนสมัคร
        if (tenantData.application_document) {
          setAttachedContractDoc(tenantData.application_document);
          setActiveTab('attached');
        } else if (tenantData.has_kyc_document) {
          setLoadingAttachedDoc(true);
          try {
            const docRes = await api.get('/tenant/my-documents/kyc');
            if (mounted && docRes.data?.document) {
              setAttachedContractDoc(docRes.data.document);
              setActiveTab('attached');
            }
          } catch (e) {
            console.error('Could not fetch attached kyc doc:', e);
            if (mounted) setActiveTab('details');
          } finally {
            if (mounted) setLoadingAttachedDoc(false);
          }
        } else {
          setActiveTab('details');
        }
      })
      .catch((err) => {
        if (mounted) notify(err.response?.data?.error || 'โหลดข้อมูลสัญญาไม่สำเร็จ', 'error');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [notify]);

  if (loading) {
    return <p className="py-12 text-center text-slate-500">กำลังโหลดสัญญาเช่าห้องพัก...</p>;
  }

  const contracts = data?.contracts || [];
  const currentContract = contracts[selectedContractIndex] || (data?.contract_id ? data : null);
  const renewalDocs = (data?.documents || []).filter((d) => d.id !== `application-${data?.user_id}`);

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

  if (!currentContract || !currentContract.contract_id) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          <Building size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">ยังไม่มีสัญญาเช่าห้องพักที่เปิดใช้งาน</h2>
        <p className="mt-2 text-sm text-slate-500">
          เมื่อผู้ดูแลหอพักได้จัดสรรห้องพักและทำสัญญาเช่าให้คุณแล้ว คุณสามารถเข้ามาดูสัญญาและพิมพ์เอกสารได้ที่หน้านี้
        </p>
        <div className="mt-6">
          <Link
            to="/my-dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition"
          >
            กลับสู่แดชบอร์ด
          </Link>
        </div>
      </div>
    );
  }

  // จัดการการพิมพ์และดาวน์โหลดตามประเภทเอกสาร
  const handlePrintAttachedDoc = () => {
    if (!attachedContractDoc) return;
    if (attachedContractDoc.startsWith('data:application/pdf;')) {
      openOrPrintPdf(attachedContractDoc, `สัญญาเช่าห้อง-${currentContract.room_number}.pdf`);
    } else {
      printImage(attachedContractDoc, `สัญญาเช่าห้องพัก-${currentContract.room_number}`);
    }
  };

  const handleDownloadAttachedDoc = () => {
    if (!attachedContractDoc) return;
    const isPdf = attachedContractDoc.startsWith('data:application/pdf;');
    const ext = isPdf ? 'pdf' : 'png';
    downloadDataUrl(attachedContractDoc, `สัญญาเช่าห้อง-${currentContract.room_number}.${ext}`);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 print-hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">สัญญาเช่าห้องพักของคุณ</h1>
            {statusBadge(currentContract.status || currentContract.contract_status)}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            ห้อง {currentContract.room_number} (ชั้น {currentContract.floor}) · {data?.dormitory_name || 'ระบบจัดการหอพัก'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {contracts.length > 1 && (
            <select
              value={selectedContractIndex}
              onChange={(e) => setSelectedContractIndex(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-xs focus:outline-none"
            >
              {contracts.map((c, i) => (
                <option key={c.contract_id} value={i}>
                  สัญญา #{c.contract_id} (ห้อง {c.room_number})
                </option>
              ))}
            </select>
          )}

          {activeTab === 'attached' && attachedContractDoc && (
            <>
              <button
                type="button"
                onClick={handlePrintAttachedDoc}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-teal-800 transition cursor-pointer"
                title="พิมพ์สัญญาเช่า หรือบันทึกเป็น PDF"
              >
                <Printer size={16} /> พิมพ์สัญญา / บันทึก PDF
              </button>
              <button
                type="button"
                onClick={handleDownloadAttachedDoc}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition cursor-pointer"
                title="ดาวน์โหลดไฟล์เอกสาร"
              >
                <Download size={16} /> ดาวน์โหลด
              </button>
            </>
          )}

          {activeTab === 'details' && (
            <button
              type="button"
              onClick={() => printElement('printable-contract-document', { title: `สัญญาเช่าห้อง-${currentContract.room_number}` })}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-teal-800 transition cursor-pointer"
            >
              <Printer size={16} /> พิมพ์รายละเอียดสัญญา / PDF
            </button>
          )}
        </div>
      </div>

      {/* สรุปข้อมูลสำคัญของสัญญา (Quick Specs Bar) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs text-sm">
        <div className="border-r border-slate-100 pr-2">
          <span className="text-xs text-slate-400 block font-medium">ห้องพัก</span>
          <span className="font-bold text-teal-800 text-base">ห้อง {currentContract.room_number}</span>
          <span className="text-xs text-slate-500 block">ชั้น {currentContract.floor} · {currentContract.room_type || 'ห้องพัก'}</span>
        </div>
        <div className="border-r border-slate-100 pr-2">
          <span className="text-xs text-slate-400 block font-medium">ค่าเช่ารายเดือน</span>
          <span className="font-bold text-slate-800 text-base">฿{formatMoney(currentContract.base_price)}</span>
          <span className="text-xs text-slate-500 block">บาท / เดือน</span>
        </div>
        <div className="border-r border-slate-100 pr-2">
          <span className="text-xs text-slate-400 block font-medium">เงินประกัน</span>
          <span className="font-bold text-slate-800 text-base">฿{formatMoney(currentContract.deposit)}</span>
          <span className="text-xs text-slate-500 block">คืนเมื่อสิ้นสุดสัญญา</span>
        </div>
        <div>
          <span className="text-xs text-slate-400 block font-medium">ระยะเวลาสัญญา</span>
          <span className="font-semibold text-slate-800 text-xs block mt-0.5">
            {formatDate(currentContract.start_date)}
          </span>
          <span className="text-xs text-slate-500 block">ถึง {formatDate(currentContract.end_date)}</span>
        </div>
      </div>

      {/* Tabs เลือกมุมมองเอกสาร */}
      <div className="flex items-center gap-2 border-b border-slate-200 print-hidden">
        <button
          type="button"
          onClick={() => setActiveTab('attached')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition cursor-pointer ${
            activeTab === 'attached'
              ? 'border-teal-700 text-teal-800 bg-teal-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck size={17} /> เอกสารสัญญาเช่า (ฉบับแนบตอนสมัคร)
          {attachedContractDoc && (
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" title="มีเอกสารแนบ" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition cursor-pointer ${
            activeTab === 'details'
              ? 'border-teal-700 text-teal-800 bg-teal-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <FileText size={17} /> รายละเอียดและเงื่อนไขสัญญาในระบบ
        </button>

        {renewalDocs.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab('renewals')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'renewals'
                ? 'border-teal-700 text-teal-800 bg-teal-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck size={17} /> เอกสารต่อสัญญา ({renewalDocs.length})
          </button>
        )}
      </div>

      {/* TAB 1: เอกสารสัญญาเช่าที่แนบตอนสมัคร (ฉบับจริงที่เป็นรูป/PDF) */}
      {activeTab === 'attached' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/90 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-bold text-base text-slate-800">
                เอกสารสัญญาเช่า / หลักฐานที่แนบไว้ตอนสมัครสมาชิก
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                เอกสารฉบับนี้อัปโหลดโดยผู้เช่าเมื่อลงทะเบียนเข้าใช้งานระบบ
              </p>
            </div>

            {attachedContractDoc && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintAttachedDoc}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-100 transition cursor-pointer"
                >
                  <Printer size={14} /> พิมพ์หน้านี้
                </button>
                <button
                  type="button"
                  onClick={handleDownloadAttachedDoc}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                >
                  <Download size={14} /> ดาวน์โหลด
                </button>
              </div>
            )}
          </div>

          {loadingAttachedDoc ? (
            <p className="py-12 text-center text-sm text-slate-400">กำลังโหลดเอกสารสัญญา...</p>
          ) : attachedContractDoc ? (
            attachedContractDoc.startsWith('data:application/pdf;') ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600">
                  <span>เอกสารรูปแบบ PDF คุณสามารถเปิดอ่าน บันทึก หรือสั่งพิมพ์ได้จากหน้าจอนี้</span>
                  <button
                    type="button"
                    onClick={() => openOrPrintPdf(attachedContractDoc, `สัญญาเช่าห้อง-${currentContract.room_number}.pdf`)}
                    className="inline-flex items-center gap-1 text-teal-700 font-semibold hover:underline cursor-pointer"
                  >
                    <ExternalLink size={14} /> เปิดดูในแท็บใหม่
                  </button>
                </div>
                <iframe
                  title="เอกสารสัญญาเช่าห้องพัก PDF"
                  src={attachedContractDoc}
                  className="w-full h-[78vh] min-h-[600px] rounded-xl border border-slate-200 bg-slate-100"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-600">
                  <span>รูปภาพเอกสารสัญญาเช่าห้องพัก</span>
                  <button
                    type="button"
                    onClick={() => setFullscreenImage(true)}
                    className="inline-flex items-center gap-1 text-teal-700 font-semibold hover:underline cursor-pointer"
                  >
                    <Maximize2 size={13} /> ดูภาพขยายเต็มจอ
                  </button>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-center items-center overflow-auto max-h-[82vh]">
                  <img
                    src={attachedContractDoc}
                    alt="เอกสารสัญญาเช่าห้องพัก"
                    className="max-h-[76vh] max-w-full object-contain rounded-lg shadow-sm border border-slate-200 bg-white"
                  />
                </div>
              </div>
            )
          ) : (
            <div className="py-12 text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <FileText size={28} />
              </div>
              <h3 className="font-bold text-slate-700">ยังไม่มีไฟล์เอกสารสัญญาแนบในระบบ</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                ไม่พบไฟล์เอกสารที่แนบไว้ตอนสมัครสมาชิก หากคุณมีเอกสารสัญญาที่ต้องการแนบเพิ่มเติม สามารถติดต่อผู้ดูแลหอพักได้
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className="inline-flex items-center gap-1 text-xs text-teal-700 font-semibold hover:underline cursor-pointer mt-2"
              >
                ดูรายละเอียดสัญญาในระบบแทน <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: รายละเอียดและเงื่อนไขสัญญาในระบบ (Printable Clean Paper) */}
      {activeTab === 'details' && (
        <article
          id="printable-contract-document"
          className="contract-document bg-white p-8 sm:p-12 rounded-2xl shadow-sm border border-slate-200/90 space-y-6 text-slate-800"
        >
          {/* หัวหนังสือสัญญา */}
          <div className="text-center pb-6 border-b-2 border-teal-800">
            <span className="text-xs font-semibold uppercase tracking-widest text-teal-700">Official Lease Agreement</span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              หนังสือสัญญาเช่าห้องพักอาศัย
            </h2>
            <p className="mt-1 text-base font-semibold text-teal-900">
              {data?.dormitory_name || 'ระบบจัดการหอพัก'}
            </p>
            {data?.dormitory_address && (
              <p className="text-xs text-slate-500 mt-0.5 whitespace-pre-line">
                {data.dormitory_address}
              </p>
            )}
            {data?.contact_phone && (
              <p className="text-xs text-slate-500">โทร. {data.contact_phone}</p>
            )}
          </div>

          {/* สรุปเลขที่และระยะเวลา */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider block">เลขที่สัญญา</span>
              <span className="font-bold text-slate-800 text-base">
                CONTRACT-#{String(currentContract.contract_id).padStart(6, '0')}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider block">วันที่เริ่มสัญญา</span>
              <span className="font-semibold text-slate-700">{formatDate(currentContract.start_date)}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider block">วันที่สิ้นสุดสัญญา</span>
              <span className="font-semibold text-slate-700">{formatDate(currentContract.end_date)}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 uppercase tracking-wider block">สถานะ</span>
              {statusBadge(currentContract.status || currentContract.contract_status)}
            </div>
          </div>

          {/* ข้อมูลคู่สัญญา */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5 mb-2 text-teal-800">
                <Building size={16} /> ผู้ให้เช่า (หอพัก)
              </h3>
              <p><span className="text-slate-500">ชื่อหอพัก:</span> <span className="font-medium text-slate-800">{data?.dormitory_name || 'หอพัก'}</span></p>
              <p><span className="text-slate-500">เบอร์โทรศัพท์:</span> {data?.contact_phone || '-'}</p>
              <p className="text-xs text-slate-500 mt-1">ผู้มีอำนาจลงนามและบริหารจัดการห้องพัก</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5 mb-2 text-teal-800">
                <User size={16} /> ผู้เช่า (Tenant)
              </h3>
              <p><span className="text-slate-500">ชื่อ-นามสกุล:</span> <span className="font-medium text-slate-800">{data?.first_name} {data?.last_name}</span></p>
              <p><span className="text-slate-500">เบอร์โทรศัพท์:</span> {data?.phone || '-'}</p>
              <p><span className="text-slate-500">ชื่อผู้ใช้:</span> @{data?.username}</p>
            </div>
          </div>

          {/* รายละเอียดห้องพักและค่าใช้จ่าย */}
          <div className="space-y-3">
            <h3 className="font-bold text-base text-slate-900 border-b pb-1">
              ข้อมูลห้องพักและเงื่อนไขค่าใช้จ่าย
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-xs text-slate-500 block">ห้องพัก</span>
                <span className="font-bold text-teal-800 text-lg">ห้อง {currentContract.room_number || '-'}</span>
                <span className="text-xs text-slate-500 block">ชั้น {currentContract.floor || '-'} · {currentContract.room_type || 'ห้องพัก'}</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-xs text-slate-500 block">ค่าเช่ารายเดือน</span>
                <span className="font-bold text-slate-800 text-lg">฿{formatMoney(currentContract.base_price)}</span>
                <span className="text-xs text-slate-500 block">บาท / เดือน</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-xs text-slate-500 block">เงินประกันความเสียหาย</span>
                <span className="font-bold text-slate-800 text-lg">฿{formatMoney(currentContract.deposit)}</span>
                <span className="text-xs text-slate-500 block">คืนเมื่อสิ้นสุดสัญญา</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-xs text-slate-500 block">อัตราค่าน้ำ / ค่าไฟ</span>
                <span className="font-semibold text-slate-800 block text-xs mt-1">น้ำ: ฿{data?.water_rate || 18}/หน่วย</span>
                <span className="font-semibold text-slate-800 block text-xs">ไฟ: ฿{data?.electric_rate || 8}/หน่วย</span>
              </div>
            </div>
          </div>

          {/* ข้อตกลงและเงื่อนไขแห่งสัญญา */}
          <div className="space-y-2.5 pt-2 text-xs leading-relaxed text-slate-700 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-900 text-sm mb-2">ข้อกำหนดและเงื่อนไขแห่งสัญญาเช่า:</h4>
            <ol className="list-decimal pl-4 space-y-1.5">
              <li>
                <strong>วัตถุประสงค์แห่งการเช่า:</strong> ผู้เช่าตกลงเช่าห้องพักเพื่อการพักอาศัยส่วนบุคคลเท่านั้น ห้ามนำห้องพักไปประกอบการค้าที่ผิดกฎหมาย หรือให้บุคคลภายนอกเช่าช่วงโดยไม่ได้รับความยินยอมเป็นลายลักษณ์อักษรจากผู้ให้เช่า
              </li>
              <li>
                <strong>การชำระค่าเช่า:</strong> ผู้เช่าตกลงชำระค่าเช่าห้องพัก พร้อมค่าน้ำประปา ค่าไฟฟ้า และค่าใช้จ่ายส่วนกลางตามรอบบิลที่กำหนด ภายในระยะเวลาไม่เกินกำหนดชำระของทุกเดือน
              </li>
              <li>
                <strong>เงินประกันความเสียหาย:</strong> เงินประกันความเสียหายจะได้รับการคืนเมื่อสิ้นสุดสัญญาเช่าและผู้เช่าส่งมอบห้องพักในสภาพเรียบร้อย หลังจากหักค่าใช้จ่ายค้างชำระหรือค่าเสียหายตามจริง
              </li>
              <li>
                <strong>การดูแลรักษาห้องพัก:</strong> ผู้เช่ามีหน้าที่ดูแลรักษาความสะอาดและความเรียบร้อยของห้องพัก อุปกรณ์ และเฟอร์นิเจอร์ให้อยู่ในสภาพใช้งานได้ดี
              </li>
              <li>
                <strong>การต่ออายุสัญญา:</strong> ผู้เช่าสามารถยื่นความประสงค์ต่อสัญญาเช่าล่วงหน้าผ่านระบบได้ 30 วันก่อนวันสิ้นสุดสัญญา
              </li>
            </ol>
          </div>

          {/* ลายมือชื่อคู่สัญญา */}
          <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="space-y-12">
              <p className="font-semibold text-slate-800">ลงชื่อ .................................................... ผู้ให้เช่า</p>
              <p className="text-slate-600">({data?.dormitory_name || 'ตัวแทนหอพัก'})</p>
            </div>
            <div className="space-y-12">
              <p className="font-semibold text-slate-800">ลงชื่อ .................................................... ผู้เช่า</p>
              <p className="text-slate-600">({data?.first_name} {data?.last_name})</p>
            </div>
          </div>
        </article>
      )}

      {/* TAB 3: เอกสารต่อสัญญา (ถ้ามี) */}
      {activeTab === 'renewals' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/90 space-y-4">
          <h2 className="font-bold text-base text-slate-800">ประวัติและเอกสารการต่ออายุสัญญา</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {renewalDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText size={18} className="text-teal-700 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-slate-800 truncate">{doc.title}</p>
                    <p className="text-[11px] text-slate-500">
                      {formatDate(doc.submitted_at)} · {doc.status}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await api.get(`/tenant/my-documents/${doc.id}`);
                      if (res.data?.document) {
                        setAttachedContractDoc(res.data.document);
                        setActiveTab('attached');
                      }
                    } catch (e) {
                      notify('โหลดเอกสารไม่สำเร็จ', 'error');
                    }
                  }}
                  className="inline-flex items-center gap-1 shrink-0 rounded-lg bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-100 transition cursor-pointer"
                >
                  <Eye size={13} /> เปิดดู
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shortcut ไปยังหน้าต่อสัญญา */}
      <div className="flex items-center justify-between bg-teal-50/80 border border-teal-200/80 p-4 rounded-xl print-hidden">
        <div>
          <p className="font-semibold text-sm text-teal-950">ต้องการยื่นเรื่องต่อสัญญาเช่า หรือแจ้งซ่อมแซมห้องพัก?</p>
          <p className="text-xs text-teal-700">สามารถส่งคำร้องออนไลน์ได้ที่หน้าบริการผู้เช่า</p>
        </div>
        <Link
          to="/tenant-services"
          className="inline-flex items-center gap-1 rounded-lg bg-teal-800 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-700 transition"
        >
          ไปหน้าบริการผู้เช่า <ArrowRight size={14} />
        </Link>
      </div>

      {/* Modal ดูภาพขยายเต็มจอ */}
      {fullscreenImage && attachedContractDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="relative max-h-[95vh] max-w-[95vw] overflow-auto">
            <button
              type="button"
              onClick={() => setFullscreenImage(false)}
              className="fixed top-4 right-4 z-50 rounded-full bg-white/90 p-2 text-slate-800 shadow-lg hover:bg-white cursor-pointer"
              aria-label="ปิดภาพขยาย"
            >
              <X size={20} />
            </button>
            <img
              src={attachedContractDoc}
              alt="สัญญาเช่าห้องพักขนาดเต็ม"
              className="max-h-[92vh] max-w-[92vw] object-contain rounded-xl mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
