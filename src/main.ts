import { Forma } from "forma-embedded-view-sdk/auto";
import "./style.css";

let geojsonId: string | null = null;
let meshId: string | null = null;
let outlineId: string | null = null;
let meshShadowId: string | null = null;
let outlineShadowId: string | null = null;

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
}

async function removeSquare(): Promise<void> {
  if (geojsonId) {
    await Forma.render.geojson.remove({ id: geojsonId });
    geojsonId = null;
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

  // 2. Define square size (100m × 100m), positioned above terrain
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
}

async function showMeshPolygonWithShadow(): Promise<void> {
  if (meshShadowId) {
    await Forma.render.remove({ id: meshShadowId });
    meshShadowId = null;
  }
  if (outlineShadowId) {
    await Forma.render.remove({ id: outlineShadowId });
    outlineShadowId = null;
  }

  // 1. Terrain bounds
  const bbox = await Forma.terrain.getBbox();
  const centerX = (bbox.min.x + bbox.max.x) / 2;
  const centerY = (bbox.min.y + bbox.max.y) / 2;
  
  const elevation = await Forma.terrain.getElevationAt({
    x: centerX,
    y: centerY,
  });

  // 2. Define square size (100m × 100m), positioned above terrain
  const halfSize = 50;
  const targetZ = (elevation ?? 0) + 75;
  
  console.log("Mesh with shadow target Z elevation:", targetZ);

  // 3. Create flat polygon mesh with vertices and triangles (double-sided for shadow)
  const x1 = centerX - halfSize;
  const x2 = centerX + halfSize;
  const y1 = centerY - halfSize;
  const y2 = centerY + halfSize;

  const position = new Float32Array([
    // Front side (visible from above)
    // Triangle 1: bottom-left, bottom-right, top-right
    x1, y1, targetZ,
    x2, y1, targetZ,
    x2, y2, targetZ,
    // Triangle 2: bottom-left, top-right, top-left
    x1, y1, targetZ,
    x2, y2, targetZ,
    x1, y2, targetZ,
    
    // Back side (visible from below) - reversed winding
    // Triangle 1: bottom-left, top-right, bottom-right
    x1, y1, targetZ,
    x2, y2, targetZ,
    x2, y1, targetZ,
    // Triangle 2: bottom-left, top-left, top-right
    x1, y1, targetZ,
    x1, y2, targetZ,
    x2, y2, targetZ,
  ]);

  // Per-vertex colors: RGBA for each of the 12 vertices (red with 60% opacity)
  const color = new Uint8Array(12 * 4);
  for (let i = 0; i < 12; i++) {
    color[i * 4] = 255;     // R
    color[i * 4 + 1] = 0;   // G
    color[i * 4 + 2] = 0;   // B
    color[i * 4 + 3] = 153; // A
  }

  const result = await Forma.render.addMesh({
    geometryData: { position, color },
  });

  meshShadowId = result.id;

  // 4. Create white outline using thin strips (double-sided)
  const lineWidth = 1.5;
  const outlineZ = targetZ + 0.1;

  const outlinePosition = new Float32Array([
    // Bottom edge (y1) - front
    x1, y1 - lineWidth, outlineZ,
    x2, y1 - lineWidth, outlineZ,
    x2, y1 + lineWidth, outlineZ,
    x1, y1 - lineWidth, outlineZ,
    x2, y1 + lineWidth, outlineZ,
    x1, y1 + lineWidth, outlineZ,
    // Bottom edge (y1) - back
    x1, y1 - lineWidth, outlineZ,
    x2, y1 + lineWidth, outlineZ,
    x2, y1 - lineWidth, outlineZ,
    x1, y1 - lineWidth, outlineZ,
    x1, y1 + lineWidth, outlineZ,
    x2, y1 + lineWidth, outlineZ,
    
    // Top edge (y2) - front
    x1, y2 - lineWidth, outlineZ,
    x2, y2 - lineWidth, outlineZ,
    x2, y2 + lineWidth, outlineZ,
    x1, y2 - lineWidth, outlineZ,
    x2, y2 + lineWidth, outlineZ,
    x1, y2 + lineWidth, outlineZ,
    // Top edge (y2) - back
    x1, y2 - lineWidth, outlineZ,
    x2, y2 + lineWidth, outlineZ,
    x2, y2 - lineWidth, outlineZ,
    x1, y2 - lineWidth, outlineZ,
    x1, y2 + lineWidth, outlineZ,
    x2, y2 + lineWidth, outlineZ,
    
    // Left edge (x1) - front
    x1 - lineWidth, y1, outlineZ,
    x1 + lineWidth, y1, outlineZ,
    x1 + lineWidth, y2, outlineZ,
    x1 - lineWidth, y1, outlineZ,
    x1 + lineWidth, y2, outlineZ,
    x1 - lineWidth, y2, outlineZ,
    // Left edge (x1) - back
    x1 - lineWidth, y1, outlineZ,
    x1 + lineWidth, y2, outlineZ,
    x1 + lineWidth, y1, outlineZ,
    x1 - lineWidth, y1, outlineZ,
    x1 - lineWidth, y2, outlineZ,
    x1 + lineWidth, y2, outlineZ,
    
    // Right edge (x2) - front
    x2 - lineWidth, y1, outlineZ,
    x2 + lineWidth, y1, outlineZ,
    x2 + lineWidth, y2, outlineZ,
    x2 - lineWidth, y1, outlineZ,
    x2 + lineWidth, y2, outlineZ,
    x2 - lineWidth, y2, outlineZ,
    // Right edge (x2) - back
    x2 - lineWidth, y1, outlineZ,
    x2 + lineWidth, y2, outlineZ,
    x2 + lineWidth, y1, outlineZ,
    x2 - lineWidth, y1, outlineZ,
    x2 - lineWidth, y2, outlineZ,
    x2 + lineWidth, y2, outlineZ,
  ]);

  // White color for all 48 outline vertices (4 edges × 6 vertices × 2 sides)
  const outlineColor = new Uint8Array(48 * 4);
  for (let i = 0; i < 48; i++) {
    outlineColor[i * 4] = 255;     // R
    outlineColor[i * 4 + 1] = 255; // G
    outlineColor[i * 4 + 2] = 255; // B
    outlineColor[i * 4 + 3] = 255; // A
  }

  const outlineResult = await Forma.render.addMesh({
    geometryData: { position: outlinePosition, color: outlineColor },
  });

  outlineShadowId = outlineResult.id;
}

async function removeMeshWithShadow(): Promise<void> {
  if (meshShadowId) {
    await Forma.render.remove({ id: meshShadowId });
    meshShadowId = null;
  }
  if (outlineShadowId) {
    await Forma.render.remove({ id: outlineShadowId });
    outlineShadowId = null;
  }
}

// Setup UI
document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="container">
    <h1>GeoJSON Elevation Test</h1>
    
    <div class="buttons">
      <button id="show-btn">GeoJSON polygon</button>
      <button id="remove-btn">Remove GeoJSON</button>
    </div>
    
    <div class="buttons">
      <button id="show-mesh-shadow-btn">Mesh with shadow</button>
      <button id="remove-mesh-shadow-btn">Remove</button>
    </div>
    
    <div class="buttons">
      <button id="show-mesh-btn">Mesh without shadow</button>
      <button id="remove-mesh-btn">Remove</button>
    </div>
  </div>
`;

document.getElementById("show-btn")?.addEventListener("click", showFloatingSquare);
document.getElementById("remove-btn")?.addEventListener("click", removeSquare);
document.getElementById("show-mesh-btn")?.addEventListener("click", showMeshPolygon);
document.getElementById("remove-mesh-btn")?.addEventListener("click", removeMesh);
document.getElementById("show-mesh-shadow-btn")?.addEventListener("click", showMeshPolygonWithShadow);
document.getElementById("remove-mesh-shadow-btn")?.addEventListener("click", removeMeshWithShadow);
