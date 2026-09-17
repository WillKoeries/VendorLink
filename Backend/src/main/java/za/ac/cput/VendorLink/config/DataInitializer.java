package za.ac.cput.VendorLink.config;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import za.ac.cput.VendorLink.domain.*;
import za.ac.cput.VendorLink.repository.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final EventRepository eventRepository;
    private final ApplicationRepository applicationRepository;
    private final VendorProfileRepository vendorProfileRepository;
    private final OrganizerRepository organizerRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("Database already seeded. Skipping initial data creation.");
            return;
        }

        log.info("Seeding initial VendorLink categories, users, events, and applications...");

        // 1. Categories
        Category foodCat = categoryRepository.save(Category.builder()
                .name("Food & Beverages")
                .description("Artisan coffee, food trucks, street food, pastries, baked goods and gourmet dining.")
                .iconUrl("utensils")
                .build());

        Category fashionCat = categoryRepository.save(Category.builder()
                .name("Fashion & Apparel")
                .description("Clothing, footwear, vintage fashion, streetwear, handmade bags and accessories.")
                .iconUrl("shirt")
                .build());

        Category craftsCat = categoryRepository.save(Category.builder()
                .name("Crafts & Handmade")
                .description("Ceramics, woodworking, handmade jewelry, artwork, home decor and scented candles.")
                .iconUrl("palette")
                .build());

        Category beautyCat = categoryRepository.save(Category.builder()
                .name("Beauty & Wellness")
                .description("Organic skincare, botanical cosmetics, essential oils and holistic wellness products.")
                .iconUrl("sparkles")
                .build());

        Category homeCat = categoryRepository.save(Category.builder()
                .name("Home & Living")
                .description("Indoor plants, ceramics, textiles, furniture and home organization products.")
                .iconUrl("house")
                .build());

        // 2. Organizer User
        User organizerUser = userRepository.save(User.builder()
                .fullName("John Smith")
                .email("organizer@vendorlink.co.za")
                .password(passwordEncoder.encode("Password123!"))
                .phone("+27 21 555 0123")
                .role(Role.ORGANIZER)
                .build());

        organizerRepository.save(Organizer.builder()
                .user(organizerUser)
                .organizationName("VendorLink Events")
                .description("Premier market and festival coordination across South Africa.")
                .phone("+27 21 555 0123")
                .website("https://vendorlink.co.za")
                .address("Green Point, Cape Town")
                .build());

        // 3. Vendor Users
        User vendor1 = userRepository.save(User.builder()
                .fullName("Lisa Miller")
                .email("vendor@vendorlink.co.za")
                .password(passwordEncoder.encode("Password123!"))
                .phone("+27 82 123 4567")
                .role(Role.VENDOR)
                .build());

        vendorProfileRepository.save(VendorProfile.builder()
                .user(vendor1)
                .businessName("Lisa's Coffee Bar")
                .description("Artisan espresso, cold brews, and fresh pastries sourced locally.")
                .category("Food & Beverages")
                .phone("+27 82 123 4567")
                .website("https://instagram.com/lisascoffeebar")
                .city("Cape Town")
                .province("Western Cape")
                .profileImageUrl("images/profile.png")
                .build());

        User vendor2 = userRepository.save(User.builder()
                .fullName("David Nkosi")
                .email("david@creativecrafts.co.za")
                .password(passwordEncoder.encode("Password123!"))
                .phone("+27 83 234 5678")
                .role(Role.VENDOR)
                .build());

        vendorProfileRepository.save(VendorProfile.builder()
                .user(vendor2)
                .businessName("Creative Crafts")
                .description("Handmade wooden sculptures, woven baskets, and traditional pottery.")
                .category("Crafts & Handmade")
                .phone("+27 83 234 5678")
                .city("Cape Town")
                .province("Western Cape")
                .profileImageUrl("images/market1.png")
                .build());

        User vendor3 = userRepository.save(User.builder()
                .fullName("Sarah Connor")
                .email("sarah@fashioncorner.co.za")
                .password(passwordEncoder.encode("Password123!"))
                .phone("+27 84 345 6789")
                .role(Role.VENDOR)
                .build());

        vendorProfileRepository.save(VendorProfile.builder()
                .user(vendor3)
                .businessName("Fashion Corner")
                .description("Sustainable and vintage clothing, custom denim, and accessories.")
                .category("Fashion & Apparel")
                .phone("+27 84 345 6789")
                .city("Cape Town")
                .province("Western Cape")
                .profileImageUrl("images/market2.png")
                .build());

        // 4. Events
        Event event1 = eventRepository.save(Event.builder()
                .title("Cape Town Summer Market")
                .description("The Cape Town Summer Market brings together local artisans, food vendors, fashion brands and creatives for an exciting weekend of shopping, music and community experiences.")
                .category(foodCat)
                .organizer(organizerUser)
                .date(LocalDate.of(2026, 8, 20))
                .time("09:00 - 18:00")
                .location("Green Point Park, Cape Town")
                .city("Cape Town")
                .province("Western Cape")
                .stallFee(new BigDecimal("250.00"))
                .totalStalls(50)
                .availableStalls(15)
                .expectedVisitors("4,500+")
                .requirements("Business registration (if applicable)\nFood vendors must provide a valid health certificate.\nBring your own gazebo and tables.\nSetup begins at 06:30 AM.")
                .bannerImageUrl("images/market4.png")
                .status(EventStatus.OPEN)
                .build());

        Event event2 = eventRepository.save(Event.builder()
                .title("Food Truck Festival")
                .description("South Africa's biggest street food and mobile gourmet experience featuring 30+ gourmet food trucks, live acoustic stages, and craft beer tasting.")
                .category(foodCat)
                .organizer(organizerUser)
                .date(LocalDate.of(2026, 9, 4))
                .time("10:00 - 20:00")
                .location("Walter Sisulu Botanical Gardens")
                .city("Johannesburg")
                .province("Gauteng")
                .stallFee(new BigDecimal("350.00"))
                .totalStalls(30)
                .availableStalls(8)
                .expectedVisitors("6,000+")
                .requirements("Food truck or trailer required.\nGas safety certificate required.\nFire extinguisher on site.")
                .bannerImageUrl("images/market1.png")
                .status(EventStatus.OPEN)
                .build());

        Event event3 = eventRepository.save(Event.builder()
                .title("Craft Expo")
                .description("Showcasing the very best of KwaZulu-Natal handmade goods, ceramics, woodwork, fine art, and contemporary jewelry design.")
                .category(craftsCat)
                .organizer(organizerUser)
                .date(LocalDate.of(2026, 9, 15))
                .time("09:00 - 17:00")
                .location("Durban Exhibition Centre")
                .city("Durban")
                .province("KwaZulu-Natal")
                .stallFee(new BigDecimal("180.00"))
                .totalStalls(40)
                .availableStalls(22)
                .expectedVisitors("3,000+")
                .requirements("Original handmade goods only.\nNo mass-imported resale items permitted.")
                .bannerImageUrl("images/market2.png")
                .status(EventStatus.OPEN)
                .build());

        Event event4 = eventRepository.save(Event.builder()
                .title("Night Market")
                .description("An atmospheric evening market featuring artisanal street foods, local fashion designers, vinyl records, and craft beverages.")
                .category(foodCat)
                .organizer(organizerUser)
                .date(LocalDate.of(2026, 10, 2))
                .time("17:00 - 23:00")
                .location("Brooklyn Square")
                .city("Pretoria")
                .province("Gauteng")
                .stallFee(new BigDecimal("220.00"))
                .totalStalls(25)
                .availableStalls(10)
                .expectedVisitors("2,500+")
                .requirements("Battery-powered fairy lights or warm LED lighting for stall.")
                .bannerImageUrl("images/market4.png")
                .status(EventStatus.OPEN)
                .build());

        // 5. Applications
        applicationRepository.save(Application.builder()
                .event(event1)
                .vendor(vendor1)
                .businessName("Lisa's Coffee Bar")
                .productsDescription("Specialty espresso drinks, cold brew, and fresh cinnamon rolls.")
                .specialRequirements("Standard 16A plug point for espresso grinder.")
                .status(ApplicationStatus.PENDING)
                .build());

        applicationRepository.save(Application.builder()
                .event(event1)
                .vendor(vendor2)
                .businessName("Creative Crafts")
                .productsDescription("Hand-carved wooden sculptures, wire art, and handmade home ornaments.")
                .specialRequirements("Corner stall if possible.")
                .status(ApplicationStatus.APPROVED)
                .reviewNotes("Approved! Stall position B-14.")
                .reviewedAt(LocalDateTime.now().minusDays(1))
                .build());

        applicationRepository.save(Application.builder()
                .event(event1)
                .vendor(vendor3)
                .businessName("Fashion Corner")
                .productsDescription("Upcycled vintage jackets and custom handmade linen shirts.")
                .specialRequirements("Space for two clothing rails.")
                .status(ApplicationStatus.APPROVED)
                .reviewNotes("Approved! Stall position A-07.")
                .reviewedAt(LocalDateTime.now().minusDays(2))
                .build());

        log.info("Data initialization finished successfully!");
    }
}
