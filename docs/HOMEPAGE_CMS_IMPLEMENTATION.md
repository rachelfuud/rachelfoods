# Homepage CMS Implementation Guide

## Overview

This guide shows how to add complete homepage content management to the existing CMS system.

## Current State

✅ **Already Editable via CMS:**

- Hero carousel (via Hero Slides)
- Header navigation
- Footer content
- Product displays (automatic from database)

❌ **Still Hardcoded (needs CMS):**

- Section headings ("Shop Our Products", "Why Choose RachelFoods")
- Feature descriptions
- SEO metadata (title, description, keywords)
- Welcome messages

## Implementation Steps

### Step 1: Create Homepage Config Endpoint

The CMS system already supports config types (`header`, `footer`, `announcement`).
Simply add `homepage` as a new config type.

#### Backend Changes:

**File: `backend/src/cms/cms.service.ts`**

Add homepage default config in the `getDefaultConfig` method (around line 46):

```typescript
private getDefaultConfig(type: string) {
    const defaults = {
        // ... existing header, footer, announcement configs ...

        homepage: {
            hero: {
                enabled: true,
                // Hero slides managed separately via hero_slides table
            },
            sections: {
                products: {
                    enabled: true,
                    heading: "Shop Our Products",
                    subheading: "Discover authentic traditional foods from local vendors",
                },
                whyChooseUs: {
                    enabled: true,
                    heading: "Why Choose RachelFoods?",
                    features: [
                        {
                            icon: "🌾",
                            title: "Authentic Traditional Foods",
                            description: "Sourced directly from trusted local vendors"
                        },
                        {
                            icon: "✨",
                            title: "Quality Guaranteed",
                            description: "Fresh ingredients and traditional recipes"
                        },
                        {
                            icon: "🚚",
                            title: "Fast Delivery",
                            description: "Get your order delivered fresh to your doorstep"
                        },
                        {
                            icon: "💳",
                            title: "Secure Payment",
                            description: "Multiple payment options for your convenience"
                        }
                    ]
                },
                featured: {
                    enabled: true,
                    heading: "Featured Products",
                    subheading: "Hand-picked favorites from our collection",
                    displayCount: 6
                },
                popular: {
                    enabled: true,
                    heading: "Popular Products",
                    subheading: "Customer favorites and bestsellers",
                    displayCount: 8
                },
                newArrivals: {
                    enabled: true,
                    heading: "New Arrivals",
                    subheading: "Fresh additions to our catalog",
                    displayCount: 4
                }
            },
            seo: {
                title: "RachelFoods - Authentic Traditional Foods Delivered Fresh",
                description: "Shop authentic traditional Nigerian foods from trusted local vendors. Fresh ingredients, traditional recipes, fast delivery. Order Ogi, Fufu, Egusi and more.",
                keywords: [
                    "traditional foods",
                    "Nigerian food",
                    "local vendors",
                    "Ogi",
                    "Fufu",
                    "Egusi",
                    "African food delivery"
                ],
                ogImage: "/og-image.jpg"
            }
        }
    };

    return defaults[type] || {};
}
```

#### Controller Changes:

**File: `backend/src/cms/cms.controller.ts`**

Update type constraints to include 'homepage':

```typescript
// Line 26 - Public endpoint
@Get('cms/config/:type')
async getConfig(@Param('type') type: 'header' | 'footer' | 'announcement' | 'homepage') {
    return await this.cmsService.getSiteConfig(type);
}

// Line 43 - Admin GET endpoint
@Get('admin/cms/config/:type')
async getAdminConfig(@Param('type') type: 'header' | 'footer' | 'announcement' | 'homepage') {
    return await this.cmsService.getSiteConfig(type);
}

// Line 50 - Admin PUT endpoint
@Put('admin/cms/config/:type')
async updateConfig(
    @Param('type') type: 'header' | 'footer' | 'announcement' | 'homepage',
    @Body('config') config: any,
    @Request() req,
) {
    return await this.cmsService.updateSiteConfig(type, config, req.user.id);
}
```

### Step 2: Create Homepage Admin UI

**File: `frontend/app/admin/cms/homepage/page.tsx`** (new file)

```tsx
"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface HomepageConfig {
  sections: {
    products: {
      enabled: boolean;
      heading: string;
      subheading: string;
    };
    whyChooseUs: {
      enabled: boolean;
      heading: string;
      features: Array<{
        icon: string;
        title: string;
        description: string;
      }>;
    };
    featured: {
      enabled: boolean;
      heading: string;
      subheading: string;
      displayCount: number;
    };
    popular: {
      enabled: boolean;
      heading: string;
      subheading: string;
      displayCount: number;
    };
    newArrivals: {
      enabled: boolean;
      heading: string;
      subheading: string;
      displayCount: number;
    };
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
    ogImage: string;
  };
}

export default function HomepageManagerPage() {
  const [config, setConfig] = useState<HomepageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const API_BASE = process.env.NEXT_PUBLIC_API_URL
        ? `${process.env.NEXT_PUBLIC_API_URL}/api`
        : "http://localhost:3001/api";
      const response = await fetch(`${API_BASE}/admin/cms/config/homepage`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setConfig(data.config || getDefaultConfig());
    } catch (error) {
      console.error("Failed to load homepage config:", error);
      showToast("Failed to load homepage configuration", "error");
      setConfig(getDefaultConfig());
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      const API_BASE = process.env.NEXT_PUBLIC_API_URL
        ? `${process.env.NEXT_PUBLIC_API_URL}/api`
        : "http://localhost:3001/api";
      await fetch(`${API_BASE}/admin/cms/config/homepage`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ config }),
      });
      showToast("Homepage configuration saved successfully!", "success");
    } catch (error) {
      console.error("Failed to save homepage config:", error);
      showToast("Failed to save homepage configuration", "error");
    } finally {
      setSaving(false);
    }
  };

  const updateSection = (section: string, field: string, value: any) => {
    setConfig((prev) =>
      prev
        ? {
            ...prev,
            sections: {
              ...prev.sections,
              [section]: {
                ...prev.sections[section as keyof typeof prev.sections],
                [field]: value,
              },
            },
          }
        : null
    );
  };

  const updateSEO = (field: keyof HomepageConfig["seo"], value: any) => {
    setConfig((prev) =>
      prev
        ? {
            ...prev,
            seo: {
              ...prev.seo,
              [field]: value,
            },
          }
        : null
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Homepage Content Manager</h1>
        <p className="text-gray-600 mt-2">Edit homepage sections, headings, and SEO settings</p>
      </div>

      {/* Products Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Products Section</h2>

        <label className="flex items-center mb-4">
          <input
            type="checkbox"
            checked={config.sections.products.enabled}
            onChange={(e) => updateSection("products", "enabled", e.target.checked)}
            className="mr-2"
          />
          <span>Enable Products Section</span>
        </label>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Heading</label>
            <input
              type="text"
              value={config.sections.products.heading}
              onChange={(e) => updateSection("products", "heading", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Subheading</label>
            <input
              type="text"
              value={config.sections.products.subheading}
              onChange={(e) => updateSection("products", "subheading", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Featured Products Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Featured Products Section</h2>

        <label className="flex items-center mb-4">
          <input
            type="checkbox"
            checked={config.sections.featured.enabled}
            onChange={(e) => updateSection("featured", "enabled", e.target.checked)}
            className="mr-2"
          />
          <span>Enable Featured Products</span>
        </label>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Heading</label>
            <input
              type="text"
              value={config.sections.featured.heading}
              onChange={(e) => updateSection("featured", "heading", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Subheading</label>
            <input
              type="text"
              value={config.sections.featured.subheading}
              onChange={(e) => updateSection("featured", "subheading", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Display Count</label>
            <input
              type="number"
              value={config.sections.featured.displayCount}
              onChange={(e) => updateSection("featured", "displayCount", parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg"
              min="1"
              max="12"
            />
          </div>
        </div>
      </div>

      {/* SEO Settings */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">SEO Settings</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Page Title</label>
            <input
              type="text"
              value={config.seo.title}
              onChange={(e) => updateSEO("title", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Meta Description</label>
            <textarea
              value={config.seo.description}
              onChange={(e) => updateSEO("description", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Keywords (comma-separated)</label>
            <input
              type="text"
              value={config.seo.keywords.join(", ")}
              onChange={(e) =>
                updateSEO(
                  "keywords",
                  e.target.value.split(",").map((k) => k.trim())
                )
              }
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">OG Image URL</label>
            <input
              type="text"
              value={config.seo.ogImage}
              onChange={(e) => updateSEO("ogImage", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

function getDefaultConfig(): HomepageConfig {
  return {
    sections: {
      products: {
        enabled: true,
        heading: "Shop Our Products",
        subheading: "Discover authentic traditional foods from local vendors",
      },
      whyChooseUs: {
        enabled: true,
        heading: "Why Choose RachelFoods?",
        features: [],
      },
      featured: {
        enabled: true,
        heading: "Featured Products",
        subheading: "Hand-picked favorites from our collection",
        displayCount: 6,
      },
      popular: {
        enabled: true,
        heading: "Popular Products",
        subheading: "Customer favorites and bestsellers",
        displayCount: 8,
      },
      newArrivals: {
        enabled: true,
        heading: "New Arrivals",
        subheading: "Fresh additions to our catalog",
        displayCount: 4,
      },
    },
    seo: {
      title: "RachelFoods - Authentic Traditional Foods",
      description: "Shop authentic traditional foods from local vendors",
      keywords: ["traditional foods", "Nigerian food"],
      ogImage: "/og-image.jpg",
    },
  };
}
```

### Step 3: Update Homepage to Use CMS Config

**File: `frontend/app/page.tsx`**

Replace hardcoded content with CMS config:

```tsx
import { Metadata } from "next";
import HeroSlideshow from "@/components/HeroSlideshow";
import ProductGrid from "@/components/ProductGrid";

// Fetch homepage config from CMS
async function getHomepageConfig() {
  try {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const res = await fetch(`${API_BASE}/api/cms/config/homepage`, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!res.ok) {
      throw new Error("Failed to fetch config");
    }

    const data = await res.json();
    return data.config;
  } catch (error) {
    console.error("Homepage config fetch failed:", error);
    return null;
  }
}

// Dynamic metadata from CMS
export async function generateMetadata(): Promise<Metadata> {
  const config = await getHomepageConfig();

  if (!config?.seo) {
    return {
      title: "RachelFoods",
      description: "Authentic traditional foods",
    };
  }

  return {
    title: config.seo.title,
    description: config.seo.description,
    keywords: config.seo.keywords,
    openGraph: {
      title: config.seo.title,
      description: config.seo.description,
      images: [config.seo.ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: config.seo.title,
      description: config.seo.description,
      images: [config.seo.ogImage],
    },
  };
}

export default async function Home() {
  const config = await getHomepageConfig();

  // Fetch products data
  const [featuredProducts, popularProducts, allProducts] = await Promise.all([
    fetchProducts("featured=true"),
    fetchProducts("popular"),
    fetchProducts(""),
  ]);

  const newArrivals = allProducts
    ?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, config?.sections.newArrivals.displayCount || 4);

  return (
    <div className="min-h-screen">
      {/* Hero Section - Managed via Hero Slides */}
      <HeroSlideshow />

      {/* Products Section - CMS Controlled */}
      {config?.sections.products.enabled && (
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">{config.sections.products.heading}</h2>
              <p className="text-xl text-gray-600">{config.sections.products.subheading}</p>
            </div>
          </div>
        </section>
      )}

      {/* Featured Products - CMS Controlled */}
      {config?.sections.featured.enabled && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-4">
              {config.sections.featured.heading}
            </h2>
            <p className="text-center text-gray-600 mb-8">{config.sections.featured.subheading}</p>
            <ProductGrid
              products={featuredProducts?.slice(0, config.sections.featured.displayCount)}
            />
          </div>
        </section>
      )}

      {/* Popular Products - CMS Controlled */}
      {config?.sections.popular.enabled && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-4">
              {config.sections.popular.heading}
            </h2>
            <p className="text-center text-gray-600 mb-8">{config.sections.popular.subheading}</p>
            <ProductGrid
              products={popularProducts?.slice(0, config.sections.popular.displayCount)}
            />
          </div>
        </section>
      )}
    </div>
  );
}

async function fetchProducts(query: string) {
  try {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const res = await fetch(`${API_BASE}/api/products?${query}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || data;
  } catch {
    return [];
  }
}
```

### Step 4: Add Navigation Link in Admin Sidebar

**File: `frontend/components/AdminSidebar.tsx`** (or wherever admin navigation is)

Add link to homepage manager:

```tsx
<Link href="/admin/cms/homepage" className="nav-link">
  🏠 Homepage Manager
</Link>
```

## Usage Instructions

Once implemented, admins can:

1. **Navigate to**: `/admin/cms/homepage`
2. **Edit sections**:
   - Toggle sections on/off
   - Change headings and subheadings
   - Adjust product display counts
3. **Update SEO**:
   - Page title
   - Meta description
   - Keywords
   - Open Graph image
4. **Save changes** - Updates appear immediately on homepage

## Benefits

✅ **No code changes needed** for content updates  
✅ **SEO control** without touching Next.js metadata  
✅ **Section visibility** toggles  
✅ **Consistent with existing CMS** architecture  
✅ **Database-backed** - survives deployments  
✅ **Admin-only access** via RBAC

## Alternative: Use CMS Pages

Instead of homepage config, you could create a `homepage` page via the existing CMS Pages system:

1. Go to `/admin/cms/pages`
2. Create new page with slug `homepage`
3. Add sections for each content block
4. Update `app/page.tsx` to fetch from `/api/cms/pages/homepage`

This gives you more flexibility but requires more setup time.
