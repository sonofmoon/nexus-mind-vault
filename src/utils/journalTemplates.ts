import { JournalEntry, MoodType } from '../types';

export interface JournalTemplate {
  id: string;
  name: string;
  icon: string;
  defaultMood: MoodType;
  defaultTags: string[];
  templateTitle: string;
  templateContent: string;
}

export const JOURNAL_TEMPLATES: JournalTemplate[] = [
  {
    id: 'morning_clarity',
    name: 'Morning Clarity & Intentions',
    icon: '☀️',
    defaultMood: 'focused',
    defaultTags: ['morning', 'intentions', 'focus'],
    templateTitle: `Morning Clarity — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`,
    templateContent: `### 🎯 3 High-Leverage Priorities for Today:
1. 
2. 
3. 

### 💭 Mindset & Emotional State:
- What energy am I bringing into this morning?

### 🙏 Gratitude Anchor:
- 1 thing I am genuinely grateful for right now:`,
  },
  {
    id: 'stoic_evening',
    name: 'Stoic Evening Review',
    icon: '🌙',
    defaultMood: 'calm',
    defaultTags: ['evening', 'stoic', 'reflection'],
    templateTitle: `Stoic Review — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`,
    templateContent: `### ⚖️ Evening Self-Examination (Marcus Aurelius Framework):
1. **What did I handle with virtue, patience, and presence today?**
   - 

2. **Where did I allow reactive emotions or distraction to take over?**
   - 

3. **What is within my control tomorrow, and what must I let go?**
   - `,
  },
  {
    id: 'deep_work',
    name: 'Deep Work & Breakthrough',
    icon: '⚡',
    defaultMood: 'creative',
    defaultTags: ['deep-work', 'engineering', 'sprint'],
    templateTitle: 'Deep Work Session Insights',
    templateContent: `### 🚀 Objective & Problem Statement:
- What complex problem did I tackle?

### 💡 Core Breakthrough / Key Decision:
- 

### 🧱 Blockers & Next Actions:
- `,
  },
  {
    id: 'emotional_reframe',
    name: 'Emotional Catharsis & Reframe',
    icon: '🧘',
    defaultMood: 'anxious',
    defaultTags: ['emotions', 'reframe', 'clarity'],
    templateTitle: 'Emotional Processing & Realignment',
    templateContent: `### 🌊 What am I feeling right now?
- Unfiltered emotional discharge:

### 🔍 Root Trigger:
- What belief or external event triggered this state?

### 🛡️ Sovereign Reframe:
- How will I view this situation 6 months from now?`,
  },
];

/**
 * 📈 Calculates the user's active journaling streak
 */
export function calculateJournalStreak(entries: JournalEntry[]): { currentStreak: number; maxStreak: number } {
  if (!entries || entries.length === 0) return { currentStreak: 0, maxStreak: 0 };

  const uniqueDays = Array.from(
    new Set(
      entries.map(e => new Date(e.createdAt).toISOString().split('T')[0])
    )
  ).sort().reverse();

  if (uniqueDays.length === 0) return { currentStreak: 0, maxStreak: 0 };

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

  let currentStreak = 0;
  let checkDate = uniqueDays.includes(todayStr) ? new Date() : (uniqueDays.includes(yesterdayStr) ? yesterdayDate : null);

  if (checkDate) {
    let cursor = new Date(checkDate);
    while (true) {
      const dateKey = cursor.toISOString().split('T')[0];
      if (uniqueDays.includes(dateKey)) {
        currentStreak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Calculate maximum historical streak
  let maxStreak = 0;
  let running = 0;
  const sortedAsc = [...uniqueDays].sort();
  for (let i = 0; i < sortedAsc.length; i++) {
    if (i === 0) {
      running = 1;
    } else {
      const prev = new Date(sortedAsc[i - 1]);
      const curr = new Date(sortedAsc[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        running++;
      } else {
        running = 1;
      }
    }
    if (running > maxStreak) maxStreak = running;
  }

  return { currentStreak, maxStreak: Math.max(maxStreak, currentStreak) };
}
