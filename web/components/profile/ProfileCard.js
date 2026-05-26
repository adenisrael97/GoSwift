import Link from 'next/link';
import { Star, Pencil } from 'lucide-react';

export default function ProfileCard({ user }) {
  return (
    <div className="bg-[#0F1923] rounded-3xl p-6 shadow-xl relative overflow-hidden">
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#ab3500]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="flex justify-between items-start mb-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-[#ab3500]/20 border-2 border-white/10 flex items-center justify-center">
            <span className="text-white font-black text-2xl">{user.avatarInitials}</span>
          </div>
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-4 h-4 rounded-full border-2 border-[#0F1923]" />
        </div>
        <Link
          href="/profile/edit"
          className="bg-white/10 hover:bg-white/20 transition-colors text-white py-2 px-4 rounded-xl text-sm flex items-center gap-2"
        >
          <Pencil size={14} />
          Edit
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-white font-extrabold text-2xl tracking-tight">{user.fullName}</h1>
        <p className="text-white/60 text-sm mt-0.5">{user.email}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 bg-white/5 rounded-2xl p-4 border border-white/10">
        <div className="text-center">
          <p className="text-white font-bold text-lg">{user.totalOrders}</p>
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Orders</p>
        </div>
        <div className="text-center border-x border-white/10">
          <p className="text-white font-bold text-lg">{user.memberYears}</p>
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Member</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <p className="text-white font-bold text-lg">{user.rating}</p>
            <Star size={12} className="text-amber-400 fill-amber-400" />
          </div>
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Rating</p>
        </div>
      </div>
    </div>
  );
}
