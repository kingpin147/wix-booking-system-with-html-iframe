import { listUpcomingEvents, getEventTickets, createEventReservation, createEventRSVP } from 'backend/eventsService.web';
import wixLocation from 'wix-location';

let allEvents = [];

$w.onReady(async function () {
    console.log("Page: Loading events...");
    await loadEvents();

    // Setup communication with the custom calendar iframe (#html1)
    $w("#html1").onMessage(async (event) => {
        const data = event.data;
        console.log("Page: Received message from iframe:", data.type, data.payload);

        if (data.type === 'READY') {
            console.log("Page: Sending events to iframe...");
            $w("#html1").postMessage({
                type: 'SET_RAW_EVENTS',
                payload: allEvents
            });
        }

        if (data.type === 'GET_TICKETS') {
            try {
                console.log("Page: Fetching tickets for:", data.payload.eventId);
                const ticketDefinitions = await getEventTickets(data.payload.eventId);
                console.log("Page: Tickets received:", ticketDefinitions);
                $w("#html1").postMessage({
                    type: 'SET_TICKETS',
                    payload: {
                        eventId: data.payload.eventId,
                        tickets: ticketDefinitions
                    }
                });
            } catch (err) {
                console.error("Page: Failed to get tickets:", err);
                $w("#html1").postMessage({ type: 'ERROR', payload: "Failed to load tickets." });
            }
        }

        if (data.type === 'CREATE_RESERVATION') {
            try {
                console.log("Page: Creating reservation...");
                const reservation = await createEventReservation(data.payload.eventId, data.payload.ticketSelection);
                $w("#html1").postMessage({ type: 'RESERVATION_CREATED', payload: reservation });
            } catch (err) {
                console.error("Page: Reservation failed:", err);
                $w("#html1").postMessage({ type: 'ERROR', payload: err.message });
            }
        }

        if (data.type === 'CREATE_RSVP') {
            try {
                console.log("Page: Creating RSVP...");
                const response = await createEventRSVP(data.payload.eventId, data.payload.guestDetails);
                $w("#html1").postMessage({ type: 'RSVP_CREATED', payload: response });
            } catch (err) {
                console.error("Page: RSVP failed:", err);
                $w("#html1").postMessage({ type: 'ERROR', payload: err.message });
            }
        }

        if (data.type === 'REDIRECT_TO_EVENT') {
            wixLocation.to(`/event-details/${data.payload.slug}`);
        }
    });
});

async function loadEvents() {
    try {
        allEvents = await listUpcomingEvents();
        console.log("Page: Loaded", allEvents.length, "events.");
    } catch (err) {
        console.error("Page: Failed to load events:", err);
    }
}
