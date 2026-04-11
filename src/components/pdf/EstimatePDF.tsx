'use client'
import dynamic from 'next/dynamic'

// Dynamically imported to avoid SSR issues with @react-pdf/renderer
const EstimatePDFContent = dynamic(() => import('./EstimatePDFContent'), { ssr: false })

export { EstimatePDFContent }
