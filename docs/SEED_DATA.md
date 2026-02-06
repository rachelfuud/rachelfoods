# Seed Data – RachelFoods

**Last Updated:** January 26, 2026  
**Currency:** USD (United States)  
**Database:** Railway PostgreSQL  
**Status:** ✅ Production Ready

---

## Categories Overview

RachelFoods features **4 product categories** offering authentic Nigerian food ingredients and ready-to-cook mixes.

### 1. Grains & Staples

**Slug:** `grains-staples`  
**Description:** Traditional staple foods and swallows  
**Product Count:** 3

### 2. Proteins & Fish

**Slug:** `proteins-fish`  
**Description:** Fresh and preserved protein sources  
**Product Count:** 4

### 3. Spices & Ingredients

**Slug:** `spices-ingredients`  
**Description:** Traditional seasonings and soup ingredients  
**Product Count:** 4

### 4. Ready Mixes

**Slug:** `ready-mixes`  
**Description:** Pre-mixed ingredients for quick cooking  
**Product Count:** 3

---

## Product Catalog (14 Products)

### Grains & Staples (3 Products)

| Product       | Slug        | Price (USD) | Unit      | Stock | Featured | Description                    |
| ------------- | ----------- | ----------- | --------- | ----- | -------- | ------------------------------ |
| **Fresh Ogi** | `fresh-ogi` | $7.00       | Wrap/Pack | 980   | No       | Fermented cereal pudding (pap) |
| **Fufu**      | `fufu`      | $10.00      | 5 Pieces  | 960   | Yes      | Pounded yam flour swallow      |
| **Tapioca**   | `tapioca`   | $10.00      | Pack      | 970   | No       | Cassava flour for making eba   |

---

### Proteins & Fish (4 Products)

| Product      | Slug      | Price (USD) | Unit | Stock | Featured | Description                             |
| ------------ | --------- | ----------- | ---- | ----- | -------- | --------------------------------------- |
| **Cat Fish** | `catfish` | $30.00      | Pack | 930   | Yes      | Fresh catfish for pepper soup and stews |
| **Panla**    | `panla`   | $20.00      | Pack | 950   | No       | Dried hake fish                         |
| **Pomo**     | `pomo`    | $20.00      | Pack | 940   | No       | Cow skin for soups and stews            |
| **Kilishi**  | `kilishi` | $10.00      | Pack | 935   | Yes      | Spicy dried beef (Nigerian jerky)       |

---

### Spices & Ingredients (4 Products)

| Product                    | Slug                     | Price (USD) | Unit | Stock | Featured | Description                                  |
| -------------------------- | ------------------------ | ----------- | ---- | ----- | -------- | -------------------------------------------- |
| **Cray Fish**              | `crayfish`               | $10.00      | Pack | 990   | No       | Ground crayfish for seasoning                |
| **Egusi**                  | `egusi`                  | $10.00      | Pack | 975   | Yes      | Ground melon seeds for egusi soup            |
| **Iru / Locust Beans**     | `iru-locust-beans`       | $5.00       | Pack | 960   | No       | Fermented locust beans for traditional soups |
| **Pepper Soup Ingredient** | `pepper-soup-ingredient` | $10.00      | Pack | 985   | No       | Complete spice mix for authentic pepper soup |

---

### Ready Mixes (3 Products)

| Product             | Slug              | Price (USD) | Unit | Stock | Featured | Description                             |
| ------------------- | ----------------- | ----------- | ---- | ----- | -------- | --------------------------------------- |
| **Ayamase Mix**     | `ayamase-mix`     | $10.00      | Pack | 940   | Yes      | Pre-mixed ingredients for designer stew |
| **Ofada Mix**       | `ofada-mix`       | $10.00      | Pack | 945   | Yes      | Complete mix for Ofada rice sauce       |
| **Ewa Aganyin Mix** | `ewa-aganyin-mix` | $10.00      | Pack | 950   | No       | Ready mix for mashed beans with sauce   |

---

## Admin User

**Email:** admin@rachelfoods.com  
**Password:** Admin123!  
**Role:** ADMIN  
**Status:** ACTIVE

---

## Product Statistics

- **Total Products:** 14
- **Total Categories:** 4
- **Featured Products:** 6
- **Price Range:** $5.00 - $30.00
- **Average Price:** $11.79
- **Total Inventory:** 800 units

### Products by Price Point

| Price  | Count | Products                                                                                                  |
| ------ | ----- | --------------------------------------------------------------------------------------------------------- |
| $5.00  | 1     | Iru / Locust Beans                                                                                        |
| $7.00  | 1     | Fresh Ogi                                                                                                 |
| $10.00 | 9     | Fufu, Tapioca, Kilishi, Cray Fish, Egusi, Pepper Soup Ingredient, Ayamase Mix, Ofada Mix, Ewa Aganyin Mix |
| $20.00 | 2     | Panla, Pomo                                                                                               |
| $30.00 | 1     | Cat Fish                                                                                                  |

---

## Implementation Notes

### Database Storage

- Prices are stored in **cents** (multiply by 100)
  - Example: $10.00 → 1000 cents in database
  - Example: $7.00 → 700 cents in database
- All products use `ProductStatus.ACTIVE`
- Featured products appear on homepage

### Seeding Script

- Location: `backend/seed-railway.ts`
- Command: `npx ts-node seed-railway.ts`
- Idempotent: Can be run multiple times (uses `upsert`)

### API Endpoints

- **Categories:** `GET /api/categories`
- **Products:** `GET /api/products`
- **Featured Products:** `GET /api/products?featured=true`

---

## Future Product Additions

Potential categories for expansion:

- **Beverages** - Zobo, Palm Wine, Chapman ingredients
- **Snacks** - Chin Chin, Plantain Chips, Puff Puff mix
- **Soups** - Okro, Banga, Ewedu bases
- **Swallows** - Amala, Wheat flour, Semovita

---

**Document Version:** 2.0  
**Generated:** January 26, 2026  
**Backend:** https://backend-production-3b87.up.railway.app
