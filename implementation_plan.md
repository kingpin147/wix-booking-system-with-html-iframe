# Implementation Plan - Custom Wix Events Booking Calendar

This plan outlines the creation of a custom booking calendar widget that integrates with the Wix Events app, supporting both ticketed and ticketless (RSVP) events.

## Proposed Changes

### Backend Service
Create a centralized backend service to interact with the Wix Events V2 API.

#### [NEW] [eventsService.web.js](backend/eventsService.web.js)
- `listUpcomingEvents()`: Fetches upcoming events from Wix Events.
- `createEventReservation(eventId, tickets)`: Handles ticket reservations for ticketed events.
- `createEventRSVP(eventId, guestDetails)`: Handles RSVPs for ticketless events.
- `getEventDetails(eventId)`: Fetches details for a specific event.

### Frontend Logic
Create a reusable frontend script to drive the calendar UI.

#### [NEW] [bookingCalendar.js](public/bookingCalendar.js)
- `initCalendar(containerId)`: Initializes the calendar UI.
- `renderEvents(events)`: Renders event markers on the calendar.
- `handleDateSelection(date)`: Shows events for a specific date.
- `handleBooking(eventId)`: Initiates the booking flow based on event type.

#### [NEW] [pageCode.js](pages/bookingPage.js)
- Glue code for the Wix Page to connect the backend service and frontend calendar logic.

## Verification Plan

### Automated Tests
- I will create a test script `test/verifyEvents.js` to mock backend calls and verify the logic of `eventsService.web.js`.

### Manual Verification
1. Deploy the code to a Wix site.
2. Verify that upcoming events are correctly displayed on the calendar.
3. Test the "RSVP" flow for a ticketless event.
4. Test the "Ticket Selection" flow for a ticketed event and ensure it redirects to the Wix Checkout.
