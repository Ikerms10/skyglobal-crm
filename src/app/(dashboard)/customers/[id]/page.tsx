'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { formatCurrency, formatDate, formatRelativeTime, cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge, PaymentBadge, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { NewProjectModal } from '@/components/projects/NewProjectModal';
import { EditCustomerModal } from '@/components/customers/EditCustomerModal';
import { AddActivityModal } from '@/components/customers/AddActivityModal';
import { ActivityTimeline } from '@/components/customers/ActivityTimeline';
import { MapsLink, DirectionsButton } from '@/components/ui/MapsLink';
import { TextTemplatesModal } from '@/components/ui/TextTemplatesModal';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Building2,
  Edit2,
  Trash2,
  Plus,
  Briefcase,
  Target,
  Activity,
  User,
  DollarSign,
  MessageSquare,
  FileText,
} from 'lucide-react';
import { TemplateSelector } from '@/components/proposals/TemplateSelector';
import { ProposalTemplate } from '@/types';

const TABS = ['projects', 'leads', 'activity', 'info'] as const;
type Tab = (typeof TABS)[number];

const ACTIVITY_ICONS: Record<string, string> = {
  Call: '📞',
  Text: '💬',
  Email: '📧',
  Visit: '🏠',
  Note: '📝',
  'Stage Change': '🔄',
  'Payment Received': '💰',
  'Photo Added': '📷',
  'Estimate Sent': '📋',
};

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const customerId = params.id;

  const [customer, setCustomer] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('projects');

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [addActivityOpen, setAddActivityOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [textTemplatesOpen, setTextTemplatesOpen] = useState(false);
  const [proposalSelectorOpen, setProposalSelectorOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      const { data: cust, error: ce } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();
      if (ce) throw new Error(ce.message);
      setCustomer(cust);

      const { data: proj, error: pe } = await supabase
        .from('projects')
        .select('*')
        .eq('customer_id', customerId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (pe) throw new Error(pe.message);
      setProjects(proj ?? []);

      const { data: leds, error: le } = await supabase
        .from('leads')
        .select('*')
        .eq('customer_id', customerId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (le) throw new Error(le.message);
      setLeads(leds ?? []);

      const { data: acts, error: ae } = await supabase
        .from('activities')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      if (ae) throw new Error(ae.message);
      setActivities(acts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('customers')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', customerId);
      if (error) throw new Error(error.message);
      toast.success('Customer deleted');
      router.push('/customers');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-[var(--sg-danger)]">{error}</p>
        <Button onClick={loadData}>Try Again</Button>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-[var(--sg-text-2)]">Customer not found.</p>
        <Link
          href="/customers"
          className="text-[var(--sg-sky)] hover:underline text-sm mt-2 inline-block"
        >
          Back to Customers
        </Link>
      </div>
    );
  }

  const totalRevenue = projects.reduce((s, p) => s + (p.contract_value ?? 0), 0);
  const activeProjects = projects.filter((p) => p.status === 'In Progress').length;
  const openLeads = leads.filter((l) => !['Won', 'Lost'].includes(l.stage)).length;
  const avgProjectValue = projects.length > 0 ? totalRevenue / projects.length : 0;

  // Customer score (RFM-based)
  const lastProject = projects.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  const daysSinceLast = lastProject
    ? Math.floor((Date.now() - new Date(lastProject.created_at).getTime()) / 86400000)
    : null;
  const customerScore = (() => {
    let score = 0;
    if (totalRevenue > 10000) score += 40;
    else if (totalRevenue > 5000) score += 30;
    else if (totalRevenue > 2000) score += 20;
    else score += 10;
    if (daysSinceLast == null) score += 0;
    else if (daysSinceLast < 90) score += 30;
    else if (daysSinceLast < 180) score += 20;
    else if (daysSinceLast < 365) score += 10;
    if (projects.length >= 5) score += 30;
    else if (projects.length >= 3) score += 20;
    else if (projects.length >= 2) score += 10;
    else score += 5;
    if (score >= 80) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    return 'D';
  })();
  const SCORE_COLORS: Record<string, string> = { A: 'var(--c-sage)', B: 'var(--c-gold)', C: '#e07020', D: 'var(--c-danger)' };
  const SCORE_LABELS: Record<string, string> = { A: 'VIP Client', B: 'Good', C: 'Average', D: 'At Risk' };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Back */}
      <Link
        href="/customers"
        className="flex items-center gap-2 text-[var(--sg-text-2)] hover:text-[var(--sg-text-1)] transition-colors text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Customers
      </Link>

      {/* Header */}
      <div className="bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{customer.name}</h1>
              <Badge variant={customer.type === 'Commercial' ? 'purple' : 'info'}>
                {customer.type}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-[var(--sg-text-2)]">
              {customer.phone && (
                <a
                  href={`tel:${customer.phone}`}
                  className="flex items-center gap-1.5 hover:text-[var(--sg-sky)] transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  {customer.phone}
                </a>
              )}
              {customer.email && (
                <a
                  href={`mailto:${customer.email}`}
                  className="flex items-center gap-1.5 hover:text-[var(--sg-sky)] transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  {customer.email}
                </a>
              )}
              {(customer.city || customer.address) && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <MapsLink
                    address={[customer.address, customer.city, customer.state]
                      .filter(Boolean)
                      .join(', ')}
                    showIcon={false}
                  />
                </span>
              )}
              {customer.company_name && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  {customer.company_name}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {proposalSelectorOpen && (
              <TemplateSelector
                onSelect={(template: ProposalTemplate) => {
                  setProposalSelectorOpen(false);
                  router.push(`/proposals/new?template=${template}&customer=${customerId}`);
                }}
                onClose={() => setProposalSelectorOpen(false)}
                customerId={customerId}
              />
            )}
            {customer.address && (
              <DirectionsButton
                address={[customer.address, customer.city, customer.state]
                  .filter(Boolean)
                  .join(', ')}
              />
            )}
            <Button size="sm" variant="secondary" onClick={() => setProposalSelectorOpen(true)}>
              <FileText className="h-4 w-4" /> Proposal
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setTextTemplatesOpen(true)}>
              <MessageSquare className="h-4 w-4" /> Text
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
              <Edit2 className="h-4 w-4" /> Edit
            </Button>
            <Button size="sm" variant="danger" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[var(--sg-border)]">
          {[
            {
              label: 'Total Revenue',
              value: formatCurrency(totalRevenue),
              icon: DollarSign,
              color: 'text-[var(--sg-gold)]',
            },
            {
              label: 'Active Projects',
              value: String(activeProjects),
              icon: Briefcase,
              color: 'text-[var(--sg-sky)]',
            },
            {
              label: 'Open Leads',
              value: String(openLeads),
              icon: Target,
              color: 'text-[var(--c-sage)]',
            },
            {
              label: 'Avg Project Value',
              value: formatCurrency(avgProjectValue),
              icon: DollarSign,
              color: 'text-[var(--sg-text-2)]',
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <p className={`text-lg font-medium ${color}`}>{value}</p>
              <p className="text-xs text-[var(--sg-text-2)] mt-0.5 tracking-wide uppercase">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Customer Scorecard */}
      <div style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: 12, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text-2)', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}>
            Customer Scorecard
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: SCORE_COLORS[customerScore], fontFamily: "'DM Mono', monospace" }}>
              {customerScore}
            </span>
            <span style={{ fontSize: 11, color: SCORE_COLORS[customerScore], fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
              {SCORE_LABELS[customerScore]}
            </span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: 'Total Jobs', value: String(projects.length) },
            { label: 'Lifetime Revenue', value: formatCurrency(totalRevenue) },
            { label: 'Avg Job Value', value: projects.length > 0 ? formatCurrency(avgProjectValue) : '—' },
            { label: 'Days Since Last Job', value: daysSinceLast != null ? `${daysSinceLast}d` : '—' },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 10, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text-1)', fontFamily: "'DM Mono', monospace" }}>{value}</div>
            </div>
          ))}
        </div>
        {daysSinceLast != null && daysSinceLast > 180 && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(185,74,58,0.08)', border: '1px solid rgba(185,74,58,0.20)', borderRadius: 8, fontSize: 12, color: 'var(--c-danger)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            ⚠️ No work in {daysSinceLast} days — consider a re-engagement message.
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--sg-border)]">
        <nav className="flex gap-0 overflow-x-auto">
          {[
            { id: 'projects', label: `Projects (${projects.length})`, icon: Briefcase },
            { id: 'leads', label: `Leads (${leads.length})`, icon: Target },
            { id: 'activity', label: 'Activity', icon: Activity },
            { id: 'info', label: 'Info', icon: User },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as Tab)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === id
                  ? 'border-[var(--sg-gold)] text-[var(--sg-gold)]'
                  : 'border-transparent text-[var(--sg-text-2)] hover:text-[var(--sg-text-1)]'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setNewProjectOpen(true)}>
              <Plus className="h-4 w-4" /> New Project
            </Button>
          </div>
          {projects.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No projects yet"
              description="Create the first project for this customer."
              action={{ label: 'Create Project', onClick: () => setNewProjectOpen(true) }}
            />
          ) : (
            <div className="bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-b-[var(--sg-gold)]">
                      {['Project', 'Status', 'Type', 'Contract', 'Payment', 'Start', 'End', ''].map(
                        (h) => (
                          <th
                            key={h}
                            className="text-left px-4 py-3 text-xs font-medium text-[var(--sg-text-1)] uppercase tracking-wider whitespace-nowrap"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p, i) => (
                      <tr
                        key={p.id}
                        onClick={() => router.push(`/customers/${customerId}/projects/${p.id}`)}
                        className={cn(
                          'border-b border-[var(--sg-border)] cursor-pointer transition-colors',
                          i % 2 === 0 ? 'bg-[var(--sg-base)]' : 'bg-[var(--sg-surface)]',
                          'hover:bg-[var(--sg-elevated)]'
                        )}
                      >
                        <td className="px-4 py-3 text-sm font-medium text-[var(--sg-text-1)]">
                          {p.title}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={p.type === 'Commercial' ? 'purple' : 'info'}>
                            {p.type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-[var(--sg-gold)]">
                          {formatCurrency(p.contract_value)}
                        </td>
                        <td className="px-4 py-3">
                          <PaymentBadge status={p.payment_status} />
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--sg-text-2)] whitespace-nowrap">
                          {formatDate(p.start_date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--sg-text-2)] whitespace-nowrap">
                          {formatDate(p.end_date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--sg-sky)]">Open</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'leads' && (
        <div className="space-y-4">
          {leads.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No leads yet"
              description="No leads linked to this customer."
            />
          ) : (
            <div className="bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-b-[var(--sg-gold)]">
                      {['Title', 'Stage', 'Source', 'Value', 'Follow-up', 'Added'].map((h) => (
                        <th
                          key={h}
                          className="text-left px-4 py-3 text-xs font-medium text-[var(--sg-text-1)] uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((l, i) => (
                      <tr
                        key={l.id}
                        className={cn(
                          'border-b border-[var(--sg-border)]',
                          i % 2 === 0 ? 'bg-[var(--sg-base)]' : 'bg-[var(--sg-surface)]'
                        )}
                      >
                        <td className="px-4 py-3 text-sm font-medium text-[var(--sg-text-1)]">
                          {l.title}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="default">{l.stage}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--sg-text-2)]">{l.source}</td>
                        <td className="px-4 py-3 text-sm text-[var(--sg-gold)]">
                          {formatCurrency(l.estimated_value)}
                        </td>
                        <td
                          className={cn(
                            'px-4 py-3 text-sm whitespace-nowrap',
                            l.follow_up_date && new Date(l.follow_up_date) < new Date()
                              ? 'text-[var(--sg-danger)]'
                              : 'text-[var(--sg-text-2)]'
                          )}
                        >
                          {formatDate(l.follow_up_date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--sg-text-2)] whitespace-nowrap">
                          {formatDate(l.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" variant="secondary" onClick={() => setAddActivityOpen(true)}>
              <Plus className="h-4 w-4" /> Log Activity
            </Button>
          </div>
          <ActivityTimeline activities={activities} />
        </div>
      )}

      {activeTab === 'info' && (
        <div className="bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: 'Full Name', value: customer.name },
              { label: 'Type', value: customer.type },
              { label: 'Company', value: customer.company_name },
              { label: 'Phone', value: customer.phone },
              { label: 'Email', value: customer.email },
              { label: 'Address', value: customer.address },
              { label: 'City', value: customer.city },
              { label: 'State', value: customer.state },
              { label: 'ZIP', value: customer.zip },
              { label: 'Referred By', value: customer.referred_by },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-[var(--sg-text-2)] uppercase tracking-wider mb-1">
                  {label}
                </p>
                <p className="text-sm text-[var(--sg-text-1)]">{value ?? '—'}</p>
              </div>
            ))}
            {customer.tags?.length > 0 && (
              <div className="md:col-span-2">
                <p className="text-xs text-[var(--sg-text-2)] uppercase tracking-wider mb-2">
                  Tags
                </p>
                <div className="flex flex-wrap gap-2">
                  {customer.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-1 bg-[var(--sg-elevated)] text-[var(--sg-text-1)] rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {customer.notes && (
              <div className="md:col-span-2">
                <p className="text-xs text-[var(--sg-text-2)] uppercase tracking-wider mb-1">
                  Notes
                </p>
                <p className="text-sm text-[var(--sg-text-1)] whitespace-pre-wrap">
                  {customer.notes}
                </p>
              </div>
            )}
          </div>
          <div className="mt-6 pt-6 border-t border-[var(--sg-border)]">
            <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
              <Edit2 className="h-4 w-4" /> Edit Customer Info
            </Button>
          </div>
        </div>
      )}

      {/* EditCustomerModal is controlled by passing customer or null */}
      <EditCustomerModal
        customer={editOpen ? customer : null}
        onClose={() => {
          setEditOpen(false);
          loadData();
        }}
      />
      <NewProjectModal
        open={newProjectOpen}
        onClose={() => {
          setNewProjectOpen(false);
          loadData();
        }}
        preselectedCustomerId={customerId}
      />
      <AddActivityModal
        open={addActivityOpen}
        onClose={() => {
          setAddActivityOpen(false);
          loadData();
        }}
        customerId={customerId}
      />
      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete Customer"
        description={`Delete "${customer.name}"? This will also delete all their projects and leads. This cannot be undone.`}
      />
      <TextTemplatesModal
        open={textTemplatesOpen}
        onClose={() => setTextTemplatesOpen(false)}
        customerName={customer.name}
        customerPhone={customer.phone ?? undefined}
      />
    </div>
  );
}
