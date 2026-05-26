'use client';

import { Pencil, Mail, Lock } from 'lucide-react';
import InputField from './InputField';

export default function ProfileForm({ fields, onChange }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-6">Profile Details</p>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputField
            label="Full Name"
            value={fields.fullName}
            onChange={(e) => onChange('fullName', e.target.value)}
            icon={Pencil}
          />
          <InputField
            label="Email Address"
            type="email"
            value={fields.email}
            onChange={(e) => onChange('email', e.target.value)}
            icon={Mail}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-600">Phone Number</label>
          <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-xl">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0F1923] text-white rounded-lg font-bold text-xs shrink-0">
              +234
            </div>
            <span className="font-medium text-slate-500 tracking-widest text-sm">
              {fields.phoneDisplay}
            </span>
            <Lock size={14} className="ml-auto text-slate-400 shrink-0" />
          </div>
          <p className="text-xs text-slate-400 italic mt-1.5">Contact support to change your phone number.</p>
        </div>
      </div>
    </div>
  );
}
