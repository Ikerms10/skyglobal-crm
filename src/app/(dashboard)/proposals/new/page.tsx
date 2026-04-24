'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Save, Eye, EyeOff, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { ProposalTemplate } from '@/types';
import { InteriorTemplate } from '@/components/proposals/templates/InteriorTemplate';
import { ExteriorTemplate } from '@/components/proposals/templates/ExteriorTemplate';
import { CabinetTemplate } from '@/components/proposals/templates/CabinetTemplate';
import { CustomTemplate } from '@/components/proposals/templates/CustomTemplate';
import { LineItem } from '@/components/proposals/EditableTable';
import { ScopeStep } from '@/components/proposals/ScopeOfWork';
import { format } from 'date-fns';

const TEMPLATE_LABELS: Record<ProposalTemplate, string> = {
  interior: 'Interior Painting',
  exterior: 'Exterior Painting',
  cabinet: 'Cabinet Refinishing',
  custom: 'Custom / Other',
};

function genId() {
  return Math.random().toString(36).slice(2);
}

function defaultScopeSteps(template: ProposalTemplate): ScopeStep[] {
  if (template === 'interior')
    return [
      {
        title: 'Step 1: Protection & Site Preparation',
        bullets: [
          'Full environment shielding: all furniture, flooring, fixtures, and hardware fully masked and protected with professional-grade drop cloths and plastic sheeting.',
          'Surface cleaning: all paintable surfaces wiped clean; dust, grease, and contaminants removed prior to any application.',
          'Tape and masking of all trim, outlets, windows, and doors for razor-sharp edge lines.',
        ],
      },
      {
        title: 'Step 2: Surface Remediation & Priming',
        bullets: [
          'Drywall restoration: holes, cracks, nail pops, and surface imperfections filled, sanded flush, and feathered for seamless adhesion.',
          'Caulking: all gaps at trim, baseboards, and window frames sealed with professional paintable caulk.',
          'Stain-blocking primer applied to all repaired areas, bare surfaces, and where needed for full color coverage.',
        ],
      },
      {
        title: 'Step 3: Premium Paint Application',
        bullets: [
          'Two full coats of Sherwin-Williams premium interior paint applied using professional-grade rollers and brushes.',
          'Cut-in technique used at all transitions — ceilings, trim, doors, windows, and outlets — for clean sharp lines.',
          'Each coat allowed full dry time before the next is applied; no shortcuts.',
        ],
      },
      {
        title: 'Step 4: Site Restoration & Quality Control',
        bullets: [
          'All masking, tape, and drop cloths removed carefully to avoid damage.',
          'Surfaces wiped clean; furniture returned to original positions; work area left spotless.',
          'Final walkthrough with client: on-site inspection to verify satisfaction and address any touch-up items immediately before team departs.',
        ],
      },
    ];
  if (template === 'exterior')
    return [
      {
        title: 'Step 01: Power Washing — Foundation of Adhesion',
        bullets: [
          'Full exterior pressure wash at 2,500–3,500 PSI removing all surface contamination.',
          'Soft Chemical Wash: mildicide solution applied to eradicate mold, mildew, and algae at the root.',
          'Surfaces allowed to fully dry (24–48 hours) before any paint application.',
        ],
      },
      {
        title: 'Step 02: Scraping, Priming & Stabilization',
        bullets: [
          'Level 2 Prep: Hand-scraping all peeling and failing paint to create a firm, adherent surface.',
          'Remediation: Cracks and gaps filled with SherMax™ elastomeric sealant; checks re-caulked.',
          'Priming: All bare wood, concrete, and masonry primed with appropriate system primers.',
        ],
      },
      {
        title: 'Step 03: Expert Paint Application',
        bullets: [
          'Airless sprayers for uniform, millage-controlled coverage across all surfaces.',
          'Full Protection: Complete masking of all windows, doors, fixtures, landscaping, and hardscape.',
          'Finishing: Sherwin-Williams premium exterior coatings in HOA-approved colors — back-rolled for penetration.',
        ],
      },
      {
        title: 'Step 04: Final Cleanup & Quality Assurance',
        bullets: [
          'Complete removal of all masking, drop cloths, and protective materials.',
          'Cleaning of plant beds, concrete, and all adjacent surfaces of any overspray.',
          'Final Walkthrough: On-site inspection with client to verify satisfaction before sign-off.',
        ],
      },
    ];
  if (template === 'cabinet')
    return [
      {
        title: 'Phase 1: Teardown & Precision Labeling',
        bullets: [
          'Careful removal of all doors, drawer fronts, and hardware with zero damage to boxes.',
          'Proprietary labeling system ensuring exact reinstallation alignment.',
          'Transport to professional spray shop for controlled environment application.',
        ],
      },
      {
        title: 'Phase 2: Protection & Surface Prep',
        bullets: [
          'Complete Home Protection: masking of all countertops, appliances, and adjacent areas.',
          'Chemical Degreasing: cooking oils, fingerprints, and contaminants fully stripped.',
          'Dustless Sanding: EKASANDER orbital system for scratch pattern without airborne dust.',
        ],
      },
      {
        title: 'Phase 3: Industrial Primer System',
        bullets: [
          '2-Coat Bonding Primer: Renner 1K 643/648 industrial wood primer system.',
          'Tannin Blocking: oil-based stain blockers prevent bleed-through on oak and pine.',
          'Inter-Coat Sanding: 320 grit between all coats for glass-smooth adhesion.',
        ],
      },
      {
        title: 'Phase 4: Professional Topcoat & Reinstallation',
        bullets: [
          'Fine-Finish Spraying: HVLP fine-finish spray tips produce a factory smooth, drip-free finish.',
          'White-Glove Delivery: all doors and drawers wrapped in film for protection during transport.',
          'Reinstallation: precise mounting, hardware installation, and door alignment.',
        ],
      },
    ];
  // custom
  return [
    {
      title: 'Step 1: Project Overview',
      bullets: ['Describe the scope of work and key deliverables here.'],
    },
  ];
}

function defaultLineItems(template: ProposalTemplate): LineItem[] {
  if (template === 'interior') {
    return [
      {
        id: genId(),
        description: 'Sherwin-Williams Emerald® Interior',
        quantity: 2,
        unit_price: 89,
        total: 178,
      },
      {
        id: genId(),
        description: 'ProClassic® Trim Enamel',
        quantity: 1,
        unit_price: 72,
        total: 72,
      },
      {
        id: genId(),
        description: 'Prep Materials (Tape, Plastic, Spackle)',
        quantity: null,
        unit_price: null,
        total: null,
      },
    ];
  }
  if (template === 'exterior') {
    return [
      {
        id: genId(),
        description: 'Sherwin-Williams Premium Exterior Coating',
        quantity: 3,
        unit_price: 89,
        total: 267,
      },
      {
        id: genId(),
        description: 'SherMax™ Elastomeric Sealant',
        quantity: null,
        unit_price: null,
        total: null,
      },
      {
        id: genId(),
        description: 'Prep Materials & Masking',
        quantity: null,
        unit_price: null,
        total: null,
      },
    ];
  }
  return [];
}

// ─── PDF helpers (module-level, shared across segment builders) ────────────────
const escHtml = (s: string | null | undefined) =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const fmtCurrency = (n: number | null | undefined) =>
  n != null
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
    : '—';

// Shows TBD when investment is unset/zero — avoids $0.00 or — in payment rows
const fmtPayment = (n: number | null | undefined) =>
  n != null && n > 0 ? fmtCurrency(n) : 'TBD';

const pdfSecHead = (title: string) => `
  <div style="font-size:10px;font-weight:700;color:#b8860b;letter-spacing:0.12em;text-transform:uppercase;border-bottom:2px solid #d4a843;padding-bottom:6px;margin-bottom:16px;margin-top:32px;font-family:Georgia,serif;">
    ${title}
  </div>`;

const PDF_WRAP =
  'width:794px;background:#fefcf8;font-family:Georgia,"Times New Roman",serif;color:#1c1209;font-size:11px;line-height:1.6;padding:56px;box-sizing:border-box;';

// ─── Segment 1: Header + Section I + II + III ─────────────────────────────────
function buildSegment1HTML(
  d: ReturnType<typeof buildInitialData>,
  tmpl: ProposalTemplate,
  logoSrc: string
): string {
  const projectTitle = d.projectName
    ? `${escHtml(d.projectName)}&nbsp;|&nbsp;PROFESSIONAL SERVICE PROPOSAL`
    : 'PROFESSIONAL SERVICE PROPOSAL';

  const sectionIIITitle =
    tmpl === 'interior'
      ? 'Section III — The SkyGlobal Interior Process'
      : tmpl === 'exterior'
        ? 'Section III — The SkyGlobal Exterior Process'
        : tmpl === 'cabinet'
          ? 'Section III — The SkyGlobal Cabinet Process'
          : 'Section III — Scope of Work';

  const scopeHTML = d.scopeOfWork
    .map(
      (step) => `
    <div style="margin-bottom:16px;">
      <div style="font-weight:700;font-size:11px;color:#1c1209;margin-bottom:6px;font-family:Georgia,serif;">
        ${escHtml(step.title)}
      </div>
      ${step.bullets
        .map(
          (b) => `
        <div style="padding-left:18px;font-size:10.5px;color:#3d3530;margin-bottom:4px;line-height:1.55;">
          &bull;&nbsp;${escHtml(b)}
        </div>`
        )
        .join('')}
    </div>`
    )
    .join('');

  return `
<div style="${PDF_WRAP}">

  <!-- HEADER -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
    <div>
      <div style="width:68px;height:68px;background:#fff;border-radius:8px;display:flex;align-items:center;justify-content:center;border:1px solid #e0d5c7;">
        ${logoSrc ? `<img src="${logoSrc}" width="44" height="44" alt="SkyGlobal" style="display:block;" />` : ''}
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:26px;font-weight:800;color:#1c1209;letter-spacing:-0.02em;">SkyGlobal Renovations LLC</div>
      <div style="font-size:10.5px;color:#a07850;margin-top:4px;">Licensed &amp; Insured &nbsp;|&nbsp; Orlando, FL &nbsp;|&nbsp; Atlanta, GA</div>
    </div>
  </div>

  <!-- TITLE BANNER -->
  <div style="background:#f0eae0;border-top:4px solid #8b6914;border-bottom:4px solid #8b6914;padding:14px 24px;margin-bottom:18px;text-align:center;">
    <span style="color:#8b6914;font-size:12px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;">${projectTitle}</span>
  </div>

  <!-- META ROW -->
  <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:10px;">
    <div><strong>SkyGlobal Renovations LLC</strong></div>
    <div style="text-align:right;">
      <div><strong>Date of Issuance:</strong> ${escHtml(d.issueDate)}</div>
      <div><strong>Proposal Valid Until:</strong> ${escHtml(d.validUntil)}</div>
    </div>
  </div>

  <!-- CONFIDENTIAL -->
  <div style="background:#f5ecd8;border:1px solid #e8d5a3;border-left:3px solid #d4a853;border-radius:4px;padding:8px 12px;margin-bottom:6px;font-size:10px;color:#a07850;font-style:italic;line-height:1.5;">
    <strong style="font-style:normal;color:#5c4a38;">CONFIDENTIAL:</strong> This proposal and all associated pricing, processes, and materials are proprietary to SkyGlobal Renovations LLC. This document may not be reproduced, distributed, or used without written authorization.
  </div>

  <!-- SECTION I -->
  ${pdfSecHead('Section I — Business Contact')}
  <table style="width:100%;border-collapse:collapse;font-size:11px;">
    <tr>
      <td style="padding:4px 0;width:50%;"><strong>Phone:</strong> 352-782-2460 | 470-469-9961</td>
      <td style="padding:4px 0;"><strong>Instagram &amp; Facebook:</strong> @skyglobalp</td>
    </tr>
    <tr>
      <td style="padding:4px 0;"><strong>Email:</strong> skyglobalsvcs@gmail.com</td>
      <td style="padding:4px 0;"><strong>Credentials:</strong> Thumbtack Profile — 75+ Verified Reviews</td>
    </tr>
    <tr>
      <td style="padding:4px 0;"><strong>Web:</strong> skyglobalsvcs.com</td>
      <td></td>
    </tr>
  </table>

  <!-- SECTION II -->
  ${pdfSecHead('Section II — Client &amp; Project Summary')}
  <table style="width:100%;border-collapse:collapse;font-size:11px;">
    ${[
      ['Client Name', escHtml(d.clientName) || '—'],
      ['Contact Info', escHtml(d.clientContact) || '—'],
      ['Project Address', escHtml(d.clientAddress) || '—'],
      ['Project Scope', escHtml(d.projectScope) || '—'],
      ['Total Investment', fmtCurrency(d.totalInvestment)],
    ]
      .map(
        ([label, val], i) => `
      <tr style="background:${i % 2 === 0 ? '#f5ecd8' : '#fefcf8'};">
        <td style="padding:7px 10px;font-weight:600;width:35%;color:#5c4a38;border:1px solid #e0d5c7;">${label}</td>
        <td style="padding:7px 10px;border:1px solid #e0d5c7;">${val}</td>
      </tr>`
      )
      .join('')}
  </table>

  <!-- SECTION III -->
  ${pdfSecHead(sectionIIITitle)}
  ${scopeHTML}

</div>`;
}

// ─── Segment 2: Section IV + V + VI + Signature ───────────────────────────────
function buildSegment2HTML(d: ReturnType<typeof buildInitialData>): string {
  const dep = d.totalInvestment != null ? d.totalInvestment * (d.depositPct / 100) : null;
  const pro = d.totalInvestment != null ? d.totalInvestment * (d.progressPct / 100) : null;
  const fin = d.totalInvestment != null ? d.totalInvestment * (d.finalPct / 100) : null;

  const lineItemsHTML =
    d.lineItems.length > 0
      ? `
    <table style="width:100%;border-collapse:collapse;font-size:10.5px;">
      <thead>
        <tr style="background:#8b6914;">
          <th style="padding:8px 10px;text-align:left;color:#fff;font-weight:600;font-size:10px;letter-spacing:0.04em;">Material / Description</th>
          <th style="padding:8px 10px;text-align:center;color:#fff;font-weight:600;font-size:10px;width:52px;">Qty</th>
          <th style="padding:8px 10px;text-align:right;color:#fff;font-weight:600;font-size:10px;width:88px;">Unit Price</th>
          <th style="padding:8px 10px;text-align:right;color:#fff;font-weight:600;font-size:10px;width:88px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${d.lineItems
          .map(
            (item, i) => `
          <tr style="background:${i % 2 === 0 ? '#fefcf8' : '#f5ecd8'};">
            <td style="padding:7px 10px;border:1px solid #e0d5c7;">${escHtml(item.description)}</td>
            <td style="padding:7px 10px;text-align:center;border:1px solid #e0d5c7;">${item.quantity ?? '—'}</td>
            <td style="padding:7px 10px;text-align:right;border:1px solid #e0d5c7;">${fmtCurrency(item.unit_price)}</td>
            <td style="padding:7px 10px;text-align:right;border:1px solid #e0d5c7;">${fmtCurrency(item.total)}</td>
          </tr>`
          )
          .join('')}
      </tbody>
    </table>`
      : `<div style="font-size:10px;color:#a07850;font-style:italic;">No materials listed.</div>`;

  return `
<div style="${PDF_WRAP}">

  ${pdfSecHead('Section IV — Material Specifications')}
  <p style="font-size:10.5px;color:#5c4a38;margin:0 0 10px;font-style:italic;">
    We use exclusively <strong style="font-style:normal;">Sherwin-Williams</strong> products. Our partnership discounts are passed directly to you with <strong style="font-style:normal;">Zero Material Markup.</strong>
  </p>
  ${lineItemsHTML}

  ${pdfSecHead('Section V — Investment &amp; Payment Schedule')}
  <p style="font-size:10.5px;color:#5c4a38;margin:0 0 12px;">
    The following payment schedule reflects our commitment to project alignment and financial transparency:
  </p>
  <div style="border:1px solid #e0d5c7;border-radius:6px;overflow:hidden;">
    <table style="width:100%;border-collapse:collapse;font-size:11px;">
      <tr style="background:#f5ecd8;">
        <td style="padding:10px 14px;border-bottom:1px solid #e0d5c7;">
          <div style="font-weight:600;color:#5c4a38;">Initial Deposit (${d.depositPct}%)</div>
          <div style="font-size:9.5px;color:#a07850;margin-top:2px;">Due 48 hours prior to project start</div>
        </td>
        <td style="padding:10px 14px;text-align:right;border-bottom:1px solid #e0d5c7;font-weight:700;font-size:13px;color:#8b6914;">${fmtPayment(dep)}</td>
      </tr>
      <tr style="background:#fefcf8;">
        <td style="padding:10px 14px;border-bottom:1px solid #e0d5c7;">
          <div style="font-weight:600;color:#5c4a38;">Progress Payment (${d.progressPct}%)</div>
          <div style="font-size:9.5px;color:#a07850;margin-top:2px;">Due upon 50% project completion</div>
        </td>
        <td style="padding:10px 14px;text-align:right;border-bottom:1px solid #e0d5c7;font-weight:700;font-size:13px;color:#8b6914;">${fmtPayment(pro)}</td>
      </tr>
      <tr style="background:#f5ecd8;">
        <td style="padding:10px 14px;">
          <div style="font-weight:600;color:#5c4a38;">Final Balance (${d.finalPct}%)</div>
          <div style="font-size:9.5px;color:#a07850;margin-top:2px;">Due upon project completion &amp; walkthrough</div>
        </td>
        <td style="padding:10px 14px;text-align:right;font-weight:700;font-size:13px;color:#8b6914;">${fmtPayment(fin)}</td>
      </tr>
    </table>
  </div>
  <div style="margin-top:8px;font-size:9.5px;color:#a07850;font-style:italic;">
    SkyGlobal Renovations operates with full financial transparency. All material costs are invoiced at direct Sherwin-Williams contractor pricing with zero markup.
  </div>

  ${pdfSecHead('Section VI — Warranty &amp; Provisions')}
  <div style="font-size:11px;line-height:1.7;">
    <p style="margin:0 0 10px;"><strong style="color:#8b6914;">1. White Glove Cleanup:</strong> 30–45 minutes of dedicated site cleanup performed at the end of each work day. SkyGlobal leaves your home as clean as we found it — every day.</p>
    <p style="margin:0 0 10px;"><strong style="color:#8b6914;">2. 5-Year Workmanship Warranty:</strong> SkyGlobal Renovations LLC provides a 5-year warranty on all workmanship. Any defects in application, adhesion, or finish will be remediated at no cost within this period.</p>
    <p style="margin:0;"><strong style="color:#8b6914;">3. Insurance Coverage:</strong> SkyGlobal Renovations LLC carries $2,000,000 General Liability Insurance. Policy No. CEG-00312198-00. Certificate of Insurance available upon request.</p>
  </div>

  <!-- SIGNATURE -->
  <div style="margin-top:32px;padding:20px 24px;border:1px solid #e0d5c7;border-radius:6px;background:#fefcf8;">
    <div style="font-size:10px;font-weight:700;color:#b8860b;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:16px;">Client Acceptance</div>
    <div style="display:flex;gap:48px;">
      <div style="flex:2;">
        <div style="border-bottom:1.5px solid #1c1209;height:40px;margin-bottom:6px;"></div>
        <div style="font-size:10px;color:#a07850;">Client Acceptance Signature</div>
      </div>
      <div style="flex:1;">
        <div style="border-bottom:1.5px solid #1c1209;height:40px;margin-bottom:6px;"></div>
        <div style="font-size:10px;color:#a07850;">Date</div>
      </div>
    </div>
    <div style="margin-top:12px;font-size:10px;color:#a07850;font-style:italic;">
      By signing above, client acknowledges having read and agreed to all terms, scope, and pricing outlined in this proposal.
    </div>
  </div>

</div>`;
}

// ─── Segment 3: Certificate of Insurance ──────────────────────────────────────
function buildSegment3HTML(): string {
  return `
<div style="${PDF_WRAP}">

  ${pdfSecHead('Certificate of Insurance')}
  <div style="border:1px solid #e0d5c7;border-left:4px solid #d4a843;border-radius:6px;padding:20px 22px;font-size:10.5px;line-height:1.9;">
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:4px 0;width:50%;"><strong>Insured:</strong> SkyGlobal Renovations LLC</td>
        <td style="padding:4px 0;"><strong>Effective Date:</strong> On file</td>
      </tr>
      <tr>
        <td style="padding:4px 0;"><strong>Policy Number:</strong> CEG-00312198-00</td>
        <td style="padding:4px 0;"><strong>Expiration Date:</strong> On file</td>
      </tr>
      <tr>
        <td style="padding:4px 0;"><strong>Coverage Type:</strong> General Liability</td>
        <td style="padding:4px 0;"><strong>Phone:</strong> 352-782-2460</td>
      </tr>
      <tr>
        <td style="padding:4px 0;"><strong>Coverage Limit:</strong> $2,000,000</td>
        <td style="padding:4px 0;"><strong>Email:</strong> skyglobalsvcs@gmail.com</td>
      </tr>
    </table>
    <div style="margin-top:14px;padding:10px 14px;background:#f5ecd8;border-radius:4px;font-style:italic;color:#a07850;font-size:10px;">
      A full Certificate of Insurance (COI) is available upon request and can be sent directly to the client, property manager, or HOA.
    </div>
  </div>

</div>`;
}

function buildInitialData(template: ProposalTemplate, customer: any) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const validUntil = format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
  const base = {
    projectName: '',
    issueDate: today,
    validUntil,
    clientName: customer?.name ?? '',
    clientContact: [customer?.phone, customer?.email].filter(Boolean).join(' | '),
    clientAddress: [customer?.address, customer?.city, customer?.state].filter(Boolean).join(', '),
    projectScope: template === 'interior' ? 'Full Interior Repaint' : '',
    totalInvestment: null as number | null,
    depositPct: 30,
    progressPct: 45,
    finalPct: 25,
    lineItems: defaultLineItems(template),
    showInsurancePage: true,
    // template-specific
    coatingTier: template === 'exterior' ? 'tier2' : template === 'cabinet' ? 'signature' : '',
    sheen: 'Satin',
    scopeOfWork: defaultScopeSteps(template),
  };
  return base;
}

type EditorData = ReturnType<typeof buildInitialData>;

export default function ProposalNewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const template = (searchParams.get('template') ?? 'interior') as ProposalTemplate;
  const customerId = searchParams.get('customer');
  const proposalId = searchParams.get('id');

  const [customer, setCustomer] = useState<any>(null);
  const [data, setData] = useState<EditorData | null>(null);
  const [proposalDbId, setProposalDbId] = useState<string | null>(proposalId);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [pdfLoading, setPdfLoading] = useState(false);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  const isFirstSave = useRef(true);
  const proposalRef = useRef<HTMLDivElement>(null);

  // Load customer if provided
  useEffect(() => {
    if (!customerId) {
      setData(buildInitialData(template, null));
      return;
    }
    const supabase = createClient();
    supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single()
      .then(({ data: cust }) => {
        setCustomer(cust);
        setData(buildInitialData(template, cust));
      });
  }, [customerId, template]);

  // Load existing proposal if editing
  useEffect(() => {
    if (!proposalId) return;
    const supabase = createClient();
    Promise.all([
      supabase.from('proposals').select('*, customer:customers(*)').eq('id', proposalId).single(),
      supabase
        .from('proposal_line_items')
        .select('*')
        .eq('proposal_id', proposalId)
        .order('sort_order'),
    ]).then(([{ data: p }, { data: items }]) => {
      if (!p) return;
      setCustomer(p.customer);
      setProposalDbId(p.id);
      const td = p.template_data ?? {};
      setData({
        projectName: p.project_name ?? '',
        issueDate: p.issue_date ?? format(new Date(), 'yyyy-MM-dd'),
        validUntil:
          p.valid_until ?? format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        clientName: p.client_name ?? '',
        clientContact: p.client_contact ?? '',
        clientAddress: p.client_address ?? '',
        projectScope: p.project_scope ?? '',
        totalInvestment: p.total_investment,
        depositPct: p.deposit_pct,
        progressPct: p.progress_pct,
        finalPct: p.final_pct,
        lineItems: (items ?? []).map((i: any) => ({
          id: i.id,
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
          total: i.total,
        })),
        showInsurancePage: p.show_insurance_page,
        coatingTier: td.coatingTier ?? '',
        sheen: td.sheen ?? 'Satin',
        scopeOfWork: Array.isArray(td.scopeOfWork)
          ? td.scopeOfWork
          : td.scopeOfWork
            ? [{ title: 'Scope of Work', bullets: [td.scopeOfWork] }]
            : defaultScopeSteps(p.template as ProposalTemplate),
      });
    });
  }, [proposalId]);

  const handleChange = useCallback((patch: Partial<EditorData>) => {
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, ...patch };
    });
    // Debounced auto-save
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaveStatus('saving');
      setData((current) => {
        if (current) scheduleSave(current);
        return current;
      });
    }, 2000);
  }, []);

  const scheduleSave = useCallback(
    async (d: EditorData) => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const payload = {
          user_id: user.id,
          customer_id: customerId || null,
          template,
          project_name: d.projectName || null,
          client_name: d.clientName || null,
          client_contact: d.clientContact || null,
          client_address: d.clientAddress || null,
          project_scope: d.projectScope || null,
          total_investment: d.totalInvestment,
          issue_date: d.issueDate || null,
          valid_until: d.validUntil || null,
          deposit_pct: d.depositPct,
          progress_pct: d.progressPct,
          final_pct: d.finalPct,
          show_insurance_page: d.showInsurancePage,
          template_data: { coatingTier: d.coatingTier, sheen: d.sheen, scopeOfWork: d.scopeOfWork },
          updated_at: new Date().toISOString(),
        };

        let currentId = proposalDbId;
        if (!currentId) {
          const { data: created, error } = await supabase
            .from('proposals')
            .insert(payload)
            .select('id')
            .single();
          if (error) throw error;
          currentId = created.id;
          setProposalDbId(currentId);
          // Update URL without reload
          const url = new URL(window.location.href);
          url.searchParams.set('id', currentId!);
          window.history.replaceState({}, '', url.toString());
        } else {
          const { error } = await supabase.from('proposals').update(payload).eq('id', currentId);
          if (error) throw error;
        }

        // Upsert line items
        if (currentId) {
          await supabase.from('proposal_line_items').delete().eq('proposal_id', currentId);
          if (d.lineItems.length > 0) {
            await supabase.from('proposal_line_items').insert(
              d.lineItems.map((item, idx) => ({
                proposal_id: currentId,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total: item.total,
                sort_order: idx,
              }))
            );
          }
        }

        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } catch (err) {
        setSaveStatus('idle');
        toast.error('Auto-save failed');
      }
    },
    [customerId, template, proposalDbId]
  );

  const handleSaveNow = async () => {
    if (!data) return;
    setSaveStatus('saving');
    await scheduleSave(data);
  };

  const handleDownloadPDF = async () => {
    if (!data) return;
    setPdfLoading(true);
    const containers: HTMLDivElement[] = [];
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      // ── Step 1: Fetch logo as base64 ──────────────────────────────────────────
      let logoSrc = '';
      try {
        const resp = await fetch('/skyglobal-logo.svg');
        const blob = await resp.blob();
        logoSrc = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch {
        // logo fetch failed — continue without it
      }

      // ── Step 2: Build segments ─────────────────────────────────────────────────
      // Three segments keep sections self-contained — no orphaned headers across
      // page breaks from arbitrary canvas slicing.
      const segmentHTMLs = [
        buildSegment1HTML(data, template, logoSrc),
        buildSegment2HTML(data),
      ];
      if (data.showInsurancePage) segmentHTMLs.push(buildSegment3HTML());

      // ── Step 3: Capture each segment ──────────────────────────────────────────
      const PAGE_W = 794;
      const PAGE_H = Math.round(PAGE_W * (297 / 210));
      const SCALE = 2;
      const scaledPageH = PAGE_H * SCALE;

      const captures: Array<{ canvas: HTMLCanvasElement; pageCount: number }> = [];

      for (const html of segmentHTMLs) {
        const container = document.createElement('div');
        container.style.cssText = [
          'position:fixed',
          'top:-99999px',
          'left:0',
          'width:794px',
          'background:#ffffff',
          'z-index:99999',
          'pointer-events:none',
        ].join(';');
        container.innerHTML = html;
        document.body.appendChild(container);
        containers.push(container);

        const imgs = Array.from(container.querySelectorAll('img'));
        await Promise.all(
          imgs.map((img) =>
            img.complete
              ? Promise.resolve()
              : new Promise<void>((res) => {
                  img.onload = () => res();
                  img.onerror = () => res();
                  setTimeout(res, 3000);
                })
          )
        );
        await new Promise<void>((res) => requestAnimationFrame(() => res()));

        const canvas = await html2canvas(container, {
          scale: SCALE,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: PAGE_W,
          height: container.scrollHeight,
          windowWidth: PAGE_W,
          scrollX: 0,
          scrollY: 0,
        });

        if (canvas.width === 0 || canvas.height === 0) {
          throw new Error('html2canvas returned empty canvas');
        }

        captures.push({ canvas, pageCount: Math.ceil(canvas.height / scaledPageH) });
      }

      // ── Step 4: Build PDF ──────────────────────────────────────────────────────
      const totalPages = captures.reduce((sum, c) => sum + c.pageCount, 0);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [PAGE_W, PAGE_H],
        compress: true,
      });

      let pageNum = 0;
      for (const { canvas, pageCount } of captures) {
        const scaledW = canvas.width;

        for (let i = 0; i < pageCount; i++) {
          if (pageNum > 0) pdf.addPage();
          pageNum++;

          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = scaledW;
          sliceCanvas.height = scaledPageH;
          const ctx = sliceCanvas.getContext('2d')!;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, scaledW, scaledPageH);
          ctx.drawImage(canvas, 0, -(i * scaledPageH));

          // Skip blank trailing pages within a segment
          if (i > 0) {
            const imgd = ctx.getImageData(0, 0, scaledW, Math.min(40, scaledPageH));
            const hasContent = imgd.data.some((v, idx) => idx % 4 !== 3 && v < 250);
            if (!hasContent) {
              pageNum--;
              break;
            }
          }

          pdf.addImage(
            sliceCanvas.toDataURL('image/jpeg', 0.92),
            'JPEG',
            0,
            0,
            PAGE_W,
            PAGE_H
          );

          // Footer
          pdf.setFontSize(7.5);
          pdf.setTextColor(160, 150, 130);
          pdf.text(
            `SkyGlobal Renovations LLC  |  Page ${pageNum} of ${totalPages}`,
            PAGE_W / 2,
            PAGE_H - 10,
            { align: 'center' }
          );
        }
      }

      // ── Step 5: Save ───────────────────────────────────────────────────────────
      const slug = (data.clientName || 'Client').replace(/\s+/g, '_');
      const dateStr = format(new Date(), 'MMMd_yyyy');
      pdf.save(`SkyGlobal_Proposal_${slug}_${dateStr}.pdf`);
      toast.success('PDF downloaded');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[PDF]', err);
      toast.error(`PDF failed: ${msg}`);
    } finally {
      for (const c of containers) {
        if (document.body.contains(c)) document.body.removeChild(c);
      }
      setPdfLoading(false);
    }
  };

  const renderTemplate = () => {
    if (!data) return null;
    const commonProps = { data: data as any, onChange: handleChange };
    switch (template) {
      case 'interior':
        return <InteriorTemplate {...commonProps} />;
      case 'exterior':
        return <ExteriorTemplate {...commonProps} />;
      case 'cabinet':
        return <CabinetTemplate {...commonProps} />;
      default:
        return <CustomTemplate {...commonProps} />;
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--sg-base)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Toolbar */}
      <div
        className="proposal-toolbar"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'var(--sg-surface)',
          borderBottom: '1px solid var(--sg-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          height: 52,
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}
      >
        {/* Left */}
        <div
          className="proposal-toolbar-left"
          style={{ display: 'flex', alignItems: 'center', gap: 14 }}
        >
          <Link
            href="/proposals"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--sg-text-2)',
              fontSize: 13,
              textDecoration: 'none',
              padding: '4px 8px',
              borderRadius: 6,
            }}
            className="hover:text-white hover:bg-[var(--sg-elevated)] transition-colors"
          >
            <ArrowLeft size={15} /> Back
          </Link>
          <div style={{ width: 1, height: 24, background: 'var(--sg-border)' }} />
          <span
            style={{
              background: 'var(--sg-gold)',
              color: '#000',
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 10px',
              borderRadius: 20,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {TEMPLATE_LABELS[template]}
          </span>
        </div>

        {/* Center */}
        <div
          className="proposal-toolbar-center"
          style={{
            fontSize: 12,
            color: 'var(--sg-text-2)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {saveStatus === 'saving' && (
            <>
              <Loader2 size={13} className="animate-spin" style={{ color: 'var(--sg-gold)' }} />{' '}
              Saving...
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <CheckCircle size={13} style={{ color: 'var(--c-sage)' }} /> Saved
            </>
          )}
          {saveStatus === 'idle' && proposalDbId && (
            <>
              <CheckCircle size={13} style={{ color: 'var(--sg-text-3)' }} /> Auto-save on
            </>
          )}
        </div>

        {/* Right */}
        <div
          className="proposal-toolbar-right"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          {/* Insurance toggle */}
          {data && (
            <button
              onClick={() => handleChange({ showInsurancePage: !data.showInsurancePage })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: data.showInsurancePage ? 'rgba(122,158,126,0.12)' : 'transparent',
                border: `1px solid ${data.showInsurancePage ? 'var(--sg-sky)' : 'var(--sg-border)'}`,
                borderRadius: 8,
                padding: '6px 12px',
                cursor: 'pointer',
                color: data.showInsurancePage ? 'var(--sg-sky)' : 'var(--sg-text-2)',
                fontSize: 12,
              }}
            >
              {data.showInsurancePage ? <Eye size={14} /> : <EyeOff size={14} />}
              Insurance Page
            </button>
          )}
          <button
            onClick={handleSaveNow}
            disabled={saveStatus === 'saving'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              border: '1px solid var(--sg-border)',
              borderRadius: 8,
              padding: '6px 14px',
              cursor: 'pointer',
              color: 'var(--sg-text-1)',
              fontSize: 13,
              fontWeight: 500,
            }}
            className="hover:border-[var(--sg-text-3)] transition-colors"
          >
            <Save size={14} /> Save Draft
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--sg-gold)',
              border: 'none',
              borderRadius: 8,
              padding: '6px 16px',
              cursor: pdfLoading ? 'not-allowed' : 'pointer',
              color: '#000',
              fontSize: 13,
              fontWeight: 700,
              opacity: pdfLoading ? 0.7 : 1,
            }}
          >
            {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {pdfLoading ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Document area */}
      <div
        className="proposal-doc-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '40px 20px 80px',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        {!data ? (
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}
          >
            <Loader2 size={28} className="animate-spin" style={{ color: 'var(--sg-gold)' }} />
          </div>
        ) : (
          <div
            ref={proposalRef}
            data-proposal-content
            style={{
              background: '#fff',
              width: '100%',
              maxWidth: 794,
              padding: '48px 56px',
              borderRadius: 2,
              boxShadow: '0 4px 24px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.3)',
              minHeight: '100vh',
            }}
          >
            {/* Editable field hover hint */}
            <div
              data-pdf-hide
              style={{
                marginBottom: 16,
                padding: '6px 12px',
                background: 'rgba(139,105,20,0.06)',
                border: '1px solid rgba(139,105,20,0.15)',
                borderRadius: 4,
                fontSize: 11,
                color: 'var(--sg-text-2)',
                fontFamily: 'sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ color: 'var(--sg-gold)', fontWeight: 600 }}>✦</span>
              Fields with{' '}
              <span
                style={{
                  borderBottom: '1.5px dashed var(--sg-gold)',
                  padding: '0 4px',
                  color: 'var(--sg-gold)',
                }}
              >
                gold underline
              </span>{' '}
              are editable — click to type
            </div>
            {renderTemplate()}
          </div>
        )}
      </div>
    </div>
  );
}
