# VendorLink frontend

Plain HTML, CSS and JavaScript: no framework and no build step.
The site currently runs in **demo mode** on sample data, and is set up so Supabase can be connected later without redesigning any page.

## Running it

1. Open the `Frontend` folder in VS Code.
2. Right-click `index.html` and choose **Open with Live Server**.

A yellow **Demo mode** bar at the top of every page shows that the data is sample data. Changes you make (applying for a stall, approving a vendor, editing a profile) are kept only until you close the browser tab. **Reset demo data** in that bar restores the original sample data.

### Demo accounts

The login page has one-click buttons for these accounts. Passwords are not checked in demo mode.

| Role      | Email                              | Lands on                  |
|-----------|------------------------------------|---------------------------|
| Vendor    | `vendor@demo.vendorlink.co.za`     | `vendor-dashboard.html`   |
| Organizer | `organizer@demo.vendorlink.co.za`  | `organizer-dashboard.html`|
| Admin     | `admin@demo.vendorlink.co.za`      | `organizer-dashboard.html` (sees every event) |

You can also register a new vendor or organiser. The account lasts until the tab is closed, and no password is saved.

## How the code is organised

```
HTML page  →  js/pages/<page>.js  →  js/services/*.js  →  (demo data now / Supabase later)
```

| File | What it does |
|------|--------------|
| `css/style.css` | Shared design system: colours, buttons, forms, badges, event card, navbar, footer, modals, toasts, loading/empty/error states |
| `css/<page>.css` | Styles that only one page (or both dashboards) needs |
| `js/config.js` | `DEMO_MODE` switch and the (public) Supabase settings |
| `js/models.js` | UML enums (`Role`, `ApplicationStatus`, `EventStatus`), entity shapes, small shared rules |
| `js/mock-data.js` | **Sample data only**, shaped exactly like the UML, plus the demo "database" helpers |
| `js/services/auth.js` | Session, login, register, logout, forgot password, page guard (`requireRole`) |
| `js/services/events.js` | Events and categories: list, get by id, create, edit, cancel, homepage stats |
| `js/services/applications.js` | Apply, withdraw, list, approve/reject |
| `js/services/profiles.js` | VendorProfile and Organizer profiles |
| `js/services/notifications.js` | Notifications: list, mark as read |
| `js/ui.js` | Helpers: `escapeHtml`, formatting, `showToast`, `openModal`/`closeModal`, `confirmDialog`, loading/empty/error states, the event card |
| `js/layout.js` | The one navbar, footer, demo banner, notifications bell, user menu and dashboard tabs |
| `js/pages/*.js` | One script per page |

Pages never read data directly. For example, `browse.js` calls `getEvents()` and `getCategories()`, then `filterEvents()`, `sortEvents()` and `renderEvents()`.

## How it maps to the UML

| UML entity | Frontend | Used on |
|---|---|---|
| User (`id, fullName, email, phone, role`) | `auth.js` session + `users` | Navbar, login/register, dashboards |
| VendorProfile | `profiles.js` → `getMyVendorProfile()` | Vendor dashboard → Profile, application review |
| Organizer | `profiles.js` → `getMyOrganizerProfile()` | Organizer dashboard → Settings, event page "Organiser" box |
| Event | `events.js` | Home, Browse, Event Details, Organizer dashboard |
| Application | `applications.js` | Apply modal, both dashboards |
| Notification | `notifications.js` | Navbar bell, both dashboards |
| Category | `events.js` → `getCategories()` | Category pills, event cards, event form, vendor profile |

Assumptions taken from the diagram:
- `Event` links to the organiser's **User** (`organizerId`); their Organizer profile hangs off that User.
- `Application.vendorId` is the vendor's User id.
- `VendorProfile.category` is text (a category name), not a link.
- `Event.expectedVisitors` is text, and an event can have no category.
- `Notification.type` has no enum in the UML. The values used are in `NotificationType` in `models.js`.
- `availableStalls` = `totalStalls` − approved applications. Approving uses one stall, and approval is blocked at 0.

## Connecting Supabase (next steps)

1. **Create the tables:** `users`, `vendor_profiles`, `organizers`, `events`, `applications`, `notifications`, `categories`. Use the fields from the UML; the relationships are listed at the top of `js/models.js`.
2. **Load the Supabase client.** Add it before `config.js` on every page:
   `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>`
3. **Configure it.** In `config.js`, fill in `SUPABASE_URL` and the **anon** key (never the service_role key). Create the client once, below `APP_CONFIG`:
   `const supabaseClient = window.supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_ANON_KEY);`
   (the service comments call it `supabaseClient`).
4. **Fill in the services.** In each service function, replace the `throw backendNotConnected(...)` line with the query shown in its `// Supabase:` comment. Supabase columns are usually `snake_case` (`stall_fee`), while the frontend uses the UML's `camelCase` (`stallFee`). Either convert in the service, or alias the columns in `select()`.
5. **Switch off demo mode.** Set `DEMO_MODE: false`. The banner and demo login buttons disappear, and pages will show their error states for anything not connected yet.
6. **Move the rules into the database.** Anything in the browser can be bypassed:
   - **RLS policies:**
     - vendors can only see and change their own applications and profile;
     - organisers can only edit their own events and review applications for them;
     - drafts are visible only to their owner;
     - users can only read their own notifications;
     - nobody can make themselves ADMIN.
   - **One database function** for approve/reject that checks capacity and decrements `available_stalls` in the same transaction.
   - **Database triggers** to create notifications (application submitted/approved/rejected, event cancelled).
   - **Supabase Storage** for banner and profile images (the forms currently take an image link).

## Testing checklist

These were tested in a headless Chromium browser at 1440, 1180, 820 and 390 px widths:

- Every page has one `<!DOCTYPE>`, `<html>`, `<head>`, `<body>`, navbar, `<main>` and footer; there are no inline styles or inline scripts.
- No horizontal scrolling on any page at any width.
- Home: stats come from the data, category pills filter the list, the How-it-works tabs work, and the call to action changes when logged in.
- Browse:
  - search covers title, description, venue, city, province and category;
  - category, province, status, "stalls left" and max fee filters all work;
  - sorting returns to the original order;
  - Clear All restores the defaults;
  - there's a result count, an empty state, an error state, filters kept in the URL, and a folding filter panel on mobile.
- Event details:
  - loads by `?id=`, with "Event not found" for a missing, invalid or unknown id;
  - the Apply button changes for logged-out users, vendors, organisers, full, closed, cancelled and completed events;
  - the apply modal opens and closes (X, Cancel, backdrop, Escape) and validates its fields;
  - drafts are only visible to their owner.
- Login/Register: validation messages, forgot-password screen, demo accounts, role choice (`?role=`), redirect back to the previous page, external redirects blocked, no password stored.
- Dashboards:
  - logged-out users and the wrong role are redirected;
  - all tabs work, and the URL hash opens the right tab;
  - approve/reject with notes (blocked when an event is full);
  - create/edit event with validation, cancel event with a confirmation dialog;
  - CSV export, profile/settings save;
  - notifications mark as read, and the bell count updates.
- Security: HTML typed into forms is shown as text, not run. `javascript:` links are rejected.
- Images: broken banners fall back to `images/placeholder-event.svg` once, without looping.

## Files that can be removed

These are no longer used by any page. The originals are also in `_original-backup/`.

- `js/api.js`, `js/auth.js`, `js/browse.js`, `js/dashboard.js`, `js/event-details.js`, `js/home.js`: the old version's scripts, replaced by `js/services/` and `js/pages/`.
- `css/notifications.css`: merged into `style.css`.
- `images/about.png`, `hero.png`, `market1.png`–`market4.png`, `profile.png`: striped placeholder graphics that no page uses any more.
