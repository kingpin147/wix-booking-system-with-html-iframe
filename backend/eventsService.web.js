import { Permissions, webMethod } from 'wix-web-module';
import { orders, rsvp, ticketDefinitions } from 'wix-events.v2';
import { wixEvents } from 'wix-events-backend';
import { elevate } from 'wix-auth';

// Elevate V2 methods
const elevatedQueryTicketDefinitions = elevate(ticketDefinitions.queryTicketDefinitions);
const elevatedCreateReservation = elevate(orders.createReservation);
const elevatedCreateRsvp = elevate(rsvp.createRsvp);

/**
 * Fetches upcoming events for the calendar.
 */
export const listUpcomingEvents = webMethod(Permissions.Anyone, async () => {
    try {
        const results = await wixEvents.queryEvents()
            // Try querying all events first to see if status filtering is hiding "Music Festival"
            .descending("scheduling.startDate")
            .find();

        console.log("Backend: Found", results.items.length, "total events.");

        return results.items.map(event => {
            const scheduling = event['scheduling'] || {};
            const registration = event['registration'] || {};
            const locationObj = event['location'] || {};
            const status = event['status'];

            console.log(`Backend: Event "${event.title}" status: ${status}, registrationType: ${registration.type}`);

            return {
                id: event._id,
                title: event.title,
                description: event.description || "",
                start: scheduling['startDate'],
                end: scheduling['endDate'],
                location: locationObj['name'] || "Online",
                slug: event.slug,
                // Normalized to Uppercase
                registrationType: (registration['type'] || "RSVP").toUpperCase(),
                mainImage: event.mainImage,
                status: status
            };
        });
    } catch (error) {
        console.error("Backend: listUpcomingEvents failed", error);
        throw new Error("Unable to load events.");
    }
});

/**
 * Fetches ticket definitions for a specific event.
 */
export const getEventTickets = webMethod(Permissions.Anyone, async (eventId) => {
    try {
        console.log("Backend: Fetching tickets for eventId:", eventId);

        /**
         * The previous log showed "total: 1" but "definitions: []".
         * This can happen if the query defaults to a paging structure that hides results.
         * Or if the event has tickets but they are technically 'private' or 'archived'.
         * We'll try a very broad query.
         */
        const result = await elevatedQueryTicketDefinitions({
            filter: { "eventId": eventId },
            paging: { limit: 50, offset: 0 }
        });

        console.log("Backend: V2 ticket query result structure:", JSON.stringify(result));

        // Return definitions; fallback to results.items if definitions is missing
        let tickets = result['ticketDefinitions'] || result['items'] || [];

        /**
         * If still empty, try querying the V1/Velo backend tickets as fallback 
         * (though V2 is preferred).
         */
        if (tickets.length === 0) {
            console.log("Backend: No tickets found in V2, check dashboard configuration.");
        }

        return tickets;
    } catch (error) {
        console.error("Backend: getEventTickets failed", error);
        throw new Error("Unable to load tickets.");
    }
});

/**
 * Creates a ticket reservation.
 */
export const createEventReservation = webMethod(Permissions.Anyone, async (eventId, ticketSelection) => {
    try {
        console.log("Backend: Creating reservation for:", eventId, "Selection:", JSON.stringify(ticketSelection));

        const options = {
            ticketQuantities: ticketSelection.map((item) => ({
                ticketDefinitionId: item.ticketId,
                quantity: item.quantity
            }))
        };

        const result = await elevatedCreateReservation(eventId, options);
        return result;
    } catch (error) {
        console.error("Backend: createEventReservation failed", error);
        throw new Error("Reservation Error: " + error.message);
    }
});

/**
 * Creates an RSVP.
 */
export const createEventRSVP = webMethod(Permissions.Anyone, async (eventId, guestDetails) => {
    try {
        console.log("Backend: Creating RSVP for:", eventId, "Guest:", JSON.stringify(guestDetails));

        const inputObject = {
            rsvp: {
                eventId: eventId,
                firstName: guestDetails.firstName,
                lastName: guestDetails.lastName,
                email: guestDetails.email,
                status: "YES"
            }
        };

        // @ts-ignore
        const response = await elevatedCreateRsvp(inputObject);
        console.log("Backend: RSVP success:", JSON.stringify(response));
        return response;
    } catch (error) {
        console.error("Backend: createEventRSVP failed", error);
        throw new Error(`RSVP Error: ${error.message}`);
    }
});