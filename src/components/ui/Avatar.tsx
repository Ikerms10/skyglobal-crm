import { cn, getInitials } from '@/lib/utils'

const COLORS = [
  'bg-[#3583b3]', 'bg-[#e6ab35]', 'bg-emerald-700', 'bg-orange-700',
  'bg-pink-700', 'bg-[#3583b3]', 'bg-teal-700', 'bg-red-700',
]

const TEXT_COLORS = [
  'text-white', 'text-[#1d1c17]', 'text-white', 'text-white',
  'text-white', 'text-white', 'text-white', 'text-white',
]

function getColorIndex(name: string): number {
  const sum = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return sum % COLORS.length
}

interface AvatarProps {
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  const sizes = { xs: 'h-6 w-6 text-xs', sm: 'h-8 w-8 text-sm', md: 'h-10 w-10 text-base', lg: 'h-12 w-12 text-lg' }
  const idx = getColorIndex(name)
  return (
    <div className={cn('rounded-full flex items-center justify-center font-semibold flex-shrink-0', sizes[size], COLORS[idx], TEXT_COLORS[idx], className)}>
      {getInitials(name)}
    </div>
  )
}
