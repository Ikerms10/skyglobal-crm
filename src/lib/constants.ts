// ─── PLATFORM CONSTANTS ───────────────────────────────────────────────────────
// This is the PLATFORM name (the software/SaaS product).
// SkyGlobal Renovations LLC is a TENANT — Iker's own business.
// Platform name → used in: emails, login/signup, browser title, PWA, footers.
// Tenant name   → used in: sidebar, PDFs, customer-facing docs for that tenant.

export const PLATFORM = {
  // Full platform name
  fullName: "Iker's",

  // Short name (headers, email subjects, compact UI)
  shortName: "Iker's",

  // Tagline
  tagline: 'Professional CRM for contractors',

  // URLs
  url: 'https://crm.skyglobalsvcs.com',
  marketingUrl: 'https://skyglobalsvcs.com',

  // Email
  fromEmail: 'noreply@skyglobalsvcs.com',
  fromName: "Iker's",
  supportEmail: 'ikerms10@gmail.com',

  // Brand colors
  brandColor: '#e6ab35',     // gold
  brandColorDark: '#b8891f', // dark gold
  textColor: '#1d1c17',      // near-black

  // Footer copy
  poweredBy: "Powered by Iker's",
  footer: "Powered by Iker's",
  footerShort: "Powered by Iker's",
} as const;

// Convenience helper
export const getPlatformName = (short = false): string =>
  short ? PLATFORM.shortName : PLATFORM.fullName;
