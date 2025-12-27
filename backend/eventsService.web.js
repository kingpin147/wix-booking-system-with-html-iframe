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
 * Uses wix-events-backend (V1) because it provides a reliable search across all events.
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
                // Normalizing registration type casing
                registrationType: (registration['type'] || "RSVP").toUpperCase(),
                mainImage: event.mainImage
            };
        });
    } catch (error) {
        console.error("Failed to fetch events:", error);
        throw new Error("Unable to load events.");
    }
});

/**
 * Fetches ticket definitions for a specific event using wix-events.v2.
 */
export const getEventTickets = webMethod(Permissions.Anyone, async (eventId) => {
    try {
        console.log("Fetching tickets for event:", eventId);
        const result = await elevatedQueryTicketDefinitions({
            filter: { "eventId": { "$eq": eventId } }
        });

        const tickets = result['ticketDefinitions'] || [];
        console.log(`Found ${tickets.length} tickets.`);
        return tickets;
    } catch (error) {
        console.error("Failed to fetch tickets:", error);
        throw new Error("Unable to load tickets.");
    }
});

/**
 * Creates a ticket reservation using wix-events.v2.
 */
export const createEventReservation = webMethod(Permissions.Anyone, async (eventId, ticketSelection) => {
    try {
        const options = {
            ticketQuantities: ticketSelection.map((item) => ({
                ticketDefinitionId: item.ticketId,
                quantity: item.quantity
            }))
        };

        const result = await elevatedCreateReservation(eventId, options);
        return result;
    } catch (error) {
        console.error("Failed to create reservation:", error);
        throw new Error("Unable to reserve tickets. " + error.message);
    }
});

/**
 * Creates an RSVP using wix-events.v2.
 */
export const createEventRSVP = webMethod(Permissions.Anyone, async (eventId, guestDetails) => {
    try {
        /**
         * The error "rsvp.email must not be empty" suggests the API expects 
         * an object with an 'rsvp' property or specific nesting.
         * Let's follow the structure indicated by the error field paths.
         */
        const rsvpData = {
            eventId: eventId,
            firstName: guestDetails.firstName,
            lastName: guestDetails.lastName,
            email: guestDetails.email,
            status: "YES"
        };

        // Trying the structure suggested by the field violation error prefix "rsvp."
        const response = await elevatedCreateRsvp({ rsvp: rsvpData });
        return response;
    } catch (error) {
        console.error("Failed to create RSVP:", error);
        // Returning detailed error to the frontend for debugging
        throw new Error(`RSVP Error: ${error.message}`);
    }
});