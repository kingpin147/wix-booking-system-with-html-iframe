/**
 * Utility functions for the custom booking calendar UI.
 */

/**
 * Groups events by date for easy calendar lookup.
 * @param {Array} events 
 * @returns {Object} Map of date string to events array.
 */
export function groupEventsByDate(events) {
    return events.reduce((acc, event) => {
        const dateKey = new Date(event.start).toDateString();
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(event);
        return acc;
    }, {});
}

/**
 * Returns a list of dates for a given month/year to render the calendar grid.
 * @param {number} month 0-indexed
 * @param {number} year 
 */
export function getCalendarDays(month, year) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Padding for days from previous month
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
        days.push({
            date: new Date(year, month, -i),
            isCurrentMonth: false
        });
    }

    // Days for current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
        days.push({
            date: new Date(year, month, i),
            isCurrentMonth: true
        });
    }

    return days;
}

/**
 * Formats event display for the calendar.
 * @param {Object} event 
 */
export function formatEventForDisplay(event) {
    return {
        ...event,
        formattedTime: new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        typeLabel: event.registrationType === "TICKETS" ? "Tickets Required" : "Free RSVP"
    };
}