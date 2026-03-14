// src/MorpheusCharacter.jsx
// FILE 5 of 13
// The living visual identity of Morpheus — an eye that reacts to every agent phase

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Phase Configuration ───────────────────────────────────

const PHASE_CONFIG = {
  idle: {
    eyeColor: '#868e96',
    glowColor: 'rgba(134, 142, 150, 0.1)',
    pupilScale: 0.85,
    ringOpacity: 0,
    orbitSpeed: 0,
    breathe: true,
    label: 'Morpheus',
  },
  analyzing: {
    eyeColor: '#8b5cf6',
    glowColor: 'rgba(139, 92, 246, 0.15)',
    pupilScale: 1.1,
    ringOpacity: 1,
    orbitSpeed: 3,
    breathe: false,
    label: 'Seeing',
  },
  planning: {
    eyeColor: '#6366f1',
    glowColor: 'rgba(99, 102, 241, 0.15)',
    pupilScale: 1.0,
    ringOpacity: 0.8,
    orbitSpeed: 5,
    breathe: false,
    label: 'Thinking',
  },
  building: {
    eyeColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.15)',
    pupilScale: 0.95,
    ringOpacity: 0.6,
    orbitSpeed: 2,
    breathe: false,
    label: 'Building',
  },
  reviewing: {
    eyeColor: '#3b82f6',
    glowColor: 'rgba(59, 130, 246, 0.15)',
    pupilScale: 1.05,
    ringOpacity: 0.9,
    orbitSpeed: 4,
    breathe: false,
    label: 'Reviewing',
  },
  complete: {
    eyeColor: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.15)',
    pupilScale: 1.0,
    ringOpacity: 0,
    orbitSpeed: 0,
    breathe: true,
    label: 'Complete',
  },
}

// ─── The Morpheus Eye ──────────────────────────────────────
// The core visual element. A geometric eye that breathes, scans,
// focuses, and pulses depending on what the agent is doing.

export function MorpheusEye({ phase = 'idle', size = 32 }) {
  const config = PHASE_CONFIG[phase] || PHASE_CONFIG.idle
  const isActive = phase !== 'idle' && phase !== 'complete'
  const center = size / 2
  const outerR = size / 2 - 1
  const innerR = size / 4
  const pupilR = size / 7

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Glow backdrop */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          boxShadow: isActive
            ? `0 0 ${size * 0.6}px ${config.glowColor}`
            : '0 0 0px transparent',
        }}
        transition={{ duration: 0.5 }}
      />

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={config.breathe ? 'morpheus-breathe' : ''}
      >
        {/* Outer ring — the iris */}
        <motion.circle
          cx={center}
          cy={center}
          r={outerR}
          fill="none"
          strokeWidth={1.5}
          animate={{
            stroke: config.eyeColor,
            opacity: 0.3,
          }}
          transition={{ duration: 0.4 }}
        />

        {/* Middle ring — the awareness field */}
        <motion.circle
          cx={center}
          cy={center}
          r={innerR * 1.6}
          fill="none"
          strokeWidth={1}
          strokeDasharray={`${innerR * 0.8} ${innerR * 0.4}`}
          animate={{
            stroke: config.eyeColor,
            opacity: config.ringOpacity,
            rotate: [0, 360],
          }}
          transition={{
            rotate: {
              duration: config.orbitSpeed || 10,
              repeat: Infinity,
              ease: 'linear',
            },
            stroke: { duration: 0.4 },
            opacity: { duration: 0.4 },
          }}
          style={{ transformOrigin: 'center' }}
        />

        {/* Inner diamond — the soul */}
        <motion.path
          d={`M ${center} ${center - innerR}
              L ${center + innerR} ${center}
              L ${center} ${center + innerR}
              L ${center - innerR} ${center} Z`}
          fill="none"
          strokeWidth={1.5}
          animate={{
            stroke: config.eyeColor,
            scale: config.pupilScale,
          }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{ transformOrigin: 'center' }}
        />

        {/* Pupil — the core */}
        <motion.circle
          cx={center}
          cy={center}
          r={pupilR}
          animate={{
            fill: config.eyeColor,
            r: pupilR * config.pupilScale,
          }}
          transition={{ duration: 0.3 }}
        />

        {/* Light reflection — brings it to life */}
        <circle
          cx={center + pupilR * 0.4}
          cy={center - pupilR * 0.4}
          r={pupilR * 0.25}
          fill="white"
          opacity={0.8}
        />

        {/* Orbiting particle — only when active */}
        {isActive && (
          <motion.circle
            cx={center}
            cy={center - outerR * 0.7}
            r={1.5}
            fill={config.eyeColor}
            animate={{ rotate: [0, 360] }}
            transition={{
              duration: config.orbitSpeed || 3,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{ transformOrigin: `${center}px ${center}px` }}
          />
        )}
      </svg>

      {/* Ripple on phase change */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            key={phase}
            className="absolute inset-0 rounded-full"
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ scale: 2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{ border: `1px solid ${config.eyeColor}` }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Morpheus Brand Logo (Nav) ─────────────────────────────

export function MorpheusLogo({ phase = 'idle' }) {
  const config = PHASE_CONFIG[phase] || PHASE_CONFIG.idle

  return (
    <div className="flex items-center gap-2.5">
      <MorpheusEye phase={phase} size={28} />
      <div className="flex items-center gap-2">
        <span
          className="text-[15px] font-bold tracking-tight"
          style={{ color: '#0a0a0a', fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
        >
          MORPHEUS
        </span>
        <AnimatePresence mode="wait">
          {phase !== 'idle' && (
            <motion.span
              key={phase}
              initial={{ opacity: 0, y: -4, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="text-[9px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full"
              style={{
                color: config.eyeColor,
                background: config.glowColor,
              }}
            >
              {config.label}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Morpheus Agent Status (Sidebar Header) ────────────────

export function MorpheusAgentHeader({ phase = 'idle', stats = {} }) {
  const config = PHASE_CONFIG[phase] || PHASE_CONFIG.idle
  const isActive = phase !== 'idle' && phase !== 'complete'

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <MorpheusEye phase={phase} size={22} />
        <div>
          <div className="flex items-center gap-1.5">
            <span
              className="text-[11px] font-semibold tracking-wide"
              style={{ color: '#0a0a0a', fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
            >
              MORPHEUS
            </span>
            {isActive && (
              <motion.div
                className="h-1 rounded-full overflow-hidden"
                style={{ width: 32, background: '#e9ecef' }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: config.eyeColor }}
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                />
              </motion.div>
            )}
          </div>
          <span className="text-[9px]" style={{ color: '#868e96' }}>
            Autonomous Build Agent
          </span>
        </div>
      </div>

      {stats && (
        <div className="flex items-center gap-3">
          {stats.built !== undefined && (
            <MiniStat label="Built" value={stats.built} color="#10b981" />
          )}
          {stats.reviewed !== undefined && (
            <MiniStat label="Checked" value={stats.reviewed} color="#3b82f6" />
          )}
        </div>
      )}
    </div>
  )
}

function MiniStat({ label, value, color }) {
  return (
    <div className="flex items-center gap-1">
      <span className="inline-block w-1 h-1 rounded-full" style={{ background: color }} />
      <span className="text-[9px]" style={{ color: '#868e96' }}>{label}</span>
      <span className="text-[9px] font-bold" style={{ color }}>{value}</span>
    </div>
  )
}

// ─── Morpheus Phase Bar (top progress) ─────────────────────

export function MorpheusPhaseBar({ phase = 'idle', progress = 0 }) {
  const config = PHASE_CONFIG[phase] || PHASE_CONFIG.idle
  const isActive = phase !== 'idle'

  if (!isActive) return null

  return (
    <div
      className="w-full relative overflow-hidden shrink-0"
      style={{ height: 2, background: '#f1f3f5' }}
    >
      {/* Progress fill */}
      <motion.div
        className="h-full absolute left-0 top-0"
        style={{ background: config.eyeColor }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
      {/* Scanning light */}
      {phase !== 'complete' && (
        <motion.div
          className="h-full absolute top-0"
          style={{
            width: '20%',
            background: `linear-gradient(90deg, transparent, ${config.glowColor}, transparent)`,
          }}
          animate={{ left: ['-20%', '120%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </div>
  )
}

// ─── Morpheus Drop Zone Character ──────────────────────────
// The large eye that greets users on the drop zone

export function MorpheusDropCharacter({ isDragging = false }) {
  return (
    <div className="flex flex-col items-center gap-6">
      {/* Large Morpheus eye */}
      <div className="relative">
        <MorpheusEye
          phase={isDragging ? 'analyzing' : 'idle'}
          size={80}
        />
        {/* Floating particles when dragging */}
        <AnimatePresence>
          {isDragging && (
            <>
              {[0, 1, 2, 3, 4, 5].map(i => (
                <motion.div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: 4,
                    height: 4,
                    background: '#8b5cf6',
                    top: '50%',
                    left: '50%',
                  }}
                  initial={{ scale: 0, x: 0, y: 0 }}
                  animate={{
                    scale: [0, 1, 0],
                    x: [0, Math.cos((i * 60 * Math.PI) / 180) * 50],
                    y: [0, Math.sin((i * 60 * Math.PI) / 180) * 50],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: 'easeOut',
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Brand text */}
      <div className="text-center">
        <h1
          className="text-2xl font-bold tracking-tight mb-1"
          style={{
            color: '#0a0a0a',
            fontFamily: "'Space Grotesk', 'Inter', sans-serif",
          }}
        >
          {isDragging ? (
            <span
              style={{
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              I see it.
            </span>
          ) : (
            'Show me any interface.'
          )}
        </h1>
        <p className="text-sm" style={{ color: '#495057' }}>
          {isDragging
            ? 'Release to begin autonomous build'
            : "Drop a screenshot. I'll build the code."}
        </p>
      </div>
    </div>
  )
}

// ─── Morpheus Completion Banner ────────────────────────────

export function MorpheusComplete({ fileCount = 0, reviewCycles = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-4 py-3 rounded-lg mt-3"
      style={{
        background: '#ecfdf5',
        border: '1px solid rgba(16, 185, 129, 0.2)',
      }}
    >
      <MorpheusEye phase="complete" size={24} />
      <div>
        <span className="text-[12px] font-semibold" style={{ color: '#10b981' }}>
          Build complete
        </span>
        <span className="text-[11px] ml-2" style={{ color: '#868e96' }}>
          {fileCount} files · {reviewCycles} review{reviewCycles !== 1 ? 's' : ''} passed
        </span>
      </div>
    </motion.div>
  )
}
