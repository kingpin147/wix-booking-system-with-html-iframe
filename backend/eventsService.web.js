import { Permissions, webMethod } from 'wix-web-module';
import { orders, rsvp, ticketDefinitions } from 'wix-events.v2';
import { wixEvents } from 'wix-events-backend';
import { elevate } from 'wix-auth';

// Elevate V2 methods
const elevatedQueryTicketDefinitions = elevate(ticketDefinitions.queryTicketDefinitions);
const elevatedCreateReservation = elevate(orders.createReservation);
const elevatedCreateRsvp = elevate(rsvp.createRsvp);

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

export const getEventTickets = webMethod(Permissions.Anyone, async (eventId) => {
    try {
        console.log("Backend: Fetching tickets for eventId:", eventId);

        /**
         * Trying a broader query approach. 
         * Some V2 APIs prefer the simple filter object without $eq for IDs.
         */
        const result = await elevatedQueryTicketDefinitions({
            filter: { "eventId": eventId }
        });

        console.log("Backend: Ticket query result:", JSON.stringify(result));
        return result['ticketDefinitions'] || [];
    } catch (error) {
        console.error("Backend: getEventTickets failed", error);
        throw new Error("Unable to load tickets.");
    }
});

export const createEventReservation = webMethod(Permissions.Anyone, async (eventId, ticketSelection) => {
    try {
        console.log("Backend: Creating reservation for:", eventId);

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

export const createEventRSVP = webMethod(Permissions.Anyone, async (eventId, guestDetails) => {
    try {
        console.log("Backend: Creating RSVP for:", eventId, "Guest:", JSON.stringify(guestDetails));

        /**
         * Following the documentation exactly: createRsvp(rsvp, options)
         * rsvp: Rsvp object with eventId, firstName, lastName, email, status.
         */
        const rsvpData = {
            eventId: eventId,
            firstName: guestDetails.firstName,
            lastName: guestDetails.lastName,
            email: guestDetails.email,
            status: "YES"
        };

        console.log("Backend: Calling elevatedCreateRsvp with:", JSON.stringify(rsvpData));

        // Passing rsvpData as first arg, and empty options as second arg to be safe
        const response = await elevatedCreateRsvp(rsvpData, {});
        console.log("Backend: RSVP success:", JSON.stringify(response));
        return response;
    } catch (error) {
        console.error("Backend: createEventRSVP failed", error);
        throw new Error(`RSVP Error: ${error.message}`);
    }
});