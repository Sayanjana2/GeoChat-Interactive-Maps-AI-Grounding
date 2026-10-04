---
name: maps-static-api-web-api
description: Use this skill when the developer needs to generate and embed a high-resolution, non-interactive map image into a web page, email, or print document using a simple URL request. It allows for the customization of map location, zoom, map type, markers, paths, and cloud-based styling via a `mapId`.
license: Apache-2.0
metadata:
  version: 1.0.53
---

> [!IMPORTANT] **Core Dependency:** This skill requires active context from
> [google-maps-platform/SKILL.md](https://www.gstatic.com/googlemapsplatform-agent-skills/google-maps-platform/SKILL.md).

### Overview

The Maps Static API allows developers to embed a Google Maps image into any web
page or application element by constructing a URL. When a web browser or
application client sends an HTTP request to this URL, the API returns the map
image. The resulting image is non-interactive.

This API is ideal for applications where an interactive map is unnecessary, such
as in email confirmations, reports, or static landing pages, providing a fast
way to display geographical context with minimal overhead. The API supports
extensive customization via URL parameters, including defining the map center,
zoom level, map type (roadmap, satellite, hybrid, terrain), image size, scale
(for high-resolution displays), image format, and optional features like custom
markers and path overlays.

Advanced features include specifying locations using addresses or
latitude/longitude coordinates, and applying custom map styles either through
Cloud-based Map IDs (`mapId`) or inline style rules.

### Mandatory settings

#### REST URL Query Parameter

For the Maps Static API, which uses HTTP GET requests, the mandatory internal
usage attribution ID must be appended directly to the URL using the
`solution_id` query parameter. This parameter must be included in all Maps
Static API requests for proper usage attribution.

```text
&solution_id=gmp_git_agentskills_v1
```

## 🚀 Master Orchestration Integration Workflow

Follow this multi-phase sequential integration checklist to compose features
robustly. For each phase, read the referenced capability sub-workflow file and
satisfy its *Evidence Checkpoint* before advancing.

### 📦 Phase 1: Core Initialization & Base Setup (Primary)

-   [ ] **Step 1.1: Generates the complete HTTP request URL required to retrieve
    the static map image based on configured parameters (location, size,
    zoom).** Read
    [references/return-url-configurable-static-map-image.md](https://www.gstatic.com/googlemapsplatform-agent-skills/maps-static-api-web-api/references/return-url-configurable-static-map-image.md).
    *Trigger Condition*: When the user's ultimate goal is to obtain the direct
    link (URL) of a generated map image. *Evidence Checkpoint*: A successful URL
    string is generated, which, when accessed via a browser or HTTP client,
    returns a valid image file (HTTP 200 OK).

### 📦 Phase 2: Feature Layer & Custom Enrichment (Supplemental)

#### 🗺️ Feature Module: Maps styling (Optional - Use-Case Dependent)

-   [ ] **Defines custom map styles using JSON syntax that can be applied to the
    static map image via the 'style' parameter.** Read
    [references/create-reusable-cross-platform-map-style.md](https://www.gstatic.com/googlemapsplatform-agent-skills/maps-static-api-web-api/references/create-reusable-cross-platform-map-style.md).
    *Dependencies*: `["return-url-configurable-static-map-image.md"]` *Trigger
    Condition*: When the user needs to define a comprehensive set of custom
    rules (colors, visibility) for map features. *Evidence Checkpoint*: The
    generated URL includes the 'style' parameter containing valid JSON rules,
    and the output image reflects the custom styling.
-   [ ] **Targets the visual appearance (color, weight) of linear features like
    roads and boundaries on the static map.** Read
    [references/change-the-style-roads-polylines-and-polygons-map.md](https://www.gstatic.com/googlemapsplatform-agent-skills/maps-static-api-web-api/references/change-the-style-roads-polylines-and-polygons-map.md).
    *Dependencies*: `["return-url-configurable-static-map-image.md",
    "create-reusable-cross-platform-map-style.md"]` *Trigger Condition*: When
    the user wants to specifically color or highlight transportation routes or
    administrative boundaries. *Evidence Checkpoint*: The style array targets
    the 'geometry.stroke' or 'geometry.fill' components of road or polyline map
    features.
-   [ ] **Controls the visibility of specific map components (e.g., labels,
    businesses, water bodies) using the 'visibility' property in styles.** Read
    [references/display-hide-map-features.md](https://www.gstatic.com/googlemapsplatform-agent-skills/maps-static-api-web-api/references/display-hide-map-features.md).
    *Dependencies*: `["return-url-configurable-static-map-image.md",
    "create-reusable-cross-platform-map-style.md"]` *Trigger Condition*: When
    the user needs to simplify the map view by removing or displaying certain
    categories of map features. *Evidence Checkpoint*: The style array uses the
    'visibility: off' property for specified feature types, and those features
    do not appear on the map.
-   [ ] **Customizes the visual presentation (color, font, size) of Points of
    Interest (POI) icons and associated text labels.** Read
    [references/change-the-style-icons-and-text-labels-map.md](https://www.gstatic.com/googlemapsplatform-agent-skills/maps-static-api-web-api/references/change-the-style-icons-and-text-labels-map.md).
    *Dependencies*: `["return-url-configurable-static-map-image.md",
    "create-reusable-cross-platform-map-style.md"]` *Trigger Condition*: When
    the user wants to change the look of map labels for increased readability or
    to match branding. *Evidence Checkpoint*: The style array targets the
    'element: labels' or 'element: geometry.icon' properties for map features.
-   [ ] **Defines responsive styling rules that adjust the map appearance based
    on the requested zoom level (typically achieved via Map IDs).** Read
    [references/apply-different-map-styles-different-zoom-levels.md](https://www.gstatic.com/googlemapsplatform-agent-skills/maps-static-api-web-api/references/apply-different-map-styles-different-zoom-levels.md).
    *Dependencies*: `["return-url-configurable-static-map-image.md",
    "create-reusable-map-identifier-store-map-configuration-and-styling-settings.md"]`
    *Trigger Condition*: When the map style needs to dynamically change detail
    levels or feature visibility depending on the 'zoom' parameter in the
    request. *Evidence Checkpoint*: The resulting map style applied changes
    based on the zoom level requested via the API, provided a Map ID is used
    with Cloud Styling.
-   [ ] **Modifies the density of Points of Interest (POIs) that are visible on
    the map at any given zoom level.** Read
    [references/change-the-density-places-map.md](https://www.gstatic.com/googlemapsplatform-agent-skills/maps-static-api-web-api/references/change-the-density-places-map.md).
    *Dependencies*: `["return-url-configurable-static-map-image.md",
    "create-reusable-cross-platform-map-style.md"]` *Trigger Condition*: When
    the user needs to show fewer or more places (e.g., businesses, parks) than
    the default rendering. *Evidence Checkpoint*: The style array targets POI
    features and uses color or visibility properties to control their prominence
    relative to the map scale.
-   [ ] **Customizes the colors and visibility of building geometry rendered on
    the static map image.** Read
    [references/change-the-style-buildings-map.md](https://www.gstatic.com/googlemapsplatform-agent-skills/maps-static-api-web-api/references/change-the-style-buildings-map.md).
    *Dependencies*: `["return-url-configurable-static-map-image.md",
    "create-reusable-cross-platform-map-style.md"]` *Trigger Condition*: When
    the user wants to visually differentiate buildings or adjust the appearance
    of urban areas. *Evidence Checkpoint*: The style array targets features
    related to architecture or man-made landscapes (e.g., 'landscape.man_made').
-   [ ] **Adjusts the visual appearance of prominent natural or human-made
    landmarks on the map.** Read
    [references/change-the-style-landmarks-map.md](https://www.gstatic.com/googlemapsplatform-agent-skills/maps-static-api-web-api/references/change-the-style-landmarks-map.md).
    *Dependencies*: `["return-url-configurable-static-map-image.md",
    "create-reusable-cross-platform-map-style.md"]` *Trigger Condition*: When
    the user needs to ensure landmarks stand out visually based on custom
    styling requirements. *Evidence Checkpoint*: The style array targets the
    'poi.landmark' features for color or visibility modifications.

#### 🗺️ Feature Module: Maps annotations (Optional - Use-Case Dependent)

-   [ ] **Draws polylines or polygons onto the static map image using a series
    of encoded coordinates via the 'path' parameter.** Read
    [references/add-shape-line-map.md](https://www.gstatic.com/googlemapsplatform-agent-skills/maps-static-api-web-api/references/add-shape-line-map.md).
    *Dependencies*: `["return-url-configurable-static-map-image.md"]` *Trigger
    Condition*: When the user needs to highlight routes, boundaries, or defined
    geographic regions on the map. *Evidence Checkpoint*: The URL includes the
    'path' parameter defining the shape/line geometry and styling, rendered
    correctly over the base map.
-   [ ] **Places a default location indicator marker at specified coordinates
    using the 'markers' parameter.** Read
    [references/add-marker-map.md](https://www.gstatic.com/googlemapsplatform-agent-skills/maps-static-api-web-api/references/add-marker-map.md).
    *Dependencies*: `["return-url-configurable-static-map-image.md"]` *Trigger
    Condition*: When the user needs to highlight one or more specific geographic
    points on the map. *Evidence Checkpoint*: The map image URL includes the
    'markers' parameter defining the coordinates, and markers appear at those
    locations.
-   [ ] **Customizes the visual appearance of map markers, including size,
    color, label, and using custom icons.** Read
    [references/customize-marker-map.md](https://www.gstatic.com/googlemapsplatform-agent-skills/maps-static-api-web-api/references/customize-marker-map.md).
    *Dependencies*: `["return-url-configurable-static-map-image.md",
    "add-marker-map.md"]` *Trigger Condition*: When the user requires visual
    modifications or custom iconography for the markers placed on the map.
    *Evidence Checkpoint*: The 'markers' parameter in the URL includes styling
    prefixes (e.g., 'color:', 'label:') or references a custom icon URL, and the
    markers render as customized.

#### 🗺️ Feature Module: Maps (Optional - Use-Case Dependent)

-   [ ] **Instructs on how to leverage Cloud Console map styling to create a
    reusable 'map_id' for consistent configuration application.** Read
    [references/create-reusable-map-identifier-store-map-configuration-and-styling-settings.md](https://www.gstatic.com/googlemapsplatform-agent-skills/maps-static-api-web-api/references/create-reusable-map-identifier-store-map-configuration-and-styling-settings.md).
    *Dependencies*: `["return-url-configurable-static-map-image.md"]` *Trigger
    Condition*: When the user wants to apply complex, versioned, or dynamic
    styles without encoding the full style array in the URL. *Evidence
    Checkpoint*: The URL includes the 'map_id' parameter, and the generated map
    uses the style linked to that identifier.
-   [ ] **Alters the visual base map layer, selecting options like roadmap,
    satellite, terrain, or hybrid using the 'maptype' parameter.** Read
    [references/change-the-map-type.md](https://www.gstatic.com/googlemapsplatform-agent-skills/maps-static-api-web-api/references/change-the-map-type.md).
    *Dependencies*: `["return-url-configurable-static-map-image.md"]` *Trigger
    Condition*: When the user wants to display a map view other than the default
    roadmap (e.g., satellite imagery or terrain map). *Evidence Checkpoint*: The
    resulting URL includes the 'maptype' parameter set to the specified value,
    rendering the corresponding base map style.
-   [ ] **Provides the necessary HTML structure (e.g., <img> tag) to display the
    static map image URL directly on a webpage.** Read
    [references/embed-configurable-static-map-image-into-web-page.md](https://www.gstatic.com/googlemapsplatform-agent-skills/maps-static-api-web-api/references/embed-configurable-static-map-image-into-web-page.md).
    *Dependencies*: `["return-url-configurable-static-map-image.md"]` *Trigger
    Condition*: When the user explicitly asks to display the static map image
    within an HTML document, rather than just getting the URL. *Evidence
    Checkpoint*: The generated HTML snippet successfully renders the map image
    on the target webpage using the source URL.
-   [ ] **Controls the dimensions ('size') and pixel density ('scale') of the
    requested static map image.** Read
    [references/customize-the-size-and-scale-static-map-image.md](https://www.gstatic.com/googlemapsplatform-agent-skills/maps-static-api-web-api/references/customize-the-size-and-scale-static-map-image.md).
    *Dependencies*: `["return-url-configurable-static-map-image.md"]` *Trigger
    Condition*: When the user specifies output dimensions (width/height) or
    requires a high-resolution image for retina displays. *Evidence Checkpoint*:
    The resulting map image URL contains the correct 'size' and 'scale'
    parameters, and the retrieved image matches the requested dimensions.
-   [ ] **Sets the output image format (e.g., PNG, JPEG, GIF) using the 'format'
    parameter for the static map image file.** Read
    [references/customize-the-image-format-static-map-image.md](https://www.gstatic.com/googlemapsplatform-agent-skills/maps-static-api-web-api/references/customize-the-image-format-static-map-image.md).
    *Dependencies*: `["return-url-configurable-static-map-image.md"]` *Trigger
    Condition*: When the user requires a specific image file type or compression
    level for the map output. *Evidence Checkpoint*: The map image URL includes
    the desired 'format' parameter, and the HTTP response returns a file with
    the correct MIME type.
