# Próximo Metro

Próximo Metro is an independent mobile app for following Metro de Lisboa service. It helps with line status, stations, live arrivals, nearest station lookup, favorite station access, a custom metro map, and service status visualization.

## Disclaimer

PT: App independente. Não afiliada ao Metropolitano de Lisboa.

EN: Independent app. Not affiliated with Metropolitano de Lisboa.

## Tech Stack

- Expo React Native
- TypeScript
- Expo Router
- FastAPI
- Python
- react-native-svg
- expo-location
- AsyncStorage

## Current Mobile Features

- Home page with nearest station card and favorite station card.
- Live arrival previews with destination names.
- Local countdown using `secondsUntilArrival` plus `updatedAt` / `responseUpdatedAt`.
- `mm:ss` countdown for upcoming trains, with `A chegar` / `Arriving` for near arrivals.
- Local mobile in-memory station arrivals cache reused between Home and Station Detail.
- Stations list with line chips and navigation to station detail pages.
- Station Detail page with real-time data and next trains grouped by line and destination/direction.
- Lines tab with line status cards.
- Custom metro diagram preview and fullscreen map.
- Map visually reacts to line status.
- Portuguese as the primary language and English as secondary.
- Dark mode support where applicable.

## Backend Features

Normalized endpoints used by mobile:

- `GET /health`
- `GET /metro/lines/status`
- `GET /metro/stations`
- `GET /metro/wait-times`
- `GET /metro/stations/{stationId}/arrivals`

Raw/debug official proxy endpoints:

- `GET /metro/official/lines`
- `GET /metro/official/stations`
- `GET /metro/official/wait-times`
- `GET /metro/official/destinations`

The mobile app should use the normalized endpoints. The raw official endpoints are mainly for debugging and inspecting official Metro Lisboa API response shapes.

## Backend Normalization

- Official API destination codes are mapped to destination names.
- Wait-time values are treated as seconds, not minutes.
- Backend returns `secondsUntilArrival` and `displayMinutes`.
- Invalid official values like `--` are skipped.
- Closed service payloads like `Circulação encerrada` are handled gracefully.
- Greve/strike messages are treated as interrupted, not closed.
- Normal line status is displayed publicly as `Circulação normal` / `Normal service`.

## Caching

Backend in-memory TTL cache:

- Official line status: 30 seconds
- Official wait-times: 15 seconds
- Official stations: 24 hours
- Official destinations: 24 hours

This reduces calls to the official Metro API. It does not cache user location or personal data. There is no Redis/database cache yet.

Mobile in-memory station arrivals cache:

- Reuses station arrivals between Home and Station Detail.
- Helps keep Home and Station Detail consistent.
- Is not persisted to AsyncStorage.
- User favorite station is stored locally with AsyncStorage.

## Custom Metro Map

The current app uses a custom React Native SVG diagram:

- `mobile/src/components/metro-map/MetroDiagramSvg.tsx`

Source/editable SVG:

- `mobile/src/assets/maps/metro-diagram-final.svg`

The preview hides station labels. The fullscreen map shows station labels.

Line status visual behavior:

- Normal: original line color
- Disrupted: muted original line with warning station dots
- Interrupted: more muted original line with warning station dots
- Closed: grey/muted line, no warning dots
- Unknown: neutral/muted line, no warning dots

Older Wikimedia/reference assets may still be documented in `docs/CREDITS.md`.

## Local Development

Backend:

```powershell
cd backend
.venv\Scripts\activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Mobile:

```powershell
cd mobile
npx expo start -c
```

When using Expo Go on iPhone, do not use `localhost` for the backend URL. Use the computer LAN IP instead, for example:

```text
http://YOUR_PC_LAN_IP:8000
```

Avoid committing personal/local IP addresses in config files. Prefer documenting local setup or using environment variables later.

## Debug And Reset Notes

Before committing, debug constants should be reset:

- `DEBUG_LINE_STATUS_OVERRIDES = null`
- `DEBUG_NEAREST_STATION_ID = null`, if present

Avoid committing local IP changes in `mobile/src/api/config.ts` unless intentionally part of setup.

## Privacy And Location

- Location is foreground only.
- There is no background tracking.
- Coordinates are not sent to the backend.
- Nearest station is calculated locally on device using station coordinates.
- Favorite station is stored locally.

## Attribution And Credits

- Próximo Metro is independent and does not use official Metro branding/logo.
- Do not use the official Metro logo or protected assets without authorization.
- The current app map is custom-made for Próximo Metro.
- Credits for older/reference assets are kept in `docs/CREDITS.md`.

## Suggested Future Improvements

- Backend cache backed by Redis if deployed with multiple instances.
- Environment-based API base URL setup.
- Pull-to-refresh polish.
- Frequency/interval fallback when live arrivals are unavailable.
- Line detail pages.
- Better production deployment configuration.
