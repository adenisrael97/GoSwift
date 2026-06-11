"use client";

const DOCUMENTS = [
  {
    id: "license",
    emoji: "🪪",
    label: "Driver's License",
    description: "Upload front and back",
    wide: false,
  },
  {
    id: "nin_doc",
    emoji: "🔍",
    label: "NIN Card",
    description: "National Identity Number card",
    wide: false,
  },
  {
    id: "particulars",
    emoji: "📄",
    label: "Vehicle Particulars & Insurance",
    description: "Registration & insurance certificate",
    wide: true,
  },
];

export default function DocumentUploadStep({ files, onChange }) {
  const handleFile = (id, e) => {
    const file = e.target.files?.[0];
    if (file) onChange(id, file);
  };

  return (
    <section className="space-y-5">
      <p className="text-base font-bold text-[#0F1923]">
        Verification Documents
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {DOCUMENTS.map(({ id, emoji, label, description, wide }) => (
          <label
            key={id}
            className={`relative bg-white border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer group transition-all ${
              wide ? "sm:col-span-2" : ""
            } ${
              files[id]
                ? "border-[#ab3500]/40 bg-[#ab3500]/5"
                : "border-slate-200 hover:border-[#ab3500]"
            }`}
          >
            <input
              type="file"
              className="hidden"
              accept="image/*,.pdf"
              onChange={(e) => handleFile(id, e)}
            />
            <span className="text-3xl">{emoji}</span>
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#0F1923]">
                {label}
              </p>
              <p className="text-xs text-slate-400 mt-1">{description}</p>
            </div>
            {files[id] ? (
              <span className="text-[10px] font-bold text-[#ab3500] bg-[#ab3500]/10 px-3 py-1 rounded-full max-w-full truncate">
                ✓ {files[id].name}
              </span>
            ) : (
              <span className="text-2xl text-slate-300 group-hover:text-[#ab3500] transition-colors leading-none">
                +
              </span>
            )}
          </label>
        ))}
      </div>
      <p className="text-xs text-slate-400 text-center">
        Accepted formats: JPG, PNG, PDF · Max 5 MB per file
      </p>
    </section>
  );
}
