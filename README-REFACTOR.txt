SKY PIXEL REFACTORED MAP
========================

PURPOSE
-------
This is a safe structural refactor of index(54).html. It keeps the existing
HTML, feature code, execution order, IDs, and weather-file references, but moves
the large inline CSS and JavaScript into separate files.

FILES CREATED
-------------
index.html
sky-pixel-custom.css
sky-pixel-main.js
sky-pixel-road-route-finder.js
sky-pixel-maritime-routes.js
sky-pixel-coordinate-grid.js

The existing files already used by your map are still required, including:
index.css
unmined.js
unmined.map.properties.js
unmined.map.regions.js
custom.markers.js
sky_pixel_landmarks.js
sky_pixel_places.js
sky_pixel_config.js
the lib folder
the map tile/region folders
sky-pixel-weather-openlayers.css
sky-pixel-weather-openlayers.js

INSTALLATION
------------
1. Back up the current test folder.
2. Copy all six files from this package into that same test folder.
3. Replace the existing index.html with the new index.html.
4. Keep every existing map file and folder in place.
5. Test through GitHub Pages or a local HTTP server.
6. Hard-refresh with Ctrl+Shift+R.

WHAT CHANGED
------------
- Seven inline style blocks were moved into sky-pixel-custom.css.
- The giant main inline script was moved into sky-pixel-main.js.
- Road route finder, maritime routes, and coordinate-grid scripts were moved
  into their own files.
- An accidental orphan </style> tag near index.css was removed.
- The OpenLayers weather CSS/JS references at the bottom were preserved.

WHAT DID NOT CHANGE
-------------------
No feature logic, route data, city data, coordinates, IDs, or UI markup was
intentionally redesigned in this pass. This is the low-risk first stage that
makes future debugging and modularization much easier.
