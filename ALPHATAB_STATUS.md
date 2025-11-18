# alphaTab Integration - Current Status

**Branch**: `alphatab-integration`
**Date**: November 18, 2025
**Commits**: 35+ commits ahead of `main`

## Overview

We've successfully integrated alphaTab (v1.3.0) to replace our custom TAB renderer while preserving the intuitive radial menu editing system. This was a major architectural change that took approximately 3 days of iterative development.

## What We Achieved

### ✅ Phase 1: alphaTab Setup & Basic Rendering (COMPLETE)

**Professional Music Notation Rendering**
- alphaTab library integrated via CDN
- Beautiful TAB display with proper music notation styling
- Automatic measure layout and line breaks
- Duration symbols (flags, beams) rendered correctly
- All existing compositions render accurately

**AlphaTex Format**
- Created `AlphaTabAdapter` class for bidirectional sync
- Uses AlphaTex text format (simpler than Score objects API)
- Format: `fret.string.duration` for individual notes
- Format: `(fret.string fret.string).duration` for chords
- Handles all 7 duration types (whole, half, quarter, eighth, sixteenth, thirty-second, sixty-fourth)

**Data Model Sync**
- `tabCompositionToAlphaTex()` converts our format → alphaTab
- Properly handles time signatures, tempo, measures
- Validates events before conversion (skips corrupted data)
- Maintains cursor position for sequential editing

### ✅ Phase 2: Editing Integration (95% COMPLETE)

**Radial Menu Editing on alphaTab SVG**
- Click detection works on alphaTab-rendered notes
- Finds beat groups in SVG: `<g class="b{beatIndex}">`
- Maps beat index back to our composition data
- Shows radial menu at click position with smooth animations

**Note Editing Features**
- ✅ **Fret changes**: Inner ring (frets 0-12) and outer ring (frets 13-24)
- ✅ **Duration changes**: Outer ring bottom with all 7 duration options
- ✅ **Delete individual notes**: Trash icon in center
- ✅ **Visual feedback**: Hover effects, smooth transitions

**Adding New Notes**
- ✅ **TAB line click detection**: Grouped by y-position to identify 6 strings
- ✅ **Measure detection**: Grouped by x-position to identify measure boundaries
- ✅ **Sequential adding**: Uses cursor (`composition.currentMeasure`, `composition.currentTime`)
- ✅ **Automatic measure overflow**: Advances to next measure when current is full
- ✅ **String number accuracy**: Fixed to handle multiple line segments per string

**Multi-Note Chord Creation**
- ✅ **Visual proximity detection**: Detects clicks within 40px horizontally of existing notes
- ✅ **Accurate time matching**: Uses nearby note's exact time and measure
- ✅ **Proper AlphaTex format**: Generates `(note1 note2 note3).duration` syntax
- ✅ **Works across measures**: Correctly identifies which measure the chord is in

### 🔄 Key Technical Decisions Made

1. **AlphaTex over Score Objects**: Score object API has readonly properties and complex chaining requirements. AlphaTex text format is simpler and more reliable.

2. **Visual Proximity for Chords**: Instead of trying to estimate time from x-coordinates, we use visual proximity (40px) to detect chord intent. This is more intuitive for users.

3. **Cursor-Based Sequential Adding**: Rather than trying to calculate time from click coordinates, we use a cursor that tracks where the next note should go. This handles measure boundaries correctly.

4. **Y-Position Grouping for Strings**: alphaTab renders multiple SVG line segments per string. Grouping by y-position (with tolerance) correctly identifies 6 unique strings.

5. **Beat Index Mapping**: alphaTab assigns each note a beat index. We map this back to our measure/event structure for editing.

## What Works

### 🎵 Core Functionality
- ✅ Load existing compositions and render in alphaTab
- ✅ Professional TAB display with proper notation
- ✅ Click any note to edit fret or duration
- ✅ Click empty TAB space to add sequential notes
- ✅ Click near existing note to create chord (multiple notes at same time)
- ✅ Delete individual notes from composition
- ✅ Radial menu with inner ring (low frets) + outer ring (high frets + durations)
- ✅ All 7 duration types supported (whole through sixty-fourth notes)
- ✅ Measure reflow when notes change
- ✅ Automatic measure overflow to next measure

### 🎸 User Experience
- ✅ Smooth radial menu animations
- ✅ Intuitive fret selection (inner/outer rings)
- ✅ Visual duration icons (SVG symbols)
- ✅ Hover effects on clickable elements
- ✅ Automatic re-render after edits
- ✅ Cursor advances naturally for composition flow

### 🔧 Technical Quality
- ✅ No infinite click loops (fixed with `dataset.clickHandlerAttached` flags)
- ✅ Accurate string detection (fixed y-position grouping)
- ✅ Accurate measure detection (x-position grouping)
- ✅ Proper chord measure identification (uses nearby note's measure)
- ✅ Handles corrupted events gracefully (validation in conversion)
- ✅ Clean separation: alphaTab for rendering, radial menu for editing

## Known Issues

### ❌ Critical Bug: Delete Breaks Chords

**Issue**: When you delete one note from a multi-note chord, the entire chord breaks apart into individual sequential notes.

**Example**:
- Before: `(1.3 12.5 2.2 3.1).4` (4-note quarter chord)
- Delete 1st note
- After: `12.5.4 2.2.4 3.1.4` (3 separate quarter notes at different times)

**Root Cause**:
The `reflowMeasure()` function (assistantGame.js:1780-1850) treats all events as independent when redistributing them. It doesn't preserve which notes should be grouped at the same time position.

```javascript
// Current logic (simplified):
reflowMeasure(measureIndex) {
    const allEvents = this.composition.measures[measureIndex].events;
    // Clear measures
    // Redistribute events sequentially
    // ❌ Loses time grouping that defines chords
}
```

**Fix Required**:
Need to modify reflow logic to:
1. Group events by time before clearing
2. Maintain groups during redistribution
3. Or: only reflow events after the deleted note's time

**Impact**:
- Chord creation works perfectly
- But editing chords (delete) is broken
- Users can work around by deleting entire chord and re-creating
- Not a blocker for basic composition, but critical for professional use

### ⚠️ Minor Issues

1. **No GP Import Yet**: Phase 3 (GP file import) not started
   - Can't import Guitar Pro files yet
   - This was the original motivation for alphaTab integration
   - But core rendering/editing had to come first

2. **No Notation Toggle**: Can't switch between TAB-only and TAB+Notation
   - Currently shows TAB-only
   - alphaTab supports both modes
   - Easy to add once core editing is stable

3. **No Export to GP**: Can't export compositions to .gp5 format
   - Can still export to our JSON format
   - Would be nice for sharing with GP users
   - Lower priority than import

## Comparison: Old vs New

### Old Custom TAB Renderer
- ✅ Simple HTML/CSS rendering
- ✅ Fast and lightweight
- ✅ Easy to understand
- ❌ Basic visual quality
- ❌ No standard notation option
- ❌ No GP import/export
- ❌ Manual measure layout logic
- ❌ Custom duration rendering

### New alphaTab Integration
- ✅ Professional music notation quality
- ✅ Proper measure layout and line breaks
- ✅ Beautiful duration symbols (flags, beams, stems)
- ✅ Foundation for GP import/export
- ✅ Option to show standard notation (not implemented yet)
- ⚠️ Slightly larger bundle size (alphaTab library)
- ⚠️ More complex DOM structure (SVG)
- ⚠️ Requires mapping between our data model and theirs
- ❌ Chord delete bug (reflow logic issue)

## Code Architecture

### New Files Created

**`js/alphaTabAdapter.js`** (500+ lines)
- `class AlphaTabAdapter` - main adapter class
- `tabCompositionToAlphaTex(composition)` - converts our data to AlphaTex text
- `renderComposition(composition)` - triggers alphaTab render
- `attachClickHandlers()` - attaches handlers to alphaTab SVG elements
- `mapBeatIndexToNote(beatIndex)` - maps alphaTab beats to our events
- `findNearbyNotes(x, y, tolerance)` - chord detection logic
- `getTABStringLines()` - extracts and groups TAB line positions

### Major File Changes

**`js/assistantGame.js`**
- Replaced `TabRenderer` with `AlphaTabAdapter`
- `handleAlphaTabNoteClick()` - handles note clicks for editing
- `handleAlphaTabAddNote()` - handles TAB line clicks for adding
- Modified `reflowMeasure()` - attempts to handle duration changes (has bug)

**`js/tabComposer.js`**
- Modified `RadialNoteMenu` to show duration buttons in outer ring
- Added duration SVG icons (whole, half, quarter, eighth, etc.)
- Added validation to skip corrupted events

**`index.html`**
- Added alphaTab library via CDN
- Added alphaTab CSS
- Included alphaTabAdapter.js script

## Testing Summary

### What We Tested
✅ Rendering existing compositions in alphaTab
✅ Clicking notes to show radial menu
✅ Changing fret values (0-24)
✅ Changing duration values (all 7 types)
✅ Deleting individual notes (except from chords - see known issues)
✅ Adding sequential notes by clicking TAB lines
✅ Creating multi-note chords by clicking near existing notes
✅ Measure overflow when adding notes past measure capacity
✅ String detection accuracy (fixed multiple times)
✅ Measure detection accuracy (fixed multiple times)
✅ Chord measure detection (fixed once)

### What We Haven't Tested
❌ GP file import (not implemented yet)
❌ Notation toggle (not implemented yet)
❌ GP export (not implemented yet)
❌ Complex compositions with many measures
❌ Performance with very long compositions
❌ Mobile device touch interaction
❌ Different screen sizes and zoom levels

## Recommendation

### Option 1: Merge to Main Now (Recommended)

**Pros**:
- 95% of functionality working
- Massive visual improvement over old renderer
- Users can compose and edit effectively
- Can iterate on fixes in main branch

**Cons**:
- Chord delete bug exists (workaround: delete entire chord and recreate)
- No GP import yet (original motivation)

**Rationale**:
The integration is solid enough for daily use. The chord delete bug is annoying but not a blocker. We can fix it in a follow-up commit. The visual upgrade is significant and users will appreciate it.

### Option 2: Fix Chord Delete Bug First

**Pros**:
- Clean merge with no known critical bugs
- Better user experience

**Cons**:
- Delays merge by 1-2 hours
- Keeps users on old renderer longer

**Rationale**:
If we want a "perfect" merge, fix the reflow logic to preserve chord groupings. This is the only critical bug.

### Option 3: Continue in Branch Until Phase 3 Complete

**Pros**:
- Would have GP import (original goal)
- More "complete" feature set

**Cons**:
- Delays merge by days
- Phase 3 is independent (can be added later)

**Rationale**:
Not recommended. GP import can be a separate feature. No need to delay this massive improvement.

## Next Steps

### If Merging Now:
1. ✅ Commit this status document
2. Merge `alphatab-integration` → `main`
3. Create issue for chord delete bug
4. Create issue for Phase 3 (GP import)
5. Continue iteration in main branch

### If Fixing Bug First:
1. Fix `reflowMeasure()` to preserve chord groupings
2. Test chord delete thoroughly
3. Then merge to main

### If Continuing in Branch:
1. Start Phase 3 (GP import)
2. Create file input and drop zone
3. Implement track picker modal
4. Then merge everything together

## Metrics

- **Total commits**: 35+
- **Files created**: 2 (alphaTabAdapter.js, ALPHATAB_INTEGRATION_PLAN.md)
- **Files modified**: 4+ (assistantGame.js, tabComposer.js, index.html, styles.css)
- **Lines added**: ~1500+
- **Lines removed**: ~200+
- **Time invested**: ~3 days of iterative development
- **Major bugs fixed**: 15+ (infinite loops, string detection, measure detection, chord detection, etc.)
- **Major bugs remaining**: 1 (chord delete breaks grouping)

## Conclusion

The alphaTab integration has been a success. We now have professional-quality music notation rendering while preserving our intuitive radial menu editing system. The architecture is clean, the code is maintainable, and the user experience is significantly improved.

The one critical bug (chord delete) is well-understood and can be fixed in a follow-up. The lack of GP import (Phase 3) can also be added incrementally.

**Recommendation**: Merge to main now and iterate. The improvement is too significant to delay further.

---

**Ready to merge?** 🚀
