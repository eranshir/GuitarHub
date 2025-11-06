# Product Requirement Document: Composer Feature for GuitarHub

## 1. Overview

### Problem Statement
Guitar students and composers currently lack an integrated tool within GuitarHub to create, edit, and refine guitar tablature with intelligent assistance. They need a way to compose music directly on a virtual fretboard, see it rendered as TAB, and receive AI-powered suggestions for improvements, harmonies, and bass lines.

### Objectives
- Transform the existing Assistant module into a comprehensive "Composer" tool
- Enable intuitive TAB creation through fretboard interaction
- Provide intelligent composition assistance via GPT-4 integration
- Support both desktop and mobile composition workflows
- Maintain compatibility with existing GuitarHub architecture

### Success Metrics
- User can create a 32-bar composition in under 10 minutes
- 90% of chord shapes are correctly auto-detected
- GPT suggestions have >70% acceptance rate when requested
- Playback synchronization accurate within 50ms of metronome
- Mobile users can compose without desktop (responsive design works)
- Zero data loss for compositions saved to localStorage

## 2. Requirements

### 2.1 Functional Requirements

1. **TAB Entry System**
   - FR1.1: Click fretboard to select notes/chords
   - FR1.2: Support duration selection (whole, half, quarter, eighth, sixteenth, triplets)
   - FR1.3: Submit note/chord with Enter key or "Add Note" button
   - FR1.4: Display TAB in real-time below fretboard
   - FR1.5: Support multiple time signatures (4/4, 3/4, 6/8, 12/8, 5/4, 7/8)
   - FR1.6: Show measure numbers and bar lines

2. **Chord Detection**
   - FR2.1: Auto-detect chord name from fretboard shape
   - FR2.2: Display detected chord above fretboard
   - FR2.3: Provide "Add Chord" button to insert chord name into TAB
   - FR2.4: Support complex chords (7th, 9th, sus, dim, aug)
   - FR2.5: Show alternative chord names when applicable

3. **Edit Mode**
   - FR3.1: Click any note in TAB to edit
   - FR3.2: Delete notes/measures
   - FR3.3: Insert measures at any position
   - FR3.4: Copy/paste sections
   - FR3.5: Undo/redo with 50-step history
   - FR3.6: Drag to select regions for bulk operations

4. **GPT Integration**
   - FR4.1: Analyze full composition context
   - FR4.2: Accept selected region focus
   - FR4.3: Generate bass lines for progressions
   - FR4.4: Add harmonies (3rds, 6ths, octaves)
   - FR4.5: Suggest improvements to selected sections
   - FR4.6: Generate complete sections from text descriptions
   - FR4.7: Explain music theory behind suggestions
   - FR4.8: Show GPT suggestions as preview before applying

5. **Playback System**
   - FR5.1: Play composition with AudioEngine
   - FR5.2: Synchronize with metronome
   - FR5.3: Highlight current position on fretboard
   - FR5.4: Highlight current position in TAB
   - FR5.5: Support tempo adjustment (40-240 BPM)
   - FR5.6: Loop selected regions
   - FR5.7: Count-in before playback starts

6. **Storage & Export**
   - FR6.1: Auto-save to localStorage every 30 seconds
   - FR6.2: Manual save with Ctrl+S
   - FR6.3: Load saved compositions
   - FR6.4: Export as plain text TAB
   - FR6.5: Support multiple saved compositions
   - FR6.6: Name and rename compositions

7. **Keyboard Shortcuts**
   - FR7.1: Number keys for duration selection
   - FR7.2: Note entry shortcuts (see design decision)
   - FR7.3: Space for play/pause
   - FR7.4: Ctrl+Z/Y for undo/redo
   - FR7.5: Delete/Backspace for removing notes
   - FR7.6: Arrow keys for navigation

### 2.2 Non-Functional Requirements

1. **Performance**
   - NFR1.1: TAB rendering < 100ms for 100-bar composition
   - NFR1.2: Chord detection < 50ms
   - NFR1.3: GPT response < 5 seconds for typical request
   - NFR1.4: Playback latency < 20ms
   - NFR1.5: Support compositions up to 500 bars

2. **Usability**
   - NFR2.1: Mobile-responsive design
   - NFR2.2: Touch-friendly controls (minimum 44x44px tap targets)
   - NFR2.3: Clear visual feedback for all interactions
   - NFR2.4: Intuitive for users familiar with TAB notation
   - NFR2.5: Accessible keyboard navigation

3. **Compatibility**
   - NFR3.1: Chrome, Firefox, Safari, Edge (latest 2 versions)
   - NFR3.2: iOS Safari 14+, Chrome Android
   - NFR3.3: Screen sizes from 320px to 4K
   - NFR3.4: Works offline (except GPT features)

4. **Reliability**
   - NFR4.1: No data loss on browser crash (localStorage persistence)
   - NFR4.2: Graceful degradation when GPT unavailable
   - NFR4.3: Handle network interruptions during GPT calls

## 3. User Stories

1. **As a guitar student**, I want to compose a fingerpicking pattern so that I can practice my own creations
2. **As a songwriter**, I want to quickly capture musical ideas so that I don't lose inspiration
3. **As a guitar teacher**, I want to create exercises for students so that I can customize lessons
4. **As a beginner**, I want chord names detected automatically so that I learn while composing
5. **As an intermediate player**, I want GPT to suggest bass lines so that I can enhance my arrangements
6. **As a mobile user**, I want to compose on my phone so that I can work anywhere
7. **As a composer**, I want to export my TAB so that I can share it with others

## 4. Technical Constraints

### Dependencies
- Existing AudioEngine class for playback
- Flask backend with OpenAI API integration
- Current fretboard rendering system
- localStorage API (5MB limit per domain)

### Infrastructure Requirements
- No additional server infrastructure needed for Phase 1-2
- OpenAI API key and rate limits for GPT features
- CDN for any new assets (icons, sounds)

### Compatibility Requirements
- Must extend existing `assistantGame.js` without breaking current functionality
- Maintain current URL structure and navigation
- Preserve existing Assistant module features
- Use vanilla JavaScript (no frameworks)

## 5. Risks and Mitigation

1. **Risk**: Complex TAB rendering performance on mobile
   - **Mitigation**: Implement virtual scrolling for long compositions, render only visible measures

2. **Risk**: GPT API rate limits or downtime
   - **Mitigation**: Queue requests, cache common patterns, provide offline fallback options

3. **Risk**: localStorage 5MB limit for large compositions
   - **Mitigation**: Compress TAB data, warn users at 80% capacity, plan server storage for Phase 5

4. **Risk**: Chord detection accuracy for complex voicings
   - **Mitigation**: Allow manual chord name override, continuously improve detection algorithm

5. **Risk**: Mobile keyboard interfering with composition
   - **Mitigation**: Custom numeric pad overlay, gesture-based input options

## 6. Out of Scope

The following features are explicitly NOT included in this phase:

- Standard music notation (only TAB)
- MIDI import/export
- Multi-track composition
- Server-side storage
- Collaborative editing
- PDF export
- Guitar Pro format support
- Audio recording
- Custom tunings (standard tuning only)
- Percussion notation

---

# Design Decisions: Composer Feature

## Decision 1: Keyboard Shortcut Mapping for Note Entry

### Options Considered

**Option A: QWERTY Row → Fret Numbers**
```
Q W E R T Y U I O P → Frets 0-9
A S D F G H → Strings 6-1
```
- **Pros**:
  - Logical spatial mapping (top = higher frets)
  - Can access 10 frets without shifting
  - Separate hands for string/fret selection
- **Cons**:
  - Requires two hands for single note
  - Not intuitive for non-QWERTY layouts
  - Conflicts with some browser shortcuts
- **Effort**: 1 week

**Option B: Piano-Style Layout**
```
A S D F G H J → Natural notes (A B C D E F G)
W E T Y U → Sharp/flat modifiers
```
- **Pros**:
  - Familiar to musicians with piano knowledge
  - Single key per note
  - Works across different tunings
- **Cons**:
  - Doesn't map to fretboard visualization
  - Requires musical knowledge
  - Multiple fret positions for same note
- **Effort**: 2 weeks (requires note-to-fret conversion)

**Option C: NumPad for Frets + Arrow Keys for Strings**
```
NumPad 0-9 → Frets
Up/Down arrows → Navigate strings
Enter → Submit note
```
- **Pros**:
  - Very simple mental model
  - Preserves QWERTY for other shortcuts
  - Natural for numeric entry
- **Cons**:
  - Slower for rapid entry
  - Requires NumPad (not on laptops)
  - Sequential rather than direct access
- **Effort**: 1 week

**Option D: Hybrid Smart Mode**
```
Number keys 0-9 → Frets (when fretboard focused)
Click string first, then number for fret
Or: Type fret number while hovering over string
```
- **Pros**:
  - Intuitive - click where you want
  - Single hand operation possible
  - Works on all keyboards
  - Natural progressive disclosure
- **Cons**:
  - Requires mouse/touch interaction
  - Slightly slower than pure keyboard
- **Effort**: 1.5 weeks

### Recommendation
**Option D: Hybrid Smart Mode**

### Rationale
Given that GuitarHub users are primarily guitar learners (not necessarily keyboard experts), Option D provides the best balance of intuitiveness and efficiency. Users already interact with the fretboard visually, so combining click-to-select-string with number keys for frets feels natural. This approach also works seamlessly on mobile (tap string, tap number pad) and doesn't require memorizing abstract mappings. The progressive disclosure (click first, then type) matches how guitarists think about the instrument.

### Rejected Alternatives
- Option A rejected: Too complex for casual users, requires two-handed coordination
- Option B rejected: Assumes music theory knowledge that beginners may lack
- Option C rejected: Too slow for serious composition work, laptop users disadvantaged

## Decision 2: TAB Data Structure

### Options Considered

**Option A: Array of Time-Indexed Events**
```javascript
{
  measures: [
    {
      timeSignature: "4/4",
      events: [
        { time: 0, string: 6, fret: 3, duration: 0.25 },
        { time: 0, string: 4, fret: 2, duration: 0.25 },
        { time: 0.25, string: 5, fret: 3, duration: 0.25 }
      ]
    }
  ]
}
```
- **Pros**:
  - Precise timing control
  - Easy to implement playback
  - Natural for complex rhythms
  - Efficient storage
- **Cons**:
  - Complex to edit visually
  - Harder to detect chords
  - Not intuitive for TAB display
- **Effort**: 2 weeks

**Option B: Grid-Based Structure**
```javascript
{
  measures: [
    {
      beats: [
        { // Beat 1
          notes: [
            { string: 6, fret: 3 },
            { string: 4, fret: 2 }
          ],
          duration: 0.25
        }
      ]
    }
  ]
}
```
- **Pros**:
  - Maps directly to visual TAB
  - Easy chord detection
  - Simple editing model
  - Natural for beginners
- **Cons**:
  - Less flexible for complex timing
  - Triplets need special handling
  - May waste space for sparse music
- **Effort**: 1.5 weeks

**Option C: Hybrid Event + Grid**
```javascript
{
  measures: [
    {
      grid: [ /* visual representation */ ],
      events: [ /* playback data */ ],
      chords: [ /* detected chords */ ]
    }
  ]
}
```
- **Pros**:
  - Best of both worlds
  - Optimized for display and playback
  - Can cache detected chords
- **Cons**:
  - Data duplication
  - Synchronization complexity
  - Larger storage footprint
- **Effort**: 3 weeks

### Recommendation
**Option A: Array of Time-Indexed Events**

### Rationale
The event-based structure provides maximum flexibility for both simple and complex compositions. It naturally handles polyphonic fingerpicking patterns, maps efficiently to the AudioEngine's scheduling needs, and can be easily converted to visual TAB for display. While slightly more complex to implement initially, it avoids technical debt from trying to force complex rhythms into a grid structure. The time-indexed approach also makes it trivial to implement features like tempo changes, fermatas, and rubato in future versions.

### Rejected Alternatives
- Option B rejected: Too limiting for advanced fingerpicking patterns and polyrhythms
- Option C rejected: Unnecessary complexity and synchronization overhead

## Decision 3: GPT Integration Architecture

### Options Considered

**Option A: Full Composition Context Every Request**
```python
def analyze_composition(full_tab, selected_region, user_prompt):
    context = format_full_tab(full_tab)
    if selected_region:
        context += f"\nFocus on: {selected_region}"
    return gpt_complete(context + user_prompt)
```
- **Pros**:
  - GPT always has full context
  - Can make holistic suggestions
  - Simple implementation
- **Cons**:
  - High token usage (cost)
  - Slower responses
  - May hit token limits
- **Effort**: 1 week

**Option B: Smart Context Windowing**
```python
def analyze_composition(full_tab, selected_region, user_prompt):
    if selected_region:
        context = extract_region_with_padding(full_tab, selected_region, padding=4)
    else:
        context = summarize_composition(full_tab) + extract_recent_measures(full_tab, 8)
    return gpt_complete(context + user_prompt)
```
- **Pros**:
  - Efficient token usage
  - Faster responses
  - Scales to long compositions
- **Cons**:
  - May miss important context
  - Complex logic for context selection
  - Different behavior for different selections
- **Effort**: 2 weeks

**Option C: Two-Stage Analysis**
```python
def analyze_composition(full_tab, selected_region, user_prompt):
    # Stage 1: Analyze structure
    structure = gpt_analyze_structure(summarize(full_tab))
    # Stage 2: Generate suggestion
    context = prepare_context(full_tab, selected_region, structure)
    return gpt_suggest(context, user_prompt, structure)
```
- **Pros**:
  - Intelligent context awareness
  - Can identify patterns and themes
  - Better suggestions quality
- **Cons**:
  - Two API calls (double latency)
  - More complex error handling
  - Higher cost
- **Effort**: 3 weeks

### Recommendation
**Option B: Smart Context Windowing**

### Rationale
Given the token limits and cost considerations of GPT-4, smart context windowing provides the best balance of performance and capability. For most composition tasks (adding bass lines, harmonies, etc.), the local context plus a summary is sufficient. This approach keeps responses fast (<5 seconds) and costs manageable while still providing enough context for intelligent suggestions. The padding around selected regions ensures GPT understands the harmonic context. We can always fall back to full context for specific requests that need it.

### Rejected Alternatives
- Option A rejected: Token costs would be prohibitive for long compositions
- Option C rejected: Latency of two API calls would hurt user experience

## Decision 4: Mobile Interface Layout

### Options Considered

**Option A: Collapsible Panels**
```
Landscape: [Fretboard | TAB] <-> [GPT Chat]
Portrait: [Fretboard] -> [TAB] -> [GPT Chat] (swipe between)
```
- **Pros**:
  - Maximum space utilization
  - Familiar mobile pattern
  - Clean separation of concerns
- **Cons**:
  - Context switching overhead
  - Can't see TAB while chatting (portrait)
- **Effort**: 2 weeks

**Option B: Floating GPT Overlay**
```
[Fretboard + TAB full screen]
[Floating GPT button -> Modal overlay]
```
- **Pros**:
  - Maximum composition space
  - GPT on-demand only
  - Works identically portrait/landscape
- **Cons**:
  - Covers composition when active
  - Not ideal for iterative GPT work
- **Effort**: 1.5 weeks

**Option C: Responsive Stacking**
```
Portrait: Vertical stack (all visible, scrollable)
Landscape: Hide GPT by default, toggle button to show as sidebar
```
- **Pros**:
  - Everything accessible
  - Natural responsive behavior
  - No modals or overlays
- **Cons**:
  - Limited space in portrait
  - Scrolling required
- **Effort**: 1 week

### Recommendation
**Option C: Responsive Stacking with Smart Defaults**

### Rationale
Mobile users primarily need the fretboard and TAB visible for composition. The responsive stacking approach with GPT hidden by default in landscape provides maximum composition space while keeping GPT easily accessible via toggle. In portrait, the vertical stack allows users to see everything with natural scrolling. This approach requires minimal JavaScript changes and leverages standard responsive CSS, making it maintainable and predictable across devices.

### Rejected Alternatives
- Option A rejected: Complex state management and poor UX for viewing TAB while using GPT
- Option B rejected: Modals on mobile are generally poor UX, especially for iterative workflows

---

# Project Plan: Composer Feature Implementation

## Timeline Overview
- **Total Estimated Duration**: 12 weeks
- **Target Completion**: Week of February 2, 2025
- **Team Requirements**: 1-2 frontend developers, 1 backend developer (part-time for GPT integration)

## Phase 1: Core TAB Entry and Display (Weeks 1-3)

### Tasks

1. **Extend Assistant Module UI** - 3 days - Frontend Dev
   - Acceptance criteria: Assistant module renamed to "Composer", new UI elements added
   - Dependencies: None
   - Modify `assistantGame.js` to add composition mode
   - Add duration selector buttons/dropdown
   - Add TAB display area below fretboard
   - Implement measure/bar line rendering

2. **Implement Note Entry System** - 4 days - Frontend Dev
   - Acceptance criteria: Can click fretboard and add notes to TAB with durations
   - Dependencies: Task 1
   - Capture fretboard clicks for note selection
   - Handle duration selection (1/1, 1/2, 1/4, 1/8, 1/16)
   - Implement "Add Note" submission with Enter key
   - Clear fretboard after submission

3. **Create TAB Data Structure** - 2 days - Frontend Dev
   - Acceptance criteria: TAB data correctly stores and retrieves note events
   - Dependencies: None
   - Implement event-based data structure
   - Add measure management
   - Support multiple time signatures
   - Create serialization for localStorage

4. **Build TAB Renderer** - 4 days - Frontend Dev
   - Acceptance criteria: TAB displays correctly with proper spacing and timing
   - Dependencies: Task 3
   - Render TAB lines and measures
   - Position notes based on timing
   - Add measure numbers
   - Handle line wrapping for long compositions

5. **Implement LocalStorage Persistence** - 2 days - Frontend Dev
   - Acceptance criteria: Compositions auto-save and can be reloaded after refresh
   - Dependencies: Tasks 3, 4
   - Auto-save every 30 seconds
   - Manual save with Ctrl+S
   - Load on page refresh
   - Handle storage quota errors

### Deliverables
- Functional TAB entry system
- Visual TAB display
- Basic persistence
- Updated Assistant module (renamed to Composer)

### Risks
- **Risk**: TAB rendering performance on long compositions
  - **Mitigation**: Implement virtual scrolling if >20 measures

## Phase 2: Edit Mode and Chord Detection (Weeks 4-6)

### Tasks

1. **Implement Chord Detection Algorithm** - 3 days - Frontend Dev
   - Acceptance criteria: Correctly identifies 90% of common chord shapes
   - Dependencies: Phase 1 complete
   - Create chord shape database
   - Implement pattern matching
   - Handle partial chords and inversions
   - Display detected chord above fretboard

2. **Add Chord Annotation System** - 2 days - Frontend Dev
   - Acceptance criteria: User can add chord names to specific positions in TAB
   - Dependencies: Task 1
   - Add "Add Chord" button
   - Store chord annotations in data structure
   - Render chord names above TAB
   - Allow manual chord name override

3. **Build Edit Mode** - 5 days - Frontend Dev
   - Acceptance criteria: Can select, edit, and delete notes in TAB
   - Dependencies: Phase 1 complete
   - Click-to-select notes in TAB
   - Delete selected notes
   - Edit note properties (fret, duration)
   - Implement selection rectangle for regions

4. **Implement Undo/Redo System** - 2 days - Frontend Dev
   - Acceptance criteria: 50-step undo/redo history works correctly
   - Dependencies: Phase 1 complete
   - Create command pattern for all edits
   - Manage history stack
   - Add keyboard shortcuts (Ctrl+Z/Y)
   - Update UI buttons

5. **Add Copy/Paste Functionality** - 2 days - Frontend Dev
   - Acceptance criteria: Can copy and paste TAB sections
   - Dependencies: Task 3
   - Copy selected region to clipboard
   - Paste at cursor position
   - Handle measure boundaries
   - Support keyboard shortcuts

### Deliverables
- Intelligent chord detection
- Full editing capabilities
- Undo/redo system
- Copy/paste functionality

### Risks
- **Risk**: Chord detection accuracy for jazz chords
  - **Mitigation**: Allow manual override, continuously expand chord database

## Phase 3: GPT Integration for Composition (Weeks 7-9)

### Tasks

1. **Create Backend GPT Endpoint** - 3 days - Backend Dev
   - Acceptance criteria: Endpoint accepts TAB data and returns suggestions
   - Dependencies: None
   - Create Flask endpoint `/api/composer/suggest`
   - Implement smart context windowing
   - Add prompt templates for different requests
   - Handle rate limiting and errors

2. **Implement Frontend GPT Integration** - 3 days - Frontend Dev
   - Acceptance criteria: Can send composition to GPT and display response
   - Dependencies: Task 1
   - Add GPT request handlers
   - Show loading states
   - Display suggestions in chat panel
   - Handle network errors gracefully

3. **Build Region Selection System** - 2 days - Frontend Dev
   - Acceptance criteria: Can select TAB regions for focused GPT analysis
   - Dependencies: Phase 2 Task 3
   - Implement click-and-drag selection
   - Highlight selected region
   - Pass selection context to GPT
   - Show selection in request

4. **Create Suggestion Preview System** - 3 days - Frontend Dev
   - Acceptance criteria: Can preview GPT suggestions before applying
   - Dependencies: Task 2
   - Show suggested changes in different color
   - Add Accept/Reject buttons
   - Implement preview toggle
   - Animate suggestion application

5. **Add Specialized GPT Features** - 4 days - Frontend + Backend Dev
   - Acceptance criteria: All specified GPT features functional
   - Dependencies: Tasks 1-4
   - Bass line generation
   - Harmony addition (3rds, 6ths, octaves)
   - Section generation from description
   - Theory explanations
   - Composition review and improvement

### Deliverables
- Full GPT integration
- Intelligent composition assistance
- Region-focused suggestions
- Theory explanations

### Risks
- **Risk**: GPT API downtime or rate limits
  - **Mitigation**: Implement retry logic, queue system, and graceful degradation

## Phase 4: Playback and Advanced Features (Weeks 10-12)

### Tasks

1. **Integrate AudioEngine for Playback** - 3 days - Frontend Dev
   - Acceptance criteria: Composition plays back accurately with metronome
   - Dependencies: Phase 1 complete
   - Convert TAB events to AudioEngine format
   - Schedule note playback
   - Sync with existing metronome
   - Handle tempo changes

2. **Implement Position Tracking** - 2 days - Frontend Dev
   - Acceptance criteria: Current position highlighted on both fretboard and TAB
   - Dependencies: Task 1
   - Track playback position
   - Highlight current notes on fretboard
   - Highlight current position in TAB
   - Smooth scrolling for long compositions

3. **Add Playback Controls** - 2 days - Frontend Dev
   - Acceptance criteria: Full playback control with loop functionality
   - Dependencies: Task 1
   - Play/pause/stop buttons
   - Loop selection toggle
   - Tempo adjustment (40-240 BPM)
   - Count-in feature

4. **Implement Keyboard Shortcuts** - 2 days - Frontend Dev
   - Acceptance criteria: All specified keyboard shortcuts working
   - Dependencies: Phases 1-2 complete
   - Hybrid smart mode for note entry
   - Duration selection (number keys)
   - Playback control (space bar)
   - Navigation (arrow keys)

5. **Add Export Functionality** - 2 days - Frontend Dev
   - Acceptance criteria: Can export composition as plain text TAB
   - Dependencies: Phase 1 complete
   - Generate formatted text TAB
   - Add download functionality
   - Include metadata (title, tempo, time signature)
   - Preserve chord annotations

6. **Mobile Optimization** - 3 days - Frontend Dev
   - Acceptance criteria: Fully functional on mobile devices
   - Dependencies: All previous phases
   - Responsive layout implementation
   - Touch-friendly controls
   - GPT panel toggle for landscape
   - Mobile keyboard handling

### Deliverables
- Full playback system with visual feedback
- Export capabilities
- Complete keyboard shortcut system
- Mobile-optimized interface

### Risks
- **Risk**: Audio synchronization issues on mobile browsers
  - **Mitigation**: Add configurable latency compensation, test across devices

## Testing Strategy

### Unit Tests
- TAB data structure operations (CRUD, serialization)
- Chord detection algorithm (test against known chord database)
- Context windowing for GPT (verify correct measure extraction)
- Duration calculations and timing
- Undo/redo command pattern

### Integration Tests
- Fretboard → TAB entry flow
- Save/load from localStorage
- GPT request/response cycle
- AudioEngine playback scheduling
- Export format validation

### Performance Tests
- TAB rendering with 100+ measures (<100ms)
- Chord detection speed (<50ms)
- Playback start latency (<20ms)
- Memory usage with large compositions (<100MB)

### User Acceptance Tests
1. Create a 32-bar fingerpicking pattern
2. Add chord annotations to a progression
3. Use GPT to add a bass line
4. Edit existing notes and undo changes
5. Export and re-import a composition
6. Complete workflow on mobile device

## Deployment Plan

### Rollout Approach
- **Week 13**: Beta release to selected users (10% of user base)
- **Week 14**: Address beta feedback, fix critical issues
- **Week 15**: Full release with feature flag (can revert to old Assistant)
- **Week 16**: Remove feature flag after stability confirmed

### Rollback Strategy
1. Feature flag in `assistantGame.js` to revert to original Assistant
2. Keep backup of original Assistant code
3. LocalStorage versioning to prevent data corruption
4. Can disable GPT features independently if API issues

### Monitoring
- Track TAB creation rate (compositions per day)
- Monitor GPT API usage and costs
- Measure average composition length
- Track error rates for save/load operations
- Monitor performance metrics (rendering time, playback latency)

## Dependencies

### External
- OpenAI API availability and rate limits
- Browser localStorage API (5MB limit)
- Web Audio API support
- Flask backend deployment

### Internal
- AudioEngine class stability
- Existing fretboard rendering system
- Current metronome implementation
- Authentication system (for future server storage)

### Blocking (Critical Path)
1. Phase 1 TAB data structure → All subsequent phases
2. Phase 2 Edit mode → GPT region selection
3. Phase 1 TAB renderer → Playback position highlighting
4. Backend GPT endpoint → All GPT features

## Resource Requirements

### Development Team
- **Frontend Developer** (Primary): 12 weeks @ 100%
- **Frontend Developer** (Secondary): 6 weeks @ 50% (Phases 2-4)
- **Backend Developer**: 3 weeks @ 50% (Phase 3)

### Infrastructure
- No additional servers required (using existing Flask backend)
- OpenAI API budget increase ($500/month estimated)
- CDN for any new icon assets

### Testing Resources
- 5-10 beta users for Week 13 testing
- Mobile devices for testing (iOS Safari, Android Chrome)
- Automated testing setup (Jest/Selenium)

---

This comprehensive plan transforms the existing Assistant module into a powerful Composer tool while maintaining system coherence and providing clear implementation guidance. The phased approach allows for iterative development with meaningful deliverables at each stage.
