import { listUpcomingEvents, getEventTickets, createEventReservation, createEventRSVP } from 'backend/eventsService.web';
import wixLocation from 'wix-location';

let allEvents = [];

$w.onReady(async function () {
    await loadEvents();

    // Setup communication with the custom calendar iframe (#html1)
    $w("#html1").onMessage(async (event) => {
        const data = event.data;

        if (data.type === 'READY') {
            console.log("Calendar iframe ready, sending events...");
            $w("#html1").postMessage({
                type: 'SET_RAW_EVENTS',
                payload: allEvents
            });
        }

        if (data.type === 'GET_TICKETS') {
            const ticketDefinitions = await getEventTickets(data.payload.eventId);
            $w("#html1").postMessage({
                type: 'SET_TICKETS',
                payload: {
                    eventId: data.payload.eventId,
                    tickets: ticketDefinitions
                }
            });
        }

        if (data.type === 'CREATE_RESERVATION') {
            try {
                const reservation = await createEventReservation(data.payload.eventId, data.payload.ticketSelection);
                $w("#html1").postMessage({ type: 'RESERVATION_CREATED', payload: reservation });
            } catch (err) {
                $w("#html1").postMessage({ type: 'ERROR', payload: err.message });
            }
        }

        if (data.type === 'CREATE_RSVP') {
            try {
                const response = await createEventRSVP(data.payload.eventId, data.payload.guestDetails);
                $w("#html1").postMessage({ type: 'RSVP_CREATED', payload: response });
            } catch (err) {
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
    } catch (err) {
        console.error("Failed to load events:", err);
    }
}
