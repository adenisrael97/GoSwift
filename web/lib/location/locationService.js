export class LocationError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = 'LocationError';
  }
}

const ERROR_MESSAGES = {
  unsupported: 'Geolocation is not supported in your browser',
  denied: 'Location permission denied. Enable it in browser settings to continue.',
  unavailable: 'Unable to determine your location. Please try again or enter your address manually.',
  timeout: 'Location request timed out. Please try again.',
};

export function requestCurrentPosition(options = {}) {
  const {
    enableHighAccuracy = true,
    maximumAge = 30_000,
    timeout = 12_000,
  } = options;

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new LocationError('unsupported', ERROR_MESSAGES.unsupported);
  }

  let watchId = null;
  let resolved = false;

  const promise = new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolved = true;
        resolve({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        });
      },
      (positionError) => {
        resolved = true;
        let code = 'unavailable';
        if (positionError.code === positionError.PERMISSION_DENIED) code = 'denied';
        else if (positionError.code === positionError.TIMEOUT) code = 'timeout';
        reject(new LocationError(code, ERROR_MESSAGES[code]));
      },
      { enableHighAccuracy, maximumAge, timeout },
    );
  });

  const cancel = () => {
    if (!resolved && watchId != null) {
      navigator.geolocation.clearWatch(watchId);
    }
  };

  return { promise, cancel };
}
