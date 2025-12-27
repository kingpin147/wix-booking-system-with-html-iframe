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

        // Diagnostic: What event matches this ID?
        const eventQuery = await wixEvents.queryEvents().eq("_id", eventId).find();
        if (eventQuery.items.length > 0) {
            console.log("Backend: Found event for ticket query:", eventQuery.items[0].title);
        } else {
            console.log("Backend: No event found with ID:", eventId);
        }

        /**
         * Re-trying the query with multiple variants to see what sticks.
         * I suspect the V2 API might be sensitive to the filter structure.
         */
        const result = await elevatedQueryTicketDefinitions({
            filter: { "eventId": eventId },
            paging: { limit: 10, offset: 0 }
        });

        console.log("Backend: V2 ticketDefinitions.query result:", JSON.stringify(result));

        // If definitions is empty but total > 0, something is wrong with paging or the API call.
        let definitions = result['ticketDefinitions'] || [];

        // Fallback: Try a different property if definitions is empty
        if (definitions.length === 0 && result['items']) {
            definitions = result['items'];
            console.log("Backend: Used 'items' fallback for tickets.");
        }

        console.log("Backend: Returning tickets count:", definitions.length);
        return definitions;
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