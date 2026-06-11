'use client';

import { useEffect, useState } from 'react';

import LocationInput from './LocationInput';
import PackageDetails from './PackageDetails';
import SubmitButton from './SubmitButton';
import PickupCoordinatesSection from './PickupCoordinatesSection';
import { useOrder } from '@/context/OrderContext';
import { usePickupLocation } from '@/hooks/usePickupLocation';
import { computeFare } from '@/lib/pricing/vehicleRates';
import { usePricing } from '@/lib/pricing/usePricing';

/**
 * @param {object} props
 * @param {string} props.vehicleId — the vehicle picked on the dashboard/request page
 * @param {() => void} props.onSuccess
 */
export default function OrderForm({ vehicleId, onSuccess }) {
  const { draft, updateDraft } = useOrder();
  const pricing = usePricing();
  const { status: gpsStatus, coords: gpsCoords, error: gpsError, requestLocation } = usePickupLocation();

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const fareEstimate = computeFare(vehicleId, draft.weight, pricing);
  const isFormValid  = draft.pickup.trim() !== '' && draft.dropoff.trim() !== '';

  useEffect(() => {
    if (gpsStatus === 'success' && gpsCoords) {
      updateDraft({
        pickupLat: gpsCoords.lat,
        pickupLng: gpsCoords.lng,
      });
    }
  }, [gpsStatus, gpsCoords, updateDraft]);

  function setField(key, value) {
    updateDraft({ [key]: value });
  }

  function validate() {
    const next = {};
    if (!draft.pickup.trim()) next.pickup = 'Pickup location is required';
    if (!draft.dropoff.trim()) next.dropoff = 'Dropoff location is required';
    return next;
  }

  async function handleSubmit() {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);
    // Persist the final vehicle + fare snapshot so the receiver/checkout
    // pages have a consistent view, even if pricing reloads later.
    updateDraft({ vehicle: vehicleId, fareEstimate });
    setIsLoading(false);
    onSuccess();
  }

  return (
    <>
      <div className="space-y-8">
        <LocationInput
          pickup={draft.pickup}
          dropoff={draft.dropoff}
          onPickupChange={(v) => setField('pickup', v)}
          onDropoffChange={(v) => setField('dropoff', v)}
          // Picking an autocomplete suggestion captures coordinates too — this
          // is what lets auto-dispatch find the nearest driver for typed
          // addresses. Manual typing (above) only sets text, matching the
          // pre-geocoding behaviour and leaving any GPS pin intact.
          onPickupSelect={({ description, lat, lng }) =>
            updateDraft({ pickup: description, pickupLat: lat, pickupLng: lng })
          }
          onDropoffSelect={({ description, lat, lng }) =>
            updateDraft({ dropoff: description, dropoffLat: lat, dropoffLng: lng })
          }
          errors={errors}
        />

        <PickupCoordinatesSection
          status={gpsStatus}
          coords={gpsCoords}
          error={gpsError}
          onRequest={requestLocation}
        />

        <PackageDetails
          packageType={draft.packageType}
          weight={draft.weight}
          onPackageTypeChange={(v) => setField('packageType', v)}
          onWeightChange={(v) => setField('weight', v)}
        />

        {/* Special Instructions */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-[#ff6b35] rounded-full" />
            Special Instructions
            <span className="text-xs font-normal text-slate-400">(optional)</span>
          </h2>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <textarea
              value={draft.note}
              onChange={(e) => setField('note', e.target.value)}
              placeholder="Access codes, fragile items, special handling requirements..."
              rows={3}
              className="w-full text-sm text-slate-700 bg-transparent outline-none placeholder:text-slate-300 resize-none leading-relaxed"
            />
          </div>
        </section>
      </div>

      <SubmitButton
        isLoading={isLoading}
        isDisabled={!isFormValid}
        fareEstimate={fareEstimate}
        onSubmit={handleSubmit}
      />
    </>
  );
}
