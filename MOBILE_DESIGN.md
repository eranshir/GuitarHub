# GuitarHub Mobile Design

## Current Issues on Mobile

1. **Fretboard too small** - Hard to tap individual frets
2. **Navigation buttons overflow** - Too many tabs for narrow screens
3. **Side panels take too much space** - Settings/chat squeeze the fretboard
4. **Portrait mode unusable** - Fretboard can't display properly vertically
5. **Text too small** - Labels, buttons hard to read/tap

## Design Strategy

### Portrait Mode
Show a full-screen overlay asking user to rotate device:
```
┌─────────────────┐
│                 │
│    🔄          │
│                 │
│  Please rotate  │
│   your device   │
│   to landscape  │
│   for the best  │
│   experience    │
│                 │
│                 │
└─────────────────┘
```

### Landscape Mode - Mobile Layout

```
┌─────────────────────────────────────────────────────┐
│ [☰] GuitarHub         Fretboard Memory    [⚙️] [💬] │  ← Compact header
├─────────────────────────────────────────────────────┤
│                                                     │
│              FRETBOARD (Full Width)                 │
│              Optimized for touch                    │
│                                                     │
├─────────────────────────────────────────────────────┤
│  [▶ Start]  [🔊 Play]  BPM: 80                     │  ← Controls below
└─────────────────────────────────────────────────────┘

[☰] Menu sidebar (slides from left):
  - Fretboard Memory
  - Intervals Memory
  - Chords Memory
  - Spot a Note
  - Assistant
  - Statistics

[⚙️] Settings panel (slides from right):
  - Game-specific settings
  - Toggles, ranges, etc.

[💬] Chat panel (slides from right, for Assistant mode):
  - Full-height chat interface
  - Overlays settings when open
```

## Key Design Principles

1. **Fretboard is King** - Always full-width and large enough to tap
2. **Single Panel at a Time** - Only show menu OR settings OR chat, never multiple
3. **Slide-out Panels** - Use off-canvas panels that overlay the fretboard
4. **Touch-Friendly** - Minimum 44px tap targets
5. **Bottom Controls** - Primary actions at thumb-reach
6. **Hamburger Menu** - Replace top navigation with ☰ menu

## Implementation Plan

### Phase 1: Orientation Detection
- Detect portrait vs landscape
- Show rotation overlay in portrait
- Allow user to dismiss (some might prefer it anyway)

### Phase 2: Mobile Navigation
- Add hamburger menu button (top-left)
- Slide-out navigation drawer
- Hide top nav bar on mobile

### Phase 3: Collapsible Panels
- Settings icon (⚙️) opens right-side panel
- Chat icon (💬) opens right-side panel (Assistant mode only)
- Backdrop overlay to close panels

### Phase 4: Touch Optimization
- Larger fretboard markers (50px instead of 40px)
- Bigger buttons (min 44px height)
- More spacing between interactive elements

### Phase 5: Responsive Breakpoints
- Desktop: > 968px (current layout)
- Tablet: 768px - 968px (compact layout)
- Mobile: < 768px (full mobile redesign)

## CSS Media Queries Structure

```css
/* Desktop (default) */
@media (min-width: 969px) {
  /* Current layout unchanged */
}

/* Tablet */
@media (min-width: 768px) and (max-width: 968px) {
  /* Compact layout - smaller side panels */
}

/* Mobile Landscape */
@media (max-width: 767px) and (orientation: landscape) {
  /* Full mobile redesign */
  /* Hamburger menu */
  /* Slide-out panels */
  /* Larger touch targets */
}

/* Mobile Portrait */
@media (max-width: 767px) and (orientation: portrait) {
  /* Show rotation overlay */
}
```

## Components to Build

### 1. Portrait Warning Overlay
```html
<div id="portrait-warning" class="portrait-warning">
  <div class="warning-content">
    <div class="rotate-icon">🔄</div>
    <h2>Please Rotate Your Device</h2>
    <p>GuitarHub works best in landscape mode</p>
    <button class="dismiss-btn">Continue Anyway</button>
  </div>
</div>
```

### 2. Mobile Navigation Drawer
```html
<div id="mobile-nav-overlay" class="mobile-nav-overlay">
  <div class="mobile-nav-drawer">
    <div class="drawer-header">
      <h2>GuitarHub</h2>
      <button class="close-drawer">✕</button>
    </div>
    <nav class="drawer-nav">
      <button data-module="fretboard">Fretboard Memory</button>
      <button data-module="intervals">Intervals Memory</button>
      <button data-module="chords">Chords Memory</button>
      <button data-module="spot-note">Spot a Note</button>
      <button data-module="assistant">Assistant</button>
      <button data-module="stats">Statistics</button>
    </nav>
  </div>
</div>
```

### 3. Mobile Header
```html
<div class="mobile-header">
  <button id="menu-toggle" class="icon-btn">☰</button>
  <h1>GuitarHub</h1>
  <div class="mobile-actions">
    <button id="settings-toggle" class="icon-btn">⚙️</button>
    <button id="chat-toggle" class="icon-btn" style="display: none;">💬</button>
  </div>
</div>
```

### 4. Slide-out Settings Panel
```html
<div id="mobile-settings-panel" class="mobile-panel">
  <div class="panel-header">
    <h3>Settings</h3>
    <button class="close-panel">✕</button>
  </div>
  <div class="panel-content">
    <!-- Settings content moves here on mobile -->
  </div>
</div>
```

## Technical Approach

### JavaScript Changes
1. Add `MobileManager` class to handle:
   - Orientation detection
   - Panel state management
   - Touch event optimization
   - Drawer toggling

2. Modify existing games to:
   - Move settings into mobile panel on small screens
   - Adapt control layouts
   - Handle panel open/close events

### CSS Changes
1. New mobile-specific classes
2. Media queries for all breakpoints
3. Touch-optimized sizing
4. Slide animations for panels
5. Backdrop overlay styles

## Priority Order
1. ✅ Portrait warning (quick win, prevents frustration)
2. ✅ Hamburger menu navigation (most important UX fix)
3. ✅ Slide-out settings panel (enables full-width fretboard)
4. ✅ Touch-optimized controls (better usability)
5. ⏰ Chat slide-out for Assistant (nice-to-have)
6. ⏰ Fine-tuning and polish

Would you like me to proceed with implementation?
