import { getEvents } from "@/lib/storage";
import type { CalendarEvent } from "@/types";
/** Calendar source boundary: a future provider can replace the local implementation. */
export interface CalendarSource { getEvents(): CalendarEvent[] | Promise<CalendarEvent[]> }
export const localCalendar={getEvents} satisfies CalendarSource;
