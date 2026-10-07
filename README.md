# VendorLink

<p align="center">
  <strong>Connecting Vendors with Markets, Festivals & Events</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Java-17-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white" alt="Java 17" />
  <img src="https://img.shields.io/badge/Spring_Boot-3.3.4-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white" alt="Spring Boot" />
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/PayFast-Integrated-009688?style=for-the-badge&logo=cashapp&logoColor=white" alt="PayFast" />
</p>

---

## 🚀 Project Overview

VendorLink is a full-stack platform designed to connect vendors with organizers of local markets, festivals, expos, and community events. Finding the right events is often fragmented and reliant on word-of-mouth or disparate social media groups. VendorLink streamlines event discovery, vendor applications, profile management, and payment processing into a centralized, modern solution.

---

## 🛠️ Technology Stack & Languages

### 💻 Programming Languages
| Language | Purpose | Badge |
|---|---|---|
| **Java 17** | Backend business logic, REST APIs, and security services | ![Java](https://img.shields.io/badge/Java_17-ED8B00?style=flat-square&logo=openjdk&logoColor=white) |
| **JavaScript (ES6+)** | Frontend interactivity, modular services, dynamic state handling | ![JavaScript](https://img.shields.io/badge/JavaScript_ES6+-F7DF1E?style=flat-square&logo=javascript&logoColor=black) |
| **HTML5** | Semantic structure, accessible markup, forms, and dialogs | ![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white) |
| **CSS3** | Modern styling, responsive layouts, variables, and UI states | ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white) |
| **SQL** | Relational schemas, queries, and constraints on PostgreSQL | ![SQL](https://img.shields.io/badge/SQL-PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white) |

### ⚙️ Backend & Frameworks
* ![Spring Boot](https://img.shields.io/badge/Spring_Boot_3.3.4-6DB33F?style=flat-square&logo=spring-boot&logoColor=white) **Spring Boot 3.3.4**: Core enterprise backend framework providing REST endpoints and MVC architecture.
* ![Spring Security](https://img.shields.io/badge/Spring_Security-6DB33F?style=flat-square&logo=spring-security&logoColor=white) **Spring Security**: Role-based access control (RBAC) protecting vendor and organizer routes.
* ![JWT](https://img.shields.io/badge/JJWT_0.12.6-000000?style=flat-square&logo=jsonwebtokens&logoColor=white) **JSON Web Tokens (JWT)**: Stateless authentication and session authorization.
* ![Spring Data JPA](https://img.shields.io/badge/Spring_Data_JPA-59666C?style=flat-square&logo=hibernate&logoColor=white) **Spring Data JPA / Hibernate**: Object-relational mapping (ORM) and data repositories.
* ![Apache Maven](https://img.shields.io/badge/Apache_Maven-C71A36?style=flat-square&logo=apache-maven&logoColor=white) **Maven**: Dependency management and multi-stage container build automation.

### 🎨 Frontend & UI
* ![Vanilla Web](https://img.shields.io/badge/Vanilla_Web-HTML5%20%7C%20CSS3%20%7C%20JS-blue?style=flat-square) **Zero-Build Architecture**: Pure HTML5, CSS3, and ES6 JavaScript modules with no heavy bundler overhead.
* **Component Design System**: Reusable cards, navigation, modals, toasts, empty/loading states, and status badges.
* **Dual Run Mode**: Immediate demo mode with mock data plus live API/Supabase integration hooks.

### 🗄️ Database & Cloud Infrastructure
* ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?style=flat-square&logo=postgresql&logoColor=white) **PostgreSQL**: Robust ACID-compliant relational persistence.
* ![Supabase](https://img.shields.io/badge/Supabase-Cloud_DB-3ECF8E?style=flat-square&logo=supabase&logoColor=white) **Supabase**: Cloud database instance, connection pooling, and SSL integration.
* ![Docker](https://img.shields.io/badge/Docker-Multi--stage_Build-2496ED?style=flat-square&logo=docker&logoColor=white) **Docker**: Multi-stage containerization with Eclipse Temurin JRE 17.

### 💳 Payments & Integrations
* ![PayFast](https://img.shields.io/badge/PayFast-Secure_Payments-009688?style=flat-square&logo=cashapp&logoColor=white) **PayFast Payment Gateway**: Hosted checkout for vendor subscription tiers with server-to-server Instant Transaction Notification (ITN) webhook verification and atomic state updates.

### 🛠️ Development Tools
* ![VS Code](https://img.shields.io/badge/VS_Code-007ACC?style=flat-square&logo=visualstudiocode&logoColor=white) **Visual Studio Code**
* ![IntelliJ IDEA](https://img.shields.io/badge/IntelliJ_IDEA-000000?style=flat-square&logo=intellijidea&logoColor=white) **IntelliJ IDEA**
* ![Git](https://img.shields.io/badge/Git-F05032?style=flat-square&logo=git&logoColor=white) **Git** & ![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat-square&logo=github&logoColor=white) **GitHub**

---

## 🎯 Problem Statement & Solution

| The Challenge | VendorLink Solution |
|---|---|
| **Fragmented Discovery** | Centralized marketplace where vendors can browse events by category, date, and venue. |
| **Manual Application Spreadsheets** | Digital application pipeline with instant status updates (`PENDING`, `APPROVED`, `REJECTED`). |
| **Communication Gaps** | Direct organizer-to-vendor communication channels and system notification updates. |
| **Vendor Subscriptions** | Automated tiered plans via PayFast checkout to unlock premium features and visibility. |

---

## ✨ Key Features

* 🔐 **Authentication & Roles**: Multi-role security supporting **Vendors**, **Event Organizers**, and **Administrators** with JWT.
* 🏪 **Vendor Profile Management**: Showcase company information, product categories, and contact details.
* 📅 **Event Publishing & Discovery**: Organizers create, publish, manage stalls, and review applicants.
* 📝 **Application Tracking**: Real-time status workflow for stall applications.
* 💳 **PayFast Subscription Checkout**: Secure plan upgrades with automated ITN verification and local simulator support.
* 📱 **Responsive Design**: Designed to work cleanly across mobile devices, tablets, and desktops.

---

## 📂 Project Architecture

```
VendorLink/
├── Backend/                    # Spring Boot REST API
│   ├── src/main/java/          # Controllers, Services, Entities, Security, DTOs
│   ├── src/main/resources/     # Configuration (application.properties, migrations)
│   ├── Dockerfile              # Multi-stage Docker build for deployment
│   ├── pom.xml                 # Maven dependencies
│   └── .env.example            # Environment configuration template
│
├── Frontend/                   # Pure HTML/CSS/JavaScript client
│   ├── index.html              # Landing page
│   ├── browse-events.html      # Event catalog and filters
│   ├── event-details.html      # Event info & vendor application form
│   ├── vendor-dashboard.html   # Vendor stall applications & profile
│   ├── organizer-dashboard.html# Event creation, vendor review & management
│   ├── pricing.html            # Subscription plans & PayFast checkout
│   ├── css/                    # Shared styles & per-page design
│   └── js/                     # Services, models, UI helpers & page scripts
│
└── README.md                   # Project documentation
```

---

## 🏁 Getting Started

### Prerequisites
* **Java 17 JDK** (Eclipse Temurin or OpenJDK recommended)
* **Maven 3.8+** (or use the included `./mvnw` wrapper)
* **VS Code** with Live Server extension (or any local static file server)
* **PostgreSQL** or a **Supabase** account

### 1. Setting up the Backend
1. Open the `Backend` directory:
   ```bash
   cd Backend
   ```
2. Copy the sample environment file and configure your database & JWT settings:
   ```bash
   cp .env.example .env
   ```
3. Run the backend service:
   ```bash
   ./mvnw spring-boot:run
   ```
   The API will be available at `http://localhost:8080`.

### 2. Setting up the Frontend
1. Open the `Frontend` folder in VS Code.
2. Right-click `index.html` and click **Open with Live Server** (or serve via any static web server at `http://localhost:5500`).
3. The frontend includes a **Demo Mode** banner by default, letting you test all vendor and organizer workflows immediately with mock data.

#### Demo Test Accounts
| Role | Email | Target Dashboard |
|---|---|---|
| **Vendor** | `vendor@demo.vendorlink.co.za` | `vendor-dashboard.html` |
| **Organizer** | `organizer@demo.vendorlink.co.za` | `organizer-dashboard.html` |
| **Admin** | `admin@demo.vendorlink.co.za` | `organizer-dashboard.html` (All events view) |

---

## 💳 PayFast Subscription Integration

Paid VendorLink plans utilize PayFast's secure hosted payment portal:
1. **Creation**: The backend creates a pending subscription with server-validated plan amounts and signs the form fields.
2. **Checkout**: The user is redirected to PayFast to complete payment.
3. **ITN Confirmation**: PayFast delivers a server-to-server Instant Transaction Notification (ITN) webhook verifying signatures, merchant credentials, and paid amounts.
4. **Activation**: Upon verification, the subscription transitions atomically from `PENDING` to `COMPLETED`.

---

## 🔮 Future Enhancements

* ⭐ Vendor ratings and attendee reviews
* 💬 Real-time direct messaging between organizers and approved vendors
* 📊 Comprehensive analytics dashboard for attendance and revenue
* 📱 Dedicated native mobile application (iOS & Android)
* 🎟️ Attendee ticketing and digital gate check-in

---

## 📄 License & Academic Note

This project is developed for educational and academic purposes as part of a university group project.
