// HTML-based proposal page builder.
// Returns an array of HTML strings — one per page — each sized at 816×1056px
// (Letter at 96 dpi). Captured by html2canvas and assembled into a PDF by jsPDF.
// All colors are hardcoded hex; no CSS variables are used here.

const DARK        = '#1d1c17'
const GOLD        = '#e6ab35'
const GOLD_DARK   = '#b8891f'
const GOLD_BG     = '#fdf8ed'
const TEXT        = '#1d1c17'
const TEXT_BODY   = '#2a2018'
const TEXT_MUTED  = '#7a6a5a'
const TEXT_SEC    = '#5c5240'
const SURFACE     = '#faf8f4'
const BORDER      = '#e0d5c0'
const BORDER_LITE = '#ede8dc'
const HEADER_BG   = '#fffdf7'
const HEADER_BOR  = '#e8dcc0'
const GREEN       = '#1a7a3c'
const GREEN_BG    = '#f0faf4'
const BLUE        = '#2d6fa3'
const BLUE_BG     = '#f0f5fb'

export interface BusinessInfo {
  name: string
  phone?: string | null
  email?: string | null
  website?: string | null
  address?: string | null
  logoUrl?: string | null
  insurancePolicy?: string | null
  insuranceLimit?: string | null
  warrantyYears?: string | null
}

function fmt(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function e(s: string | null | undefined): string {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// ── Shared HTML components ────────────────────────────────────────────────────

function hHeader(biz: BusinessInfo, logoDataUrl: string | null, issueDate?: string, validUntil?: string) {
  const initial = (biz.name?.[0] ?? 'B').toUpperCase()
  const subtitle = [biz.address].filter(Boolean).join(' · ') || 'Professional Renovation Services'
  // NOTE: cream background so transparent logos render correctly on white/light surfaces
  const logoHtml = logoDataUrl
    ? `<img src="${logoDataUrl}" style="height:64px;width:auto;max-width:80px;object-fit:contain;background:transparent;display:block;flex-shrink:0;" />`
    : `<div style="width:64px;height:64px;min-width:64px;background:${DARK};border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900;color:${GOLD};font-family:Arial,sans-serif;flex-shrink:0;">${initial}</div>`

  return `
<div style="background:${HEADER_BG};border:1px solid ${HEADER_BOR};border-radius:12px;padding:20px 24px;margin:0 0 0 0;display:flex;justify-content:space-between;align-items:center;">
  <div style="display:flex;align-items:center;gap:16px;">
    ${logoHtml}
    <div style="padding-left:4px;">
      <div style="font-size:22px;font-weight:900;color:${DARK};font-family:Arial,Helvetica,sans-serif;letter-spacing:-0.02em;line-height:1.1;margin-bottom:3px;">${e(biz.name)}</div>
      <div style="font-size:10px;color:${TEXT_MUTED};font-family:Arial,sans-serif;">${e(subtitle)}</div>
    </div>
  </div>
  <div style="text-align:right;flex-shrink:0;padding-left:16px;">
    <div style="font-size:9px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:${GOLD_DARK};font-family:Arial,Helvetica,sans-serif;margin-bottom:6px;">Professional Proposal</div>
    <div style="font-size:10px;color:${TEXT_SEC};font-family:Arial,sans-serif;line-height:1.6;">
      ${issueDate ? `<div>Issued: ${e(issueDate)}</div>` : ''}
      ${validUntil ? `<div>Valid until: ${e(validUntil)}</div>` : ''}
    </div>
  </div>
</div>`
}

function hTitleBar(projectName: string | undefined, proposalType: string) {
  const name = (projectName || 'Professional Service Proposal').toUpperCase()
  return `<div style="background:${DARK};border-radius:8px;padding:12px 20px;margin-top:12px;margin-bottom:0;">
  <div style="font-size:12px;font-weight:700;color:${GOLD};letter-spacing:0.07em;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">${e(name)} | ${e(proposalType)}</div>
</div>`
}

function hSectionHeader(title: string) {
  return `<div style="margin-top:14px;margin-bottom:0;">
  <div style="font-size:8px;font-weight:bold;text-transform:uppercase;color:${GOLD_DARK};letter-spacing:1px;margin-bottom:3px;">${e(title)}</div>
  <div style="height:1.5px;background:${GOLD};margin-bottom:8px;"></div>
</div>`
}

function hConfBox(bizName: string) {
  return `<div style="background:${GOLD_BG};border-left:3px solid ${GOLD};padding:7px 12px;margin-bottom:10px;margin-top:6px;">
  <div style="font-size:8px;color:${TEXT_BODY};line-height:1.5;">
    <strong style="color:${TEXT};">CONFIDENTIAL: </strong>
    This proposal and all associated pricing, processes, and materials are proprietary to ${e(bizName)}.
    This document may not be reproduced or shared without written authorization.
  </div>
</div>`
}

function hBusinessContact(biz: BusinessInfo) {
  const fields: [string, string][] = (
    [
      biz.phone   ? ['Phone',   biz.phone]   : null,
      biz.email   ? ['Email',   biz.email]   : null,
      biz.website ? ['Web',     biz.website] : null,
      biz.address ? ['Address', biz.address] : null,
    ] as ([string, string] | null)[]
  ).filter(Boolean) as [string, string][]

  if (fields.length === 0) return ''
  return `<div style="margin-top:10px;">
  ${hSectionHeader('Section I — Business Contact')}
  <div style="display:flex;flex-wrap:wrap;">
    ${fields.map(([label, value]) => `
    <div style="width:50%;margin-bottom:4px;">
      <span style="font-size:9px;font-weight:bold;color:${TEXT};">${e(label)}: </span>
      <span style="font-size:9px;color:${TEXT_BODY};">${e(value)}</span>
    </div>`).join('')}
  </div>
</div>`
}

function hClientSummary(data: any) {
  const total = data.totalInvestment != null ? fmt(parseFloat(String(data.totalInvestment))) : '—'
  const rows: [string, string, boolean?][] = [
    ['Client Name',          data.clientName    || '—'],
    ['Contact Info',         data.clientContact || '—'],
    ['Project Address',      data.clientAddress || '—'],
    ['Project Scope / Type', data.projectScope  || '—'],
    ['Total Investment',     total, true],
  ]
  return `<div style="margin-top:12px;">
  ${hSectionHeader('Section II — Client & Project Summary')}
  <div style="border:1px solid ${BORDER};">
    ${rows.map(([label, val, highlight], i) => `
    <div style="display:flex;background:${i % 2 === 0 ? SURFACE : '#fff'};">
      <div style="width:34%;padding:6px 10px;font-weight:bold;font-size:9px;color:${TEXT};background:${SURFACE};border-right:2px solid ${GOLD};flex-shrink:0;">${e(label)}</div>
      <div style="flex:1;padding:6px 10px;font-size:${highlight ? '11px' : '9px'};color:${highlight ? GREEN : TEXT_BODY};font-weight:${highlight ? 'bold' : 'normal'};">${e(val)}</div>
    </div>`).join('')}
  </div>
</div>`
}

function hProcessSteps(title: string, steps: Array<{ title: string; bullets: string[] }>) {
  return `<div style="margin-top:12px;">
  ${hSectionHeader(title)}
  ${steps.map((step, i) => `
  <div style="margin-bottom:7px;">
    <div style="display:flex;align-items:flex-start;margin-bottom:2px;">
      <div style="min-width:16px;width:16px;height:16px;border-radius:50%;background:${GOLD};margin-right:7px;flex-shrink:0;font-size:8px;font-weight:bold;color:${DARK};line-height:16px;text-align:center;">${i + 1}</div>
      <div style="font-size:10px;font-weight:bold;color:${TEXT};padding-top:0;">${e(step.title)}</div>
    </div>
    ${step.bullets.map(b => `<div style="font-size:9px;color:${TEXT_BODY};margin-bottom:2px;margin-left:23px;">• ${e(b)}</div>`).join('')}
  </div>`).join('')}
</div>`
}

function hMaterialsTable(items: any[], sectionTitle: string, coatingNote?: string) {
  const lineTotal = items.reduce((s, item) => s + (item.total ?? 0), 0)
  return `<div style="margin-top:12px;">
  ${hSectionHeader(sectionTitle)}
  ${coatingNote ? `<div style="font-size:9px;color:${TEXT_BODY};margin-bottom:6px;">${e(coatingNote)}</div>` : ''}
  <div style="font-size:8.5px;color:${TEXT_BODY};font-style:italic;margin-bottom:8px;">
    Exclusive Sherwin-Williams products · <strong style="font-style:normal;color:${TEXT};">Zero Material Markup</strong> — direct contractor pricing passed to you.
  </div>
  ${items.length > 0 ? `
  <div style="border:1px solid ${BORDER};">
    <div style="display:flex;background:${DARK};">
      <div style="width:50%;padding:6px 8px;color:#fff;font-size:8px;font-weight:bold;">Description</div>
      <div style="width:12%;padding:6px 8px;color:#fff;font-size:8px;font-weight:bold;text-align:center;">Qty</div>
      <div style="width:20%;padding:6px 8px;color:#fff;font-size:8px;font-weight:bold;text-align:right;">Unit Price</div>
      <div style="width:18%;padding:6px 8px;background:${GOLD};color:${DARK};font-size:8px;font-weight:bold;text-align:right;">Total</div>
    </div>
    ${items.map((item, i) => `
    <div style="display:flex;background:${i % 2 === 0 ? '#fff' : SURFACE};border-bottom:1px solid ${BORDER};">
      <div style="width:50%;padding:6px 8px;font-size:9px;color:${TEXT_BODY};">${e(item.description || '—')}</div>
      <div style="width:12%;padding:6px 8px;font-size:9px;color:${TEXT_BODY};text-align:center;">${item.quantity ?? '—'}</div>
      <div style="width:20%;padding:6px 8px;font-size:9px;color:${TEXT_BODY};text-align:right;">${item.unit_price != null ? fmt(item.unit_price) : '—'}</div>
      <div style="width:18%;padding:6px 8px;font-size:9px;color:${TEXT};font-weight:bold;text-align:right;">${item.total != null ? fmt(item.total) : (String(item.description ?? '').toLowerCase().includes('included') ? 'Incl.' : '—')}</div>
    </div>`).join('')}
    <div style="display:flex;background:${GOLD_BG};border-top:1.5px solid ${GOLD};">
      <div style="width:82%;padding:6px 8px;font-size:9px;color:${TEXT};font-weight:bold;text-align:right;">Materials Subtotal:</div>
      <div style="width:18%;padding:6px 8px;font-size:9px;color:${TEXT};font-weight:bold;text-align:right;">${fmt(lineTotal)}</div>
    </div>
  </div>` : `<div style="font-size:9px;color:${TEXT_MUTED};font-style:italic;">No materials listed.</div>`}
</div>`
}

function hPaymentSchedule(data: any, biz: BusinessInfo) {
  const t = parseFloat(String(data.totalInvestment ?? 0)) || 0
  const dep  = t * (data.depositPct  / 100)
  const prog = t * (data.progressPct / 100)
  const fin  = t - dep - prog
  const blocks = [
    { label: `Initial Deposit (${data.depositPct}%)`,   when: 'Due 48 hours prior to project start', amount: dep,  bg: GREEN_BG, color: GREEN },
    { label: `Progress Payment (${data.progressPct}%)`, when: 'Due upon 50% project completion',     amount: prog, bg: GOLD_BG,  color: GOLD_DARK },
    { label: `Final Balance (${data.finalPct}%)`,        when: 'Due upon completion & walkthrough',   amount: fin,  bg: BLUE_BG,  color: BLUE },
  ]
  return `<div style="margin-top:12px;">
  ${hSectionHeader('Section V — Investment & Payment Schedule')}
  <div style="border:1px solid ${BORDER};border-radius:4px;overflow:hidden;">
    ${blocks.map((b, i) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:${b.bg};${i < 2 ? `border-bottom:1px solid ${BORDER};` : ''}">
      <div>
        <div style="font-size:10px;font-weight:bold;color:${TEXT};">${e(b.label)}</div>
        <div style="font-size:8px;color:${TEXT_MUTED};margin-top:1px;">${e(b.when)}</div>
      </div>
      <div style="font-size:14px;font-weight:bold;color:${b.color};">${t > 0 ? fmt(b.amount) : 'TBD'}</div>
    </div>`).join('')}
  </div>
  ${t > 0 ? `
  <div style="display:flex;justify-content:space-between;align-items:center;background:${DARK};padding:10px 14px;border-radius:4px;margin-top:4px;">
    <div style="font-size:10px;font-weight:bold;color:${GOLD};text-transform:uppercase;letter-spacing:0.5px;">Total Investment</div>
    <div style="font-size:16px;font-weight:bold;color:#fff;">${fmt(t)}</div>
  </div>` : ''}
  <div style="font-size:8px;color:${TEXT_MUTED};font-style:italic;margin-top:8px;line-height:1.5;">
    ${e(biz.name ?? 'We')} operate with full financial transparency. All material costs are invoiced at direct
    Sherwin-Williams contractor pricing with zero markup. Labor and overhead itemized and available upon request.
  </div>
</div>`
}

function hWarrantySection(items: Array<{ title: string; body: string }>) {
  return `<div style="margin-top:12px;">
  ${hSectionHeader('Section VI — Warranty & Provisions')}
  ${items.map((item, i) => `
  <div style="display:flex;padding:8px 12px;margin-bottom:6px;background:${SURFACE};border-left:3px solid ${GOLD};border-radius:2px;">
    <div style="min-width:18px;width:18px;height:18px;border-radius:50%;background:${GOLD};flex-shrink:0;margin-right:10px;margin-top:1px;font-size:8px;font-weight:bold;color:${DARK};line-height:18px;text-align:center;">${i + 1}</div>
    <div>
      <div style="font-size:10px;font-weight:bold;color:${TEXT};margin-bottom:2px;">${e(item.title)}</div>
      <div style="font-size:9px;color:${TEXT_BODY};line-height:1.5;">${e(item.body)}</div>
    </div>
  </div>`).join('')}
</div>`
}

function hSignatureBlock() {
  return `<div style="display:flex;margin-top:20px;padding-top:12px;border-top:1px solid ${BORDER};">
  <div style="flex:2;margin-right:40px;">
    <div style="height:28px;border-bottom:1.5px solid ${TEXT};margin-bottom:4px;"></div>
    <div style="font-size:8px;color:${TEXT_MUTED};">Client Acceptance Signature</div>
  </div>
  <div style="flex:1;">
    <div style="height:28px;border-bottom:1.5px solid ${TEXT};margin-bottom:4px;"></div>
    <div style="font-size:8px;color:${TEXT_MUTED};">Date</div>
  </div>
</div>`
}

function hFooter(biz: BusinessInfo, pageNum: number, totalPages: number) {
  return `<div style="position:absolute;bottom:16px;left:32px;right:32px;border-top:1px solid ${BORDER};padding-top:6px;display:flex;justify-content:space-between;font-size:7.5px;color:${TEXT_MUTED};">
  <div>${e(biz.name)} · Confidential</div>
  <div style="color:${GOLD_DARK};font-weight:bold;">Powered by SkyGlobal CRM</div>
  <div>Page ${pageNum} of ${totalPages}</div>
</div>`
}

function buildPage(bodyContent: string, headerContent: string, footer: string) {
  return `<div class="pdf-page" style="width:816px;height:1056px;background:#fff;position:relative;font-family:Helvetica,Arial,sans-serif;font-size:10px;color:${TEXT};overflow:hidden;box-sizing:border-box;">
  <div style="padding:24px 32px 60px;">
    ${headerContent}
    ${bodyContent}
  </div>
  ${footer}
</div>`
}

function buildPage2(bodyContent: string, footer: string) {
  return `<div class="pdf-page" style="width:816px;height:1056px;background:#fff;position:relative;font-family:Helvetica,Arial,sans-serif;font-size:10px;color:${TEXT};overflow:hidden;box-sizing:border-box;">
  <div style="padding:16px 32px 60px;">
    ${bodyContent}
  </div>
  ${footer}
</div>`
}

function buildInsurancePage(biz: BusinessInfo, logoDataUrl: string | null, totalPages: number) {
  const initial = (biz.name?.[0] ?? 'B').toUpperCase()
  const logoHtml = logoDataUrl
    ? `<img src="${logoDataUrl}" style="height:52px;width:auto;max-width:64px;object-fit:contain;background:transparent;display:block;flex-shrink:0;" />`
    : `<div style="width:52px;height:52px;min-width:52px;background:${DARK};border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:${GOLD};flex-shrink:0;">${initial}</div>`

  const fields: [string, string][] = [
    ['Insured',         biz.name],
    ['Coverage Type',   'General Liability'],
    ['Policy Number',   biz.insurancePolicy || 'On file'],
    ['Coverage Limit',  biz.insuranceLimit  || '$2,000,000'],
    ['Phone',           biz.phone           || 'On file'],
    ['Email',           biz.email           || 'On file'],
    ['Effective Date',  'On file'],
    ['Expiration Date', 'On file'],
  ]

  return `<div class="pdf-page" style="width:816px;height:1056px;background:#fff;position:relative;font-family:Helvetica,Arial,sans-serif;font-size:10px;color:${TEXT};overflow:hidden;box-sizing:border-box;">
  <div style="padding:24px 32px 60px;">
    <div style="background:${HEADER_BG};border:1px solid ${HEADER_BOR};border-radius:12px;padding:20px 24px;margin-bottom:20px;display:flex;align-items:center;gap:16px;">
      ${logoHtml}
      <div>
        <div style="font-size:18px;font-weight:900;color:${DARK};font-family:Arial,Helvetica,sans-serif;">${e(biz.name)}</div>
        <div style="font-size:10px;color:${TEXT_MUTED};font-family:Arial,sans-serif;">Certificate of Insurance</div>
      </div>
    </div>
    ${hSectionHeader('Certificate of Insurance')}
    <div style="border:1.5px solid ${BORDER};border-left:5px solid ${GOLD};border-radius:4px;margin-bottom:16px;">
      <div style="background:${GOLD_BG};padding:10px 16px;border-bottom:1px solid ${BORDER};">
        <div style="font-size:9px;font-weight:bold;color:${TEXT};text-transform:uppercase;letter-spacing:0.8px;">Insurance Details</div>
      </div>
      <div style="padding:14px 16px;display:flex;flex-wrap:wrap;">
        ${fields.map(([label, value]) => `
        <div style="width:50%;margin-bottom:10px;">
          <div style="font-size:8px;font-weight:bold;color:${TEXT};margin-bottom:1px;">${e(label)}</div>
          <div style="font-size:9px;color:${TEXT_BODY};">${e(value || 'On file')}</div>
        </div>`).join('')}
      </div>
    </div>
    <div style="background:${GOLD_BG};padding:10px 14px;border-radius:3px;">
      <div style="font-size:8.5px;color:${TEXT_BODY};font-style:italic;line-height:1.6;">
        A full Certificate of Insurance (COI) is available upon request and can be sent directly to the client,
        property manager, or HOA. ${e(biz.name)} maintains active coverage on all active project sites.
      </div>
    </div>
  </div>
  ${hFooter(biz, totalPages, totalPages)}
</div>`
}

// ── Hardcoded process steps ───────────────────────────────────────────────────

const INTERIOR_STEPS = [
  {
    title: 'Protection & Site Preparation',
    bullets: [
      'Full environment shielding: furniture, flooring, fixtures, and hardware masked and protected with professional drop cloths and plastic sheeting.',
      'Surface cleaning: all paintable surfaces wiped clean of dust, grease, and contaminants prior to any application.',
      'Tape and masking of all trim, outlets, windows, and doors for razor-sharp edge lines.',
    ],
  },
  {
    title: 'Surface Remediation & Priming',
    bullets: [
      'Drywall restoration: holes, cracks, nail pops, and imperfections filled, sanded flush, and feathered for seamless adhesion.',
      'Caulking: all gaps at trim, baseboards, and window frames sealed with professional paintable caulk.',
      'Stain-blocking primer applied to all repaired areas and bare surfaces.',
    ],
  },
  {
    title: 'Premium Paint Application',
    bullets: [
      'Two full coats of Sherwin-Williams premium interior paint applied with professional-grade rollers and brushes.',
      'Cut-in technique at all transitions — ceilings, trim, doors, windows — for clean sharp lines.',
      'Each coat allowed full dry time before the next is applied. No shortcuts.',
    ],
  },
  {
    title: 'Site Restoration & Quality Control',
    bullets: [
      'All masking, tape, and drop cloths removed carefully to avoid damage.',
      'Surfaces wiped clean; furniture returned; work area left spotless.',
      'Final walkthrough: on-site inspection with client to verify satisfaction and address touch-up items before departure.',
    ],
  },
]

const EXTERIOR_STEPS = [
  {
    title: 'Power Washing & Chemical Treatment',
    bullets: [
      'Full exterior pressure wash at 2,500–3,500 PSI to strip dirt, grime, and loose paint.',
      'Soft chemical wash with mildicide solution to eradicate mold, algae, and biological growth.',
    ],
  },
  {
    title: 'Scraping, Priming & Stabilization',
    bullets: [
      'Level 2 prep: hand-scraping all peeling and failing paint to a stable substrate.',
      'Elastomeric sealant applied to all cracks, gaps, and penetrations.',
      'Bonding primer applied to bare wood and repaired areas for maximum adhesion.',
    ],
  },
  {
    title: 'Expert Coating Application',
    bullets: [
      'Airless sprayers for uniform, millage-controlled coverage on large surfaces.',
      'Back-rolled for penetration and brushed for detail work on trim and accents.',
      'Premium Sherwin-Williams exterior coating in HOA-approved colors.',
    ],
  },
  {
    title: 'Final Cleanup & Quality Assurance',
    bullets: [
      'Complete removal of all masking, protective materials, and debris.',
      'Final walkthrough with client and immediate touch-up of any noted items before sign-off.',
    ],
  },
]

const CABINET_STEPS = [
  {
    title: 'Teardown & Precision Labeling',
    bullets: [
      'Careful removal of all cabinet doors and drawer fronts.',
      'Proprietary numbering and labeling system ensures exact reinstallation to original positions.',
    ],
  },
  {
    title: 'Surface Preparation & Chemical Degreasing',
    bullets: [
      'Chemical degreasing to strip cooking oils, grease, and contaminants from all surfaces.',
      'EKASANDER dustless orbital sanding system for a clean, bondable substrate.',
    ],
  },
  {
    title: 'Industrial Primer System',
    bullets: [
      '2-coat bonding primer system applied in our controlled shop environment.',
      'Tannin-blocking primer on oak and pine to prevent bleed-through. Inter-coat sanding at 320 grit.',
    ],
  },
  {
    title: 'HVLP Topcoat & White-Glove Reinstallation',
    bullets: [
      'HVLP fine-finish spraying for factory-smooth, brush-mark-free finish.',
      'White-glove reinstallation: every door and drawer returned to exact specifications.',
    ],
  },
]

// ── Template page builders ────────────────────────────────────────────────────

function buildInteriorPages(data: any, biz: BusinessInfo, logoDataUrl: string | null, totalPages: number) {
  const wy = data.warrantyYears ?? biz.warrantyYears ?? '5'
  const warrantyItems = [
    { title: 'White Glove Cleanup',
      body: '30–45 minutes of dedicated site cleanup at the end of each work day. Your home is left as clean as we found it — every day.' },
    { title: `${wy}-Year Workmanship Warranty`,
      body: `${biz.name} provides a ${wy}-year warranty on all workmanship. Any defects in application, adhesion, or finish remediated at no cost.` },
    { title: 'Insurance Coverage',
      body: `${biz.name} carries ${biz.insuranceLimit ?? '$2,000,000'} General Liability Insurance.${biz.insurancePolicy ? ' Policy No. ' + biz.insurancePolicy + '.' : ''} COI available upon request.` },
  ]

  const page1Body = [
    hConfBox(biz.name),
    hBusinessContact(biz),
    hClientSummary(data),
    hProcessSteps(`Section III — The ${biz.name} Interior Process`, INTERIOR_STEPS),
  ].join('')

  const page2Body = [
    hMaterialsTable(data.lineItems ?? [], 'Section IV — Material Specifications'),
    hPaymentSchedule(data, biz),
    hWarrantySection(warrantyItems),
    hSignatureBlock(),
  ].join('')

  const headerHtml = hHeader(biz, logoDataUrl, data.issueDate, data.validUntil) + hTitleBar(data.projectName, 'INTERIOR PAINTING')

  const pages = [
    buildPage(page1Body, headerHtml, hFooter(biz, 1, totalPages)),
    buildPage2(page2Body, hFooter(biz, 2, totalPages)),
  ]
  if (data.showInsurancePage) pages.push(buildInsurancePage(biz, logoDataUrl, totalPages))
  return pages
}

function buildExteriorPages(data: any, biz: BusinessInfo, logoDataUrl: string | null, totalPages: number) {
  const wy = data.warrantyYears ?? biz.warrantyYears ?? '5'
  const tierNames: Record<string, string> = {
    tier1: 'Tier 1: Latitude® — Entry Durability',
    tier2: 'Tier 2: Duration® — Professional Grade',
    tier3: 'Tier 3: Emerald® — Maximum Protection',
  }
  const coatingNote = [
    data.coatingTier && `Coating Tier: ${tierNames[data.coatingTier] || data.coatingTier}`,
    data.sheen && `Sheen: ${data.sheen}`,
  ].filter(Boolean).join(' · ')

  const warrantyItems = [
    { title: `${wy}-Year Workmanship Warranty`,
      body: `All exterior workmanship defects remediated at no cost within ${wy} years of project completion.` },
    { title: 'Insurance Coverage',
      body: `${biz.name} carries ${biz.insuranceLimit ?? '$2,000,000'} General Liability Insurance.${biz.insurancePolicy ? ' Policy No. ' + biz.insurancePolicy + '.' : ''} COI available upon request.` },
  ]

  const page1Body = [
    hConfBox(biz.name),
    hBusinessContact(biz),
    hClientSummary({ ...data, projectScope: 'Exterior Protection & Level 2 Prep' }),
    hProcessSteps(`Section III — The ${biz.name} Exterior Process`, EXTERIOR_STEPS),
  ].join('')

  const page2Body = [
    hMaterialsTable(data.lineItems ?? [], 'Section IV — Material Specifications', coatingNote || undefined),
    hPaymentSchedule(data, biz),
    hWarrantySection(warrantyItems),
    hSignatureBlock(),
  ].join('')

  const headerHtml = hHeader(biz, logoDataUrl, data.issueDate, data.validUntil) + hTitleBar(data.projectName, 'EXTERIOR PROTECTION & FINISHING')

  const pages = [
    buildPage(page1Body, headerHtml, hFooter(biz, 1, totalPages)),
    buildPage2(page2Body, hFooter(biz, 2, totalPages)),
  ]
  if (data.showInsurancePage) pages.push(buildInsurancePage(biz, logoDataUrl, totalPages))
  return pages
}

function buildCabinetPages(data: any, biz: BusinessInfo, logoDataUrl: string | null, totalPages: number) {
  const wy = data.warrantyYears ?? biz.warrantyYears ?? '5'
  const tierNames: Record<string, string> = {
    signature: 'Signature Tier: Emerald® Urethane Enamel',
    elite:     'Elite Tier: Gallery Series™ by Benjamin Moore',
  }
  const coatingNote = data.coatingTier ? `Selected Coating: ${tierNames[data.coatingTier] || data.coatingTier}` : undefined

  const warrantyItems = [
    { title: 'White Glove Cleanup',
      body: '30–45 minutes of dedicated cleanup performed daily. Your kitchen is left pristine at end of every work day.' },
    { title: `${wy}-Year Workmanship Warranty`,
      body: `All cabinet refinishing defects remediated at no cost within ${wy} years of project completion.` },
    { title: 'Insurance Coverage',
      body: `${biz.name} carries ${biz.insuranceLimit ?? '$2,000,000'} General Liability Insurance.${biz.insurancePolicy ? ' Policy No. ' + biz.insurancePolicy + '.' : ''} COI available upon request.` },
    { title: 'Coating Cure Maintenance',
      body: 'No abrasive cleaners or harsh chemicals for 30 days while the coating fully cures to maximum hardness.' },
  ]

  const page1Body = [
    hConfBox(biz.name),
    hBusinessContact(biz),
    hClientSummary({ ...data, projectScope: 'Factory-Grade Cabinet Refinishing' }),
    hProcessSteps(`Section III — The ${biz.name} 4-Phase Cabinet Process`, CABINET_STEPS),
  ].join('')

  const page2Body = [
    hMaterialsTable(data.lineItems ?? [], 'Section IV — Coating Specifications', coatingNote),
    hPaymentSchedule(data, biz),
    hWarrantySection(warrantyItems),
    hSignatureBlock(),
  ].join('')

  const headerHtml = hHeader(biz, logoDataUrl, data.issueDate, data.validUntil) + hTitleBar(data.projectName, 'CABINET REFINISHING & RESTORATION')

  const pages = [
    buildPage(page1Body, headerHtml, hFooter(biz, 1, totalPages)),
    buildPage2(page2Body, hFooter(biz, 2, totalPages)),
  ]
  if (data.showInsurancePage) pages.push(buildInsurancePage(biz, logoDataUrl, totalPages))
  return pages
}

function buildCustomPages(data: any, biz: BusinessInfo, logoDataUrl: string | null, totalPages: number) {
  const wy = data.warrantyYears ?? biz.warrantyYears ?? '5'

  const scopeHtml = Array.isArray(data.scopeOfWork)
    ? hProcessSteps('Section III — Scope of Work', data.scopeOfWork)
    : `<div style="margin-top:12px;">
        ${hSectionHeader('Section III — Scope of Work')}
        <div style="font-size:9px;color:${TEXT_BODY};line-height:1.7;">${e(data.scopeOfWork || '—')}</div>
       </div>`

  const warrantyItems = [
    { title: 'White Glove Cleanup',
      body: '30–45 minutes of dedicated site cleanup at the end of each work day.' },
    { title: `${wy}-Year Workmanship Warranty`,
      body: `All workmanship defects remediated at no cost within ${wy} years of project completion.` },
    { title: 'Insurance Coverage',
      body: `${biz.name} carries ${biz.insuranceLimit ?? '$2,000,000'} General Liability Insurance.${biz.insurancePolicy ? ' Policy No. ' + biz.insurancePolicy + '.' : ''} COI available upon request.` },
  ]

  const page1Body = [
    hConfBox(biz.name),
    hBusinessContact(biz),
    hClientSummary(data),
    scopeHtml,
  ].join('')

  const page2Body = [
    hMaterialsTable(data.lineItems ?? [], 'Section IV — Materials & Specifications'),
    hPaymentSchedule(data, biz),
    hWarrantySection(warrantyItems),
    hSignatureBlock(),
  ].join('')

  const headerHtml = hHeader(biz, logoDataUrl, data.issueDate, data.validUntil) + hTitleBar(data.projectName, 'PROFESSIONAL SERVICE PROPOSAL')

  const pages = [
    buildPage(page1Body, headerHtml, hFooter(biz, 1, totalPages)),
    buildPage2(page2Body, hFooter(biz, 2, totalPages)),
  ]
  if (data.showInsurancePage) pages.push(buildInsurancePage(biz, logoDataUrl, totalPages))
  return pages
}

// ── Public API ────────────────────────────────────────────────────────────────

export function buildProposalPages(
  template: string,
  data: any,
  biz: BusinessInfo,
  logoDataUrl: string | null,
): string[] {
  const totalPages = data.showInsurancePage ? 3 : 2
  switch (template) {
    case 'interior': return buildInteriorPages(data, biz, logoDataUrl, totalPages)
    case 'exterior': return buildExteriorPages(data, biz, logoDataUrl, totalPages)
    case 'cabinet':  return buildCabinetPages(data, biz, logoDataUrl, totalPages)
    default:         return buildCustomPages(data, biz, logoDataUrl, totalPages)
  }
}
