// ============================================
// SPATIAL HASH GRID - O(1) Collision Lookups
// ============================================

export interface TileRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SnapLine {
  type: 'vertical' | 'horizontal';
  position: number;  // x for vertical, y for horizontal
  start: number;     // start of the line segment
  end: number;       // end of the line segment
}

export interface SnapResult {
  x: number;
  y: number;
  snapLines: SnapLine[];
}

/**
 * SpatialHashGrid divides 2D space into fixed-size cells.
 * Each cell stores the IDs of tiles that overlap it.
 * Collision queries only check tiles in overlapping cells → O(1) average.
 */
export class SpatialHashGrid {
  private cellSize: number;
  private grid: Map<string, Set<string>>;
  private rects: Map<string, TileRect>;

  constructor(cellSize = 100) {
    this.cellSize = cellSize;
    this.grid = new Map();
    this.rects = new Map();
  }

  private getKey(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  private getCells(x: number, y: number, w: number, h: number): string[] {
    const cs = this.cellSize;
    const minCX = Math.floor(x / cs);
    const minCY = Math.floor(y / cs);
    const maxCX = Math.floor((x + w) / cs);
    const maxCY = Math.floor((y + h) / cs);
    const keys: string[] = [];
    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        keys.push(this.getKey(cx, cy));
      }
    }
    return keys;
  }

  /** Clear and rebuild the grid from a list of tile rects */
  rebuild(tiles: TileRect[]): void {
    this.grid.clear();
    this.rects.clear();
    for (const tile of tiles) {
      this.insert(tile);
    }
  }

  /** Insert a tile into the grid */
  insert(tile: TileRect): void {
    this.rects.set(tile.id, tile);
    const cells = this.getCells(tile.x, tile.y, tile.width, tile.height);
    for (const key of cells) {
      if (!this.grid.has(key)) this.grid.set(key, new Set());
      this.grid.get(key)!.add(tile.id);
    }
  }

  /** Remove a tile from the grid */
  remove(id: string): void {
    const rect = this.rects.get(id);
    if (!rect) return;
    const cells = this.getCells(rect.x, rect.y, rect.width, rect.height);
    for (const key of cells) {
      this.grid.get(key)?.delete(id);
    }
    this.rects.delete(id);
  }

  /** Update a tile's position/size */
  update(tile: TileRect): void {
    this.remove(tile.id);
    this.insert(tile);
  }

  /** Get candidate tile IDs that might overlap the given rect (excludes excludeId) */
  queryCandidates(x: number, y: number, w: number, h: number, excludeId?: string): Set<string> {
    const cells = this.getCells(x, y, w, h);
    const candidates = new Set<string>();
    for (const key of cells) {
      const cellTiles = this.grid.get(key);
      if (cellTiles) {
        for (const id of cellTiles) {
          if (id !== excludeId) candidates.add(id);
        }
      }
    }
    return candidates;
  }

  /** Check if a rect overlaps any tile (with gap), returns overlapping tile IDs */
  getOverlapping(x: number, y: number, w: number, h: number, excludeId: string, gap = 0): string[] {
    const candidates = this.queryCandidates(x - gap, y - gap, w + gap * 2, h + gap * 2, excludeId);
    const overlapping: string[] = [];
    for (const candidateId of candidates) {
      const rect = this.rects.get(candidateId);
      if (!rect) continue;
      // AABB overlap check with gap
      if (
        x < rect.x + rect.width + gap &&
        x + w + gap > rect.x &&
        y < rect.y + rect.height + gap &&
        y + h + gap > rect.y
      ) {
        overlapping.push(candidateId);
      }
    }
    return overlapping;
  }

  /** Check if a rect overlaps any tile */
  hasOverlap(x: number, y: number, w: number, h: number, excludeId: string, gap = 0): boolean {
    return this.getOverlapping(x, y, w, h, excludeId, gap).length > 0;
  }

  /** Find nearest non-overlapping position using spatial hash (much faster than spiral) */
  findNonOverlapping(
    targetX: number,
    targetY: number,
    w: number,
    h: number,
    excludeId: string,
    gridSnap: number,
    gap = 8,
    maxSearch = 500
  ): { x: number; y: number } {
    const snap = (v: number) => Math.round(v / gridSnap) * gridSnap;
    const sx = snap(Math.max(0, targetX));
    const sy = snap(Math.max(0, targetY));

    if (!this.hasOverlap(sx, sy, w, h, excludeId, gap)) {
      return { x: sx, y: sy };
    }

    // Expanding ring search using grid-aligned steps
    // This is still a search, but with O(1) overlap checks per position
    for (let radius = gridSnap; radius <= maxSearch; radius += gridSnap) {
      // Check 4 cardinal directions first (most likely to find space)
      const cardinals = [
        { x: snap(Math.max(0, targetX + radius)), y: sy },
        { x: snap(Math.max(0, targetX - radius)), y: sy },
        { x: sx, y: snap(Math.max(0, targetY + radius)) },
        { x: sx, y: snap(Math.max(0, targetY - radius)) },
      ];
      for (const pos of cardinals) {
        if (!this.hasOverlap(pos.x, pos.y, w, h, excludeId, gap)) {
          return pos;
        }
      }

      // Check diagonals
      const diagonals = [
        { x: snap(Math.max(0, targetX + radius)), y: snap(Math.max(0, targetY + radius)) },
        { x: snap(Math.max(0, targetX - radius)), y: snap(Math.max(0, targetY + radius)) },
        { x: snap(Math.max(0, targetX + radius)), y: snap(Math.max(0, targetY - radius)) },
        { x: snap(Math.max(0, targetX - radius)), y: snap(Math.max(0, targetY - radius)) },
      ];
      for (const pos of diagonals) {
        if (!this.hasOverlap(pos.x, pos.y, w, h, excludeId, gap)) {
          return pos;
        }
      }
    }

    return { x: sx, y: sy };
  }

  /** Get the stored rect for a tile */
  getRect(id: string): TileRect | undefined {
    return this.rects.get(id);
  }

  /** Get all stored rects */
  getAllRects(): TileRect[] {
    return Array.from(this.rects.values());
  }
}


// ============================================
// MAGNETIC EDGE SNAPPING
// ============================================

/**
 * Calculates magnetic snap positions when a tile is near edges of other tiles.
 * Returns adjusted x/y and visual snap guide lines.
 */
export function getMagneticSnap(
  x: number,
  y: number,
  w: number,
  h: number,
  allTiles: TileRect[],
  excludeId: string,
  threshold = 10,
  containerHeight = 5000
): SnapResult {
  let snapX = x;
  let snapY = y;
  const snapLines: SnapLine[] = [];

  // Edges of the dragged tile
  const left = x;
  const right = x + w;
  const top = y;
  const bottom = y + h;
  const centerX = x + w / 2;
  const centerY = y + h / 2;

  let bestDx = threshold + 1;
  let bestDy = threshold + 1;
  let snapXTarget: number | null = null;
  let snapYTarget: number | null = null;

  for (const tile of allTiles) {
    if (tile.id === excludeId) continue;

    const tLeft = tile.x;
    const tRight = tile.x + tile.width;
    const tTop = tile.y;
    const tBottom = tile.y + tile.height;
    const tCenterX = tile.x + tile.width / 2;
    const tCenterY = tile.y + tile.height / 2;

    // Horizontal snaps (adjusting X)
    const xEdgePairs = [
      { dragEdge: left, tileEdge: tLeft, offset: 0 },          // left-to-left
      { dragEdge: left, tileEdge: tRight, offset: 0 },         // left-to-right
      { dragEdge: right, tileEdge: tLeft, offset: -w },        // right-to-left
      { dragEdge: right, tileEdge: tRight, offset: -w },       // right-to-right
      { dragEdge: centerX, tileEdge: tCenterX, offset: -w / 2 }, // center-to-center
    ];

    for (const pair of xEdgePairs) {
      const dist = Math.abs(pair.dragEdge - pair.tileEdge);
      if (dist < bestDx) {
        bestDx = dist;
        snapXTarget = pair.tileEdge + pair.offset;
      }
    }

    // Vertical snaps (adjusting Y)
    const yEdgePairs = [
      { dragEdge: top, tileEdge: tTop, offset: 0 },           // top-to-top
      { dragEdge: top, tileEdge: tBottom, offset: 0 },        // top-to-bottom
      { dragEdge: bottom, tileEdge: tTop, offset: -h },       // bottom-to-top
      { dragEdge: bottom, tileEdge: tBottom, offset: -h },    // bottom-to-bottom
      { dragEdge: centerY, tileEdge: tCenterY, offset: -h / 2 }, // center-to-center
    ];

    for (const pair of yEdgePairs) {
      const dist = Math.abs(pair.dragEdge - pair.tileEdge);
      if (dist < bestDy) {
        bestDy = dist;
        snapYTarget = pair.tileEdge + pair.offset;
      }
    }
  }

  // Apply snaps if within threshold
  if (bestDx <= threshold && snapXTarget !== null) {
    snapX = Math.max(0, snapXTarget);
    // Determine which edge snapped for the guide line
    const snappedLeft = snapX;
    const snappedRight = snapX + w;
    const snappedCenter = snapX + w / 2;

    // Find the matching edge to draw the guide line
    for (const tile of allTiles) {
      if (tile.id === excludeId) continue;
      const edges = [tile.x, tile.x + tile.width, tile.x + tile.width / 2];
      for (const edge of edges) {
        if (Math.abs(snappedLeft - edge) < 1 || Math.abs(snappedRight - edge) < 1 || Math.abs(snappedCenter - edge) < 1) {
          snapLines.push({
            type: 'vertical',
            position: edge,
            start: Math.min(y, tile.y) - 20,
            end: Math.max(y + h, tile.y + tile.height) + 20,
          });
        }
      }
    }
  }

  if (bestDy <= threshold && snapYTarget !== null) {
    snapY = Math.max(0, snapYTarget);
    const snappedTop = snapY;
    const snappedBottom = snapY + h;
    const snappedCenter = snapY + h / 2;

    for (const tile of allTiles) {
      if (tile.id === excludeId) continue;
      const edges = [tile.y, tile.y + tile.height, tile.y + tile.height / 2];
      for (const edge of edges) {
        if (Math.abs(snappedTop - edge) < 1 || Math.abs(snappedBottom - edge) < 1 || Math.abs(snappedCenter - edge) < 1) {
          snapLines.push({
            type: 'horizontal',
            position: edge,
            start: Math.min(x, tile.x) - 20,
            end: Math.max(x + w, tile.x + tile.width) + 20,
          });
        }
      }
    }
  }

  // Deduplicate snap lines
  const uniqueLines: SnapLine[] = [];
  const seen = new Set<string>();
  for (const line of snapLines) {
    const key = `${line.type}-${Math.round(line.position)}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueLines.push(line);
    }
  }

  return { x: snapX, y: snapY, snapLines: uniqueLines };
}


// ============================================
// BIN-PACKING COMPACT LAYOUT
// ============================================

interface PackedTile {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Compact layout: moves tiles upward and to the left to eliminate gaps
 * while preserving their relative visual order (top-to-bottom, left-to-right).
 * Does NOT shuffle or reorder tiles randomly.
 */
export function compactLayout(
  tiles: TileRect[],
  containerWidth: number,
  gap = 12,
  gridSnap = 20
): PackedTile[] {
  if (tiles.length === 0) return [];

  const snap = (v: number) => Math.round(v / gridSnap) * gridSnap;

  // Sort by current position: top-to-bottom, then left-to-right
  // This preserves the user's visual arrangement order
  const sorted = [...tiles].sort((a, b) => {
    const rowA = Math.floor(a.y / 100);
    const rowB = Math.floor(b.y / 100);
    if (rowA !== rowB) return rowA - rowB;
    return a.x - b.x;
  });

  const placed: PackedTile[] = [];

  for (const tile of sorted) {
    // Try to place this tile as high up and as far left as possible
    // without overlapping any already-placed tile
    let bestX = 0;
    let bestY = 0;
    let bestScore = Infinity; // lower y is better, then lower x

    // Scan candidate positions: try y=0 first, then below each placed tile
    const candidateYs = new Set<number>();
    candidateYs.add(0);
    for (const p of placed) {
      candidateYs.add(snap(p.y + p.height + gap));
      candidateYs.add(snap(p.y)); // align tops
    }

    for (const cy of Array.from(candidateYs).sort((a, b) => a - b)) {
      // For each candidate Y, find the leftmost X that doesn't overlap
      const candidateXs = new Set<number>();
      candidateXs.add(0);
      for (const p of placed) {
        candidateXs.add(snap(p.x + p.width + gap));
        candidateXs.add(snap(p.x)); // align lefts
      }

      for (const cx of Array.from(candidateXs).sort((a, b) => a - b)) {
        if (cx + tile.width > containerWidth + gap) continue;

        // Check if this position overlaps any placed tile
        let overlaps = false;
        for (const p of placed) {
          if (
            cx < p.x + p.width + gap &&
            cx + tile.width + gap > p.x &&
            cy < p.y + p.height + gap &&
            cy + tile.height + gap > p.y
          ) {
            overlaps = true;
            break;
          }
        }

        if (!overlaps) {
          const score = cy * 10000 + cx; // prioritize higher (lower y), then lefter
          if (score < bestScore) {
            bestScore = score;
            bestX = cx;
            bestY = cy;
          }
          break; // found best X for this Y, move to next Y
        }
      }
    }

    placed.push({
      id: tile.id,
      x: snap(Math.max(0, bestX)),
      y: snap(Math.max(0, bestY)),
      width: tile.width,
      height: tile.height,
    });
  }

  return placed;
}
