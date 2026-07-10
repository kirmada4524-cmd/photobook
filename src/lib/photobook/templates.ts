import { type PhotoElement } from "./types";

let cid = 0;
const nid = () => `el_${Date.now()}_${cid++}_${Math.random().toString(36).slice(2, 7)}`;

const makePhoto = (
  imageId: string,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: Partial<PhotoElement> = {},
): PhotoElement => ({
  id: nid(),
  type: "photo",
  imageId,
  x: Math.round(x),
  y: Math.round(y),
  w: Math.round(w),
  h: Math.round(h),
  rotation: 0,
  z: 1,
  frame: "none",
  radius: 16,
  ...opts,
});

export type TemplateId =
  // 1 Photo
  | "full"
  | "polaroid1"
  | "center1"
  | "editorial1"
  // 2 Photos
  | "split2"
  | "vertical2"
  | "overlapping2"
  | "editorial2"
  // 3 Photos
  | "collage3"
  | "strip3"
  | "horizontal3"
  | "overlapping3"
  // 4 Photos
  | "grid4"
  | "filmstrip"
  | "editorial4"
  | "overlapping4"
  // 5 Photos
  | "collage5"
  | "grid5"
  | "overlapping5"
  // Others
  | "scrapbook"
  | "magazine"
  | "mosaic6"
  | "mosaic8"
  | "cleanHero"
  | "travelPostcards"
  | "polaroidWall"
  | "canvaGrid"
  | "storyStack"
  | "passportGrid"
  | "minimalPairs"
  | "asymmetric2"
  | "diagonal2"
  | "triptych3"
  | "scatter3"
  | "mosaic4"
  | "stripes4"
  | "fullHero3"
  | "fullGrid4"
  | "fullSplit5";

export type TemplateCategory =
  | "1 Frame"
  | "2 Frames"
  | "3 Frames"
  | "4 Frames"
  | "5 Frames"
  | "Others";

export type Template = {
  id: TemplateId;
  label: string;
  minPhotos: number;
  maxPhotos?: number;
  category: TemplateCategory;
  style: "Minimal" | "Magazine" | "Scrapbook" | "Travel" | "Polaroid" | "Grid" | "Collage";
  orientation?: "any" | "landscape" | "portrait" | "square";
};

export const TEMPLATES: Template[] = [
  // 1 Frame
  {
    id: "full",
    label: "Full Page",
    minPhotos: 1,
    maxPhotos: 1,
    category: "1 Frame",
    style: "Minimal",
    orientation: "any",
  },
  {
    id: "polaroid1",
    label: "Polaroid Portrait",
    minPhotos: 1,
    maxPhotos: 1,
    category: "1 Frame",
    style: "Polaroid",
    orientation: "portrait",
  },
  {
    id: "center1",
    label: "Elegant Portrait",
    minPhotos: 1,
    maxPhotos: 1,
    category: "1 Frame",
    style: "Minimal",
    orientation: "any",
  },
  {
    id: "editorial1",
    label: "Left Editorial",
    minPhotos: 1,
    maxPhotos: 1,
    category: "1 Frame",
    style: "Magazine",
    orientation: "landscape",
  },
  {
    id: "cleanHero",
    label: "Clean Hero",
    minPhotos: 1,
    maxPhotos: 1,
    category: "1 Frame",
    style: "Minimal",
    orientation: "any",
  },

  // 2 Frames
  {
    id: "split2",
    label: "Side by Side",
    minPhotos: 2,
    maxPhotos: 2,
    category: "2 Frames",
    style: "Grid",
    orientation: "landscape",
  },
  {
    id: "vertical2",
    label: "Vertical Split",
    minPhotos: 2,
    maxPhotos: 2,
    category: "2 Frames",
    style: "Grid",
    orientation: "portrait",
  },
  {
    id: "overlapping2",
    label: "Overlapping Cards",
    minPhotos: 2,
    maxPhotos: 2,
    category: "2 Frames",
    style: "Scrapbook",
    orientation: "any",
  },
  {
    id: "editorial2",
    label: "Editorial Focus",
    minPhotos: 2,
    maxPhotos: 2,
    category: "2 Frames",
    style: "Magazine",
    orientation: "landscape",
  },
  {
    id: "minimalPairs",
    label: "Minimal Pair",
    minPhotos: 2,
    maxPhotos: 2,
    category: "2 Frames",
    style: "Minimal",
    orientation: "any",
  },
  {
    id: "asymmetric2",
    label: "Asymmetric Contrast",
    minPhotos: 2,
    maxPhotos: 2,
    category: "2 Frames",
    style: "Collage",
    orientation: "any",
  },
  {
    id: "diagonal2",
    label: "Diagonal Duo",
    minPhotos: 2,
    maxPhotos: 2,
    category: "2 Frames",
    style: "Minimal",
    orientation: "any",
  },

  // 3 Frames
  {
    id: "collage3",
    label: "Collage Three",
    minPhotos: 3,
    maxPhotos: 3,
    category: "3 Frames",
    style: "Collage",
    orientation: "landscape",
  },
  {
    id: "strip3",
    label: "Triple Column",
    minPhotos: 3,
    maxPhotos: 3,
    category: "3 Frames",
    style: "Grid",
    orientation: "landscape",
  },
  {
    id: "horizontal3",
    label: "Triple Row",
    minPhotos: 3,
    maxPhotos: 3,
    category: "3 Frames",
    style: "Grid",
    orientation: "portrait",
  },
  {
    id: "overlapping3",
    label: "Overlapping Trio",
    minPhotos: 3,
    maxPhotos: 3,
    category: "3 Frames",
    style: "Scrapbook",
    orientation: "any",
  },
  {
    id: "storyStack",
    label: "Story Stack",
    minPhotos: 3,
    maxPhotos: 3,
    category: "3 Frames",
    style: "Magazine",
    orientation: "portrait",
  },
  {
    id: "triptych3",
    label: "Triptych Arch",
    minPhotos: 3,
    maxPhotos: 3,
    category: "3 Frames",
    style: "Minimal",
    orientation: "landscape",
  },
  {
    id: "scatter3",
    label: "Scattered Polaroid Trio",
    minPhotos: 3,
    maxPhotos: 3,
    category: "3 Frames",
    style: "Polaroid",
    orientation: "any",
  },
  {
    id: "fullHero3",
    label: "Full Page Hero (3)",
    minPhotos: 3,
    maxPhotos: 3,
    category: "3 Frames",
    style: "Collage",
    orientation: "any",
  },

  // 4 Frames
  {
    id: "grid4",
    label: "Classic Quad Grid",
    minPhotos: 4,
    maxPhotos: 4,
    category: "4 Frames",
    style: "Grid",
    orientation: "any",
  },
  {
    id: "filmstrip",
    label: "Filmstrip Inline",
    minPhotos: 4,
    maxPhotos: 4,
    category: "4 Frames",
    style: "Travel",
    orientation: "landscape",
  },
  {
    id: "editorial4",
    label: "Editorial Quad",
    minPhotos: 4,
    maxPhotos: 4,
    category: "4 Frames",
    style: "Magazine",
    orientation: "landscape",
  },
  {
    id: "overlapping4",
    label: "Scattered Quad",
    minPhotos: 4,
    maxPhotos: 4,
    category: "4 Frames",
    style: "Scrapbook",
    orientation: "any",
  },
  {
    id: "travelPostcards",
    label: "Travel Postcards",
    minPhotos: 4,
    maxPhotos: 4,
    category: "4 Frames",
    style: "Travel",
    orientation: "landscape",
  },
  {
    id: "mosaic4",
    label: "Modernist Mosaic",
    minPhotos: 4,
    maxPhotos: 4,
    category: "4 Frames",
    style: "Collage",
    orientation: "any",
  },
  {
    id: "stripes4",
    label: "Vertical Stripes",
    minPhotos: 4,
    maxPhotos: 4,
    category: "4 Frames",
    style: "Minimal",
    orientation: "landscape",
  },
  {
    id: "fullGrid4",
    label: "Full Page Grid (4)",
    minPhotos: 4,
    maxPhotos: 4,
    category: "4 Frames",
    style: "Grid",
    orientation: "any",
  },

  // 5 Frames
  {
    id: "collage5",
    label: "Center Hero Collage",
    minPhotos: 5,
    maxPhotos: 5,
    category: "5 Frames",
    style: "Collage",
    orientation: "any",
  },
  {
    id: "grid5",
    label: "Three & Two Grid",
    minPhotos: 5,
    maxPhotos: 5,
    category: "5 Frames",
    style: "Grid",
    orientation: "landscape",
  },
  {
    id: "overlapping5",
    label: "Scrapbook Quintet",
    minPhotos: 5,
    maxPhotos: 5,
    category: "5 Frames",
    style: "Scrapbook",
    orientation: "any",
  },
  {
    id: "polaroidWall",
    label: "Polaroid Wall",
    minPhotos: 5,
    maxPhotos: 5,
    category: "5 Frames",
    style: "Polaroid",
    orientation: "any",
  },
  {
    id: "fullSplit5",
    label: "Full Page Split (5)",
    minPhotos: 5,
    maxPhotos: 5,
    category: "5 Frames",
    style: "Grid",
    orientation: "any",
  },

  // Others
  {
    id: "scrapbook",
    label: "Scrapbook Sextet (6)",
    minPhotos: 6,
    maxPhotos: 6,
    category: "Others",
    style: "Scrapbook",
    orientation: "any",
  },
  {
    id: "magazine",
    label: "Magazine Cover (4)",
    minPhotos: 4,
    maxPhotos: 4,
    category: "Others",
    style: "Magazine",
    orientation: "landscape",
  },
  {
    id: "mosaic6",
    label: "Mosaic Split (6)",
    minPhotos: 6,
    maxPhotos: 6,
    category: "Others",
    style: "Collage",
    orientation: "landscape",
  },
  {
    id: "mosaic8",
    label: "Grand Mosaic (8)",
    minPhotos: 8,
    maxPhotos: 8,
    category: "Others",
    style: "Grid",
    orientation: "landscape",
  },
  {
    id: "canvaGrid",
    label: "Creator Grid",
    minPhotos: 7,
    maxPhotos: 7,
    category: "Others",
    style: "Grid",
    orientation: "any",
  },
  {
    id: "passportGrid",
    label: "Passport Grid",
    minPhotos: 6,
    maxPhotos: 6,
    category: "Others",
    style: "Travel",
    orientation: "landscape",
  },
];

const PAD = 40;

export function applyTemplate(
  id: TemplateId,
  imageIds: string[],
  pageW: number,
  pageH: number,
): PhotoElement[] {
  const ids = imageIds.slice(0, 8);

  // Helper to resolve image ID with fallback
  const getImg = (idx: number) => (ids.length > 0 ? ids[idx % ids.length] : "");

  switch (id) {
    // === 1 FRAME ===
    case "full":
      return [makePhoto(getImg(0), PAD, PAD, pageW - PAD * 2, pageH - PAD * 2, { radius: 18 })];

    case "polaroid1": {
      const w = Math.min(pageW, pageH) * 0.6;
      const h = w * 1.15;
      const x = (pageW - w) / 2;
      const y = (pageH - h) / 2 - 20;
      return [makePhoto(getImg(0), x, y, w, h, { frame: "polaroid", radius: 0 })];
    }

    case "center1": {
      const w = pageW * 0.65;
      const h = pageH * 0.65;
      return [
        makePhoto(getImg(0), (pageW - w) / 2, (pageH - h) / 2, w, h, {
          frame: "white",
          radius: 12,
        }),
      ];
    }

    case "editorial1": {
      const w = pageW * 0.45;
      const h = pageH - PAD * 2;
      return [makePhoto(getImg(0), PAD, PAD, w, h, { radius: 10 })];
    }

    case "cleanHero": {
      const inset = Math.min(pageW, pageH) * 0.09;
      return [
        makePhoto(getImg(0), inset, inset, pageW - inset * 2, pageH - inset * 2, {
          frame: "gallery",
          radius: 8,
        }),
      ];
    }

    // === 2 FRAMES ===
    case "split2": {
      const w = (pageW - PAD * 3) / 2;
      const h = pageH - PAD * 2;
      return [makePhoto(getImg(0), PAD, PAD, w, h), makePhoto(getImg(1), PAD * 2 + w, PAD, w, h)];
    }

    case "vertical2": {
      const w = pageW - PAD * 2;
      const h = (pageH - PAD * 3) / 2;
      return [makePhoto(getImg(0), PAD, PAD, w, h), makePhoto(getImg(1), PAD, PAD * 2 + h, w, h)];
    }

    case "overlapping2": {
      const w = pageW * 0.42;
      const h = pageH * 0.55;
      const x1 = pageW * 0.12;
      const y1 = pageH * 0.22;
      const x2 = pageW * 0.46;
      const y2 = pageH * 0.18;
      return [
        makePhoto(getImg(0), x1, y1, w, h, { frame: "polaroid", rotation: -6 }),
        makePhoto(getImg(1), x2, y2, w, h, { frame: "polaroid", rotation: 8, z: 2 }),
      ];
    }

    case "editorial2": {
      const w1 = pageW * 0.4;
      const h1 = pageH - PAD * 2;
      const w2 = pageW * 0.4;
      const h2 = pageH * 0.5;
      const x1 = PAD;
      const y1 = PAD;
      const x2 = pageW - w2 - PAD;
      const y2 = PAD + (h1 - h2) / 2;
      return [
        makePhoto(getImg(0), x1, y1, w1, h1, { radius: 8 }),
        makePhoto(getImg(1), x2, y2, w2, h2, { frame: "white", radius: 8 }),
      ];
    }

    case "minimalPairs": {
      const w = (pageW - PAD * 3) / 2;
      const h = pageH * 0.68;
      const y = (pageH - h) / 2;
      return [
        makePhoto(getImg(0), PAD, y, w, h, { frame: "gallery", radius: 8 }),
        makePhoto(getImg(1), PAD * 2 + w, y, w, h, { frame: "gallery", radius: 8 }),
      ];
    }

    case "asymmetric2": {
      const w1 = pageW * 0.56;
      const h1 = pageH * 0.6;
      const w2 = pageW * 0.32;
      const h2 = pageH * 0.65;
      const x1 = PAD * 1.5;
      const y1 = PAD * 1.5;
      const x2 = pageW - w2 - PAD * 1.5;
      const y2 = pageH - h2 - PAD * 1.5;
      return [
        makePhoto(getImg(0), x1, y1, w1, h1, { radius: 12 }),
        makePhoto(getImg(1), x2, y2, w2, h2, { radius: 12, z: 2 }),
      ];
    }

    case "diagonal2": {
      const s = Math.min(pageW * 0.44, pageH * 0.44);
      const x1 = pageW * 0.12;
      const y1 = pageH * 0.12;
      const x2 = pageW - s - pageW * 0.12;
      const y2 = pageH - s - pageH * 0.12;
      return [
        makePhoto(getImg(0), x1, y1, s, s, { radius: 16 }),
        makePhoto(getImg(1), x2, y2, s, s, { radius: 16 }),
      ];
    }

    // === 3 FRAMES ===
    case "collage3": {
      const bigW = (pageW - PAD * 3) * 0.6;
      const smallW = (pageW - PAD * 3) * 0.4;
      const h = pageH - PAD * 2;
      const smallH = (h - PAD) / 2;
      return [
        makePhoto(getImg(0), PAD, PAD, bigW, h),
        makePhoto(getImg(1), PAD * 2 + bigW, PAD, smallW, smallH),
        makePhoto(getImg(2), PAD * 2 + bigW, PAD * 2 + smallH, smallW, smallH),
      ];
    }

    case "strip3": {
      const w = (pageW - PAD * 4) / 3;
      const h = pageH - PAD * 2;
      return [
        makePhoto(getImg(0), PAD, PAD, w, h),
        makePhoto(getImg(1), PAD * 2 + w, PAD, w, h),
        makePhoto(getImg(2), PAD * 3 + w * 2, PAD, w, h),
      ];
    }

    case "horizontal3": {
      const w = pageW - PAD * 2;
      const h = (pageH - PAD * 4) / 3;
      return [
        makePhoto(getImg(0), PAD, PAD, w, h),
        makePhoto(getImg(1), PAD, PAD * 2 + h, w, h),
        makePhoto(getImg(2), PAD, PAD * 3 + h * 2, w, h),
      ];
    }

    case "overlapping3": {
      const w = pageW * 0.33;
      const h = pageH * 0.48;
      const cx = pageW / 2 - w / 2;
      const cy = pageH / 2 - h / 2;
      return [
        makePhoto(getImg(0), cx - w * 0.8, cy - 20, w, h, { frame: "vintage", rotation: -12 }),
        makePhoto(getImg(1), cx + w * 0.8, cy + 20, w, h, { frame: "vintage", rotation: 10, z: 2 }),
        makePhoto(getImg(2), cx, cy - 5, w, h, { frame: "polaroid", rotation: -2, z: 3 }),
      ];
    }

    case "storyStack": {
      const heroW = pageW * 0.54;
      const sideW = pageW - heroW - PAD * 3;
      const sideH = (pageH - PAD * 3) / 2;
      return [
        makePhoto(getImg(0), PAD, PAD, heroW, pageH - PAD * 2, { frame: "white", radius: 14 }),
        makePhoto(getImg(1), PAD * 2 + heroW, PAD, sideW, sideH, { radius: 12 }),
        makePhoto(getImg(2), PAD * 2 + heroW, PAD * 2 + sideH, sideW, sideH, { radius: 12 }),
      ];
    }

    case "triptych3": {
      const gap = 20;
      const w = (pageW - PAD * 2 - gap * 2) / 3;
      const hSide = pageH * 0.62;
      const hCenter = pageH * 0.74;
      const ySide = (pageH - hSide) / 2;
      const yCenter = (pageH - hCenter) / 2;
      return [
        makePhoto(getImg(0), PAD, ySide, w, hSide, { radius: 12 }),
        makePhoto(getImg(1), PAD + w + gap, yCenter, w, hCenter, { radius: 16 }),
        makePhoto(getImg(2), PAD + (w + gap) * 2, ySide, w, hSide, { radius: 12 }),
      ];
    }

    case "scatter3": {
      const w = pageW * 0.31;
      const h = w * 1.15;
      const cx = pageW / 2 - w / 2;
      const cy = pageH / 2 - h / 2;
      return [
        makePhoto(getImg(0), cx - w * 0.82, cy - 25, w, h, { frame: "polaroid", rotation: -8 }),
        makePhoto(getImg(1), cx + w * 0.82, cy + 25, w, h, {
          frame: "polaroid",
          rotation: 6,
          z: 2,
        }),
        makePhoto(getImg(2), cx, cy - 5, w, h, { frame: "polaroid", rotation: -3, z: 3 }),
      ];
    }

    case "fullHero3": {
      const BORDER_PAD = 16;
      const GAP = 12;
      const leftW = (pageW - BORDER_PAD * 2 - GAP) * 0.58;
      const rightW = (pageW - BORDER_PAD * 2 - GAP) * 0.42;
      const rightH = (pageH - BORDER_PAD * 2 - GAP) / 2;
      return [
        makePhoto(getImg(0), BORDER_PAD, BORDER_PAD, leftW, pageH - BORDER_PAD * 2, { radius: 8 }),
        makePhoto(getImg(1), BORDER_PAD + leftW + GAP, BORDER_PAD, rightW, rightH, { radius: 8 }),
        makePhoto(getImg(2), BORDER_PAD + leftW + GAP, BORDER_PAD + rightH + GAP, rightW, rightH, {
          radius: 8,
        }),
      ];
    }

    // === 4 FRAMES ===
    case "grid4": {
      const w = (pageW - PAD * 3) / 2;
      const h = (pageH - PAD * 3) / 2;
      return [
        makePhoto(getImg(0), PAD, PAD, w, h),
        makePhoto(getImg(1), PAD * 2 + w, PAD, w, h),
        makePhoto(getImg(2), PAD, PAD * 2 + h, w, h),
        makePhoto(getImg(3), PAD * 2 + w, PAD * 2 + h, w, h),
      ];
    }

    case "filmstrip": {
      const w = (pageW - PAD * 5) / 4;
      const h = pageH * 0.55;
      const y = (pageH - h) / 2;
      return [
        makePhoto(getImg(0), PAD, y, w, h, { frame: "filmstrip", radius: 4 }),
        makePhoto(getImg(1), PAD * 2 + w, y, w, h, { frame: "filmstrip", radius: 4 }),
        makePhoto(getImg(2), PAD * 3 + w * 2, y, w, h, { frame: "filmstrip", radius: 4 }),
        makePhoto(getImg(3), PAD * 4 + w * 3, y, w, h, { frame: "filmstrip", radius: 4 }),
      ];
    }

    case "editorial4": {
      const heroW = pageW * 0.55;
      const heroH = pageH - PAD * 2;
      const sideW = pageW - heroW - PAD * 3;
      const sideH = (heroH - PAD * 2) / 3;
      return [
        makePhoto(getImg(0), PAD, PAD, heroW, heroH, { radius: 12 }),
        makePhoto(getImg(1), PAD * 2 + heroW, PAD, sideW, sideH, { radius: 8 }),
        makePhoto(getImg(2), PAD * 2 + heroW, PAD * 2 + sideH, sideW, sideH, { radius: 8 }),
        makePhoto(getImg(3), PAD * 2 + heroW, PAD * 3 + sideH * 2, sideW, sideH, { radius: 8 }),
      ];
    }

    case "overlapping4": {
      const w = pageW * 0.32;
      const h = pageH * 0.44;
      const positions: [number, number, number][] = [
        [PAD * 1.5, PAD * 1.2, -6],
        [pageW - w - PAD * 1.5, PAD * 1.5, 8],
        [PAD * 2, pageH - h - PAD * 1.5, 4],
        [pageW - w - PAD * 2, pageH - h - PAD * 1.2, -5],
      ];
      return Array.from({ length: 4 }, (_, i) =>
        makePhoto(getImg(i), positions[i][0], positions[i][1], w, h, {
          frame: "postcard",
          rotation: positions[i][2],
          z: i + 1,
        }),
      );
    }

    case "travelPostcards": {
      const w = (pageW - PAD * 3) / 2;
      const h = (pageH - PAD * 3) / 2;
      return [
        makePhoto(getImg(0), PAD, PAD, w, h, { frame: "postcard", rotation: -2 }),
        makePhoto(getImg(1), PAD * 2 + w, PAD, w, h, { frame: "stamp", rotation: 2 }),
        makePhoto(getImg(2), PAD, PAD * 2 + h, w, h, { frame: "travel", rotation: 2 }),
        makePhoto(getImg(3), PAD * 2 + w, PAD * 2 + h, w, h, { frame: "postcard", rotation: -2 }),
      ];
    }

    case "mosaic4": {
      const xGap = 20;
      const yGap = 20;
      const leftW = (pageW - PAD * 2 - xGap) * 0.46;
      const rightW = (pageW - PAD * 2 - xGap) * 0.54;
      const topH = (pageH - PAD * 2 - yGap) * 0.54;
      const botH = (pageH - PAD * 2 - yGap) * 0.46;
      return [
        makePhoto(getImg(0), PAD, PAD, leftW, topH, { radius: 8 }),
        makePhoto(getImg(1), PAD + leftW + xGap, PAD, rightW, topH - 30, { radius: 8 }),
        makePhoto(getImg(2), PAD, PAD + topH + yGap, leftW + 30, botH, { radius: 8 }),
        makePhoto(
          getImg(3),
          PAD + leftW + xGap + 30,
          PAD + topH + yGap - 30,
          rightW - 30,
          botH + 30,
          { radius: 8 },
        ),
      ];
    }

    case "stripes4": {
      const gap = 16;
      const w = (pageW - PAD * 2 - gap * 3) / 4;
      const h = pageH - PAD * 2;
      return [
        makePhoto(getImg(0), PAD, PAD, w, h, { radius: 4 }),
        makePhoto(getImg(1), PAD + w + gap, PAD, w, h, { radius: 4 }),
        makePhoto(getImg(2), PAD + (w + gap) * 2, PAD, w, h, { radius: 4 }),
        makePhoto(getImg(3), PAD + (w + gap) * 3, PAD, w, h, { radius: 4 }),
      ];
    }

    case "fullGrid4": {
      const BORDER_PAD = 16;
      const GAP = 12;
      const w = (pageW - BORDER_PAD * 2 - GAP) / 2;
      const h = (pageH - BORDER_PAD * 2 - GAP) / 2;
      return [
        makePhoto(getImg(0), BORDER_PAD, BORDER_PAD, w, h, { radius: 8 }),
        makePhoto(getImg(1), BORDER_PAD + w + GAP, BORDER_PAD, w, h, { radius: 8 }),
        makePhoto(getImg(2), BORDER_PAD, BORDER_PAD + h + GAP, w, h, { radius: 8 }),
        makePhoto(getImg(3), BORDER_PAD + w + GAP, BORDER_PAD + h + GAP, w, h, { radius: 8 }),
      ];
    }

    // === 5 FRAMES ===
    case "collage5": {
      const heroW = pageW * 0.4;
      const heroH = pageH * 0.5;
      const heroX = (pageW - heroW) / 2;
      const heroY = (pageH - heroH) / 2;
      const cornerW = pageW * 0.22;
      const cornerH = pageH * 0.3;
      return [
        makePhoto(getImg(0), heroX, heroY, heroW, heroH, { frame: "white", z: 5, radius: 10 }),
        makePhoto(getImg(1), PAD, PAD, cornerW, cornerH, { radius: 6 }),
        makePhoto(getImg(2), pageW - cornerW - PAD, PAD, cornerW, cornerH, { radius: 6 }),
        makePhoto(getImg(3), PAD, pageH - cornerH - PAD, cornerW, cornerH, { radius: 6 }),
        makePhoto(getImg(4), pageW - cornerW - PAD, pageH - cornerH - PAD, cornerW, cornerH, {
          radius: 6,
        }),
      ];
    }

    case "grid5": {
      const topW = (pageW - PAD * 4) / 3;
      const topH = (pageH - PAD * 3) * 0.5;
      const botW = (pageW - PAD * 3) / 2;
      const botH = (pageH - PAD * 3) * 0.5;
      return [
        makePhoto(getImg(0), PAD, PAD, topW, topH),
        makePhoto(getImg(1), PAD * 2 + topW, PAD, topW, topH),
        makePhoto(getImg(2), PAD * 3 + topW * 2, PAD, topW, topH),
        makePhoto(getImg(3), PAD, PAD * 2 + topH, botW, botH),
        makePhoto(getImg(4), PAD * 2 + botW, PAD * 2 + topH, botW, botH),
      ];
    }

    case "overlapping5": {
      const w = pageW * 0.28;
      const h = pageH * 0.4;
      const xPad = (pageW - w * 5) / 6;
      return Array.from({ length: 5 }, (_, i) => {
        const x = xPad + i * (w + xPad);
        const y = PAD + (i % 2 === 0 ? 10 : 60);
        return makePhoto(getImg(i), x, y, w, h, {
          frame: "polaroid",
          rotation: (i - 2) * 5,
          z: i + 1,
        });
      });
    }

    case "polaroidWall": {
      const w = pageW * 0.25;
      const h = pageH * 0.36;
      const positions: [number, number, number][] = [
        [pageW * 0.08, pageH * 0.11, -7],
        [pageW * 0.38, pageH * 0.08, 4],
        [pageW * 0.67, pageH * 0.13, 8],
        [pageW * 0.22, pageH * 0.52, 5],
        [pageW * 0.54, pageH * 0.5, -5],
      ];
      return positions.map(([x, y, rotation], i) =>
        makePhoto(getImg(i), x, y, w, h, { frame: "polaroid", radius: 0, rotation, z: i + 1 }),
      );
    }

    case "fullSplit5": {
      const BORDER_PAD = 16;
      const GAP = 12;
      const rowH = (pageH - BORDER_PAD * 2 - GAP) / 2;
      const topW = (pageW - BORDER_PAD * 2 - GAP) / 2;
      const botW = (pageW - BORDER_PAD * 2 - GAP * 2) / 3;
      return [
        makePhoto(getImg(0), BORDER_PAD, BORDER_PAD, topW, rowH, { radius: 8 }),
        makePhoto(getImg(1), BORDER_PAD + topW + GAP, BORDER_PAD, topW, rowH, { radius: 8 }),
        makePhoto(getImg(2), BORDER_PAD, BORDER_PAD + rowH + GAP, botW, rowH, { radius: 8 }),
        makePhoto(getImg(3), BORDER_PAD + botW + GAP, BORDER_PAD + rowH + GAP, botW, rowH, {
          radius: 8,
        }),
        makePhoto(getImg(4), BORDER_PAD + (botW + GAP) * 2, BORDER_PAD + rowH + GAP, botW, rowH, {
          radius: 8,
        }),
      ];
    }

    // === OTHERS / MIX ===
    case "scrapbook": {
      const sizes = [320, 260, 290, 240, 270, 230];
      const positions: [number, number][] = [
        [60, 60],
        [pageW - 380, 80],
        [80, pageH - 360],
        [pageW - 320, pageH - 320],
        [pageW / 2 - 140, 100],
        [pageW / 2 - 100, pageH - 320],
      ];
      const frames: PhotoElement["frame"][] = [
        "polaroid",
        "white",
        "vintage",
        "polaroid",
        "white",
        "postcard",
      ];
      return Array.from({ length: 6 }, (_, i) =>
        makePhoto(getImg(i), positions[i][0], positions[i][1], sizes[i], sizes[i], {
          frame: frames[i],
          rotation: (Math.random() - 0.5) * 14,
          radius: 4,
          z: i + 1,
        }),
      );
    }

    case "magazine": {
      const heroH = pageH * 0.62;
      return [
        makePhoto(getImg(0), PAD, PAD, pageW - PAD * 2, heroH, { radius: 20 }),
        ...Array.from({ length: 3 }, (_, i) => {
          const w = (pageW - PAD * 4) / 3;
          return makePhoto(
            getImg(i + 1),
            PAD + i * (w + PAD),
            PAD * 2 + heroH,
            w,
            pageH - heroH - PAD * 3,
          );
        }),
      ];
    }

    case "mosaic6": {
      const colW = (pageW - PAD * 3) / 2;
      const leftH = (pageH - PAD * 4) / 3;
      const rightH = (pageH - PAD * 3) / 2;
      return [
        // Left Column (3 items)
        makePhoto(getImg(0), PAD, PAD, colW, leftH),
        makePhoto(getImg(1), PAD, PAD * 2 + leftH, colW, leftH),
        makePhoto(getImg(2), PAD, PAD * 3 + leftH * 2, colW, leftH),
        // Right Column (2 items + overlapping middle item)
        makePhoto(getImg(3), PAD * 2 + colW, PAD, colW, rightH),
        makePhoto(getImg(4), PAD * 2 + colW, PAD * 2 + rightH, colW, rightH),
        makePhoto(getImg(5), PAD * 1.5 + colW / 2, pageH / 2 - 80, colW, 160, {
          frame: "white",
          z: 10,
          rotation: 3,
        }),
      ];
    }

    case "mosaic8": {
      const w = (pageW - PAD * 5) / 4;
      const h = (pageH - PAD * 3) / 2;
      return Array.from({ length: 8 }, (_, i) => {
        const row = Math.floor(i / 4);
        const col = i % 4;
        return makePhoto(getImg(i), PAD + col * (w + PAD), PAD + row * (h + PAD), w, h, {
          radius: 6,
        });
      });
    }

    case "canvaGrid": {
      const heroW = pageW * 0.5;
      const heroH = pageH - PAD * 2;
      const smallW = (pageW - heroW - PAD * 4) / 2;
      const smallH = (heroH - PAD * 2) / 3;
      return [
        makePhoto(getImg(0), PAD, PAD, heroW, heroH, { frame: "shadow", radius: 16 }),
        ...Array.from({ length: 6 }, (_, i) => {
          const col = i % 2;
          const row = Math.floor(i / 2);
          return makePhoto(
            getImg(i + 1),
            PAD * 2 + heroW + col * (smallW + PAD),
            PAD + row * (smallH + PAD),
            smallW,
            smallH,
            { radius: 10 },
          );
        }),
      ];
    }

    case "passportGrid": {
      const w = (pageW - PAD * 4) / 3;
      const h = (pageH - PAD * 3) / 2;
      return Array.from({ length: 6 }, (_, i) => {
        const row = Math.floor(i / 3);
        const col = i % 3;
        return makePhoto(getImg(i), PAD + col * (w + PAD), PAD + row * (h + PAD), w, h, {
          frame: "stamp",
          radius: 4,
          rotation: i % 2 === 0 ? -1 : 1,
        });
      });
    }

    default:
      return [makePhoto(getImg(0), PAD, PAD, pageW - PAD * 2, pageH - PAD * 2, { radius: 18 })];
  }
}
