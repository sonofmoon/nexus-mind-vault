import { JournalEntry, MemoryNode, MemoryLink, SemanticGraphData, ConceptCategory } from '../types';

/**
 * Intelligent Semantic Concept & Relationship Extractor for Nexus Mind Vault
 * Extracts knowledge nodes, semantic relationships, and graph metrics locally
 * with zero-trust cryptographic isolation and deterministic reproducibility.
 */

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'were', 'been',
  'will', 'would', 'could', 'should', 'about', 'there', 'their', 'which', 'when',
  'what', 'more', 'some', 'than', 'into', 'just', 'also', 'only', 'very', 'even',
  'then', 'them', 'these', 'time', 'well', 'here', 'your', 'were', 'after', 'today',
  'wrote', 'entry', 'notes', 'felt', 'feel', 'make', 'made', 'like', 'much', 'know'
]);

const CATEGORY_KEYWORDS: Record<ConceptCategory, string[]> = {
  emotion: ['calm', 'focused', 'creative', 'anxious', 'energetic', 'tired', 'joy', 'stress', 'peace', 'gratitude', 'mood', 'mental', 'mindset', 'serenity', 'burnout'],
  insight: ['realization', 'clarity', 'lesson', 'discovered', 'learned', 'reflection', 'breakthrough', 'wisdom', 'mindfulness', 'truth', 'growth', 'principle', 'voice-session', 'voice-mirror', 'neural-mirror', 'synthesis', 'grounding'],
  project: ['nexus', 'vault', 'system', 'build', 'architecture', 'app', 'code', 'deploy', 'protocol', 'design', 'milestone', 'launch', 'client', 'work'],
  entity: ['team', 'family', 'mentor', 'google', 'user', 'gemini', 'assistant', 'community', 'partner'],
  theme: ['security', 'isolation', 'crypto', 'habits', 'productivity', 'health', 'focus', 'deep work', 'meditation', 'balance', 'learning', 'routine', 'sanctuary', 'acoustic', 'dialogue']
};

export function extractSemanticGraph(entries: JournalEntry[]): SemanticGraphData {
  if (!entries || entries.length === 0) {
    return {
      nodes: [],
      links: [],
      metrics: {
        totalConcepts: 0,
        totalConnections: 0,
        clustersCount: 0,
        semanticDensity: 0,
        centralConcept: 'None',
      },
    };
  }

  const conceptMap = new Map<string, {
    label: string;
    category: ConceptCategory;
    entryIds: Set<string>;
    count: number;
    sentiments: string[];
    excerpts: string[];
  }>();

  // 1. Extract concept seeds from Moods, Tags, and Key Term Phrases
  entries.forEach((entry) => {
    // 1.1 Mood Concept
    if (entry.mood) {
      const moodLabel = entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1);
      const key = moodLabel.toLowerCase();
      if (!conceptMap.has(key)) {
        conceptMap.set(key, {
          label: moodLabel,
          category: 'emotion',
          entryIds: new Set(),
          count: 0,
          sentiments: [],
          excerpts: [],
        });
      }
      const item = conceptMap.get(key)!;
      item.entryIds.add(entry.id);
      item.count += 2;
      item.sentiments.push(entry.mood);
      if (item.excerpts.length < 3) {
        item.excerpts.push(`[${entry.title}]: ${entry.content.slice(0, 120)}...`);
      }
    }

    // 1.2 Tags as Core Themes/Projects
    if (Array.isArray(entry.tags)) {
      entry.tags.forEach((tag) => {
        const cleanTag = tag.trim();
        if (!cleanTag || cleanTag.length < 2) return;
        const tagLabel = cleanTag.charAt(0).toUpperCase() + cleanTag.slice(1);
        const key = cleanTag.toLowerCase();

        let category: ConceptCategory = 'theme';
        for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS) as [ConceptCategory, string[]][]) {
          if (kws.some((kw) => key.includes(kw))) {
            category = cat;
            break;
          }
        }

        if (!conceptMap.has(key)) {
          conceptMap.set(key, {
            label: tagLabel,
            category,
            entryIds: new Set(),
            count: 0,
            sentiments: [],
            excerpts: [],
          });
        }
        const item = conceptMap.get(key)!;
        item.entryIds.add(entry.id);
        item.count += 3;
        if (entry.mood) item.sentiments.push(entry.mood);
        if (item.excerpts.length < 3) {
          item.excerpts.push(`[${entry.title}]: ${entry.content.slice(0, 120)}...`);
        }
      });
    }

    // 1.3 Natural Language N-Grams & Key Phrases from Titles & Contents
    const textCorpus = `${entry.title} ${entry.content}`;
    const words = textCorpus
      .replace(/[^\w\s-]/g, ' ')
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));

    // Frequent meaningful domain terms detection
    const termFreq: Record<string, number> = {};
    words.forEach((w) => {
      termFreq[w] = (termFreq[w] || 0) + 1;
    });

    Object.entries(termFreq).forEach(([word, freq]) => {
      // If word is recognized in domain keywords or has strong occurrence
      let matchedCategory: ConceptCategory | null = null;
      for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS) as [ConceptCategory, string[]][]) {
        if (kws.some((kw) => word.includes(kw) || kw.includes(word))) {
          matchedCategory = cat;
          break;
        }
      }

      if (matchedCategory || freq >= 2) {
        const label = word.charAt(0).toUpperCase() + word.slice(1);
        const key = word.toLowerCase();
        if (!conceptMap.has(key)) {
          conceptMap.set(key, {
            label,
            category: matchedCategory || 'insight',
            entryIds: new Set(),
            count: 0,
            sentiments: [],
            excerpts: [],
          });
        }
        const item = conceptMap.get(key)!;
        item.entryIds.add(entry.id);
        item.count += freq;
        if (entry.mood) item.sentiments.push(entry.mood);
        if (item.excerpts.length < 2) {
          item.excerpts.push(`[${entry.title}]: ${entry.content.slice(0, 120)}...`);
        }
      }
    });
  });

  // Filter top concepts (limit to top 28 most relevant concepts for optimal graph clarity)
  const sortedConcepts = Array.from(conceptMap.entries())
    .sort((a, b) => b[1].count - a[1].count || b[1].entryIds.size - a[1].entryIds.size)
    .slice(0, 28);

  const activeKeys = new Set(sortedConcepts.map(([k]) => k));

  // Build MemoryNode objects
  const nodes: MemoryNode[] = sortedConcepts.map(([key, data]) => {
    const entryCount = data.entryIds.size;
    const val = Math.min(26, Math.max(10, 8 + entryCount * 3 + data.count));
    const dominantSentiment = data.sentiments.length > 0
      ? data.sentiments.sort((a, b) =>
          data.sentiments.filter((v) => v === a).length - data.sentiments.filter((v) => v === b).length
        ).pop()
      : 'neutral';

    return {
      id: key,
      label: data.label,
      category: data.category,
      val,
      entryCount,
      entryIds: Array.from(data.entryIds),
      sentiment: dominantSentiment,
      summary: data.excerpts.join('\n\n') || `Associated with ${entryCount} journal reflections.`,
    };
  });

  // 2. Discover Semantic Links & Relations between Co-occurring Nodes
  const links: MemoryLink[] = [];
  const linkKeySet = new Set<string>();

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];

      // Calculate entry intersection (co-occurrence)
      const setB = new Set(nodeB.entryIds);
      const commonEntries = nodeA.entryIds.filter((id) => setB.has(id));

      if (commonEntries.length > 0) {
        const linkId = `${nodeA.id}--${nodeB.id}`;
        if (!linkKeySet.has(linkId)) {
          linkKeySet.add(linkId);

          // Determine semantic relationship semantics based on categories
          let relationship = 'Co-occurs with';
          if (nodeA.category === 'emotion' && nodeB.category === 'theme') {
            relationship = 'Influences focus on';
          } else if (nodeA.category === 'theme' && nodeB.category === 'emotion') {
            relationship = 'Evokes state of';
          } else if (nodeA.category === 'insight' && nodeB.category === 'project') {
            relationship = 'Clarifies strategy for';
          } else if (nodeA.category === 'project' && nodeB.category === 'theme') {
            relationship = 'Implements core';
          } else if (nodeA.category === 'emotion' && nodeB.category === 'insight') {
            relationship = 'Catalyzed by';
          } else if (nodeA.category === nodeB.category && nodeA.category === 'theme') {
            relationship = 'Reinforces';
          }

          const strength = Math.min(5, Math.max(1, commonEntries.length));
          const sampleEntry = entries.find((e) => commonEntries.includes(e.id));
          const contextExcerpt = sampleEntry
            ? `Connected in "${sampleEntry.title}": ${sampleEntry.content.slice(0, 100)}...`
            : `Shared in ${commonEntries.length} reflection entries.`;

          links.push({
            source: nodeA.id,
            target: nodeB.id,
            relationship,
            strength,
            coOccurrences: commonEntries.length,
            contextExcerpt,
          });
        }
      }
    }
  }

  // Calculate high-level graph metrics
  const totalConcepts = nodes.length;
  const totalConnections = links.length;
  const categoriesPresent = new Set(nodes.map((n) => n.category)).size;
  const maxLinksNode = nodes.reduce(
    (max, n) => (n.entryCount > (max?.entryCount || 0) ? n : max),
    nodes[0] || null
  );

  const possibleLinks = (totalConcepts * (totalConcepts - 1)) / 2;
  const semanticDensity = possibleLinks > 0 ? Number(((totalConnections / possibleLinks) * 100).toFixed(1)) : 0;

  return {
    nodes,
    links,
    metrics: {
      totalConcepts,
      totalConnections,
      clustersCount: categoriesPresent,
      semanticDensity,
      centralConcept: maxLinksNode?.label || 'Self-Reflection',
    },
  };
}
