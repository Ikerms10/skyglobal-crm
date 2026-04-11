interface MapsLinkProps {
  address: string | null | undefined
  showIcon?: boolean
  className?: string
}

export function MapsLink({ address, showIcon = true, className }: MapsLinkProps) {
  if (!address?.trim()) return <span className={className}>—</span>
  const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(address)}`
  return (
    <span className={className}>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#3583b3] hover:text-[#4a9fd4] transition-colors inline-flex items-center gap-1 break-words"
        onClick={e => e.stopPropagation()}
      >
        {showIcon && <span>📍</span>}
        <span>{address}</span>
      </a>
    </span>
  )
}

export function DirectionsButton({ address }: { address: string | null | undefined }) {
  if (!address?.trim()) return null
  const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      className="inline-flex items-center gap-1.5 bg-[#3583b3] hover:bg-[#2a6d96] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
    >
      🗺️ Directions
    </a>
  )
}
