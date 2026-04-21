'use client';
import { EditableField } from '../EditableField';
import { EditableTable, LineItem } from '../EditableTable';
import { PaymentSchedule } from '../PaymentSchedule';
import { ScopeOfWork, ScopeStep } from '../ScopeOfWork';
import { Lock } from 'lucide-react';

const S = {
  page: {
    background: '#FEFCF8',
    fontFamily: 'Georgia, "Times New Roman", serif',
    color: '#1C1209',
    fontSize: 13,
    lineHeight: 1.6,
  } as React.CSSProperties,
  sectionHeader: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: '#8B6914',
    borderBottom: '1px solid #E0D5C7',
    paddingBottom: 4,
    marginBottom: 12,
    marginTop: 24,
  },
  staticNote: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 4,
    color: '#A07850',
    fontSize: 10,
    fontFamily: 'sans-serif',
    fontStyle: 'normal' as const,
    marginTop: 4,
  },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 12 },
  th: {
    background: '#E8F0E4',
    color: '#4A6741',
    padding: '6px 10px',
    textAlign: 'left' as const,
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: '0.04em',
    borderBottom: '2px solid #4A6741',
  },
  td: {
    padding: '7px 10px',
    border: '1px solid #E0D5C7',
    verticalAlign: 'middle' as const,
  },
};

function LockedBadge() {
  return (
    <span data-pdf-hide style={S.staticNote}>
      <Lock size={10} /> Static — edit in Settings
    </span>
  );
}

function PageBreak() {
  return (
    <div
      data-page-break
      style={{ borderTop: '3px dashed #E0D5C7', margin: '32px 0', position: 'relative' }}
    >
      <span
        data-page-break-label
        style={{
          position: 'absolute',
          top: -9,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#FEFCF8',
          padding: '0 8px',
          fontSize: 10,
          color: '#A07850',
          fontFamily: 'sans-serif',
        }}
      >
        page break
      </span>
    </div>
  );
}

interface Props {
  data: {
    projectName: string;
    issueDate: string;
    validUntil: string;
    clientName: string;
    clientContact: string;
    clientAddress: string;
    projectScope: string;
    totalInvestment: number | null;
    depositPct: number;
    progressPct: number;
    finalPct: number;
    lineItems: LineItem[];
    scopeOfWork: ScopeStep[];
    showInsurancePage: boolean;
  };
  onChange: (patch: Partial<Props['data']>) => void;
}

export function InteriorTemplate({ data, onChange }: Props) {
  const f =
    (field: keyof Props['data']) => (val: string | number | LineItem[] | boolean | ScopeStep[]) =>
      onChange({ [field]: val } as any);

  return (
    <div style={S.page}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 20,
        }}
      >
        <div>
          <div
            style={{
              width: 64,
              height: 64,
              background: '#FFFFFF',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 4,
            }}
          >
            <img src="/skyglobal-logo.svg" width="40" height="40" alt="SkyGlobal" />
          </div>
          <LockedBadge />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{ fontSize: 22, fontWeight: 700, color: '#1C1209', letterSpacing: '-0.02em' }}
          >
            SkyGlobal Renovations LLC
          </div>
          <div style={{ fontSize: 11, color: '#A07850', marginTop: 2 }}>
            Professional Renovation Services
          </div>
        </div>
      </div>

      {/* Proposal Title Banner */}
      <div
        style={{
          background: '#F0EAE0',
          borderTop: '3px solid #8B6914',
          borderBottom: '3px solid #8B6914',
          padding: '14px 24px',
          marginBottom: 16,
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          textAlign: 'center',
        }}
      >
        <EditableField
          value={data.projectName}
          onChange={f('projectName')}
          placeholder="PROJECT NAME / NUMBER"
          style={{ color: '#8B6914', fontFamily: 'Georgia, serif', fontSize: 14, fontWeight: 700 }}
          inputStyle={{ background: '#F5ECD8', color: '#8B6914', border: '1px solid #D4A853' }}
        />{' '}
        <span style={{ color: '#A07850', fontWeight: 400 }}>| PROFESSIONAL SERVICE PROPOSAL</span>
      </div>

      {/* Header Info */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 4,
          fontSize: 12,
        }}
      >
        <div>
          <strong>SkyGlobal Renovations LLC</strong>
          <LockedBadge />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>
            <strong>Date of Issuance:</strong>{' '}
            <EditableField
              value={data.issueDate}
              onChange={f('issueDate')}
              type="date"
              placeholder="Select date"
            />
          </div>
          <div>
            <strong>Proposal Valid Until:</strong>{' '}
            <EditableField
              value={data.validUntil}
              onChange={f('validUntil')}
              type="date"
              placeholder="Select date"
            />
          </div>
        </div>
      </div>

      {/* Confidentiality */}
      <div
        style={{
          background: '#F5ECD8',
          borderLeft: '3px solid #D4A853',
          border: '1px solid #E8D5A3',
          borderRadius: 4,
          padding: '8px 12px',
          marginBottom: 4,
          fontSize: 11,
          color: '#A07850',
          fontStyle: 'italic',
          lineHeight: 1.5,
        }}
      >
        <strong style={{ fontStyle: 'normal', color: '#5C4A38' }}>CONFIDENTIAL:</strong> This
        proposal and all associated pricing, processes, and materials are proprietary to SkyGlobal
        Renovations LLC. This document may not be reproduced, distributed, or used without written
        authorization.
      </div>

      {/* Section I */}
      <div style={S.sectionHeader}>
        Section I — Business Contact
        <LockedBadge />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
        <div>
          <div>
            <strong>Phone:</strong> 352-782-2460 | 470-469-9961
          </div>
          <div>
            <strong>Email:</strong> skyglobalsvcs@gmail.com
          </div>
          <div>
            <strong>Web:</strong> skyglobalsvcs.com
          </div>
        </div>
        <div>
          <div>
            <strong>Instagram & Facebook:</strong> @skyglobalp
          </div>
          <div>
            <strong>Credentials:</strong> Thumbtack Profile — 75+ Verified Reviews
          </div>
        </div>
      </div>

      <PageBreak />

      {/* Section II */}
      <div style={S.sectionHeader}>Section II — Client & Project Summary</div>
      <table style={S.table}>
        <tbody>
          {[
            [
              'Client Name',
              <EditableField
                key="cn"
                value={data.clientName}
                onChange={f('clientName')}
                placeholder="Client full name"
              />,
            ],
            [
              'Contact Info',
              <EditableField
                key="ci"
                value={data.clientContact}
                onChange={f('clientContact')}
                placeholder="Phone / Email"
              />,
            ],
            [
              'Project Address',
              <EditableField
                key="ca"
                value={data.clientAddress}
                onChange={f('clientAddress')}
                placeholder="Street, City, State ZIP"
              />,
            ],
            [
              'Project Scope',
              <EditableField
                key="ps"
                multiline
                value={data.projectScope}
                onChange={(v) => onChange({ projectScope: v as string })}
                placeholder="Describe the scope of work for this project..."
              />,
            ],
            [
              'Total Investment',
              <EditableField
                key="ti"
                value={data.totalInvestment != null ? String(data.totalInvestment) : ''}
                onChange={(v) => onChange({ totalInvestment: v ? parseFloat(v) : null })}
                type="number"
                prefix="$"
                placeholder="0.00"
              />,
            ],
          ].map(([label, content], i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#F5ECD8' : '#FEFCF8' }}>
              <td style={{ ...S.td, fontWeight: 600, width: '35%', color: '#5C4A38' }}>
                {label as string}
              </td>
              <td style={S.td}>{content as React.ReactNode}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Section III */}
      <div style={S.sectionHeader}>Section III — The SkyGlobal Interior Process</div>
      <ScopeOfWork
        steps={data.scopeOfWork}
        onChange={(steps) => onChange({ scopeOfWork: steps })}
      />

      <PageBreak />

      {/* Section IV */}
      <div style={S.sectionHeader}>Section IV — Material Specifications</div>
      <p style={{ fontSize: 12, color: '#5C4A38', marginBottom: 12, fontStyle: 'italic' }}>
        We use exclusively <strong style={{ fontStyle: 'normal' }}>Sherwin-Williams</strong>{' '}
        products. Our partnership discounts are passed directly to you with{' '}
        <strong style={{ fontStyle: 'normal' }}>Zero Material Markup.</strong>
      </p>
      <EditableTable items={data.lineItems} onChange={(items) => onChange({ lineItems: items })} />

      {/* Section V */}
      <div style={S.sectionHeader}>Section V — Investment & Payment Schedule</div>
      <p style={{ fontSize: 12, color: '#5C4A38', marginBottom: 12 }}>
        The following payment schedule reflects our commitment to project alignment and financial
        transparency:
      </p>
      <PaymentSchedule
        total={data.totalInvestment}
        depositPct={data.depositPct}
        progressPct={data.progressPct}
        finalPct={data.finalPct}
        onDepositChange={(v) => onChange({ depositPct: v })}
        onProgressChange={(v) => onChange({ progressPct: v })}
        onFinalChange={(v) => onChange({ finalPct: v })}
      />

      {/* Section VI */}
      <div style={S.sectionHeader}>
        Section VI — Warranty & Provisions
        <LockedBadge />
      </div>
      {[
        [
          'White Glove Cleanup',
          '30–45 minutes of dedicated site cleanup performed at the end of each work day. SkyGlobal leaves your home as clean as we found it — every day.',
        ],
        [
          '5-Year Workmanship Warranty',
          'SkyGlobal Renovations LLC provides a 5-year warranty on all workmanship. Any defects in application, adhesion, or finish will be remediated at no cost within this period.',
        ],
        [
          'Insurance Coverage',
          'SkyGlobal Renovations LLC carries $2,000,000 General Liability Insurance. Policy No. CEG-00312198-00. Certificate of Insurance available upon request.',
        ],
      ].map(([title, body], i) => (
        <div key={i} style={{ marginBottom: 10, fontSize: 12 }}>
          <strong style={{ color: '#1C1209' }}>
            {i + 1}. {title}:
          </strong>{' '}
          <span style={{ color: '#5C4A38' }}>{body}</span>
        </div>
      ))}

      {/* Signature */}
      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '1px solid #E0D5C7' }}>
        <div style={{ display: 'flex', gap: 40, fontSize: 12 }}>
          <div>
            <div
              style={{
                borderBottom: '1px solid #1C1209',
                minWidth: 200,
                paddingBottom: 2,
                marginBottom: 4,
              }}
            >
              &nbsp;
            </div>
            <div style={{ color: '#A07850' }}>Client Acceptance Signature</div>
          </div>
          <div>
            <div
              style={{
                borderBottom: '1px solid #1C1209',
                minWidth: 120,
                paddingBottom: 2,
                marginBottom: 4,
              }}
            >
              &nbsp;
            </div>
            <div style={{ color: '#A07850' }}>Date</div>
          </div>
        </div>
      </div>

      {/* Insurance Page */}
      {data.showInsurancePage && (
        <>
          <PageBreak />
          <div style={S.sectionHeader}>Certificate of Insurance</div>
          <div
            style={{
              border: '1px solid #E0D5C7',
              borderLeft: '3px solid #4A6741',
              borderRadius: 6,
              padding: 20,
              fontSize: 12,
              lineHeight: 1.8,
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <strong>Insured:</strong> SkyGlobal Renovations LLC
                <br />
                <strong>Policy Number:</strong> CEG-00312198-00
                <br />
                <strong>Coverage Type:</strong> General Liability
                <br />
                <strong>Coverage Limit:</strong> $2,000,000
              </div>
              <div>
                <strong>Effective Date:</strong> On file
                <br />
                <strong>Expiration Date:</strong> On file
                <br />
                <strong>Phone:</strong> 352-782-2460
                <br />
                <strong>Email:</strong> skyglobalsvcs@gmail.com
              </div>
            </div>
            <div
              style={{
                marginTop: 12,
                padding: '8px 12px',
                background: '#F5ECD8',
                borderRadius: 4,
                fontStyle: 'italic',
                color: '#A07850',
                fontSize: 11,
              }}
            >
              A full Certificate of Insurance (COI) is available upon request and can be sent
              directly to the client, property manager, or HOA.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
