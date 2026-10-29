# Cairn

One-tap roadside mapping for OSM

## Purpose

Cairn is a tool to help map roadside features in OpenStreetMap. It is designed to be used while travelling, to quickly and easily map roadside features such as speed limits, EV chargers, petrol stations, parkings, traffic lights, settlements, etc. It is designed to be used with a mobile device using as few taps as possible.

## Planned Features

- ✅ 6 buttons per screen
- ✅ quick entry
- store coordinates, the POI / note, heading, speed?
- categories: speed limits, amenity, parking, petrol station, charger...
- swipe left-right for more options, up-down for the next category
- see items on a map
  - see if item already exists
- keep screen on
- export to a file or upload to OSM directly
- voice notes
- undo button
- expand to "walking mode" in addition to "driving mode"

## Tech Stack

- SvelteKit (TypeScript, static SPA / PWA via `adapter-static`)
- MapLibre GL JS for maps
- npm

## Development

Setup.
Infrastructure frameworks are maintained using `mise`, so set that up first.

```sh
mise install
npm install

npm run dev
```

## Deployment

Hosted as static assets on Cloudflare (config in `wrangler.jsonc`). First run `npx wrangler login`, then:

```sh
npm run deploy
```

## License

Copyright (C) Alen Šiljak

Waymarq is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. See [LICENSE](LICENSE).
