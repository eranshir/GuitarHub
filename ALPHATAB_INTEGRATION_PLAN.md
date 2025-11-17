# alphaTab Integration Plan

## Overview
Replace custom TAB renderer with alphaTab for professional music notation rendering while preserving our intuitive radial menu editing system.

## Goals
- ✅ Professional music sheet rendering (TAB + optional standard notation)
- ✅ Keep our radial menu editing UX
- ✅ GP file import/export support
- ✅ Better playback using alphaTab's synthesizer
- ✅ Toggle between TAB-only and TAB+Notation views

## Architecture

### Current System
```
TabComposition (data model)
    ↓
TabRenderer (custom rendering)
    ↓
HTML/CSS TAB display
```

### New System
```
TabComposition (data model)
    ↕ Sync Layer (bidirectional)
alphaTab Score (their data model)
    ↓
alphaTab Renderer → Beautiful display (TAB + optional notation)
    ↑
Radial Menus → Edit overlay (our custom UX)
```

## Implementation Phases

### Phase 1: alphaTab Setup & Basic Rendering
**Goal**: Get alphaTab rendering our compositions

**Tasks**:
1. Add alphaTab library to index.html via CDN
   - URL: `https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/alphaTab.min.js`
   - CSS: `https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/alphaTab.css`

2. Create `AlphaTabAdapter` class (js/alphaTabAdapter.js)
   - `tabCompositionToScore(composition)` → alphaTab Score
   - `scoreToTabComposition(score, trackIndex)` → TabComposition
   - Handle mapping between data models

3. Replace TabRenderer with alphaTab in assistantGame.js
   - Initialize alphaTab API
   - Set rendering mode (TAB only initially)
   - Configure settings (layout, display, etc.)

4. Update renderComposition() to use alphaTab
   - Convert TabComposition to Score
   - Call alphaTab render
   - Maintain same container element

**Testing**:
- Existing compositions should render correctly
- All notes, durations, measures display properly
- Time signatures and tempo preserved

### Phase 2: Editing Integration
**Goal**: Make radial menus work with alphaTab rendering

**Tasks**:
1. Update click handlers to work with alphaTab's DOM structure
   - alphaTab renders different HTML classes
   - Find equivalent selectors for notes, strings, measures
   - Update setupDirectTABEditing() to work with new DOM

2. Sync edits back to alphaTab
   - When radial menu changes note → Update Score → Re-render
   - Implement `updateNoteInScore(measureIndex, time, string, newFret)`
   - Trigger alphaTab re-render after edits

3. Test all editing features:
   - Add new note via radial menu
   - Edit existing note fret
   - Change duration via duration symbol
   - Delete notes
   - Measure reflow

**Testing**:
- All radial menu features work with alphaTab rendering
- Changes persist and re-render correctly
- No visual glitches during edits

### Phase 3: GP File Import
**Goal**: Import Guitar Pro files

**Tasks**:
1. Add UI elements:
   - "Open GP" button in composition controls (next to Save)
   - Hidden file input (accept: `.gp3,.gp4,.gp5,.gp,.gpx`)
   - Drop zone overlay for drag-and-drop

2. Implement file loading:
   ```javascript
   async function loadGPFile(file) {
       const arrayBuffer = await file.arrayBuffer();
       const score = await alphaTab.importer.ScoreLoader.loadScoreFromBytes(
           new Uint8Array(arrayBuffer)
       );
       return score;
   }
   ```

3. Create track selection modal:
   - Show list of tracks with names and instruments
   - Display track index, name, tuning
   - "Import" button per track
   - "Cancel" to dismiss

4. Import selected track:
   - Convert Score track to TabComposition
   - Set title from track name or file name
   - Set tempo from score
   - Set time signature from first measure
   - Import all notes, rests, durations

**Testing**:
- Test with GP3, GP4, GP5, GP files
- Multi-track files show track picker
- Single-track files import directly
- Complex GP files handle gracefully

### Phase 4: Advanced Features
**Goal**: Leverage alphaTab's full capabilities

**Tasks**:
1. Add notation toggle:
   - Button to show/hide standard notation
   - Store preference in localStorage
   - Update alphaTab settings dynamically

2. Upgrade playback:
   - Use alphaTab's alphaSynth for better sound
   - Respect dynamics, articulations from GP files
   - Better rhythm accuracy

3. GP Export:
   - Convert TabComposition → Score
   - Use alphaTab's GP export (if available)
   - Or use MusicXML as intermediate format

4. Handle advanced GP features:
   - Bends: Store as metadata, display indicator
   - Slides: Convert to consecutive notes
   - Hammer-ons/pull-offs: Import as separate notes
   - Vibrato/tremolo: Store as note flags

## Data Model Mapping

### TabComposition → alphaTab Score

```javascript
{
  title: composition.title,
  tempo: composition.tempo,
  tracks: [{
    name: composition.title,
    tuning: [64, 59, 55, 50, 45, 40], // Standard tuning (E A D G B E)
    staves: [{
      bars: composition.measures.map(measure => ({
        voices: [{
          beats: convertEventsToBeats(measure.events)
        }]
      }))
    }]
  }]
}
```

### Event → Beat Mapping
```javascript
{
  time: event.time,
  duration: event.duration,
  notes: [{
    string: event.string,
    fret: event.fret,
    isDead: false,
    isGhost: false
  }]
}
```

## UI Changes

### New Elements
1. **Open GP button**: `<button id="open-gp-btn">Open GP File</button>`
2. **Notation toggle**: `<button id="toggle-notation">Show Notation</button>`
3. **Drop zone overlay**: Appears when dragging files
4. **Track picker modal**: Shows when GP has multiple tracks

### Updated Elements
- Replace `#composition-tab-display` with alphaTab container
- Keep all existing controls (Save, Share, Export, etc.)
- Duration symbols remain clickable (overlay on alphaTab rendering)

## Technical Considerations

### alphaTab Configuration
```javascript
const settings = {
  core: {
    engine: 'html5',
    logLevel: 'info'
  },
  display: {
    resources: {
      copyrightFont: '11px Arial'
    },
    scale: 1.0,
    staveProfile: 'Tab', // or 'TabAndStandardNotation'
    layoutMode: 'horizontal'
  },
  notation: {
    elements: {
      scoreTitle: false,
      scoreWordsAndMusic: false
    },
    rhythmMode: 'showWithBars'
  }
};
```

### Performance
- alphaTab renders to HTML5 Canvas or SVG
- May need to throttle re-renders during editing
- Use debouncing for rapid edits

### Browser Compatibility
- alphaTab requires modern browsers (ES6+)
- No IE support (we already don't support it)
- Works on mobile (important for your app)

## Rollback Plan

If alphaTab integration fails:
1. Work is in separate branch `alphatab-integration`
2. Can revert to `main` branch
3. Our TabComposition data model unchanged
4. All existing data compatible

## Testing Strategy

### Unit Tests
- Data conversion: TabComposition ↔ Score
- Note mapping accuracy
- Duration calculations
- Time signature handling

### Integration Tests
- Load existing compositions in alphaTab
- Edit notes via radial menu
- Save/Load compositions
- GP file import (various versions)
- Track selection modal

### User Acceptance Tests
- Create new composition from scratch
- Import GP file and edit it
- Toggle notation view
- Share edited GP file
- Mobile device testing

## Implementation Timeline

**Day 1**: Phase 1 (Setup & Basic Rendering)
- Add alphaTab library
- Create adapter layer
- Replace renderer
- Basic rendering working

**Day 2**: Phase 2 (Editing Integration)
- Update radial menus for alphaTab DOM
- Bidirectional sync
- All editing features working

**Day 3**: Phase 3 (GP Import)
- File upload/drop zone
- Track picker modal
- Import functionality

**Day 4**: Phase 4 (Polish)
- Notation toggle
- Better playback
- GP export
- Bug fixes

## Success Criteria

✅ All existing compositions render correctly in alphaTab
✅ Radial menu editing works seamlessly
✅ Can import GP files (all major versions)
✅ Multi-track files show track picker
✅ Notation toggle works
✅ Playback quality improved
✅ No data loss during migration
✅ Performance acceptable (< 1s render time)

## Risk Mitigation

**Risk**: alphaTab's DOM structure incompatible with our click handlers
**Mitigation**: Use alphaTab's event API or querySelector on their elements

**Risk**: Data model mismatch (features we don't support)
**Mitigation**: Import subset of features, ignore advanced notation

**Risk**: File size increase (alphaTab is large)
**Mitigation**: Use CDN for caching, lazy load if needed

**Risk**: Performance degradation
**Mitigation**: Profile and optimize, consider WebWorker for parsing

## Open Questions

1. How to handle GP files with multiple voices per track?
   - Import first voice only?
   - Merge voices?

2. GP files with different tunings?
   - Convert to standard tuning?
   - Support alternate tunings?

3. Chord diagrams in GP files?
   - Import as chord annotations?
   - Display chord shapes?

4. GP effects (bends, slides, etc.)?
   - Import as simple notes?
   - Store as metadata for future?

---

**Ready to start?** Create branch `alphatab-integration` and begin Phase 1!
