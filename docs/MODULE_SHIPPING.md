# Shipping Module – RachelFoods

## Purpose
The Shipping Module provides a unified, rule-governed delivery system for the RachelFoods platform.

It supports:
- In-house (internal) delivery agents
- Third-party logistics providers (3PL)
- Custom or manual shipping arrangements

All shipping methods must comply with RachelFoods core principles:
- Seller-controlled order confirmation
- Weight + distance–based pricing
- Human-assisted workflow
- Full tracking and transparency

## Core Principles
- Shipping providers do NOT control order lifecycle
- All shipping passes through the Shipping Engine
- Seller approval is mandatory before shipping is scheduled
- Payment is gated until shipping is confirmed

## Scope
- Shipping cost calculation
- Provider selection and assignment
- Delivery window handling
- Tracking and status updates
- Shipping overrides by seller/admin
- Field mapping for external providers

## Supported Provider Types
1. Internal (RachelFoods delivery agents)
2. Third-party providers (e.g. courier companies)
3. Custom/manual providers

## Order Status Flow (Shipping Related)
Pending  
→ Seller Confirmed  
→ Shipping Scheduled  
→ In Transit  
→ Delivered  
→ Fulfilled  

Shipping providers may only update **shipping-related states**, not business order states.

## Seller/Admin Capabilities
- Enable or disable shipping providers
- Set default and fallback providers
- Assign provider per order
- Override shipping cost (with audit logging)
- Define delivery windows

## Buyer Experience
- View shipping cost estimate
- Select preferred delivery window
- Track shipment progress
- Receive notifications on shipping updates
