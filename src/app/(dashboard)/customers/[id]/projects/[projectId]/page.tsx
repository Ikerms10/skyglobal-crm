'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { formatCurrency, formatDate, formatRelativeTime, cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge, PaymentBadge, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { EditProjectModal } from '@/components/projects/EditProjectModal';
import { WorkOrdersTab } from '@/components/projects/WorkOrdersTab';
import { AddActivityModal } from '@/components/customers/AddActivityModal';
import { MapsLink, DirectionsButton } from '@/components/ui/MapsLink';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Plus,
  Trash2,
  Upload,
  Edit2,
  X,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  FileText,
} from 'lucide-react';
import { TemplateSelector } from '@/components/proposals/TemplateSelector';
import { ProposalTemplate } from '@/types';

const DownloadEstimateButton = dynamic(
  () => import('@/components/pdf/EstimatePDFContent').then((m) => m.DownloadEstimateButton),
  {
    ssr: false,
    loading: () => <span className="text-xs text-[var(--sg-text-2)]">Loading PDF...</span>,
  }
);

const DownloadProjectReportButton = dynamic(
  () => import('@/components/pdf/ProjectReportPDF').then((m) => m.DownloadProjectReportButton),
  { ssr: false, loading: () => <span className="text-xs text-[var(--sg-text-2)]">Loading…</span> }
);

function CustomerTypeModal({
  open,
  customerName,
  onSelect,
  onClose,
}: {
  open: boolean;
  customerName: string | null;
  onSelect: (existing: boolean) => void;
  onClose: () => void;
}) {
  const [hovered, setHovered] = useState<'existing' | 'new' | null>(null);
  if (!open) return null;

  const options = [
    {
      id: 'existing' as const,
      icon: '👤',
      title: 'Existing Customer',
      desc: customerName ? `Pre-fill with ${customerName}` : 'Use a customer already in your CRM',
    },
    {
      id: 'new' as const,
      icon: '✨',
      title: 'New Customer',
      desc: 'Leave customer fields blank to fill in manually',
    },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        background: 'rgba(0,0,0,0.78)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--c-canvas)',
          border: '1px solid var(--c-border-mid)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 480,
          padding: '32px 32px 36px',
          position: 'relative',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--c-text-4)',
            padding: 6,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--c-text-1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--c-text-4)';
          }}
        >
          <X size={18} />
        </button>

        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--c-gold)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: 8,
            fontFamily: 'sans-serif',
          }}
        >
          New Proposal
        </p>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--c-text-2)',
            marginBottom: 6,
            lineHeight: 1.2,
          }}
        >
          Who is this proposal for?
        </h2>
        <p style={{ fontSize: 13, color: 'var(--c-text-4)', marginBottom: 28, lineHeight: 1.5 }}>
          Choose whether to link this proposal to an existing customer or start fresh.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onSelect(opt.id === 'existing')}
              onMouseEnter={() => setHovered(opt.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: hovered === opt.id ? 'var(--c-gold-bg)' : 'var(--c-nested)',
                border: `2px solid ${hovered === opt.id ? 'var(--c-gold)' : 'var(--c-border-mid)'}`,
                borderRadius: 12,
                padding: '22px 18px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                transform: hovered === opt.id ? 'translateY(-2px)' : 'none',
              }}
            >
              <div style={{ fontSize: 26, marginBottom: 10 }}>{opt.icon}</div>
              <div
                style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-2)', marginBottom: 5 }}
              >
                {opt.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--c-text-4)', lineHeight: 1.4 }}>
                {opt.desc}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PDFButtons({
  project,
  lineItems,
  projectId,
}: {
  project: any;
  lineItems: any[];
  projectId: string;
}) {
  if (!project) return null;
  const customer = project.customers ?? {};
  return (
    <div className="flex gap-2 flex-wrap">
      <DownloadEstimateButton
        type="invoice"
        project={project}
        customer={customer}
        lineItems={lineItems}
        projectId={projectId}
      />
    </div>
  );
}

const TABS = ['overview', 'scope', 'costs', 'workorders', 'management', 'photos'] as const;
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

const EXPENSE_CATEGORIES = [
  'Labor',
  'Materials',
  'Subcontractors',
  'Fuel',
  'Tools',
  'Permits',
  'Equipment',
  'Other',
];
const STATUS_OPTIONS = ['Scheduled', 'In Progress', 'On Hold', 'Completed', 'Cancelled'] as const;

export default function ProjectDetailPage({
  params,
}: {
  params: { id: string; projectId: string };
}) {
  const router = useRouter();
  const { id: customerId, projectId } = params;

  // Data state
  const [project, setProject] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [addActivityOpen, setAddActivityOpen] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<any>(null);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [customerTypeModalOpen, setCustomerTypeModalOpen] = useState(false);
  const [proposalForExisting, setProposalForExisting] = useState<boolean | null>(null);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);

  // Lead cost edit
  const [editingLeadCost, setEditingLeadCost] = useState(false);
  const [leadCostInput, setLeadCostInput] = useState('');

  // Expense form
  const [expCategory, setExpCategory] = useState('Labor');
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expAdding, setExpAdding] = useState(false);

  // Line item form
  const [liDesc, setLiDesc] = useState('');
  const [liQty, setLiQty] = useState('');
  const [liUnit, setLiUnit] = useState('');
  const [liPrice, setLiPrice] = useState('');
  const [liAdding, setLiAdding] = useState(false);

  // Task form
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [taskAdding, setTaskAdding] = useState(false);

  // Photo upload
  const [photoLabel, setPhotoLabel] = useState<'Before' | 'During' | 'After'>('Before');
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Management form
  const [mgmt, setMgmt] = useState({
    paint_brand: '',
    paint_colors: '',
    num_coats: '',
    primer_used: false,
    special_finishes: '',
    crew_notes: '',
    site_conditions: '',
    parking_notes: '',
    client_communication: '',
  });
  const [mgmtSaving, setMgmtSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setUserId(user.id);

      const { data: proj, error: pe } = await supabase
        .from('projects')
        .select('*, customers(name, phone, email, address)')
        .eq('id', projectId)
        .single();
      if (pe) throw new Error(pe.message);
      setProject(proj);
      setMgmt({
        paint_brand: proj.paint_brand ?? '',
        paint_colors: proj.paint_colors ?? '',
        num_coats: proj.num_coats != null ? String(proj.num_coats) : '',
        primer_used: proj.primer_used ?? false,
        special_finishes: proj.special_finishes ?? '',
        crew_notes: proj.crew_notes ?? '',
        site_conditions: proj.site_conditions ?? '',
        parking_notes: proj.parking_notes ?? '',
        client_communication: proj.client_communication ?? '',
      });

      const [expRes, liRes, photoRes, taskRes, actRes, woRes] = await Promise.all([
        supabase
          .from('project_expenses')
          .select('*')
          .eq('project_id', projectId)
          .order('date', { ascending: false }),
        supabase
          .from('project_line_items')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at'),
        supabase
          .from('project_photos')
          .select('*')
          .eq('project_id', projectId)
          .order('uploaded_at', { ascending: false }),
        supabase.from('project_tasks').select('*').eq('project_id', projectId).order('created_at'),
        supabase
          .from('activities')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false }),
        supabase
          .from('work_orders')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false }),
      ]);

      if (expRes.error) throw new Error(expRes.error.message);
      if (liRes.error) throw new Error(liRes.error.message);
      if (photoRes.error) throw new Error(photoRes.error.message);
      if (taskRes.error) throw new Error(taskRes.error.message);
      if (actRes.error) throw new Error(actRes.error.message);

      setExpenses(expRes.data ?? []);
      setLineItems(liRes.data ?? []);
      setPhotos(photoRes.data ?? []);
      setTasks(taskRes.data ?? []);
      setActivities(actRes.data ?? []);
      setWorkOrders(woRes.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Close status dropdown on outside click
  useEffect(() => {
    if (!statusDropdownOpen) return;
    const handler = () => setStatusDropdownOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [statusDropdownOpen]);

  // Lightbox keyboard nav
  useEffect(() => {
    if (!lightboxPhoto) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxPhoto(null);
      if (e.key === 'ArrowLeft') {
        const idx = photos.indexOf(lightboxPhoto);
        if (idx > 0) setLightboxPhoto(photos[idx - 1]);
      }
      if (e.key === 'ArrowRight') {
        const idx = photos.indexOf(lightboxPhoto);
        if (idx < photos.length - 1) setLightboxPhoto(photos[idx + 1]);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [lightboxPhoto, photos]);

  const updateStatus = async (status: string) => {
    setStatusUpdating(true);
    setStatusDropdownOpen(false);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('projects')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', projectId);
      if (error) throw new Error(error.message);
      setProject((p: any) => ({ ...p, status }));
      toast.success(`Status updated to ${status}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('projects')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', projectId);
      if (error) throw new Error(error.message);
      toast.success('Project deleted');
      router.push(`/customers/${customerId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleteLoading(false);
    }
  };

  const saveLeadCost = async () => {
    try {
      const supabase = createClient();
      const val = parseFloat(leadCostInput) || 0;
      const { error } = await supabase
        .from('projects')
        .update({ lead_cost: val, updated_at: new Date().toISOString() })
        .eq('id', projectId);
      if (error) throw new Error(error.message);
      setProject((p: any) => ({ ...p, lead_cost: val }));
      setEditingLeadCost(false);
      toast.success('Lead cost updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const addExpense = async () => {
    if (!expAmount || isNaN(parseFloat(expAmount))) {
      toast.error('Please enter a valid amount');
      return;
    }
    setExpAdding(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('project_expenses').insert({
        project_id: projectId,
        user_id: user.id,
        category: expCategory,
        description: expDesc || null,
        amount: parseFloat(expAmount),
        date: expDate,
      });
      if (error) throw new Error(error.message);
      toast.success('Expense added');
      setExpAmount('');
      setExpDesc('');
      setExpDate(new Date().toISOString().split('T')[0]);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add expense');
    } finally {
      setExpAdding(false);
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from('project_expenses').delete().eq('id', id);
      if (error) throw new Error(error.message);
      setExpenses((e) => e.filter((x) => x.id !== id));
      toast.success('Expense removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove');
    }
  };

  const addLineItem = async () => {
    if (!liDesc.trim()) {
      toast.error('Description required');
      return;
    }
    setLiAdding(true);
    try {
      const supabase = createClient();
      const qty = liQty ? parseFloat(liQty) : null;
      const price = liPrice ? parseFloat(liPrice) : null;
      const total = qty != null && price != null ? qty * price : null;
      const { error } = await supabase.from('project_line_items').insert({
        project_id: projectId,
        description: liDesc,
        quantity: qty,
        unit: liUnit || null,
        unit_price: price,
        total,
      });
      if (error) throw new Error(error.message);
      toast.success('Line item added');
      setLiDesc('');
      setLiQty('');
      setLiUnit('');
      setLiPrice('');
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add');
    } finally {
      setLiAdding(false);
    }
  };

  const deleteLineItem = async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from('project_line_items').delete().eq('id', id);
      if (error) throw new Error(error.message);
      setLineItems((l) => l.filter((x) => x.id !== id));
      toast.success('Line item removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove');
    }
  };

  const addTask = async () => {
    if (!taskDesc.trim()) {
      toast.error('Task description required');
      return;
    }
    setTaskAdding(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('project_tasks').insert({
        project_id: projectId,
        user_id: user.id,
        description: taskDesc,
        due_date: taskDue || null,
        completed: false,
      });
      if (error) throw new Error(error.message);
      toast.success('Task added');
      setTaskDesc('');
      setTaskDue('');
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add task');
    } finally {
      setTaskAdding(false);
    }
  };

  const toggleTask = async (id: string, completed: boolean) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from('project_tasks').update({ completed }).eq('id', id);
      if (error) throw new Error(error.message);
      setTasks((t) => t.map((x) => (x.id === id ? { ...x, completed } : x)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from('project_tasks').delete().eq('id', id);
      if (error) throw new Error(error.message);
      setTasks((t) => t.filter((x) => x.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete task');
    }
  };

  const handleCustomerTypeSelect = (existing: boolean) => {
    setProposalForExisting(existing);
    setCustomerTypeModalOpen(false);
    setTemplateSelectorOpen(true);
  };

  const handleTemplateSelect = (template: ProposalTemplate) => {
    setTemplateSelectorOpen(false);
    const params = new URLSearchParams({ template });
    if (proposalForExisting && customerId) params.set('customer', customerId);
    router.push(`/proposals/new?${params.toString()}`);
  };

  const saveManagement = async () => {
    setMgmtSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('projects')
        .update({
          paint_brand: mgmt.paint_brand || null,
          paint_colors: mgmt.paint_colors || null,
          num_coats: mgmt.num_coats ? parseInt(mgmt.num_coats) : null,
          primer_used: mgmt.primer_used,
          special_finishes: mgmt.special_finishes || null,
          crew_notes: mgmt.crew_notes || null,
          site_conditions: mgmt.site_conditions || null,
          parking_notes: mgmt.parking_notes || null,
          client_communication: mgmt.client_communication || null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', projectId);
      if (error) throw new Error(error.message);
      toast.success('Saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setMgmtSaving(false);
    }
  };

  // Extract the storage path from any Supabase storage URL
  const extractStoragePath = (url: string): string | null => {
    const m = url.match(/\/object\/(?:public|sign)\/project-photos\/([^?]+)/);
    return m?.[1] ?? null;
  };

  // When a photo URL fails to load, download the blob through the authenticated
  // Supabase SDK and swap the img src directly — works even with private buckets
  // as long as the user has SELECT permission on storage.objects.
  const handlePhotoError = async (
    e: React.SyntheticEvent<HTMLImageElement>,
    photoId: string,
    currentUrl: string
  ) => {
    const img = e.currentTarget;
    // Guard: only retry once to avoid infinite error loops
    if (img.dataset.retried) return;
    img.dataset.retried = 'true';

    const path = extractStoragePath(currentUrl);
    if (!path) return;

    try {
      const supabase = createClient();
      const { data: blob, error } = await supabase.storage.from('project-photos').download(path);
      if (error || !blob) return;

      const objectUrl = URL.createObjectURL(blob);
      img.src = objectUrl;
      // Also update state so lightbox gets the working URL
      setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, url: objectUrl } : p)));
      if (lightboxPhoto?.id === photoId) {
        setLightboxPhoto((prev: any) => (prev ? { ...prev, url: objectUrl } : prev));
      }
    } catch {}
  };

  const uploadPhoto = async (file: File) => {
    setPhotoUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${projectId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('project-photos').upload(path, file);
      if (upErr) throw new Error(upErr.message);

      // Public bucket: store the permanent public URL (no expiry, no token)
      const {
        data: { publicUrl },
      } = supabase.storage.from('project-photos').getPublicUrl(path);

      const { error } = await supabase.from('project_photos').insert({
        project_id: projectId,
        user_id: user.id,
        url: publicUrl,
        label: photoLabel,
      });
      if (error) throw new Error(error.message);
      toast.success('Photo uploaded');
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setPhotoUploading(false);
    }
  };

  const deletePhoto = async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from('project_photos').delete().eq('id', id);
      if (error) throw new Error(error.message);
      setPhotos((p) => p.filter((x) => x.id !== id));
      toast.success('Photo deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete photo');
    }
  };

  // Computed financials
  const contractValue = project?.contract_value ?? 0;
  const leadCost = project?.lead_cost ?? 0;
  const expensesTotal = expenses.reduce((s, e) => s + (e.amount ?? 0), 0);
  const totalCosts = leadCost + expensesTotal;
  const profit = contractValue - totalCosts;
  const margin = contractValue > 0 ? Math.round((profit / contractValue) * 100 * 10) / 10 : 0;
  const balanceDue = Math.max(0, contractValue - (project?.amount_paid ?? 0));
  const lineItemsTotal = lineItems.reduce((s, l) => s + (l.total ?? 0), 0);
  const openTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-16 w-full" />
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

  if (!project) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-[var(--sg-text-2)]">Project not found.</p>
        <Link
          href={`/customers/${customerId}`}
          className="text-[var(--sg-sky)] hover:underline text-sm mt-2 inline-block"
        >
          Back
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Back */}
      <Link
        href={`/customers/${customerId}`}
        className="flex items-center gap-2 text-[var(--sg-text-2)] hover:text-[var(--sg-text-1)] transition-colors text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Back to {project.customers?.name ?? 'Customer'}
      </Link>

      {/* Header */}
      <div className="bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{project.title}</h1>
              {/* Status dropdown */}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setStatusDropdownOpen((v) => !v)}
                  disabled={statusUpdating}
                  className="flex items-center gap-1 focus:outline-none"
                >
                  <StatusBadge status={project.status} />
                  <ChevronDown className="h-3 w-3 text-[var(--sg-text-2)]" />
                </button>
                {statusDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 z-50 bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-lg shadow-xl overflow-hidden min-w-[160px]">
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => updateStatus(s)}
                        className={cn(
                          'w-full text-left px-4 py-2 text-sm hover:bg-[var(--sg-elevated)] transition-colors',
                          project.status === s ? 'text-[var(--sg-gold)]' : 'text-[var(--sg-text-1)]'
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Badge variant={project.type === 'Commercial' ? 'purple' : 'info'}>
                {project.type}
              </Badge>
            </div>
            <div>
              <Link
                href={`/customers/${customerId}`}
                className="text-[var(--sg-sky)] hover:underline text-sm"
              >
                {project.customers?.name}
              </Link>
            </div>
            {project.address && (
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <MapPin className="h-4 w-4 text-[var(--sg-text-2)] flex-shrink-0" />
                <MapsLink address={project.address} showIcon={false} />
                <DirectionsButton address={project.address} />
              </div>
            )}
            <div className="flex flex-wrap gap-4 text-sm text-[var(--sg-text-2)]">
              {project.start_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Start: {formatDate(project.start_date)}
                </span>
              )}
              {project.end_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  End: {formatDate(project.end_date)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <DownloadProjectReportButton
              data={{
                project,
                customer: project.customers ?? {},
                lineItems,
                expenses,
                photos,
              }}
            />
            <Button size="sm" variant="secondary" onClick={() => setCustomerTypeModalOpen(true)}>
              <FileText className="h-4 w-4" /> Create Proposal
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setAddActivityOpen(true)}>
              <Plus className="h-4 w-4" /> Log
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
              <Edit2 className="h-4 w-4" /> Edit
            </Button>
            <Button size="sm" variant="danger" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Financial Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: 'Contract Value',
            value: formatCurrency(contractValue),
            color: 'text-[var(--sg-gold)]',
          },
          { label: 'Lead Cost', value: formatCurrency(leadCost), color: 'text-[var(--sg-text-2)]' },
          {
            label: 'Total Costs',
            value: formatCurrency(expensesTotal),
            color: 'text-[var(--sg-danger)]',
          },
          {
            label: 'Gross Profit',
            value: formatCurrency(profit),
            color: profit >= 0 ? 'text-[var(--c-sage)]' : 'text-[var(--sg-danger)]',
          },
          {
            label: 'Margin %',
            value: `${margin}%`,
            color: margin >= 0 ? 'text-[var(--c-sage)]' : 'text-[var(--sg-danger)]',
          },
          {
            label: 'Balance Due',
            value: formatCurrency(balanceDue),
            color: balanceDue > 0 ? 'text-[var(--sg-danger)]' : 'text-[var(--sg-text-2)]',
          },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl p-4"
          >
            <p className="text-xs text-[var(--sg-text-2)] mb-1">{label}</p>
            <p className={cn('text-lg font-bold', color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--sg-border)]">
        <nav className="flex gap-0 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'scope', label: 'Scope of Work' },
            { id: 'costs', label: 'Costs & Profit' },
            { id: 'workorders', label: `Work Orders (${workOrders.length})` },
            { id: 'management', label: 'Management' },
            { id: 'photos', label: `Photos (${photos.length})` },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as Tab)}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === id
                  ? 'border-[var(--sg-gold)] text-[var(--sg-gold)]'
                  : 'border-transparent text-[var(--sg-text-2)] hover:text-[var(--sg-text-1)]'
              )}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                label: 'Contract Value',
                value: formatCurrency(contractValue),
                color: 'text-[var(--sg-gold)]',
              },
              {
                label: 'Amount Paid',
                value: formatCurrency(project.amount_paid),
                color: 'text-[var(--c-sage)]',
              },
              {
                label: 'Balance Due',
                value: formatCurrency(balanceDue),
                color: balanceDue > 0 ? 'text-[var(--sg-danger)]' : 'text-[var(--sg-text-2)]',
              },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl p-4"
              >
                <p className="text-xs text-[var(--sg-text-2)] mb-1">{label}</p>
                <p className={cn('text-xl font-bold', color)}>{value}</p>
              </div>
            ))}
          </div>
          <div className="bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                Project Details
              </h3>
              <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
                <Edit2 className="h-4 w-4" /> Edit
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: 'Status', value: project.status },
                { label: 'Type', value: project.type },
                { label: 'Payment Status', value: project.payment_status },
                { label: 'Contract Value', value: formatCurrency(project.contract_value) },
                { label: 'Amount Paid', value: formatCurrency(project.amount_paid) },
                { label: 'Lead Cost', value: formatCurrency(project.lead_cost) },
                { label: 'Start Date', value: formatDate(project.start_date) },
                { label: 'End Date', value: formatDate(project.end_date) },
                { label: 'Address', value: project.address },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-[var(--sg-text-2)] uppercase tracking-wider mb-1">
                    {label}
                  </p>
                  <p className="text-sm text-[var(--sg-text-1)]">{value ?? '—'}</p>
                </div>
              ))}
            </div>
            {project.description && (
              <div className="mt-6 pt-6 border-t border-[var(--sg-border)]">
                <p className="text-xs text-[var(--sg-text-2)] uppercase tracking-wider mb-2">
                  Description
                </p>
                <p className="text-sm text-[var(--sg-text-1)] whitespace-pre-wrap">
                  {project.description}
                </p>
              </div>
            )}
            {project.notes && (
              <div className="mt-4">
                <p className="text-xs text-[var(--sg-text-2)] uppercase tracking-wider mb-2">
                  Notes
                </p>
                <p className="text-sm text-[var(--sg-text-1)] whitespace-pre-wrap">
                  {project.notes}
                </p>
              </div>
            )}
          </div>

          {/* Activity feed */}
          <div className="bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                Activity ({activities.length})
              </h3>
              <Button size="sm" variant="ghost" onClick={() => setAddActivityOpen(true)}>
                <Plus className="h-4 w-4" /> Log
              </Button>
            </div>
            {activities.length === 0 ? (
              <p className="text-sm text-[var(--sg-text-2)]">No activity logged yet.</p>
            ) : (
              <div className="space-y-1">
                {activities.slice(0, 5).map((a, i) => (
                  <div key={a.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-[var(--sg-elevated)] flex items-center justify-center text-sm flex-shrink-0">
                        {ACTIVITY_ICONS[a.type] ?? '📋'}
                      </div>
                      {i < Math.min(activities.length, 5) - 1 && (
                        <div className="w-0.5 bg-[var(--sg-elevated)] flex-1 my-1" />
                      )}
                    </div>
                    <div className="pb-4 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-white">{a.type}</p>
                        <span className="text-xs text-[var(--sg-text-2)]">
                          {formatRelativeTime(a.created_at)}
                        </span>
                      </div>
                      {a.content && (
                        <p className="text-sm text-[var(--sg-text-2)] mt-0.5">{a.content}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SCOPE TAB */}
      {activeTab === 'scope' && (
        <div className="space-y-4">
          {/* PDF Buttons */}
          <PDFButtons project={project} lineItems={lineItems} projectId={projectId} />
          <div className="bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl overflow-hidden">
            {lineItems.length === 0 ? (
              <div className="p-8 text-center text-[var(--sg-text-2)] text-sm">
                No line items yet. Add scope of work below.
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-b-[var(--sg-gold)]">
                    {['#', 'Description', 'Qty', 'Unit', 'Unit Price', 'Total', ''].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-medium text-[var(--sg-text-1)] uppercase whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, i) => (
                    <tr
                      key={item.id}
                      className={cn(
                        'border-b border-[var(--sg-border)] group',
                        i % 2 === 0 ? 'bg-[var(--sg-base)]' : 'bg-[var(--sg-surface)]',
                        'hover:bg-[var(--sg-elevated)]'
                      )}
                    >
                      <td className="px-4 py-3 text-sm text-[var(--sg-text-2)]">{i + 1}</td>
                      <td className="px-4 py-3 text-sm text-[var(--sg-text-1)]">
                        {item.description}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--sg-text-2)]">
                        {item.quantity ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--sg-text-2)]">
                        {item.unit ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--sg-text-2)]">
                        {item.unit_price ? formatCurrency(item.unit_price) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-[var(--sg-gold)]">
                        {item.total ? formatCurrency(item.total) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => deleteLineItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 text-[var(--sg-text-2)] hover:text-[var(--sg-danger)] transition-all p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[var(--sg-base)]">
                    <td
                      colSpan={5}
                      className="px-4 py-3 text-sm font-semibold text-[var(--sg-text-1)] text-right"
                    >
                      Subtotal
                    </td>
                    <td className="px-4 py-3 text-lg font-bold text-[var(--sg-gold)]">
                      {formatCurrency(lineItemsTotal)}
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table>
            )}
          </div>
          <div className="bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Add Line Item</h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="col-span-2">
                <input
                  value={liDesc}
                  onChange={(e) => setLiDesc(e.target.value)}
                  placeholder="Description"
                  className="w-full bg-[var(--sg-base)] border border-[var(--sg-border)] text-[var(--sg-text-1)] placeholder-[var(--sg-text-2)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--sg-sky)]"
                />
              </div>
              <input
                value={liQty}
                onChange={(e) => setLiQty(e.target.value)}
                placeholder="Qty"
                type="number"
                className="bg-[var(--sg-base)] border border-[var(--sg-border)] text-[var(--sg-text-1)] placeholder-[var(--sg-text-2)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--sg-sky)]"
              />
              <input
                value={liUnit}
                onChange={(e) => setLiUnit(e.target.value)}
                placeholder="Unit"
                className="bg-[var(--sg-base)] border border-[var(--sg-border)] text-[var(--sg-text-1)] placeholder-[var(--sg-text-2)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--sg-sky)]"
              />
              <input
                value={liPrice}
                onChange={(e) => setLiPrice(e.target.value)}
                placeholder="Unit Price"
                type="number"
                className="bg-[var(--sg-base)] border border-[var(--sg-border)] text-[var(--sg-text-1)] placeholder-[var(--sg-text-2)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--sg-sky)]"
              />
              <Button onClick={addLineItem} loading={liAdding} size="sm">
                Add
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* COSTS TAB */}
      {activeTab === 'costs' && (
        <div className="space-y-4">
          {/* Lead Cost */}
          <div className="bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--sg-text-2)] uppercase tracking-wider mb-1">
                  Lead Acquisition Cost
                </p>
                {editingLeadCost ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--sg-text-2)] text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      autoFocus
                      value={leadCostInput}
                      onChange={(e) => setLeadCostInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveLeadCost();
                        if (e.key === 'Escape') setEditingLeadCost(false);
                      }}
                      className="w-32 bg-[var(--sg-base)] border border-[var(--sg-sky)] rounded-lg px-3 py-1 text-sm text-[var(--sg-text-1)] focus:outline-none"
                    />
                    <button
                      onClick={saveLeadCost}
                      className="text-xs text-[var(--sg-sky)] hover:text-[var(--sg-text-1)]"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingLeadCost(false)}
                      className="text-xs text-[var(--sg-text-2)] hover:text-[var(--sg-text-1)]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setLeadCostInput(String(leadCost));
                      setEditingLeadCost(true);
                    }}
                    className="text-lg font-bold text-[var(--sg-text-2)] hover:text-[var(--sg-text-1)] transition-colors flex items-center gap-2"
                  >
                    {formatCurrency(leadCost)}
                    <Edit2 className="h-3 w-3 opacity-50" />
                  </button>
                )}
              </div>
              <p className="text-xs text-[var(--sg-text-2)] max-w-xs text-right hidden md:block">
                Cost to acquire this lead (ads, referral fees, etc.)
              </p>
            </div>
          </div>

          {/* Profit Breakdown */}
          <div className="bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Profit Breakdown
            </h3>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-[var(--sg-text-2)] uppercase tracking-wider mb-2">
                  Revenue
                </p>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--sg-text-2)]">Contract Value</span>
                  <span className="font-medium text-[var(--sg-gold)]">
                    {formatCurrency(contractValue)}
                  </span>
                </div>
              </div>
              <div className="border-t border-[var(--sg-border)] pt-2">
                <p className="text-xs text-[var(--sg-text-2)] uppercase tracking-wider mb-2">
                  Costs
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--sg-text-2)]">Lead Cost</span>
                    <span className="text-[var(--sg-text-1)]">−{formatCurrency(leadCost)}</span>
                  </div>
                  {EXPENSE_CATEGORIES.map((cat) => {
                    const catTotal = expenses
                      .filter((e) => e.category === cat)
                      .reduce((s, e) => s + (e.amount ?? 0), 0);
                    if (catTotal === 0) return null;
                    return (
                      <div key={cat} className="flex justify-between text-sm">
                        <span className="text-[var(--sg-text-2)]">{cat}</span>
                        <span className="text-[var(--sg-text-1)]">−{formatCurrency(catTotal)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="border-t border-[var(--sg-border)] pt-2 flex justify-between text-sm font-medium">
                <span className="text-[var(--sg-text-2)]">Total Costs</span>
                <span className="text-[var(--sg-danger)]">−{formatCurrency(totalCosts)}</span>
              </div>
              <div className="border-t border-[var(--sg-border)] pt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--sg-text-2)]">Gross Profit</span>
                  <span
                    className={cn(
                      'text-lg font-bold',
                      profit >= 0 ? 'text-[var(--c-sage)]' : 'text-[var(--sg-danger)]'
                    )}
                  >
                    {formatCurrency(profit)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--sg-text-2)]">Profit Margin</span>
                  <span
                    className={cn(
                      'font-medium',
                      margin >= 0 ? 'text-[var(--c-sage)]' : 'text-[var(--sg-danger)]'
                    )}
                  >
                    {margin}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Add Expense */}
          <div className="bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Add Expense</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <select
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value)}
                className="bg-[var(--sg-base)] border border-[var(--sg-border)] text-[var(--sg-text-1)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--sg-sky)]"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)}
                placeholder="Description"
                className="bg-[var(--sg-base)] border border-[var(--sg-border)] text-[var(--sg-text-1)] placeholder-[var(--sg-text-2)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--sg-sky)]"
              />
              <input
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                placeholder="Amount"
                type="number"
                step="0.01"
                className="bg-[var(--sg-base)] border border-[var(--sg-border)] text-[var(--sg-text-1)] placeholder-[var(--sg-text-2)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--sg-sky)]"
              />
              <input
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
                type="date"
                className="bg-[var(--sg-base)] border border-[var(--sg-border)] text-[var(--sg-text-1)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--sg-sky)]"
              />
              <Button onClick={addExpense} loading={expAdding}>
                Add
              </Button>
            </div>
          </div>

          {/* Expenses Table */}
          {expenses.length > 0 && (
            <div className="bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-b-[var(--sg-gold)]">
                    {['Date', 'Category', 'Description', 'Amount', ''].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-medium text-[var(--sg-text-1)] uppercase whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp, i) => (
                    <tr
                      key={exp.id}
                      className={cn(
                        'border-b border-[var(--sg-border)] group',
                        i % 2 === 0 ? 'bg-[var(--sg-base)]' : 'bg-[var(--sg-surface)]',
                        'hover:bg-[var(--sg-elevated)]'
                      )}
                    >
                      <td className="px-4 py-3 text-sm text-[var(--sg-text-2)]">
                        {formatDate(exp.date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--sg-text-1)]">{exp.category}</td>
                      <td className="px-4 py-3 text-sm text-[var(--sg-text-1)]">
                        {exp.description ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-[var(--sg-danger)]">
                        {formatCurrency(exp.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => deleteExpense(exp.id)}
                          className="opacity-0 group-hover:opacity-100 text-[var(--sg-text-2)] hover:text-[var(--sg-danger)] transition-all p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* WORK ORDERS TAB */}
      {activeTab === 'workorders' && userId && (
        <WorkOrdersTab
          projectId={projectId}
          projectTitle={project.title}
          projectAddress={project.address}
          userId={userId}
          workOrders={workOrders}
          onRefresh={loadData}
        />
      )}

      {/* MANAGEMENT TAB */}
      {activeTab === 'management' && (
        <div className="space-y-6">
          {/* Schedule */}
          <div className="bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Schedule</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-[var(--sg-text-2)] mb-1">Start Date</p>
                <p className="text-sm text-[var(--sg-text-1)]">{formatDate(project.start_date)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--sg-text-2)] mb-1">End Date</p>
                <p className="text-sm text-[var(--sg-text-1)]">{formatDate(project.end_date)}</p>
              </div>
              {project.start_date && (
                <div>
                  <p className="text-xs text-[var(--sg-text-2)] mb-1">Days Elapsed</p>
                  <p className="text-sm text-[var(--sg-text-1)]">
                    {Math.max(
                      0,
                      Math.floor((Date.now() - new Date(project.start_date).getTime()) / 86400000)
                    )}{' '}
                    days
                  </p>
                </div>
              )}
              {project.end_date && (
                <div>
                  <p className="text-xs text-[var(--sg-text-2)] mb-1">Days Remaining</p>
                  <p
                    className={cn(
                      'text-sm font-medium',
                      new Date(project.end_date) < new Date()
                        ? 'text-[var(--sg-danger)]'
                        : 'text-[var(--sg-text-1)]'
                    )}
                  >
                    {Math.ceil((new Date(project.end_date).getTime() - Date.now()) / 86400000)} days
                    {new Date(project.end_date) < new Date() ? ' (OVERDUE)' : ''}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Paint & Materials */}
          <div className="bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Paint & Materials
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Paint Brand"
                value={mgmt.paint_brand}
                onChange={(e) => setMgmt((m) => ({ ...m, paint_brand: e.target.value }))}
                placeholder="e.g. Sherwin Williams"
              />
              <Input
                label="Number of Coats"
                type="number"
                value={mgmt.num_coats}
                onChange={(e) => setMgmt((m) => ({ ...m, num_coats: e.target.value }))}
                placeholder="2"
              />
              <div className="col-span-2">
                <Input
                  label="Paint Colors"
                  value={mgmt.paint_colors}
                  onChange={(e) => setMgmt((m) => ({ ...m, paint_colors: e.target.value }))}
                  placeholder="e.g. SW Agreeable Gray 7029"
                />
              </div>
              <div className="col-span-2">
                <Textarea
                  label="Special Finishes"
                  rows={2}
                  value={mgmt.special_finishes}
                  onChange={(e) => setMgmt((m) => ({ ...m, special_finishes: e.target.value }))}
                  placeholder="Any special techniques..."
                />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="primer"
                  checked={mgmt.primer_used}
                  onChange={(e) => setMgmt((m) => ({ ...m, primer_used: e.target.checked }))}
                  className="rounded border-[var(--sg-border)]"
                />
                <label htmlFor="primer" className="text-sm text-[var(--sg-text-1)]">
                  Primer used
                </label>
              </div>
            </div>
          </div>

          {/* Crew & Site */}
          <div className="bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Crew & Site
            </h3>
            <Textarea
              label="Crew Notes"
              rows={3}
              value={mgmt.crew_notes}
              onChange={(e) => setMgmt((m) => ({ ...m, crew_notes: e.target.value }))}
              placeholder="Notes for the crew..."
            />
            <Textarea
              label="Site Conditions"
              rows={3}
              value={mgmt.site_conditions}
              onChange={(e) => setMgmt((m) => ({ ...m, site_conditions: e.target.value }))}
              placeholder="Site condition notes..."
            />
            <Textarea
              label="Parking / Access Notes"
              rows={2}
              value={mgmt.parking_notes}
              onChange={(e) => setMgmt((m) => ({ ...m, parking_notes: e.target.value }))}
              placeholder="Parking and access instructions..."
            />
            <Textarea
              label="Client Communication Log"
              rows={3}
              value={mgmt.client_communication}
              onChange={(e) => setMgmt((m) => ({ ...m, client_communication: e.target.value }))}
              placeholder="Notes from client communications..."
            />
          </div>

          {/* Tasks */}
          <div className="bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Task Checklist
            </h3>

            {/* Add task */}
            <div className="flex gap-3">
              <input
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                placeholder="Task description..."
                className="flex-1 bg-[var(--sg-base)] border border-[var(--sg-border)] text-[var(--sg-text-1)] placeholder-[var(--sg-text-2)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--sg-sky)]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addTask();
                }}
              />
              <input
                value={taskDue}
                onChange={(e) => setTaskDue(e.target.value)}
                type="date"
                className="bg-[var(--sg-base)] border border-[var(--sg-border)] text-[var(--sg-text-1)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--sg-sky)]"
              />
              <Button onClick={addTask} loading={taskAdding} size="sm">
                Add
              </Button>
            </div>

            {/* Open tasks */}
            {openTasks.length === 0 ? (
              <p className="text-sm text-[var(--sg-text-2)]">No open tasks.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-[var(--sg-text-2)] uppercase tracking-wider">
                  {openTasks.length} open
                </p>
                {openTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 bg-[var(--sg-base)] rounded-lg group"
                  >
                    <button
                      type="button"
                      onClick={() => toggleTask(task.id, true)}
                      className="flex-shrink-0 w-5 h-5 rounded border border-[var(--sg-border)] hover:border-[var(--sg-gold)] flex items-center justify-center transition-colors"
                    />
                    <span className="flex-1 text-sm text-[var(--sg-text-1)]">
                      {task.description}
                    </span>
                    {task.due_date && (
                      <span
                        className={cn(
                          'text-xs',
                          new Date(task.due_date) < new Date()
                            ? 'text-[var(--sg-danger)] font-medium'
                            : 'text-[var(--sg-text-2)]'
                        )}
                      >
                        {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 text-[var(--sg-text-2)] hover:text-[var(--sg-danger)] transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Completed tasks */}
            {completedTasks.length > 0 && (
              <div>
                <button
                  onClick={() => setShowCompletedTasks((v) => !v)}
                  className="flex items-center gap-2 text-sm text-[var(--sg-text-2)] hover:text-[var(--sg-text-1)] transition-colors mb-2"
                >
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform',
                      showCompletedTasks && 'rotate-180'
                    )}
                  />
                  {completedTasks.length} completed
                </button>
                {showCompletedTasks && (
                  <div className="space-y-2">
                    {completedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 p-3 bg-[var(--sg-base)] rounded-lg group opacity-60"
                      >
                        <button
                          type="button"
                          onClick={() => toggleTask(task.id, false)}
                          className="flex-shrink-0 w-5 h-5 rounded border border-[var(--sg-gold)] bg-[var(--sg-gold)] flex items-center justify-center"
                        >
                          <Check className="h-3 w-3 text-[#000]" />
                        </button>
                        <span className="flex-1 text-sm text-[var(--sg-text-2)] line-through">
                          {task.description}
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 text-[var(--sg-text-2)] hover:text-[var(--sg-danger)] transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <Button onClick={saveManagement} loading={mgmtSaving}>
            Save Management Details
          </Button>
        </div>
      )}

      {/* PHOTOS TAB */}
      {activeTab === 'photos' && (
        <div className="space-y-4">
          {/* Upload */}
          <div className="bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Upload Photos</h3>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={photoLabel}
                onChange={(e) => setPhotoLabel(e.target.value as 'Before' | 'During' | 'After')}
                className="bg-[var(--sg-base)] border border-[var(--sg-border)] text-[var(--sg-text-1)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--sg-sky)]"
              >
                <option value="Before">Before</option>
                <option value="During">During</option>
                <option value="After">After</option>
              </select>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []);
                  for (const file of files) {
                    await uploadPhoto(file);
                  }
                  e.target.value = '';
                }}
              />
              <Button
                variant="secondary"
                loading={photoUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" /> Upload Photos
              </Button>
            </div>

            {/* Drop zone */}
            <div
              className="mt-3 border-2 border-dashed border-[var(--sg-border)] rounded-lg p-8 text-center cursor-pointer hover:border-[var(--sg-sky)] transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDrop={async (e) => {
                e.preventDefault();
                const files = Array.from(e.dataTransfer.files).filter((f) =>
                  f.type.startsWith('image/')
                );
                for (const file of files) {
                  await uploadPhoto(file);
                }
              }}
              onDragOver={(e) => e.preventDefault()}
            >
              <ImageIcon className="h-8 w-8 text-[var(--sg-text-2)] mx-auto mb-2" />
              <p className="text-sm text-[var(--sg-text-2)]">Drag photos here or click to browse</p>
              <p className="text-xs text-[var(--sg-text-2)] mt-1">JPG, PNG, WebP, HEIC accepted</p>
            </div>
          </div>

          {/* Photo grid by label */}
          {photos.length === 0 ? (
            <EmptyState
              icon={ImageIcon}
              title="No photos yet"
              description="Upload before, during, and after photos to document this project."
            />
          ) : (
            (['Before', 'During', 'After'] as const).map((label) => {
              const labelPhotos = photos.filter((p) => p.label === label);
              if (!labelPhotos.length) return null;
              return (
                <div key={label}>
                  <h3 className="text-sm font-semibold text-[var(--sg-text-2)] mb-2 uppercase tracking-wider">
                    {label} Photos ({labelPhotos.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {labelPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="relative group rounded-lg overflow-hidden bg-[var(--c-card-hover)]"
                        style={{ aspectRatio: '4/3' }}
                      >
                        <img
                          src={photo.url}
                          alt={`${label} photo`}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setLightboxPhoto(photo)}
                          onError={(e) => handlePhotoError(e, photo.id, photo.url)}
                          style={{ display: 'block' }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePhoto(photo.id);
                            }}
                            className="absolute top-2 right-2 bg-[var(--sg-danger)] text-white rounded-full p-1 hover:bg-[#dc2626] transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setLightboxPhoto(photo);
                            }}
                            className="text-white text-xs bg-[var(--sg-base)]/80 px-3 py-1.5 rounded-lg"
                          >
                            View
                          </button>
                        </div>
                        {photo.caption && (
                          <p className="text-xs text-[var(--sg-text-2)] p-2 bg-[var(--sg-base)] truncate">
                            {photo.caption}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxPhoto(null)}
        >
          <button
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-4 right-4 text-white hover:text-[var(--sg-text-2)] z-10 p-2"
          >
            <X className="h-8 w-8" />
          </button>
          {(() => {
            const idx = photos.indexOf(lightboxPhoto);
            return (
              <>
                {idx > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxPhoto(photos[idx - 1]);
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-[var(--sg-text-2)] z-10 p-2 bg-black/40 rounded-full"
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </button>
                )}
                {idx < photos.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxPhoto(photos[idx + 1]);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-[var(--sg-text-2)] z-10 p-2 bg-black/40 rounded-full"
                  >
                    <ChevronRight className="h-8 w-8" />
                  </button>
                )}
              </>
            );
          })()}
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl max-h-[90vh] flex flex-col items-center gap-3 px-16"
          >
            <img
              src={lightboxPhoto.url}
              alt="Project photo"
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
              onError={(e) => handlePhotoError(e, lightboxPhoto.id, lightboxPhoto.url)}
            />
            <div className="flex items-center gap-3">
              {lightboxPhoto.label && (
                <span className="text-xs px-2 py-1 bg-[var(--sg-surface)] text-[var(--sg-text-1)] rounded">
                  {lightboxPhoto.label}
                </span>
              )}
              {lightboxPhoto.caption && (
                <span className="text-sm text-[var(--sg-text-2)]">{lightboxPhoto.caption}</span>
              )}
              <span className="text-xs text-[var(--sg-text-2)]">
                {photos.indexOf(lightboxPhoto) + 1} / {photos.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <EditProjectModal
        project={project}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={() => {
          setEditOpen(false);
          loadData();
        }}
      />
      <AddActivityModal
        open={addActivityOpen}
        onClose={() => {
          setAddActivityOpen(false);
          loadData();
        }}
        customerId={customerId}
        projectId={projectId}
      />
      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete Project"
        description={`Delete "${project.title}"? This cannot be undone.`}
      />
      <CustomerTypeModal
        open={customerTypeModalOpen}
        customerName={project.customers?.name ?? null}
        onSelect={handleCustomerTypeSelect}
        onClose={() => setCustomerTypeModalOpen(false)}
      />
      {templateSelectorOpen && (
        <TemplateSelector
          onSelect={handleTemplateSelect}
          onClose={() => setTemplateSelectorOpen(false)}
        />
      )}
    </div>
  );
}
