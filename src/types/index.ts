export type CustomerType = 'Residential' | 'Commercial'
export type LeadStage = 'New Lead' | 'Estimate Sent' | 'Follow-up' | 'Won' | 'Lost' | 'On Hold'
export type LeadSource = 'Thumbtack' | 'Referral' | 'Google' | 'Instagram' | 'Door Knock' | 'Facebook' | 'Yelp' | 'Other'
export type ProjectStatus = 'Scheduled' | 'In Progress' | 'On Hold' | 'Completed' | 'Cancelled'
export type PaymentStatus = 'Unpaid' | 'Partial' | 'Paid' | 'Overdue'
export type ExpenseCategory = 'Labor' | 'Materials' | 'Advertising' | 'Fuel' | 'Tools' | 'Subcontractors' | 'Overhead' | 'Insurance' | 'Software' | 'Other'
export type ProjectExpenseCategory = 'Labor' | 'Materials' | 'Subcontractors' | 'Fuel' | 'Tools' | 'Other'
export type ActivityType = 'Call' | 'Text' | 'Email' | 'Visit' | 'Note' | 'Stage Change' | 'Payment Received' | 'Photo Added' | 'Estimate Sent'
export type PhotoLabel = 'Before' | 'During' | 'After'

export interface Customer {
  id: string
  user_id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  type: CustomerType
  company_name: string | null
  referred_by: string | null
  notes: string | null
  tags: string[]
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface Lead {
  id: string
  user_id: string
  customer_id: string | null
  title: string
  source: LeadSource
  stage: LeadStage
  lost_reason: string | null
  estimated_value: number | null
  notes: string | null
  follow_up_date: string | null
  drive_folder_id: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
  customer?: Customer
}

export interface Project {
  id: string
  user_id: string
  customer_id: string
  lead_id: string | null
  title: string
  status: ProjectStatus
  type: CustomerType
  start_date: string | null
  end_date: string | null
  contract_value: number | null
  amount_paid: number
  payment_status: PaymentStatus
  address: string | null
  description: string | null
  lead_cost: number | null
  notes: string | null
  drive_folder_id: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
  customer?: Customer
}

export interface ProjectLineItem {
  id: string
  project_id: string
  description: string
  quantity: number | null
  unit: string | null
  unit_price: number | null
  total: number | null
  created_at: string
}

export interface ProjectExpense {
  id: string
  project_id: string
  user_id: string
  category: ProjectExpenseCategory
  description: string | null
  amount: number
  date: string
  created_at: string
}

export interface Expense {
  id: string
  user_id: string
  category: ExpenseCategory
  description: string | null
  amount: number
  date: string
  recurring: boolean
  deleted_at: string | null
  created_at: string
}

export interface Activity {
  id: string
  user_id: string
  customer_id: string
  lead_id: string | null
  project_id: string | null
  type: ActivityType
  content: string | null
  created_at: string
}

export interface ProjectPhoto {
  id: string
  project_id: string
  user_id: string
  url: string
  label: PhotoLabel | null
  uploaded_at: string
}

export interface Notification {
  id: string
  type: 'follow_up' | 'overdue_payment' | 'late_project'
  title: string
  description: string
  href: string
}

export type ProposalTemplate = 'interior' | 'exterior' | 'cabinet' | 'custom'
export type ProposalStatus = 'Draft' | 'Sent' | 'Accepted' | 'Invoiced'

export interface Proposal {
  id: string
  user_id: string
  customer_id: string | null
  template: ProposalTemplate
  status: ProposalStatus
  project_name: string | null
  client_name: string | null
  client_contact: string | null
  client_address: string | null
  project_scope: string | null
  total_investment: number | null
  issue_date: string | null
  valid_until: string | null
  deposit_pct: number
  progress_pct: number
  final_pct: number
  template_data: Record<string, any>
  show_insurance_page: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
  customer?: Customer
}

export interface ProposalLineItem {
  id: string
  proposal_id: string
  description: string
  quantity: number | null
  unit_price: number | null
  total: number | null
  sort_order: number
  created_at: string
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue'
export type EventType = 'estimate' | 'job' | 'payment' | 'deadline' | 'personal'
export type NotificationType =
  | 'proposal_signed'
  | 'lead_stale'
  | 'invoice_overdue'
  | 'job_tomorrow'
  | 'proposal_viewed'
  | 'new_lead'
  | 'weekly_report'

export interface Invoice {
  id: string
  user_id: string
  project_id: string | null
  customer_id: string | null
  invoice_number: string
  status: InvoiceStatus
  issue_date: string
  due_date: string | null
  payment_terms: string
  notes: string | null
  paid_at: string | null
  payment_method: string | null
  payment_notes: string | null
  total: number
  deleted_at: string | null
  created_at: string
  updated_at: string
  project?: { id: string; title: string } | null
  customer?: { id: string; name: string } | null
}

export interface InvoiceLineItem {
  id: string
  invoice_id: string
  description: string
  quantity: number | null
  unit_price: number | null
  total: number | null
  sort_order: number
  created_at: string
}

export interface AppNotification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  resource_type: string | null
  resource_id: string | null
  action_url: string | null
  icon: string
  read_at: string | null
  created_at: string
}

export interface CalendarEvent {
  id: string
  user_id: string
  title: string
  type: EventType
  start_at: string
  end_at: string | null
  all_day: boolean
  project_id: string | null
  lead_id: string | null
  notes: string | null
  created_at: string
  project?: { id: string; title: string } | null
  lead?: { id: string; title: string } | null
}
