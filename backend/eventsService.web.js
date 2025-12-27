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
            /** 
             * Using bracket notation for metadata properties
             * to bypass strict but incomplete Wix IDE type checks.
             * This avoids the "Property doesn't exist" errors in Velo.
             */
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
                registrationType: registration['type'] || "RSVP",
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
        const result = await elevatedQueryTicketDefinitions({
            filter: { "eventId": { "$eq": eventId } }
        });

        // Safety check for the expected array property using bracket notation
        return result['ticketDefinitions'] || [];
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
        /**
         * Updated to match CreateReservationOptions from documentation:
         * options: {
         *   ticketQuantities: [{ ticketDefinitionId, quantity }]
         * }
         */
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
        throw new Error("Unable to reserve tickets.");
    }
});

/**
 * Creates an RSVP using wix-events.v2.
 */
export const createEventRSVP = webMethod(Permissions.Anyone, async (eventId, guestDetails) => {
    try {
        /**
         * Updated to match single-argument Rsvp object from documentation:
         * createRsvp(rsvp: Rsvp)
         * Rsvp object contains eventId, firstName, lastName, email, status.
         */
        const rsvpObject = {
            eventId: eventId,
            firstName: guestDetails.firstName,
            lastName: guestDetails.lastName,
            email: guestDetails.email,
            status: "YES"
        };

        const response = await elevatedCreateRsvp(rsvpObject);
        return response;
    } catch (error) {
        console.error("Failed to create RSVP:", error);
        throw new Error("Unable to confirm RSVP.");
    }
});