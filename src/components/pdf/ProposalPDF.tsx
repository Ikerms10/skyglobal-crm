'use client'
import dynamic from 'next/dynamic'

// Dynamic import to avoid SSR issues with @react-pdf/renderer
const ProposalPDFContent = dynamic(() => import('./ProposalPDFContent'), { ssr: false })

export { ProposalPDFContent }
