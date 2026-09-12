import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import os from 'os'

const execAsync = promisify(exec)

interface NetworkDevice {
  ip: string
  mac: string
  hostname: string
  type: 'router' | 'computer' | 'phone' | 'speaker' | 'tv' | 'unknown'
  vendor?: string
}

function guessDeviceType(mac: string, hostname: string): NetworkDevice['type'] {
  const h = hostname.toLowerCase()
  if (h.includes('router') || h.includes('gateway') || h.includes('airport') || h.includes('eero') || h.includes('orbi') || h.includes('google-home-mini')) return 'router'
  if (h.includes('iphone') || h.includes('android') || h.includes('pixel') || h.includes('samsung')) return 'phone'
  if (h.includes('imac') || h.includes('macbook') || h.includes('mac-mini') || h.includes('mac-pro') || h.includes('pc') || h.includes('desktop') || h.includes('laptop')) return 'computer'
  if (h.includes('sonos') || h.includes('homepod') || h.includes('echo') || h.includes('alexa') || h.includes('speaker') || h.includes('bose') || h.includes('airplay')) return 'speaker'
  if (h.includes('apple-tv') || h.includes('appletv') || h.includes('roku') || h.includes('chromecast') || h.includes('fire-tv') || h.includes('firetv') || h.includes('shield')) return 'tv'
  return 'unknown'
}

async function scanNetworkDevices(): Promise<NetworkDevice[]> {
  try {
    // macOS: use arp -a to get recently seen devices, plus dns-sd / ping fallback
    const { stdout } = await execAsync('arp -a 2>/dev/null', { timeout: 5000 })
    const devices: NetworkDevice[] = []
    const lines = stdout.split('\n').filter(Boolean)

    for (const line of lines) {
      // Format: hostname (ip) at mac [ifscope en0]
      const match = line.match(/^(.+?)\s+\((\d+\.\d+\.\d+\.\d+)\)\s+at\s+([0-9a-f:]{17})/i)
      if (!match) continue
      const [, rawHostname, ip, mac] = match
      if (mac === 'ff:ff:ff:ff:ff:ff' || ip.endsWith('.255')) continue
      const hostname = rawHostname === '?' ? ip : rawHostname.replace(/\.$/, '')
      devices.push({
        ip,
        mac: mac.toUpperCase(),
        hostname,
        type: guessDeviceType(mac, hostname),
      })
    }
    return devices
  } catch {
    return []
  }
}

function getLocalNetworkInfo() {
  const interfaces = os.networkInterfaces()
  const result: { name: string; ip: string; family: string }[] = []
  for (const [name, addrs] of Object.entries(interfaces)) {
    for (const addr of addrs ?? []) {
      if (!addr.internal) {
        result.push({ name, ip: addr.address, family: addr.family })
      }
    }
  }
  return result
}

export async function GET() {
  const [devices, networkInterfaces] = await Promise.all([
    scanNetworkDevices(),
    Promise.resolve(getLocalNetworkInfo()),
  ])

  return NextResponse.json({
    success: true,
    scannedAt: new Date().toISOString(),
    thisDevice: {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
    },
    networkInterfaces,
    devices,
    deviceCount: devices.length,
  })
}
