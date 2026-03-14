// src/App.jsx
// FILE 9 of 13
// Main application — Morpheus UI shell with agent integration

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MorpheusAgent } from './agent'
import {
  MorpheusLogo,
  MorpheusAgentHeader,
  MorpheusPhaseBar,
  MorpheusDropCharacter,
  MorpheusComplete,
} from './MorpheusCharacter'
import Editor from './editor'
import Preview from './preview'

// ─── Phase Constants ───────────────────────────────────────

const PHASES = {
  IDLE: 'idle',
  ANALYZING: 'analyzing',
  PLANNING: 'planning',
  BUILDING: 'building',
  REVIEWING: 'reviewing',
  COMPLETE: 'complete',
}

// ─── Main App ──────────────────────────────────────────────

export default function App() {
  const openRouterKey = import.meta.env.VITE_OPENROUTER_KEY || ''

  // ─── Core State ───
  const [phase, setPhase] = useState(PHASES.IDLE)
  const [screenshot, setScreenshot] = useState(null)
  const [screenshotPreview, setScreenshotPreview] = useState(null)
  const [files, setFiles] = useState({})
  const [activeFile, setActiveFile] = useState(null)
  const [activityLog, setActivityLog] = useState([])
  const [architecture, setArchitecture] = useState(null)
  const [buildProgress, setBuildProgress] = useState({ built: 0, total: 0, reviewed: 0 })
  const [error, setError] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const agentRef = useRef(null)
  const logEndRef = useRef(null)

  // Auto-scroll activity log
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [activityLog])

  // ─── Agent Callbacks ───
  const onActivity = useCallback((entry) => {
    setActivityLog(prev => [...prev, { ...entry, ts: Date.now() }])
  }, [])

  const onPhaseChange = useCallback((newPhase) => {
    setPhase(newPhase)
  }, [])

  const onFileUpdate = useCallback((filename, content, status) => {
    setFiles(prev => ({
      ...prev,
      [filename]: { content, status, updatedAt: Date.now() }
    }))
    if (status === 'building' || status === 'reviewing') {
      setActiveFile(filename)
    }
  }, [])

  const onArchitecture = useCallback((arch) => {
    setArchitecture(arch)
    setBuildProgress({ built: 0, total: arch.files?.length || 0, reviewed: 0 })
  }, [])

  const onProgress = useCallback((progress) => {
    setBuildProgress(prev => ({ ...prev, ...progress }))
  }, [])

  // ─── File Handling ───
  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      setScreenshot(e.target.result)
      setScreenshotPreview(e.target.result)
    }
    reader.readAsDataURL(file)
  }, [])

  // ─── Drag & Drop ───
  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    handleFile(file)
  }, [handleFile])

  const handleFileInput = useCallback((e) => {
    const file = e.target.files?.[0]
    handleFile(file)
  }, [handleFile])

  // ─── Clipboard paste ───
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          handleFile(item.getAsFile())
          break
        }
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [handleFile])

  // ─── Start Build ───
  const handleStartBuild = useCallback(async () => {
    if (!screenshot) return
    if (!openRouterKey) {
      setError('Missing VITE_OPENROUTER_KEY in your .env file')
      return
    }

    setFiles({})
    setActiveFile(null)
    setActivityLog([])
    setArchitecture(null)
    setBuildProgress({ built: 0, total: 0, reviewed: 0 })
    setError(null)
    setShowPreview(false)
    setPhase(PHASES.ANALYZING)

    const agent = new MorpheusAgent(openRouterKey, {
      onActivity,
      onPhaseChange,
      onFileUpdate,
      onArchitecture,
      onProgress,
    })
    agentRef.current = agent

    try {
      await agent.run(screenshot)
    } catch (err) {
      console.error('[Morpheus] Build failed:', err)
      setError(err.message || 'Build failed')
      setPhase(PHASES.IDLE)
    }
  }, [screenshot, openRouterKey, onActivity, onPhaseChange, onFileUpdate, onArchitecture, onProgress])

  // ─── Stop ───
  const handleStop = useCallback(() => {
    if (agentRef.current) agentRef.current.stop()
    setPhase(PHASES.IDLE)
  }, [])

  // ─── Reset ───
  const handleReset = useCallback(() => {
    if (agentRef.current) agentRef.current.stop()
    setPhase(PHASES.IDLE)
    setScreenshot(null)
    setScreenshotPreview(null)
    setFiles({})
    setActiveFile(null)
    setActivityLog([])
    setArchitecture(null)
    setBuildProgress({ built: 0, total: 0, reviewed: 0 })
    setError(null)
    setShowPreview(false)
  }, [])

  // ─── Download .zip ───
  const handleDownload = useCallback(async () => {
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()

    Object.entries(files).forEach(([name, { content }]) => {
      zip.file(`morpheus-project/src/${name}`, content)
    })

    zip.file('morpheus-project/package.json', JSON.stringify({
      name: 'morpheus-project', private: true, version: '1.0.0', type: 'module',
      scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
      dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0' },
      devDependencies: { '@vitejs/plugin-react': '^4.0.0', autoprefixer: '^10.4.14', postcss: '^8.4.24', tailwindcss: '^3.3.2', vite: '^5.0.0' }
    }, null, 2))

    zip.file('morpheus-project/vite.config.js',
      `import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\nexport default defineConfig({ plugins: [react()] })`)

    zip.file('morpheus-project/tailwind.config.js',
      `export default { content: ["./index.html","./src/**/*.{js,jsx}"], theme: { extend: {} }, plugins: [] }`)

    zip.file('morpheus-project/postcss.config.js',
      `export default { plugins: { tailwindcss: {}, autoprefixer: {} } }`)

    zip.file('morpheus-project/index.html',
      `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8"/>\n<meta name="viewport" content="width=device-width,initial-scale=1.0"/>\n<title>Morpheus Project</title>\n</head>\n<body>\n<div id="root"></div>\n<script type="module" src="/src/main.jsx"></script>\n</body>\n</html>`)

    if (!files['main.jsx']) {
      zip.file('morpheus-project/src/main.jsx',
        `import React from 'react'\nimport ReactDOM from 'react-dom/client'\nimport App from './App'\nimport './index.css'\nReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>)`)
    }

    if (!files['index.css']) {
      zip.file('morpheus-project/src/index.css',
        `@tailwind base;\n@tailwind components;\n@tailwind utilities;`)
    }

    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'morpheus-project.zip'
    a.click()
    URL.revokeObjectURL(url)
  }, [files])

  // ─── Computed ───
  const fileList = useMemo(() =>
    Object.entries(files).map(([name, data]) => ({ name, ...data })),
    [files]
  )

  const activeFileContent = activeFile && files[activeFile] ? files[activeFile].content : ''
  const isRunning = phase !== PHASES.IDLE && phase !== PHASES.COMPLETE
  const isComplete = phase === PHASES.COMPLETE
  const hasScreenshot = !!screenshot

  const progressPercent = buildProgress.total > 0
    ? (buildProgress.built / buildProgress.total) * 100
    : 0

  // ─── Render ───
  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: '#ffffff' }}
    >

      {/* ═══ TOP NAV ═══ */}
      <nav
        className="flex items-center justify-between px-5 border-b shrink-0"
        style={{ height: 52, borderColor: '#e9ecef' }}
      >
        {/* Left: Logo */}
        <MorpheusLogo phase={phase} />

        {/* Center: Phase indicator */}
        <div className="flex items-center gap-2">
          {isRunning && buildProgress.total > 0 && (
            <span className="text-[10px] font-medium" style={{ color: '#868e96' }}>
              {buildProgress.built}/{buildProgress.total} files
            </span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {isComplete && (
            <>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="px-3 py-1.5 text-[11px] font-semibold rounded-md border transition-colors"
                style={{
                  borderColor: showPreview ? '#4f46e5' : '#e9ecef',
                  color: showPreview ? '#4f46e5' : '#495057',
                  background: showPreview ? '#eef2ff' : '#ffffff',
                }}
              >
                {showPreview ? '← Code' : 'Preview →'}
              </button>
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 text-[11px] font-semibold rounded-md text-white"
                style={{ background: '#4f46e5' }}
              >
                ↓ Download .zip
              </button>
            </>
          )}
          {isRunning && (
            <button
              onClick={handleStop}
              className="px-3 py-1.5 text-[11px] font-semibold rounded-md border"
              style={{ borderColor: '#ef4444', color: '#ef4444' }}
            >
              ■ Stop
            </button>
          )}
          {(isComplete || (!isRunning && fileList.length > 0)) && (
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-[11px] font-medium rounded-md border"
              style={{ borderColor: '#e9ecef', color: '#495057' }}
            >
              Reset
            </button>
          )}
        </div>
      </nav>

      {/* Phase bar */}
      <MorpheusPhaseBar phase={phase} progress={progressPercent} />

      {/* ═══ MAIN BODY ═══ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ─── LEFT PANEL: Agent Activity ─── */}
        <div
          className="flex flex-col overflow-hidden border-r shrink-0"
          style={{ width: 340, borderColor: '#e9ecef' }}
        >
          {/* Agent header */}
          <div
            className="px-4 py-2.5 border-b shrink-0"
            style={{ borderColor: '#e9ecef' }}
          >
            <MorpheusAgentHeader phase={phase} stats={buildProgress} />
          </div>

          {/* Screenshot preview */}
          {screenshotPreview && (
            <div className="px-4 py-3 border-b shrink-0" style={{ borderColor: '#e9ecef' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold tracking-wide" style={{ color: '#868e96' }}>
                  SOURCE
                </span>
                {!isRunning && (
                  <button
                    onClick={() => { setScreenshot(null); setScreenshotPreview(null) }}
                    className="text-[10px]"
                    style={{ color: '#868e96' }}
                  >
                    ✕
                  </button>
                )}
              </div>
              <img
                src={screenshotPreview}
                alt="Screenshot"
                className="w-full rounded-md border object-cover"
                style={{ borderColor: '#e9ecef', maxHeight: 140 }}
              />
            </div>
          )}

          {/* Architecture plan */}
          {architecture && (
            <div className="px-4 py-3 border-b shrink-0" style={{ borderColor: '#e9ecef' }}>
              <span className="text-[10px] font-semibold tracking-wide" style={{ color: '#868e96' }}>
                ARCHITECTURE
              </span>
              <div className="mt-2 space-y-1">
                {architecture.files?.map((f, i) => {
                  const fileData = files[f.name]
                  const status = fileData?.status || 'queued'
                  return (
                    <motion.div
                      key={f.name}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => fileData && setActiveFile(f.name)}
                      className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-gray-50"
                      style={{
                        background: activeFile === f.name ? '#eef2ff' : 'transparent',
                      }}
                    >
                      <FileStatusDot status={status} />
                      <span
                        className="text-[11px] font-medium truncate"
                        style={{
                          color: status === 'complete' ? '#0a0a0a'
                            : status === 'building' ? '#f59e0b'
                            : status === 'reviewing' ? '#3b82f6'
                            : '#868e96',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {f.name}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Activity log */}
          <div
            className="flex-1 overflow-y-auto px-4 py-3"
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}
          >
            {activityLog.length === 0 && !isRunning && (
              <div className="flex items-center justify-center h-full">
                <span style={{ color: '#868e96' }}>
                  Drop a screenshot to begin
                </span>
              </div>
            )}
            {activityLog.map((entry, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="leading-5"
                style={{ color: getLogColor(entry) }}
              >
                {entry.line}
              </motion.div>
            ))}
            {/* Completion banner */}
            {phase === PHASES.COMPLETE && (
              <MorpheusComplete
                fileCount={Object.keys(files).length}
                reviewCycles={buildProgress.reviewed || 0}
              />
            )}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* ─── CENTER + RIGHT: Drop Zone / Code / Preview ─── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* No screenshot — Drop zone */}
          {!hasScreenshot && phase === PHASES.IDLE && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className="flex-1 flex items-center justify-center"
            >
              <div
                className="flex flex-col items-center gap-8 p-16 rounded-2xl border-2 border-dashed transition-all max-w-lg w-full mx-8"
                style={{
                  borderColor: isDragging ? '#4f46e5' : '#e9ecef',
                  background: isDragging ? '#f5f3ff' : '#fafafa',
                }}
              >
                <MorpheusDropCharacter isDragging={isDragging} />

                <div className="flex items-center gap-3">
                  <label
                    className="px-5 py-2.5 text-sm font-semibold rounded-lg cursor-pointer transition-transform hover:scale-105 text-white"
                    style={{ background: '#4f46e5' }}
                  >
                    Browse files
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs" style={{ color: '#868e96' }}>
                    or Ctrl+V to paste
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Screenshot uploaded, not started — Start button */}
          {hasScreenshot && phase === PHASES.IDLE && (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-6">
                <img
                  src={screenshotPreview}
                  alt="Ready"
                  className="rounded-xl border shadow-sm"
                  style={{ borderColor: '#e9ecef', maxHeight: 300, maxWidth: 500 }}
                />
                <button
                  onClick={handleStartBuild}
                  className="px-8 py-3 text-sm font-semibold rounded-lg text-white transition-transform hover:scale-105"
                  style={{ background: '#4f46e5' }}
                >
                  ▶ Start Building
                </button>
                {error && (
                  <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
                )}
              </div>
            </div>
          )}

          {/* Building / Complete — Code editor or Preview */}
          {(isRunning || isComplete) && (
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* File tabs */}
              {fileList.length > 0 && (
                <div
                  className="flex items-center gap-0 border-b overflow-x-auto shrink-0"
                  style={{ borderColor: '#e9ecef' }}
                >
                  {fileList.map(f => (
                    <button
                      key={f.name}
                      onClick={() => { setActiveFile(f.name); setShowPreview(false) }}
                      className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-medium border-b-2 transition-colors shrink-0"
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        borderBottomColor: activeFile === f.name && !showPreview ? '#4f46e5' : 'transparent',
                        color: activeFile === f.name && !showPreview ? '#4f46e5' : '#495057',
                        background: activeFile === f.name && !showPreview ? '#fafaff' : 'transparent',
                      }}
                    >
                      <FileStatusDot status={f.status} />
                      {f.name}
                    </button>
                  ))}

                  {isComplete && (
                    <button
                      onClick={() => setShowPreview(true)}
                      className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-medium border-b-2 transition-colors shrink-0 ml-auto"
                      style={{
                        borderBottomColor: showPreview ? '#10b981' : 'transparent',
                        color: showPreview ? '#10b981' : '#868e96',
                      }}
                    >
                      ▶ Live Preview
                    </button>
                  )}
                </div>
              )}

              {/* Content area */}
              <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                  {showPreview ? (
                    <motion.div
                      key="preview"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full"
                    >
                      <Preview files={files} />
                    </motion.div>
                  ) : activeFile ? (
                    <motion.div
                      key={activeFile}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full"
                    >
                      <Editor
                        filename={activeFile}
                        content={activeFileContent}
                        status={files[activeFile]?.status}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-full flex items-center justify-center"
                    >
                      <div className="text-center">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                          style={{ background: '#f8f9fa' }}
                        >
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#868e96" strokeWidth="1.5">
                            <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
                            <path d="M13 2v7h7" />
                          </svg>
                        </div>
                        <p className="text-sm" style={{ color: '#868e96' }}>
                          {isRunning ? 'Morpheus is working...' : 'Select a file to view'}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Bottom status bar */}
              <div
                className="flex items-center justify-between px-4 py-2 border-t shrink-0"
                style={{ borderColor: '#e9ecef', background: '#fafafa' }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-[10px]" style={{ color: '#868e96' }}>
                    {fileList.length} files
                  </span>
                  {architecture?.techStack && (
                    <span className="text-[10px]" style={{ color: '#868e96' }}>
                      {architecture.techStack}
                    </span>
                  )}
                </div>

                {buildProgress.total > 0 && (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-24 h-1.5 rounded-full overflow-hidden"
                      style={{ background: '#e9ecef' }}
                    >
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: isComplete ? '#10b981' : '#4f46e5' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <span
                      className="text-[10px] font-medium"
                      style={{ color: isComplete ? '#10b981' : '#4f46e5' }}
                    >
                      {isComplete ? '✓ Complete' : `${Math.round(progressPercent)}%`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────

function FileStatusDot({ status }) {
  if (status === 'complete') {
    return <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#10b981' }} />
  }
  if (status === 'building') {
    return (
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#f59e0b' }} />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: '#f59e0b' }} />
      </span>
    )
  }
  if (status === 'reviewing') {
    return (
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#3b82f6' }} />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: '#3b82f6' }} />
      </span>
    )
  }
  return <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#d4d4d4' }} />
}

function getLogColor(entry) {
  if (entry.type === 'success' || entry.line?.startsWith('✓')) return '#10b981'
  if (entry.type === 'warning' || entry.line?.startsWith('⚠')) return '#f59e0b'
  if (entry.type === 'error' || entry.line?.startsWith('✗')) return '#ef4444'
  if (entry.type === 'tool') return '#7c3aed'
  if (entry.type === 'thinking') return '#4f46e5'
  if (entry.type === 'file') return '#4f46e5'
  if (entry.line?.startsWith('→')) return '#868e96'
  if (entry.type === 'meta') return '#495057'
  if (entry.type === 'phase') return '#4f46e5'
  return '#0a0a0a'
}
