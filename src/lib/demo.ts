import { generateDna, type ContentProfile } from "@shared/dna";

/** Demo creature shown on the landing page (no backend needed). */
export const DEMO_PROFILE: ContentProfile = {
  source: "sandbox",
  handle: "fitmax",
  displayName: "FitMax",
  bio: "Gym rat | daily workouts & bad jokes",
  followerCount: 184000,
  videoCount: 120,
  topHashtags: ["#gym", "#fitness", "#comedy", "#legday"],
  keywords: ["gym", "workout", "funny", "protein"],
  categories: ["fitness", "comedy"],
  avgLikes: 49000,
  avgViews: 660000,
  sampleCaptions: ["Leg day destroyed me"],
  language: "en",
};

export const DEMO_DNA = generateDna(DEMO_PROFILE);

export const SHOWCASE_DNAS = [
  DEMO_DNA,
  generateDna({ ...DEMO_PROFILE, handle: "pixelnova", categories: ["gaming", "tech"], topHashtags: ["#gaming", "#tech"] }),
  generateDna({ ...DEMO_PROFILE, handle: "chefluna", categories: ["cooking", "travel"], topHashtags: ["#recipe", "#food"] }),
  generateDna({ ...DEMO_PROFILE, handle: "melodymay", categories: ["music", "dance"], topHashtags: ["#music", "#dance"] }),
];
