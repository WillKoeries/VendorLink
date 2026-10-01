/**
 * ============================================================
 *  DEMO / MOCK DATA — NOT REAL
 * ============================================================
 * Sample records shaped exactly like the UML entities, used only while
 * APP_CONFIG.DEMO_MODE is true. The pages never read this file directly:
 * they call the functions in js/services/, which read it for now and will
 * read Supabase later.
 *
 * Event dates are worked out relative to today so the demo never goes stale.
 * No passwords are stored anywhere (demo sign-in is explained in services/auth.js).
 */

// ---------- Date helpers for the sample data ----------
function demoDate(daysFromToday) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

function demoDateTime(daysAgo, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
}

const DEMO_IMAGES = {
  foodMarket: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
  foodTrucks: 'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?auto=format&fit=crop&w=1200&q=80',
  crafts: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=80',
  nightMarket: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
  produce: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1200&q=80',
  fashion: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=1200&q=80',
  community: 'https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?auto=format&fit=crop&w=1200&q=80',
  lights: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80'
};

// ---------- Users (UML: User) ----------
// The three "demo" accounts can be used on the login page.
const MOCK_USERS = [
  { id: 1, fullName: 'Lisa van Wyk', email: 'vendor@demo.vendorlink.co.za', phone: '+27 82 555 0101', role: 'VENDOR' },
  { id: 2, fullName: 'Sipho Sithole', email: 'sipho@kasibraai.demo', phone: '+27 83 555 0102', role: 'VENDOR' },
  { id: 3, fullName: 'Nandi Mthembu', email: 'nandi@vintagethreads.demo', phone: '+27 72 555 0103', role: 'VENDOR' },
  { id: 4, fullName: 'Pieter de Villiers', email: 'pieter@capeolives.demo', phone: '+27 84 555 0104', role: 'VENDOR' },
  { id: 5, fullName: 'Ayesha Patel', email: 'ayesha@durbanspice.demo', phone: '+27 81 555 0105', role: 'VENDOR' },
  { id: 6, fullName: 'Zanele Dlamini', email: 'zanele@zulubeadwork.demo', phone: '+27 76 555 0106', role: 'VENDOR' },
  { id: 7, fullName: 'Johan Botha', email: 'johan@karooleather.demo', phone: '+27 82 555 0107', role: 'VENDOR' },
  { id: 8, fullName: 'Tebogo Mokoena', email: 'tebogo@sneakerlab.demo', phone: '+27 73 555 0108', role: 'VENDOR' },
  { id: 9, fullName: 'Ruth Jacobs', email: 'ruth@fynbosbotanicals.demo', phone: '+27 79 555 0109', role: 'VENDOR' },
  { id: 10, fullName: 'Kyle Naidoo', email: 'kyle@pixelpop.demo', phone: '+27 74 555 0110', role: 'VENDOR' },
  { id: 101, fullName: 'Megan Adams', email: 'organizer@demo.vendorlink.co.za', phone: '+27 21 555 0123', role: 'ORGANIZER' },
  { id: 102, fullName: 'Thabo Molefe', email: 'thabo@gautengstreetfood.demo', phone: '+27 11 555 0124', role: 'ORGANIZER' },
  { id: 103, fullName: 'Kavitha Naidoo', email: 'kavitha@coastalmakers.demo', phone: '+27 31 555 0125', role: 'ORGANIZER' },
  { id: 201, fullName: 'VendorLink Admin', email: 'admin@demo.vendorlink.co.za', phone: '', role: 'ADMIN' }
];

// ---------- Categories (UML: Category) ----------
// iconUrl is empty in the demo, so the UI falls back to a Font Awesome icon.
const MOCK_CATEGORIES = [
  { id: 1, name: 'Food & Street Eats', description: 'Street food, coffee, baking and food trucks.', iconUrl: '' },
  { id: 2, name: 'Arts & Crafts', description: 'Handmade goods, beadwork, ceramics and art.', iconUrl: '' },
  { id: 3, name: 'Fashion & Vintage', description: 'Clothing, thrift, sneakers and accessories.', iconUrl: '' },
  { id: 4, name: 'Farmers & Produce', description: 'Fresh produce, olives, honey and deli goods.', iconUrl: '' },
  { id: 5, name: 'Night Markets', description: 'Evening markets with music and street food.', iconUrl: '' },
  { id: 6, name: 'Health & Beauty', description: 'Natural skincare, wellness and body products.', iconUrl: '' },
  { id: 7, name: 'Tech & Pop-Ups', description: 'Design, print and tech pop-up expos.', iconUrl: '' }
];

// ---------- Vendor profiles (UML: VendorProfile) ----------
const MOCK_VENDOR_PROFILES = [
  { id: 1, userId: 1, businessName: "Lisa's Artisan Coffee", description: 'Small-batch roasted coffee, cold brew and home-made rusks from a converted Land Rover.', category: 'Food & Street Eats', phone: '+27 82 555 0101', website: 'https://example.com/lisas-coffee', city: 'Cape Town', province: 'Western Cape', address: '14 Bree Street, Cape Town', profileImageUrl: '' },
  { id: 2, userId: 2, businessName: 'Kasi Braai Express', description: 'Shisa nyama plates, boerewors rolls and chakalaka, cooked to order.', category: 'Food & Street Eats', phone: '+27 83 555 0102', website: '', city: 'Soweto', province: 'Gauteng', address: 'Vilakazi Street, Orlando West', profileImageUrl: '' },
  { id: 3, userId: 3, businessName: "Mama's Vintage Threads", description: 'Curated vintage denim, shweshwe pieces and upcycled jackets.', category: 'Fashion & Vintage', phone: '+27 72 555 0103', website: 'https://example.com/vintage-threads', city: 'Johannesburg', province: 'Gauteng', address: '5 Fox Street, Maboneng', profileImageUrl: '' },
  { id: 4, userId: 4, businessName: 'Cape Olive Groves', description: 'Cold-pressed olive oil, tapenades and marinated olives from our Paarl farm.', category: 'Farmers & Produce', phone: '+27 84 555 0104', website: 'https://example.com/cape-olives', city: 'Paarl', province: 'Western Cape', address: 'Groenfontein Farm, Paarl', profileImageUrl: '' },
  { id: 5, userId: 5, businessName: 'Durban Spice Co.', description: 'Bunny chows, masala blends and spice kits from a family recipe book.', category: 'Food & Street Eats', phone: '+27 81 555 0105', website: '', city: 'Durban', province: 'KwaZulu-Natal', address: 'Grey Street, Durban Central', profileImageUrl: '' },
  { id: 6, userId: 6, businessName: 'Zulu Beadwork & Gems', description: 'Hand-beaded jewellery and décor made by a women-led collective.', category: 'Arts & Crafts', phone: '+27 76 555 0106', website: '', city: 'Pietermaritzburg', province: 'KwaZulu-Natal', address: 'Church Street, Pietermaritzburg', profileImageUrl: '' },
  { id: 7, userId: 7, businessName: 'Karoo Leather Works', description: 'Hand-stitched leather bags, belts and veldskoene.', category: 'Arts & Crafts', phone: '+27 82 555 0107', website: 'https://example.com/karoo-leather', city: 'Graaff-Reinet', province: 'Eastern Cape', address: 'Church Street, Graaff-Reinet', profileImageUrl: '' },
  { id: 8, userId: 8, businessName: 'Soweto Sneaker Lab', description: 'Custom-painted sneakers and sneaker cleaning while you wait.', category: 'Fashion & Vintage', phone: '+27 73 555 0108', website: '', city: 'Soweto', province: 'Gauteng', address: 'Maponya Mall, Soweto', profileImageUrl: '' },
  { id: 9, userId: 9, businessName: 'Fynbos Botanicals', description: 'Natural soaps, balms and candles made with Cape fynbos.', category: 'Health & Beauty', phone: '+27 79 555 0109', website: 'https://example.com/fynbos', city: 'Stellenbosch', province: 'Western Cape', address: 'Dorp Street, Stellenbosch', profileImageUrl: '' },
  { id: 10, userId: 10, businessName: 'PixelPop Prints', description: 'Local illustration prints, stickers and on-the-spot laser engraving.', category: 'Tech & Pop-Ups', phone: '+27 74 555 0110', website: 'https://example.com/pixelpop', city: 'Durban', province: 'KwaZulu-Natal', address: 'Station Drive, Durban', profileImageUrl: '' }
];

// ---------- Organizer profiles (UML: Organizer) ----------
const MOCK_ORGANIZERS = [
  { id: 1, userId: 101, organizationName: 'Cape Markets & Festivals Co.', description: 'We run weekend food and craft markets across the Western Cape.', phone: '+27 21 555 0123', website: 'https://example.com/cape-markets', address: '12 Loop Street, Cape Town' },
  { id: 2, userId: 102, organizationName: 'Gauteng Street Food Collective', description: 'Night markets and food festivals in Johannesburg and Pretoria.', phone: '+27 11 555 0124', website: 'https://example.com/gauteng-street-food', address: '44 Stanley Avenue, Johannesburg' },
  { id: 3, userId: 103, organizationName: 'Coastal Makers Network', description: 'Maker and craft markets along the KZN and Eastern Cape coast.', phone: '+27 31 555 0125', website: '', address: '8 Lighthouse Road, Umhlanga' }
];

// ---------- Events (UML: Event) ----------
// organizerId is the organiser's User id. availableStalls = totalStalls − approved applications.
const MOCK_EVENTS = [
  {
    id: 1, organizerId: 101, categoryId: 1,
    title: 'Cape Town Summer Market',
    description: 'A weekend of street food, local makers and live acoustic music on the lawns of Green Point Park. Expect families, tourists and a strong lunchtime crowd.\n\nStalls are laid out in a loop around the central lawn, with food trucks along the park road.',
    date: demoDate(18), endDate: demoDate(19), time: '09:00 – 18:00',
    location: 'Green Point Park, Bay Road', city: 'Cape Town', province: 'Western Cape',
    stallFee: 250, totalStalls: 10, availableStalls: 5, expectedVisitors: '4,500+',
    requirements: 'Valid CIPC registration if trading as a company\nFood vendors need a Certificate of Acceptability (CoA)\nBring your own 3m x 3m gazebo with weights\nSet-up from 06:30, trading ready by 08:30',
    bannerImageUrl: DEMO_IMAGES.foodMarket, status: 'OPEN'
  },
  {
    id: 2, organizerId: 102, categoryId: 1,
    title: 'Joburg Street Food Carnival',
    description: 'Johannesburg’s favourite food-truck night returns to Rosebank with DJs, craft beer and more than thirty food bays.',
    date: demoDate(25), endDate: '', time: '11:00 – 22:00',
    location: 'Rosebank Mall rooftop', city: 'Johannesburg', province: 'Gauteng',
    stallFee: 450, totalStalls: 8, availableStalls: 2, expectedVisitors: '6,000',
    requirements: 'Food trucks and trailers only\nCertificate of Acceptability required\nGas bottles must be inspected on arrival',
    bannerImageUrl: DEMO_IMAGES.foodTrucks, status: 'OPEN'
  },
  {
    id: 3, organizerId: 103, categoryId: 2,
    title: 'Umhlanga Artisan & Craft Fair',
    description: 'A seaside craft fair on the Umhlanga promenade showcasing beadwork, ceramics, leather and art from KwaZulu-Natal makers.',
    date: demoDate(32), endDate: '', time: '09:00 – 16:00',
    location: 'Umhlanga Promenade', city: 'Durban', province: 'KwaZulu-Natal',
    stallFee: 180, totalStalls: 6, availableStalls: 0, expectedVisitors: '3,000',
    requirements: 'Handmade products only\nOne 2m x 1m table and two chairs provided',
    bannerImageUrl: DEMO_IMAGES.crafts, status: 'OPEN'
  },
  {
    id: 4, organizerId: 102, categoryId: 5,
    title: 'Pretoria Twilight Fest',
    description: 'An evening market under fairy lights with live bands, street food and late-night shopping in the Menlyn courtyard.',
    date: demoDate(40), endDate: '', time: '16:00 – 23:00',
    location: 'Menlyn Courtyard', city: 'Pretoria', province: 'Gauteng',
    stallFee: 320, totalStalls: 12, availableStalls: 10, expectedVisitors: '5,500',
    requirements: 'Stalls must have their own lighting\nNo amplified music at individual stalls',
    bannerImageUrl: DEMO_IMAGES.nightMarket, status: 'OPEN'
  },
  {
    id: 5, organizerId: 101, categoryId: 4,
    title: 'Stellenbosch Fresh Valley Market',
    description: 'A relaxed farmers’ market on a wine estate: fresh produce, cheese, bread, olive oil and flowers, with picnic spots for shoppers.',
    date: demoDate(9), endDate: '', time: '08:00 – 14:00',
    location: 'Blaauwklippen Estate, R44', city: 'Stellenbosch', province: 'Western Cape',
    stallFee: 150, totalStalls: 8, availableStalls: 5, expectedVisitors: '2,800',
    requirements: 'Produce must be grown or made by the vendor\nNo single-use plastic bags',
    bannerImageUrl: DEMO_IMAGES.produce, status: 'OPEN'
  },
  {
    id: 6, organizerId: 102, categoryId: 3,
    title: 'Maboneng Vintage & Thrift Fair',
    description: 'Vintage clothing, sneakers and second-hand treasures in a converted Maboneng warehouse.',
    date: demoDate(14), endDate: '', time: '10:00 – 18:00',
    location: 'Fox Street warehouse, Maboneng', city: 'Johannesburg', province: 'Gauteng',
    stallFee: 280, totalStalls: 6, availableStalls: 3, expectedVisitors: '4,000',
    requirements: 'Clothing rails provided\nNo new mass-produced stock',
    bannerImageUrl: DEMO_IMAGES.fashion, status: 'CLOSED'
  },
  {
    id: 7, organizerId: 103, categoryId: 2,
    title: 'Gqeberha Beachfront Makers Market',
    description: 'Monthly makers market on the Hobie Beach boardwalk with local crafts, art and coffee.',
    date: demoDate(47), endDate: '', time: '09:00 – 15:00',
    location: 'Hobie Beach boardwalk', city: 'Gqeberha', province: 'Eastern Cape',
    stallFee: 200, totalStalls: 14, availableStalls: 13, expectedVisitors: '3,500',
    requirements: 'Handmade or locally designed goods\nWind-proof displays recommended',
    bannerImageUrl: DEMO_IMAGES.community, status: 'OPEN'
  },
  {
    id: 8, organizerId: 103, categoryId: 5,
    title: 'Durban Spice Route Night Market',
    description: 'A night market celebrating Durban’s food heritage: curries, bunny chows, sweet treats and live music.',
    date: demoDate(55), endDate: '', time: '17:00 – 22:30',
    location: 'Durban Station Drive precinct', city: 'Durban', province: 'KwaZulu-Natal',
    stallFee: 300, totalStalls: 10, availableStalls: 9, expectedVisitors: '5,000',
    requirements: 'Food vendors need a Certificate of Acceptability\nOwn lighting required',
    bannerImageUrl: DEMO_IMAGES.lights, status: 'OPEN'
  },
  {
    id: 9, organizerId: 101, categoryId: 7,
    title: 'Cape Town Tech & Design Pop-Up',
    description: 'A two-day pop-up for local designers, illustrators and small tech brands at the V&A Waterfront.',
    date: demoDate(62), endDate: demoDate(63), time: '10:00 – 19:00',
    location: 'V&A Waterfront, Makers Landing', city: 'Cape Town', province: 'Western Cape',
    stallFee: 600, totalStalls: 8, availableStalls: 8, expectedVisitors: '7,000',
    requirements: 'Power point supplied per stand\nProduct liability insurance recommended',
    bannerImageUrl: '', status: 'OPEN'
  },
  {
    id: 10, organizerId: 101, categoryId: 1,
    title: 'Winter Warmers Food Market',
    description: 'Soups, stews, mulled drinks and fire pits at the Old Biscuit Mill.',
    date: demoDate(-45), endDate: '', time: '10:00 – 16:00',
    location: 'Old Biscuit Mill, Woodstock', city: 'Cape Town', province: 'Western Cape',
    stallFee: 220, totalStalls: 8, availableStalls: 4, expectedVisitors: '3,200',
    requirements: 'Certificate of Acceptability required',
    bannerImageUrl: DEMO_IMAGES.foodMarket, status: 'COMPLETED'
  },
  {
    id: 11, organizerId: 101, categoryId: 2,
    title: 'Heritage Month Craft Expo',
    description: 'Draft listing for a heritage craft expo. Details still being confirmed with the venue.',
    date: demoDate(80), endDate: '', time: '09:00 – 17:00',
    location: 'Castle of Good Hope', city: 'Cape Town', province: 'Western Cape',
    stallFee: 200, totalStalls: 12, availableStalls: 12, expectedVisitors: '',
    requirements: '',
    bannerImageUrl: '', status: 'DRAFT'
  },
  {
    id: 12, organizerId: 101, categoryId: 6,
    title: 'Paarl Wellness Weekend Market',
    description: 'A wellness market that was cancelled because the venue became unavailable.',
    date: demoDate(28), endDate: '', time: '09:00 – 15:00',
    location: 'Paarl Arboretum', city: 'Paarl', province: 'Western Cape',
    stallFee: 180, totalStalls: 10, availableStalls: 10, expectedVisitors: '1,500',
    requirements: '',
    bannerImageUrl: DEMO_IMAGES.community, status: 'CANCELLED'
  }
];

// ---------- Applications (UML: Application) ----------
// What each demo vendor sells, reused when building their sample applications.
const DEMO_PRODUCTS = {
  1: 'Espresso drinks, cold brew and home-made buttermilk rusks.',
  2: 'Braai plates, boerewors rolls and pap with chakalaka.',
  3: 'Vintage denim, shweshwe dresses and upcycled jackets.',
  4: 'Olive oil, tapenade and marinated olives, with free tastings.',
  5: 'Bunny chows, samoosas and take-home spice kits.',
  6: 'Beaded jewellery, key rings and beaded décor pieces.',
  7: 'Leather bags, belts and veldskoene.',
  8: 'Custom-painted sneakers and a sneaker cleaning station.',
  9: 'Fynbos soaps, lip balms and soy candles.',
  10: 'Art prints, stickers and live laser engraving.'
};

const DEMO_SPECIAL_REQUIREMENTS = {
  1: 'Access to a 220V plug point for the espresso machine.',
  2: 'Space for a gas braai stand behind the stall.',
  8: 'Corner spot if possible for the cleaning queue.',
  10: 'Power for a small laser engraver (500W).'
};

function demoApplication(id, eventId, vendorId, status, appliedDaysAgo, reviewNotes = '') {
  const profile = MOCK_VENDOR_PROFILES.find(p => p.userId === vendorId);
  const reviewed = status === 'APPROVED' || status === 'REJECTED';
  return {
    id,
    eventId,
    vendorId,
    businessName: profile.businessName,
    productsDescription: DEMO_PRODUCTS[vendorId],
    specialRequirements: DEMO_SPECIAL_REQUIREMENTS[vendorId] || '',
    status,
    reviewNotes,
    appliedAt: demoDateTime(appliedDaysAgo, 9 + (id % 8)),
    reviewedAt: reviewed ? demoDateTime(Math.max(appliedDaysAgo - 2, 0), 15) : null
  };
}

const MOCK_APPLICATIONS = [
  // Event 1 — Cape Town Summer Market (10 stalls, 5 approved)
  demoApplication(1, 1, 1, 'PENDING', 1),
  demoApplication(2, 1, 2, 'PENDING', 2),
  demoApplication(3, 1, 6, 'PENDING', 3),
  demoApplication(4, 1, 3, 'APPROVED', 12, 'Approved — rail space next to the fashion row.'),
  demoApplication(5, 1, 4, 'APPROVED', 11),
  demoApplication(6, 1, 5, 'APPROVED', 9),
  demoApplication(7, 1, 7, 'APPROVED', 8),
  demoApplication(8, 1, 9, 'APPROVED', 6),
  demoApplication(9, 1, 10, 'REJECTED', 7, 'We already have enough print and design stalls at this market.'),
  // Event 2 — Joburg Street Food Carnival (8 stalls, 6 approved)
  demoApplication(10, 2, 2, 'APPROVED', 20),
  demoApplication(11, 2, 5, 'APPROVED', 19),
  demoApplication(12, 2, 8, 'APPROVED', 18),
  demoApplication(13, 2, 1, 'APPROVED', 6, 'Welcome aboard! You are in bay 7 next to the stage.'),
  demoApplication(14, 2, 10, 'APPROVED', 15),
  demoApplication(15, 2, 3, 'APPROVED', 14),
  // Event 3 — Umhlanga Artisan & Craft Fair (6 stalls, full)
  demoApplication(16, 3, 6, 'APPROVED', 30),
  demoApplication(17, 3, 7, 'APPROVED', 29),
  demoApplication(18, 3, 3, 'APPROVED', 28),
  demoApplication(19, 3, 9, 'APPROVED', 27),
  demoApplication(20, 3, 10, 'APPROVED', 26),
  demoApplication(21, 3, 4, 'APPROVED', 25),
  demoApplication(22, 3, 1, 'REJECTED', 10, 'All stalls were allocated before we reached your application.'),
  // Event 4 — Pretoria Twilight Fest (12 stalls, 2 approved)
  demoApplication(23, 4, 8, 'APPROVED', 9),
  demoApplication(24, 4, 2, 'APPROVED', 8),
  demoApplication(25, 4, 1, 'CANCELLED', 7),
  // Event 5 — Stellenbosch Fresh Valley Market (8 stalls, 3 approved)
  demoApplication(26, 5, 4, 'APPROVED', 16),
  demoApplication(27, 5, 9, 'APPROVED', 15),
  demoApplication(28, 5, 1, 'APPROVED', 4, "You're in stall C4 near the main entrance. See you there!"),
  demoApplication(29, 5, 6, 'PENDING', 2),
  // Event 6 — Maboneng Vintage & Thrift Fair (6 stalls, 3 approved, applications closed)
  demoApplication(30, 6, 3, 'APPROVED', 25),
  demoApplication(31, 6, 8, 'APPROVED', 24),
  demoApplication(32, 6, 7, 'APPROVED', 22),
  demoApplication(33, 6, 10, 'REJECTED', 21, 'Looking for clothing and accessories only this time.'),
  // Event 7 — Gqeberha Beachfront Makers Market (14 stalls, 1 approved)
  demoApplication(34, 7, 7, 'PENDING', 1),
  demoApplication(35, 7, 6, 'APPROVED', 5),
  // Event 8 — Durban Spice Route Night Market (10 stalls, 1 approved)
  demoApplication(36, 8, 5, 'APPROVED', 6),
  demoApplication(37, 8, 2, 'PENDING', 1),
  // Event 9 — Cape Town Tech & Design Pop-Up (8 stalls, 0 approved)
  demoApplication(38, 9, 10, 'PENDING', 3),
  demoApplication(39, 9, 8, 'PENDING', 2),
  demoApplication(40, 9, 3, 'REJECTED', 4, 'This pop-up is focused on design and tech products.'),
  // Event 10 — Winter Warmers Food Market (completed, 4 approved)
  demoApplication(41, 10, 1, 'APPROVED', 80),
  demoApplication(42, 10, 2, 'APPROVED', 79),
  demoApplication(43, 10, 5, 'APPROVED', 78),
  demoApplication(44, 10, 4, 'APPROVED', 77),
  // Event 12 — Paarl Wellness Weekend Market (cancelled event)
  demoApplication(45, 12, 9, 'CANCELLED', 12),
  demoApplication(46, 12, 4, 'CANCELLED', 11)
];

// ---------- Notifications (UML: Notification) ----------
const MOCK_NOTIFICATIONS = [
  { id: 1, recipientId: 1, type: 'APPLICATION_APPROVED', referenceId: 28, isRead: false, createdAt: demoDateTime(2, 15), title: 'Application approved', message: 'Your application for Stellenbosch Fresh Valley Market was approved.' },
  { id: 2, recipientId: 1, type: 'APPLICATION_APPROVED', referenceId: 13, isRead: false, createdAt: demoDateTime(4, 15), title: 'Application approved', message: 'Your application for Joburg Street Food Carnival was approved.' },
  { id: 3, recipientId: 1, type: 'EVENT_UPDATED', referenceId: 1, isRead: true, createdAt: demoDateTime(5, 11), title: 'Event update', message: 'Cape Town Summer Market: gates open for set-up at 06:30.' },
  { id: 4, recipientId: 1, type: 'APPLICATION_REJECTED', referenceId: 22, isRead: true, createdAt: demoDateTime(8, 15), title: 'Application not successful', message: 'Your application for Umhlanga Artisan & Craft Fair was not approved.' },
  { id: 5, recipientId: 101, type: 'APPLICATION_SUBMITTED', referenceId: 1, isRead: false, createdAt: demoDateTime(1, 10), title: 'New application', message: "Lisa's Artisan Coffee applied for Cape Town Summer Market." },
  { id: 6, recipientId: 101, type: 'APPLICATION_SUBMITTED', referenceId: 2, isRead: false, createdAt: demoDateTime(2, 11), title: 'New application', message: 'Kasi Braai Express applied for Cape Town Summer Market.' },
  { id: 7, recipientId: 101, type: 'APPLICATION_SUBMITTED', referenceId: 29, isRead: false, createdAt: demoDateTime(2, 12), title: 'New application', message: 'Zulu Beadwork & Gems applied for Stellenbosch Fresh Valley Market.' },
  { id: 8, recipientId: 101, type: 'APPLICATION_SUBMITTED', referenceId: 38, isRead: true, createdAt: demoDateTime(3, 9), title: 'New application', message: 'PixelPop Prints applied for Cape Town Tech & Design Pop-Up.' }
];

const MOCK_DATA = {
  users: MOCK_USERS,
  categories: MOCK_CATEGORIES,
  vendorProfiles: MOCK_VENDOR_PROFILES,
  organizers: MOCK_ORGANIZERS,
  events: MOCK_EVENTS,
  applications: MOCK_APPLICATIONS,
  notifications: MOCK_NOTIFICATIONS
};

// ============================================================
//  Demo "database" helpers
//  A copy of MOCK_DATA is kept in sessionStorage so that demo changes
//  (applying, approving, editing a profile…) carry across pages until the
//  tab is closed. This is NOT a real database.
// ============================================================
const DEMO_DB_KEY = 'vendorlink_demo_db_v1';

function getDemoDb() {
  try {
    const saved = sessionStorage.getItem(DEMO_DB_KEY);
    if (saved) return JSON.parse(saved);
  } catch (err) {
    console.warn('Could not read demo data, starting fresh.', err);
  }
  const fresh = JSON.parse(JSON.stringify(MOCK_DATA));
  saveDemoDb(fresh);
  return fresh;
}

function saveDemoDb(db) {
  try {
    sessionStorage.setItem(DEMO_DB_KEY, JSON.stringify(db));
  } catch (err) {
    console.warn('Could not save demo data.', err);
  }
}

function resetDemoDb() {
  try {
    sessionStorage.removeItem(DEMO_DB_KEY);
  } catch (err) {
    // ignore
  }
}

function nextDemoId(list) {
  return list.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

// A short pause so loading states are visible in demo mode.
function demoDelay(ms = 200) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
