# Demo Logos

Place client logos here for sales demos.

## Current Demos

- **interbrand-logo.png** - Interbrand demo
- **nike-logo.png** - Nike demo  
- **cocacola-logo.png** - Coca-Cola demo

## Adding a New Demo

1. Upload logo to this folder: `client-name-logo.png`
2. Add theme config in `src/config/demoThemes.ts`
3. Add route in `src/App.tsx`: `<Route path="/client-name/*" element={<Index />} />`
4. Deploy and share: `axessvideo.com/client-name`

## Logo Requirements

- Format: PNG or SVG preferred
- Size: Recommend 200-400px height
- Transparent background recommended
- Optimize for web (compress images)
