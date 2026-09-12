'use client'

import { useState, useEffect, useCallback } from 'react'

interface AudioDevice {
  deviceId: string
  label: string
  kind: 'audioinput' | 'audiooutput'
}

interface NetworkDevice {
  ip: string
  mac: string
  hostname: string
  type: 'router' | 'computer' | 'phone' | 'speaker' | 'tv' | 'smartHub' | 'unknown'
  smartBrand?: string
}

interface ScanResult {
  scannedAt: string
  thisDevice: { hostname: string; platform: string }
  networkInterfaces: { name: string; ip: string; family: string }[]
  devices: NetworkDevice[]
  deviceCount: number
}

const DEVICE_ICONS: Record<NetworkDevice['type'], string> = {
  router: '📡', computer: '💻', phone: '📱', speaker: '🔊', tv: '📺', smartHub: '🏠', unknown: '🔌',
}

// Whole-house voice setup recommendations for a 2BR apartment (budget-tiered)
const VOICE_SETUP_TIERS = [
  {
    tier: 'Budget',
    cost: '$0–$30',
    color: 'emerald',
    icon: '💡',
    items: [
      'Open kojo.ai on your phone in each room — browser tab acts as a voice terminal',
      'Use existing Bluetooth speaker + phone mic for kitchen/living room coverage',
      'Pin the AI CFO page as a PWA shortcut on each phone homescreen',
    ],
    axiomNote: 'Full Axiom access, zero new hardware spend.',
  },
  {
    tier: 'Smart',
    cost: '$30–$120',
    color: 'blue',
    icon: '🔊',
    items: [
      'Amazon Echo Dot 5th Gen (~$30 each) — 2 units covers a 2BR fully',
      'Use IFTTT to route "Alexa, ask Axiom…" to your AI CFO API',
      'Or Raspberry Pi Zero 2W (~$15) + USB mic + speaker as always-on Axiom node',
    ],
    axiomNote: 'Axiom hears you from any room. Echo Dots double as smart home hubs.',
  },
  {
    tier: 'Integrated',
    cost: '$120–$300',
    color: 'purple',
    icon: '🏠',
    items: [
      'Google Nest Hub (~$60) in living room for visual Axiom dashboard',
      'Echo Dot in bedroom for bedside briefings',
      'Smart plugs (Kasa EP25, ~$15 each) — Axiom can track and cut phantom load costs',
      'TP-Link Tapo bulbs (~$10 each) — Axiom dims lights based on your sleep schedule',
    ],
    axiomNote: 'Axiom controls your environment and tracks energy cost in real time.',
  },
]

const SMART_HOME_COST_TIPS = [
  { icon: '⚡', title: 'Energy monitoring', tip: 'Smart plugs with energy monitoring (Kasa EP25) let Axiom track which devices cost the most — often $20–40/mo in phantom load.' },
  { icon: '🌡️', title: 'Smart thermostat', tip: 'Nest or Ecobee pays back in 6–12 months. Axiom can optimize schedules around your work calendar to cut HVAC costs 15–20%.' },
  { icon: '💡', title: 'Lighting', tip: 'Smart bulbs + schedules eliminate lights left on. Typical 2BR saves $8–15/mo — Axiom tracks it as a recurring saving.' },
  { icon: '📱', title: 'Presence detection', tip: 'Axiom can detect when everyone leaves (phone off wifi) and auto-cut HVAC/lights — avg $30/mo savings.' },
]

export default function DeviceScanner() {
  const [scanning, setScanning] = useState(false)
  const [networkData, setNetworkData] = useState<ScanResult | null>(null)
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([])
  const [audioError, setAudioError] = useState<string | null>(null)
  const [activeInput, setActiveInput] = useState<string | null>(null)
  const [activeOutput, setActiveOutput] = useState<string | null>(null)
  const [listeningTo, setListeningTo] = useState<MediaStream | null>(null)
  const [tab, setTab] = useState<'audio' | 'network' | 'setup' | 'costs'>('audio')
  const [expanded, setExpanded] = useState(true)

  const scanAudioDevices = useCallback(async () => {
    setAudioError(null)
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
        .then(s => s.getTracks().forEach(t => t.stop()))
        .catch(() => {})
      const devices = await navigator.mediaDevices.enumerateDevices()
      const audio = devices
        .filter(d => d.kind === 'audioinput' || d.kind === 'audiooutput')
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || `${d.kind === 'audioinput' ? 'Microphone' : 'Speaker'} (${d.deviceId.slice(0, 6)}…)`,
          kind: d.kind as AudioDevice['kind'],
        }))
      setAudioDevices(audio)
      const defIn = audio.find(d => d.kind === 'audioinput' && d.deviceId === 'default')
      const defOut = audio.find(d => d.kind === 'audiooutput' && d.deviceId === 'default')
      if (defIn) setActiveInput(defIn.deviceId)
      if (defOut) setActiveOutput(defOut.deviceId)
    } catch (e: unknown) {
      setAudioError(e instanceof Error ? e.message : 'Could not enumerate audio devices')
    }
  }, [])

  const scanNetwork = useCallback(async () => {
    try {
      const res = await fetch('/api/devices')
      const data = await res.json()
      if (data.success) setNetworkData(data)
    } catch { /* silent */ }
  }, [])

  const fullScan = useCallback(async () => {
    setScanning(true)
    await Promise.all([scanAudioDevices(), scanNetwork()])
    setScanning(false)
  }, [scanAudioDevices, scanNetwork])

  useEffect(() => { void scanAudioDevices() }, [scanAudioDevices])

  const toggleListening = async (deviceId: string) => {
    if (listeningTo) {
      listeningTo.getTracks().forEach(t => t.stop())
      setListeningTo(null)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId === 'default' ? true : { deviceId: { exact: deviceId } },
      })
      setListeningTo(stream)
      setActiveInput(deviceId)
    } catch (e: unknown) {
      setAudioError(e instanceof Error ? e.message : 'Could not access microphone')
    }
  }

  const microphones = audioDevices.filter(d => d.kind === 'audioinput')
  const speakers = audioDevices.filter(d => d.kind === 'audiooutput')

  const TABS = [
    { id: 'audio', label: '🎙️ Audio', count: audioDevices.length },
    { id: 'network', label: '📡 Network', count: networkData?.deviceCount },
    { id: 'setup', label: '🏠 Whole-House Setup', count: null },
    { id: 'costs', label: '⚡ Smart Savings', count: null },
  ] as const

  return (
    <div className="rounded-xl border border-[#1e2a3a] bg-[#0d1520] overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-[#111c2a] transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg">📡</span>
          <span className="text-sm font-semibold text-white">Axiom Smart Home Hub</span>
          <span className="text-[10px] bg-emerald-900/60 text-emerald-300 border border-emerald-700/40 rounded-full px-2 py-0.5">
            {audioDevices.length} audio · {networkData?.deviceCount ?? '?'} network
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); void fullScan() }}
            disabled={scanning}
            className="text-[11px] px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 disabled:opacity-50 transition-colors"
          >
            {scanning ? '⟳ Scanning…' : '⟳ Scan'}
          </button>
          <span className="text-slate-500 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <>
          {/* Tabs */}
          <div className="flex border-b border-[#1e2a3a] overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-xs whitespace-nowrap font-medium border-b-2 transition-all ${
                  tab === t.id
                    ? 'border-[#00e5b0] text-[#00e5b0] bg-[#0a1810]'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.label}
                {t.count != null && (
                  <span className="ml-1.5 bg-slate-700 rounded-full text-slate-300 px-1.5 py-0.5 text-[9px]">{t.count}</span>
                )}
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* AUDIO TAB */}
            {tab === 'audio' && (
              <div className="space-y-4">
                {audioError && <p className="text-xs text-red-400">⚠️ {audioError}</p>}
                {microphones.length > 0 && (
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Microphones</p>
                    <div className="flex flex-col gap-1.5">
                      {microphones.map(d => (
                        <div key={d.deviceId} className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${activeInput === d.deviceId ? 'bg-emerald-900/30 border-emerald-700/50' : 'bg-[#111c2a] border-[#1e2a3a]'}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <span>🎙️</span>
                            <span className="text-xs text-slate-200 truncate">{d.label}</span>
                            {listeningTo && activeInput === d.deviceId && (
                              <span className="flex gap-0.5 ml-1">
                                {[0,1,2].map(i => <span key={i} className="w-0.5 bg-emerald-400 rounded-full animate-pulse" style={{ height: `${8 + i * 4}px`, animationDelay: `${i * 0.15}s` }} />)}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => toggleListening(d.deviceId)}
                            className={`text-[10px] px-2 py-1 rounded ml-2 shrink-0 transition-colors ${listeningTo && activeInput === d.deviceId ? 'bg-red-700/60 hover:bg-red-600/60 text-red-200' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
                          >
                            {listeningTo && activeInput === d.deviceId ? '■ Stop' : '▶ Test'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {speakers.length > 0 && (
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Speakers / Output</p>
                    <div className="flex flex-col gap-1.5">
                      {speakers.map(d => (
                        <div key={d.deviceId} onClick={() => setActiveOutput(d.deviceId)} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${activeOutput === d.deviceId ? 'bg-blue-900/30 border-blue-700/50' : 'bg-[#111c2a] border-[#1e2a3a] hover:border-slate-600'}`}>
                          <span>🔊</span>
                          <span className="text-xs text-slate-200 truncate">{d.label}</span>
                          {activeOutput === d.deviceId && <span className="ml-auto text-[10px] text-blue-300 bg-blue-900/40 rounded px-1.5 py-0.5">Active</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {audioDevices.length === 0 && !audioError && (
                  <p className="text-xs text-slate-500 italic">Grant microphone permission to see your audio devices.</p>
                )}
              </div>
            )}

            {/* NETWORK TAB */}
            {tab === 'network' && (
              <div>
                {!networkData && !scanning && (
                  <div className="text-center py-6">
                    <p className="text-sm text-slate-400 mb-3">Scan your local network to see all connected devices</p>
                    <button onClick={() => { void fullScan(); setTab('network') }} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-sm">⟳ Scan Now</button>
                  </div>
                )}
                {scanning && <p className="text-xs text-slate-400 animate-pulse py-4">Scanning ARP table…</p>}
                {networkData && (
                  <>
                    <p className="text-[10px] text-slate-500 mb-3">Scanned {new Date(networkData.scannedAt).toLocaleTimeString()} · {networkData.deviceCount} device{networkData.deviceCount !== 1 ? 's' : ''}</p>
                    <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
                      {networkData.devices.length === 0 && (
                        <p className="text-xs text-slate-500 italic">No devices in ARP table. Try pinging your router first: <code className="text-emerald-400">ping 10.0.0.1</code></p>
                      )}
                      {networkData.devices.map(d => (
                        <div key={d.mac} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#111c2a] border border-[#1e2a3a]">
                          <span className="text-base">{DEVICE_ICONS[d.type]}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-slate-200 truncate">{d.hostname !== d.ip ? d.hostname : d.ip}</p>
                            <p className="text-[10px] text-slate-500">{d.ip} · {d.mac}</p>
                          </div>
                          <span className="shrink-0 text-[10px] capitalize text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">{d.type}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-[#1e2a3a]">
                      <p className="text-[10px] text-slate-500 mb-1">This machine ({networkData.thisDevice.hostname})</p>
                      {networkData.networkInterfaces.filter(i => i.family === 'IPv4').map(i => (
                        <p key={i.name + i.ip} className="text-[11px] text-slate-400">{i.name}: {i.ip}</p>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* WHOLE-HOUSE SETUP TAB */}
            {tab === 'setup' && (
              <div className="space-y-5">
                <div>
                  <p className="text-sm text-white font-medium mb-1">Talk to Axiom from anywhere in your apartment</p>
                  <p className="text-xs text-slate-400">Recommendations for a 2-bedroom apartment — pick your budget tier.</p>
                </div>
                {VOICE_SETUP_TIERS.map(tier => (
                  <div key={tier.tier} className={`rounded-xl border p-4 ${
                    tier.color === 'emerald' ? 'bg-emerald-950/30 border-emerald-800/40' :
                    tier.color === 'blue' ? 'bg-blue-950/30 border-blue-800/40' :
                    'bg-purple-950/30 border-purple-800/40'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{tier.icon}</span>
                        <span className="text-sm font-semibold text-white">{tier.tier} Setup</span>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        tier.color === 'emerald' ? 'bg-emerald-900/60 text-emerald-300' :
                        tier.color === 'blue' ? 'bg-blue-900/60 text-blue-300' :
                        'bg-purple-900/60 text-purple-300'
                      }`}>{tier.cost}</span>
                    </div>
                    <ul className="space-y-1.5 mb-3">
                      {tier.items.map(item => (
                        <li key={item} className="flex items-start gap-2 text-xs text-slate-300">
                          <span className="mt-0.5 shrink-0 text-slate-500">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                    <p className="text-[11px] text-slate-400 bg-black/20 rounded px-2.5 py-1.5 italic">
                      💬 {tier.axiomNote}
                    </p>
                  </div>
                ))}

                <div className="bg-[#111c2a] border border-[#1e2a3a] rounded-xl p-4">
                  <p className="text-xs font-semibold text-white mb-2">🔗 Connect smart home to Axiom</p>
                  <p className="text-xs text-slate-400 mb-2">Once you have smart devices, tell Axiom their brands and it will build an automation plan around your budget and financial goals.</p>
                  <a
                    href="/ai?prompt=I+want+to+connect+my+smart+home+devices+to+Axiom.+Help+me+plan+which+devices+to+add,+how+to+set+them+up+for+whole-house+voice+access,+and+how+to+use+them+to+reduce+my+monthly+expenses."
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#00e5b0]/20 hover:bg-[#00e5b0]/30 border border-[#00e5b0]/30 text-[#00e5b0] rounded-lg text-xs transition-colors"
                  >
                    🧠 Ask Axiom to plan my smart home setup →
                  </a>
                </div>
              </div>
            )}

            {/* SMART SAVINGS TAB */}
            {tab === 'costs' && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-white font-medium mb-1">Smart home = lower monthly costs</p>
                  <p className="text-xs text-slate-400">Axiom's priority: cut expenses first, then plan upgrades. Here's where smart devices save real money.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SMART_HOME_COST_TIPS.map(tip => (
                    <div key={tip.title} className="bg-[#111c2a] border border-[#1e2a3a] rounded-xl p-3.5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{tip.icon}</span>
                        <span className="text-xs font-semibold text-white">{tip.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{tip.tip}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-4">
                  <p className="text-xs font-semibold text-emerald-300 mb-2">📊 Potential monthly savings for a 2BR apartment</p>
                  <div className="space-y-1.5">
                    {[
                      ['Phantom load elimination (smart plugs)', '$15–35'],
                      ['HVAC optimization (smart thermostat)', '$20–50'],
                      ['Lighting automation', '$8–15'],
                      ['Water heater scheduling', '$10–20'],
                    ].map(([label, val]) => (
                      <div key={label} className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300">{label}</span>
                        <span className="text-emerald-400 font-medium">{val}/mo</span>
                      </div>
                    ))}
                    <div className="pt-2 mt-1 border-t border-emerald-800/40 flex items-center justify-between text-xs">
                      <span className="text-slate-200 font-medium">Total potential savings</span>
                      <span className="text-emerald-300 font-bold">$53–120/mo</span>
                    </div>
                  </div>
                </div>

                <a
                  href="/ai?prompt=I+want+Axiom+to+help+me+use+smart+home+devices+to+reduce+my+monthly+expenses.+Start+by+reviewing+my+current+bills+and+tell+me+where+smart+home+automation+would+have+the+highest+ROI+for+my+specific+financial+situation."
                  className="flex items-center gap-1.5 px-3 py-2.5 bg-[#00e5b0]/20 hover:bg-[#00e5b0]/30 border border-[#00e5b0]/30 text-[#00e5b0] rounded-lg text-xs transition-colors w-fit"
                >
                  🧠 Let Axiom audit my bills for smart home ROI →
                </a>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
