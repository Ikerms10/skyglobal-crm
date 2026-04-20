'use client'
import { useState } from 'react'
import { Plus, X } from 'lucide-react'

export interface LineItem {
  id: string
  description: string
  quantity: number | null
  unit_price: number | null
  total: number | null
}

interface EditableTableProps {
  items: LineItem[]
  onChange: (items: LineItem[]) => void
}

function genId() { return Math.random().toString(36).slice(2) }

export function EditableTable({ items, onChange }: EditableTableProps) {
  const update = (id: string, field: keyof LineItem, val: string | number | null) => {
    onChange(items.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [field]: val }
      if (field === 'quantity' || field === 'unit_price') {
        const q = field === 'quantity' ? (val as number) : item.quantity
        const p = field === 'unit_price' ? (val as number) : item.unit_price
        if (q != null && p != null) updated.total = parseFloat((q * p).toFixed(2))
        else updated.total = null
      }
      return updated
    }))
  }

  const addRow = () => {
    onChange([...items, { id: genId(), description: '', quantity: null, unit_price: null, total: null }])
  }

  const removeRow = (id: string) => {
    onChange(items.filter(i => i.id !== id))
  }

  const cellStyle: React.CSSProperties = {
    padding: '6px 8px',
    border: '1px solid #d1d5db',
    fontSize: 12,
    verticalAlign: 'middle',
  }

  const inputStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    width: '100%',
    fontSize: 12,
    fontFamily: 'Georgia, serif',
    color: '#1a1a1a',
  }

  const subtotal = items.reduce((s, i) => s + (i.total ?? 0), 0)

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#3583b3', color: '#fff' }}>
            <th style={{ ...cellStyle, border: '1px solid #2a6a99', textAlign: 'left', width: '50%' }}>Material / Description</th>
            <th style={{ ...cellStyle, border: '1px solid #2a6a99', textAlign: 'center', width: '10%' }}>Qty</th>
            <th style={{ ...cellStyle, border: '1px solid #2a6a99', textAlign: 'right', width: '20%' }}>Unit Price</th>
            <th style={{ ...cellStyle, border: '1px solid #2a6a99', textAlign: 'right', width: '15%' }}>Total</th>
            <th style={{ ...cellStyle, border: '1px solid #2a6a99', width: '5%' }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={item.id} style={{ background: idx % 2 === 0 ? '#f9f9f7' : '#fff' }}>
              <td style={cellStyle}>
                <input
                  style={inputStyle}
                  value={item.description}
                  onChange={e => update(item.id, 'description', e.target.value)}
                  placeholder="Description..."
                />
              </td>
              <td style={{ ...cellStyle, textAlign: 'center' }}>
                <input
                  style={{ ...inputStyle, textAlign: 'center' }}
                  type="number"
                  value={item.quantity ?? ''}
                  onChange={e => update(item.id, 'quantity', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="—"
                />
              </td>
              <td style={{ ...cellStyle, textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                  <span style={{ color: '#6b7280', fontSize: 11 }}>$</span>
                  <input
                    style={{ ...inputStyle, textAlign: 'right', width: 80 }}
                    type="number"
                    value={item.unit_price ?? ''}
                    onChange={e => update(item.id, 'unit_price', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="0.00"
                  />
                </div>
              </td>
              <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 500 }}>
                {item.total != null
                  ? `$${item.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : item.description.toLowerCase().includes('included') ? 'Included'
                  : '—'}
              </td>
              <td style={{ ...cellStyle, textAlign: 'center' }}>
                <button
                  onClick={() => removeRow(item.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 2, lineHeight: 1 }}
                  title="Remove row"
                >
                  <X size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <button
          onClick={addRow}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'none', border: '1px dashed #3583b3', borderRadius: 4,
            color: '#3583b3', fontSize: 11, padding: '4px 10px', cursor: 'pointer',
          }}
        >
          <Plus size={12} /> Add Row
        </button>
        {subtotal > 0 && (
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>
            Materials Subtotal: ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        )}
      </div>
    </div>
  )
}
