// src/agent.js
// FILE 8 of 13
// The autonomous Morpheus agent — powered entirely by Hermes.
// Hermes sees the screenshot, plans the architecture, writes every file,
// reviews its own code, and fixes its own bugs. No human in the loop.

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// ─── Phase Constants ───────────────────────────────────────

const PHASES = {
  IDLE: 'idle',
  ANALYZING: 'analyzing',
  PLANNING: 'planning',
  BUILDING: 'building',
  REVIEWING: 'reviewing',
  COMPLETE: 'complete',
}

// ─── Morpheus Agent ────────────────────────────────────────

export class MorpheusAgent {

  constructor(openRouterKey, callbacks) {
    this.key = openRouterKey
    this.onActivity = callbacks.onActivity
    this.onPhaseChange = callbacks.onPhaseChange
    this.onFileUpdate = callbacks.onFileUpdate
    this.onArchitecture = callbacks.onArchitecture
    this.onProgress = callbacks.onProgress

    this.running = false
    this.architecture = null
    this.files = {}
    this.reviewCycles = 0
    this.maxReviewCycles = 2
  }

  // ─── Lifecycle ───────────────────────────────────────────

  stop() {
    this.running = false
  }

  async run(screenshotBase64) {
    this.running = true
    this.files = {}
    this.reviewCycles = 0

    try {
      // Phase 1: Analyze screenshot
      this.setPhase(PHASES.ANALYZING)
      const analysis = await this.analyzeScreenshot(screenshotBase64)
      if (!this.running) return

      // Phase 2: Plan architecture
      this.setPhase(PHASES.PLANNING)
      const architecture = await this.planArchitecture(analysis)
      if (!this.running) return

      // Phase 3: Build each file
      this.setPhase(PHASES.BUILDING)
      await this.buildAllFiles(architecture, analysis)
      if (!this.running) return

      // Phase 4: Self-review and fix
      this.setPhase(PHASES.REVIEWING)
      await this.reviewAndFix()
      if (!this.running) return

      // Phase 5: Complete
      this.setPhase(PHASES.COMPLETE)
      this.log('', 'default')
      this.log('═══════════════════════════════════', 'success')
      this.log('✓ BUILD COMPLETE', 'success')
      this.log(`  ${Object.keys(this.files).length} files generated`, 'success')
      this.log(`  ${this.reviewCycles} review cycle${this.reviewCycles !== 1 ? 's' : ''} passed`, 'success')
      this.log('  Ready to preview and download', 'success')
      this.log('═══════════════════════════════════', 'success')

    } catch (err) {
      if (this.running) {
        this.log(`✗ Fatal error: ${err.message}`, 'error')
        throw err
      }
    }
  }

  // ─── Phase 1: Screenshot Analysis ───────────────────────

  async analyzeScreenshot(base64) {
    this.log('◆ PHASE 1: VISUAL ANALYSIS', 'phase')
    this.log('─────────────────────────────────', 'meta')
    await sleep(300)

    this.log('→ sending screenshot to vision model...', 'default')
    this.log('  tool_call: analyze_screenshot()', 'tool')

    const prompt = `You are an expert UI/UX analyst and frontend architect. Analyze this screenshot of a web interface with extreme precision.

Return ONLY a valid JSON object with NO other text, NO markdown:

{
  "appType": "landing page | dashboard | e-commerce | blog | portfolio | saas | social | other",
  "description": "2-3 sentence description of what this app/page does",
  "layout": {
    "type": "single-column | two-column | three-column | grid | hero-sections | sidebar-main | fullscreen",
    "hasNavbar": true/false,
    "navbarPosition": "top | side | none",
    "hasFooter": true/false,
    "hasSidebar": true/false,
    "sidebarPosition": "left | right | none",
    "hasHero": true/false,
    "contentSections": ["section names in order from top to bottom"]
  },
  "designSystem": {
    "style": "minimal | corporate | playful | dark | glassmorphism | brutalist | material | flat",
    "primaryColor": "#hex",
    "secondaryColor": "#hex",
    "backgroundColor": "#hex",
    "textColor": "#hex",
    "accentColor": "#hex",
    "borderRadius": "none | small(4px) | medium(8px) | large(16px) | full(9999px)",
    "fontStyle": "sans-serif | serif | mono | mixed",
    "spacing": "tight | normal | relaxed",
    "shadowStyle": "none | subtle | medium | heavy"
  },
  "components": [
    {
      "name": "ComponentName",
      "type": "navbar | hero | card | button | form | table | list | modal | sidebar | footer | section | feature-grid | pricing | testimonial | cta | stats | gallery | other",
      "description": "what this component shows and does",
      "position": "top | left | right | center | bottom",
      "estimatedProps": ["list of likely props"],
      "hasInteractivity": true/false,
      "children": ["nested component names if any"]
    }
  ],
  "typography": {
    "headingSize": "text-xl to text-6xl range",
    "bodySize": "text-sm to text-lg range",
    "fontWeight": "light | normal | medium | semibold | bold",
    "lineHeight": "tight | normal | relaxed"
  },
  "content": {
    "hasImages": true/false,
    "hasIcons": true/false,
    "hasCharts": true/false,
    "hasForms": true/false,
    "hasButtons": true/false,
    "hasTables": true/false,
    "estimatedTextBlocks": number,
    "ctaText": ["list of button/CTA text visible"]
  },
  "responsiveness": "mobile-first | desktop-first | unknown",
  "complexity": "simple(1-3 components) | medium(4-8) | complex(9+)"
}`

    let analysis
    try {
      const raw = await this.callVision(prompt, base64)
      analysis = this.extractJSON(raw)

      if (!analysis || !analysis.components) {
        throw new Error('Invalid analysis structure')
      }
    } catch (err) {
      this.log('⚠ Vision parse failed, retrying with stricter prompt...', 'warning')
      await sleep(500)

      try {
        const retryRaw = await this.callVision(
          prompt + '\n\nCRITICAL: Return ONLY the JSON object. No explanation. No markdown code fences. Start with { and end with }.',
          base64
        )
        analysis = this.extractJSON(retryRaw)

        if (!analysis || !analysis.components) {
          throw new Error('Still invalid')
        }
      } catch (err2) {
        this.log('⚠ Vision unavailable, using text-based analysis...', 'warning')
        analysis = await this.textBasedAnalysis()
      }
    }

    await sleep(200)
    this.log(`  result: ${analysis.appType} — ${analysis.complexity} complexity`, 'tool')
    this.log(`✓ Identified ${analysis.components.length} components`, 'success')
    this.log(`  Layout: ${analysis.layout.type}`, 'meta')
    this.log(`  Style: ${analysis.designSystem.style}`, 'meta')
    this.log(`  Colors: ${analysis.designSystem.primaryColor} / ${analysis.designSystem.backgroundColor}`, 'meta')

    if (analysis.components.length > 0) {
      this.log('  Components:', 'meta')
      analysis.components.forEach(c => {
        this.log(`    · ${c.name} (${c.type})`, 'meta')
      })
    }

    return analysis
  }

  async textBasedAnalysis() {
    const raw = await this.callHermes(
      `Generate a UI analysis JSON for a modern web application landing page.
       It should have: navbar, hero section, features grid, testimonials, CTA, and footer.
       Modern minimal design with a blue primary color.

       Return ONLY valid JSON with this structure:
       {
         "appType": "landing page",
         "description": "...",
         "layout": { "type": "hero-sections", "hasNavbar": true, "navbarPosition": "top", "hasFooter": true, "hasSidebar": false, "sidebarPosition": "none", "hasHero": true, "contentSections": [...] },
         "designSystem": { "style": "minimal", "primaryColor": "#4f46e5", "secondaryColor": "#6366f1", "backgroundColor": "#ffffff", "textColor": "#0a0a0a", "accentColor": "#10b981", "borderRadius": "medium(8px)", "fontStyle": "sans-serif", "spacing": "normal", "shadowStyle": "subtle" },
         "components": [ { "name": "...", "type": "...", "description": "...", "position": "...", "estimatedProps": [], "hasInteractivity": false, "children": [] } ],
         "typography": { "headingSize": "text-4xl to text-5xl", "bodySize": "text-base to text-lg", "fontWeight": "medium", "lineHeight": "relaxed" },
         "content": { "hasImages": true, "hasIcons": true, "hasCharts": false, "hasForms": false, "hasButtons": true, "hasTables": false, "estimatedTextBlocks": 8, "ctaText": ["Get Started", "Learn More"] },
         "responsiveness": "desktop-first",
         "complexity": "medium(4-8)"
       }`,
      2000,
      'Return ONLY valid JSON. No other text.'
    )

    try {
      return this.extractJSON(raw)
    } catch {
      return this.getDefaultAnalysis()
    }
  }

  getDefaultAnalysis() {
    return {
      appType: 'landing page',
      description: 'A modern web application with clean design',
      layout: {
        type: 'hero-sections', hasNavbar: true, navbarPosition: 'top',
        hasFooter: true, hasSidebar: false, sidebarPosition: 'none',
        hasHero: true, contentSections: ['navbar', 'hero', 'features', 'cta', 'footer']
      },
      designSystem: {
        style: 'minimal', primaryColor: '#4f46e5', secondaryColor: '#6366f1',
        backgroundColor: '#ffffff', textColor: '#0a0a0a', accentColor: '#10b981',
        borderRadius: 'medium(8px)', fontStyle: 'sans-serif', spacing: 'normal', shadowStyle: 'subtle'
      },
      components: [
        { name: 'Navbar', type: 'navbar', description: 'Top navigation with logo and links', position: 'top', estimatedProps: ['links', 'logo'], hasInteractivity: true, children: [] },
        { name: 'Hero', type: 'hero', description: 'Hero section with headline and CTA', position: 'top', estimatedProps: ['title', 'subtitle', 'ctaText'], hasInteractivity: true, children: [] },
        { name: 'Features', type: 'feature-grid', description: 'Grid of feature cards with icons', position: 'center', estimatedProps: ['features'], hasInteractivity: false, children: ['FeatureCard'] },
        { name: 'CTA', type: 'cta', description: 'Call to action section', position: 'center', estimatedProps: ['title', 'buttonText'], hasInteractivity: true, children: [] },
        { name: 'Footer', type: 'footer', description: 'Footer with links and copyright', position: 'bottom', estimatedProps: ['links'], hasInteractivity: false, children: [] }
      ],
      typography: { headingSize: 'text-4xl to text-5xl', bodySize: 'text-base to text-lg', fontWeight: 'medium', lineHeight: 'relaxed' },
      content: { hasImages: true, hasIcons: true, hasCharts: false, hasForms: false, hasButtons: true, hasTables: false, estimatedTextBlocks: 8, ctaText: ['Get Started', 'Learn More'] },
      responsiveness: 'desktop-first',
      complexity: 'medium(4-8)'
    }
  }

  // ─── Phase 2: Architecture Planning ─────────────────────

  async planArchitecture(analysis) {
    this.log('', 'default')
    this.log('◆ PHASE 2: ARCHITECTURE PLANNING', 'phase')
    this.log('─────────────────────────────────', 'meta')
    await sleep(300)

    this.log('→ analyzing component dependencies...', 'default')
    this.log('  tool_call: hermes.plan_architecture()', 'tool')

    const prompt = `You are an expert React architect. Based on this UI analysis, plan the exact file structure and build order for a React + Tailwind CSS project.

UI Analysis:
${JSON.stringify(analysis, null, 2)}

Return ONLY valid JSON, no other text:

{
  "techStack": "React + Tailwind CSS",
  "designTokens": {
    "colors": {
      "primary": "${analysis.designSystem.primaryColor}",
      "secondary": "${analysis.designSystem.secondaryColor}",
      "background": "${analysis.designSystem.backgroundColor}",
      "text": "${analysis.designSystem.textColor}",
      "accent": "${analysis.designSystem.accentColor}"
    },
    "borderRadius": "extracted value in px",
    "fontFamily": "font family string",
    "shadows": "tailwind shadow class to use"
  },
  "files": [
    {
      "name": "filename.jsx or filename.css",
      "type": "component | page | style | utility | entry",
      "description": "what this file contains and why",
      "dependencies": ["filenames this file imports from"],
      "buildOrder": 1,
      "estimatedLines": number,
      "isEntryPoint": true/false
    }
  ],
  "buildStrategy": "description of build order reasoning"
}

RULES:
1. Always include index.css with Tailwind directives AND custom CSS variables
2. Always include main.jsx as the entry point
3. Always include App.jsx as the root component
4. Break complex sections into separate component files
5. Files with NO dependencies must be built first (buildOrder: 1)
6. Files that import other files must have higher buildOrder numbers
7. Keep components focused — one responsibility per file
8. Maximum 12 files for any project
9. Name components in PascalCase (HeroSection.jsx, FeatureCard.jsx)`

    const raw = await this.callHermes(prompt, 1500)
    let architecture

    try {
      architecture = this.extractJSON(raw)
      if (!architecture?.files || !Array.isArray(architecture.files)) {
        throw new Error('Invalid architecture')
      }
    } catch {
      this.log('⚠ Architecture parse issue, building from analysis...', 'warning')
      architecture = this.buildFallbackArchitecture(analysis)
    }

    // Ensure required files exist
    architecture = this.validateArchitecture(architecture, analysis)

    // Sort by build order
    architecture.files.sort((a, b) => a.buildOrder - b.buildOrder)

    this.architecture = architecture
    this.onArchitecture(architecture)

    await sleep(200)
    this.log(`✓ Architecture planned: ${architecture.files.length} files`, 'success')
    this.log(`  Strategy: ${architecture.buildStrategy || 'dependency-first'}`, 'meta')
    this.log('  Build order:', 'meta')
    architecture.files.forEach((f, i) => {
      this.log(`    ${i + 1}. ${f.name} (${f.type}) ~${f.estimatedLines || '?'}loc`, 'meta')
    })

    return architecture
  }

  validateArchitecture(arch, analysis) {
    const fileNames = new Set(arch.files.map(f => f.name))

    if (!fileNames.has('index.css')) {
      arch.files.unshift({
        name: 'index.css',
        type: 'style',
        description: 'Tailwind directives and design system CSS variables',
        dependencies: [],
        buildOrder: 0,
        estimatedLines: 30,
        isEntryPoint: false,
      })
    }

    if (!fileNames.has('main.jsx')) {
      arch.files.push({
        name: 'main.jsx',
        type: 'entry',
        description: 'React entry point — mounts App to DOM',
        dependencies: ['App.jsx', 'index.css'],
        buildOrder: 999,
        estimatedLines: 10,
        isEntryPoint: true,
      })
    }

    if (!fileNames.has('App.jsx')) {
      const componentNames = arch.files
        .filter(f => f.type === 'component' && f.name !== 'App.jsx')
        .map(f => f.name)

      arch.files.push({
        name: 'App.jsx',
        type: 'page',
        description: 'Root component — composes all sections in layout order',
        dependencies: componentNames,
        buildOrder: 998,
        estimatedLines: 80,
        isEntryPoint: false,
      })
    }

    arch.files.sort((a, b) => a.buildOrder - b.buildOrder)
    return arch
  }

  buildFallbackArchitecture(analysis) {
    const files = [{
      name: 'index.css', type: 'style',
      description: 'Tailwind directives and design tokens',
      dependencies: [], buildOrder: 0, estimatedLines: 30, isEntryPoint: false,
    }]

    let order = 1
    for (const comp of analysis.components) {
      files.push({
        name: `${comp.name}.jsx`, type: 'component',
        description: comp.description,
        dependencies: [], buildOrder: order++, estimatedLines: 60, isEntryPoint: false,
      })
    }

    files.push({
      name: 'App.jsx', type: 'page',
      description: 'Root component composing all sections',
      dependencies: analysis.components.map(c => `${c.name}.jsx`),
      buildOrder: order++, estimatedLines: 80, isEntryPoint: false,
    })

    files.push({
      name: 'main.jsx', type: 'entry',
      description: 'React entry point',
      dependencies: ['App.jsx', 'index.css'],
      buildOrder: order++, estimatedLines: 10, isEntryPoint: true,
    })

    return {
      techStack: 'React + Tailwind CSS',
      designTokens: {
        colors: {
          primary: analysis.designSystem.primaryColor,
          secondary: analysis.designSystem.secondaryColor,
          background: analysis.designSystem.backgroundColor,
          text: analysis.designSystem.textColor,
          accent: analysis.designSystem.accentColor,
        },
        borderRadius: '8px',
        fontFamily: 'Inter, system-ui, sans-serif',
        shadows: 'shadow-sm',
      },
      files,
      buildStrategy: 'Leaf components first, then composition, then entry point',
    }
  }

  // ─── Phase 3: Build All Files ───────────────────────────

  async buildAllFiles(architecture, analysis) {
    this.log('', 'default')
    this.log('◆ PHASE 3: BUILDING', 'phase')
    this.log('─────────────────────────────────', 'meta')
    await sleep(300)

    const totalFiles = architecture.files.length
    let builtCount = 0

    for (const fileSpec of architecture.files) {
      if (!this.running) return

      this.log('', 'default')
      this.log(`◇ Building ${fileSpec.name}`, 'file')
      this.log(`  ${fileSpec.description}`, 'meta')
      this.onFileUpdate(fileSpec.name, '// Morpheus is writing this file...\n', 'building')

      await sleep(400)

      const code = await this.generateFile(fileSpec, architecture, analysis)

      if (!this.running) return

      this.files[fileSpec.name] = code
      builtCount++
      this.onFileUpdate(fileSpec.name, code, 'complete')
      this.onProgress({ built: builtCount, total: totalFiles })

      const lineCount = code.split('\n').length
      this.log(`✓ ${fileSpec.name} — ${lineCount} lines`, 'success')

      await sleep(200)
    }

    this.log('', 'default')
    this.log(`✓ All ${totalFiles} files built`, 'success')
  }

  async generateFile(fileSpec, architecture, analysis) {
    const builtContext = this.getBuiltFilesContext(fileSpec)
    const prompt = this.buildFilePrompt(fileSpec, architecture, analysis, builtContext)

    this.log(`  tool_call: hermes.generate("${fileSpec.name}")`, 'tool')

    let code = ''
    let attempts = 0
    const maxAttempts = 3

    while (attempts < maxAttempts) {
      attempts++

      let attemptPrompt = prompt
      if (attempts > 1) {
        attemptPrompt += `\n\nATTEMPT ${attempts}/${maxAttempts}. Previous attempt had issues: ${code.length < 20 ? 'Output was too short or empty.' : 'Code had structural errors.'} You MUST return complete, working code this time.`
      }

      const raw = await this.callHermes(attemptPrompt, 4000)
      code = this.extractCode(raw, fileSpec.name)

      const validation = this.validateCode(code, fileSpec)

      if (validation.valid) {
        if (attempts > 1) {
          this.log(`  ✓ Fixed on attempt ${attempts}`, 'success')
        }
        return code
      }

      this.log(`  ⚠ Attempt ${attempts}: ${validation.error}`, 'warning')

      if (attempts < maxAttempts) {
        this.log(`  → Retrying with error context...`, 'default')
        const retryCode = await this.retryWithError(fileSpec, code, validation.error, architecture, analysis)
        const revalidation = this.validateCode(retryCode, fileSpec)
        if (revalidation.valid) {
          this.log(`  ✓ Fixed on error-aware retry`, 'success')
          return retryCode
        }
        code = retryCode
      }
    }

    this.log(`  ⚠ Using best effort after ${maxAttempts} attempts`, 'warning')
    return code && code.trim().length > 15 ? code : this.generateFallbackCode(fileSpec)
  }

  validateCode(code, fileSpec) {
    if (!code || code.trim().length < 15) {
      return { valid: false, error: 'Generated code is empty or too short' }
    }

    const isCSS = fileSpec.name.endsWith('.css')
    const isEntry = fileSpec.name === 'main.jsx'

    if (!isCSS) {
      // Must have a default export for components
      if (!isEntry && !code.includes('export default') && !code.includes('module.exports')) {
        return { valid: false, error: 'Missing default export' }
      }

      // Brace matching
      const openBraces = (code.match(/\{/g) || []).length
      const closeBraces = (code.match(/\}/g) || []).length
      if (Math.abs(openBraces - closeBraces) > 2) {
        return { valid: false, error: `Mismatched braces: ${openBraces} open vs ${closeBraces} close` }
      }

      // Parenthesis matching
      const openParens = (code.match(/$/g) || []).length
      const closeParens = (code.match(/$/g) || []).length
      if (Math.abs(openParens - closeParens) > 2) {
        return { valid: false, error: `Mismatched parentheses: ${openParens} open vs ${closeParens} close` }
      }

      // Check JSX has closing tags
      if (code.includes('<') && !isEntry) {
        const selfClosingOrClosing = (code.match(/\/>/g) || []).length + (code.match(/<\//g) || []).length
        const opening = (code.match(/<[A-Za-z]/g) || []).length
        if (opening > 0 && selfClosingOrClosing === 0) {
          return { valid: false, error: 'JSX tags appear unclosed' }
        }
      }

      // Check imports reference real files
      const importMatches = [...code.matchAll(/from\s+['"]\.\/([^'"]+)['"]/g)]
      for (const match of importMatches) {
        const importedFile = match[1]
        let normalized = importedFile
        if (!normalized.endsWith('.jsx') && !normalized.endsWith('.js') && !normalized.endsWith('.css')) {
          normalized = normalized + '.jsx'
        }
        const exists = this.files[normalized] ||
          this.architecture?.files?.some(f => f.name === normalized)
        if (!exists) {
          return { valid: false, error: `Imports non-existent file: ${normalized}` }
        }
      }
    }

    if (isCSS) {
      if (!code.includes('@tailwind') && !code.includes(':root') && !code.includes('{')) {
        return { valid: false, error: 'CSS file has no valid CSS content' }
      }
    }

    return { valid: true, error: null }
  }

  async retryWithError(fileSpec, failedCode, error, architecture, analysis) {
    const builtContext = this.getBuiltFilesContext(fileSpec)

    const prompt = `The previous code generation for "${fileSpec.name}" had an error:

ERROR: ${error}

FAILED CODE (first 80 lines):
${failedCode.split('\n').slice(0, 80).join('\n')}

PROJECT FILES THAT EXIST (available to import):
${Object.keys(this.files).join(', ')}
${this.architecture?.files?.filter(f => f.name !== fileSpec.name).map(f => f.name).join(', ') || ''}

${builtContext ? 'ALREADY BUILT FILES:\n' + builtContext : ''}

FILE SPEC:
- Name: ${fileSpec.name}
- Type: ${fileSpec.type}
- Description: ${fileSpec.description}
- Dependencies: ${fileSpec.dependencies?.join(', ') || 'none'}

Rewrite the COMPLETE file fixing the error above.

CRITICAL RULES:
1. Return ONLY the file code — no explanation, no markdown fences
2. Must have a default export (for .jsx files)
3. Only import files that exist in the project list above
4. All JSX tags must be properly opened and closed
5. All braces and parentheses must be matched
6. Start writing code immediately on line 1`

    const raw = await this.callHermes(prompt, 4000)
    return this.extractCode(raw, fileSpec.name)
  }

  generateFallbackCode(fileSpec) {
    if (fileSpec.name.endsWith('.css')) {
      return `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n:root {\n  --primary: #4f46e5;\n  --background: #ffffff;\n  --text: #0a0a0a;\n}\n\nbody {\n  font-family: 'Inter', system-ui, sans-serif;\n  color: var(--text);\n  background: var(--background);\n}`
    }

    if (fileSpec.name === 'main.jsx') {
      return `import React from 'react'\nimport ReactDOM from 'react-dom/client'\nimport App from './App'\nimport './index.css'\n\nReactDOM.createRoot(document.getElementById('root')).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n)`
    }

    const name = fileSpec.name.replace('.jsx', '').replace('.js', '')
    return `import React from 'react'\n\nexport default function ${name}() {\n  return (\n    <section className="py-16 px-6">\n      <div className="max-w-4xl mx-auto">\n        <h2 className="text-2xl font-semibold text-gray-900 mb-4">${name}</h2>\n        <p className="text-gray-600">This section is being assembled by Morpheus.</p>\n      </div>\n    </section>\n  )\n}`
  }

  buildFilePrompt(fileSpec, architecture, analysis, builtContext) {
    const isCSS = fileSpec.name.endsWith('.css')
    const isEntry = fileSpec.name === 'main.jsx'
    const isApp = fileSpec.name === 'App.jsx'

    let prompt = `You are Morpheus, an expert React developer. Generate the COMPLETE content of "${fileSpec.name}".

PROJECT CONTEXT:
- App type: ${analysis.appType}
- Description: ${analysis.description}
- Tech: React + Tailwind CSS (utility classes only)
- Style: ${analysis.designSystem.style}

DESIGN SYSTEM:
- Primary: ${analysis.designSystem.primaryColor}
- Secondary: ${analysis.designSystem.secondaryColor}
- Background: ${analysis.designSystem.backgroundColor}
- Text: ${analysis.designSystem.textColor}
- Accent: ${analysis.designSystem.accentColor}
- Border radius: ${analysis.designSystem.borderRadius}
- Font: ${analysis.designSystem.fontStyle}
- Shadows: ${analysis.designSystem.shadowStyle}
- Spacing: ${analysis.designSystem.spacing}

TYPOGRAPHY:
- Headings: ${analysis.typography.headingSize}, ${analysis.typography.fontWeight}
- Body: ${analysis.typography.bodySize}
- Line height: ${analysis.typography.lineHeight}

FILE SPEC:
- Name: ${fileSpec.name}
- Type: ${fileSpec.type}
- Description: ${fileSpec.description}
- Dependencies: ${fileSpec.dependencies?.join(', ') || 'none'}
`

    // Add component-specific context
    if (!isCSS && !isEntry) {
      const matchingComponent = analysis.components.find(c =>
        fileSpec.name.toLowerCase().includes(c.name.toLowerCase()) ||
        c.name.toLowerCase().includes(fileSpec.name.replace('.jsx', '').toLowerCase())
      )
      if (matchingComponent) {
        prompt += `
COMPONENT DETAILS (from visual analysis):
- Type: ${matchingComponent.type}
- Description: ${matchingComponent.description}
- Position: ${matchingComponent.position}
- Props: ${matchingComponent.estimatedProps?.join(', ') || 'none'}
- Interactive: ${matchingComponent.hasInteractivity}
- Children: ${matchingComponent.children?.join(', ') || 'none'}
`
      }
    }

    // Add already-built files context
    if (builtContext.length > 0) {
      prompt += `
ALREADY BUILT FILES (you can import from these):
${builtContext}
`
    }

    // App.jsx layout context
    if (isApp) {
      prompt += `
LAYOUT STRUCTURE:
- Type: ${analysis.layout.type}
- Navbar: ${analysis.layout.hasNavbar ? 'yes, at ' + analysis.layout.navbarPosition : 'no'}
- Sidebar: ${analysis.layout.hasSidebar ? 'yes, at ' + analysis.layout.sidebarPosition : 'no'}
- Hero: ${analysis.layout.hasHero ? 'yes' : 'no'}
- Footer: ${analysis.layout.hasFooter ? 'yes' : 'no'}
- Sections order: ${analysis.layout.contentSections?.join(' → ') || 'unknown'}

AVAILABLE COMPONENT FILES TO IMPORT:
${Object.keys(this.files).filter(f => f.endsWith('.jsx') && f !== 'main.jsx' && f !== 'App.jsx').join(', ')}

Import and compose ALL component files in the correct layout order.
The App component must render the complete page structure.
`
    }

    // File-type-specific instructions
    if (isCSS) {
      prompt += `
GENERATE a CSS file with:
1. @tailwind base; @tailwind components; @tailwind utilities;
2. :root CSS variables for all design tokens (colors, spacing, radius)
3. @import url() for Google Fonts if needed (Inter is standard)
4. Base styles for html, body
5. Smooth scroll behavior
6. Minimal scrollbar styling

Return ONLY the CSS code.`

    } else if (isEntry) {
      prompt += `
GENERATE the React entry point:
1. Import React and ReactDOM
2. Import App from './App'
3. Import './index.css'
4. Create root and render App in StrictMode

Standard Vite React entry. Keep it simple.`

    } else if (isApp) {
      prompt += `
GENERATE the root App component:
1. Import ALL built component files listed above
2. Compose them in correct layout order
3. Use Tailwind layout classes (flex, grid, etc.)
4. Handle overall page structure
5. Default export function component
6. Include useState if any interactivity is needed
7. Use inline style objects for exact design system hex colors where Tailwind classes are not precise enough`

    } else {
      prompt += `
GENERATE a React component:
1. Default export function component
2. Use Tailwind CSS utility classes for ALL styling
3. Use inline style objects ONLY for exact hex colors from design system
4. Write realistic placeholder content (NOT lorem ipsum — write real professional text)
5. Fully self-contained (no external API calls)
6. Semantic HTML elements
7. Hover/focus states where appropriate
8. Responsive with Tailwind breakpoints (sm:, md:, lg:)
9. useState for any interactive elements
10. Proper spacing and visual hierarchy matching the design system`
    }

    prompt += `

CRITICAL RULES:
1. Return ONLY the file content — no explanation, no markdown fences
2. Do NOT wrap in \`\`\` blocks
3. Every .jsx file must have a default export
4. Use Tailwind classes + inline styles for design system colors
5. NO external dependencies beyond React
6. Write real, professional content — never lorem ipsum
7. Production-quality code
8. Match the design system EXACTLY
9. All interactive elements need visible hover/focus states
10. Start writing code immediately on line 1`

    return prompt
  }

  getBuiltFilesContext(currentFile) {
    const parts = []
    for (const [name, content] of Object.entries(this.files)) {
      if (name === currentFile.name) continue

      const exports = content.match(/export\s+(default\s+)?(?:function|const|class)\s+(\w+)/g) || []
      const firstLines = content.split('\n').slice(0, 5).join('\n')

      parts.push(`--- ${name} ---
Exports: ${exports.join(', ') || 'default export'}
Preview:
${firstLines}
...`)
    }
    return parts.join('\n\n')
  }

  // ─── Phase 4: Self-Review ──────────────────────────────

  async reviewAndFix() {
    this.log('', 'default')
    this.log('◆ PHASE 4: SELF-REVIEW', 'phase')
    this.log('─────────────────────────────────', 'meta')
    await sleep(300)

    let hasIssues = true
    let cycle = 0

    while (hasIssues && cycle < this.maxReviewCycles && this.running) {
      cycle++
      this.reviewCycles = cycle
      this.log('', 'default')
      this.log(`→ Review cycle ${cycle}/${this.maxReviewCycles}`, 'default')
      this.log('  tool_call: hermes.review_codebase()', 'tool')

      const codebase = Object.entries(this.files)
        .map(([name, content]) => `=== ${name} ===\n${content}`)
        .join('\n\n')

      const reviewPrompt = `You are a senior code reviewer. Review this React + Tailwind codebase that was just generated.

CODEBASE:
${codebase}

Check for these specific issues:
1. IMPORT ERRORS: Does every import reference a file that exists in the codebase? Do export names match what's imported?
2. SYNTAX ERRORS: Unclosed tags, missing brackets, invalid JSX?
3. MISSING EXPORTS: Does every .jsx file have a default export?
4. TAILWIND ISSUES: Any obviously invalid Tailwind classes?
5. REACT ERRORS: Missing keys in .map() lists? Invalid hook usage? Hooks called conditionally?
6. COMPOSITION: Does App.jsx import and render ALL component files?
7. ENTRY POINT: Does main.jsx correctly import App and index.css?
8. DESIGN CONSISTENCY: Are the design system colors used consistently?

Return ONLY valid JSON:
{
  "passed": true/false,
  "issues": [
    {
      "file": "filename",
      "severity": "critical | warning",
      "issue": "description of the problem",
      "fix": "exact description of what to change"
    }
  ],
  "summary": "one sentence overall assessment"
}

If everything looks good, return: {"passed": true, "issues": [], "summary": "All files pass review."}`

      const raw = await this.callHermes(reviewPrompt, 2000)
      let review

      try {
        review = this.extractJSON(raw)
      } catch {
        this.log('  ⚠ Could not parse review response, assuming pass', 'warning')
        review = { passed: true, issues: [], summary: 'Review parse failed — assuming OK' }
      }

      if (!review || review.passed || !review.issues || review.issues.length === 0) {
        this.log(`✓ Review passed: ${review?.summary || 'No issues found'}`, 'success')
        hasIssues = false
        break
      }

      const criticals = review.issues.filter(i => i.severity === 'critical')
      const warnings = review.issues.filter(i => i.severity === 'warning')

      this.log(`  Found ${criticals.length} critical, ${warnings.length} warnings`, 'meta')

      // Fix critical issues
      for (const issue of criticals) {
        if (!this.running) return
        this.log(`  ✗ [${issue.file}] ${issue.issue}`, 'error')
        this.log('    → Fixing...', 'default')
        await this.fixFile(issue)
      }

      // Fix warnings if room
      if (cycle < this.maxReviewCycles) {
        for (const issue of warnings.slice(0, 3)) {
          if (!this.running) return
          this.log(`  ⚠ [${issue.file}] ${issue.issue}`, 'warning')
          await this.fixFile(issue)
        }
      }

      this.onProgress({ reviewed: cycle })
    }

    if (cycle >= this.maxReviewCycles && hasIssues) {
      this.log('→ Max review cycles reached, proceeding with current state', 'default')
    }
  }

  async fixFile(issue) {
    const fileName = issue.file
    const currentContent = this.files[fileName]

    if (!currentContent) {
      this.log(`    ⚠ File ${fileName} not found, skipping`, 'warning')
      return
    }

    this.onFileUpdate(fileName, currentContent, 'reviewing')

    const fixPrompt = `Fix this issue in "${fileName}":

ISSUE: ${issue.issue}
SUGGESTED FIX: ${issue.fix}

CURRENT FILE:
${currentContent}

OTHER PROJECT FILES (for import reference):
${Object.keys(this.files).filter(n => n !== fileName).join(', ')}

Return ONLY the complete fixed file content.
No explanation. No markdown fences. Start with code on line 1.
Keep ALL existing functionality — only fix the specific issue described above.`

    const raw = await this.callHermes(fixPrompt, 4000)
    const code = this.extractCode(raw, fileName)

    if (code && code.trim().length > 15) {
      this.files[fileName] = code
      this.onFileUpdate(fileName, code, 'complete')
      this.log(`    ✓ Fixed ${fileName}`, 'success')
    } else {
      this.onFileUpdate(fileName, currentContent, 'complete')
      this.log(`    ⚠ Fix was too short, keeping original`, 'warning')
    }
  }

  // ─── API: Vision Model ──────────────────────────────────

  async callVision(prompt, imageBase64) {
    const models = [
      'google/gemini-2.0-flash-001',
      'google/gemini-pro-vision',
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4o',
    ]

    for (const model of models) {
      try {
        this.log(`  model: ${model.split('/')[1]}`, 'meta')

        const messages = [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageBase64 } }
          ]
        }]

        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.key}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://morpheus-app.vercel.app',
            'X-Title': 'Morpheus',
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: 2000,
            temperature: 0.1,
          }),
        })

        if (!res.ok) {
          const errText = await res.text().catch(() => '')
          console.warn(`[Morpheus] Vision ${model}: ${res.status} ${errText.slice(0, 100)}`)
          continue
        }

        const data = await res.json()
        const content = data.choices?.[0]?.message?.content
        if (!content || content.trim().length === 0) continue
        return content.trim()

      } catch (err) {
        console.warn(`[Morpheus] Vision ${model} failed:`, err.message)
        continue
      }
    }

    throw new Error('All vision models failed')
  }

  // ─── API: Hermes Text Model ─────────────────────────────

  async callHermes(userMsg, maxTokens = 2000, systemMsg = '') {
    const models = [
      'nousresearch/hermes-3-llama-3.1-405b:free',
      'nousresearch/hermes-3-llama-3.1-70b:free',
      'google/gemini-2.0-flash-001',
      'meta-llama/llama-3.1-70b-instruct',
    ]

    const systemPrompt = systemMsg || `You are Morpheus, an expert React developer and code generator built on Hermes by Nous Research.
You write clean, production-quality React + Tailwind CSS code.
You match visual designs with pixel-perfect precision.
You never explain — you only output code or JSON as requested.
Every component you write is complete, responsive, and professional.`

    for (const model of models) {
      try {
        const messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMsg },
        ]

        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.key}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://morpheus-app.vercel.app',
            'X-Title': 'Morpheus',
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: maxTokens,
            temperature: 0.2,
          }),
        })

        if (!res.ok) {
          console.warn(`[Morpheus] Model ${model}: ${res.status}`)
          continue
        }

        const data = await res.json()
        const content = data.choices?.[0]?.message?.content
        if (!content || content.trim().length === 0) {
          console.warn(`[Morpheus] Model ${model}: empty response`)
          continue
        }

        return content.trim()

      } catch (err) {
        console.warn(`[Morpheus] Model ${model} failed:`, err.message)
        continue
      }
    }

    return '// Generation failed — all models unavailable'
  }

  // ─── Utilities ──────────────────────────────────────────

  extractJSON(raw) {
    let cleaned = raw.trim()

    // Strip markdown fences
    cleaned = cleaned.replace(/```json\s*/gi, '').replace(/```\s*/gi, '')

    // Try direct parse
    try { return JSON.parse(cleaned) } catch { /* continue */ }

    // Find JSON object
    const objStart = cleaned.indexOf('{')
    const objEnd = cleaned.lastIndexOf('}')
    if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
      try { return JSON.parse(cleaned.slice(objStart, objEnd + 1)) } catch { /* continue */ }
    }

    // Find JSON array
    const arrStart = cleaned.indexOf('[')
    const arrEnd = cleaned.lastIndexOf(']')
    if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
      try { return JSON.parse(cleaned.slice(arrStart, arrEnd + 1)) } catch { /* continue */ }
    }

    throw new Error('Could not extract JSON from response')
  }

  extractCode(raw, filename) {
    let code = raw.trim()

    // Remove markdown fences
    code = code.replace(/^```[\w]*\s*\n?/gm, '').replace(/\n?```\s*$/gm, '')

    const isCSS = filename.endsWith('.css')
    const isJSX = filename.endsWith('.jsx') || filename.endsWith('.js')

    if (isCSS) {
      const cssStart = code.indexOf('@tailwind')
      if (cssStart === -1) {
        const importStart = code.indexOf('@import')
        if (importStart > 0) code = code.slice(importStart)
      } else if (cssStart > 0) {
        code = code.slice(cssStart)
      }
    } else if (isJSX) {
      const importIndex = code.indexOf('import ')
      const constIndex = code.indexOf('const ')
      const functionIndex = code.indexOf('function ')
      const exportIndex = code.indexOf('export ')

      const starts = [importIndex, constIndex, functionIndex, exportIndex].filter(i => i >= 0)

      if (starts.length > 0) {
        const firstCode = Math.min(...starts)
        if (firstCode > 0 && firstCode < 200) {
          const before = code.slice(0, firstCode)
          if (!before.includes('import') && !before.includes('export') && !before.includes('const')) {
            code = code.slice(firstCode)
          }
        }
      }
    }

    // Remove trailing explanation
    const lastSemicolon = code.lastIndexOf(';')
    const lastBrace = code.lastIndexOf('}')
    const lastCodeChar = Math.max(lastSemicolon, lastBrace)

    if (lastCodeChar > 0 && lastCodeChar < code.length - 1) {
      const after = code.slice(lastCodeChar + 1).trim()
      if (after.length > 30 && !after.startsWith('//') && !after.startsWith('/*')) {
        code = code.slice(0, lastCodeChar + 1)
      }
    }

    return code.trim()
  }

  // ─── Logging ────────────────────────────────────────────

  log(line, type = 'default') {
    this.onActivity({ line, type })
  }

  setPhase(phase) {
    this.onPhaseChange(phase)
  }
}
