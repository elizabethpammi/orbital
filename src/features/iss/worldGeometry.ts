/**
 * A deliberately coarse equirectangular world outline.
 *
 * Coordinates are [longitude, latitude] pairs, hand-simplified from
 * public-domain coastline data (Natural Earth is public domain) to a few
 * dozen vertices per landmass — enough for a viewer to orient an ISS ground
 * track ("over the Pacific", "crossing Africa") without shipping megabytes
 * of GeoJSON or a mapping library.
 */

export type LonLat = readonly [number, number];

export const MAP_WIDTH = 720;
export const MAP_HEIGHT = 360;

/** Equirectangular projection: linear in both axes. */
export function project([lon, lat]: LonLat): readonly [number, number] {
  const x = ((lon + 180) / 360) * MAP_WIDTH;
  const y = ((90 - lat) / 180) * MAP_HEIGHT;
  return [x, y];
}

export function toPathData(polygon: readonly LonLat[]): string {
  return (
    polygon
      .map((point, i) => {
        const [x, y] = project(point);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join('') + 'Z'
  );
}

const NORTH_AMERICA: LonLat[] = [
  [-168, 65], [-160, 59], [-152, 60], [-140, 60], [-133, 56], [-127, 51],
  [-124, 42], [-118, 33], [-110, 24], [-105, 20], [-97, 16], [-92, 15],
  [-85, 11], [-80, 9], [-83, 15], [-87, 21], [-90, 21], [-91, 19],
  [-97, 25], [-93, 30], [-84, 30], [-81, 25], [-80, 32], [-75, 36],
  [-70, 42], [-66, 45], [-60, 46], [-64, 50], [-58, 52], [-65, 60],
  [-78, 62], [-92, 66], [-110, 68], [-128, 70], [-145, 70], [-157, 71],
];

const SOUTH_AMERICA: LonLat[] = [
  [-78, 8], [-80, 2], [-81, -5], [-76, -14], [-70, -18], [-70, -28],
  [-72, -38], [-74, -46], [-72, -54], [-68, -55], [-65, -47], [-62, -40],
  [-57, -34], [-52, -33], [-48, -26], [-41, -22], [-37, -12], [-35, -6],
  [-42, -3], [-50, 0], [-52, 4], [-60, 8], [-65, 10], [-72, 12], [-77, 9],
];

const AFRICA: LonLat[] = [
  [-6, 35], [3, 37], [10, 37], [20, 32], [30, 31], [34, 27], [37, 18],
  [43, 11], [51, 12], [46, -1], [40, -11], [35, -20], [33, -28],
  [26, -34], [19, -35], [15, -28], [12, -18], [13, -8], [9, 4], [4, 6],
  [-4, 5], [-8, 5], [-13, 9], [-17, 15], [-16, 22], [-10, 29],
];

const EURASIA: LonLat[] = [
  [-10, 36], [-9, 43], [-2, 44], [-5, 48], [-1, 49], [3, 53], [8, 54],
  [8, 57], [12, 56], [11, 59], [18, 60], [22, 65], [28, 71], [40, 68],
  [55, 69], [70, 73], [90, 76], [105, 78], [120, 74], [140, 72],
  [160, 70], [170, 67], [178, 65], [170, 60], [162, 57], [156, 51],
  [143, 54], [140, 48], [135, 43], [128, 39], [121, 32], [110, 20],
  [106, 10], [103, 1], [100, 6], [98, 13], [94, 18], [90, 22], [85, 20],
  [80, 13], [77, 8], [73, 18], [68, 23], [61, 25], [57, 26], [52, 27],
  [48, 30], [55, 25], [59, 22], [53, 17], [45, 13], [43, 15], [39, 20],
  [34, 28], [35, 34], [30, 36], [27, 37], [22, 37], [19, 40], [15, 40],
  [12, 44], [6, 43], [3, 42], [0, 39], [-5, 36],
];

const AUSTRALIA: LonLat[] = [
  [114, -22], [113, -26], [115, -34], [119, -35], [125, -32], [130, -32],
  [136, -35], [140, -38], [147, -39], [150, -37], [153, -30], [153, -26],
  [146, -19], [143, -14], [142, -11], [136, -12], [131, -12], [126, -14],
  [122, -18],
];

const GREENLAND: LonLat[] = [
  [-45, 60], [-53, 66], [-56, 72], [-52, 77], [-40, 81], [-28, 82],
  [-20, 79], [-22, 72], [-30, 66], [-40, 62],
];

const ANTARCTICA: LonLat[] = [
  [-180, -85], [-180, -71], [-160, -75], [-130, -74], [-100, -72],
  [-70, -68], [-60, -64], [-45, -70], [-20, -72], [10, -70], [40, -68],
  [70, -68], [100, -66], [130, -66], [160, -70], [180, -71], [180, -85],
];

export const LANDMASSES: ReadonlyArray<readonly LonLat[]> = [
  NORTH_AMERICA,
  SOUTH_AMERICA,
  AFRICA,
  EURASIA,
  AUSTRALIA,
  GREENLAND,
  ANTARCTICA,
];

/** Graticule lines every 30°, for orientation. */
export const GRATICULE = {
  meridians: [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150],
  parallels: [-60, -30, 0, 30, 60],
} as const;
