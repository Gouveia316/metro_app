# Roadmap

## MVP 0.1

- Establish `/mobile`, `/backend`, and `/docs` structure.
- Add Expo Router navigation.
- Add core screens: Home, Lines, Stations, Station Detail, Alerts.
- Add FastAPI mock endpoints for health, lines, stations, arrivals, and alerts.
- Use static mocked data only.

## MVP 0.2

- Connect the mobile app to the local FastAPI backend.
- Add loading and error states.
- Improve station search and filtering by line.
- Add favorite station selection using local device storage.
- Add reusable shared types between backend responses and mobile models where practical.

## Future Official Integrations

- Integrate official or approved metro line status data.
- Integrate official or approved station arrival data.
- Integrate official alert/news data.
- Add data freshness indicators and graceful fallback behavior.

## Future Digital Pass/NFC Integration

Digital pass, ticketing, NFC, or payment-related features should only be considered after an official partnership or approved integration path is available.

These features are intentionally excluded from the MVP because they require legal, operational, security, and provider dependencies beyond a simple app foundation.

