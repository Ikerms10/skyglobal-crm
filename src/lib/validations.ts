import { z } from 'zod';

// ─── Webhook: Zapier lead ingestion ──────────────────────────────────────────
export const ZapierWebhookSchema = z.object({
  name: z.string().min(1, 'name is required').max(200).trim(),
  description: z.string().min(1, 'description is required').max(2000).trim(),
  phone: z.string().max(30).trim().optional().nullable(),
  address: z.string().max(500).trim().optional().nullable(),
  source: z.string().max(50).trim().optional().nullable(),
});

// ─── Webhook: Thumbtack lead ingestion ───────────────────────────────────────
export const ThumbtackWebhookSchema = z.object({
  name: z.string().max(200).trim().optional(),
  customer_name: z.string().max(200).trim().optional(),
  phone: z.string().max(30).trim().optional(),
  phone_number: z.string().max(30).trim().optional(),
  email: z.string().email().max(200).optional().or(z.literal('')),
  request_title: z.string().max(200).trim().optional(),
  title: z.string().max(200).trim().optional(),
  job_type: z.string().max(200).trim().optional(),
  city: z.string().max(100).trim().optional(),
  zip_code: z.string().max(10).trim().optional(),
  zip: z.string().max(10).trim().optional(),
  request_details: z.string().max(5000).trim().optional(),
  description: z.string().max(5000).trim().optional(),
  notes: z.string().max(5000).trim().optional(),
});

// ─── Domain schemas (for future API route validation) ────────────────────────
export const LeadSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  source: z
    .enum(['Thumbtack', 'Referral', 'Google', 'Instagram', 'Door Knock', 'Facebook', 'Yelp', 'Other'])
    .optional(),
  stage: z
    .enum(['New Lead', 'Estimate Sent', 'Follow-up', 'Won', 'Lost', 'On Hold'])
    .optional(),
  estimated_value: z.number().min(0).max(10_000_000).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  follow_up_date: z.string().datetime().optional().nullable(),
  customer_id: z.string().uuid().optional().nullable(),
});

export const CustomerSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  email: z.string().email().max(200).optional().or(z.literal('')).nullable(),
  phone: z.string().max(30).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(50).optional().nullable(),
  zip: z.string().max(10).optional().nullable(),
  type: z.enum(['Residential', 'Commercial']).optional(),
  notes: z.string().max(5000).optional().nullable(),
});

export const ExpenseSchema = z.object({
  amount: z.number().min(0).max(1_000_000),
  category: z
    .enum(['Labor', 'Materials', 'Advertising', 'Fuel', 'Tools', 'Subcontractors', 'Overhead', 'Insurance', 'Software', 'Other'])
    .optional(),
  description: z.string().max(1000).trim(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  recurring: z.boolean().optional(),
});

export const InvoiceSchema = z.object({
  project_id: z.string().uuid().optional().nullable(),
  amount: z.number().min(0).max(10_000_000),
  status: z.enum(['draft', 'sent', 'paid', 'overdue']).optional(),
  paid_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
});
