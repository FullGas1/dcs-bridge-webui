// Ticket 02 (FEAT-ADAPTIVE-LAYOUT-AND-ZOOM): shared collapsed-height threshold, same for the
// editor and the result (see PRD's "A - dynamic collapsed height" decision) - a single source so
// the two areas' caps can never silently drift apart.
export const MAX_COLLAPSED_LINES = 30;
