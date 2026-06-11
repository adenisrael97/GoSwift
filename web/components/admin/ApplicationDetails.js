import { User, Bike, FileText, Shield } from 'lucide-react';
import StatusBadge from "./StatusBadge";

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className="text-sm font-semibold text-[#0F1923]">{value || "—"}</p>
    </div>
  );
}

export default function ApplicationDetails({ application }) {
  return (
    <div className="space-y-6">
      {/* Applicant header */}
      <section className="bg-white p-5 sm:p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl shadow-md ${application.avatarColor}`}
          >
            {application.initials}
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#0F1923] tracking-tight">
              {application.name}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {application.state}, Nigeria · Delivery Partner Applicant
            </p>
          </div>
        </div>
        <StatusBadge status={application.status} size="lg" />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal info */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
              <User size={15} className="text-[#ab3500]" />
            </div>
            <h2 className="text-base font-bold text-[#0F1923]">Personal Info</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InfoRow label="NIN Number" value={application.nin} />
            <InfoRow label="Date of Birth" value={application.dateOfBirth} />
            <InfoRow label="Gender" value={application.gender} />
            <InfoRow label="Phone" value={application.phone} />
            <InfoRow label="Email" value={application.email} />
            <div className="sm:col-span-2">
              <InfoRow
                label="Residential Address"
                value={application.address}
              />
            </div>
          </div>
        </section>

        {/* Vehicle details */}
        <section className="bg-[#0F1923] p-6 rounded-xl shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                  <Bike size={15} className="text-white" />
                </div>
                <h2 className="text-base font-bold text-white">Vehicle Details</h2>
              </div>
              <span className="bg-[#ab3500] px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-widest">
                Selected
              </span>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Vehicle Type
                </p>
                <p className="text-sm font-semibold text-white">
                  {application.vehicle.type}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Plate Number
                </p>
                <p className="text-sm font-semibold text-white">
                  {application.vehicle.plateNumber}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Model
                </p>
                <p className="text-sm font-semibold text-white">
                  {application.vehicle.model}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Manufacturer
                </p>
                <p className="text-sm font-semibold text-white">
                  {application.vehicle.manufacturer}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Color
                </p>
                <p className="text-sm font-semibold text-white">
                  {application.vehicle.color}
                </p>
              </div>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-[#ab3500]/10 rounded-full blur-3xl pointer-events-none" />
        </section>

        {/* Documents */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
              <FileText size={15} className="text-[#ab3500]" />
            </div>
            <h2 className="text-base font-bold text-[#0F1923]">Documents</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Driver's License", url: application.documents?.license },
              { label: "NIN Card",         url: application.documents?.ninDoc },
              { label: "Vehicle Particulars", url: application.documents?.particulars, wide: true },
            ].map(({ label, url, wide }) => (
              <div
                key={label}
                className={`aspect-4/3 rounded-xl border bg-slate-50 flex flex-col items-center justify-center gap-2 p-4 text-center ${
                  wide ? "sm:col-span-2" : ""
                } ${url ? "border-slate-200" : "border-dashed border-slate-200"}`}
              >
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                  <FileText size={20} className="text-[#ab3500]" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#0F1923]">
                  {label}
                </p>
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-white shadow-sm border border-slate-200 rounded-lg text-[11px] font-bold text-[#ab3500] hover:bg-[#ab3500] hover:text-white transition-all"
                  >
                    View
                  </a>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-400">
                    Not uploaded
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Guarantor */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
              <Shield size={15} className="text-[#ab3500]" />
            </div>
            <h2 className="text-base font-bold text-[#0F1923]">Guarantor Information</h2>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="font-bold text-sm text-[#0F1923]">
              {application.guarantor.name || '—'}
            </p>
            <div className="space-y-2 pt-3 mt-3 border-t border-slate-200">
              <p className="text-xs text-slate-600">{application.guarantor.phone || '—'}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
