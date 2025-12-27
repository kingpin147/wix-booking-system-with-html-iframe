import { Permissions, webMethod } from 'wix-web-module';
import { orders, rsvp, ticketDefinitions } from 'wix-events.v2';
import { wixEvents } from 'wix-events-backend';
import { elevate } from 'wix-auth';

// Elevate V2 methods to ensure they run with full permissions on backend
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

        // V2 Query structure
        const result = await elevatedQueryTicketDefinitions({
            filter: { "eventId": { "$eq": eventId } }
        });

        console.log("Backend: Raw ticket result:", JSON.stringify(result));

        // Return both definitions AND potential root-level arrays just in case
        return result['ticketDefinitions'] || result['items'] || result || [];
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
        console.log("Backend: Reservation success:", JSON.stringify(result));
        return result;
    } catch (error) {
        console.error("Backend: createEventReservation failed", error);
        throw new Error("Unable to reserve tickets. " + error.message);
    }
});

/**
 * Creates an RSVP.
 */
export const createEventRSVP = webMethod(Permissions.Anyone, async (eventId, guestDetails) => {
    try {
        console.log("Backend: Creating RSVP for:", eventId, "with guest:", JSON.stringify(guestDetails));

        /**
         * Re-evaluating the RSVP structure based on the error: "rsvp.email must not be empty".
         * This usually means the server expects a body like { "rsvp": { ... } }.
         * If elevatedCreateRsvp is a wrapper for a JSON RPC call, we might need a specific shape.
         */
        const rsvpData = {
            eventId: eventId,
            firstName: guestDetails.firstName,
            lastName: guestDetails.lastName,
            email: guestDetails.email,
            status: "YES"
        };

        // Most V2 APIs in Velo expect the object directly, but let's try the wrapped structure 
        // IF the validator is prefixing with 'rsvp.'
        // Actually, if I already tried that and it failed, I'll try the most standard 2nd arg approach if available.
        // But the docs show createRsvp(rsvp, options).

        console.log("Backend: Sending rsvpData:", JSON.stringify(rsvpData));

        // Try passing it as the first argument directly, as per docs
        const response = await elevatedCreateRsvp(rsvpData);
        console.log("Backend: RSVP success:", JSON.stringify(response));
        return response;
    } catch (error) {
        console.error("Backend: createEventRSVP failed", error);
        throw new Error(`RSVP Error: ${error.message}`);
    }
});