import SettingItem from './SettingItem';

export default function SettingsList({ title, items }) {
  return (
    <section className="mt-8 lg:mt-6">
      <h2 className="text-[#0F1923] font-bold text-xl mb-4 px-1">{title}</h2>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-50 overflow-hidden">
        {items.map((item, i) => (
          <SettingItem key={i} {...item} />
        ))}
      </div>
    </section>
  );
}
