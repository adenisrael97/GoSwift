'use client';

import { Navigation, MapPin } from 'lucide-react';

import AddressAutocomplete from './AddressAutocomplete';

export default function LocationInput({
  pickup,
  dropoff,
  onPickupChange,
  onDropoffChange,
  onPickupSelect,
  onDropoffSelect,
  errors,
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
        <span className="w-1.5 h-5 bg-[#ff6b35] rounded-full" />
        Route Details
      </h2>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex gap-4">
          {/* Visual route connector */}
          <div className="flex flex-col items-center pt-8 shrink-0">
            <Navigation size={18} className="text-[#ff6b35]" />
            <div className="w-px h-10 border-l-2 border-dashed border-slate-200 my-1" />
            <MapPin size={18} className="text-emerald-500" />
          </div>

          <div className="flex-1 space-y-6">
            <AddressAutocomplete
              label="Pickup Location"
              value={pickup}
              placeholder="Enter pickup address..."
              error={errors.pickup}
              onChange={onPickupChange}
              onSelect={onPickupSelect}
            />

            <AddressAutocomplete
              label="Dropoff Location"
              value={dropoff}
              placeholder="Enter destination address..."
              error={errors.dropoff}
              onChange={onDropoffChange}
              onSelect={onDropoffSelect}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
