# Proximo Metro

Proximo Metro is an independent, unofficial mobile app for following Metro de Lisboa. It helps riders check line status, stations, arrivals and wait times, nearest station, favorite station, alerts, and the network map.

PT: App independente. Nao afiliada ao Metropolitano de Lisboa.  
EN: Independent app. Not affiliated with Metropolitano de Lisboa.

## Stack

- Mobile: Expo React Native, Expo SDK 54, TypeScript
- Backend: FastAPI, Python
- Map rendering: `react-native-svg`
- Location: `expo-location`
- Local storage: AsyncStorage

## Current Features

- Live line status through `GET /metro/lines/status`
- Live station list through `GET /metro/stations`
- Station arrivals through `GET /metro/stations/{stationId}/arrivals`
- Favorite station stored locally with AsyncStorage
- Nearest station detection with foreground location only
- Local Haversine distance calculation on device
- Custom mobile-first metro diagram with preview and fullscreen views
- Map reacts visually to line status
- Portuguese default language, English secondary
- Dark mode readable labels on the map
- Graceful empty/closed states for closed service or unavailable arrivals

## Custom Metro Diagram

The app uses a custom React Native SVG diagram component:

- Component: `mobile/src/components/metro-map/MetroDiagramSvg.tsx`
- Editable/source SVG: `mobile/src/assets/maps/metro-diagram-final.svg`

The diagram is custom-made for Proximo Metro. Line states are represented visually:

- `normal`: original line color
- `disrupted`: muted line with warning station dots
- `interrupted`: more muted line with warning station dots
- `closed`: grey/muted line, no warning dots
- `unknown`: neutral/muted line, no warning dots

Preview mode hides station labels. Fullscreen mode shows station labels.

## Backend Endpoints

Mobile should prefer normalized endpoints. Raw official endpoints are mainly useful for debugging.

- `GET /health`
- `GET /metro/official/lines`
- `GET /metro/official/stations`
- `GET /metro/official/wait-times`
- `GET /metro/lines/status`
- `GET /metro/stations`
- `GET /metro/stations/{stationId}/arrivals`
- `GET /metro/wait-times`

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

When testing on iPhone through Expo Go, do not use `localhost` in the mobile API config. Use the PC LAN address, for example:

```ts
http://YOUR_PC_LAN_IP:8000
```

## Debug Constants

Reset debug constants before committing:

- `DEBUG_LINE_STATUS_OVERRIDES = null`
- `DEBUG_NEAREST_STATION_ID = null`, if present

## Privacy And Location

Location use is foreground only. There is no background tracking. Coordinates are not sent to the backend. Nearest station is calculated locally on the device.

## Attribution And Assets

Older Wikimedia SVG map assets may still exist as reference or backup; credits are kept in `docs/CREDITS.md`.

The current app map is custom and does not use official Metro branding or logo. Do not use the official Metro logo or protected assets without authorization.
