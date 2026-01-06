# Cash on Delivery (COD) Flow

## Purpose

This document defines the **authoritative COD payment flow** for the Rachel Foods Platform.

COD payments are **not trusted by default** and require **delivery agent confirmation** before funds are captured.

---

## Key Characteristics of COD

- No payment gateway involved
- Payment is marked as CAPTURED **only after delivery**
- Delivery agent is the trusted confirmer
- Ledger entries are created **only after confirmation**

---

## COD Payment Lifecycle

```text
INITIATED
   ↓
(Delivery in progress)
   ↓
CAPTURED (Confirmed by delivery agent)
```
