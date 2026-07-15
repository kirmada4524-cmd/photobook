import type { PhotoElement } from "./types";

export type PhotoFilterPreset = NonNullable<PhotoElement["imageFilterPreset"]>;

export const PHOTO_FILTER_DEFAULTS = {
  imageBrightness: 1,
  imageContrast: 1,
  imageSaturation: 1,
  imageGrayscale: 0,
  imageSepia: 0,
  imageBlur: 0,
} as const;

export const PHOTO_FILTER_PRESETS: Array<{
  id: Exclude<PhotoFilterPreset, "custom">;
  label: string;
  patch: Partial<PhotoElement>;
}> = [
  { id: "original", label: "Original", patch: { ...PHOTO_FILTER_DEFAULTS } },
  {
    id: "vivid",
    label: "Vivid",
    patch: {
      imageBrightness: 1.04,
      imageContrast: 1.12,
      imageSaturation: 1.28,
      imageGrayscale: 0,
      imageSepia: 0,
      imageBlur: 0,
    },
  },
  {
    id: "warm",
    label: "Warm",
    patch: {
      imageBrightness: 1.04,
      imageContrast: 1.04,
      imageSaturation: 1.12,
      imageGrayscale: 0,
      imageSepia: 0.18,
      imageBlur: 0,
    },
  },
  {
    id: "cool",
    label: "Cool",
    patch: {
      imageBrightness: 1.02,
      imageContrast: 1.08,
      imageSaturation: 0.9,
      imageGrayscale: 0.08,
      imageSepia: 0,
      imageBlur: 0,
    },
  },
  {
    id: "mono",
    label: "Mono",
    patch: {
      imageBrightness: 1.03,
      imageContrast: 1.16,
      imageSaturation: 0,
      imageGrayscale: 1,
      imageSepia: 0,
      imageBlur: 0,
    },
  },
  {
    id: "film",
    label: "Film",
    patch: {
      imageBrightness: 0.98,
      imageContrast: 1.12,
      imageSaturation: 0.82,
      imageGrayscale: 0.08,
      imageSepia: 0.14,
      imageBlur: 0,
    },
  },
];

export const photoFilterCss = (photo: Partial<PhotoElement>) =>
  [
    `brightness(${photo.imageBrightness ?? PHOTO_FILTER_DEFAULTS.imageBrightness})`,
    `contrast(${photo.imageContrast ?? PHOTO_FILTER_DEFAULTS.imageContrast})`,
    `saturate(${photo.imageSaturation ?? PHOTO_FILTER_DEFAULTS.imageSaturation})`,
    `grayscale(${photo.imageGrayscale ?? PHOTO_FILTER_DEFAULTS.imageGrayscale})`,
    `sepia(${photo.imageSepia ?? PHOTO_FILTER_DEFAULTS.imageSepia})`,
    `blur(${photo.imageBlur ?? PHOTO_FILTER_DEFAULTS.imageBlur}px)`,
  ].join(" ");

export const resetPhotoEditsPatch = (): Partial<PhotoElement> => ({
  imageX: 0,
  imageY: 0,
  imageScale: 1,
  imageRotation: 0,
  imageFilterPreset: "original",
  ...PHOTO_FILTER_DEFAULTS,
});
