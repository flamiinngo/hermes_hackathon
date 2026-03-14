// src/editor.jsx
// FILE 6 of 13
// Code editor with character-by-character streaming, syntax highlighting,
// and live status indicators. Shows Hermes writing code in real-time.

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'

// ─── Syntax Token Colors ───────────────────────────────────

const TOKEN_COLORS = {
  keyword: '#7c3aed',
  string: '#059669',
  comment: '#a3a3a3',
  component: '#4f46e5',
  tag: '#4f46e5',
  attribute: '#d97706',
  number: '#dc2626',
  operator: '#495057',
  function: '#7c3aed',
  property: '#0891b2',
  punctuation: '#868e96',
  className: '#4f46e5',
  default: '#0a0a0a',
  cssProperty: '#4f46e5',
  cssValue: '#059669',
  cssPunctuation: '#868e96',
  cssSelector: '#7c3aed',
}

// ─── JSX Tokenizer ─────────────────────────────────────────

function tokenizeJSX(line) {
  const tokens = []
  let remaining = line

  const patterns = [
    { regex: /^(\/\/.*$)/, type: 'comment' },
    { regex: /^(\/\*[\s\S]*?\*\/)/, type: 'comment' },
    { regex: /^("[^"]*")/, type: 'string' },
    { regex: /^('[^']*')/, type: 'string' },
    { regex: /^(`[^`]*`)/, type: 'string' },
    { regex: /^(<\/?\w+)/, type: 'tag' },
    { regex: /^(\/>|>)/, type: 'punctuation' },
    { regex: /^(import|export|default|from|return|const|let|var|function|if|else|switch|case|break|new|typeof|instanceof|void|null|undefined|true|false|async|await|try|catch|throw|class|extends|super|this|yield|of|in)\b/, type: 'keyword' },
    { regex: /^(useState|useEffect|useRef|useMemo|useCallback|useContext|useReducer|useId|useLayoutEffect)\b/, type: 'function' },
    { regex: /^([A-Z][a-zA-Z0-9]+)\b/, type: 'component' },
    { regex: /^(\w+)(?=$)/, type: 'function' },
    { regex: /^(className)/, type: 'attribute' },
    { regex: /^(\w+)(?==)/, type: 'attribute' },
    { regex: /^(\d+\.?\d*)/, type: 'number' },
    { regex: /^([=<>!+\-*/%&|^~?:]+)/, type: 'operator' },
    { regex: /^([{}()$$,;.])/, type: 'punctuation' },
    { regex: /^(\w+)/, type: 'default' },
    { regex: /^(\s+)/, type: 'default' },
    { regex: /^(.)/, type: 'default' },
  ]

  let safety = 0
  while (remaining.length > 0 && safety < 500) {
    safety++
    let matched = false
    for (const pattern of patterns) {
      const match = remaining.match(pattern.regex)
      if (match) {
        tokens.push({ text: match[1], type: pattern.type })
        remaining = remaining.slice(match[1].length)
        matched = true
        break
      }
    }
    if (!matched) {
      tokens.push({ text: remaining[0], type: 'default' })
      remaining = remaining.slice(1)
    }
  }

  return tokens.length > 0 ? tokens : [{ text: line, type: 'default' }]
}

// ─── CSS Tokenizer ─────────────────────────────────────────

function tokenizeCSS(line) {
  const tokens = []
  let remaining = line

  const patterns = [
    { regex: /^(\/\*[\s\S]*?\*\/)/, type: 'comment' },
    { regex: /^(\/\/.*$)/, type: 'comment' },
    { regex: /^(@[\w-]+)/, type: 'keyword' },
    { regex: /^(--[\w-]+)/, type: 'cssProperty' },
    { regex: /^([\w-]+)(?=\s*:)/, type: 'cssProperty' },
    { regex: /^(#[0-9a-fA-F]{3,8})/, type: 'cssValue' },
    { regex: /^(\d+\.?\d*(?:px|rem|em|vh|vw|%|s|ms|deg)?)/, type: 'number' },
    { regex: /^("[^"]*"|'[^']*')/, type: 'string' },
    { regex: /^(url$[^)]*$/, type: 'string' },
    { regex: /^([.#][\w-]+)/, type: 'cssSelector' },
    { regex: /^([\w-]+)(?=\s*\{)/, type: 'cssSelector' },
    { regex: /^([{}();:,])/, type: 'cssPunctuation' },
    { regex: /^([\w-]+)/, type: 'cssValue' },
    { regex: /^(\s+)/, type: 'default' },
    { regex: /^(.)/, type: 'default' },
  ]

  let safety = 0
  while (remaining.length > 0 && safety < 500) {
    safety++
    let matched = false
    for (const pattern of patterns) {
      const match = remaining.match(pattern.regex)
      if (match) {
        tokens.push({ text: match[1], type: pattern.type })
        remaining = remaining.slice(match[1].length)
        matched = true
        break
      }
    }
    if (!matched) {
      tokens.push({ text: remaining[0], type: 'default' })
      remaining = remaining.slice(1)
    }
  }

  return tokens.length > 0 ? tokens : [{ text: line, type: 'default' }]
}

function tokenizeLine(line, isCSS) {
  if (!line) return [{ text: '', type: 'default' }]
  return isCSS ? tokenizeCSS(line) : tokenizeJSX(line)
}

// ─── Sleep utility ─────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// ─── Main Editor Component ─────────────────────────────────

export default function Editor({ filename, content, status }) {
  const [displayedLines, setDisplayedLines] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const containerRef = useRef(null)
  const prevContentRef = useRef('')
  const streamingRef = useRef(false)
  const cancelRef = useRef(false)

  const isCSS = filename?.endsWith('.css')
  const allLines = useMemo(() => content?.split('\n') || [], [content])

  // ─── Handle content changes ───
  useEffect(() => {
    const prevContent = prevContentRef.current
    prevContentRef.current = content || ''

    if (!content) {
      setDisplayedLines([])
      return
    }

    // If complete/reviewing with changed content — show immediately (this is a fix)
    if (status === 'complete' && prevContent && prevContent !== content) {
      setDisplayedLines(allLines)
      setIsStreaming(false)
      scrollToBottom()
      return
    }

    // Already showing this content
    if (prevContent === content) return

    // New content while building — stream it
    if (!prevContent || status === 'building') {
      cancelRef.current = true
      setTimeout(() => {
        cancelRef.current = false
        streamContent(allLines)
      }, 50)
      return
    }

    // Default: show immediately
    setDisplayedLines(allLines)
    setIsStreaming(false)
  }, [content, status]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Character-by-character streaming ───
  async function streamContent(lines) {
    if (streamingRef.current) {
      cancelRef.current = true
      await sleep(100)
      cancelRef.current = false
    }

    streamingRef.current = true
    setIsStreaming(true)
    setDisplayedLines([])

    const CHARS_PER_TICK = 3
    const TICK_MS = 8
    const LINE_PAUSE_MS = 12
    const SECTION_PAUSE_MS = 60

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      if (cancelRef.current || !streamingRef.current) break

      const line = lines[lineIdx]

      // Detect section breaks for dramatic pauses
      const isSectionBreak =
        line.trim() === '' && lineIdx > 0 && lines[lineIdx - 1]?.trim() !== ''
      const isImport = line.trim().startsWith('import ')
      const isExport = line.trim().startsWith('export ')
      const isComment =
        line.trim().startsWith('//') || line.trim().startsWith('/*')

      if (isSectionBreak) await sleep(SECTION_PAUSE_MS)

      // Empty lines or short structural lines — show instantly
      if (
        line.length === 0 ||
        line.length < 5 ||
        line.trim() === '{' ||
        line.trim() === '}' ||
        line.trim() === ')' ||
        line.trim() === ');' ||
        line.trim() === '});' ||
        line.trim() === '})'
      ) {
        setDisplayedLines(prev => [...prev, line])
        await sleep(LINE_PAUSE_MS)
        continue
      }

      // Stream character by character
      for (let ci = 0; ci < line.length; ci += CHARS_PER_TICK) {
        if (cancelRef.current) break
        const partial = line.slice(0, ci + CHARS_PER_TICK)

        setDisplayedLines(prev => {
          const next = [...prev]
          if (next.length <= lineIdx) {
            next.push(partial)
          } else {
            next[lineIdx] = partial
          }
          return next
        })

        await sleep(TICK_MS)
      }

      // Ensure full line is shown
      setDisplayedLines(prev => {
        const next = [...prev]
        if (next.length <= lineIdx) {
          next.push(line)
        } else {
          next[lineIdx] = line
        }
        return next
      })

      // Auto-scroll every few lines
      if (lineIdx % 3 === 0) scrollToBottom()

      // Pause after imports/exports/comments for readability
      if (isImport || isExport || isComment) {
        await sleep(LINE_PAUSE_MS * 2)
      } else {
        await sleep(LINE_PAUSE_MS)
      }
    }

    streamingRef.current = false
    setIsStreaming(false)
    setDisplayedLines(lines)
    scrollToBottom()
  }

  function scrollToBottom() {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }

  // ─── Render ───
  const linesToRender =
    displayedLines.length > 0 ? displayedLines : allLines
  const totalLines = allLines.length

  return (
    <div className="h-full flex flex-col" style={{ background: '#fafafa' }}>
      {/* File header bar */}
      <div
        className="flex items-center justify-between px-4 py-1.5 border-b shrink-0"
        style={{ borderColor: '#e9ecef', background: '#ffffff' }}
      >
        <div className="flex items-center gap-2">
          <FileIcon isCSS={isCSS} />
          <span
            className="text-[11px] font-medium"
            style={{
              color: '#0a0a0a',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {filename}
          </span>

          {status === 'building' && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
              style={{ background: '#fffbeb', color: '#92400e' }}
            >
              WRITING
            </motion.span>
          )}
          {status === 'reviewing' && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
              style={{ background: '#eff6ff', color: '#3b82f6' }}
            >
              REVIEWING
            </motion.span>
          )}
          {status === 'complete' && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
              style={{ background: '#ecfdf5', color: '#059669' }}
            >
              ✓ COMPLETE
            </motion.span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px]" style={{ color: '#868e96' }}>
            {isStreaming
              ? `${displayedLines.length}/${totalLines} lines`
              : `${totalLines} lines`}
          </span>
          {isStreaming && (
            <div className="flex items-center gap-1">
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="inline-block w-1 h-1 rounded-full"
                style={{ background: '#f59e0b' }}
              />
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                className="inline-block w-1 h-1 rounded-full"
                style={{ background: '#f59e0b' }}
              />
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                className="inline-block w-1 h-1 rounded-full"
                style={{ background: '#f59e0b' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Code area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-auto"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          lineHeight: '20px',
        }}
      >
        <table
          className="w-full border-collapse"
          style={{ minWidth: '100%' }}
        >
          <tbody>
            {linesToRender.map((line, i) => {
              const isCurrentLine =
                isStreaming && i === displayedLines.length - 1
              const isNewLine =
                isStreaming && i >= displayedLines.length - 3
              const tokens = tokenizeLine(line, isCSS)

              return (
                <motion.tr
                  key={i}
                  initial={isNewLine ? { opacity: 0 } : false}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.1 }}
                  style={{
                    background: isCurrentLine
                      ? 'rgba(245, 158, 11, 0.03)'
                      : status === 'reviewing'
                        ? 'rgba(79, 70, 229, 0.02)'
                        : 'transparent',
                  }}
                >
                  {/* Line number */}
                  <td
                    className="text-right pr-4 pl-4 select-none"
                    style={{
                      color: isCurrentLine ? '#f59e0b' : '#d4d4d4',
                      width: 56,
                      minWidth: 56,
                      userSelect: 'none',
                      verticalAlign: 'top',
                    }}
                  >
                    {i + 1}
                  </td>

                  {/* Code content */}
                  <td className="pr-8" style={{ whiteSpace: 'pre' }}>
                    {tokens.map((token, ti) => (
                      <span
                        key={ti}
                        style={{
                          color:
                            TOKEN_COLORS[token.type] ||
                            TOKEN_COLORS.default,
                        }}
                      >
                        {token.text}
                      </span>
                    ))}
                    {/* Blinking cursor on current line */}
                    {isCurrentLine && (
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{
                          duration: 0.5,
                          repeat: Infinity,
                        }}
                        style={{
                          display: 'inline-block',
                          width: 2,
                          height: 14,
                          background: '#4f46e5',
                          marginLeft: 1,
                          verticalAlign: 'text-bottom',
                        }}
                      />
                    )}
                  </td>
                </motion.tr>
              )
            })}

            {/* Empty padding rows */}
            {linesToRender.length < 20 &&
              Array.from({ length: 20 - linesToRender.length }).map(
                (_, i) => (
                  <tr key={`empty-${i}`}>
                    <td
                      className="text-right pr-4 pl-4"
                      style={{
                        color: '#e9ecef',
                        width: 56,
                        minWidth: 56,
                        userSelect: 'none',
                      }}
                    >
                      {linesToRender.length + i + 1}
                    </td>
                    <td />
                  </tr>
                )
              )}
          </tbody>
        </table>
      </div>

      {/* Streaming progress bar */}
      {isStreaming && (
        <div
          className="shrink-0"
          style={{ height: 2, background: '#e9ecef' }}
        >
          <motion.div
            className="h-full"
            style={{ background: '#4f46e5' }}
            initial={{ width: '0%' }}
            animate={{
              width: `${(displayedLines.length / Math.max(1, totalLines)) * 100}%`,
            }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────

function FileIcon({ isCSS }) {
  if (isCSS) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="2"
          stroke="#0891b2"
          strokeWidth="1.5"
        />
        <path
          d="M8 12h8M8 16h5"
          stroke="#0891b2"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"
        stroke="#4f46e5"
        strokeWidth="1.5"
      />
      <path d="M13 2v7h7" stroke="#4f46e5" strokeWidth="1.5" />
    </svg>
  )
}
