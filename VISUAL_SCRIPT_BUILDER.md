# Visual Script Builder - Design Documentation

**Status**: Planned for v1.2.0
**Priority**: High
**Complexity**: Medium-High
**Estimated Development Time**: 4-6 weeks

---

## 🎯 Vision

The Visual Script Builder transforms Tagverse from a developer tool into a no-code platform, enabling non-technical users to create interactive tag scripts through an intuitive visual interface. This feature aims to cover 80% of common use cases without requiring any JavaScript knowledge.

## 🌟 Key Goals

1. **Zero-Code Required**: Users can create functional scripts without writing a single line of JavaScript
2. **Progressive Disclosure**: Three-tier system (Templates → Visual Builder → Code) allows users to start simple and graduate to advanced features
3. **Instant Gratification**: Live preview shows results in real-time as users configure
4. **Community Growth**: Lowers barrier to entry, expanding the community script ecosystem
5. **Backward Compatible**: Generated code is standard JavaScript that can be manually edited

## 🏗️ Architecture

### Three-Tier System

```
┌─────────────────┐
│   Templates     │ ← Quick start with pre-built configs
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Visual Builder  │ ← Form-based customization
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Code Editor    │ ← Full JavaScript control
└─────────────────┘
```

Users can enter at any level and move freely between them.

### Data Model

```typescript
interface VisualScriptConfig {
    id: string;                    // Unique script ID
    name: string;                  // Display name
    type: ScriptType;              // counter | badge | progress | button | list | stats
    version: string;               // Semver version

    // Data source configuration
    dataSource: {
        type: 'vault' | 'note' | 'static';
        query?: string;            // Search/filter criteria
        fields?: string[];         // Which data to extract
        aggregation?: 'count' | 'sum' | 'average' | 'list';
    };

    // Display configuration
    display: {
        template: string;          // Output template with placeholders
        styling?: CSSProperties;   // Visual styling
        icon?: string;             // Optional icon
        format?: string;           // Number/date formatting
    };

    // Interaction configuration (optional)
    interaction?: {
        clickAction?: 'open-note' | 'create-note' | 'run-command' | 'custom';
        actionConfig?: Record<string, any>;
    };

    // Advanced options
    advanced?: {
        caching?: boolean;
        updateInterval?: number;
        conditions?: string;       // JavaScript expression
    };
}

type ScriptType = 'counter' | 'badge' | 'progress' | 'button' | 'list' | 'stats';
```

### Code Generation Engine

The heart of the Visual Script Builder is the code generator that transforms visual configs into JavaScript:

```typescript
class CodeGenerator {
    generate(config: VisualScriptConfig): string {
        // Generate complete render() function from config
        return this.generateRenderFunction(config);
    }

    private generateRenderFunction(config: VisualScriptConfig): string {
        const dataFetching = this.generateDataFetching(config.dataSource);
        const rendering = this.generateRendering(config.display);
        const interaction = config.interaction
            ? this.generateInteraction(config.interaction)
            : '';

        return `
async function render(context) {
    ${dataFetching}
    ${rendering}
    ${interaction}
    return container;
}
        `.trim();
    }
}
```

### Integration with Existing Systems

- **ScriptLoaderService**: Extended to recognize `visual:` prefix for visual scripts
- **Settings Tab**: New "Visual Builder" tab alongside existing tabs
- **File System**: Visual configs stored as JSON in `.obsidian/plugins/tagverse/visual-scripts/`
- **Generated Code**: Optionally saved as `.js` files for manual editing

## 🎨 User Interface Design

### 1. Template Gallery (Entry Point)

**Location**: Settings → Tagverse → Visual Builder → New Script

```
┌──────────────────────────────────────────────────────────────┐
│  Create a New Script                                    [X]   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Choose a template to get started:                           │
│                                                               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │  📊     │  │  🏷️     │  │  📈     │  │  🔘     │        │
│  │ Counter │  │  Badge  │  │Progress │  │ Button  │        │
│  │         │  │         │  │   Bar   │  │         │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
│                                                               │
│  ┌─────────┐  ┌─────────┐                                    │
│  │  📝     │  │  📊     │                                    │
│  │  List   │  │  Stats  │                                    │
│  │         │  │         │                                    │
│  └─────────┘  └─────────┘                                    │
│                                                               │
│  Or start from scratch: [Create Custom Script]               │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

Each template card shows:
- Icon and name
- Brief description
- Example preview
- "Use Template" button

### 2. Visual Builder Modal (5-Step Wizard)

**Step 1: Basic Information**
```
┌──────────────────────────────────────────────────────────────┐
│  Step 1 of 5: Basic Information               [Prev] [Next]  │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Script Name: [___________________________________]           │
│                                                               │
│  Script ID: [_____________________________________]           │
│  (Auto-generated, can be customized)                         │
│                                                               │
│  Tag to Use: [_____________________________________]          │
│  This is the tag that will trigger your script               │
│                                                               │
│  Description: [______________________________________]        │
│               [______________________________________]        │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

**Step 2: Data Source**
```
┌──────────────────────────────────────────────────────────────┐
│  Step 2 of 5: Choose Data Source              [Prev] [Next]  │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  What data should your script use?                           │
│                                                               │
│  ◉ Search across entire vault                                │
│    Query: [tag:#project status:active]                       │
│                                                               │
│  ○ Current note only                                         │
│    Extract: [☑ Frontmatter  ☑ Content  ☐ Links]             │
│                                                               │
│  ○ Static data (no vault access)                             │
│    Value: [_____________________________________]             │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Preview: 12 notes found matching your query             │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

**Step 3: Display Configuration**
```
┌──────────────────────────────────────────────────────────────┐
│  Step 3 of 5: Configure Display               [Prev] [Next]  │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Template: [{{icon}} {{value}} {{label}}]                    │
│                                                               │
│  Available placeholders:                                     │
│  {{value}} - The computed value                              │
│  {{label}} - Custom label                                    │
│  {{icon}} - Optional icon                                    │
│  {{percentage}} - For progress bars                          │
│                                                               │
│  Icon: [📊] [Choose Icon...]                                 │
│                                                               │
│  Styling:                                                    │
│    Colors: [Primary: #4A90E2] [Background: #F5F5F5]         │
│    Size: [○ Small  ◉ Medium  ○ Large]                       │
│    Style: [☑ Bold  ☐ Italic  ☑ Rounded corners]            │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Live Preview:                                           │ │
│  │ ┌─────────────────────────────────────┐                │ │
│  │ │ 📊 12 Active Projects               │                │ │
│  │ └─────────────────────────────────────┘                │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

**Step 4: Interaction (Optional)**
```
┌──────────────────────────────────────────────────────────────┐
│  Step 4 of 5: Add Interaction (Optional)      [Prev] [Next]  │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  What should happen when users click?                        │
│                                                               │
│  ◉ No interaction (display only)                             │
│                                                               │
│  ○ Open a specific note                                      │
│    Note path: [_____________________________________]         │
│                                                               │
│  ○ Create a new note                                         │
│    Template: [_____________________________________]          │
│    Location: [_____________________________________]          │
│                                                               │
│  ○ Run a command                                             │
│    Command: [Search for tag ▼]                               │
│                                                               │
│  ○ Custom action (advanced)                                  │
│    [Switch to Code Editor]                                   │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

**Step 5: Review & Save**
```
┌──────────────────────────────────────────────────────────────┐
│  Step 5 of 5: Review & Save                   [Prev] [Save]  │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Your script is ready!                                       │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 📊 Project Counter                                      │ │
│  │ Tag: #project-stats                                     │ │
│  │ Type: Counter                                           │ │
│  │ Data: 12 notes with tag:#project                        │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Final Preview:                                          │ │
│  │ ┌─────────────────────────────────────┐                │ │
│  │ │ 📊 12 Active Projects               │                │ │
│  │ └─────────────────────────────────────┘                │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ☑ Save as visual script (editable in builder)              │
│  ☐ Also export as JavaScript file (for manual editing)      │
│                                                               │
│  [View Generated Code]  [Test in Current Note]  [Save]      │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 3. Visual Script Manager

In Settings → Tagverse → Visual Builder tab:

```
┌──────────────────────────────────────────────────────────────┐
│  Visual Scripts                            [+ New Script]    │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 📊 Project Counter                    [Edit] [Delete]  │ │
│  │ Tag: #project-stats                                     │ │
│  │ Type: Counter  •  Last modified: 2 days ago            │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 📈 Task Progress                      [Edit] [Delete]  │ │
│  │ Tag: #tasks-progress                                    │ │
│  │ Type: Progress Bar  •  Last modified: 1 week ago       │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 🔘 Quick Note Button                  [Edit] [Delete]  │ │
│  │ Tag: #new-note                                          │ │
│  │ Type: Button  •  Last modified: 3 weeks ago            │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## 📦 Six Built-in Script Types

### 1. Counter
**Use Case**: Count notes, tasks, words, etc.
**Config Options**:
- Data source (what to count)
- Label text
- Icon
- Number formatting (1000 vs 1K)
**Example**: "📝 127 notes with #project"

### 2. Badge
**Use Case**: Display status, categories, metadata
**Config Options**:
- Badge text (static or dynamic)
- Color scheme
- Shape (rounded, square, pill)
**Example**: "🟢 Active" or "Priority: High"

### 3. Progress Bar
**Use Case**: Show completion percentage
**Config Options**:
- Value source (completed/total)
- Colors (gradient support)
- Show percentage text
- Animation
**Example**: Task completion: ████████░░ 75%

### 4. Button
**Use Case**: Trigger actions
**Config Options**:
- Button label
- Icon
- Action (create note, run command, etc.)
- Confirmation prompt
**Example**: [+ New Daily Note]

### 5. List
**Use Case**: Display collections of items
**Config Options**:
- Items source
- Max items to show
- Item template
- Sorting/filtering
**Example**:
```
Recent Projects:
• Project Alpha
• Project Beta
• Project Gamma
```

### 6. Stats
**Use Case**: Show multiple metrics in a dashboard
**Config Options**:
- Multiple data sources
- Layout (grid, vertical, horizontal)
- Metric templates
**Example**:
```
📝 Notes: 127  |  ✅ Tasks: 45  |  🔗 Links: 892
```

## 🔧 Technical Implementation

### Phase 1: Foundation (Weeks 1-2)

**Tasks**:
1. Create data model (`VisualScriptConfig` interface)
2. Build code generation engine
3. Implement config storage (JSON files)
4. Extend `ScriptLoaderService` to load visual scripts
5. Create basic visual builder modal UI

**Deliverable**: Minimal working prototype with Counter type only

### Phase 2: Complete Builder (Weeks 3-4)

**Tasks**:
1. Implement all six script types
2. Complete 5-step wizard UI
3. Add live preview functionality
4. Build template gallery
5. Create visual script manager
6. Add export to JavaScript feature

**Deliverable**: Full visual builder with all script types

### Phase 3: Polish & Advanced Features (Weeks 5-6)

**Tasks**:
1. Advanced options (caching, conditions, scheduling)
2. Import existing JavaScript scripts as templates
3. Validation and error handling
4. Help documentation and tooltips
5. Performance optimization
6. User testing and refinements

**Deliverable**: Production-ready feature for v1.2.0

## 📊 Success Metrics

- **Adoption Rate**: 40%+ of users create at least one visual script
- **Coverage**: Visual scripts represent 50%+ of new script creations
- **Complexity Reduction**: Users complete visual scripts 10x faster than code
- **Community Growth**: 2x increase in community script submissions
- **User Satisfaction**: 85%+ satisfaction rating for visual builder

## 🎓 User Education

### Documentation Needed

1. **Quick Start Guide**: "Create Your First Script in 2 Minutes"
2. **Template Showcase**: Gallery with examples for each type
3. **Video Tutorial**: Step-by-step walkthrough
4. **FAQ**: Common questions and troubleshooting
5. **Advanced Guide**: Moving from visual to code

### In-App Guidance

- Contextual tooltips on every field
- Example values pre-filled
- "What's this?" help links
- Validation messages with suggestions

## 🔮 Future Enhancements (Post-v1.2.0)

- **Custom Script Types**: Allow users to define their own templates
- **Visual Builder API**: Let other plugins extend with new types
- **Drag-and-Drop Builder**: More visual, less form-based
- **Script Marketplace Integration**: Share visual scripts to community
- **AI-Assisted Generation**: "Describe what you want" → auto-generated script
- **Conditional Logic Builder**: Visual "if/then" rule creator
- **Multi-Step Scripts**: Wizards and forms with multiple screens

## 🚧 Known Limitations

1. **80/20 Coverage**: Visual builder won't cover all use cases - complex scripts still need code
2. **Learning Curve**: Still requires understanding of Obsidian concepts (tags, queries, etc.)
3. **Performance**: Very complex visual scripts may be slower than hand-optimized code
4. **Flexibility Trade-off**: Visual configs are less flexible than raw JavaScript
5. **Migration Path**: No automatic conversion of existing code to visual configs

## 🤝 Community Impact

The Visual Script Builder democratizes Tagverse:

- **For Non-Coders**: First-time access to dynamic tags
- **For Light Coders**: Faster prototyping, less boilerplate
- **For Advanced Users**: Quick templates, then customize in code
- **For Community**: More contributors = larger script library
- **For Plugin Growth**: Lower barrier = wider adoption

## 📝 Open Questions for Implementation

1. **Should visual scripts be stored as separate files or embedded in settings?**
   - Pros of files: Easy to share, version control friendly
   - Pros of settings: Simpler backup/sync story

2. **How to handle visual script updates when code is manually edited?**
   - Lock visual editing once code is touched?
   - Try to sync changes bidirectionally?
   - Maintain both versions separately?

3. **Should we support importing community visual scripts?**
   - If yes, need validation and security checks
   - If no, users must recreate them manually

4. **What's the upgrade path for existing code-based scripts?**
   - Auto-detect compatible scripts and offer conversion?
   - Manual opt-in only?

---

## 📌 Implementation Checklist

### Core Features
- [ ] Data model and TypeScript interfaces
- [ ] Code generation engine
- [ ] Visual config storage system
- [ ] Extended script loader
- [ ] Template gallery UI
- [ ] 5-step wizard modal
- [ ] Live preview system
- [ ] All six script types implemented
- [ ] Visual script manager
- [ ] Export to JavaScript

### User Experience
- [ ] Contextual help and tooltips
- [ ] Validation and error messages
- [ ] Keyboard navigation support
- [ ] Mobile compatibility
- [ ] Accessibility (ARIA labels, etc.)

### Documentation
- [ ] User guide
- [ ] Video tutorial
- [ ] API documentation
- [ ] Migration guide
- [ ] Examples gallery

### Testing
- [ ] Unit tests for code generator
- [ ] Integration tests for full workflow
- [ ] User acceptance testing
- [ ] Performance benchmarks
- [ ] Browser compatibility

---

**Last Updated**: 2025-10-30
**Status**: Design phase complete, ready for implementation planning
