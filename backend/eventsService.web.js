import { Permissions, webMethod } from 'wix-web-module';
import { orders, rsvp, ticketDefinitions } from 'wix-events.v2';
import { wixEvents } from 'wix-events-backend';
import { elevate } from 'wix-auth';

// Elevate V2 methods that require it
const elevatedQueryTicketDefinitions = elevate(ticketDefinitions.queryTicketDefinitions);
const elevatedCreateReservation = elevate(orders.createReservation);
const elevatedCreateRsvp = elevate(rsvp.createRsvp);

/**
 * Fetches upcoming events for the calendar.
 * Uses wix-events-backend (V1) as it's more stable for general queries.
 */
export const listUpcomingEvents = webMethod(Permissions.Anyone, async () => {
    try {
        const results = await wixEvents.queryEvents()
            .eq("status", "SCHEDULED")
            .descending("scheduling.startDate")
            .find();

        return results.items.map(event => {
            // Safe property access for V1 WixEvent
            const scheduling = event.scheduling || {};
            const registration = event.registration || {};

            return {
                id: event._id,
                title: event.title,
                description: event.description,
                start: scheduling.startDate,
                end: scheduling.endDate,
                location: event.location?.name || "Online",
                slug: event.slug,
                registrationType: registration.type || "RSVP",
                mainImage: event.mainImage,
                // recurrence and categories might not be directly on WixEvent type in some environments
                // but usually available in the raw data if needed. For now, omitting to avoid TS errors.
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
            filter: { "eventId": eventId }
        });
        return result.ticketDefinitions;
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
        // Based on user snippet: orders.createReservation(eventId, options)
        const options = {
            lineItems: ticketSelection.map(item => ({
                catalogReference: {
                    catalogItemId: item.ticketId,
                    appId: "14563d33-9122-4a0b-9df2-9b2f34963503"
                },
                quantity: item.quantity
            }))
        };

        const reservation = await elevatedCreateReservation(eventId, options);
        return reservation;
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
        // Adjusting structure based on V2 requirements
        const response = await elevatedCreateRsvp(eventId, {
            guest: {
                contactDetails: {
                    firstName: guestDetails.firstName,
                    lastName: guestDetails.lastName,
                    email: guestDetails.email
                }
            },
            status: "YES"
        });
        return response;
    } catch (error) {
        console.error("Failed to create RSVP:", error);
        throw new Error("Unable to confirm RSVP.");
    }
});