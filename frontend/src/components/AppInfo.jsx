import packageInfo from '../../package.json';

export default function AppInfo({ className = '' }) {
  return (
    <p className={`text-xs leading-relaxed text-slate-500 ${className}`}>
      เวอร์ชัน {packageInfo.version} · พัฒนาโดย Patchalada Place
    </p>
  );
}
