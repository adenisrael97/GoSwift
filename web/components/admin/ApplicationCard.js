import Link from "next/link";
import StatusBadge from "./StatusBadge";

export default function ApplicationCard({ application }) {
  return (
    <Link
      href={`/admin/drivers/${application.id}`}
      className="block bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${application.avatarColor}`}
          >
            {application.initials}
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm leading-tight">
              {application.name}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {application.state} · {application.vehicle.type}
            </p>
          </div>
        </div>
        <StatusBadge status={application.status} />
      </div>
      <div className="flex justify-between items-center pt-3 border-t border-slate-50">
        <span className="text-[11px] text-slate-400">
          Submitted {application.submittedAt}
        </span>
        <span className="text-[#ab3500] font-bold text-xs">View →</span>
      </div>
    </Link>
  );
}
