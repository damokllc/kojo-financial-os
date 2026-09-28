'use client'

import dynamic from 'next/dynamic'

// ssr:false must live in a Client Component (Next.js 15+)
const DeviceScanner = dynamic(() => import('./DeviceScanner'), { ssr: false })

export default function DeviceScannerLazy() {
  return <DeviceScanner />
}
