'use client';
import { useState } from 'react';
import { formatRelativeTime } from '@/lib/utils';

const TYPE_CONFIG: Record<string, { dot: string; bg: string; icon: string }> = {
  Call: { dot: '#3583b3', bg: 'rgba(53,131,179,0.15)', icon: '📞' },
  Text: { dot: '#3583b3', bg: 'rgba(53,131,179,0.15)', icon: '💬' },
  Email: { dot: '#3583b3', bg: 'rgba(53,131,179,0.15)', icon: '📧' },
  Visit: { dot: '#e6ab35', bg: 'rgba(230,171,53,0.15)', icon: '🏠' },
  Note: { dot: '#bfb9ae', bg: 'rgba(191,185,174,0.12)', icon: '📝' },
  'Stage Change': { dot: '#3583b3', bg: 'rgba(53,131,179,0.15)', icon: '🔄' },
  'Payment Received': { dot: '#22c55e', bg: 'rgba(34,197,94,0.15)', icon: '💰' },
  'Photo Added': { dot: '#bfb9ae', bg: 'rgba(191,185,174,0.12)', icon: '📷' },
  'Estimate Sent': { dot: '#e6ab35', bg: 'rgba(230,171,53,0.15)', icon: '📋' },
  'Proposal Sent': { dot: '#e6ab35', bg: 'rgba(230,171,53,0.15)', icon: '📄' },
  'Lead Added': { dot: '#3583b3', bg: 'rgba(53,131,179,0.15)', icon: '🎯' },
  'Project Started': { dot: '#e6ab35', bg: 'rgba(230,171,53,0.15)', icon: '🔨' },
};

const DEFAULT_CONFIG = { dot: '#8b857a', bg: 'rgba(139,133,122,0.10)', icon: '📋' };
const PAGE_SIZE = 10;

interface Activity {
  id: string;
  type: string;
  content?: string;
  created_at: string;
  user_name?: string;
}

interface Props {
  activities: Activity[];
}

export function ActivityTimeline({ activities }: Props) {
  const [page, setPage] = useState(1);
  const visible = activities.slice(0, page * PAGE_SIZE);
  const remaining = activities.length - visible.length;

  if (activities.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '56px 16px',
          gap: 10,
        }}
      >
        <div style={{ fontSize: 36, opacity: 0.5 }}>📋</div>
        <p style={{ color: 'var(--c-text-3)', fontSize: 14, fontWeight: 500 }}>No activity yet</p>
        <p style={{ color: 'var(--c-text-4)', fontSize: 12 }}>Log calls, texts, and notes here.</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Vertical timeline line */}
      <div
        style={{
          position: 'absolute',
          left: 15,
          top: 16,
          bottom: remaining > 0 ? 72 : 16,
          width: 2,
          background: 'var(--c-border-light)',
          borderRadius: 2,
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {visible.map((a, i) => {
          const cfg = TYPE_CONFIG[a.type] ?? DEFAULT_CONFIG;
          return (
            <div
              key={a.id}
              style={{
                display: 'flex',
                gap: 14,
                paddingBottom: i < visible.length - 1 ? 20 : 0,
                animation: 'fade-up 0.25s ease both',
                animationDelay: `${Math.min(i * 25, 120)}ms`,
              }}
            >
              {/* Icon dot */}
              <div
                style={{
                  position: 'relative',
                  flexShrink: 0,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: cfg.bg,
                  border: `2px solid ${cfg.dot}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  zIndex: 1,
                }}
              >
                {cfg.icon}
              </div>

              {/* Content */}
              <div style={{ flex: 1, paddingTop: 5 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--c-text-1)',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                  >
                    {a.type}
                  </span>
                  {a.user_name && (
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--c-text-4)',
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      · {a.user_name}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 11,
                      color: '#8b857a',
                      marginLeft: 'auto',
                      whiteSpace: 'nowrap',
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    {formatRelativeTime(a.created_at)}
                  </span>
                </div>
                {a.content && (
                  <p
                    style={{
                      fontSize: 13,
                      color: 'var(--c-text-3)',
                      marginTop: 3,
                      lineHeight: 1.55,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                  >
                    {a.content}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {remaining > 0 && (
        <div style={{ textAlign: 'center', paddingTop: 20 }}>
          <button
            onClick={() => setPage((p) => p + 1)}
            style={{
              padding: '7px 20px',
              borderRadius: 8,
              background: 'var(--c-border-light)',
              border: '1px solid var(--c-border)',
              color: 'var(--c-text-3)',
              fontSize: 12,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--c-nested)';
              e.currentTarget.style.color = 'var(--c-text-2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--c-border-light)';
              e.currentTarget.style.color = 'var(--c-text-3)';
            }}
          >
            Load more ({remaining} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
