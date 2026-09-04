import { describe, it, expect } from 'vitest';
import { extractSemanticGraph } from '../utils/graphExtractor';
import { JournalEntry } from '../types';

describe('🧠 Cognitive Breakdown & Voice Sanctuary Graph Integration', () => {
  it('extracts semantic nodes and categorizes voice sessions with high connectivity', () => {
    const mockEntries: JournalEntry[] = [
      {
        id: 'entry_voice_1',
        userId: 'test_user',
        title: 'Breakthrough Voice Session on Launch & Sleep',
        content: `### Executive Synthesis
Discussed feelings of overwhelm balancing startup launch deadlines with sleep recovery.

### Emotional Trajectory
Overwhelmed ➔ Grounded Clarity

### Cognitive Patterns & Distortions Detected
- Catastrophizing
- Growth Mindset

### Grounding Action Takeaways
- [ ] Set hard cutoff for laptop at 10 PM
- [ ] Take a 15-minute nature walk

---
### Full Audio Transcript
User: I've been feeling stressed about our upcoming launch...`,
        mood: 'focused',
        tags: ['voice-session', 'neural-mirror', 'growth-mindset', 'sleep'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const graph = extractSemanticGraph(mockEntries);

    expect(graph.nodes.length).toBeGreaterThan(0);
    // Should extract concepts from tags and content
    const labels = graph.nodes.map((n) => n.label.toLowerCase());
    expect(labels.some((l) => l.includes('voice') || l.includes('growth') || l.includes('sleep') || l.includes('focused'))).toBe(true);

    // Verify metrics computation
    expect(graph.metrics.totalConcepts).toBe(graph.nodes.length);
  });

  it('handles empty entries gracefully without crashing', () => {
    const emptyGraph = extractSemanticGraph([]);
    expect(emptyGraph.nodes).toEqual([]);
    expect(emptyGraph.links).toEqual([]);
    expect(emptyGraph.metrics.totalConcepts).toBe(0);
  });
});
