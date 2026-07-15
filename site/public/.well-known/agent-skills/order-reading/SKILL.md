# Order a SoulMetrica reading

## When to use

Use when a user wants to purchase a numerology reading from SoulMetrica.

## Steps

1. Confirm product name (e.g. «Полный разбор», «Сценарий любви»).
2. Collect name, birth date, phone, Telegram @username (required).
3. Open https://soulmetrica.com/ and invoke order modal, or `POST https://soulmetrica.com/api/orders/create` with JSON body documented in /openapi.json.
4. Redirect the user to returned `payUrl` (Unicorn).
5. After payment, point them to https://t.me/soulmetrica_bot

## Constraints

Do not invent prices — refresh from `GET /api/admin/prices?public=1`.
Never submit payment without explicit user confirmation of PII and sum.
