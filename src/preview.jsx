// src/preview.jsx
// FILE 7 of 13
// Live preview of Hermes-generated code using Babel standalone
// for bulletproof JSX compilation + React error boundaries

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Preview Component ─────────────────────────────────────

export default function Preview({ files }) {
  const iframeRef = useRef(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [scale, setScale] = useState('desktop')
  const debounceRef = useRef(null)
  const blobUrlRef = useRef(null)

  // Build HTML whenever files change
  const htmlDocument = useMemo(() => {
    if (!files || Object.keys(files).length === 0) return null
    const jsxFiles = Object.entries(files).filter(
      ([name]) => name.endsWith('.jsx') || name.endsWith('.js')
    )
    if (jsxFiles.length === 0) return null

    try {
      return buildPreviewHTML(files)
    } catch (err) {
      console.error('[Preview] Build error:', err)
      setError(err.message)
      return null
    }
  }, [files])

  // Debounced iframe update
  useEffect(() => {
    if (!htmlDocument) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      renderToIframe(htmlDocument)
    }, 400)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [htmlDocument]) // eslint-disable-line react-hooks/exhaustive-deps

  function renderToIframe(html) {
    const iframe = iframeRef.current
    if (!iframe) return

    setStatus('building')
    setError(null)

    try {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)

      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url

      iframe.onload = () => {
        setStatus('ready')
        try {
          iframe.contentWindow.addEventListener('error', (e) => {
            console.error('[Preview Runtime]', e.message)
            setError(`Runtime: ${e.message}`)
          })
        } catch (e) {
          // cross-origin
        }
      }

      iframe.onerror = () => {
        setStatus('error')
        setError('Failed to load preview')
      }

      iframe.src = url
    } catch (err) {
      setStatus('error')
      setError(err.message)
    }
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // Viewport sizing
  const viewportStyle = useMemo(() => {
    switch (scale) {
      case 'mobile':
        return { width: 375 }
      case 'tablet':
        return { width: 768 }
      default:
        return { width: '100%' }
    }
  }, [scale])

  const fileCount = Object.keys(files || {}).length
  const completeCount = Object.values(files || {}).filter(
    (f) => f.status === 'complete'
  ).length

  return (
    <div className="h-full flex flex-col" style={{ background: '#f8f9fa' }}>
      {/* Browser Chrome Toolbar */}
      <div
        className="flex items-center justify-between px-4 py-1.5 border-b shrink-0"
        style={{ borderColor: '#e9ecef', background: '#ffffff' }}
      >
        <div className="flex items-center gap-3">
          {/* Traffic lights */}
          <div className="flex items-center gap-1.5">
            <span
              className="w-[10px] h-[10px] rounded-full"
              style={{ background: '#ff5f57' }}
            />
            <span
              className="w-[10px] h-[10px] rounded-full"
              style={{ background: '#febc2e' }}
            />
            <span
              className="w-[10px] h-[10px] rounded-full"
              style={{ background: '#28c840' }}
            />
          </div>

          {/* URL bar */}
          <div
            className="flex items-center gap-2 px-3 py-1 rounded-md"
            style={{ background: '#f8f9fa', minWidth: 220 }}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#868e96"
              strokeWidth="2"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <span
              className="text-[10px]"
              style={{
                color: '#868e96',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              morpheus://preview
            </span>
          </div>

          <PreviewStatus status={status} />
        </div>

        {/* Right: viewport controls */}
        <div className="flex items-center gap-1.5">
          <ViewportButton
            icon="desktop"
            active={scale === 'desktop'}
            onClick={() => setScale('desktop')}
          />
          <ViewportButton
            icon="tablet"
            active={scale === 'tablet'}
            onClick={() => setScale('tablet')}
          />
          <ViewportButton
            icon="mobile"
            active={scale === 'mobile'}
            onClick={() => setScale('mobile')}
          />
          <div
            className="w-px h-4 mx-1"
            style={{ background: '#e9ecef' }}
          />
          <span className="text-[10px]" style={{ color: '#868e96' }}>
            {completeCount}/{fileCount}
          </span>
        </div>
      </div>

      {/* Preview Area */}
      <div
        className="flex-1 overflow-hidden flex items-start justify-center relative"
        style={{
          background: scale === 'desktop' ? '#ffffff' : '#f1f3f5',
        }}
      >
        {!htmlDocument ? (
          <EmptyPreview fileCount={fileCount} />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={scale}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-white relative"
              style={{
                width: viewportStyle.width,
                maxWidth: '100%',
                height:
                  scale !== 'desktop' ? 'calc(100% - 32px)' : '100%',
                boxShadow:
                  scale !== 'desktop'
                    ? '0 0 0 1px rgba(0,0,0,0.05), 0 4px 24px rgba(0,0,0,0.06)'
                    : 'none',
                margin: scale !== 'desktop' ? '16px auto' : 0,
                borderRadius: scale !== 'desktop' ? 8 : 0,
                overflow: 'hidden',
              }}
            >
              {/* Mobile notch */}
              {scale === 'mobile' && (
                <div
                  className="h-6 flex items-center justify-center shrink-0"
                  style={{ background: '#f8f9fa' }}
                >
                  <div
                    className="w-16 h-1 rounded-full"
                    style={{ background: '#dee2e6' }}
                  />
                </div>
              )}

              <iframe
                ref={iframeRef}
                title="Morpheus Live Preview"
                sandbox="allow-scripts allow-same-origin allow-popups"
                className="w-full border-0"
                style={{
                  height:
                    scale === 'mobile' ? 'calc(100% - 24px)' : '100%',
                  background: '#ffffff',
                }}
              />
            </motion.div>
          </AnimatePresence>
        )}

        {/* Error toast */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10"
            >
              <div
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg"
                style={{
                  background: '#ffffff',
                  border: '1px solid #fecaca',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: '#ef4444' }}
                />
                <span
                  className="text-[11px] max-w-xs truncate"
                  style={{
                    color: '#991b1b',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {error}
                </span>
                <button
                  onClick={() => setError(null)}
                  className="text-[10px] ml-2 shrink-0"
                  style={{ color: '#868e96' }}
                >
                  ✕
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── HTML Builder ──────────────────────────────────────────
// Assembles complete HTML from Hermes-generated files
// Babel standalone handles all JSX compilation
// Custom module system resolves inter-file imports

function buildPreviewHTML(files) {
  // 1. Extract CSS
  let customCSS = ''
  const cssFile = files['index.css']
  if (cssFile?.content) {
    customCSS = cssFile.content
      .replace(/@tailwind\s+\w+\s*;/g, '')
      .trim()
  }

  // Extract font @imports
  const fontImports = []
  customCSS = customCSS.replace(
    /@import\s+url$['"]?([^'")\s]+)['"]?$\s*;?/g,
    (match, url) => {
      fontImports.push(url)
      return ''
    }
  )

  // 2. Collect JS/JSX modules
  const modules = {}
  for (const [name, data] of Object.entries(files)) {
    if (
      (name.endsWith('.jsx') || name.endsWith('.js')) &&
      data.content &&
      data.content.trim().length > 0
    ) {
      modules[name] = data.content
    }
  }

  // 3. Build module definitions — escaped for template literal embedding
  const moduleDefinitions = Object.entries(modules)
    .map(([name, code]) => {
      const escaped = code
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$\{/g, '\\${')
      return `__modules['${name}'] = \`${escaped}\`;`
    })
    .join('\n\n')

  // 4. Font link tags
  const fontLinks = fontImports
    .map((url) => `<link rel="stylesheet" href="${url}" />`)
    .join('\n  ')

  // 5. Assemble full HTML document
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Morpheus Preview</title>

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
  ${fontLinks}

  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
          }
        }
      }
    }
  <\/script>

  <!-- Custom CSS written by Hermes -->
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      line-height: 1.5;
    }
    img { max-width: 100%; height: auto; }
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 9999px; }
    ${customCSS}
  </style>
</head>
<body>
  <div id="root"></div>

  <!-- React 18 -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>

  <!-- Babel Standalone — compiles Hermes-generated JSX in browser -->
  <script crossorigin src="https://unpkg.com/@babel/standalone@7/babel.min.js"><\/script>

  <script>
    // ══════════════════════════════════════════════════════
    // MORPHEUS MODULE SYSTEM
    // All source code below was written by Hermes Agent.
    // This system compiles and executes it.
    // ══════════════════════════════════════════════════════

    // Raw JSX source from Hermes
    const __modules = {};

    ${moduleDefinitions}

    // Module cache
    const __cache = {};

    // Require function — resolves imports between Hermes-generated files
    function __require(name) {
      // Built-in modules
      if (name === 'react' || name === 'React') return React;
      if (name === 'react-dom' || name === 'react-dom/client') return ReactDOM;
      if (name === 'react/jsx-runtime') {
        return {
          jsx: React.createElement,
          jsxs: React.createElement,
          Fragment: React.Fragment
        };
      }

      // Normalize path
      var normalized = name;
      if (normalized.startsWith('./')) normalized = normalized.slice(2);
      if (normalized.startsWith('/')) normalized = normalized.slice(1);
      if (!normalized.includes('.')) {
        if (__modules[normalized + '.jsx']) normalized += '.jsx';
        else if (__modules[normalized + '.js']) normalized += '.js';
      }

      // Return cached
      if (__cache[normalized]) return __cache[normalized];

      // Get source
      var source = __modules[normalized];
      if (!source) {
        console.warn('[Morpheus] Module not found:', normalized);
        console.warn('[Morpheus] Available:', Object.keys(__modules));
        var placeholder = {
          default: function MissingModule() {
            return React.createElement('div', {
              style: { padding: 16, color: '#868e96', fontSize: 12, fontFamily: 'monospace' }
            }, '⏳ ' + normalized + ' not yet available');
          }
        };
        __cache[normalized] = placeholder;
        return placeholder;
      }

      // Compile JSX to JS using Babel
      var compiled;
      try {
        compiled = Babel.transform(source, {
          presets: ['react'],
          filename: normalized,
        }).code;
      } catch(err) {
        console.error('[Morpheus] Compile error in ' + normalized + ':', err.message);
        var errorMod = {
          default: function CompileError() {
            return React.createElement('div', {
              style: {
                padding: 16, background: '#fef2f2', color: '#991b1b',
                fontSize: 12, fontFamily: 'monospace', borderRadius: 8, margin: 8
              }
            },
              React.createElement('strong', null, 'Compile error: ' + normalized),
              React.createElement('pre', {
                style: { marginTop: 8, whiteSpace: 'pre-wrap', fontSize: 11 }
              }, err.message)
            );
          }
        };
        __cache[normalized] = errorMod;
        return errorMod;
      }

      // Execute compiled module
      var moduleExports = {};
      var moduleObj = { exports: moduleExports };

      try {
        // Replace require() calls with our __require
        var executable = compiled;
        executable = executable.replace(
          /require\$["']([^"']+)["']\$/g,
          '__require("$1")'
        );

        // Handle _interopRequireDefault from Babel output
        if (executable.indexOf('_interopRequireDefault') !== -1 && executable.indexOf('function _interopRequireDefault') === -1) {
          executable = 'function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }\\n' + executable;
        }
        if (executable.indexOf('_interopRequireWildcard') !== -1 && executable.indexOf('function _interopRequireWildcard') === -1) {
          executable = 'function _interopRequireWildcard(obj) { if (obj && obj.__esModule) return obj; var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; }\\n' + executable;
        }

        // Make React hooks available
        var hookSetup = [
          'var useState = React.useState;',
          'var useEffect = React.useEffect;',
          'var useRef = React.useRef;',
          'var useMemo = React.useMemo;',
          'var useCallback = React.useCallback;',
          'var useContext = React.useContext;',
          'var useReducer = React.useReducer;',
          'var useId = React.useId;',
          'var useLayoutEffect = React.useLayoutEffect;',
          'var Fragment = React.Fragment;',
          'var createContext = React.createContext;',
          'var forwardRef = React.forwardRef;',
          'var memo = React.memo;',
        ].join('\\n');

        var fn = new Function(
          'exports', 'module', 'require', 'React', 'ReactDOM',
          hookSetup + '\\n' + executable + '\\n' +
          'if (typeof exports["default"] === "undefined") {' +
          '  var _keys = Object.keys(exports).filter(function(k) { return k !== "__esModule"; });' +
          '  if (_keys.length === 1) exports["default"] = exports[_keys[0]];' +
          '}'
        );

        fn(moduleExports, moduleObj, __require, React, ReactDOM);

        var result = moduleObj.exports !== moduleExports ? moduleObj.exports : moduleExports;
        __cache[normalized] = result;
        return result;

      } catch(err) {
        console.error('[Morpheus] Runtime error in ' + normalized + ':', err);
        var runtimeErrorMod = {
          default: function RuntimeError() {
            return React.createElement('div', {
              style: {
                padding: 16, background: '#fef2f2', color: '#991b1b',
                fontSize: 12, fontFamily: 'monospace', borderRadius: 8, margin: 8
              }
            },
              React.createElement('strong', null, 'Runtime error: ' + normalized),
              React.createElement('pre', {
                style: { marginTop: 8, whiteSpace: 'pre-wrap', fontSize: 11 }
              }, err.message)
            );
          }
        };
        __cache[normalized] = runtimeErrorMod;
        return runtimeErrorMod;
      }
    }

    // Error Boundary
    class MorpheusErrorBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
      }
      static getDerivedStateFromError(error) {
        return { hasError: true, error: error };
      }
      componentDidCatch(error, info) {
        console.error('[Morpheus ErrorBoundary]', error, info);
      }
      render() {
        if (this.state.hasError) {
          return React.createElement('div', {
            style: {
              padding: 32, fontFamily: 'monospace', fontSize: 13,
              color: '#991b1b', background: '#fef2f2', minHeight: '100vh',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }
          },
            React.createElement('div', { style: { maxWidth: 480, textAlign: 'center' } },
              React.createElement('p', { style: { fontSize: 32, marginBottom: 16 } }, '⚠'),
              React.createElement('p', { style: { fontWeight: 'bold', marginBottom: 8 } }, 'Preview Error'),
              React.createElement('p', {
                style: { fontSize: 11, color: '#6b7280', marginBottom: 16 }
              }, this.state.error?.message || 'Something went wrong'),
              React.createElement('button', {
                onClick: function() { location.reload(); },
                style: {
                  padding: '8px 16px', background: '#4f46e5', color: 'white',
                  border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                }
              }, 'Retry')
            )
          );
        }
        return this.props.children;
      }
    }

    // ── Mount the App ──
    try {
      var AppModule = __require('App.jsx');
      var App = AppModule['default'] || AppModule;

      if (typeof App !== 'function') {
        throw new Error('App.jsx did not export a valid React component. Got: ' + typeof App);
      }

      var root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(
        React.createElement(MorpheusErrorBoundary, null,
          React.createElement(App)
        )
      );

      console.log('[Morpheus] ✓ Preview mounted');

    } catch(err) {
      console.error('[Morpheus] Mount error:', err);
      document.getElementById('root').innerHTML =
        '<div style="padding:32px;font-family:monospace;color:#991b1b;font-size:13px;text-align:center;">' +
        '<p style="font-size:32px;margin-bottom:16px;">⚠<\\/p>' +
        '<p style="font-weight:bold;margin-bottom:8px;">Mount Error<\\/p>' +
        '<p style="font-size:11px;color:#6b7280;">' + (err.message || 'Unknown error') + '<\\/p>' +
        '<\\/div>';
    }
  <\/script>
</body>
</html>`
}

// ─── Sub-components ────────────────────────────────────────

function PreviewStatus({ status }) {
  const configs = {
    idle: { color: '#868e96', label: 'Idle', pulse: false },
    building: { color: '#f59e0b', label: 'Compiling...', pulse: true },
    ready: { color: '#10b981', label: 'Live', pulse: false },
    error: { color: '#ef4444', label: 'Error', pulse: false },
  }
  const config = configs[status] || configs.idle

  return (
    <div className="flex items-center gap-1.5">
      {config.pulse ? (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ background: config.color }}
          />
          <span
            className="relative inline-flex rounded-full h-1.5 w-1.5"
            style={{ background: config.color }}
          />
        </span>
      ) : (
        <span
          className="inline-flex h-1.5 w-1.5 rounded-full"
          style={{ background: config.color }}
        />
      )}
      <span
        className="text-[10px] font-medium"
        style={{ color: config.color }}
      >
        {config.label}
      </span>
    </div>
  )
}

function ViewportButton({ icon, active, onClick }) {
  const icons = {
    desktop: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
    tablet: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <path d="M12 18h.01" />
      </svg>
    ),
    mobile: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="6" y="2" width="12" height="20" rx="2" />
        <path d="M12 18h.01" />
      </svg>
    ),
  }

  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded transition-colors"
      style={{
        color: active ? '#4f46e5' : '#868e96',
        background: active ? '#eef2ff' : 'transparent',
      }}
    >
      {icons[icon]}
    </button>
  )
}

function EmptyPreview({ fileCount }) {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="text-center">
        {fileCount > 0 ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'linear',
              }}
              className="mx-auto mb-4"
              style={{ width: 40, height: 40 }}
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 40 40"
                fill="none"
              >
                <path
                  d="M20 4L4 14l16 8 16-8L20 4z"
                  fill="#e9ecef"
                />
                <path
                  d="M4 26l16 8 16-8"
                  stroke="#e9ecef"
                  strokeWidth="2"
                  fill="none"
                />
                <path
                  d="M4 20l16 8 16-8"
                  stroke="#e9ecef"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            </motion.div>
            <p
              className="text-sm font-medium"
              style={{ color: '#868e96' }}
            >
              Assembling preview...
            </p>
            <p
              className="text-[11px] mt-1"
              style={{ color: '#ced4da' }}
            >
              Waiting for App.jsx
            </p>
          </>
        ) : (
          <>
            <div
              className="mx-auto mb-4"
              style={{ width: 40, height: 40 }}
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 40 40"
                fill="none"
              >
                <path
                  d="M20 4L4 14l16 8 16-8L20 4z"
                  fill="#e9ecef"
                />
                <path
                  d="M4 26l16 8 16-8"
                  stroke="#e9ecef"
                  strokeWidth="2"
                  fill="none"
                />
                <path
                  d="M4 20l16 8 16-8"
                  stroke="#e9ecef"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            </div>
            <p
              className="text-sm font-medium"
              style={{ color: '#ced4da' }}
            >
              Preview will appear here
            </p>
          </>
        )}
      </div>
    </div>
  )
}
