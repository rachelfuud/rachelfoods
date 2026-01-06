---

# 📄 `/docs/payments/PAYMENT_SEQUENCE_DIAGRAM.md`

```md
# Payment Sequence Diagram

## Purpose
This document provides **end-to-end payment sequencing** for clarity, debugging, and onboarding.

---

## Prepaid Payment (Successful)

```text
Buyer
  |
  | Place Order
  v
OrderService
  |
  | create Payment (INITIATED)
  v
PaymentService
  |
  | authorize via gateway
  v
Gateway
  |
  | success
  v
PaymentService
  |
  | capture payment
  v
LedgerService
  |
  | write ledger entries
  v
Wallets (Buyer / Seller / Platform)
```
