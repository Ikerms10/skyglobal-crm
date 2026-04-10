'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'

interface LostReasonModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  loading?: boolean
}

const COMMON_REASONS = [
  'Price too high',
  'Went with another contractor',
  'Project cancelled',
  'No response',
  'Out of service area',
  'Timeline mismatch',
]

export function LostReasonModal({ open, onClose, onConfirm, loading = false }: LostReasonModalProps) {
  const [reason, setReason] = useState('')

  const handleConfirm = () => {
    onConfirm(reason)
    setReason('')
  }

  const handleClose = () => {
    setReason('')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Mark Lead as Lost" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-[#9a9585]">
          Optionally add a reason why this lead was lost to improve future tracking.
        </p>

        <div className="flex flex-wrap gap-2">
          {COMMON_REASONS.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                reason === r
                  ? 'bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444]'
                  : 'border-[#2e2d26] text-[#9a9585] hover:border-[#9a9585] hover:text-[#efeae2]'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <Textarea
          label="Custom reason"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Enter a reason (optional)"
          rows={2}
        />

        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleClose} disabled={loading} className="flex-1">
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm} loading={loading} className="flex-1">
            Mark Lost
          </Button>
        </div>
      </div>
    </Modal>
  )
}
