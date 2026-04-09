import { cn, getInitials } from '@/lib/utils'

const COLORS = [
  'bg-sky-700', 'bg-purple-700', 'bg-green-700', 'bg-orange-700',
  'bg-pink-700', 'bg-indigo-700', 'bg-teal-700', 'bg-red-700',
]

function getColor(name: string): string {
  const sum = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return COLORS[sum % COLORS.length]
}

interface AvatarProps {
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  const sizes = { xs: 'h-6 w-6 text-xs', sm: 'h-8 w-8 text-sm', md: 'h-10 w-10 text-base', lg: 'h-12 w-12 text-lg' }
  return (
    <div className={cn('rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0', sizes[size], getColor(name), className)}>
      {getInitials(name)}
    </div>
  )
}
