'use client'
import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  description?: string
  confirmLabel?: string
  loading?: boolean
}

export function ConfirmModal({
  open, onClose, onConfirm, title = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmLabel = 'Delete', loading
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <p className="text-sm" style={{ color: 'var(--c-text-3)' }}>{description}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  )
}
