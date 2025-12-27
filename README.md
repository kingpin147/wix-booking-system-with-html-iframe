# Wix Test Booking with HTML Iframe

This is a standalone booking system for Wix, utilizing a custom HTML iframe SPA for a premium user experience.

## Features
- **Multi-stage Flow**: Explore Events -> Select Date -> Book.
- **Wix Events V2 Integration**: High-performance backend using the latest Wix APIs.
- **Premium SPA Iframe**: Glassmorphism design with responsive search and calendar.

## Project Structure
- `backend/`: Velo backend modules (`eventsService.web.js`).
- `pages/`: Wix page code (`bookingPage.js`) and the custom SPA (`calendar.html`).
- `public/`: Shared frontend logic (`bookingCalendar.js`).

## Setup
1. Copy the backend code to your Wix backend.
2. Copy the page code to your Wix page.
3. Host the `calendar.html` in an HTML iframe named `#html1`.
