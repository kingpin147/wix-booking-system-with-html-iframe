import { Permissions, webMethod } from 'wix-web-module';
import { orders, rsvp, ticketDefinitions, tickets } from 'wix-events.v2';
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

            console.log(`Backend: Event "${event.title}" status: ${status}, registrationType: ${registration['type']}`);

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
 * Fetches ticket definitions for a specific event using manual filtering.
 * Use this to get the PRODUCTS available for sale.
 */
export const getEventTickets = webMethod(Permissions.Anyone, async (eventId) => {
    try {
        console.log("Backend: Fetching tickets for eventId:", eventId);

        // Fetch all ticket definitions (limit 100) to ensure we get everything.
        // We use queryTicketDefinitions so we get products (definitions), not purchased tickets.
        const elevatedGetAll = elevate(async () => {
            return await ticketDefinitions.queryTicketDefinitions().limit(100).find();
        });

        const result = await elevatedGetAll();
        // @ts-ignore
        const allTickets = result.definitions || result.items || [];

        console.log(`Backend: Fetched ${allTickets.length} total definitions.`);
        if (allTickets.length > 0) {
            console.log("Backend: Sample Ticket[0]:", JSON.stringify(allTickets[0], null, 2));
            console.log("Backend: Available EventIDs:", allTickets.map(t => t.eventId).join(", "));
        }

        console.log("Backend: Filtering for Input EventId:", eventId);

        // Manually filter by eventId. using == for loose string comparison safety
        // @ts-ignore
        const eventTickets = allTickets.filter(t => t.eventId == eventId);

        console.log(`Backend: Found ${eventTickets.length} tickets for this event.`);

        return eventTickets;
    } catch (error) {
        console.error("Backend: getEventTickets failed", error);
        throw new Error("Unable to load tickets.");
    }
});

/**
 * Lists actually SOLD tickets (Attendees) for an event.
 * User requested this specific implementation with fieldsets.
 */
export const listSoldTickets = webMethod(Permissions.Anyone, async (eventId, options = {}) => {
    try {
        console.log("Backend: Listing SOLD tickets for eventId:", eventId);

        const elevatedList = elevate(tickets.listTickets);

        // Pass eventId as array as per V2 signature, and merge default options
        const result = await elevatedList([eventId], {
            limit: 100,
            // User requested "TICKETS" and "DETAILS" - mapping to valid V2 Enums
            fieldset: ['TICKET_DETAILS', 'GUEST_DETAILS'],
            ...options
        });

        console.log("Backend: Sold tickets result:", JSON.stringify(result));
        return result;
    } catch (error) {
        console.error("Backend: listSoldTickets failed", error);
        throw error;
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
        const elevatedRsvp = elevate(async (eId, guest) => {
            // "rsvp.email" error confirms we need the nested 'rsvp' key.
            // "options.eventId" error suggests we might need to pass eventId in a specific way.
            // We will provide the standard V2 structure: { rsvp: { eventId, ... } }
            // and assume the wrapper handles the permissions correctly.
            const rsvpInput = {
                rsvp: {
                    eventId: eId,
                    firstName: guest.firstName,
                    lastName: guest.lastName,
                    email: guest.email,
                    status: "YES"
                }
            };
            return await rsvp.createRsvp(rsvpInput);
        });

        const response = await elevatedRsvp(eventId, guestDetails);
        console.log("Backend: RSVP success:", JSON.stringify(response));
        return response;
    } catch (error) {
        console.error("Backend: createEventRSVP failed", error);
        throw new Error(`RSVP Error: ${error.message}`);
    }
});