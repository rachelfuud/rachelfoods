# Role–Permission Matrix – RachelFoods

| Permission                  | Admin | Seller | Manager | Delivery | Buyer |
|----------------------------|-------|--------|---------|----------|-------|
| category.create            | ✅    | ✅     | ✅      | ❌       | ❌    |
| product.create             | ✅    | ✅     | ✅      | ❌       | ❌    |
| product.delete             | ✅    | ✅     | ❌      | ❌       | ❌    |
| order.confirm              | ✅    | ✅     | ✅      | ❌       | ❌    |
| shipping.override_cost     | ✅    | ✅     | ❌      | ❌       | ❌    |
| shipping.update_status     | ❌    | ❌     | ❌      | ✅       | ❌    |
| payment.enable_cod         | ❌    | ✅     | ❌      | ❌       | ❌    |
| review.moderate            | ✅    | ✅     | ❌      | ❌       | ❌    |
| referral.view              | ✅    | ✅     | ❌      | ❌       | ✅    |
