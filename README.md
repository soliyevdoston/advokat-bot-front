# Advokat Bot Frontend (Admin)

Next.js admin panel for the advocate consultation backend.

## Key Admin Pages
- Dashboard: `/dashboard`
- Request Queue: `/requests`
- Payments Moderation: `/payments`
- Client Questions: `/conversations`
- Unresolved/Escalations: `/unresolved`
- Users: `/users`
- Knowledge Base Management: `/knowledge`
- Tariffs: `/tariffs`
- Slots: `/slots`
- Schedule: `/bookings`
- Dynamic System Settings: `/settings`

## Run Local
1. Install:
   ```bash
   npm install
   ```
2. Create env:
   ```bash
   cp .env.example .env.local
   ```
3. Start:
   ```bash
   npm run dev
   ```

## Build
- Type-check: `npm run typecheck`
- Build: `npm run build`

## Environment
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1`
