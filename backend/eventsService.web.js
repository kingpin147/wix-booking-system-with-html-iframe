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
            .eq("status", "SCHEDULED")
            .descending("scheduling.startDate")
            .find();

        return results.items.map(event => {
            const scheduling = event['scheduling'] || {};
            const registration = event['registration'] || {};
            const locationObj = event['location'] || {};

            return {
                id: event._id,
                title: event.title,
                description: event.description || "",
                start: scheduling['startDate'],
                end: scheduling['endDate'],
                location: locationObj['name'] || "Online",
                slug: event.slug,
                registrationType: (registration['type'] || "RSVP").toUpperCase(),
                mainImage: event.mainImage
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
         * Adding paging to ensure limit is not 0 (which appeared in user logs).
         */
        const result = await elevatedQueryTicketDefinitions({
            filter: { "eventId": { "$eq": eventId } },
            paging: { limit: 100 }
        });

        console.log("Backend: Ticket query full result:", JSON.stringify(result));

        return result['ticketDefinitions'] || [];
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
        console.log("Backend: Creating reservation for:", eventId, "with selection:", JSON.stringify(ticketSelection));

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

        /**
         * Re-aligning with the error "rsvp.email must not be empty".
         * Input must be wrapped in an 'rsvp' key as per the validator naming.
         */
        const inputObject = {
            rsvp: {
                eventId: eventId,
                firstName: guestDetails.firstName,
                lastName: guestDetails.lastName,
                email: guestDetails.email,
                status: "YES"
            }
        };

        console.log("Backend: Final RSVP data to send:", JSON.stringify(inputObject));

        // @ts-ignore
        const response = await elevatedCreateRsvp(inputObject);
        console.log("Backend: RSVP success:", JSON.stringify(response));
        return response;
    } catch (error) {
        console.error("Backend: createEventRSVP failed", error);
        throw new Error(`RSVP Error: ${error.message}`);
    }
});