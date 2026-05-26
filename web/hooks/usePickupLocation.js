'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { requestCurrentPosition } from '@/lib/location/locationService';

export function usePickupLocation() {
  const [status, setStatus] = useState('idle');
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState(null);

  const requestInFlightRef = useRef(false);
  const cancelRef = useRef(null);

  const requestLocation = useCallback(async () => {
    if (requestInFlightRef.current) return;

    requestInFlightRef.current = true;
    setStatus('requesting');
    setError(null);

    try {
      const { promise, cancel } = requestCurrentPosition();
      cancelRef.current = cancel;

      const result = await promise;
      setCoords(result);
      setStatus('success');
    } catch (err) {
      setError(err);
      setStatus('error');
    } finally {
      requestInFlightRef.current = false;
      cancelRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (cancelRef.current) {
        cancelRef.current();
      }
    };
  }, []);

  return { status, coords, error, requestLocation };
}
