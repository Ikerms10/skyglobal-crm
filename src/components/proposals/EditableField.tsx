'use client'
import { useState, useRef, useEffect } from 'react'

interface EditableFieldProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  multiline?: boolean
  className?: string
  style?: React.CSSProperties
  inputStyle?: React.CSSProperties
  type?: 'text' | 'date' | 'number'
  prefix?: string
  suffix?: string
  locked?: boolean
}

export function EditableField({
  value,
  onChange,
  placeholder = 'Click to edit',
  multiline = false,
  className = '',
  style = {},
  inputStyle = {},
  type = 'text',
  prefix,
  suffix,
  locked = false,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false)
  const [localVal, setLocalVal] = useState(value)
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null)

  useEffect(() => { setLocalVal(value) }, [value])

  const handleClick = () => {
    if (locked) return
    setEditing(true)
  }

  const handleBlur = () => {
    setEditing(false)
    if (localVal !== value) onChange(localVal)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault()
      ;(e.target as HTMLElement).blur()
    }
    if (e.key === 'Escape') {
      setLocalVal(value)
      setEditing(false)
    }
  }

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus()
  }, [editing])

  if (locked) {
    return (
      <span className={className} style={style}>
        {prefix}{value || placeholder}{suffix}
      </span>
    )
  }

  const hoverStyle: React.CSSProperties = {
    cursor: 'text',
    borderBottom: '1.5px dashed #e6ab35',
    paddingBottom: 1,
    transition: 'border-color 0.15s',
  }

  const activeStyle: React.CSSProperties = {
    outline: 'none',
    border: '1.5px solid #e6ab35',
    borderRadius: 3,
    background: 'rgba(230,171,53,0.07)',
    padding: '1px 4px',
    width: '100%',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    color: 'inherit',
    lineHeight: 'inherit',
    ...inputStyle,
  }

  if (editing) {
    if (multiline) {
      return (
        <textarea
          ref={inputRef as any}
          value={localVal}
          onChange={e => setLocalVal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{ ...activeStyle, resize: 'vertical', minHeight: 80 }}
          className={className}
        />
      )
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
        {prefix && <span>{prefix}</span>}
        <input
          ref={inputRef}
          type={type}
          value={localVal}
          onChange={e => setLocalVal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={activeStyle}
          className={className}
        />
        {suffix && <span>{suffix}</span>}
      </span>
    )
  }

  return (
    <span
      onClick={handleClick}
      className={`editable-field group ${className}`}
      style={{ display: 'inline-block', minWidth: 40, ...style }}
      title="Click to edit"
    >
      {prefix}
      <span style={value ? {} : { color: '#9a9585', fontStyle: 'italic' }}>
        <span style={hoverStyle} className="hover-underline">
          {value || placeholder}
        </span>
      </span>
      {suffix}
    </span>
  )
}

interface EditableSelectProps {
  value: string
  onChange: (val: string) => void
  options: string[]
  className?: string
  style?: React.CSSProperties
}

export function EditableSelect({ value, onChange, options, className = '', style = {} }: EditableSelectProps) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={className}
      style={{
        background: 'transparent',
        border: 'none',
        borderBottom: '1.5px dashed #e6ab35',
        color: 'inherit',
        fontSize: 'inherit',
        fontFamily: 'inherit',
        cursor: 'pointer',
        outline: 'none',
        padding: '1px 4px',
        ...style,
      }}
    >
      {options.map(opt => (
        <option key={opt} value={opt} style={{ background: '#252419', color: '#efeae2' }}>{opt}</option>
      ))}
    </select>
  )
}
