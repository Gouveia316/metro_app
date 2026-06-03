# Metro Lisboa API Research

## Current Findings

- The public line status endpoint can be called without an OAuth token.
- The official `EstadoServicoML` API requires an OAuth Bearer access token.
- Manual tests against the official `EstadoServicoML` API returned HTTP 200 when called with a valid Bearer token.
- OAuth access tokens expire after 3600 seconds.

## Backend Token Handling

The backend uses OAuth client credentials to request access tokens from:

`METRO_API_TOKEN_URL=https://api.metrolisboa.pt:8243/token`

Official API requests are made against:

`METRO_API_BASE_URL=https://api.metrolisboa.pt:8243/estadoServicoML/1.0.1`

The backend caches the access token in memory and renews it automatically before expiration. The current implementation refreshes the cached token 60 seconds before the API-reported expiry time.

## Required Environment Variables

- `METRO_API_CONSUMER_KEY`
- `METRO_API_CONSUMER_SECRET`
- `METRO_API_TOKEN_URL`
- `METRO_API_BASE_URL`
- `METRO_API_VERIFY_SSL`

Use `backend/.env.example` as a local setup template. Real credentials belong only in local or deployed backend environment variables.

`METRO_API_VERIFY_SSL` defaults to `true` when missing and should remain `true` in production. Local development may need `METRO_API_VERIFY_SSL=false` because the Metro API certificate chain can fail verification in Python on some machines. This development-only setting applies to both OAuth token requests and official API data requests.

## Mobile Safety Rule

Metro API credentials and OAuth access tokens must never be stored in the mobile app. The mobile app should call this backend, and the backend should be the only layer that knows how to request and renew official Metro Lisboa API tokens.

## Backend Response Layers

The `/metro/official/*` endpoints are raw/debug proxy endpoints. They preserve the official Metro API payload shape under the backend wrapper so developers can inspect the source API behavior while keeping OAuth credentials server-side.

The normalized `/metro/*` endpoints are intended for the mobile app. These endpoints convert official Metro API protocol details into stable app-native response shapes, including line IDs, line status values, station coordinates, station line IDs, platform arrivals, and explicit empty states. Mobile clients should eventually consume these normalized responses and avoid official API cleanup logic.

Destination code mapping is intentionally unresolved for now. Normalized arrival responses expose `destinationCode` and set `destinationName` to `null` until a reliable official mapping is added.
