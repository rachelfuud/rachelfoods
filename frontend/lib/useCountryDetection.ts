/**
 * IP Geolocation Utility for Auto-Detecting Country Code
 * 
 * This utility provides IP-based country detection to automatically
 * select the appropriate country code in the checkout form.
 * 
 * USAGE:
 * 1. Install in checkout page: import { useCountryDetection } from '@/lib/useCountryDetection';
 * 2. Call hook: const detectedCountry = useCountryDetection();
 * 3. Use in state: countryCode: detectedCountry || '+1'
 */

'use client';

import { useState, useEffect } from 'react';

// Country code mapping from ISO codes to phone codes
const COUNTRY_CODE_MAP: Record<string, string> = {
    'US': '+1',      // United States
    'GB': '+44',     // United Kingdom
    'NG': '+234',    // Nigeria
    'IN': '+91',     // India
    'CN': '+86',     // China
    'JP': '+81',     // Japan
    'DE': '+49',     // Germany
    'FR': '+33',     // France
    'AU': '+61',     // Australia
    'AE': '+971',    // United Arab Emirates
    'CA': '+1',      // Canada (shares +1 with US)
    'ZA': '+27',     // South Africa
    'KE': '+254',    // Kenya
    'GH': '+233',    // Ghana
    'BR': '+55',     // Brazil
    'MX': '+52',     // Mexico
    'IT': '+39',     // Italy
    'ES': '+34',     // Spain
    'NL': '+31',     // Netherlands
    'SE': '+46',     // Sweden
};

const DEFAULT_COUNTRY_CODE = '+1'; // Fallback to US

/**
 * OPTION 1: Free IP Geolocation API (ipapi.co)
 * - Free: 1,000 requests/day
 * - No API key required
 * - Returns country code, city, timezone, etc.
 */
async function detectCountryFromIP_Free(): Promise<string> {
    try {
        const response = await fetch('https://ipapi.co/json/', {
            cache: 'force-cache', // Cache for session
        });

        if (!response.ok) throw new Error('IP detection failed');

        const data = await response.json();
        const countryCode = data.country_code; // e.g., "US", "NG", "GB"

        return COUNTRY_CODE_MAP[countryCode] || DEFAULT_COUNTRY_CODE;
    } catch (error) {
        console.warn('IP geolocation failed, using default:', error);
        return DEFAULT_COUNTRY_CODE;
    }
}

/**
 * OPTION 2: ipify + ipapi (More reliable, still free)
 * - Step 1: Get IP from ipify.org
 * - Step 2: Lookup country from ip-api.com
 * - Free: Unlimited for non-commercial, 45 requests/min for commercial
 */
async function detectCountryFromIP_IpApi(): Promise<string> {
    try {
        // Step 1: Get user's IP
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        const userIp = ipData.ip;

        // Step 2: Get country from IP
        const geoResponse = await fetch(`http://ip-api.com/json/${userIp}`);
        const geoData = await geoResponse.json();

        if (geoData.status !== 'success') throw new Error('Geo lookup failed');

        const countryCode = geoData.countryCode; // e.g., "US", "NG"
        return COUNTRY_CODE_MAP[countryCode] || DEFAULT_COUNTRY_CODE;
    } catch (error) {
        console.warn('IP geolocation failed, using default:', error);
        return DEFAULT_COUNTRY_CODE;
    }
}

/**
 * OPTION 3: Cloudflare (Best for production, requires Cloudflare setup)
 * - Cloudflare automatically adds CF-IPCountry header
 * - You need to pass this from backend
 * - Most accurate and reliable
 */
async function detectCountryFromCloudflare(): Promise<string> {
    try {
        // This requires a backend endpoint that reads the CF-IPCountry header
        const response = await fetch('/api/detect-country');
        const data = await response.json();
        const countryCode = data.country; // e.g., "US"

        return COUNTRY_CODE_MAP[countryCode] || DEFAULT_COUNTRY_CODE;
    } catch (error) {
        console.warn('Cloudflare country detection failed:', error);
        return DEFAULT_COUNTRY_CODE;
    }
}

/**
 * React Hook: Detect country code from IP
 * 
 * Usage in checkout page:
 * ```tsx
 * const detectedCountryCode = useCountryDetection();
 * 
 * const [formData, setFormData] = useState({
 *     countryCode: detectedCountryCode || '+1', // Auto-detected or fallback to US
 *     // ... other fields
 * });
 * ```
 */
export function useCountryDetection() {
    const [countryCode, setCountryCode] = useState<string>(DEFAULT_COUNTRY_CODE);
    const [isDetecting, setIsDetecting] = useState(true);

    useEffect(() => {
        // Check if we've already detected in this session
        const cachedCountry = sessionStorage.getItem('detected_country_code');
        if (cachedCountry) {
            setCountryCode(cachedCountry);
            setIsDetecting(false);
            return;
        }

        // Detect country from IP
        detectCountryFromIP_Free().then((detected) => {
            setCountryCode(detected);
            sessionStorage.setItem('detected_country_code', detected); // Cache for session
            setIsDetecting(false);
        });
    }, []);

    return { countryCode, isDetecting };
}

/**
 * BACKEND ENDPOINT EXAMPLE (for Cloudflare method)
 * 
 * Create: backend/src/geo/geo.controller.ts
 * 
 * ```typescript
 * import { Controller, Get, Req } from '@nestjs/common';
 * 
 * @Controller('api/detect-country')
 * export class GeoController {
 *     @Get()
 *     getCountry(@Req() req: any) {
 *         // Cloudflare adds this header automatically
 *         const country = req.headers['cf-ipcountry'] || 'US';
 *         return { country };
 *     }
 * }
 * ```
 */

/**
 * TO ENABLE IP-BASED DETECTION:
 * 
 * 1. In checkout/page.tsx, add at the top:
 *    ```tsx
 *    import { useCountryDetection } from '@/lib/useCountryDetection';
 *    ```
 * 
 * 2. Inside component:
 *    ```tsx
 *    const { countryCode: detectedCode, isDetecting } = useCountryDetection();
 *    ```
 * 
 * 3. Update initial state:
 *    ```tsx
 *    const [formData, setFormData] = useState({
 *        countryCode: detectedCode, // Auto-detected
 *        // ... rest
 *    });
 *    ```
 * 
 * 4. Update when detection completes:
 *    ```tsx
 *    useEffect(() => {
 *        if (!isDetecting && detectedCode) {
 *            setFormData(prev => ({ ...prev, countryCode: detectedCode }));
 *        }
 *    }, [detectedCode, isDetecting]);
 *    ```
 */

export default useCountryDetection;
