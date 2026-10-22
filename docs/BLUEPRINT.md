**KAAM KARO**

Product Blueprint v0.4

AI-first marketplace, household-service launch scope, marketplace rules, voice/media/location and device-integration foundation

**Status: STARTING FROM SCRATCH**

This document is the evolving foundation for a service marketplace. Nothing in the prototype is treated as already built. The HTML is used only to understand the visual direction and the initial household-service concept.

Source prototype: the uploaded HTML is titled “Kaam Karo — App Prototype” and describes a hyperlocal booking app for plumbing, carpentry, AC and car care, home cleaning and laundry. The prototype includes registration/login, service browsing, booking, confirmation, payment, tracking, profile and settings screens.

# How to use this document

Treat this as the product foundation, not the final master specification. Future decisions should be written into the appropriate layer and then rolled into the master document after approval. Anything marked “Launch” is intended for the first real release; anything marked “Later” should not be allowed to expand the first build unless explicitly promoted.

| **Layer**                   | **Purpose**                                             | **Output**                            |
|-----------------------------|---------------------------------------------------------|---------------------------------------|
| L0 Vision & boundaries      | Define what Kaam Karo is and is not.                    | Approved product statement and scope. |
| L1 Market & service catalog | Define launch geography and services.                   | Category tree and launch catalog.     |
| L2 Personas & roles         | Define what each person can do.                         | Role/permission model.                |
| L3 Functional requirements  | Define every user-facing behavior.                      | PRD/FRD.                              |
| L4 UX/UI                    | Define every screen, field and state.                   | Screen specification.                 |
| L5 Business workflows       | Define jobs, quotes, schedules, payments and disputes.  | Workflow maps and rules.              |
| L6 Data model               | Define entities and relationships.                      | Database specification.               |
| L7 Technical architecture   | Define app, backend and supporting services.            | Technical design.                     |
| L8 Network & infrastructure | Define environments, DNS, APIs, monitoring and scaling. | Infrastructure plan.                  |
| L9 Security & privacy       | Define protection, access, audit and data lifecycle.    | Security baseline.                    |
| L10 External/paid services  | Define vendors and cost-bearing dependencies.           | Vendor matrix and budget.             |
| L11 QA & release            | Define testing and acceptance.                          | Test plan and release gate.           |
| L12 Operations & admin      | Define how the business runs the marketplace.           | Admin SOP and support model.          |
| L13 Growth & analytics      | Define acquisition, retention and marketplace health.   | Measurement plan.                     |
| L14 Master specification    | Combine approved layers.                                | AI-ready master product document.     |

# 1. Product definition

## 1.1 The core idea

Kaam Karo is a two-sided service marketplace. A person who needs a service can find a provider, understand the offering, request or book the service, communicate, receive the service, pay and review it. A person or company that can perform the service can create a provider profile, publish services, receive leads or bookings, quote when required, schedule work, complete jobs and receive earnings. The platform operator controls trust, marketplace rules, payments where used, disputes, content, commissions, verification and system administration.

## 1.2 Three primary login types

| **Role**         | **Plain-language purpose**                   | **Primary goal**                                                            |
|------------------|----------------------------------------------|-----------------------------------------------------------------------------|
| Service Taker    | Customer who needs a service.                | Get a suitable service completed safely, conveniently and at a clear price. |
| Service Provider | Person/team/company that performs a service. | Get legitimate work, manage jobs and get paid.                              |
| Admin            | Marketplace operator.                        | Keep the marketplace safe, useful, fair and commercially sustainable.       |

## 1.3 The startup strategy: minimal market, complete market

The first release should not attempt to solve every kind of service. It should solve one coherent daily-life market completely: household and everyday property-related services. The geographic target should be one city or a compact urban area first, so supply density, response times and support quality can be controlled.

“Complete market” here means complete enough within the chosen category boundary: a household user should be able to find most of the common help they would reasonably need around a home, apartment, office, shop, building or vehicle. It does not mean every profession in the world is included.

## 1.4 Explicitly out of launch scope

- Medical care, doctors, nurses, pharmacies and emergency medical services.

- Legal advice, legal representation and regulated legal services.

- Financial advice, loans, insurance brokerage and investment services.

- Childcare, eldercare or other services that create high safeguarding obligations unless specifically designed and approved later.

- Large-scale employment/recruitment marketplace.

- Government services and regulated utility procurement.

- High-risk construction requiring engineering approval, structural certification or specialized permits.

- Anything that requires handling of highly sensitive personal records unless a later compliance design explicitly supports it.

## 1.5 Long-term expansion direction

The underlying marketplace model should eventually allow new verticals without rebuilding the whole product. Possible later verticals include medical, beauty and wellness, education, business services, professional consulting, events, transportation, pet care and other categories. These are roadmap directions, not launch commitments.

# 2. What the uploaded prototype contributes

The HTML prototype is a starting visual reference, not an implementation specification. It currently presents a consumer journey with registration, login, home, service browsing, booking, confirmation, payment, tracking, profile, settings and about screens. filecite marker belongs outside the document.

The home concept emphasizes location, a search bar and household categories. The prototype examples include plumbing, carpentry, AC care, car care, home cleaning and laundry. Service cards show rating, review count, duration and price; booking includes date, time slot, service address and issue description; confirmation shows booking ID and estimated total; payment includes cash, card and mobile-wallet options; tracking shows a job timeline and contact actions.

## 2.1 What we will preserve

- Simple category-first discovery.

- Search that accepts plain-language problems such as “leaking tap” or “AC service”.

- Visible ratings, jobs completed and price information.

- A booking journey that makes date, time, address and issue clear.

- A job-status timeline.

- A simple customer profile and bookings area.

## 2.2 What we must expand

- Real service-provider onboarding and provider dashboard.

- Admin console and marketplace operations.

- Quote-based jobs, fixed-price jobs and inspection-first jobs.

- Provider availability, service radius and service areas.

- Verification, trust indicators and moderation.

- Cancellations, no-shows, refunds and disputes.

- Real payment state handling rather than a visual payment screen.

- Notifications, chat/contact rules and audit history.

- Service-area and category management.

- Scalable data model and proper security boundaries.

# 3. Product principles

1.  Customer first at the point of need: help the person describe the problem without requiring technical language.

2.  Provider first at the point of execution: make the provider’s next action obvious and fast.

3.  Price clarity: show what is known, what is estimated and what may change.

4.  Trust before transaction: verification, ratings, reviews and clear identity must support the marketplace.

5.  Local before global: density in a small geographic area is more important than thin supply everywhere.

6.  Progressive complexity: simple services should feel simple; complex services can use quotes, inspections and job stages.

7.  Configurable business rules: categories, fees, commissions, cancellation windows and service areas should not be hard-coded unnecessarily.

8.  Privacy by default: collect only what is needed to perform a service.

9.  No single point of failure: critical business actions must be retryable and recoverable.

10. Design for expansion: the launch can be small while the core model remains extensible.

# 4. Service marketplace model

## 4.1 Three ways a service can be sold

| **Model**                  | **Example**                    | **Customer flow**                                  | **Provider flow**                             |
|----------------------------|--------------------------------|----------------------------------------------------|-----------------------------------------------|
| Fixed price                | AC routine service Rs. X       | View → Book → Pay/confirm                          | Receive booking → accept → perform → close    |
| Starting price / estimated | Tap leak “from Rs. X”          | Describe issue → request → provider confirms price | Review issue → quote → customer accepts       |
| Inspection / quote         | Large repaint or waterproofing | Request visit → inspection → quote → approval      | Visit → estimate → quote → schedule → perform |

The platform should treat these as service configuration rather than three separate products. Each service listing should specify its pricing behavior.

## 4.2 Service listing anatomy

- Service name and category.

- Plain-language description.

- What is included.

- What is not included.

- Base/starting/fixed price.

- Pricing unit: job, hour, room, appliance, meter, item, vehicle, etc.

- Estimated duration.

- Service availability hours.

- Minimum visit/call-out charge if applicable.

- Provider service radius or service areas.

- Required customer information or photos.

- Whether quote or inspection is required.

- Cancellation policy reference.

- Materials policy: included, customer-provided or charged separately.

- Warranty/rework policy where applicable.

- Images/examples where useful.

# 5. Launch service catalog - household and everyday services

The catalog below is intentionally broad inside the household/everyday boundary. The startup should launch only the subsets it can actually staff and support in one city, but the category tree can be established now so new supply can be activated later without redesigning the app.

## Plumbing

| **Launch catalog item**                 | **Typical model**    | **Priority** |
|-----------------------------------------|----------------------|--------------|
| Tap repair                              | Fixed / From / Quote | Core         |
| Pipe leakage repair                     | Fixed / From / Quote | Core         |
| Drain blockage/unclogging               | Fixed / From / Quote | Core         |
| Bathroom fitting installation           | Fixed / From / Quote | Core         |
| Kitchen sink repair                     | Fixed / From / Quote | Core         |
| Wash basin repair                       | Fixed / From / Quote | Core         |
| Toilet/commode repair                   | Fixed / From / Quote | Core         |
| Flush tank repair                       | Fixed / From / Quote | Core         |
| Water pressure issue                    | Fixed / From / Quote | Core         |
| Water pump repair                       | Fixed / From / Quote | Core         |
| Water tank cleaning                     | Fixed / From / Quote | Core         |
| Water line installation                 | Fixed / From / Quote | Core         |
| Leak detection                          | Fixed / From / Quote | Core         |
| Geyser/water-heater plumbing connection | Fixed / From / Quote | Core         |
| Emergency plumber call-out              | Fixed / From / Quote | Core         |

## Electrical

| **Launch catalog item**        | **Typical model**    | **Priority** |
|--------------------------------|----------------------|--------------|
| Switch/socket repair           | Fixed / From / Quote | Core         |
| Light fitting installation     | Fixed / From / Quote | Core         |
| Fan installation               | Fixed / From / Quote | Core         |
| Ceiling fan repair             | Fixed / From / Quote | Core         |
| Exhaust fan installation       | Fixed / From / Quote | Core         |
| Breaker/MCB issue              | Fixed / From / Quote | Core         |
| Fuse replacement               | Fixed / From / Quote | Core         |
| Wiring repair                  | Fixed / From / Quote | Core         |
| New wiring for room            | Fixed / From / Quote | Core         |
| Doorbell installation          | Fixed / From / Quote | Core         |
| UPS wiring                     | Fixed / From / Quote | Core         |
| Generator wiring               | Fixed / From / Quote | Core         |
| Inverter wiring                | Fixed / From / Quote | Core         |
| Electrical fault inspection    | Fixed / From / Quote | Core         |
| Emergency electrician call-out | Fixed / From / Quote | Core         |

## Air Conditioning & Cooling

| **Launch catalog item**    | **Typical model**    | **Priority** |
|----------------------------|----------------------|--------------|
| AC general service         | Fixed / From / Quote | Core         |
| AC deep cleaning           | Fixed / From / Quote | Core         |
| AC installation            | Fixed / From / Quote | Core         |
| AC dismantling             | Fixed / From / Quote | Core         |
| AC gas/refrigerant service | Fixed / From / Quote | Core         |
| AC water leakage repair    | Fixed / From / Quote | Core         |
| AC cooling issue diagnosis | Fixed / From / Quote | Core         |
| AC PCB repair              | Fixed / From / Quote | Core         |
| AC compressor diagnosis    | Fixed / From / Quote | Core         |
| AC fan repair              | Fixed / From / Quote | Core         |
| AC capacitor replacement   | Fixed / From / Quote | Core         |
| AC drain line cleaning     | Fixed / From / Quote | Core         |
| AC relocation              | Fixed / From / Quote | Core         |
| Window AC service          | Fixed / From / Quote | Core         |
| Air cooler repair          | Fixed / From / Quote | Core         |

## Appliances

| **Launch catalog item**         | **Typical model**    | **Priority** |
|---------------------------------|----------------------|--------------|
| Refrigerator repair             | Fixed / From / Quote | Core         |
| Freezer repair                  | Fixed / From / Quote | Core         |
| Washing machine repair          | Fixed / From / Quote | Core         |
| Dryer repair                    | Fixed / From / Quote | Core         |
| Microwave repair                | Fixed / From / Quote | Core         |
| Oven repair                     | Fixed / From / Quote | Core         |
| Dishwasher repair               | Fixed / From / Quote | Core         |
| Water dispenser repair          | Fixed / From / Quote | Core         |
| Electric stove repair           | Fixed / From / Quote | Core         |
| Induction cooker repair         | Fixed / From / Quote | Core         |
| Small appliance diagnosis       | Fixed / From / Quote | Core         |
| Appliance installation          | Fixed / From / Quote | Core         |
| Appliance shifting/reconnection | Fixed / From / Quote | Core         |

## Internet, Wi-Fi & Network

| **Launch catalog item**    | **Typical model**    | **Priority** |
|----------------------------|----------------------|--------------|
| Wi-Fi setup                | Fixed / From / Quote | Core         |
| Router configuration       | Fixed / From / Quote | Core         |
| Internet troubleshooting   | Fixed / From / Quote | Core         |
| Mesh Wi-Fi setup           | Fixed / From / Quote | Core         |
| LAN cable installation     | Fixed / From / Quote | Core         |
| Network point installation | Fixed / From / Quote | Core         |
| Router replacement/setup   | Fixed / From / Quote | Core         |
| Signal-strength assessment | Fixed / From / Quote | Core         |
| Home network optimization  | Fixed / From / Quote | Core         |
| Smart TV network setup     | Fixed / From / Quote | Core         |
| Printer network setup      | Fixed / From / Quote | Core         |
| Basic office Wi-Fi setup   | Fixed / From / Quote | Core         |

## TV, Cable & Entertainment

| **Launch catalog item**     | **Typical model**    | **Priority** |
|-----------------------------|----------------------|--------------|
| LED/LCD TV installation     | Fixed / From / Quote | Core         |
| TV wall mounting            | Fixed / From / Quote | Core         |
| TV troubleshooting          | Fixed / From / Quote | Core         |
| Android/Smart TV setup      | Fixed / From / Quote | Core         |
| Cable connection setup      | Fixed / From / Quote | Core         |
| Satellite dish installation | Fixed / From / Quote | Core         |
| Dish alignment              | Fixed / From / Quote | Core         |
| Receiver setup              | Fixed / From / Quote | Core         |
| Remote/configuration help   | Fixed / From / Quote | Core         |
| Home theater installation   | Fixed / From / Quote | Core         |
| Soundbar installation       | Fixed / From / Quote | Core         |
| Streaming-device setup      | Fixed / From / Quote | Core         |

## CCTV & Security

| **Launch catalog item**     | **Typical model**    | **Priority** |
|-----------------------------|----------------------|--------------|
| CCTV installation           | Fixed / From / Quote | Core/Next    |
| CCTV troubleshooting        | Fixed / From / Quote | Core/Next    |
| Camera replacement          | Fixed / From / Quote | Core/Next    |
| DVR/NVR setup               | Fixed / From / Quote | Core/Next    |
| Remote viewing setup        | Fixed / From / Quote | Core/Next    |
| Door camera installation    | Fixed / From / Quote | Core/Next    |
| Video doorbell setup        | Fixed / From / Quote | Core/Next    |
| Access-control installation | Fixed / From / Quote | Core/Next    |
| Basic alarm installation    | Fixed / From / Quote | Core/Next    |
| CCTV maintenance            | Fixed / From / Quote | Core/Next    |

## Solar, UPS & Power Backup

| **Launch catalog item**     | **Typical model**    | **Priority** |
|-----------------------------|----------------------|--------------|
| Solar consultation          | Fixed / From / Quote | Core/Next    |
| Small solar installation    | Fixed / From / Quote | Core/Next    |
| Solar panel cleaning        | Fixed / From / Quote | Core/Next    |
| Solar inverter setup        | Fixed / From / Quote | Core/Next    |
| Solar fault diagnosis       | Fixed / From / Quote | Core/Next    |
| Battery replacement/install | Fixed / From / Quote | Core/Next    |
| UPS installation            | Fixed / From / Quote | Core/Next    |
| UPS repair                  | Fixed / From / Quote | Core/Next    |
| Inverter repair             | Fixed / From / Quote | Core/Next    |
| Battery health check        | Fixed / From / Quote | Core/Next    |
| Power-backup maintenance    | Fixed / From / Quote | Core/Next    |

## Generator & Mechanical Power

| **Launch catalog item**        | **Typical model**    | **Priority** |
|--------------------------------|----------------------|--------------|
| Generator service              | Fixed / From / Quote | Core/Next    |
| Generator oil/filter change    | Fixed / From / Quote | Core/Next    |
| Generator troubleshooting      | Fixed / From / Quote | Core/Next    |
| Generator battery replacement  | Fixed / From / Quote | Core/Next    |
| Generator installation/setup   | Fixed / From / Quote | Core/Next    |
| Generator wiring check         | Fixed / From / Quote | Core/Next    |
| Generator load assessment      | Fixed / From / Quote | Core/Next    |
| Generator maintenance contract | Fixed / From / Quote | Core/Next    |

## Carpentry & Furniture

| **Launch catalog item**   | **Typical model**    | **Priority** |
|---------------------------|----------------------|--------------|
| Furniture repair          | Fixed / From / Quote | Core         |
| Furniture assembly        | Fixed / From / Quote | Core         |
| Cabinet repair            | Fixed / From / Quote | Core         |
| Cabinet installation      | Fixed / From / Quote | Core         |
| Door repair               | Fixed / From / Quote | Core         |
| Door alignment            | Fixed / From / Quote | Core         |
| Door lock fitting         | Fixed / From / Quote | Core         |
| Shelf installation        | Fixed / From / Quote | Core         |
| Curtain rod installation  | Fixed / From / Quote | Core         |
| Bed repair                | Fixed / From / Quote | Core         |
| Table repair              | Fixed / From / Quote | Core         |
| Chair repair              | Fixed / From / Quote | Core         |
| Custom shelf/cabinet work | Fixed / From / Quote | Core         |
| Wood polishing            | Fixed / From / Quote | Core         |
| Minor woodwork            | Fixed / From / Quote | Core         |

## Painting & Wall Finishing

| **Launch catalog item** | **Typical model**    | **Priority** |
|-------------------------|----------------------|--------------|
| Single-room painting    | Fixed / From / Quote | Core/Next    |
| Full-home painting      | Fixed / From / Quote | Core/Next    |
| Wall touch-up           | Fixed / From / Quote | Core/Next    |
| Ceiling painting        | Fixed / From / Quote | Core/Next    |
| Door/window painting    | Fixed / From / Quote | Core/Next    |
| Texture/feature wall    | Fixed / From / Quote | Core/Next    |
| Water-stain treatment   | Fixed / From / Quote | Core/Next    |
| Putty/plaster touch-up  | Fixed / From / Quote | Core/Next    |
| Wallpaper installation  | Fixed / From / Quote | Core/Next    |
| Wallpaper removal       | Fixed / From / Quote | Core/Next    |
| Minor crack repair      | Fixed / From / Quote | Core/Next    |

## Construction & Home Improvement

| **Launch catalog item**     | **Typical model**    | **Priority** |
|-----------------------------|----------------------|--------------|
| Drilling and wall mounting  | Fixed / From / Quote | Core/Next    |
| Tile repair                 | Fixed / From / Quote | Core/Next    |
| Grout replacement           | Fixed / From / Quote | Core/Next    |
| Minor masonry repair        | Fixed / From / Quote | Core/Next    |
| Bathroom renovation support | Fixed / From / Quote | Core/Next    |
| Kitchen renovation support  | Fixed / From / Quote | Core/Next    |
| False-ceiling repair        | Fixed / From / Quote | Core/Next    |
| Waterproofing inspection    | Fixed / From / Quote | Core/Next    |
| Waterproofing repair        | Fixed / From / Quote | Core/Next    |
| Roof leakage repair         | Fixed / From / Quote | Core/Next    |
| Floor repair                | Fixed / From / Quote | Core/Next    |
| Minor demolition            | Fixed / From / Quote | Core/Next    |
| Fixture installation        | Fixed / From / Quote | Core/Next    |
| Partition repair            | Fixed / From / Quote | Core/Next    |
| Aluminum/UPVC repair        | Fixed / From / Quote | Core/Next    |

## Glass, Aluminum & Metal

| **Launch catalog item**   | **Typical model**    | **Priority** |
|---------------------------|----------------------|--------------|
| Glass replacement         | Fixed / From / Quote | Core/Next    |
| Window glass fitting      | Fixed / From / Quote | Core/Next    |
| Door glass fitting        | Fixed / From / Quote | Core/Next    |
| Aluminum window repair    | Fixed / From / Quote | Core/Next    |
| Aluminum door repair      | Fixed / From / Quote | Core/Next    |
| Mosquito-net fitting      | Fixed / From / Quote | Core/Next    |
| Shower glass installation | Fixed / From / Quote | Core/Next    |
| Mirror fitting            | Fixed / From / Quote | Core/Next    |
| Metal grill repair        | Fixed / From / Quote | Core/Next    |
| Minor welding             | Fixed / From / Quote | Core/Next    |
| Railing repair            | Fixed / From / Quote | Core/Next    |
| Shopfront glass repair    | Fixed / From / Quote | Core/Next    |

## Cleaning & Hygiene

| **Launch catalog item**  | **Typical model**    | **Priority** |
|--------------------------|----------------------|--------------|
| Home general cleaning    | Fixed / From / Quote | Core         |
| Deep home cleaning       | Fixed / From / Quote | Core         |
| Kitchen deep cleaning    | Fixed / From / Quote | Core         |
| Bathroom deep cleaning   | Fixed / From / Quote | Core         |
| Sofa cleaning            | Fixed / From / Quote | Core         |
| Carpet cleaning          | Fixed / From / Quote | Core         |
| Mattress cleaning        | Fixed / From / Quote | Core         |
| Rug cleaning             | Fixed / From / Quote | Core         |
| Window/glass cleaning    | Fixed / From / Quote | Core         |
| Post-renovation cleaning | Fixed / From / Quote | Core         |
| Move-in cleaning         | Fixed / From / Quote | Core         |
| Move-out cleaning        | Fixed / From / Quote | Core         |
| Office cleaning          | Fixed / From / Quote | Core         |
| Water tank cleaning      | Fixed / From / Quote | Core         |

## Laundry & Fabric Care

| **Launch catalog item**      | **Typical model**    | **Priority** |
|------------------------------|----------------------|--------------|
| Laundry pickup and delivery  | Fixed / From / Quote | Core/Next    |
| Wash and fold                | Fixed / From / Quote | Core/Next    |
| Ironing                      | Fixed / From / Quote | Core/Next    |
| Dry cleaning pickup/drop-off | Fixed / From / Quote | Core/Next    |
| Curtain cleaning             | Fixed / From / Quote | Core/Next    |
| Blanket/comforter cleaning   | Fixed / From / Quote | Core/Next    |
| Shoe cleaning                | Fixed / From / Quote | Core/Next    |
| Carpet pickup cleaning       | Fixed / From / Quote | Core/Next    |

## Pest Control

| **Launch catalog item**   | **Typical model**    | **Priority** |
|---------------------------|----------------------|--------------|
| General pest treatment    | Fixed / From / Quote | Core/Next    |
| Cockroach treatment       | Fixed / From / Quote | Core/Next    |
| Ant treatment             | Fixed / From / Quote | Core/Next    |
| Mosquito treatment        | Fixed / From / Quote | Core/Next    |
| Bed bug treatment         | Fixed / From / Quote | Core/Next    |
| Termite inspection        | Fixed / From / Quote | Core/Next    |
| Termite treatment         | Fixed / From / Quote | Core/Next    |
| Rodent control            | Fixed / From / Quote | Core/Next    |
| Fly control               | Fixed / From / Quote | Core/Next    |
| Preventive pest treatment | Fixed / From / Quote | Core/Next    |

## Locksmith & Access

| **Launch catalog item** | **Typical model**    | **Priority** |
|-------------------------|----------------------|--------------|
| Emergency lock opening  | Fixed / From / Quote | Core/Next    |
| Lock replacement        | Fixed / From / Quote | Core/Next    |
| Door lock installation  | Fixed / From / Quote | Core/Next    |
| Smart lock installation | Fixed / From / Quote | Core/Next    |
| Padlock replacement     | Fixed / From / Quote | Core/Next    |
| Key duplication request | Fixed / From / Quote | Core/Next    |
| Broken key extraction   | Fixed / From / Quote | Core/Next    |
| Cabinet lock repair     | Fixed / From / Quote | Core/Next    |
| Gate lock repair        | Fixed / From / Quote | Core/Next    |

## Moving, Shifting & Delivery

| **Launch catalog item** | **Typical model**    | **Priority** |
|-------------------------|----------------------|--------------|
| Room shifting           | Fixed / From / Quote | Core/Next    |
| House shifting support  | Fixed / From / Quote | Core/Next    |
| Office shifting support | Fixed / From / Quote | Core/Next    |
| Furniture moving        | Fixed / From / Quote | Core/Next    |
| Packing service         | Fixed / From / Quote | Core/Next    |
| Unpacking service       | Fixed / From / Quote | Core/Next    |
| Loading/unloading labor | Fixed / From / Quote | Core/Next    |
| Appliance shifting      | Fixed / From / Quote | Core/Next    |
| Small-item delivery     | Fixed / From / Quote | Core/Next    |
| Pickup/drop-off service | Fixed / From / Quote | Core/Next    |

## Gardening & Outdoor

| **Launch catalog item**     | **Typical model**    | **Priority** |
|-----------------------------|----------------------|--------------|
| Lawn maintenance            | Fixed / From / Quote | Core/Next    |
| Gardener visit              | Fixed / From / Quote | Core/Next    |
| Plant trimming              | Fixed / From / Quote | Core/Next    |
| Plant repotting             | Fixed / From / Quote | Core/Next    |
| Basic landscaping           | Fixed / From / Quote | Core/Next    |
| Hedge trimming              | Fixed / From / Quote | Core/Next    |
| Indoor plant maintenance    | Fixed / From / Quote | Core/Next    |
| Tree pruning request        | Fixed / From / Quote | Core/Next    |
| Potted plant delivery/setup | Fixed / From / Quote | Core/Next    |

## Car & Two-Wheeler Everyday Care

| **Launch catalog item**     | **Typical model**    | **Priority** |
|-----------------------------|----------------------|--------------|
| Car wash                    | Fixed / From / Quote | Core/Next    |
| Car interior cleaning       | Fixed / From / Quote | Core/Next    |
| Car detailing               | Fixed / From / Quote | Core/Next    |
| Battery jump-start          | Fixed / From / Quote | Core/Next    |
| Battery replacement/install | Fixed / From / Quote | Core/Next    |
| Tyre puncture assistance    | Fixed / From / Quote | Core/Next    |
| Tyre change                 | Fixed / From / Quote | Core/Next    |
| Oil/filter change request   | Fixed / From / Quote | Core/Next    |
| Car AC inspection           | Fixed / From / Quote | Core/Next    |
| Car electrical diagnosis    | Fixed / From / Quote | Core/Next    |
| Bike puncture assistance    | Fixed / From / Quote | Core/Next    |
| Bike battery replacement    | Fixed / From / Quote | Core/Next    |
| Minor roadside assistance   | Fixed / From / Quote | Core/Next    |

## Home & Office Setup

| **Launch catalog item**  | **Typical model**    | **Priority** |
|--------------------------|----------------------|--------------|
| Furniture assembly       | Fixed / From / Quote | Core/Next    |
| Desk setup               | Fixed / From / Quote | Core/Next    |
| Chair assembly           | Fixed / From / Quote | Core/Next    |
| Monitor/TV mounting      | Fixed / From / Quote | Core/Next    |
| Printer setup            | Fixed / From / Quote | Core/Next    |
| Basic computer setup     | Fixed / From / Quote | Core/Next    |
| Basic home office wiring | Fixed / From / Quote | Core/Next    |
| Cable management         | Fixed / From / Quote | Core/Next    |
| Wi-Fi setup              | Fixed / From / Quote | Core/Next    |
| Smart-device setup       | Fixed / From / Quote | Core/Next    |

## General Labor & Handy Person

| **Launch catalog item**     | **Typical model**    | **Priority** |
|-----------------------------|----------------------|--------------|
| Hourly handyman             | Fixed / From / Quote | Core/Next    |
| Moving small items          | Fixed / From / Quote | Core/Next    |
| Drilling/mounting           | Fixed / From / Quote | Core/Next    |
| Minor repairs bundle        | Fixed / From / Quote | Core/Next    |
| Assembly labor              | Fixed / From / Quote | Core/Next    |
| Event/home setup assistance | Fixed / From / Quote | Core/Next    |
| Post-work cleanup           | Fixed / From / Quote | Core/Next    |
| General maintenance visit   | Fixed / From / Quote | Core/Next    |

# 6. Recommended launch boundary

To keep the startup operationally manageable, the catalog can exist in the system while only a smaller “active launch set” is promoted to customers. A practical first launch could focus on 8-10 high-frequency families: Plumbing, Electrical, AC/Cooling, Appliance Repair, Internet/Wi-Fi, TV/Entertainment, Cleaning, Carpentry/Furniture, Locksmith/Access and basic Car Care. The exact set should be validated with actual provider supply and customer demand before release.

## 6.1 Service-family selection rules

- Frequent enough to create repeat demand.

- Affordable enough for an ordinary household.

- Can be performed with relatively common tools and skills.

- Can be scheduled in a predictable way.

- Can be explained in simple terms.

- Has enough independent providers to create competition.

- Can be supported without requiring highly specialized regulatory infrastructure.

- Has a clear “job completed” outcome.

## 6.2 Location strategy

| **Stage** | **Geography**                     | **Goal**                                                                       |
|-----------|-----------------------------------|--------------------------------------------------------------------------------|
| Pilot     | One city + selected neighborhoods | Prove supply-demand matching and support process.                              |
| Stage 2   | Whole city                        | Increase provider density and repeat usage.                                    |
| Stage 3   | Second city with same model       | Prove repeatable launch playbook.                                              |
| Stage 4   | Multi-city                        | Central platform with local operations rules.                                  |
| Stage 5   | Multi-country                     | Only after compliance, payments and operations are redesigned for each market. |

# 7. Personas

| **Persona**         | **Needs**                                                                        | **Common frustrations**                                                                  |
|---------------------|----------------------------------------------------------------------------------|------------------------------------------------------------------------------------------|
| Customer            | Fast help, fair price, trust, appointment certainty, simple complaint process.   | Unknown provider quality, unclear prices, no-shows, hidden charges, poor communication.  |
| Individual provider | Steady leads, simple job management, payment certainty, profile reputation.      | Low-quality leads, customers cancelling late, disputes, delayed payment, difficult apps. |
| Provider company    | Multiple staff, service coverage, team scheduling, reporting, business identity. | Managing several workers, duplicate bookings, cash reconciliation.                       |
| Admin/operations    | Supply quality, demand balance, fraud prevention, dispute resolution, economics. | Fake users, bad providers, payment disputes, service quality issues, support overload.   |

# 8. Role and access framework

## 8.1 Customer access

- Browse categories and public service listings without revealing private provider/customer information.

- Create/request bookings.

- Manage addresses and contact information.

- View job status.

- Message through controlled in-app channels when enabled.

- Pay through supported methods.

- Cancel within policy.

- Raise a support case.

- Rate/review completed services.

- Request account/data deletion.

## 8.2 Provider access

- Create provider profile.

- Submit verification details.

- Define services, prices and service areas.

- Set working hours and temporary unavailability.

- Receive job requests/leads.

- Accept, reject or quote according to service model.

- Manage assigned jobs.

- Record work start/completion.

- Add approved extra charges/materials.

- See earnings and settlement status.

- Respond to reviews or support cases.

## 8.3 Admin access

- Manage categories and service listings.

- Review provider applications and verification.

- Suspend, restrict or reinstate accounts.

- View and manage bookings.

- Handle disputes/refunds.

- Manage commissions, fees and promotions.

- Manage content and notification templates.

- Manage support tickets.

- View operational dashboards.

- Access audit logs according to least-privilege roles.

## 8.4 Admin should itself have sub-roles

| **Admin sub-role** | **Example permissions**                                                    |
|--------------------|----------------------------------------------------------------------------|
| Super Admin        | All configuration and security functions.                                  |
| Operations         | Bookings, providers, customers, service quality.                           |
| Support            | Customer/provider cases; no financial configuration.                       |
| Finance            | Payments, refunds, settlements, reports; no user-password access.          |
| Content Manager    | Categories, service text, banners, FAQs.                                   |
| Risk/Trust         | Verification, abuse, fraud and moderation.                                 |
| Analyst            | Read-only reporting and analytics where possible.                          |
| Technical Admin    | System configuration and diagnostics; no unnecessary business-data access. |

# 9. Customer journey

11. Open app.

12. Choose location or allow location only when needed.

13. Browse a category or search for the problem in everyday language.

14. View services/providers and compare price, rating, availability, coverage and trust information.

15. Open a service detail page.

16. Choose a fixed-price booking, request a quote or request an inspection depending on the service.

17. Select address, date/time or “as soon as possible” where supported.

18. Add problem description and optional photos.

19. Review price/estimate and terms.

20. Confirm request/booking.

21. Receive provider acceptance or quote.

22. Complete payment or choose allowed payment timing.

23. Track job status.

24. Confirm completion or report an issue.

25. Rate/review.

26. View receipt and job history.

# 10. Provider journey

27. Choose provider registration.

28. Create identity and business profile.

29. Select categories and services.

30. Define service areas, travel radius and working hours.

31. Provide verification information appropriate to the service risk.

32. Submit for review.

33. After approval, publish available services.

34. Receive booking/lead.

35. Review job details and customer requirements.

36. Accept/reject or submit a quote where allowed.

37. Confirm arrival/acceptance.

38. Perform work.

39. Add only permitted extras with customer visibility and approval.

40. Mark complete and submit completion evidence where required.

41. Payment/settlement moves to the appropriate status.

42. Respond to review or dispute if necessary.

# 11. Admin journey

43. Admin logs into a protected admin environment.

44. Review operational alerts and marketplace health.

45. Process provider verification queue.

46. Monitor bookings and exceptions.

47. Handle complaints and disputes.

48. Review payment/refund exceptions.

49. Moderate services, reviews and user content.

50. Apply policy actions with reason and audit trail.

51. Review supply-demand metrics and category health.

52. Publish operational updates or controlled promotions.

53. Run settlement/reporting checks.

54. Review system health and incidents.

# 12. Screen inventory - customer app

| **ID** | **Screen**           | **Purpose**                                                        |
|--------|----------------------|--------------------------------------------------------------------|
| C01    | Splash / app start   | Brand and loading; no business action.                             |
| C02    | Welcome              | Value proposition + sign in/register/continue as guest.            |
| C03    | Login                | Phone/email + password/OTP depending auth strategy.                |
| C04    | Register             | Name, phone, email, password/OTP, city/area, terms.                |
| C05    | OTP verification     | Code verification and retry controls.                              |
| C06    | Home                 | Location, search, categories, popular services, active job.        |
| C07    | Search               | Search by problem/service/provider.                                |
| C08    | Search results       | Services and providers with filters.                               |
| C09    | Category             | Subcategories, featured services.                                  |
| C10    | Service detail       | Description, price model, duration, inclusions, reviews.           |
| C11    | Provider profile     | Identity, trust badge, rating, work count, service area, services. |
| C12    | Request/booking      | Address, date/time, issue, photos, preferences.                    |
| C13    | Quote                | Quote details, validity, inclusions, customer approval.            |
| C14    | Booking review       | Final summary before confirmation.                                 |
| C15    | Booking confirmation | Booking number, provider, time, price/estimate.                    |
| C16    | Payment              | Available payment methods and payment status.                      |
| C17    | Booking tracking     | Timeline, provider contact, help.                                  |
| C18    | Chat/contact         | Controlled messaging/call options.                                 |
| C19    | Job in progress      | Status and actions.                                                |
| C20    | Completion           | Completion summary, extras, customer confirmation.                 |
| C21    | Review               | Rating, tags, written review.                                      |
| C22    | My bookings          | Upcoming/active/past/cancelled.                                    |
| C23    | Addresses            | Manage saved addresses.                                            |
| C24    | Payments/receipts    | Transaction history and receipts.                                  |
| C25    | Profile              | Personal information.                                              |
| C26    | Notifications        | Booking/payment/support messages.                                  |
| C27    | Settings             | Notifications, privacy, security, language, help.                  |
| C28    | Support              | FAQ + ticket creation.                                             |
| C29    | Dispute/report issue | Structured complaint flow.                                         |
| C30    | Account deletion     | Confirm deletion and explain consequences.                         |

# 13. Screen inventory - provider app

| **ID** | **Screen**            | **Purpose**                                                          |
|--------|-----------------------|----------------------------------------------------------------------|
| P01    | Provider welcome      | Provider-specific onboarding.                                        |
| P02    | Provider registration | Identity/contact/business info.                                      |
| P03    | Verification          | Documents/details based on service risk.                             |
| P04    | Provider home         | Today’s jobs, pending requests, earnings snapshot.                   |
| P05    | Service setup         | Create/edit services and pricing.                                    |
| P06    | Availability          | Working hours, blocked dates.                                        |
| P07    | Service area          | Neighborhoods/radius/service zones.                                  |
| P08    | Job requests          | Incoming jobs/leads.                                                 |
| P09    | Job detail            | Customer request and constraints.                                    |
| P10    | Accept/reject/quote   | Action center for a job.                                             |
| P11    | Schedule              | Appointments and calendar.                                           |
| P12    | Job execution         | Arrived/start/in progress/completed.                                 |
| P13    | Extras/materials      | Add customer-visible extras requiring approval where policy says so. |
| P14    | Completion evidence   | Notes/photos/signature/OTP only where needed.                        |
| P15    | Earnings              | Pending/available/paid amounts.                                      |
| P16    | Payout methods        | Bank/wallet details through a compliant provider.                    |
| P17    | Reviews               | Ratings received.                                                    |
| P18    | Provider profile      | Public profile preview.                                              |
| P19    | Notifications         | Jobs/payment/support.                                                |
| P20    | Support               | Provider cases and help.                                             |
| P21    | Settings              | Security, notifications, availability.                               |

# 14. Screen inventory - admin console

| **ID** | **Screen**            | **Purpose**                                |
|--------|-----------------------|--------------------------------------------|
| A01    | Admin login           | Protected staff authentication.            |
| A02    | Dashboard             | Marketplace health snapshot.               |
| A03    | Users                 | Customer/provider search and controls.     |
| A04    | Provider verification | Review and decisions.                      |
| A05    | Categories            | Manage hierarchy.                          |
| A06    | Services              | Manage service catalog.                    |
| A07    | Bookings              | Search/filter/inspect jobs.                |
| A08    | Quotes                | Review quote exceptions.                   |
| A09    | Payments              | Transaction exceptions and status.         |
| A10    | Refunds/disputes      | Case workflow.                             |
| A11    | Reviews/moderation    | Content controls.                          |
| A12    | Support               | Ticket queue and SLA.                      |
| A13    | Fees/commissions      | Controlled financial configuration.        |
| A14    | Promotions            | Coupons/campaigns later.                   |
| A15    | Notifications         | Templates and campaigns.                   |
| A16    | Reports               | Operational/financial/marketplace reports. |
| A17    | Audit logs            | Who changed what and when.                 |
| A18    | Risk/fraud            | Suspicious accounts/behavior.              |
| A19    | System health         | Errors, uptime, queues and integrations.   |
| A20    | Settings              | Platform configuration.                    |

# 15. Booking/job state machine

A booking must have one controlled status at a time. Status changes should be recorded as events so history is never lost.

| **Status**        | **Meaning**                                           | **Next common states**                    |
|-------------------|-------------------------------------------------------|-------------------------------------------|
| Draft             | Customer has not submitted.                           | Requested / abandoned                     |
| Requested         | Customer submitted a request.                         | Accepted / Rejected / Expired / Cancelled |
| Quote Pending     | Provider needs to price or inspect.                   | Quoted / Rejected / Expired / Cancelled   |
| Quoted            | A quote is waiting for customer decision.             | Accepted / Declined / Expired             |
| Accepted          | Provider accepted the booking/quote.                  | Scheduled / Cancelled                     |
| Scheduled         | Appointment is set.                                   | Provider En Route / Cancelled / No-show   |
| Provider En Route | Provider is traveling.                                | Arrived / Cancelled / No-show             |
| Arrived           | Provider has reached the location.                    | In Progress / Cancelled                   |
| In Progress       | Work is being performed.                              | Awaiting Approval / Completed / Disputed  |
| Awaiting Approval | Customer approval or extra charge approval is needed. | In Progress / Completed / Disputed        |
| Completed         | Work finished and recorded.                           | Reviewed / Disputed                       |
| Disputed          | Issue raised.                                         | Resolved / Refunded / Rework / Closed     |
| Cancelled         | Job ended before completion.                          | Closed                                    |
| Expired           | Required action did not happen in time.               | Closed                                    |
| Closed            | Lifecycle complete.                                   | None                                      |

## 15.1 Important rule

The customer UI should never be allowed to invent status. The server is the source of truth. The app only displays the latest valid state and requests a state transition.

# 16. Cancellation and no-show logic

| **Situation**                                                       | **Recommended treatment**                                                                     |
|---------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|
| Customer cancels before provider acceptance                         | Normally no fee.                                                                              |
| Customer cancels after provider acceptance but before agreed window | Policy-dependent fee; show before confirmation.                                               |
| Provider cancels                                                    | Customer should get a clear replacement/refund path and provider reliability may be affected. |
| Provider no-show                                                    | Customer can report; case can trigger support and policy action.                              |
| Customer no-show                                                    | Provider can report after a controlled wait period; any fee must be disclosed in policy.      |
| Emergency/unsafe situation                                          | Either side can stop the job and escalate to support.                                         |

# 17. Pricing rules

- Fixed price: total is known before booking, except clearly defined optional extras.

- From price: displayed as a starting price; provider can quote the actual price after review.

- Inspection fee: must be clearly separated from the final service price.

- Call-out/travel fee: displayed before confirmation if applicable.

- Materials: clearly classified as included, excluded, or customer-approved extra.

- Tax/platform fee/commission: each party should see the amount relevant to them.

- No hidden fees after confirmation unless a documented exception or customer-approved extra applies.

# 18. Quote logic

55. Customer submits issue/request.

56. Provider receives enough information to decide whether to quote or inspect.

57. Provider creates quote with line items or a simple total.

58. Quote has validity time/date.

59. Customer sees inclusions, exclusions and expected duration.

60. Customer accepts, declines or requests clarification.

61. Accepted quote becomes the commercial basis for the job.

62. Changes after acceptance require customer-visible approval when they affect price or scope.

# 19. Reviews and reputation

Reviews are a trust mechanism, not just a marketing feature. Only completed/eligible jobs should create a review opportunity. Reviews should be tied to the transaction so fake public reviews are harder to create.

- 1-5 rating plus optional structured tags.

- Written review optional.

- Provider response allowed under controlled rules.

- Flag/report review option.

- Moderation queue for abusive, private or illegal content.

- Public rating calculation should use clear and consistent rules.

- Do not allow providers to buy or manufacture ratings.

# 20. Chat and contact

Communication is needed, but the platform should minimize unnecessary exposure of personal phone numbers. The preferred model is in-app messaging with masked calling or a relay service when calling becomes necessary. Attachments should be size-limited, type-limited and scanned/validated.

# 21. Addresses and location

- Customer can save multiple addresses with labels such as Home/Office.

- A job stores the address snapshot used for that booking so later profile edits do not silently change historical records.

- Precise location is requested only when it materially helps find/route to the service.

- Provider sees only the location information needed to perform the job.

- The app should allow manual address entry when location permission is denied.

- Location sharing must have a clear purpose and visible explanation.

# 22. Provider onboarding and verification

## 22.1 Provider profile levels

| **Level**            | **Meaning**                                                | **Typical use**                      |
|----------------------|------------------------------------------------------------|--------------------------------------|
| Basic                | Contact verified; profile created.                         | Low-risk browsing/limited interest.  |
| Verified             | Identity/contact and minimum marketplace checks completed. | Can receive normal jobs.             |
| Business Verified    | Business identity and additional checks completed.         | Company/provider-team listings.      |
| Specialized Verified | Extra evidence for higher-risk categories.                 | Selected technical categories later. |

Verification should be proportional to risk. The platform should not demand every possible document from every provider. It should ask for what is needed to establish trust for the service being sold.

## 22.2 Provider quality signals

- Verification status.

- Jobs completed.

- Rating and review count.

- Response rate.

- Acceptance rate, where meaningful.

- Cancellation/no-show history, carefully interpreted.

- Repeat-customer rate, where appropriate.

- Years/experience claim only if supported.

- Service area and availability.

# 23. Customer trust features

- Provider profile with identity/business presentation.

- Clear service description and price behavior.

- Ratings tied to completed jobs.

- Visible job status.

- Receipts and transaction records.

- Easy support access.

- Issue/dispute path.

- Provider arrival/completion confirmation options.

# 24. Notifications

Notifications should be event-based rather than manually coded into screens. A single business event can produce different messages for the customer, provider and admin.

| **Event**         | **Customer**       | **Provider**         | **Admin**          |
|-------------------|--------------------|----------------------|--------------------|
| New request       | Confirmation       | New job alert        | Operational record |
| Provider accepted | Accepted alert     | Success confirmation | Update metrics     |
| Quote received    | Quote notification | Quote submitted      | Record             |
| Payment success   | Receipt            | Payment state        | Financial event    |
| Provider en route | ETA/status         | Navigation/action    | Optional exception |
| Job completed     | Completion request | Completion recorded  | Update             |
| Dispute opened    | Case update        | Case update          | Case queue         |

# 25. Core data model

The database should be designed around stable business objects, not around individual screens. Screens come and go; the business records should survive UI changes.

| **Entity**          | **What it stores**                          | **Important relationships**                    |
|---------------------|---------------------------------------------|------------------------------------------------|
| User                | Login identity and common profile.          | Has one or more roles.                         |
| Customer Profile    | Customer-specific information.              | Belongs to User.                               |
| Provider Profile    | Provider identity, business and trust data. | Belongs to User; has services.                 |
| Admin User          | Staff access.                               | Belongs to User; has permissions.              |
| Address             | Saved/customer job address.                 | Belongs to Customer; copied into Job snapshot. |
| Category            | Service category hierarchy.                 | Parent/child categories.                       |
| Service             | What is being sold.                         | Belongs to category/provider.                  |
| Service Area        | Where provider serves.                      | Provider + geographic scope.                   |
| Availability        | When provider serves.                       | Provider/service.                              |
| Booking             | Customer demand record.                     | Customer + service + provider/assignment.      |
| Quote               | Commercial offer.                           | Booking + provider.                            |
| Job Event           | History of state/action changes.            | Booking/job.                                   |
| Payment             | Financial transaction state.                | Booking + customer/provider where applicable.  |
| Settlement          | Provider payout state.                      | Provider + payment(s).                         |
| Review              | Customer feedback.                          | Completed booking + provider.                  |
| Conversation        | Communication channel.                      | Booking participants.                          |
| Message             | Individual communication.                   | Conversation.                                  |
| Support Ticket      | Customer/provider support case.             | User + booking where relevant.                 |
| Dispute             | Formal transaction issue.                   | Booking + parties.                             |
| Refund              | Return-of-funds action.                     | Payment/booking.                               |
| Notification        | Delivered message/event.                    | User + event.                                  |
| Promotion           | Discount or campaign later.                 | Service/category/segment.                      |
| Audit Log           | Security/business change history.           | Actor + action + object.                       |
| Device Session      | Login/device management.                    | User.                                          |
| Verification Record | Provider/customer verification checks.      | Profile + verification state.                  |

# 26. Data ownership rules

- Transaction records belong to the platform and must remain traceable even if a user deletes their profile, subject to applicable law and retention requirements.

- A profile field change should not rewrite historical job records.

- Financial records should be immutable in principle; corrections should be represented as reversals/adjustments rather than silently editing history.

- Audit logs should be append-only or tightly protected.

- Deleting a user should follow a defined lifecycle, not simply remove every row immediately.

# 27. Authentication and account policy

The exact authentication provider can be selected later. The product should support a simple customer login while allowing stronger controls for providers and administrators.

| **Area**         | **Launch recommendation**                                                                  |
|------------------|--------------------------------------------------------------------------------------------|
| Customer         | Phone OTP or email/password; keep onboarding low-friction.                                 |
| Provider         | Verified phone plus stronger identity/business verification.                               |
| Admin            | Strong authentication, preferably MFA, with separate staff roles.                          |
| Sessions         | Secure token/session management with expiry and revocation.                                |
| Password         | Use a trusted authentication service; never store raw passwords in the app database.       |
| Account recovery | Controlled recovery with abuse protection.                                                 |
| Account deletion | Self-service request plus operational handling where required.                             |
| Blocked account  | Prevent sign-in/actions while retaining controlled records needed for fraud/support/audit. |

# 28. Mobile permissions

| **Permission** | **Why it may be needed**                           | **Default rule**                                    |
|----------------|----------------------------------------------------|-----------------------------------------------------|
| Location       | Nearby services, provider coverage, routing.       | Ask at the point of value; manual address fallback. |
| Camera         | Service issue photos, profile/service images.      | Ask only when feature used.                         |
| Photos/files   | Attach issue evidence or provider documents.       | Request only when needed.                           |
| Notifications  | Booking, quote, payment and status updates.        | Explain value before enabling where possible.       |
| Phone/call     | Optional masked/relay call flow.                   | Do not require for ordinary browsing.               |
| Microphone     | Only if voice notes/calls are actually introduced. | Do not request in MVP unless needed.                |
| Contacts       | Not necessary for core marketplace.                | Avoid requesting in MVP.                            |

# 29. Security baseline

- Use encrypted network communication for all app/API traffic.

- Use secure authentication and session storage.

- Enforce server-side authorization for every protected action.

- Apply least privilege to admin and provider roles.

- Validate all inputs on the server.

- Rate-limit login, OTP, messaging and abuse-prone endpoints.

- Do not trust prices, permissions or booking status sent by the mobile app.

- Use secure secrets management; never embed private API keys in the app.

- Protect payment data through the chosen payment provider; do not handle raw card data unnecessarily.

- Keep audit logs for important admin and financial actions.

- Separate development, testing and production environments.

- Have a documented backup and recovery plan.

# 30. Abuse, fraud and marketplace safety

| **Risk**             | **Basic protection**                                                                    |
|----------------------|-----------------------------------------------------------------------------------------|
| Fake provider        | Verification, moderation, review history, complaints.                                   |
| Fake customer        | Phone/email verification, rate limits, abuse monitoring.                                |
| Spam requests        | Request limits and behavior rules.                                                      |
| Fake review          | Review tied to completed job.                                                           |
| Price manipulation   | Server-side quote and approval states; audit history.                                   |
| Off-platform leakage | Controlled contact, terms and reporting; do not over-restrict legitimate communication. |
| Payment fraud        | Payment-provider checks, transaction reconciliation, risk flags.                        |
| Harassment           | Block/report tools, moderation and support escalation.                                  |
| Account takeover     | Strong authentication, suspicious-login detection, session revocation.                  |
| Admin abuse          | Role separation, logs, limited permissions and review of sensitive changes.             |

# 31. Reliability and data-loss prevention

“Must not crash” is a goal, not a promise that software can guarantee. The realistic requirement is that crashes and service failures should be rare, detected quickly, recoverable, and should not corrupt transactions.

## 31.1 App behavior during failure

- Show a useful error message rather than a blank screen.

- Allow safe retry where the action can be repeated.

- Prevent duplicate bookings/payments on repeated taps.

- Save safe local draft state for important forms where appropriate.

- Never show “success” until the server confirms success.

- If network is lost during a critical action, show a clear pending/unknown state rather than guessing.

## 31.2 Backend resilience

- Automatic retries only for safe operations.

- Idempotency for critical actions such as booking creation and payment initiation.

- Queue-based processing for notifications and non-critical background work.

- Database transactions around financially important updates.

- Health checks and monitoring.

- Backups with tested restoration, not just scheduled backups.

- Separate critical data from disposable caches.

## 31.3 Recovery objectives

| **Item**                       | **Initial target**                                                                        |
|--------------------------------|-------------------------------------------------------------------------------------------|
| Database backup                | Automated daily minimum; more frequent for production depending cost and risk.            |
| Restore test                   | Regular scheduled restore verification.                                                   |
| Recovery Point Objective (RPO) | Target loss window to be defined by traffic and cost; aim to minimize transactional loss. |
| Recovery Time Objective (RTO)  | Target restoration time agreed before launch.                                             |
| Incident communication         | One internal owner and a simple customer-facing status process.                           |

# 32. Scalability approach

The first architecture should be simple enough to operate cheaply but should avoid decisions that make a future multi-city marketplace impossible.

| **Growth stage** | **Expected architecture emphasis**                                                                                  |
|------------------|---------------------------------------------------------------------------------------------------------------------|
| 0-10k users      | Managed backend, one primary region, simple services, strong logging.                                               |
| 10k-100k         | Caching, better search/indexing, background jobs, stronger observability.                                           |
| 100k-1M          | Horizontal API scaling, database read optimization, queues, CDN/media optimization.                                 |
| 1M+              | Service decomposition where justified, data partitioning strategies, regional infrastructure, mature SRE practices. |

Do not build microservices just because the product might become large. Start with a well-structured modular backend and split only where scale or team boundaries justify it.

# 33. Paid/external services to plan for

| **Service area**           | **Possible need**          | **Why it matters**              |
|----------------------------|----------------------------|---------------------------------|
| Cloud hosting              | App/backend/database       | Core runtime.                   |
| Authentication             | Identity/OTP               | Reduces custom security burden. |
| SMS/OTP provider           | Phone verification         | Login/recovery.                 |
| Push notifications         | Mobile notifications       | Operational messaging.          |
| Maps/geocoding             | Address/search/routing     | Location-based marketplace.     |
| Payment gateway            | Online payment             | Collections/refunds.            |
| Payout provider            | Provider settlements       | Provider earnings.              |
| File/media storage         | Photos/documents           | Service evidence and listings.  |
| Monitoring/crash reporting | Reliability                | Detect failures.                |
| Email                      | Transactional/support mail | Receipts and recovery.          |
| Analytics                  | Product measurement        | Funnel and marketplace metrics. |
| Customer support tool      | Tickets/chat               | Support operations.             |
| Domain/DNS                 | Public service endpoints   | Internet presence.              |
| App store accounts         | Publication                | Distribution.                   |

Vendor selection should be documented separately with country availability, fees, limits, security certifications where relevant, data residency, support quality and exit strategy.

# 34. Network and infrastructure foundation

The network design should remain human-readable: the mobile apps talk to a secure backend; the backend talks to the database and approved external services. Administrative access is separated from public APIs. Private infrastructure components should not be directly exposed to the internet.

| **Area**        | **Baseline**                                                         |
|-----------------|----------------------------------------------------------------------|
| Mobile → API    | HTTPS only.                                                          |
| API → database  | Private network path where supported.                                |
| API credentials | Environment/secret manager, not source code.                         |
| Admin panel     | Separate authentication and authorization.                           |
| File storage    | Private by default; controlled signed access for files.              |
| DNS             | Managed domain with secure configuration.                            |
| Monitoring      | Centralized errors, latency, uptime and important business failures. |
| Backups         | Automated + tested restoration.                                      |
| Environments    | Development, staging/test, production separated.                     |

# 35. Analytics

| **Metric group** | **Examples**                                                       |
|------------------|--------------------------------------------------------------------|
| Acquisition      | Install → first open → signup.                                     |
| Activation       | First search, first service view, first request.                   |
| Marketplace      | Requests, acceptance rate, time-to-accept, completion rate.        |
| Customer         | Repeat booking rate, cancellation rate, support rate.              |
| Provider         | Activation, response rate, acceptance rate, utilization, earnings. |
| Financial        | GMV/value of jobs, platform revenue, refunds, failed payments.     |
| Quality          | Rating, repeat-provider rate, complaints, rework.                  |
| Reliability      | Crash rate, API error rate, latency, notification delivery.        |

# 36. Growth loop

The marketplace should grow through successful service outcomes. A customer books → receives good service → reviews → becomes a repeat user. A good provider completes jobs → builds reputation → receives more work. Referrals, promotions and reminders can accelerate this later.

Avoid making growth dependent on spammy notifications. The strongest loop should be trust, convenience and repeat usage.

# 37. Content and localization

- Use everyday language rather than technical trade vocabulary on customer screens.

- Design for local currency and date/time conventions.

- Keep provider-facing technical descriptions more detailed where useful.

- Plan for multilingual content by storing translatable text separately from business logic.

- Do not hard-code service names into the app screens; categories and service content should be remotely configurable where practical.

# 38. Accessibility and usability

- Readable text sizes and sufficient contrast.

- Large tap targets.

- Do not make color the only way to understand status.

- Labels for icons.

- Error messages that explain what to do next.

- Support manual address entry if location permission is denied.

- Support poor network conditions with clear states.

- Keep the customer journey short for common services.

# 39. Admin operating model

## Daily operations

- Review provider verification queue.

- Monitor unassigned/rejected/expired jobs.

- Check payment and notification exceptions.

- Review major complaints and safety incidents.

- Check categories with low provider availability.

## Weekly operations

- Review supply-demand balance by neighborhood/category.

- Review provider performance patterns.

- Review refunds and dispute causes.

- Review customer repeat usage.

- Review marketplace economics.

## Monthly operations

- Review category expansion decisions.

- Review provider churn and recruitment.

- Review support workload.

- Review infrastructure costs.

- Review fraud/abuse patterns.

- Review product roadmap based on evidence.

# 40. Support and dispute hierarchy

| **Level**             | **Handled by**    | **Examples**                                                |
|-----------------------|-------------------|-------------------------------------------------------------|
| L1 FAQ/self-help      | Customer/provider | Basic booking or payment questions.                         |
| L2 Support            | Support team      | Provider delay, change request, routine cancellation.       |
| L3 Operations         | Operations lead   | Repeated provider issues, service quality dispute.          |
| L4 Risk/finance       | Specialist role   | Suspected fraud, serious payment disputes, sensitive cases. |
| L5 Executive/incident | Senior owner      | Major safety, legal, security or system incident.           |

# 41. Financial model options

The platform can use one or several revenue models, but launch should keep commercial rules simple.

| **Model**             | **How it works**                                  | **When useful**                                                                |
|-----------------------|---------------------------------------------------|--------------------------------------------------------------------------------|
| Commission            | Platform keeps a percentage of transaction value. | Core marketplace model.                                                        |
| Customer service fee  | Platform adds a customer-facing fee.              | When commission alone is insufficient or specific services justify it.         |
| Provider subscription | Providers pay for premium tools.                  | Later, when value is proven.                                                   |
| Lead fee              | Provider pays for access to a qualified lead.     | Potentially useful for quote-heavy services, but requires strong lead quality. |
| Promoted listing      | Provider pays for extra visibility.               | Later; must remain clearly labeled.                                            |
| Business packages     | Office/property customers buy service bundles.    | Later B2B expansion.                                                           |

# 42. Product rules that should be configurable

- Service category activation.

- Minimum/maximum price thresholds where applicable.

- Commission and fees.

- Cancellation windows.

- Quote expiry.

- Provider service radius/areas.

- Provider verification requirements by category.

- Customer booking limits.

- Review eligibility rules.

- Promotion rules.

- Notification templates.

- Support categories and SLAs.

# 43. AI-assisted build protocol

Because the eventual goal is to give a master document to an AI coding agent, the project should use explicit build rules.

63. AI must read the current approved master specification before editing code.

64. AI must identify the requirement IDs affected by a requested change.

65. AI must explain its proposed change in human language before making a risky architectural change.

66. AI must not silently invent missing business rules. Missing items should be added to an “Open Decisions” section.

67. AI must build in small vertical slices and keep the app runnable after each slice.

68. AI must write tests for critical business rules.

69. AI must never place secrets, payment credentials or production keys in source control.

70. AI must maintain a change log and update affected documentation when behavior changes.

71. AI must support rollback through version control.

72. AI must run build/lint/test checks before claiming a feature is complete.

# 44. Development phases from zero

| **Phase**               | **Main deliverable**                             | **Exit condition**                                       |
|-------------------------|--------------------------------------------------|----------------------------------------------------------|
| 0 Discovery             | Approved scope, roles, services, business model. | No major unresolved product ambiguity for MVP.           |
| 1 UX foundation         | Wireframes and user flows.                       | All launch screens mapped.                               |
| 2 Backend foundation    | Auth, roles, core database.                      | Secure login and data model working.                     |
| 3 Customer MVP          | Browse/search/service/booking.                   | Customer can request a real job.                         |
| 4 Provider MVP          | Provider onboarding and job management.          | Provider can accept and complete a real job.             |
| 5 Admin MVP             | Operations and support console.                  | Admin can run marketplace without direct database edits. |
| 6 Payments              | Payment/settlement integration.                  | Happy path + failure/refund scenarios tested.            |
| 7 Trust & notifications | Reviews, support, notifications, moderation.     | Operational flows complete.                              |
| 8 QA/hardening          | Performance, security, recovery, accessibility.  | Release gate passed.                                     |
| 9 Pilot                 | Small real market launch.                        | Stable service with real users.                          |
| 10 Public launch        | Store release + operations.                      | Monitoring and support active.                           |

# 45. Definition of Done for a feature

- UI implemented for all required states.

- Loading, empty, success and error states included.

- Permission checks verified.

- Server-side validation implemented.

- Analytics event added where required.

- Notification behavior defined if relevant.

- Test cases written for business-critical logic.

- No secrets or debug shortcuts.

- Documentation updated.

- Rollback path understood.

# 46. Open decisions to resolve later

| **Decision**          | **Options to consider**                              | **Status** |
|-----------------------|------------------------------------------------------|------------|
| Authentication        | OTP / email-password / social sign-in                | Open       |
| Payment timing        | Prepay / pay on completion / split                   | Open       |
| Provider model        | Single worker / team / company                       | Open       |
| Matching              | Customer chooses / platform recommends / auto-assign | Open       |
| Pricing               | Fixed + quote + inspection                           | Proposed   |
| Geography             | One city pilot                                       | Proposed   |
| Communication         | Chat + masked call                                   | Proposed   |
| Provider verification | Tiered by risk                                       | Proposed   |
| Commission            | Percentage / fixed / hybrid                          | Open       |
| Wallet/credits        | Launch or later                                      | Later      |
| Subscriptions         | Launch or later                                      | Later      |
| Multilingual          | English only first / bilingual                       | Open       |
| Corporate/B2B         | Later                                                | Later      |

# 47. Master-document structure for the future

The final master document should not be a giant undifferentiated essay. It should be a controlled collection of numbered sections that an AI can use without guessing.

| **Master section**         | **Should contain**                            |
|----------------------------|-----------------------------------------------|
| A. Product Charter         | Vision, scope, non-goals, terminology.        |
| B. Roles & Permissions     | Every role/action permission.                 |
| C. Service Catalog         | Category hierarchy and service definitions.   |
| D. Functional Requirements | Requirement IDs and acceptance criteria.      |
| E. UX/UI                   | Screen IDs, states, fields, validations.      |
| F. Workflows               | Booking/quote/payment/dispute state diagrams. |
| G. Data                    | Entities, fields, relations, lifecycle.       |
| H. APIs                    | Endpoint behavior and authorization.          |
| I. Infrastructure          | Environments, hosting, DNS, monitoring.       |
| J. Security                | Auth, access, data protection, logging.       |
| K. External Services       | Vendors, keys, limits, fallbacks, costs.      |
| L. QA                      | Test matrix and release criteria.             |
| M. Operations              | Admin SOPs and support.                       |
| N. Analytics               | Events, metrics and dashboards.               |
| O. Deployment              | Build, signing, store submission, rollback.   |
| P. Open Decisions          | Explicit unresolved items only.               |
| Q. Change Log              | Approved changes with dates and impact.       |

# 48. Requirement ID convention

Every important requirement should have a stable ID so the AI, developer and future team can talk about the same thing. Example: CUST-AUTH-001, BOOK-STATUS-012, PROV-QUOTE-004, ADMIN-DISPUTE-007, SEC-AUTH-003. When a rule changes, update the requirement rather than leaving contradictory copies scattered across documents.

# 49. Minimum launch checklist

- One launch city selected.

- Initial service families activated.

- Enough verified providers recruited to cover launch areas.

- Customer app complete for browse → request/book → track → complete → review.

- Provider app complete for onboard → receive → accept/quote → execute → complete.

- Admin console complete for users → providers → bookings → disputes → reports.

- Payments operational for chosen methods, or explicitly designed for cash-first pilot.

- Support process active.

- Privacy policy/terms and account controls ready.

- Monitoring and crash reporting active.

- Backups and restore process tested.

- Security review completed.

- Release build tested on representative Android devices.

- Store listing assets prepared.

- Pilot support team trained.

# 50. Final product statement

Kaam Karo should become a trusted local “get it done” marketplace for everyday household and property needs. The startup version does not try to be everything. It focuses on a dense, affordable, frequently needed service market, gives customers a simple path from problem to solution, gives providers a practical way to earn from their skills, and gives the platform enough control to build trust. The architecture should allow additional verticals later without changing the core marketplace model.

# 51. What comes next

The next document should be a separate Functional Requirements / PRD layer built from this foundation. It should take every important item above and turn it into precise requirements: one requirement per behavior, one screen specification per screen, one state rule per workflow, one permission matrix per role, and one acceptance criterion per major function. After that, we can create the database specification, technical architecture, network/infrastructure document, security/privacy document, paid-services/vendor document, QA/release document, operations manual, and finally merge the approved versions into the master AI-build specification.

# Version 0.3 Strategic Expansion — Smart Two-Sided Marketplace

This section is an approved expansion of the product foundation based on the latest product direction. The application is still considered 100% new and will be built from scratch. The uploaded HTML is treated only as a concept/reference for the starting customer journey, not as existing implementation.

The central product idea is now: Kaam Karo is a smart, hyperlocal, two-sided marketplace that helps a customer explain a household problem with minimal effort, identifies the relevant service and nearby eligible suppliers, lets the customer compare transparent supplier offers, and manages the work from request through completion and payment.

# 52. The Core Marketplace Concept

Kaam Karo must not behave like a simple directory of service providers. It must behave like a live marketplace where demand and supply meet in real time or on a scheduled basis.

## 52.1 Customer-side promise

- Tell Kaam Karo what is wrong or what you want done, using normal language, voice, photos, or a very short guided interaction.

- The system should do most of the thinking: identify the likely service, ask only the missing questions, infer location and preferred timing where possible, and prepare the request.

- See relevant nearby suppliers rather than an unfiltered list.

- Compare suppliers using price/quote, distance or estimated travel time, availability, rating, completed work, verification, response speed and useful reputation badges.

- Choose a supplier or invite several suppliers to quote.

- Approve any additional charges before the provider performs chargeable extra work, except for explicitly defined emergency/safety rules.

## 52.2 Supplier-side promise

- Receive service requests that match the supplier’s selected categories, service area, schedule, capabilities and account status.

- See enough job information to decide whether to accept or quote, without receiving unnecessary private customer information before a match.

- Build a reputation that is visible to customers through factual signals such as completed jobs, verified skills, repeat customers, response behavior and customer ratings.

- Define normal working hours, specific-date availability, service radius/areas, emergency availability and blackout periods.

- Provide transparent pricing or quotes, including a controlled breakdown of visit, inspection, labor, tools/equipment, materials, parts and other approved charges.

- Manage jobs, communication, navigation, evidence of completion, invoices/settlements and earnings from a separate partner experience.

## 52.3 Platform promise

- Maintain trust and safety for both sides.

- Match demand to available supply efficiently.

- Prevent a good customer experience from becoming impossible because of poor provider availability.

- Prevent good suppliers from being buried because customers only see the largest or oldest providers.

- Measure both sides of marketplace health: customer success and supplier utilization/earnings opportunity.

# 53. Three Service Commercial Models

Every service must be configured with one or more selling models. A supplier and customer should not be forced into the same commercial process for every kind of job.

| **Model**               | **Customer experience**                                                                                                           | **Supplier experience**                                                                       | **Typical use**                                                                |
|-------------------------|-----------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------|
| Instant / Catalog Price | Select a standard service and book immediately.                                                                                   | Accept the booked job and follow the configured price rules.                                  | AC service, TV mounting, basic cleaning, standard installation.                |
| Choose from Suppliers   | Customer describes need and sees suitable suppliers with price/starting price/availability.                                       | Supplier profile is visible and can accept the booking or respond according to service rules. | Routine jobs where the customer wants choice.                                  |
| Request Quotes / Offers | Customer gives a lightweight problem description. Multiple eligible suppliers can send offers. Customer compares and selects one. | Supplier can provide a structured offer and explain the expected cost.                        | Unknown repair cost, complex jobs, custom work, construction, troubleshooting. |

A future service can support a hybrid: a published visit fee plus a quote for the actual repair, or a starting price plus inspection and parts. The customer must understand which numbers are estimates and which are committed amounts.

# 54. Intelligent Supplier Matching Engine

This is one of the main systems of Kaam Karo. It decides which suppliers are eligible to receive a request and how the customer should see them. Matching must be useful, explainable internally, and adjustable by the admin.

## 54.1 Hard eligibility rules

73. Supplier account is active and not suspended.

74. Supplier has the requested service or a configured equivalent skill.

75. Supplier serves the customer’s selected city and allowed service zone/radius.

76. Supplier is available for the requested date/time, or is allowed to receive the request for later confirmation.

77. Supplier is eligible for the service based on verification requirements, if any.

78. Supplier is not blocked from the customer by an active safety or dispute rule.

79. Supplier has not exceeded configured operational limits such as active-job capacity, if capacity rules are enabled.

## 54.2 Matching signals

- Geographic closeness / estimated travel time.

- Current availability and ability to arrive within the requested window.

- Exact service match vs related service match.

- Customer-selected preferences.

- Verified provider status and verified skill/category.

- Rating quality and volume, without relying on rating alone.

- Completed jobs relevant to the requested service.

- Response speed and acceptance/quote response behavior.

- Cancellation/no-show history.

- Repeat-customer rate or customer-favorite signal where statistically meaningful.

- Price competitiveness within the appropriate service model.

- Provider reliability and marketplace policy compliance.

- New-provider fairness rule so newly approved good suppliers can receive exposure without displacing relevant high-performing providers unfairly.

The exact weighting must remain configurable in the Admin Portal. The product should not hard-code a permanent ranking formula.

## 54.3 “Why am I seeing this supplier?” explanation

For important discovery results, the app can show simple explanations such as “2.1 km away”, “Available at your requested time”, “Verified electrician”, “4.8 from 240 completed jobs”, or “Often chosen for this service”. This is more trustworthy than an unexplained black-box ranking.

# 55. Customer Discovery and Comparison

Supplier discovery must feel closer to a ride-hailing choice experience than to browsing a business directory.

## 55.1 Result layout

- Top section: the customer request summarized in plain language.

- Location: selected address/area and estimated travel context.

- Time: requested date/time or “ASAP”.

- Suggested matches: a small set of highly relevant suppliers first.

- Comparison controls: price/starting price, nearest, fastest response, highest rated, verified, customer favorites, experienced and other supported factual filters.

- Map/list toggle where useful.

- Supplier cards with photo/logo, name, verification, service match, distance/ETA estimate, rating, completed jobs, availability, pricing model and badges.

- A clear “Request offers from multiple suppliers” option where quotes are appropriate.

## 55.2 Reputation and preference badges

Badges must represent measurable facts or defined platform rules, not arbitrary labels. Candidate badges include:

- Verified

- Highly Rated

- Experienced

- Customer Favorite

- Fast Response

- Fast Service / Frequently completes jobs within expected time

- Reliable / Low cancellation rate

- Repeat Customer Favorite

- Top Specialist for this service

- Recently Joined / New Provider

- Emergency Available

- Available Today

- Available Now

- Large Team / Company Provider

“Favorite” is a user action: a customer can save a supplier and quickly rebook them. “Customer Favorite” is a separate platform badge based on defined usage criteria. They must not be confused.

# 56. Intelligent Customer Request: Minimum Data, Maximum Understanding

The customer should not be forced through long forms. Kaam Karo should collect the smallest amount of information needed to create a safe and actionable request.

## 56.1 Preferred input order

80. Customer says or types what they need in everyday language.

81. AI identifies likely service category and asks one or two clarifying questions only when necessary.

82. Customer optionally attaches a photo or short video where it can help.

83. Location is suggested from device location and can be corrected by the customer.

84. Time is suggested as “Now / Today / Later” and then refined only if needed.

85. The customer reviews a short summary and submits.

## 56.2 Example

Customer says: “Mera AC thanda nahi kar raha.” The app should infer that AC troubleshooting/service is likely. It may ask: “Indoor AC hai ya window AC?” and “Kis area mein service chahiye?” if those answers are not already available. It should not force the customer to select multiple technical fields first.

## 56.3 AI responsibilities

- Intent detection: understand what the customer wants.

- Service mapping: map natural language to the platform service catalog.

- Clarification: identify missing critical information and ask the smallest useful question.

- Photo understanding: optionally identify obvious visual context when supported.

- Location interpretation: convert GPS/place information into a human-readable service address.

- Time interpretation: understand “today evening”, “tomorrow morning”, etc.

- Request summarization: create a concise supplier-ready request.

- Suggested supplier filter: use request details to narrow relevant providers.

- Post-job assistance: explain invoices, compare quote line items, and help the customer understand unexpected charges.

- Support triage: categorize problems and route them to the right help process.

AI must assist, not silently make irreversible decisions. Pricing commitments, supplier selection, cancellations, refunds and other consequential actions must remain visible and controllable by the user or platform rules.

# 57. Google Maps and Location Intelligence

Location is a core marketplace capability because proximity affects availability, travel time and supplier relevance. Google Maps Platform should be treated as a planned paid dependency, with usage budgets and fallback behavior. Google provides Maps, Places, Geocoding and Routes capabilities for location-aware applications, and Places can provide autocomplete/current place/nearby search and related data. Routes can provide route distance and duration estimates. See the Google Maps Platform references recorded at the end of this document.

## 57.1 Customer location flow

86. Ask for location permission only when the product needs it.

87. Read the device location and suggest the nearest city/area.

88. Convert coordinates into a human-readable address using the selected mapping/geocoding capability.

89. Show the detected address to the customer for confirmation.

90. Allow correction by map pin, search, saved address or manual entry.

91. Store only the location detail needed to fulfill the service and according to the privacy policy.

92. Use the confirmed service location for supplier matching.

## 57.2 Pakistan-only geographic boundary

The customer experience should allow selection of cities and service locations across Pakistan. The system must enforce Pakistan as the supported marketplace country during the launch phase. City availability is separate from provider availability: a city can exist in the product even when the marketplace is not yet active there.

## 57.3 Suggested location behavior

- “We think you are in Lahore” rather than silently locking the city.

- “Use current location” for a fresh GPS reading.

- Search for a place/address when GPS is inaccurate.

- Show map pin confirmation for service addresses.

- Allow saved Home, Work and custom addresses.

- Allow “service at another location” for providers traveling to a different place.

## 57.4 Provider location behavior

Provider location can be used to estimate proximity, route and arrival time. Continuous location should not be collected by default simply because the provider owns the app. More frequent/active location use should be limited to legitimate scenarios such as an active job, navigation or explicit availability features, subject to Android/iOS permission and store-policy requirements.

# 58. Fare and Quote Breakdown — Transparency by Design

The quotation/invoice system should allow a supplier to explain why a job costs what it costs. This is a central differentiator for non-standard household work.

## 58.1 Possible line items

| **Charge type**             | **Meaning**                                                        | **Customer visibility**                                                                          |
|-----------------------------|--------------------------------------------------------------------|--------------------------------------------------------------------------------------------------|
| Visit / Call-out fee        | Cost to travel/visit the customer.                                 | Shown before approval where applicable.                                                          |
| Inspection / Diagnosis fee  | Cost of assessing the problem.                                     | Shown separately and stated whether deductible from final repair.                                |
| Labor / Service fee         | Work performed by provider/team.                                   | Shown with quantity/unit where practical.                                                        |
| Tools / Equipment usage     | Approved charge for special equipment needed for the job.          | Must have a reason; not a hidden fee.                                                            |
| Consumables                 | Small materials used during work.                                  | Listed separately or grouped according to policy.                                                |
| Parts / New materials       | Replacement parts/materials purchased or supplied.                 | Customer approval required when additional to the approved estimate, except defined emergencies. |
| Emergency / After-hours fee | Additional charge for configured emergency or after-hours service. | Must be disclosed before acceptance when reasonably possible.                                    |
| Travel / Distance surcharge | Additional travel-related amount outside the normal service area.  | Must be rule-based and visible.                                                                  |
| Platform fee                | Kaam Karo service/marketplace fee if charged to customer.          | Displayed separately.                                                                            |
| Tax                         | Applicable tax based on configured rules.                          | Displayed separately.                                                                            |
| Discount / Coupon           | Promotion or negotiated discount.                                  | Displayed separately.                                                                            |

## 58.2 Quote approval rule

A provider can propose a new or changed charge, but the system must distinguish “proposed”, “approved”, “rejected” and “final”. A provider should not be able to convert an unapproved add-on into an automatically payable amount.

## 58.3 Emergency exception

For genuine emergencies, the platform may support a special rule where immediate safety-related action is necessary. The emergency flow must be narrowly defined, logged and communicated clearly; it must not become a loophole for uncontrolled charges.

# 59. Supplier Availability and Capacity

## 59.1 Standard schedule

- Weekly working hours by day.

- Break periods.

- Emergency availability.

- Preferred service areas and radius.

- Maximum active jobs, where capacity matters.

## 59.2 Date-specific availability

A provider can override the normal schedule for specific dates: open, closed, limited, fully booked, or special hours. This allows real-world behavior such as “available Saturday 2–6 PM only”.

## 59.3 Availability status

| **Status**          | **Meaning**                                             |
|---------------------|---------------------------------------------------------|
| Online / Available  | Can receive relevant new opportunities.                 |
| Busy                | Currently working or at capacity.                       |
| Offline             | Not accepting new requests.                             |
| Scheduled Only      | Will receive requests matching future availability.     |
| Emergency Available | Can receive emergency jobs according to category rules. |

# 60. Two Mobile Apps + One Admin Portal

The product should be designed and built as a shared platform with separate experiences for customers and providers, plus a secure web-based admin portal.

| **Surface**            | **Primary user**         | **Core purpose**                                                                                                                                     |
|------------------------|--------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------|
| Kaam Karo Customer App | Service Taker            | Describe need, discover providers, compare, book/accept offers, communicate, track, pay, review.                                                     |
| Kaam Karo Partner App  | Service Provider         | Receive requests, quote/accept, manage availability, schedule jobs, navigate, chat, complete jobs, issue charges, track earnings.                    |
| Kaam Karo Admin Portal | Admin / authorized staff | Manage users, providers, services, marketplace rules, verification, payments, disputes, support, cities, content, analytics and security operations. |

## 60.1 Shared backend principle

The two mobile apps must not maintain separate copies of marketplace truth. They should use the same central backend and authoritative records for users, services, suppliers, requests, bookings, quotes, payments, reviews, disputes and audit events.

## 60.2 Why separate apps

- Different goals: customers seek help; providers seek work.

- Different navigation and information needs.

- Different permissions and operational flows.

- Cleaner product design and lower cognitive load.

- Independent release schedules can be supported later.

- A separate partner app can evolve into a powerful supplier business tool without making the customer app complicated.

## 60.3 Admin portal

The Admin Portal is not simply a dashboard. It is the operational control center for the marketplace. It should support role-based access, approvals, overrides, support cases, financial operations, audit trails, system configuration and reporting.

# 61. Dual-Sided Marketplace Health

The ranking and matching engine cannot optimize only for customer convenience. If there are too few suppliers, the customer cannot get service. If good suppliers receive too few relevant opportunities, they stop using Kaam Karo. The platform therefore needs a dual-sided health model.

## 61.1 Customer-side health

- Request-to-match success rate.

- Time until first suitable supplier is found.

- Quote/accept response rate.

- Booking completion rate.

- Customer cancellation rate and reason.

- Successful completion rate.

- Repeat usage.

- Favorite/rebook behavior.

- Support and dispute rate.

- Customer rating and review quality.

## 61.2 Supplier-side health

- Relevant request volume.

- Response time.

- Acceptance/quote rate.

- Job completion rate.

- Earnings and successful settlement.

- Cancellation/no-show rate.

- Repeat-customer rate.

- Profile completeness.

- Time spent available without receiving relevant jobs.

- Customer feedback.

## 61.3 Supply-gap handling

If the customer submits a valid request but there is no suitable supplier, the app should not simply show an empty screen. It should explain the situation and provide a useful next action: broaden radius, choose another time, request a callback, join a waitlist, or try a related service where appropriate. This is essential for customer retention.

# 62. Simplicity, Speed and Intelligence as Product Requirements

“Fast” is not only a performance target. It is a product requirement. The customer should feel that Kaam Karo removes work instead of adding work.

## 62.1 Customer speed targets

- Home screen should be lightweight and usable quickly on normal mobile connections.

- Service request should require very few steps.

- Supplier matches should appear as soon as practical after required information is available.

- The app should show progress states instead of freezing while searching/matching.

- AI interactions should feel immediate through streaming/partial UI where supported and honest loading messages where not.

- Heavy images and map content should load progressively.

- The customer must always have a non-AI fallback path.

## 62.2 Provider speed targets

- New relevant requests must be easy to understand at a glance.

- Accept / Decline / Quote must be one or two clear actions.

- Provider should see job location and key pricing information before committing.

- Navigation should start without unnecessary screens.

- Job completion should be simple enough to finish in the field.

## 62.3 App performance principle

No single AI call, map request, image operation, notification or third-party service should be allowed to freeze the entire app. Every network-dependent operation needs timeout, retry, failure state and graceful fallback behavior.

# 63. Expanded Everyday Household Service Universe

The launch market remains intentionally narrow: everyday household, property, utility, device and mobility-support services that ordinary consumers can reasonably purchase. Medical, legal, financial, psychological, emergency clinical and similarly regulated professional services remain future expansion areas, not launch categories.

The following expanded catalog is a planning universe. The launch city does not need all services active on day one. Each item can later be configured as active, inactive, quote-only, fixed-price, emergency-eligible, provider-verification-required or coming-soon.

## Plumbing & Water

- Tap repair

- Tap replacement

- Pipe leakage repair

- Water leakage detection

- Drain blockage

- Kitchen sink repair

- Bathroom sink repair

- Toilet repair

- Flush repair

- Water tank cleaning

- Water tank installation

- Water pump repair

- Booster pump installation

- Pressure issue diagnosis

- Shower installation

- Mixer installation

- Bidet spray installation

- Water heater plumbing

- Gas/water line plumbing where legally allowed

- Sewer line inspection

- Drain cleaning

- Emergency plumber

## Electrical & Power

- Switch replacement

- Socket replacement

- Light fitting

- LED installation

- Ceiling fan installation

- Fan repair

- Exhaust fan installation

- Breaker replacement

- MCB troubleshooting

- Fuse issue

- Wiring repair

- Partial rewiring

- Short-circuit diagnosis

- Power trip diagnosis

- Earthing check

- Doorbell installation

- Dimmer installation

- Chandelier installation

- Emergency electrician

- UPS wiring

- Inverter wiring

- Generator connection support where permitted

## AC, Cooling & Heating

- AC general service

- AC deep cleaning

- AC installation

- AC removal

- AC relocation

- AC gas/refrigerant service

- AC leakage diagnosis

- AC drain cleaning

- AC water dripping repair

- AC cooling issue diagnosis

- AC electrical fault diagnosis

- AC PCB diagnosis

- AC compressor diagnosis

- Thermostat issue

- Outdoor unit cleaning

- Indoor unit cleaning

- Window AC service

- Inverter AC service

- Cooler service

- Heater service

- Emergency AC visit

## Home Appliances

- Refrigerator inspection

- Refrigerator repair

- Freezer repair

- Washing machine repair

- Dryer repair

- Dishwasher repair

- Microwave repair

- Oven repair

- Cooking range repair

- Stove/cooker repair

- Water dispenser repair

- Water purifier service

- Electric geyser repair

- Gas geyser service

- Juicer/blender repair

- Iron repair

- Small appliance diagnosis

- Appliance installation

- Appliance relocation

- Appliance cleaning

## Internet, Wi-Fi & Networking

- New router setup

- Router configuration

- Wi-Fi troubleshooting

- Weak Wi-Fi diagnosis

- Mesh Wi-Fi installation

- LAN cable installation

- LAN port repair

- Home network setup

- Office network setup

- Internet speed troubleshooting

- ISP connection assistance

- Modem replacement setup

- Repeater/extender setup

- Printer network setup

- Smart device network setup

- Parental-control setup

- Network security/basic hardening

- Cabling tidy-up

- Network testing

- On-site IT support

## TV, Satellite & Home Entertainment

- TV installation

- TV wall mounting

- TV unmounting

- Smart TV setup

- Streaming device setup

- Android box setup

- Soundbar setup

- Home theater setup

- Speaker installation

- Cable troubleshooting

- Satellite dish alignment

- Satellite receiver setup

- Dish installation

- Dish relocation

- TV signal troubleshooting

- Remote pairing/setup

- Screen/cable connection troubleshooting

- Gaming console setup

- Home entertainment wiring

## CCTV, Security & Access

- CCTV installation

- CCTV camera replacement

- DVR setup

- NVR setup

- Remote viewing setup

- CCTV troubleshooting

- Storage/HDD replacement

- Doorbell camera installation

- Video doorbell setup

- Smart lock installation

- Access control setup

- Intercom installation

- Door access troubleshooting

- Basic alarm installation

- Security sensor setup

- CCTV maintenance

## Solar, UPS & Backup Power

- Solar panel cleaning

- Solar inspection

- Inverter setup

- Inverter troubleshooting

- UPS installation

- UPS repair

- Battery inspection

- Battery replacement

- Solar wiring support

- Solar monitoring setup

- Energy backup assessment

- Small solar system installation support

- Battery cable repair

- Backup power troubleshooting

## Generators

- Generator inspection

- Generator service

- Generator oil/filter service

- Generator battery replacement

- Generator starter diagnosis

- Generator wiring support

- Generator installation support

- Generator relocation

- Generator noise/basic inspection

- Generator emergency call-out

## Carpentry & Furniture

- Door repair

- Door hinge replacement

- Door lock fitting

- Cabinet repair

- Cabinet installation

- Shelf installation

- Wall shelf mounting

- Wardrobe repair

- Wardrobe installation

- Table repair

- Chair repair

- Bed repair

- Bed assembly

- Furniture assembly

- Furniture disassembly

- Furniture polishing

- Wood repair

- Wood cutting/service

- Kitchen cabinet adjustment

- Office furniture assembly

## Painting & Wall Finishing

- Room painting

- Wall repainting

- Ceiling painting

- Touch-up painting

- Texture finish

- Wallpaper installation

- Wallpaper removal

- Wall crack filling

- Damp patch treatment

- Putty work

- Color consultation/basic matching

- Exterior touch-up

- Door painting

- Metal grille painting

- Move-in repaint

- Move-out repaint

## Construction & Home Improvement

- Minor masonry repair

- Tile replacement

- Tile installation

- Grouting

- Silicone/sealant work

- Cement patching

- Brick repair

- Partition adjustment

- Bathroom repair work

- Kitchen repair work

- Countertop minor repair

- Concrete patch repair

- Small renovation jobs

- Drilling/core hole work where appropriate

- Fixture installation

- Basic handyman renovation support

## Glass, Aluminum & Metal

- Window glass replacement

- Door glass replacement

- Mirror installation

- Mirror replacement

- Aluminum window repair

- Aluminum door repair

- Sliding window repair

- Sliding door repair

- Mosquito net installation

- Metal grille repair

- Small welding jobs

- Railing repair

- Glass shelf installation

- Shower glass fitting

- Silicone glass sealing

## Cleaning & Hygiene

- Home general cleaning

- Deep home cleaning

- Kitchen deep cleaning

- Bathroom deep cleaning

- Move-in cleaning

- Move-out cleaning

- Sofa cleaning

- Mattress cleaning

- Carpet cleaning

- Rug cleaning

- Curtain cleaning

- Window cleaning

- Glass cleaning

- Water tank cleaning

- Balcony cleaning

- Post-construction cleaning

- Office cleaning

- Shop cleaning

- Appliance exterior cleaning

## Laundry & Fabric Care

- Laundry pickup/drop

- Wash and fold

- Dry cleaning coordination

- Ironing

- Curtain cleaning coordination

- Carpet/rug laundry

- Sofa cover cleaning

- Bedsheet washing

- Blanket washing

- Special garment care

## Pest Control

- Cockroach treatment

- Ant treatment

- Mosquito control

- Fly control

- Bed bug treatment

- Termite inspection

- Termite treatment

- Rodent control

- Lizard/pest treatment

- General pest treatment

- Preventive pest treatment

## Locksmith & Access

- Door lock replacement

- Lock repair

- Duplicate key service where lawful

- Emergency lockout assistance

- Padlock replacement

- Cabinet lock repair

- Mailbox/locker lock service

- Smart lock setup

- Door alignment related to locking

- Lock maintenance

## Moving, Shifting & Delivery

- Home shifting

- Room shifting

- Office shifting

- Single-item moving

- Furniture transport

- Appliance transport

- Packing service

- Unpacking service

- Loading/unloading

- Small goods delivery

- Local pickup/drop

- Moving labor only

- Storage moving assistance

## Gardening & Outdoor

- Lawn trimming

- Gardening maintenance

- Planting assistance

- Pruning

- Potting

- Terrace garden maintenance

- Balcony garden setup

- Soil replacement

- Plant relocation

- Garden cleanup

- Basic irrigation setup

- Outdoor pressure washing

## Car & Two-Wheeler Everyday Care

- Car wash

- Interior cleaning

- Car detailing

- Oil change coordination

- Battery jump-start

- Battery replacement assistance

- Tyre change assistance

- Tyre puncture assistance

- Basic vehicle inspection

- AC cabin filter replacement

- Wiper replacement

- Headlight bulb replacement

- Bike wash

- Bike chain service

- Bike puncture assistance

- Vehicle pickup/drop for workshop where offered

## Home & Office Setup

- Curtain rod installation

- Picture/frame hanging

- TV bracket installation

- Furniture assembly

- Baby furniture assembly

- Desk setup

- Office workstation setup

- Printer setup

- Wi-Fi setup

- Wall mounting

- Mirror hanging

- Ceiling fixture installation

- Shelving setup

- Basic smart-home setup

- Router placement optimization

## General Handyman

- Drilling

- Wall mounting

- Furniture adjustment

- Minor repairs

- Fixture installation

- Curtain installation

- Shelf installation

- Picture hanging

- Loose-hardware repair

- Silicone/sealant application

- Minor patching

- Assembly/disassembly

- General household inspection

- Small maintenance visit

# 64. Service Catalog Design Rules

- A category is a broad family; a service is a customer-facing task; a provider skill is what a supplier is allowed to perform.

- A service must be configurable without a new mobile-app release whenever possible.

- Each service can have one or more price models.

- Each service can define whether inspection is expected, whether quotes are required, whether emergency mode is allowed, and whether provider verification is mandatory.

- Each service can have customer questions and AI guidance configured in the Admin Portal.

- Each service can have eligibility, safety and documentation requirements.

- Services can be active in one city but inactive in another.

- The same underlying platform can later add new verticals without redesigning the core marketplace.

# 65. Future Vertical Expansion Without Polluting Launch

The architecture should reserve extension points for future marketplaces while keeping the launch user interface focused. Examples include medical/home healthcare, education/tutoring, beauty/wellness, professional services, business services, event services and specialized maintenance. These should be separate product modules or vertical configurations later, not dumped into the first release menu.

# 66. Data and Record Additions for the Smart Marketplace

| **Record**        | **Important information**                                                                                                 |
|-------------------|---------------------------------------------------------------------------------------------------------------------------|
| Customer Request  | Customer, intent, service, description, AI interpretation, attachments, location, requested time, urgency, status.        |
| Match Candidate   | Request, supplier, eligibility result, distance/ETA, availability result, match reason, ranking version.                  |
| Quote             | Supplier, request, validity, line items, taxes/fees, customer response, approval status, timestamps.                      |
| Fare Line         | Type, description, amount, who proposed it, approval status, evidence/notes, applicable rules.                            |
| Availability Rule | Provider, normal schedule, exceptions, date-specific slots, zone, emergency flag.                                         |
| Supplier Badge    | Badge type, eligibility rule, effective date, expiry/recalculation status, source metrics.                                |
| Favorite          | Customer, provider, created date, optional notes.                                                                         |
| Location Snapshot | Address label, latitude/longitude, accuracy estimate, place/address reference, confirmation status.                       |
| AI Interaction    | Request/session, model/service version, prompt/input class, output summary, safety/approval state, latency/error metrics. |
| Marketplace Event | Actor, action, object, timestamp, previous state, new state, source/device metadata where needed.                         |

# 67. AI Governance and Human Control

AI is a product capability, not the owner of the marketplace. The platform must maintain human-readable records of what AI suggested and what the user/provider/admin actually confirmed.

- Never hide an AI-generated interpretation when it materially changes the service request.

- Let the customer correct the interpreted service.

- Do not invent prices, provider credentials or customer details.

- Do not claim a diagnosis that the system cannot reliably establish.

- Use confidence/fallback logic: high-confidence actions can streamline the flow; low-confidence cases should ask a question or use a normal form.

- Maintain a model/service version on important AI decisions for troubleshooting.

- Keep AI prompts, secrets and internal system instructions out of client-side code.

- Provide moderation/safety controls for uploaded text, images and chat where appropriate.

- Make AI failure non-fatal: the user must still be able to complete the task manually.

# 68. Operational Rules for Fair Two-Sided Matching

- Do not allow paid placement to silently defeat relevance, safety or eligibility rules.

- Sponsored/promoted placement, if added later, must be visibly labeled and remain within configured eligibility.

- Use factual reputation signals rather than a single “best provider” claim.

- Prevent a small number of providers from monopolizing every request when the marketplace has other qualified suppliers.

- Protect customers from repeated low-quality or high-cancellation suppliers.

- Protect providers from spam requests, fake jobs and customers with repeated non-payment or abuse patterns.

- Maintain audit history when ranking, suspension or dispute outcomes are manually overridden.

# 69. Architecture Decision Summary for the Startup

The first build should be a focused Pakistan household-services marketplace, not a giant multi-vertical super-app. However, the internal architecture should be modular enough that the company can add new service families later without rewriting identity, payments, location, messaging, reviews, notifications, search or marketplace foundations.

| **Area**                  | **Launch decision**                                                                                       |
|---------------------------|-----------------------------------------------------------------------------------------------------------|
| Country                   | Pakistan only.                                                                                            |
| Initial geography         | One launch city first; other Pakistani cities configurable and expandable.                                |
| Consumer experience       | Dedicated customer mobile app.                                                                            |
| Provider experience       | Dedicated provider/partner mobile app.                                                                    |
| Admin                     | Secure web portal.                                                                                        |
| Core marketplace          | Matching + availability + discovery + offers/quotes + booking/job management.                             |
| AI                        | Built into customer request, service understanding, discovery assistance and support, with human control. |
| Maps                      | Google Maps Platform planned dependency for map/location/place/routing capabilities.                      |
| Payments                  | Design for cash + digital payments in Pakistan; exact gateways can be selected later.                     |
| Launch vertical           | Household/everyday services.                                                                              |
| Excluded launch verticals | Medical, legal, financial and other heavily regulated/specialized services.                               |
| Growth philosophy         | Dense supply and strong fulfillment in a small geography before national expansion.                       |

# 70. Master-Document Implications

The eventual Master Specification must treat the following as core, not optional enhancements:

- Two-sided marketplace design.

- Supplier matching and discovery.

- Multiple-supplier comparison.

- Quote and structured fare breakdown.

- Location intelligence and Pakistan city selection.

- AI-assisted minimal-input customer request creation.

- Customer preferences and factual provider badges.

- Provider schedules and date-specific availability.

- Customer-side and supplier-side marketplace health.

- Separate customer and partner mobile apps with a common backend.

- Admin portal as the operational control center.

- Speed, reliability and graceful failure as requirements.

- Future vertical extensibility without mixing launch UX.

# 71. External Planning References Checked

Google Maps Platform documentation confirms that the current Places SDK for Android (New) supports location-aware features including autocomplete, current-place information, nearby/place search and place details; Google’s platform also provides Maps SDKs, Geocoding, Routes and related services. These services use usage/billing controls, API keys and field selection; the implementation should budget and monitor usage. Google also documents special policy considerations for background location permissions, so the product should prefer foreground/current-location behavior unless a legitimate active-job use case requires more frequent location access.

- **Google Maps Platform — Places SDK for Android (New):** https://developers.google.com/maps/documentation/places/android-sdk

- **Google Maps Platform — APIs by Platform:** https://developers.google.com/maps/apis-by-platform

- **Google Maps Platform — Places SDK usage and billing:** https://developers.google.com/maps/documentation/places/android-sdk/usage-and-billing

- **Google Play — Background location guidance:** https://support.google.com/googleplay/android-developer/answer/9799150

# 72. Working Rule for Future Updates

From this point forward, every major product idea should be added as a layer rather than casually mixed into existing sections. Each new decision should be marked as one of: Proposed, Accepted, Rejected, Deferred, or Needs Validation. Once accepted, it becomes part of the product baseline and should be reflected in the relevant product, UX, data, technical, security and QA documents.

This keeps the project suitable for a future AI build: the AI receives one consistent source of truth instead of a collection of contradictory feature notes.

# 73. v0.4 Accepted Interaction and Device Layer

This layer expands the earlier marketplace blueprint with customer-friendly device interactions, language support, media notes, voice assistance and external communication tools. Nothing here is treated as already built. It becomes part of the product baseline for planning and must still be converted into detailed functional, technical, security and QA requirements.

The guiding principle is: the customer should explain the problem naturally, using the easiest available method, while the system does the work of understanding, structuring and matching.

# 74. Device and platform tools Kaam Karo should use

The application should use native phone capabilities where they make the service experience faster or clearer. The app should request each permission only at the moment the related feature is used, explain why it is needed, and provide a useful fallback when the user says no.

| **Tool / capability**         | **How Kaam Karo should use it**                                                                                                                                                    | **Launch priority** | **Permission approach**                                                                                         |
|-------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------|-----------------------------------------------------------------------------------------------------------------|
| Camera                        | Customer can capture a problem photo; record the 30-second problem video; providers can capture before/after work evidence, completion proof and optional profile/service media.   | Must-have           | Ask only when the user taps a camera feature.                                                                   |
| Microphone                    | Customer records up to 2-minute audio issue notes; on-demand voice assistant; optional future provider voice replies.                                                              | Must-have           | Ask only when recording or voice assistant starts; never assume continuous listening.                           |
| Gallery / Photo Picker        | Attach existing photos or videos instead of forcing a new recording. Useful for damaged item photos and previous evidence.                                                         | Must-have           | Prefer the Android system photo picker so the user shares only selected media rather than broad library access. |
| Location / GPS                | Suggest city, area and current position; find nearby relevant providers; estimate travel distance; help provider navigation during an active job.                                  | Must-have           | Prefer foreground/current-location access; request precise location when it materially improves matching.       |
| Google Maps / Places / Routes | Map location selection, address suggestions, provider proximity, route/distance estimates, service-area visualization and job navigation handoff.                                  | Must-have           | Use API-key restrictions, quotas, usage monitoring and budget alerts.                                           |
| Notifications                 | Booking updates, quote received, provider accepted, provider arriving, reminders, support messages, payment/refund events and important account alerts.                            | Must-have           | Request notification permission at a useful moment and let the user control categories.                         |
| Phone / dialer                | Allow customer/provider to call when appropriate, preferably through a privacy-preserving or platform-controlled contact method.                                                   | Recommended         | Do not read call logs or contacts. Use an explicit call action.                                                 |
| WhatsApp                      | Let users share a service request, quote summary, booking confirmation or referral link through WhatsApp. Consider controlled WhatsApp contact only where operationally justified. | Recommended         | Use Android share/intents or approved WhatsApp business integration; do not read a user's WhatsApp messages.    |
| Contacts picker               | Optional future feature for inviting a family member or sharing a service request.                                                                                                 | Later / optional    | Use a system contact picker where possible rather than broad contacts permission.                               |
| Calendar                      | Optional “Add appointment” action after a confirmed booking.                                                                                                                       | Later / optional    | Use calendar intent or a controlled calendar integration; do not require calendar access for basic booking.     |
| File / document picker        | Provider uploads certificates, business documents or verification evidence when required. Customer can optionally attach supporting documents.                                     | Recommended         | Use user-selected document picker; avoid broad storage access.                                                  |
| Biometrics                    | Optional quick confirmation for sensitive actions such as changing payout information or opening protected provider/admin areas.                                                   | Later / optional    | Use device biometric APIs; do not store fingerprint/face data.                                                  |
| Bluetooth / nearby devices    | Potential later capability for selected technical services such as smart-home setup, routers, printers or device diagnostics.                                                      | Future              | Do not request unless a specific approved service needs it.                                                     |

Important: “phone” and “WhatsApp” should be treated as actions the app can launch, not permission to read another application. In-app communication should remain the primary auditable channel for marketplace actions, while external communication is an optional convenience and fallback.

# 75. Permission and privacy philosophy

Kaam Karo should follow a “permission just in time” approach. The user should not see a wall of permission prompts immediately after installation.

93. Ask for location when the user asks to find nearby providers or when location is needed to confirm the service address.

94. Ask for camera only when the user chooses to take a photo/video.

95. Ask for microphone only when the user chooses an audio note or starts the voice assistant.

96. Ask for notifications when notifications become useful, ideally after the user reaches a meaningful event such as making a booking.

97. Use system pickers for photos, videos and documents rather than broad library/storage permissions when feasible.

98. Do not request contacts, Bluetooth, calendar, call logs or background location merely because they may be useful someday.

Android platform guidance recommends minimizing permissions, using the system photo picker for user-selected media, and requesting sensitive permissions such as location, camera and microphone in the context where they are needed. Source references are listed in Section 87.

# 76. Media notes: photo, audio and video

## 76.1 Customer audio note

- Maximum duration: approximately 2 minutes.

- Primary purpose: customer explains the problem naturally without typing.

- The recording screen shows elapsed time, remaining time, pause/stop, replay, delete and re-record.

- Audio should be compressed before upload while remaining clear enough for speech understanding.

- A practical initial target is mono voice audio at a speech-appropriate bitrate, with an application-level maximum file size as a second safety limit.

- The supplier sees the audio in the request and can play it without leaving the job flow.

- The system may create a text transcript for search, AI understanding and accessibility, but the original audio should not be kept forever by default.

## 76.2 Customer problem video

- Maximum duration: approximately 30 seconds.

- Purpose: show a leak, broken switch, noisy appliance, TV issue, router light pattern or similar visible problem.

- Default recording should favor clear 720p-class video with efficient compression rather than maximum camera quality.

- The app should compress on-device where possible before upload and display an estimated file size.

- The product should impose a maximum upload size as well as a duration limit so a short but extremely large clip is still controlled.

- Generate a thumbnail so suppliers can understand the attachment quickly.

- Allow pause/delete/re-record before submission.

- If upload fails, the customer should not lose the draft request; the app should offer retry.

## 76.3 Photos and gallery

- Allow one or more photos when they improve diagnosis, but do not make them mandatory unless the service genuinely requires visual evidence.

- Allow users to select existing photos using the system photo picker.

- Photo previews should be resized/compressed for the marketplace while preserving enough detail for diagnosis.

- Original full-resolution images should not be retained unnecessarily.

The Android Photo Picker is designed for user-selected media and can avoid broad media-library access for common attachment scenarios. See the official Android Photo Picker reference in Section 87.

# 77. AI voice assistant — customer experience

The customer app should include an optional voice assistant designed specifically for Kaam Karo. It is not intended to be a general-purpose phone assistant. Its job is to help the customer navigate the app and create service requests quickly.

## 77.1 Supported languages

- English

- Urdu

The assistant should support natural switching between Urdu and English in the same conversation where the recognition system can reliably handle the switch. The interface should clearly show the detected/selected language rather than silently changing an important action.

Android provides speech-recognition APIs, including on-device recognition where available. Google Cloud Speech-to-Text currently documents Urdu (Pakistan) and English (Pakistan) language support. These options should be evaluated during the paid-services and AI-provider selection phase.

## 77.2 What the assistant should understand

- “Mera AC thanda nahi kar raha.”

- “Kal shaam electrician chahiye.”

- “Mujhe nearest internet technician dhoondo.”

- “Show only people available after 7.”

- “Only verified providers.”

- “Meri last booking jaisi service dobara book karo.”

- Provider-type preferences only where the category and safety rules legitimately support them.

## 77.3 Assistant actions

- Navigate to a screen.

- Search services.

- Create or edit a draft service request.

- Suggest/confirm location.

- Apply non-sensitive customer preferences such as time, price range or provider badges.

- Read out a quote or booking summary.

- Explain the meaning of provider badges, fees and booking statuses.

- Open support and summarize a dispute or issue before the customer submits it.

The assistant must always ask for confirmation before irreversible or financially consequential actions such as placing a booking, accepting a quote, paying, cancelling a job or submitting a complaint with material consequences.

## 77.4 Voice interaction design

- Use push-to-talk or explicit start/stop rather than an always-listening wake word in the MVP.

- Show a visible microphone/listening state.

- Show the recognized text before applying important commands where practical.

- Allow “undo” or “cancel that” during the interaction.

- Provide a text fallback for every voice function.

- If speech recognition fails, do not trap the user; return them to the same task with another input method.

# 78. Urdu and English localization

Language should be an explicit product setting and a first-class data/configuration concern, not a later translation exercise.

## 78.1 Language options

- English

- Urdu

The default language may be selected during onboarding or inferred from the device language, but the user must be able to change it at any time.

## 78.2 Urdu typography requirements

- Use a professional Urdu-capable font with clear Nastaliq or readable Naskh-style rendering; Noto Nastaliq Urdu is a strong candidate for prominent Urdu content, but the final font must be tested on the actual Android devices selected for launch.

- Avoid compressed Urdu line spacing. Urdu text needs enough vertical room for marks and glyph connections.

- Use RTL layout correctly: text alignment, icons, arrows, order of controls and sheets must be mirrored where appropriate.

- Do not mix Urdu and English carelessly inside a single UI label when it harms readability.

- Technical provider information can retain common English terms when a clear Urdu equivalent is not natural, but customer-facing wording should stay understandable to an ordinary Pakistani user.

- Test Urdu on small screens and low-cost Android devices, not only on a premium phone.

## 78.3 Voice + screen language relationship

- The assistant language should normally follow the selected app language.

- Voice recognition may accept natural Urdu and English speech patterns rather than requiring formal textbook language.

- A spoken request can be converted into a visible summary in the selected app language.

- Supplier-facing audio/video can remain in the customer's spoken language; AI transcripts can optionally provide an English/Urdu text summary for convenience later.

# 79. Customer “no boredom” request flow

The ideal request should feel like a conversation rather than a form. The target interaction is:

99. Tap “What do you need?”

100. Speak, type, take a photo, attach a video, or mix these inputs.

101. AI identifies the likely service.

102. AI asks only the minimum missing question(s).

103. Location is suggested from GPS and can be corrected.

104. Time is suggested from natural language or recent preferences.

105. The app shows a short request summary.

106. Customer confirms.

107. Relevant suppliers are matched and shown.

Example: “Mera geyser leak kar raha hai, DHA Phase 4 mein hoon, aaj 7 baje ke baad koi aa sakta hai?” The customer should not have to manually choose five dropdowns before the system can search.

# 80. Notifications and communication intelligence

Notifications should be useful, timely and actionable rather than noisy. Each notification type should have a clear reason for existing.

| **Event**                                | **Customer notification**        | **Provider notification**             | **Priority** |
|------------------------------------------|----------------------------------|---------------------------------------|--------------|
| New relevant supplier responses / quotes | Quote received / compare options | New service request / response needed | High         |
| Booking accepted                         | Supplier accepted your request   | Job accepted / scheduled              | High         |
| Appointment reminder                     | Upcoming service reminder        | Upcoming job reminder                 | Medium       |
| Provider en route                        | Provider is on the way           | Navigation/job start reminder         | High         |
| Job status                               | Service started/completed        | Customer confirmed/completed          | High         |
| Payment / refund                         | Payment success/failure/refund   | Settlement/payment status             | High         |
| Chat/message                             | New message                      | New message                           | Medium       |
| Support/dispute                          | Case update                      | Case update                           | Medium       |
| Promotion                                | Relevant optional offer          | Relevant optional opportunity         | Low          |

For Android 13 and higher, notifications use a runtime notification permission for non-exempt notifications, so the permission flow should be contextual and respectful.

# 81. Google Maps and location behavior expansion

Location should serve three jobs: help the customer identify where the service is needed, help the matching engine find suitable suppliers, and help an active provider reach the customer.

- Customer opens the request → app requests foreground location only when useful.

- System suggests city, area and approximate/current address.

- Customer confirms or edits the address.

- Matching uses the service location, provider service area/radius and provider availability.

- For an active job, provider can open directions in the chosen navigation solution.

- During an active service, any ongoing location sharing must be clearly indicated and limited to what the job actually needs.

Google’s current Android guidance distinguishes foreground and background location and notes that background location is subject to Play policy; Kaam Karo should avoid background location unless a clearly justified active-job feature requires it.

# 82. External communication and WhatsApp strategy

WhatsApp can be a growth and convenience channel without becoming the primary system of record.

- Customer can share a “Need help with this” or referral link to WhatsApp.

- Customer can share a booking/quote summary to family members.

- Provider can optionally share a service profile or availability link.

- The platform may later support an approved WhatsApp Business workflow for controlled customer support/transactional messaging where commercially and operationally justified.

- Important commercial actions should remain captured in Kaam Karo: quote acceptance, booking acceptance, payment, cancellation, dispute and job completion.

Android supports generic share intents such as ACTION_SEND for sharing content through another application. The product should use that pattern instead of attempting to access private WhatsApp messages.

# 83. Recommended additional features in the same design family

These are suggestions, not yet accepted requirements. They follow the same philosophy of reducing customer effort while increasing marketplace trust.

| **Feature**                             | **Why it helps**                                                                                                                                 | **Suggested status**          |
|-----------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------|
| Smart request memory                    | Remember commonly used address, preferred time window and recurring service patterns so repeat jobs require almost no input.                     | Proposed                      |
| “Book again”                            | One tap to repeat a completed service with the same or similar provider.                                                                         | Proposed                      |
| AI request summary                      | Turn voice/photo/video into a clear supplier-ready description before sharing it.                                                                | Proposed                      |
| Before/after evidence                   | Customer and provider can see timestamped job photos where appropriate.                                                                          | Proposed                      |
| ETA and arrival confirmation            | Give the customer confidence that the provider is actually coming.                                                                               | Proposed                      |
| Family/shared household                 | Allow a household member to create/manage a booking without sharing the owner’s full account.                                                    | Proposed                      |
| Service subscription/reminders          | Recurring reminders for AC servicing, tank cleaning, pest control, generator service, etc.                                                       | Later                         |
| Provider “availability now”             | Let suppliers explicitly announce that they can accept a job immediately.                                                                        | Proposed                      |
| Service guarantee / platform protection | A clearly defined protection policy can increase trust for selected categories.                                                                  | Later / commercial validation |
| No-supply alert                         | When no suitable provider exists, tell the customer and offer notify-when-available / request-broadcast options where operationally appropriate. | Proposed                      |
| Smart bundle                            | Combine related jobs into one visit, such as electrical + fan installation + switch repair.                                                      | Later                         |
| AI issue triage                         | For complex descriptions, suggest whether the customer likely needs inspection, repair, replacement or a specialist.                             | Proposed                      |
| Provider route clustering               | For providers with several jobs, suggest an efficient day plan without exposing unrelated customer details.                                      | Later                         |
| Quiet hours for notifications           | Allow customers/providers to silence non-critical messages.                                                                                      | Proposed                      |
| Low-data mode                           | Reduce media previews, map detail and non-essential background work on slow connections.                                                         | Proposed                      |

# 84. v0.4 Master-Document implications

The future Master Specification must now include the following as explicit cross-document requirements:

108. Two separate mobile apps plus the admin portal.

109. Device capability matrix and permission policy.

110. Camera, microphone, photo picker and controlled media upload behavior.

111. Two-minute customer audio notes and 30-second customer problem videos.

112. Media compression, maximum size, retry and draft preservation behavior.

113. Urdu + English application localization with proper RTL support and readable Urdu typography.

114. On-demand Urdu/English voice assistant with confirmation for consequential actions.

115. GPS-assisted city/address suggestion and Google Maps-based proximity features.

116. Notifications with user-controlled categories and critical/non-critical priority.

117. Phone/WhatsApp actions that do not require broad access to private device data.

118. Privacy-first permission timing and explicit fallback paths.

119. AI governance: explainable suggestions, confidence-aware handling, user confirmation and human escalation.

120. Performance budgets for AI, map, media and notification operations so new capabilities do not make the app feel slow.

# 85. Working design principle: “Talk, show, tap — don’t fill forms”

This is the new interaction principle for the customer app. When a customer has a problem, Kaam Karo should prefer natural inputs in this order: talk, show, tap, and only then type detailed information. Typing and structured forms remain available, but they should be the fallback rather than the main burden placed on the customer.

For suppliers, the principle becomes: “See, decide, act.” A provider should be able to understand a request from its short summary, location, media/voice note, expected commercial model and availability window, then Accept, Quote, Ask a question or Decline without digging through multiple screens.

# 86. Version 0.4 change status

Accepted additions: device integration planning, camera, microphone, gallery/photo picker, GPS/location, Google Maps/Places/Routes planning, notifications, Urdu/English language preference, readable Urdu typography, two-minute audio notes, 30-second video notes, media compression requirements, on-demand bilingual voice assistant, customer low-friction conversational request flow, WhatsApp sharing strategy and expanded marketplace communication intelligence.

Proposed additions: contacts picker, calendar, biometric confirmation, smart request memory, family/shared household, repeat booking, no-supply alerts, service subscriptions, provider “available now”, low-data mode and other features listed in Section 83. These should not be treated as mandatory launch scope until separately accepted.

# 87. External references used for v0.4 planning

Android Developers — Minimize permission requests: https://developer.android.com/privacy-and-security/minimize-permission-requests

Android Developers — Runtime permissions: https://developer.android.com/training/permissions/requesting

Android Developers — Photo Picker: https://developer.android.com/training/data-storage/shared/photo-picker

Android Developers — Notification permission: https://developer.android.com/develop/ui/compose/notifications/notification-permission

Android Developers — SpeechRecognizer: https://developer.android.com/reference/android/speech/SpeechRecognizer

Google Cloud — Speech-to-Text supported languages: https://docs.cloud.google.com/speech-to-text/docs/speech-to-text-supported-languages

Google Maps Platform references already included in v0.3 remain applicable and should be carried into the later paid-services and infrastructure documents.
