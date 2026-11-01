/**
 * White-label / acquisition-ready branding. Change these values to rebrand the whole product.
 * Nothing else in the codebase hard-codes the product name, colours or legal entity.
 */
export const BRAND = {
  name: "ChainPepu",
  shortName: "Pepu",
  /** What a creature is called in UI copy that is not translated via i18n (logs, share text fallback). */
  creatureNoun: "creature",
  tagline: "Living 3D companions for creators",
  legalEntity: "ChainPepu",
  supportEmail: "support@chainpepu.app",
  socials: { tiktok: "https://www.tiktok.com/@chainpepu" },
  /** Default UI language when the browser language is not supported. */
  defaultLocale: "en",
  /** Creator revenue share in percent (display only – the enforced value lives in the backend). */
  creatorSharePercent: 80,
} as const;
