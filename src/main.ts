import { Forma } from "forma-embedded-view-sdk/auto";
import "./style.css";

let geojsonId: string | null = null;
let meshId: string | null = null;
let outlineId: string | null = null;
let extrudedId: string | null = null;

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
  
  // Calculate target Z: terrain elevation + 100m above
  const targetZ = (elevation ?? 0) + 100;
  console.log("Target Z elevation:", targetZ);

  // Use 2D coordinates (no Z value) - polygon will stay on terrain
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
        },
      },
    ],
  };

  const result = await Forma.render.geojson.add({
    geojson: square,
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

async function showMeshPolygon(): Promise<void> {
  if (meshId) {
    await Forma.render.remove({ id: meshId });
    meshId = null;
  }
  if (outlineId) {
    await Forma.render.remove({ id: outlineId });
    outlineId = null;
  }

  // 1. Terrain bounds
  const bbox = await Forma.terrain.getBbox();
  const centerX = (bbox.min.x + bbox.max.x) / 2;
  const centerY = (bbox.min.y + bbox.max.y) / 2;
  
  const elevation = await Forma.terrain.getElevationAt({
    x: centerX,
    y: centerY,
  });

  // 2. Define square size (100m × 100m), positioned 150m above terrain (above the GeoJSON)
  const halfSize = 50;
  const targetZ = (elevation ?? 0) + 150;
  
  console.log("Mesh target Z elevation:", targetZ);

  // 3. Create flat polygon mesh with vertices and triangles
  // Use 6 vertices for 2 triangles (no indexing to ensure both render)
  const x1 = centerX - halfSize;
  const x2 = centerX + halfSize;
  const y1 = centerY - halfSize;
  const y2 = centerY + halfSize;

  const position = new Float32Array([
    // Triangle 1: bottom-left, bottom-right, top-right
    x1, y1, targetZ,
    x2, y1, targetZ,
    x2, y2, targetZ,
    // Triangle 2: bottom-left, top-right, top-left
    x1, y1, targetZ,
    x2, y2, targetZ,
    x1, y2, targetZ,
  ]);

  // Per-vertex colors: RGBA for each of the 6 vertices (red with 60% opacity)
  const color = new Uint8Array([
    255, 0, 0, 153,  // vertex 0
    255, 0, 0, 153,  // vertex 1
    255, 0, 0, 153,  // vertex 2
    255, 0, 0, 153,  // vertex 3
    255, 0, 0, 153,  // vertex 4
    255, 0, 0, 153,  // vertex 5
  ]);

  const result = await Forma.render.addMesh({
    geometryData: { position, color },
  });

  meshId = result.id;

  // 4. Create white outline using thin strips
  const lineWidth = 1.5; // Width of the outline in meters
  const outlineZ = targetZ + 0.1; // Slightly above the fill to avoid z-fighting

  // Each edge needs 2 triangles (a strip). We'll create 4 edges.
  const outlinePosition = new Float32Array([
    // Bottom edge (y1)
    x1, y1 - lineWidth, outlineZ,
    x2, y1 - lineWidth, outlineZ,
    x2, y1 + lineWidth, outlineZ,
    x1, y1 - lineWidth, outlineZ,
    x2, y1 + lineWidth, outlineZ,
    x1, y1 + lineWidth, outlineZ,
    
    // Top edge (y2)
    x1, y2 - lineWidth, outlineZ,
    x2, y2 - lineWidth, outlineZ,
    x2, y2 + lineWidth, outlineZ,
    x1, y2 - lineWidth, outlineZ,
    x2, y2 + lineWidth, outlineZ,
    x1, y2 + lineWidth, outlineZ,
    
    // Left edge (x1)
    x1 - lineWidth, y1, outlineZ,
    x1 + lineWidth, y1, outlineZ,
    x1 + lineWidth, y2, outlineZ,
    x1 - lineWidth, y1, outlineZ,
    x1 + lineWidth, y2, outlineZ,
    x1 - lineWidth, y2, outlineZ,
    
    // Right edge (x2)
    x2 - lineWidth, y1, outlineZ,
    x2 + lineWidth, y1, outlineZ,
    x2 + lineWidth, y2, outlineZ,
    x2 - lineWidth, y1, outlineZ,
    x2 + lineWidth, y2, outlineZ,
    x2 - lineWidth, y2, outlineZ,
  ]);

  // White color for all 24 outline vertices (4 edges × 6 vertices each)
  const outlineColor = new Uint8Array(24 * 4);
  for (let i = 0; i < 24; i++) {
    outlineColor[i * 4] = 255;     // R
    outlineColor[i * 4 + 1] = 255; // G
    outlineColor[i * 4 + 2] = 255; // B
    outlineColor[i * 4 + 3] = 255; // A
  }

  const outlineResult = await Forma.render.addMesh({
    geometryData: { position: outlinePosition, color: outlineColor },
  });

  outlineId = outlineResult.id;
  updateStatus(`Mesh square with outline added. Floating 150m above terrain.`);
}

async function removeMesh(): Promise<void> {
  if (meshId) {
    await Forma.render.remove({ id: meshId });
    meshId = null;
  }
  if (outlineId) {
    await Forma.render.remove({ id: outlineId });
    outlineId = null;
  }
  updateStatus("Mesh removed");
}

async function showExtrudedPolygon(): Promise<void> {
  if (extrudedId) {
    await Forma.render.remove({ id: extrudedId });
    extrudedId = null;
  }

  // 1. Terrain bounds
  const bbox = await Forma.terrain.getBbox();
  const centerX = (bbox.min.x + bbox.max.x) / 2;
  const centerY = (bbox.min.y + bbox.max.y) / 2;
  
  const elevation = await Forma.terrain.getElevationAt({
    x: centerX,
    y: centerY,
  });

  // 2. Define square size (100m × 100m)
  // Position: 200m above terrain (above the mesh at 150m)
  const halfSize = 50;
  const baseZ = (elevation ?? 0) + 200; // elevation property
  const height = 1; // height property

  const x1 = centerX - halfSize;
  const x2 = centerX + halfSize;
  const y1 = centerY - halfSize;
  const y2 = centerY + halfSize;
  const z1 = baseZ;
  const z2 = baseZ + height;

  // 3. Create extruded polygon mesh (box with 6 faces)
  // Each face needs 2 triangles = 6 vertices
  const position = new Float32Array([
    // Bottom face (z1)
    x1, y1, z1,  x2, y1, z1,  x2, y2, z1,
    x1, y1, z1,  x2, y2, z1,  x1, y2, z1,
    
    // Top face (z2)
    x1, y1, z2,  x2, y2, z2,  x2, y1, z2,
    x1, y1, z2,  x1, y2, z2,  x2, y2, z2,
    
    // Front face (y1)
    x1, y1, z1,  x2, y1, z2,  x2, y1, z1,
    x1, y1, z1,  x1, y1, z2,  x2, y1, z2,
    
    // Back face (y2)
    x1, y2, z1,  x2, y2, z1,  x2, y2, z2,
    x1, y2, z1,  x2, y2, z2,  x1, y2, z2,
    
    // Left face (x1)
    x1, y1, z1,  x1, y2, z2,  x1, y1, z2,
    x1, y1, z1,  x1, y2, z1,  x1, y2, z2,
    
    // Right face (x2)
    x2, y1, z1,  x2, y1, z2,  x2, y2, z2,
    x2, y1, z1,  x2, y2, z2,  x2, y2, z1,
  ]);

  // Red color for all 36 vertices (6 faces × 6 vertices)
  const color = new Uint8Array(36 * 4);
  for (let i = 0; i < 36; i++) {
    color[i * 4] = 255;     // R
    color[i * 4 + 1] = 0;   // G
    color[i * 4 + 2] = 0;   // B
    color[i * 4 + 3] = 153; // A (~60% opacity)
  }

  const result = await Forma.render.addMesh({
    geometryData: { position, color },
  });

  extrudedId = result.id;
  updateStatus(`ExtrudedPolygon added: elevation=${baseZ.toFixed(1)}m, height=${height}m`);
}

async function removeExtruded(): Promise<void> {
  if (extrudedId) {
    await Forma.render.remove({ id: extrudedId });
    extrudedId = null;
  }
  updateStatus("ExtrudedPolygon removed");
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
      <strong>Approach:</strong> Using 3D coordinates with Z value (terrain elevation + 100m) 
      in each polygon vertex instead of transform or properties.elevation.
    </p>
    
    <div class="buttons">
      <button id="show-btn">Show GeoJSON Square</button>
      <button id="remove-btn">Remove GeoJSON</button>
    </div>
    
    <div class="buttons">
      <button id="show-mesh-btn">Show Mesh Polygon</button>
      <button id="remove-mesh-btn">Remove Mesh</button>
    </div>
    
    <div class="buttons">
      <button id="show-extruded-btn">Show ExtrudedPolygon</button>
      <button id="remove-extruded-btn">Remove Extruded</button>
    </div>
    
    <div id="status" class="status">Click "Show Floating Square" to test</div>
    
    <div class="code-block">
      <h3>Code using 3D coordinates:</h3>
      <pre>
// Using Z coordinate in vertices
const targetZ = terrainElevation + 100;

coordinates: [[
  [x1, y1, targetZ],
  [x2, y2, targetZ],
  [x3, y3, targetZ],
  [x4, y4, targetZ],
  [x1, y1, targetZ],
]]

await Forma.render.geojson.add({
  geojson: square
});
      </pre>
    </div>
  </div>
`;

document.getElementById("show-btn")?.addEventListener("click", showFloatingSquare);
document.getElementById("remove-btn")?.addEventListener("click", removeSquare);
document.getElementById("show-mesh-btn")?.addEventListener("click", showMeshPolygon);
document.getElementById("remove-mesh-btn")?.addEventListener("click", removeMesh);
document.getElementById("show-extruded-btn")?.addEventListener("click", showExtrudedPolygon);
document.getElementById("remove-extruded-btn")?.addEventListener("click", removeExtruded);
