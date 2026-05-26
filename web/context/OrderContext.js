'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

/**
 * @typedef {object} OrderDraft
 * @property {string} pickup
 * @property {number|null} pickupLat
 * @property {number|null} pickupLng
 * @property {string} dropoff
 * @property {number|null} dropoffLat
 * @property {number|null} dropoffLng
 * @property {string|null} vehicle
 * @property {string} packageType
 * @property {number} weight
 * @property {string} note
 * @property {number} fareEstimate
 * @property {string} senderPhone
 * @property {string} receiverName
 * @property {string} receiverPhone
 * @property {string|null} idempotencyKey
 */

/**
 * @typedef {object} OrderContextValue
 * @property {OrderDraft} draft
 * @property {object|null} currentOrder
 * @property {boolean} isHydrated
 * @property {(patch: Partial<OrderDraft> | ((d: OrderDraft) => OrderDraft)) => void} updateDraft
 * @property {(v: string) => void} setPickup
 * @property {(v: string) => void} setDropoff
 * @property {(v: string|null) => void} setVehicle
 * @property {() => void} resetDraft
 * @property {(extra?: object) => void} confirmOrder
 * @property {() => void} clearCurrentOrder
 */

const DRAFT_KEY = 'goswift_order_draft';
const CURRENT_KEY = 'goswift_order_current';

/** @type {React.Context<OrderContextValue | null>} */
const OrderContext = createContext(null);

const initialDraft = {
  pickup: '',
  pickupLat: null,
  pickupLng: null,
  dropoff: '',
  dropoffLat: null,
  dropoffLng: null,
  vehicle: null,
  packageType: 'parcel',
  weight: 5,
  note: '',
  fareEstimate: 0,
  senderPhone: '',
  receiverName: '',
  receiverPhone: '',
  // Stable per-draft idempotency key. Generated once on hydration and
  // persisted with the rest of the draft, so a retried POST /api/orders
  // (network glitch, mobile backgrounded mid-request) returns the
  // original order instead of creating a duplicate.
  idempotencyKey: null,
};

// crypto.randomUUID is available in modern browsers + Node 19+. The
// checkout page is client-only so we can assume browser globals here.
function newIdempotencyKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback (no Web Crypto on very old browsers): timestamp + random.
  return `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

const INITIAL_STATE = {
  draft: initialDraft,
  currentOrder: null,
  isHydrated: false,
};

function readStorage(key) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  if (typeof window === 'undefined') return;
  if (value === null || value === undefined) {
    sessionStorage.removeItem(key);
    return;
  }
  sessionStorage.setItem(key, JSON.stringify(value));
}

export function OrderProvider({ children }) {
  // Single state shape so hydration is one setState call, not three —
  // avoids the cascading re-renders that react-hooks/set-state-in-effect
  // flags. SSR-safe because the initial value is constant; the first
  // client-side effect reads sessionStorage and commits one update.
  const [state, setState] = useState(INITIAL_STATE);
  const { draft, currentOrder, isHydrated } = state;

  useEffect(() => {
    // SSR hydration: server render uses INITIAL_STATE (sessionStorage
    // doesn't exist there), so we must read storage in an effect after
    // the first client paint to avoid hydration mismatches. The single
    // setState below is the canonical "sync from external storage"
    // pattern — react-hooks/set-state-in-effect flags any setState in
    // an effect, but this is the documented exception.
    const storedDraft   = readStorage(DRAFT_KEY);
    const storedCurrent = readStorage(CURRENT_KEY);

    // Backfill the idempotency key for legacy drafts persisted before
    // the field existed. New drafts get a key the first time they
    // hydrate; the persist below keeps it stable across reloads.
    const hydratedDraft = storedDraft
      ? { ...initialDraft, ...storedDraft }
      : { ...initialDraft };
    if (!hydratedDraft.idempotencyKey) {
      hydratedDraft.idempotencyKey = newIdempotencyKey();
      writeStorage(DRAFT_KEY, hydratedDraft);
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({
      draft:        hydratedDraft,
      currentOrder: storedCurrent ?? null,
      isHydrated:   true,
    });
  }, []);

  const updateDraft = useCallback((patch) => {
    setState((prev) => {
      const nextDraft = typeof patch === 'function'
        ? patch(prev.draft)
        : { ...prev.draft, ...patch };
      writeStorage(DRAFT_KEY, nextDraft);
      return { ...prev, draft: nextDraft };
    });
  }, []);

  const setPickup  = useCallback((pickup)  => updateDraft({ pickup }),  [updateDraft]);
  const setDropoff = useCallback((dropoff) => updateDraft({ dropoff }), [updateDraft]);
  const setVehicle = useCallback((vehicle) => updateDraft({ vehicle }), [updateDraft]);

  const resetDraft = useCallback(() => {
    writeStorage(DRAFT_KEY, null);
    // A new draft always gets a fresh idempotency key — different
    // logical order, different dedup namespace.
    setState((prev) => ({
      ...prev,
      draft: { ...initialDraft, idempotencyKey: newIdempotencyKey() },
    }));
  }, []);

  const confirmOrder = useCallback((extra = {}) => {
    setState((prev) => {
      const order = {
        ...prev.draft,
        ...extra,
        id: `ord_${Date.now().toString(36)}`,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      };
      writeStorage(CURRENT_KEY, order);
      writeStorage(DRAFT_KEY, null);
      return { ...prev, draft: initialDraft, currentOrder: order };
    });
  }, []);

  const clearCurrentOrder = useCallback(() => {
    writeStorage(CURRENT_KEY, null);
    setState((prev) => ({ ...prev, currentOrder: null }));
  }, []);

  const value = {
    draft,
    currentOrder,
    isHydrated,
    updateDraft,
    setPickup,
    setDropoff,
    setVehicle,
    resetDraft,
    confirmOrder,
    clearCurrentOrder,
  };

  return <OrderContext value={value}>{children}</OrderContext>;
}

/** @returns {OrderContextValue} */
export function useOrder() {
  const ctx = useContext(OrderContext);
  if (!ctx) {
    throw new Error('useOrder must be used within an <OrderProvider>');
  }
  return ctx;
}
