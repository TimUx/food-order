import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouting } from '@/contexts/RoutingProvider';
import { api } from '@/services/api';
import type { Event, PublicEvent } from '@/types';
import { eventToPublicEvent, resolvePreferredStaffEventId } from '@/utils/eventSelection';
import { readScopedItem, writeScopedItem } from '@/utils/storageScope';

const STORAGE_KEY = 'staff_selected_event';

interface StaffEventContextValue {
  events: PublicEvent[];
  selectedEventId: string;
  setSelectedEventId: (eventId: string) => void;
  selectedEvent: PublicEvent | undefined;
  loading: boolean;
  error: string | null;
  isCashierOrderable: (eventId: string) => boolean;
  isPickupOrderable: (eventId: string) => boolean;
}

const StaffEventContext = createContext<StaffEventContextValue | null>(null);

export function StaffEventProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const { routing } = useRouting();
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [eventDetails, setEventDetails] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventIdState] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setSelectedEventId = useCallback((eventId: string) => {
    setSelectedEventIdState(eventId);
    if (routing.scope === 'tenant') {
      writeScopedItem(STORAGE_KEY, routing.scope, routing.tenantSlug, eventId);
    }
  }, [routing.scope, routing.tenantSlug]);

  useEffect(() => {
    if (!token) {
      setEvents([]);
      setEventDetails([]);
      setSelectedEventIdState('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    api.getEvents(token)
      .then((loadedEvents) => {
        setEventDetails(loadedEvents);
        const mapped = loadedEvents.map(eventToPublicEvent);
        setEvents(mapped);

        const stored = readScopedItem(STORAGE_KEY, routing.scope, routing.tenantSlug);
        const storedValid = stored && mapped.some((event) => event.id === stored);
        const nextId = storedValid ? stored! : resolvePreferredStaffEventId(loadedEvents);
        setSelectedEventIdState(nextId);
        if (nextId && routing.scope === 'tenant') {
          writeScopedItem(STORAGE_KEY, routing.scope, routing.tenantSlug, nextId);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Veranstaltungen konnten nicht geladen werden');
        setEvents([]);
        setEventDetails([]);
        setSelectedEventIdState('');
      })
      .finally(() => setLoading(false));
  }, [token, routing.scope, routing.tenantSlug]);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId),
    [events, selectedEventId]
  );

  const isCashierOrderable = useCallback(
    (eventId: string) => {
      const event = eventDetails.find((item) => item.id === eventId);
      return Boolean(event?.isActive && event.cashierActive && !event.ordersClosed);
    },
    [eventDetails]
  );

  const isPickupOrderable = useCallback(
    (eventId: string) => {
      const event = eventDetails.find((item) => item.id === eventId);
      return Boolean(event?.isActive && !event.ordersClosed);
    },
    [eventDetails]
  );

  const value = useMemo(
    () => ({
      events,
      selectedEventId,
      setSelectedEventId,
      selectedEvent,
      loading,
      error,
      isCashierOrderable,
      isPickupOrderable,
    }),
    [events, selectedEventId, setSelectedEventId, selectedEvent, loading, error, isCashierOrderable, isPickupOrderable]
  );

  return (
    <StaffEventContext.Provider value={value}>
      {children}
    </StaffEventContext.Provider>
  );
}

export function useStaffEvent(): StaffEventContextValue {
  const ctx = useContext(StaffEventContext);
  if (!ctx) {
    throw new Error('useStaffEvent muss innerhalb von StaffEventProvider verwendet werden');
  }
  return ctx;
}
