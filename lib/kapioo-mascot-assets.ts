/**
 * Canonical paths for Kapioo mascot PNGs in `public/mascot/`.
 * Use with `next/image` `src` or `<img />` relative to site root.
 */
export const KAPIOO_MASCOT = {
  /** Headphones + music notes + mini bento */
  headphonesMusicNotes: "/mascot/kapioo-mascot-headphones-music-notes.png",
  /** Happy capybara in bowl with sparkles / stars */
  blissSparklesStars: "/mascot/kapioo-mascot-bliss-sparkles-stars.png",
  /** Taking a photo of a bento box with phone */
  photoBentoCamera: "/mascot/kapioo-mascot-photo-bento-camera.png",
  /** Simple brown line-art mascot in bowl */
  bowlBrownLineart: "/mascot/kapioo-mascot-bowl-brown-lineart.png",
  /** Eating a drumstick in bowl */
  eatingDrumstick: "/mascot/kapioo-mascot-eating-drumstick.png",
} as const

export type KapiooMascotKey = keyof typeof KAPIOO_MASCOT
