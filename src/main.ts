import { Forma } from "forma-embedded-view-sdk/auto";
import "./style.css";

type Transform = [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number
];

let geojsonId: string | null = null;

async function showFloatingSquare(): Promise<void> {
  if (geojsonId) {
    await Forma.render.geojson.remove({ id: geojsonId });
    geojsonId = null;
  }

  // 1. Terrain bounds
  const bbox = await Forma.terrain.getBbox();
  const centerX = (bbox.min.x + bbox.max.x) / 2;
  const centerY = (bbox.min.y + bbox.max.y) / 2;
  
  const elevation = await Forma.terrain.getElevationAt({
    x: centerX,
    y: centerY,
  });
  
  console.log("Terrain elevation at center:", elevation);

  // 2. Define square size (100m × 100m)
  const halfSize = 50;

  const square = {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        geometry: {
          type: "Polygon" as const,
          coordinates: [[
            [centerX - halfSize, centerY - halfSize],
            [centerX + halfSize, centerY - halfSize],
            [centerX + halfSize, centerY + halfSize],
            [centerX - halfSize, centerY + halfSize],
            [centerX - halfSize, centerY - halfSize],
          ]],
        },
        properties: {
          fill: "#ff0000",
          "fill-opacity": 0.6,
          stroke: "#ffffff",
          "stroke-width": 2,
          "stroke-opacity": 1,
          elevation: 100, // Attempt 1: elevation property (doesn't work)
        },
      },
    ],
  };

  // 3. Attempt to lift square 100m above terrain using transform (doesn't work)
  const transform: Transform = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 100, 1,  // Translate Z by 100m
  ];

  const result = await Forma.render.geojson.add({
    geojson: square,
    transform,
  });
  
  geojsonId = result.id;
  updateStatus(`GeoJSON added with id: ${geojsonId}. Transform and elevation property don't elevate the polygon.`);
}

async function removeSquare(): Promise<void> {
  if (geojsonId) {
    await Forma.render.geojson.remove({ id: geojsonId });
    geojsonId = null;
    updateStatus("GeoJSON removed");
  }
}

function updateStatus(message: string): void {
  const statusEl = document.getElementById("status");
  if (statusEl) {
    statusEl.textContent = message;
  }
}

// Setup UI
document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="container">
    <h1>GeoJSON Elevation Test</h1>
    <p class="description">
      This extension reproduces a problem from the Forma Developer Forum:
      <br><br>
      <strong>Issue:</strong> Neither the <code>transform</code> parameter nor 
      <code>elevation</code> property can lift a rendered GeoJSON polygon above the terrain.
    </p>
    
    <div class="buttons">
      <button id="show-btn">Show Floating Square</button>
      <button id="remove-btn">Remove Square</button>
    </div>
    
    <div id="status" class="status">Click "Show Floating Square" to test</div>
    
    <div class="code-block">
      <h3>Code attempting elevation:</h3>
      <pre>
// Attempt 1: elevation property
properties: {
  elevation: 100
}

// Attempt 2: transform matrix
const transform = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 100, 1  // Z translation
];

await Forma.render.geojson.add({
  geojson: square,
  transform
});
      </pre>
    </div>
  </div>
`;

document.getElementById("show-btn")?.addEventListener("click", showFloatingSquare);
document.getElementById("remove-btn")?.addEventListener("click", removeSquare);
