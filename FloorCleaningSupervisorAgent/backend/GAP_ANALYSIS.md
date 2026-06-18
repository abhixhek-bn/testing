# Floor Cleaning Supervisor Backend Gap Analysis

## Frontend Screens

### 1. Login
- User roles: `admin`, `cleaner`
- Actions: sign in, role selection, invalid login handling
- Backend support: `login`, `register`

### 2. Admin Dashboard
- Screens: global overview, store-specific dashboard, alerts drill-down, report generation
- Actions: select store, view KPIs, open alerts, generate report
- Backend support: global/store dashboards, alert summary, report generation

### 3. Admin Setup
- Screens: NFC tag registration, registration review, round setup, NFC registry, user creation, system settings
- Actions: register tag, assign location, deploy/cancel checkpoint, configure rounds, manage tags, add/remove users, toggle settings
- Backend support: tag CRUD, checkpoint CRUD, settings CRUD, user CRUD, store round config

### 4. Store Management
- Screens: store list, add/delete store, chatbot summary
- Actions: create store, remove store, summarize stores
- Backend support: store CRUD, store stats

### 5. Alerts
- Screens: all alerts, per-store alerts, alert detail, alert history
- Actions: open alert, mark reviewed, drill into store alert history
- Backend support: alert list/detail/review/history, summary counters

### 6. Cleaner App
- Screens: scan, dashboard, home/profile
- Actions: NFC scan, checkpoint validation, GPS validation, duplicate detection, view progress, edit shift
- Backend support: scan workflow, scan history, stats, dashboard aggregations, user shift update

## Existing APIs

- Auth: `POST /login`, `POST /register`
- Stores: `GET /stores`, `GET /stores/{store_id}`, `PUT /stores/{store_id}/config`
- Tags: `POST /tags/register`, `GET /tags`, `PUT /tags/{tag_id}/assign`, `DELETE /tags/reset/{store_id}`, `GET /tags/stats/{store_id}`
- Checkpoints: `POST /checkpoints`
- Reviews: `GET /registration-review/{checkpoint_id}`, `POST /deploy-checkpoint/{checkpoint_id}`, `POST /cancel-checkpoint/{checkpoint_id}`
- Scans: `POST /scan`
- Settings: `GET /settings/{store_id}`, `PUT /settings/{store_id}`

## Missing APIs Implemented

- `GET /stores/{store_id}/round-config`
- `POST /stores`
- `DELETE /stores/{store_id}`
- `GET /tags/{tag_id}`
- `PUT /tags/{tag_id}/status`
- `DELETE /tags/{tag_id}`
- `GET /checkpoints/{checkpoint_id}`
- `GET /checkpoints`
- `GET /scan/history/{store_id}`
- `GET /scan/stats/{store_id}`
- `GET /alerts`, `GET /alerts/{alert_id}`, `POST /alerts/{alert_id}/review`, `POST /alerts/review-all/{store_id}`
- `GET /dashboard/global`, `GET /dashboard/stores/{store_id}`, `GET /dashboard/cleaner/{user_id}`
- `POST /reports/generate`, `GET /reports`
- `GET /users`, `POST /users`, `PUT /users/{user_id}/shift`, `DELETE /users/{user_id}`
- `GET /audit`

## Database Additions

- Added container support for:
  - `alerts`
  - `rounds`
  - `audit_logs`
  - `reports`
- Added a safe in-memory fallback when Cosmos env vars are missing.

## Business Logic Added

- NFC scan validation
  - tag lookup
  - checkpoint lookup
  - duplicate window detection
  - GPS distance validation
  - inactive tag handling
- Audit trail creation for scans
- Alert generation for duplicate scans, GPS mismatch, missing checkpoint, and low compliance
- Round session tracking and compliance calculation
- Dashboard aggregation for stores, alerts, tags, scans, and cleaner stats

## Validation Notes

- `store_id`, `nfc_tag_uid`, and role values are validated by schema
- GPS tolerance and duplicate window are configurable per store
- Round duration and checkpoint count are range-validated

## Testing Checklist

- Login with admin and cleaner accounts
- Register a tag and assign a location
- Deploy and cancel a checkpoint
- Process a successful scan
- Process a duplicate scan
- Process a GPS-mismatched scan
- Fetch global dashboard
- Fetch store dashboard
- Generate a report
- Create, list, and delete a user
- Update cleaner shift

