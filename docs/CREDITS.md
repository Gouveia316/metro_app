# Credits

## Current App Map

- Current app map: custom diagram created for Próximo Metro.
- Local component: `mobile/src/components/metro-map/MetroDiagramSvg.tsx`
- Local design asset: `mobile/src/assets/maps/metro-diagram-final.svg`

The current app map is not an official Metropolitano de Lisboa map and does not use official Metro logo assets.

## Preserved Wikimedia SVG Map

- Source: https://upload.wikimedia.org/wikipedia/commons/8/88/Mapa_Metropolitano_de_Lisboa_2016.svg
- Author: Rúdisicyon, via Wikimedia Commons
- License: CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/
- Original local file: `mobile/src/assets/maps/lisbon-metro-map-2016.svg`
- Mobile display derivative: `mobile/src/assets/maps/lisbon-metro-map-2016-cropped.svg`
- Changes: the mobile display derivative adjusts the root SVG `viewBox`, `width`, and `height` so the preview focuses on the metro network. The original SVG asset is preserved unchanged.
- Current usage: these Wikimedia SVG assets are preserved in the project but are not the map currently rendered in the app UI.

Próximo Metro is an independent Lisbon Metro companion app and is not affiliated with Metropolitano de Lisboa.
