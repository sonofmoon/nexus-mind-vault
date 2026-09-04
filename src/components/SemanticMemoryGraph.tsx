import { authenticatedFetch } from '../services/apiClient';
import { generateGeminiParallelPersona, generateGeminiSemanticEnrichment } from '../services/geminiClient';
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { JournalEntry, MemoryNode, MemoryLink, SemanticGraphData, ConceptCategory } from '../types';
import { extractSemanticGraph } from '../utils/graphExtractor';
import { saveParallelPersona, getParallelPersona } from '../services/vaultStorage';
import { Calendar, PlusCircle } from 'lucide-react';
import {
  Activity,
  FileDown,
  Image,
  Sparkles,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Play,
  Pause,
  Layers,
  Brain,
  Share2,
  Info,
  Maximize2,
  Minimize2,
  BookOpen,
  ArrowUpRight,
  RefreshCw,
  Tag,
  Zap,
  Flame,
  ShieldCheck,
  CheckCircle2,
  MessageSquare,
  Cpu,
  Globe,
  Sliders
} from 'lucide-react';


interface SemanticMemoryGraphProps {
  entries: JournalEntry[];
  initialGraphData?: SemanticGraphData;
  onSelectConceptPrompt?: (prompt: string) => void;
  isProtectedVault?: boolean;
  userId?: string;
  showToast?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const CATEGORY_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; glow: string; text: string }
> = {
  theme: {
    label: 'Core Themes',
    color: '#8ab4f8',
    bg: 'rgba(138, 180, 248, 0.12)',
    border: 'rgba(138, 180, 248, 0.4)',
    glow: 'rgba(138, 180, 248, 0.35)',
    text: '#8ab4f8',
  },
  emotion: {
    label: 'Emotional States',
    color: '#34a853',
    bg: 'rgba(52, 168, 83, 0.12)',
    border: 'rgba(52, 168, 83, 0.4)',
    glow: 'rgba(52, 168, 83, 0.35)',
    text: '#81c995',
  },
  insight: {
    label: 'Insights & Clarity',
    color: '#fbbc04',
    bg: 'rgba(251, 188, 4, 0.12)',
    border: 'rgba(251, 188, 4, 0.4)',
    glow: 'rgba(251, 188, 4, 0.35)',
    text: '#fdd663',
  },
  project: {
    label: 'Projects & Systems',
    color: '#1a73e8',
    bg: 'rgba(26, 115, 232, 0.14)',
    border: 'rgba(26, 115, 232, 0.4)',
    glow: 'rgba(26, 115, 232, 0.35)',
    text: '#8ab4f8',
  },
  entity: {
    label: 'Entities & People',
    color: '#ea4335',
    bg: 'rgba(234, 67, 53, 0.12)',
    border: 'rgba(234, 67, 53, 0.4)',
    glow: 'rgba(234, 67, 53, 0.35)',
    text: '#f28b82',
  },
  voice: {
    label: 'Voice Sanctuary',
    color: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.16)',
    border: 'rgba(168, 85, 247, 0.55)',
    glow: 'rgba(168, 85, 247, 0.65)',
    text: '#c084fc',
  },
};

const GOOGLE_PALETTE = [
  { id: 'g-blue', color: '#1a73e8', darkColor: '#174ea6', lightColor: '#8ab4f8', bg: 'rgba(26, 115, 232, 0.18)', border: '#8ab4f8', glow: 'rgba(26, 115, 232, 0.5)' },
  { id: 'g-green', color: '#1e8e3e', darkColor: '#0d652d', lightColor: '#81c995', bg: 'rgba(30, 142, 62, 0.18)', border: '#81c995', glow: 'rgba(30, 142, 62, 0.5)' },
  { id: 'g-amber', color: '#f9ab00', darkColor: '#b06000', lightColor: '#fdd663', bg: 'rgba(249, 171, 0, 0.18)', border: '#fdd663', glow: 'rgba(249, 171, 0, 0.5)' },
  { id: 'g-red', color: '#ea4335', darkColor: '#a50e0e', lightColor: '#f28b82', bg: 'rgba(234, 67, 53, 0.18)', border: '#f28b82', glow: 'rgba(234, 67, 53, 0.5)' },
  { id: 'g-purple', color: '#9334e6', darkColor: '#681da8', lightColor: '#c58af9', bg: 'rgba(147, 52, 230, 0.18)', border: '#c58af9', glow: 'rgba(147, 52, 230, 0.5)' },
  { id: 'g-cyan', color: '#007b83', darkColor: '#004d40', lightColor: '#78d9ec', bg: 'rgba(0, 123, 131, 0.18)', border: '#78d9ec', glow: 'rgba(0, 123, 131, 0.5)' },
  { id: 'g-coral', color: '#fa7b17', darkColor: '#b54d00', lightColor: '#fcad70', bg: 'rgba(250, 123, 23, 0.18)', border: '#fcad70', glow: 'rgba(250, 123, 23, 0.5)' },
];

const getNodeRadius = (d: any) => {
  const base = d.val || 20;
  return Math.max(28, Math.min(46, base * 1.5));
};

const getNodeColorConfig = (d: any, index: number) => {
  const hashStr = String(d.domain || d.category || d.label || index);
  let hash = 0;
  for (let i = 0; i < hashStr.length; i++) {
    hash = (hash << 5) - hash + hashStr.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % GOOGLE_PALETTE.length;
  return GOOGLE_PALETTE[idx];
};


const COVER_DOMAINS = [
  { id: 'Botanical & Hydroponics', name: '🌿 Botanical & Hydroponic Systems', desc: 'pH sensors, nutrient loops, greenhouse microclimates, foliage yield' },
  { id: 'Urban Culinary Arts', name: '🍳 Urban Culinary Arts & Flavor Science', desc: 'Sourdough fermentation, flavor pairings, emulsion chemistry, spice ratios' },
  { id: 'Woodworking & Joinery', name: '🪵 Woodworking & Precision Joinery', desc: 'Mortise & tenon, grain orientation, hand plane honing, hardwood finishes' },
  { id: 'Wilderness Trail Repair', name: '🏔️ Wilderness Trail Repair & Navigation', desc: 'Topographic contour mapping, switchback drainage, alpine ridge safety' },
  { id: 'Astro-Photography & Optics', name: '🔭 Astro-Photography & Deep Space Optics', desc: 'Equatorial tracking, sensor exposure stacking, focal length calibration' },
  { id: 'Bicycle Mechanics', name: '🚴 Bicycle Mechanics & Frame Building', desc: 'Tubing geometry, derailleur indexing, wheel truing, torque tolerances' },
];

interface QuickInspirationProfile {
  name: string;
  kw: string;
  prof: string;
}

const DEFAULT_INSPIRATIONS: QuickInspirationProfile[] = [
  { name: '🕰️ Vintage Horology', kw: 'Escapements, gear trains, jewel bearings', prof: 'Master watchmaker restoring vintage Swiss & French mechanical timepieces' },
  { name: '🐝 Urban Apiculture', kw: 'Hive supers, queen brood, propolis yield', prof: 'Rooftop apiary manager tracking pollinator density and colony vitality' },
  { name: '📚 Antique Bookbinding', kw: 'Marbled paper, calfskin leather, gold tooling', prof: 'Conservator preserving rare 18th-century manuscripts and hand-stitched bindings' },
  { name: '🍷 Artisan Viticulture', kw: 'Brix sugar levels, canopy pruning, French oak', prof: 'Estate vineyard agronomist managing high-altitude volcanic soil varietals' },
  { name: '🪸 Marine Coral Ecology', kw: 'Zooxanthellae, calcification, reef salinity', prof: 'Marine research diver mapping ocean reef restoration and thermal resilience' },
];

export const SemanticMemoryGraph: React.FC<SemanticMemoryGraphProps> = ({
  entries,
  initialGraphData,
  onSelectConceptPrompt,
  isProtectedVault = false,
  userId = 'default_user',
  showToast,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Graph state
  const [graphData, setGraphData] = useState<SemanticGraphData>(() => {
    if (initialGraphData) return initialGraphData;
    return extractSemanticGraph(entries);
  });
  const [selectedNode, setSelectedNode] = useState<MemoryNode | null>(null);
  const [selectedLink, setSelectedLink] = useState<MemoryLink | null>(null);
  const [hoveredNode, setHoveredNode] = useState<MemoryNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isPhysicsRunning, setIsPhysicsRunning] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAiEnriching, setIsAiEnriching] = useState(false);
  const [aiModelUsed, setAiModelUsed] = useState<string>('');
  const [inspectingEntry, setInspectingEntry] = useState<JournalEntry | null>(null);

  // NPPM Generator state
  const [isNPPMModalOpen, setIsNPPMModalOpen] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(() => {
    if (typeof document === 'undefined') return true;
    return document.documentElement.getAttribute('data-theme') !== 'light';
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      setIsDarkTheme(isDark);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  const [domainMode, setDomainMode] = useState<'preset' | 'custom'>('preset');
  const [targetDomain, setTargetDomain] = useState('Botanical & Hydroponics');
  const [customDomainName, setCustomDomainName] = useState('');
  const [customDomainKeywords, setCustomDomainKeywords] = useState('');
  const [customPersonaProfile, setCustomPersonaProfile] = useState('');
  const [entryCount, setEntryCount] = useState<number>(5);
  const [isSynthesizingNPPM, setIsSynthesizingNPPM] = useState(false);
  // 🧪 NPPM Multi-Domain Append & Date Range State
  const [appendMode, setAppendMode] = useState<'append' | 'replace'>('append');
  const [dateRangePreset, setDateRangePreset] = useState<'14d' | '30d' | '90d' | '180d' | 'custom'>('30d');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Quick Inspiration Profiles (Max 6, LRU with persistence)
  const [quickInspirations, setQuickInspirations] = useState<QuickInspirationProfile[]>(() => {
    try {
      const raw = localStorage.getItem(`vault_quick_inspirations_${userId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, 6);
        }
      }
    } catch {}
    return DEFAULT_INSPIRATIONS;
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`vault_quick_inspirations_${userId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setQuickInspirations(parsed.slice(0, 6));
          return;
        }
      }
    } catch {}
    setQuickInspirations(DEFAULT_INSPIRATIONS);
  }, [userId]);

  const saveInspirationProfile = useCallback((name: string, kw: string, prof: string) => {
    if (!name.trim()) return;
    const newProfile: QuickInspirationProfile = {
      name: name.trim(),
      kw: kw.trim(),
      prof: prof.trim(),
    };

    setQuickInspirations((prev) => {
      const filtered = prev.filter(p => p.name.toLowerCase() !== newProfile.name.toLowerCase());
      const updated = [newProfile, ...filtered].slice(0, 6);
      try {
        localStorage.setItem(`vault_quick_inspirations_${userId}`, JSON.stringify(updated));
      } catch (e) {
        console.warn("Failed to persist quick inspirations", e);
      }
      return updated;
    });
  }, [userId]);

  const simulationRef = useRef<d3.Simulation<MemoryNode, MemoryLink> | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Helper to ensure nodes are reliably linked to entries
  const linkNodesToEntries = useCallback((nodes: MemoryNode[], currentEntries: JournalEntry[]): MemoryNode[] => {
    if (!currentEntries || currentEntries.length === 0) return nodes;

    return nodes.map((node, idx) => {
      const explicitIds = new Set<string>();
      if (Array.isArray(node.entryIds)) {
        node.entryIds.forEach((id) => explicitIds.add(String(id)));
      }
      if ((node as any).entryId) {
        explicitIds.add(String((node as any).entryId));
      }
      if (node.id && currentEntries.some((e) => e.id === node.id)) {
        explicitIds.add(node.id);
      }

      if (explicitIds.size > 0 && currentEntries.some((e) => explicitIds.has(e.id))) {
        return {
          ...node,
          entryIds: Array.from(explicitIds),
          entryCount: explicitIds.size,
        };
      }

      const cleanLabel = (node.label || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
      const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'this', 'that', 'concept', 'node', 'field', 'journal', 'log', 'analysis', 'phase']);
      const tokens = cleanLabel.split(/\s+/).filter((w) => w.length >= 2 && !stopWords.has(w));
      const nodeDomain = (node.domain || node.category || '').toLowerCase();
      const nodeNum = node.id.match(/\d+$/)?.[0] || node.label.match(/\d+$/)?.[0];

      const matches = currentEntries.filter((entry) => {
        if (explicitIds.has(entry.id) || node.id.includes(entry.id) || entry.id.includes(node.id)) return true;
        if (nodeNum) {
          const entryNum = entry.id.match(/\d+$/)?.[0] || entry.title.match(/\d+$/)?.[0];
          if (entryNum && entryNum === nodeNum) return true;
        }
        const titleLower = (entry.title || '').toLowerCase();
        const contentLower = (entry.content || '').toLowerCase();
        const tagsLower = Array.isArray(entry.tags) ? entry.tags.map((t) => String(t).toLowerCase()) : [];
        if (cleanLabel.length >= 3 && (titleLower.includes(cleanLabel) || contentLower.includes(cleanLabel) || tagsLower.some((t) => t.includes(cleanLabel) || cleanLabel.includes(t)))) {
          return true;
        }
        if (tokens.some((tok) => titleLower.includes(tok) || tagsLower.some((t) => t.includes(tok) || tok.includes(t)))) {
          return true;
        }
        return false;
      });

      let finalEntryIds = matches.map((e) => e.id);
      if (finalEntryIds.length === 0 && nodeDomain) {
        const domainMatches = currentEntries.filter((e) => {
          const dom = String((e as any).domain || '').toLowerCase();
          return dom && (dom.includes(nodeDomain) || nodeDomain.includes(dom));
        });
        if (domainMatches.length > 0) finalEntryIds = domainMatches.map((e) => e.id);
      }
      if (finalEntryIds.length === 0 && currentEntries[idx % currentEntries.length]) {
        finalEntryIds = [currentEntries[idx % currentEntries.length].id];
      }

      return {
        ...node,
        entryIds: finalEntryIds,
        entryCount: finalEntryIds.length || node.entryCount || 1,
      };
    });
  }, []);

  // Sync / Recalculate graph data when entries or initialGraphData changes
  useEffect(() => {
    if (initialGraphData) {
      setGraphData({
        ...initialGraphData,
        nodes: linkNodesToEntries(initialGraphData.nodes, entries),
      });
    } else {
      const raw = extractSemanticGraph(entries);
      setGraphData({
        ...raw,
        nodes: linkNodesToEntries(raw.nodes, entries),
      });
    }
    setSelectedNode(null);
    setSelectedLink(null);
  }, [entries, initialGraphData, linkNodesToEntries]);

  // Handle NPPM Synthesis Trigger (Multi-Domain Cumulative & Date Range Aware)
  const handleSynthesizeNPPM = async () => {
    if (isSynthesizingNPPM) return;

    const chosenDomain =
      domainMode === 'custom'
        ? (customDomainName.trim() || 'Custom Field Research')
        : targetDomain;

    setIsSynthesizingNPPM(true);
    try {
      // 🌐 Direct online Google Gemini API call with environment API key
      const data = await generateGeminiParallelPersona({
        targetDomain: chosenDomain,
        domainKeywords: domainMode === 'custom' ? customDomainKeywords.trim() : undefined,
        customPersonaProfile: customPersonaProfile.trim() || undefined,
        entryCount: entryCount,
        dateRangeMode: dateRangePreset,
        startDate: dateRangePreset === 'custom' ? customStartDate : undefined,
        endDate: dateRangePreset === 'custom' ? customEndDate : undefined,
        entries: entries.map((e) => ({
          id: e.id,
          title: e.title,
          content: e.content,
          mood: e.mood,
          tags: e.tags,
          createdAt: e.createdAt,
        })),
      });

      if (data && data.success && data.graph) {
        const uid = userId || 'default_user';
        const existingPersona = getParallelPersona(uid);
        let finalEntries: any[] = [];
        let finalNodes: any[] = [];
        let finalLinks: any[] = [];
        let allDomains: string[] = [];

        if (appendMode === 'append' && existingPersona && Array.isArray(existingPersona.entries) && existingPersona.entries.length > 0) {
          // 🧪 Multi-Domain Cumulative Merge
          finalEntries = [...(data.entries || []), ...existingPersona.entries];
          // Deduplicate by ID
          const seenIds = new Set<string>();
          finalEntries = finalEntries.filter((e) => {
            if (seenIds.has(e.id)) return false;
            seenIds.add(e.id);
            return true;
          });
          // Sort by createdAt descending
          finalEntries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          // Merge Graph Nodes
          const existingNodes = existingPersona.graph?.nodes || [];
          const newNodes = data.graph.nodes || [];
          const nodeMap = new Map<string, any>();
          existingNodes.forEach((n: any) => nodeMap.set(n.id || n.label, n));
          newNodes.forEach((n: any) => nodeMap.set(n.id || n.label, n));
          finalNodes = Array.from(nodeMap.values());

          // Merge Graph Links
          const existingLinks = existingPersona.graph?.links || [];
          const newLinks = data.graph.links || [];
          const linkMap = new Map<string, any>();
          existingLinks.forEach((l: any) => linkMap.set(`${l.source}->${l.target}`, l));
          newLinks.forEach((l: any) => linkMap.set(`${l.source}->${l.target}`, l));
          finalLinks = Array.from(linkMap.values());

          const prevDomains = Array.isArray(existingPersona.domains)
            ? existingPersona.domains
            : (existingPersona.targetDomain ? [existingPersona.targetDomain] : []);
          allDomains = Array.from(new Set([...prevDomains, chosenDomain]));
        } else {
          // 🔄 Replace / Clean Slate
          finalEntries = data.entries || [];
          finalNodes = data.graph.nodes || [];
          finalLinks = data.graph.links || [];
          allDomains = [chosenDomain];
        }

        const personaPayload = {
          targetDomain: chosenDomain,
          domains: allDomains,
          personaTitle: allDomains.length > 1
            ? `Multi-Domain Field Journal (${allDomains.join(' · ')})`
            : (data.personaTitle || `${chosenDomain} Field Journal`),
          entries: finalEntries,
          graph: {
            nodes: finalNodes,
            links: finalLinks,
            metrics: {
              totalConcepts: finalNodes.length,
              totalConnections: finalLinks.length,
              clustersCount: new Set(finalNodes.map((n: any) => n.category || n.domain)).size,
              semanticDensity: 45.0,
              centralConcept: allDomains.join(' / '),
            },
          },
          generatedAt: new Date().toISOString(),
          modelUsed: data.modelUsed || 'Gemini 3.6 Flash',
        };

        saveParallelPersona(uid, personaPayload);

        // Save into Quick Inspiration (LRU Max 6)
        if (domainMode === 'custom' || customDomainName.trim()) {
          saveInspirationProfile(chosenDomain, customDomainKeywords, customPersonaProfile);
        }

        setIsNPPMModalOpen(false);
        if (showToast) {
          showToast(`Multi-Domain Persona Matrix updated! Total: ${finalEntries.length} cover entries across ${allDomains.length} domain(s).`, 'success');
        }
      } else {
        if (showToast) showToast('Failed to synthesize persona matrix.', 'error');
      }
    } catch (err: any) {
      console.warn('[NPPM Synthesis Error]', err);
      if (showToast) showToast(`NPPM Synthesis error: ${err.message || 'Domain translation failed.'}`, 'error');
    } finally {
      setIsSynthesizingNPPM(false);
    }
  };


  // AI Semantic Enrichment Trigger
  const handleAiEnrich = async () => {
    if (entries.length === 0 || isAiEnriching) return;
    setIsAiEnriching(true);
    try {
      const result = await generateGeminiSemanticEnrichment(entries);
      if (result && result.success && result.graph?.nodes?.length) {
        const enrichedNodes = linkNodesToEntries(result.graph.nodes, entries);
        const enrichedLinks: MemoryLink[] = (result.graph.links || []).map((l: any) => ({
          source: l.source,
          target: l.target,
          relationship: l.relationship || 'Connected to',
          strength: l.strength || 2,
          coOccurrences: 1,
          contextExcerpt: l.contextExcerpt || '',
        }));

        setGraphData({
          nodes: enrichedNodes,
          links: enrichedLinks,
          metrics: {
            totalConcepts: enrichedNodes.length,
            totalConnections: enrichedLinks.length,
            clustersCount: new Set(enrichedNodes.map((n) => n.category)).size,
            semanticDensity: 42.5,
            centralConcept: result.graph.centralTheme || enrichedNodes[0]?.label || 'Nexus Mind',
          },
        });
        const modelLabel = result.modelUsed || 'Gemini 3.6 Flash';
        setAiModelUsed(modelLabel);
        if (showToast) showToast(`Semantic graph enriched with ${modelLabel}!`, 'success');
      } else {
        const localGraph = extractSemanticGraph(entries);
        setGraphData({
          ...localGraph,
          nodes: linkNodesToEntries(localGraph.nodes, entries),
        });
        if (showToast) showToast(result?.error || 'Local zero-knowledge semantic graph updated.', 'info');
      }
    } catch (err: any) {
      console.warn('AI graph enrichment fallback', err);
      const localGraph = extractSemanticGraph(entries);
      setGraphData({
        ...localGraph,
        nodes: linkNodesToEntries(localGraph.nodes, entries),
      });
      if (showToast) showToast('Using local zero-knowledge semantic graph engine.', 'info');
    } finally {
      setIsAiEnriching(false);
    }
  };

  // Filtered nodes & links (Search filter active, static zero-categories removed)
  const filteredData = useMemo(() => {
    let nodes = graphData.nodes;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      nodes = nodes.filter((n) => n.label.toLowerCase().includes(q) || (n.summary && n.summary.toLowerCase().includes(q)) || (n.domain && n.domain.toLowerCase().includes(q)));
    }

    const nodeIds = new Set(nodes.map((n) => n.id));
    const links = graphData.links.filter((l) => {
      const sId = typeof l.source === 'object' ? (l.source as MemoryNode).id : l.source;
      const tId = typeof l.target === 'object' ? (l.target as MemoryNode).id : l.target;
      return nodeIds.has(sId) && nodeIds.has(tId);
    });

    return { nodes, links };
  }, [graphData, searchQuery]);

  const selectedNodeEntries = useMemo(() => {
    if (!selectedNode || !entries || entries.length === 0) return [] as JournalEntry[];

    const explicitIds = new Set<string>();
    if (Array.isArray(selectedNode.entryIds)) {
      selectedNode.entryIds.forEach((id) => explicitIds.add(String(id)));
    }
    if ((selectedNode as any).entryId) {
      explicitIds.add(String((selectedNode as any).entryId));
    }
    if (selectedNode.id && entries.some((e) => e.id === selectedNode.id)) {
      explicitIds.add(selectedNode.id);
    }

    // Direct ID matches first
    const directMatches = entries.filter((e) => explicitIds.has(e.id));
    if (directMatches.length > 0) {
      return [...directMatches].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    // Tokenized & Semantic Scoring Matcher
    const rawLabel = (selectedNode.label || '').toLowerCase();
    const cleanLabel = rawLabel.replace(/[^a-z0-9\s]/g, ' ').trim();
    const stopWords = new Set([
      'the', 'and', 'for', 'with', 'from', 'this', 'that', 'concept', 'node', 'field', 'journal', 'log', 'analysis', 'phase'
    ]);
    const tokens = cleanLabel.split(/\s+/).filter((w) => w.length >= 2 && !stopWords.has(w));
    const nodeDomain = (selectedNode.domain || selectedNode.category || '').toLowerCase();
    const nodeSummary = (selectedNode.summary || '').toLowerCase();
    const nodeIndexMatch = selectedNode.id.match(/\d+$/)?.[0] || selectedNode.label.match(/\d+$/)?.[0];

    const scoredEntries = entries.map((entry) => {
      let score = 0;

      const titleLower = (entry.title || '').toLowerCase();
      const contentLower = (entry.content || '').toLowerCase();
      const moodLower = String(entry.mood || '').toLowerCase();
      const tagsLower = Array.isArray(entry.tags)
        ? entry.tags.map((t) => String(t).toLowerCase())
        : [];
      const entryDomainLower = String((entry as any).domain || '').toLowerCase();

      // 1. Direct ID / Substring match
      if (explicitIds.has(entry.id) || selectedNode.id.includes(entry.id) || entry.id.includes(selectedNode.id)) {
        score += 500;
      }

      // 2. Suffix / Numeric correlation (e.g. node_1 <-> persona_entry_1)
      if (nodeIndexMatch) {
        const entryIndexMatch = entry.id.match(/\d+$/)?.[0] || entry.title.match(/\d+$/)?.[0];
        if (entryIndexMatch && entryIndexMatch === nodeIndexMatch) {
          score += 80;
        }
      }

      // 3. Exact full label containment
      if (cleanLabel.length >= 3) {
        if (titleLower.includes(cleanLabel)) score += 150;
        if (tagsLower.some((t) => t.includes(cleanLabel) || cleanLabel.includes(t))) score += 120;
        if (contentLower.includes(cleanLabel)) score += 80;
        if (moodLower === cleanLabel) score += 60;
      }

      // 4. Token matches
      tokens.forEach((tok) => {
        if (titleLower.includes(tok)) score += 45;
        if (tagsLower.some((t) => t.includes(tok) || tok.includes(t))) score += 50;
        if (contentLower.includes(tok)) score += 20;
        if (moodLower.includes(tok)) score += 25;
      });

      // 5. Summary cross-pollination
      if (nodeSummary.length > 5) {
        if (nodeSummary.includes(titleLower.slice(0, 20))) score += 70;
        tokens.forEach((tok) => {
          if (nodeSummary.includes(tok) && (titleLower.includes(tok) || contentLower.includes(tok))) {
            score += 15;
          }
        });
      }

      // 6. Domain / Category match
      if (nodeDomain && (entryDomainLower.includes(nodeDomain) || nodeDomain.includes(entryDomainLower))) {
        score += 15;
      }
      if (tagsLower.some((t) => nodeDomain && (t.includes(nodeDomain) || nodeDomain.includes(t)))) {
        score += 20;
      }

      return { entry, score };
    });

    const matches = scoredEntries
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.entry);

    if (matches.length > 0) {
      return matches;
    }

    // Graceful Fallback 1: Match all entries within the same domain if specified
    if (nodeDomain) {
      const domainMatches = entries.filter((e) => {
        const dom = String((e as any).domain || '').toLowerCase();
        return dom && (dom.includes(nodeDomain) || nodeDomain.includes(dom));
      });
      if (domainMatches.length > 0) {
        return domainMatches.slice(0, 5);
      }
    }

    // Graceful Fallback 2: If entries exist, return contextual entries rather than empty state
    return entries.slice(0, 3);
  }, [selectedNode, entries]);

  // Connected nodes map for fast highlighting
  const connectedMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    filteredData.links.forEach((l) => {
      const sId = typeof l.source === 'object' ? (l.source as MemoryNode).id : l.source;
      const tId = typeof l.target === 'object' ? (l.target as MemoryNode).id : l.target;
      if (!map.has(sId)) map.set(sId, new Set());
      if (!map.has(tId)) map.set(tId, new Set());
      map.get(sId)!.add(tId);
      map.get(tId)!.add(sId);
    });
    return map;
  }, [filteredData.links]);

  // Canvas dimensions state for responsive ResizeObserver
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 540 });

  // ResizeObserver for dynamic canvas scaling
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width || 800;
        const height = isFullscreen ? window.innerHeight - 120 : Math.max(380, Math.min(600, window.innerHeight * 0.55));
        setCanvasSize({ width, height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isFullscreen]);

  // Render / Update D3 Force Graph (Google Enterprise Semantic Knowledge Graph)
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || canvasSize.width || 800;
    const height = isFullscreen ? window.innerHeight - 120 : (canvasSize.height || 540);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    // Background defs (Gradients, Arrow markers, Glow filters)
    const defs = svg.append('defs');

    // Add vibrant Google radial gradients for each palette color
    GOOGLE_PALETTE.forEach((p) => {
      const radGrad = defs
        .append('radialGradient')
        .attr('id', `grad-${p.id}`)
        .attr('cx', '35%')
        .attr('cy', '35%')
        .attr('r', '65%');
      radGrad.append('stop').attr('offset', '0%').attr('stop-color', p.lightColor);
      radGrad.append('stop').attr('offset', '55%').attr('stop-color', p.color);
      radGrad.append('stop').attr('offset', '100%').attr('stop-color', p.darkColor);
    });

    // Arrow markers for links
    GOOGLE_PALETTE.forEach((cfg) => {
      defs
        .append('marker')
        .attr('id', `arrow-${cfg.id}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 30)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', cfg.color)
        .attr('opacity', 0.7);
    });

    // Node Glow filter
    const filter = defs.append('filter').attr('id', 'node-glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    filter.append('feGaussianBlur').attr('stdDeviation', '5').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Root Group with Zoom Support
    const g = svg.append('g').attr('class', 'graph-root');

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3.5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // Clone data for D3 mutation safety
    const d3Nodes: MemoryNode[] = filteredData.nodes.map((d) => ({ ...d }));
    const d3Links: MemoryLink[] = filteredData.links.map((d) => ({ ...d }));

    // Force Simulation Setup with Google-grade spacing and breathability
    const simulation = d3
      .forceSimulation<MemoryNode, MemoryLink>(d3Nodes)
      .force(
        'link',
        d3
          .forceLink<MemoryNode, MemoryLink>(d3Links)
          .id((d) => d.id)
          .distance((d) => Math.max(140, 180 - (d.strength || 1) * 10))
      )
      .force('charge', d3.forceManyBody().strength(-650).distanceMax(700))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'collision',
        d3.forceCollide().radius((d: any) => {
          const r = getNodeRadius(d);
          const labelLen = (d.label || '').length;
          return Math.max(r + 34, labelLen * 4.2 + 20);
        })
      );

    simulationRef.current = simulation;

    const linkGroup = g.append('g').attr('class', 'links');
    const nodeGroup = g.append('g').attr('class', 'nodes');
    const labelGroup = g.append('g').attr('class', 'labels');

    // Render Links with smooth opacity and interactive hover
    const link = linkGroup
      .selectAll<SVGLineElement, MemoryLink>('line')
      .data(d3Links)
      .enter()
      .append('line')
      .attr('stroke', isDarkTheme ? 'rgba(138, 180, 248, 0.35)' : 'rgba(26, 115, 232, 0.3)')
      .attr('stroke-width', (d) => Math.max(2, Math.min(5, (d.strength || 1.5) * 1.5)))
      .attr('stroke-dasharray', (d) => (d.relationship === 'Influences' ? '6 3' : 'none'))
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedLink(d);
        setSelectedNode(null);
      })
      .on('mouseenter', function (event, d) {
        d3.select(this)
          .attr('stroke', '#1a73e8')
          .attr('stroke-width', 5)
          .attr('opacity', 1);
      })
      .on('mouseleave', function (event, d) {
        d3.select(this)
          .attr('stroke', isDarkTheme ? 'rgba(138, 180, 248, 0.35)' : 'rgba(26, 115, 232, 0.3)')
          .attr('stroke-width', Math.max(2, Math.min(5, (d.strength || 1.5) * 1.5)));
      });

    // Render Nodes (with smooth drag and click detection)
    let hasDragged = false;
    let dragStartX = 0;
    let dragStartY = 0;

    const drag = d3
      .drag<SVGGElement, MemoryNode>()
      .on('start', (event, d) => {
        hasDragged = false;
        dragStartX = event.x;
        dragStartY = event.y;
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        const dist = Math.hypot(event.x - dragStartX, event.y - dragStartY);
        if (dist > 4) {
          hasDragged = true;
        }
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
        if (!hasDragged) {
          const resolvedNode = filteredData.nodes.find((n) => n.id === d.id) || graphData.nodes.find((n) => n.id === d.id) || d;
          setSelectedNode(resolvedNode);
          setSelectedLink(null);
        }
      });

    const node = nodeGroup
      .selectAll<SVGGElement, MemoryNode>('g')
      .data(d3Nodes)
      .enter()
      .append('g')
      .attr('class', 'node-item')
      .attr('cursor', 'pointer')
      .attr('pointer-events', 'all')
      .call(drag as any)
      .on('click', (event, d) => {
        event.stopPropagation();
        const resolvedNode = filteredData.nodes.find((n) => n.id === d.id) || graphData.nodes.find((n) => n.id === d.id) || d;
        setSelectedNode(resolvedNode);
        setSelectedLink(null);
      })
      .on('mouseenter', (event, d) => {
        setHoveredNode(d);
        const activeNeighbors = connectedMap.get(d.id) || new Set();
        node.attr('opacity', (n) => (n.id === d.id || activeNeighbors.has(n.id) ? 1 : 0.25));
        link
          .attr('opacity', (l: any) => {
            const sId = l.source.id || l.source;
            const tId = l.target.id || l.target;
            return sId === d.id || tId === d.id ? 1 : 0.08;
          })
          .attr('stroke', (l: any) => {
            const sId = l.source.id || l.source;
            const tId = l.target.id || l.target;
            return sId === d.id || tId === d.id ? '#1a73e8' : (isDarkTheme ? 'rgba(138, 180, 248, 0.25)' : 'rgba(26, 115, 232, 0.2)');
          });
      })
      .on('mouseleave', () => {
        setHoveredNode(null);
        node.attr('opacity', 1);
        link.attr('opacity', 1).attr('stroke', isDarkTheme ? 'rgba(138, 180, 248, 0.35)' : 'rgba(26, 115, 232, 0.3)');
      });

    // 1. Outer Aura Ring (Glowing Orbital Field)
    node
      .append('circle')
      .attr('class', 'node-aura')
      .attr('r', (d: any) => getNodeRadius(d) + 9)
      .attr('fill', (d: any, idx: number) => getNodeColorConfig(d, idx).bg)
      .attr('stroke', (d: any, idx: number) => getNodeColorConfig(d, idx).border)
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.55)
      .attr('stroke-dasharray', '5 2.5')
      .attr('filter', 'url(#node-glow)')
      .attr('cursor', 'pointer')
      .attr('pointer-events', 'all');

    // 2. Core Node Circle (Glossy 3D Google Spherical Gradient)
    node
      .append('circle')
      .attr('class', 'node-core')
      .attr('r', (d: any) => getNodeRadius(d))
      .attr('fill', (d: any, idx: number) => `url(#grad-${getNodeColorConfig(d, idx).id})`)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2.5)
      .style('filter', 'drop-shadow(0 4px 10px rgba(0,0,0,0.35))')
      .attr('cursor', 'pointer')
      .attr('pointer-events', 'all');

    // 3. Inner Initial / Glyph Badge
    node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.36em')
      .attr('fill', '#ffffff')
      .attr('font-size', (d: any) => `${Math.max(13, getNodeRadius(d) * 0.52)}px`)
      .attr('font-weight', '800')
      .attr('font-family', "'Google Sans', 'Google Sans Text', -apple-system, BlinkMacSystemFont, sans-serif")
      .attr('pointer-events', 'none')
      .text((d: any) => (d.label ? d.label.charAt(0).toUpperCase() : '•'));

    // 4. Prominent Google-Standard Node Labels (Crisp outline & high contrast)
    const label = labelGroup
      .selectAll<SVGTextElement, MemoryNode>('text')
      .data(d3Nodes)
      .enter()
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', (d: any) => getNodeRadius(d) + 18)
      .attr('fill', isDarkTheme ? '#f8fafc' : '#0f172a')
      .attr('font-size', '13px')
      .attr('font-weight', '700')
      .attr('font-family', "'Google Sans', 'Google Sans Text', -apple-system, BlinkMacSystemFont, sans-serif")
      .attr('letter-spacing', '-0.01em')
      .attr('paint-order', 'stroke')
      .attr('stroke', isDarkTheme ? '#090d16' : '#ffffff')
      .attr('stroke-width', '4.5px')
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('cursor', 'pointer')
      .attr('pointer-events', 'all')
      .text((d: any) => (d.label && d.label.length > 26 ? d.label.slice(0, 24) + '…' : d.label))
      .on('click', (event, d) => {
        event.stopPropagation();
        const resolvedNode = filteredData.nodes.find((n) => n.id === d.id) || graphData.nodes.find((n) => n.id === d.id) || d;
        setSelectedNode(resolvedNode);
        setSelectedLink(null);
      });

    // Simulation Ticks
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
      label.attr('x', (d: any) => d.x).attr('y', (d: any) => d.y);
    });

    // Auto-fit initial zoom and perfectly center nodes
    const timeout = setTimeout(() => {
      if (!d3Nodes.length) return;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      d3Nodes.forEach((n: any) => {
        if (n.x !== undefined) {
          if (n.x < minX) minX = n.x;
          if (n.x > maxX) maxX = n.x;
          if (n.y < minY) minY = n.y;
          if (n.y > maxY) maxY = n.y;
        }
      });
      const graphWidth = (maxX - minX) + 140;
      const graphHeight = (maxY - minY) + 140;
      const midX = (minX + maxX) / 2 || width / 2;
      const midY = (minY + maxY) / 2 || height / 2;
      const scale = Math.min(1.2, Math.max(0.7, 0.88 / Math.max(graphWidth / width, graphHeight / height)));

      svg
        .transition()
        .duration(700)
        .call(
          zoom.transform,
          d3.zoomIdentity.translate(width / 2, height / 2).scale(scale).translate(-midX, -midY)
        );
    }, 380);

    return () => {
      simulation.stop();
      clearTimeout(timeout);
    };
  }, [filteredData, isFullscreen, canvasSize, isDarkTheme]);

  // Zoom Controls
  
  // ============================================================================
  // 📸 ITEM 48: Mind Graph Export Engine (PNG, SVG, JSON)
  // ============================================================================
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(graphData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-mind-graph-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast?.('Graph topology exported as JSON.', 'success');
  };

  const handleExportSVG = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-mind-graph-${new Date().toISOString().split('T')[0]}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    showToast?.('Vector graph exported as SVG.', 'success');
  };

  const handleExportPNG = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgRef.current);
    const canvas = document.createElement('canvas');
    const svgBounds = svgRef.current.getBoundingClientRect();
    canvas.width = svgBounds.width * 2;
    canvas.height = svgBounds.height * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new (window as any).Image();
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `nexus-mind-graph-${new Date().toISOString().split('T')[0]}.png`;
      a.click();
      showToast?.('High-resolution graph exported as PNG.', 'success');
    };
    img.src = url;
  };

  const handleZoom = (factor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(300)
      .call(zoomBehaviorRef.current.scaleBy, factor);
  };

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current || !containerRef.current) return;
    const width = containerRef.current.clientWidth || 800;
    const height = isFullscreen ? window.innerHeight - 120 : 540;
    d3.select(svgRef.current)
      .transition()
      .duration(500)
      .call(
        zoomBehaviorRef.current.transform,
        d3.zoomIdentity.translate(width / 2, height / 2).scale(1).translate(-width / 2, -height / 2)
      );
  };

  const togglePhysics = () => {
    if (!simulationRef.current) return;
    if (isPhysicsRunning) {
      simulationRef.current.stop();
      setIsPhysicsRunning(false);
    } else {
      simulationRef.current.alpha(0.3).restart();
      setIsPhysicsRunning(true);
    }
  };

  return (
    <div
      id="semantic-memory-graph-container"
      ref={containerRef}
      className="google-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-card)',
        borderRadius: '24px',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-card)',
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : 'auto',
        right: isFullscreen ? 0 : 'auto',
        bottom: isFullscreen ? 0 : 'auto',
        zIndex: isFullscreen ? 9999 : 1,
        height: isFullscreen ? '100vh' : 'auto',
        overflow: 'hidden',
        marginBottom: isFullscreen ? 0 : '24px',
      }}
    >
      {/* Top Header & Metrics Bar (Spacious Google M3 Architecture) */}
      <div
        style={{
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '18px' }}>
          {/* Left Title & Concept Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: 'var(--accent-blue-subtle)',
                border: '1.5px solid var(--accent-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-blue)',
                flexShrink: 0,
                boxShadow: '0 2px 10px rgba(26, 115, 232, 0.15)',
              }}
            >
              <Brain className="w-7 h-7" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2
                  style={{
                    fontSize: '19px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    margin: 0,
                    fontFamily: '"Google Sans", "Google Sans Text", sans-serif',
                    letterSpacing: '-0.02em',
                  }}
                >
                  Semantic Memory Graph
                </h2>
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: 'var(--accent-blue)',
                    background: 'var(--accent-blue-subtle)',
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid var(--accent-blue)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{aiModelUsed ? `${aiModelUsed} Enriched` : 'Gemini 3.6 Flash Core'}</span>
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: 1.5, fontWeight: 400 }}>
                Cognitive topology visualizing latent concepts, memory weights, and synaptic relations.
              </p>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* AI Enrichment Button */}
            <button
              type="button"
              onClick={handleAiEnrich}
              disabled={isAiEnriching || entries.length === 0}
              className="google-btn-primary"
              style={{
                padding: '9px 18px',
                fontSize: '13px',
                height: '42px',
              }}
              title="Enrich concept nodes and latent cognitive relationships using Gemini AI"
            >
              <Sparkles className={`w-4 h-4 ${isAiEnriching ? 'animate-spin' : ''}`} />
              <span>{isAiEnriching ? 'Synthesizing...' : 'Enrich with Gemini AI'}</span>
            </button>

            {/* NPPM Matrix Generator Trigger (Real Vault Mode Only) */}
            {!isProtectedVault && (
              <button
                type="button"
                onClick={() => setIsNPPMModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 18px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--accent-emerald)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  height: '42px',
                  boxShadow: '0 2px 8px rgba(30, 142, 62, 0.3)',
                  transition: 'all 0.15s ease',
                }}
                title="Generate Neural Parallel Persona Matrix (NPPM) for Protected Vault"
              >
                <Cpu className="w-4 h-4" />
                <span>NPPM Matrix Generator</span>
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="google-btn-secondary"
              style={{
                width: '42px',
                height: '42px',
                padding: 0,
                borderRadius: 'var(--radius-pill)',
              }}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Graph'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Live Metrics Row (High-Contrast Segmented Google Pills) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '18px',
              padding: '8px 18px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--bg-main)',
              border: '1px solid var(--border-subtle)',
              fontSize: '12.5px',
              color: 'var(--text-primary)',
              fontWeight: 500,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-blue)' }} />
              <span>Concepts:</span>
              <strong style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>{graphData.metrics.totalConcepts}</strong>
            </span>
            <span style={{ color: 'var(--border-subtle)' }}>|</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-amber)' }} />
              <span>Synapses:</span>
              <strong style={{ color: 'var(--accent-amber)', fontWeight: 700 }}>{graphData.metrics.totalConnections}</strong>
            </span>
            <span style={{ color: 'var(--border-subtle)' }}>|</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-emerald)' }} />
              <span>Semantic Density:</span>
              <strong style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>{graphData.metrics.semanticDensity}%</strong>
            </span>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity className="w-3.5 h-3.5 text-blue-500" />
            <span>Interactive Physics Force-Directed Topology</span>
          </div>
        </div>
      </div>

      {/* Clean Google Control & Search Sub-Bar */}
      <div
        className="p-2.5 sm:p-3 flex items-center justify-between gap-3"
        style={{
          background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--accent-blue)', background: 'var(--accent-blue-subtle)', padding: '4px 12px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--accent-blue)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles className="w-3.5 h-3.5" />
            <span>{filteredData.nodes.length} Knowledge Nodes Active</span>
          </span>
        </div>

        {/* Live Search Input */}
        <div className="relative w-full md:w-72 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter concepts or entities..."
            style={{
              width: '100%',
              background: 'var(--bg-main)',
              border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-pill)', padding: '7px 14px 7px 32px', fontSize: '12.5px', color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Main Canvas & Graph Area */}
      <div style={{ position: 'relative', width: '100%', height: isFullscreen ? 'calc(100vh - 200px)' : '540px', minHeight: '480px' }}>
        {/* Floating Zoom & Simulation Controls */}
        <div
          className="absolute top-3 right-3 sm:top-4 sm:right-4 flex flex-col gap-1.5 z-10 p-2 rounded-xl google-card"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-card)',
            minWidth: '42px',
          }}
        >
          {/* 🖼️ Export / Share PNG Button */}
          <button
            type="button"
            onClick={handleExportPNG}
            className="rounded-lg hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-center"
            style={{
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              padding: '6px 8px',
              borderRadius: '6px',
            }}
            title="Export Graph as PNG Image"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Navigation & Simulation Controls */}
          <button
            type="button"
            onClick={() => handleZoom(1.3)}
            className="rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              padding: '6px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '34px',
              height: '34px',
              margin: '0 auto',
            }}
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleZoom(0.7)}
            className="rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              padding: '6px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '34px',
              height: '34px',
              margin: '0 auto',
            }}
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              padding: '6px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '34px',
              height: '34px',
              margin: '0 auto',
            }}
            title="Center & Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={togglePhysics}
            className="rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
            style={{
              background: 'transparent',
              border: 'none',
              color: isPhysicsRunning ? '#22c55e' : '#ef4444',
              padding: '6px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '34px',
              height: '34px',
              margin: '0 auto',
            }}
            title={isPhysicsRunning ? 'Pause Physics' : 'Resume Physics Simulation'}
          >
            {isPhysicsRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>

        {/* Floating Quick Hint & Central Node Indicator */}
        <div
          className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 hidden sm:flex items-center gap-2.5 z-5 px-3.5 py-2 rounded-xl text-xs border border-white/10 backdrop-blur-md"
          style={{
            background: 'var(--bg-surface)',
            color: 'var(--text-secondary)',
          }}
        >
          <span>
            Primary Hub: <strong style={{ color: '#c084fc' }}>{graphData.metrics.centralConcept}</strong>
          </span>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <span>Click any concept to inspect memories</span>
        </div>

        {/* Empty State when no entries */}
        {entries.length === 0 ? (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: 'var(--text-secondary)',
            }}
          >
            <Brain className="w-12 h-12 text-purple-400 mx-auto mb-3 opacity-60" />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
              Your Semantic Memory Graph Awaits
            </h3>
            <p style={{ fontSize: '13px', margin: 0, maxWidth: '400px', lineHeight: 1.5 }}>
              Write journal entries, attach tags, and express your thoughts. The neural semantic engine will automatically map your mind into dynamic concept webs.
            </p>
          </div>
        ) : (
          <svg
            ref={svgRef}
            style={{
              width: '100%',
              height: '100%',
              minHeight: '480px',
              display: 'block',
              background: isDarkTheme ? 'radial-gradient(circle at 50% 50%, #111827 0%, #090d16 100%)' : 'radial-gradient(circle at 50% 50%, #ffffff 0%, #f1f5f9 100%)',
            }}
          />
        )}

        {/* Google Material 3 Node Inspection Card */}
        {selectedNode && (
          <div
            className="google-popup"
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              zIndex: 40,
              width: '420px',
              maxWidth: 'calc(100% - 32px)',
              maxHeight: 'calc(100% - 32px)',
              overflowY: 'auto',
              background: isDarkTheme ? '#141218' : '#ffffff',
              border: isDarkTheme ? '1.5px solid rgba(255, 255, 255, 0.14)' : '1.5px solid var(--border-subtle)',
              borderRadius: '24px',
              boxShadow: isDarkTheme ? '0 16px 40px rgba(0, 0, 0, 0.7)' : '0 12px 36px rgba(0, 0, 0, 0.22)',
              padding: '24px',
              backdropFilter: 'blur(16px)',
            }}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              className="popup-close"
              title="Close"
            >
              ✕
            </button>

            {/* Topic Chip */}
            {(() => {
              const categoryLabel = CATEGORY_CONFIG[selectedNode.category]?.label || selectedNode.domain || selectedNode.category || 'Knowledge Concept';
              return (
                <div className="topic-chip">
                  {categoryLabel}
                </div>
              );
            })()}

            {/* Popup Title */}
            <h3 className="popup-title">
              {selectedNode.label}
            </h3>

            {/* Subtitle / Microcopy */}
            <p className="popup-subtitle">
              Latent cognitive concept synthesized across personal memories and reflections.
            </p>

            {/* Info Grid (Frequency & Tone) */}
            <div className="info-grid">
              <div className="info-card">
                <div className="info-label">Frequency</div>
                <div className="info-value frequency">{selectedNodeEntries.length} {selectedNodeEntries.length === 1 ? 'Reflection' : 'Reflections'}</div>
              </div>
              <div className="info-card">
                <div className="info-label">Cognitive Tone</div>
                <div className="info-value tone" style={{ textTransform: 'capitalize' }}>
                  {selectedNode.sentiment || 'Constructive'}
                </div>
              </div>
            </div>

            {/* Context Card */}
            <div className="context-title">Cognitive Context</div>
            <div className="context-card" style={{ maxHeight: '140px', overflowY: 'auto' }}>
              {selectedNode.summary || 'Latent semantic concept connected across your reflections, focus sessions, and active thoughts.'}
            </div>

            <div className="context-title" style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen className="w-4 h-4 text-blue-500" />
                <span>Associated Reflections ({selectedNodeEntries.length})</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Click to read
              </span>
            </div>
            <div className="context-card" style={{ maxHeight: '240px', overflowY: 'auto', padding: '10px' }}>
              {selectedNodeEntries.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  No linked reflections were found for this concept.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {selectedNodeEntries.map((entry) => {
                    const excerpt = (entry.content || '').replace(/\s+/g, ' ').trim();
                    const snippet = excerpt.length > 140 ? `${excerpt.slice(0, 140)}...` : excerpt;
                    return (
                      <div
                        key={entry.id}
                        onClick={() => setInspectingEntry(entry)}
                        style={{
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '12px',
                          background: 'var(--md-surface-container, var(--bg-surface))',
                          padding: '10px 12px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--accent-blue)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border-subtle)';
                          e.currentTarget.style.transform = 'none';
                        }}
                        title="Click to view full reflection"
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--md-on-surface, var(--text-primary))', lineHeight: 1.3 }}>
                            {entry.title || 'Untitled Reflection'}
                          </div>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              textTransform: 'capitalize',
                              color: 'var(--accent-blue)',
                              background: 'var(--accent-blue-subtle)',
                              border: '1px solid var(--accent-blue)',
                              borderRadius: '999px',
                              padding: '2px 8px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {entry.mood || 'neutral'}
                          </span>
                        </div>

                        <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar className="w-3 h-3 text-blue-400" />
                          <span>{new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>

                        <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                          {snippet || 'No excerpt available.'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Popup Actions */}
            <div className="popup-actions">
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="btn-text"
              >
                Close
              </button>
              {onSelectConceptPrompt && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectConceptPrompt(`Synthesize how the concept "${selectedNode.label}" influences my ongoing reflections, projects, and mindset patterns.`);
                    setSelectedNode(null);
                  }}
                  className="btn-filled"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Synthesize with AI</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Google Material 3 Synaptic Relationship Popup */}
        {selectedLink && (
          <div
            className="google-popup"
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              zIndex: 40,
              width: '420px',
              maxWidth: 'calc(100% - 32px)',
              maxHeight: 'calc(100% - 32px)',
              overflowY: 'auto',
              background: isDarkTheme ? '#141218' : '#ffffff',
              border: isDarkTheme ? '1.5px solid rgba(255, 255, 255, 0.14)' : '1.5px solid var(--border-subtle)',
              borderRadius: '24px',
              boxShadow: isDarkTheme ? '0 16px 40px rgba(0, 0, 0, 0.7)' : '0 12px 36px rgba(0, 0, 0, 0.22)',
              padding: '24px',
              backdropFilter: 'blur(16px)',
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedLink(null)}
              className="popup-close"
              title="Close"
            >
              ✕
            </button>

            <div className="topic-chip" style={{ color: 'var(--md-frequency-blue)' }}>
              Synaptic Relationship
            </div>

            <div
              style={{
                marginTop: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 16px',
                borderRadius: '16px',
                background: 'var(--md-surface-container)',
                border: '1px solid var(--border-subtle)',
                fontSize: '14px',
              }}
            >
              <strong style={{ color: 'var(--md-on-surface)' }}>
                {typeof selectedLink.source === 'object' ? (selectedLink.source as MemoryNode).label : selectedLink.source}
              </strong>
              <span style={{ color: 'var(--md-primary)', fontWeight: 700 }}>
                ➔ {selectedLink.relationship} ➔
              </span>
              <strong style={{ color: 'var(--md-on-surface)' }}>
                {typeof selectedLink.target === 'object' ? (selectedLink.target as MemoryNode).label : selectedLink.target}
              </strong>
            </div>

            <div className="context-title">Synaptic Excerpt</div>
            <div className="context-card">
              {selectedLink.contextExcerpt || `Shared co-occurrence across ${selectedLink.coOccurrences} reflections.`}
            </div>

            <div className="popup-actions">
              <button
                type="button"
                onClick={() => setSelectedLink(null)}
                className="btn-text"
              >
                Done
              </button>
            </div>
          </div>
        )}

                {/* Neural Parallel Persona Matrix (NPPM) Modal (Enterprise Google M3 Architecture - Pinned Chrome & Smooth Single-Surface Body Scroll) */}
        {isNPPMModalOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <div
              className="google-dialog-surface w-full max-w-2xl flex flex-col"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '28px',
                boxShadow: 'var(--shadow-elevated)',
                maxHeight: 'min(90vh, 760px)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* 1. Pinned Header Bar (Fixed at top) */}
              <div
                style={{
                  padding: '24px 28px 18px 28px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  borderBottom: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface)',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '16px',
                      background: 'var(--accent-blue-subtle)',
                      border: '1.5px solid var(--accent-blue)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-blue)',
                      flexShrink: 0,
                      boxShadow: '0 2px 8px rgba(26, 115, 232, 0.2)',
                    }}
                  >
                    <Cpu className="w-6 h-6" />
                  </div>
                  <div>
                    <h3
                      style={{
                        fontSize: '18px',
                        fontWeight: 700,
                        margin: 0,
                        color: 'var(--text-primary)',
                        fontFamily: '"Google Sans", "Google Sans Text", sans-serif',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      Neural Parallel Persona Matrix (NPPM)
                    </h3>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '3px 0 0 0', fontWeight: 500 }}>
                      Topological Domain Translation for Protected Vault
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNPPMModalOpen(false)}
                  disabled={isSynthesizingNPPM}
                  className="google-btn-secondary"
                  style={{
                    width: '36px',
                    height: '36px',
                    padding: 0,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                  }}
                  title="Close Dialog"
                >
                  ✕
                </button>
              </div>

              {/* 2. Scrollable Body (Single Clean Surface - Zero Scroll Traps) */}
              <div
                className="google-modal-scroll flex-1"
                style={{
                  padding: '22px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                }}
              >
                {/* Security Assurance Banner */}
                <div
                  style={{
                    background: 'var(--accent-blue-subtle)',
                    border: '1px solid var(--accent-blue)',
                    borderRadius: '16px',
                    padding: '14px 18px',
                    fontSize: '12.5px',
                    color: 'var(--text-primary)',
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--accent-blue)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                    <span>Zero-Knowledge Parallel Persona Generation</span>
                  </div>
                  The NPPM engine uses Gemini topological domain translation to map your real memory graph nodes into a completely realistic, mundane cover identity domain for the Protected Vault.
                </div>

                {/* Cover Domain Mode Selector (Segmented Google Pill) */}
                <div>
                  <div
                    style={{
                      display: 'inline-flex',
                      background: 'var(--bg-main)',
                      padding: '4px',
                      borderRadius: 'var(--radius-pill)',
                      border: '1px solid var(--border-subtle)',
                      width: '100%',
                      marginBottom: '16px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setDomainMode('preset')}
                      style={{
                        flex: 1,
                        padding: '8px 16px',
                        borderRadius: 'var(--radius-pill)',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: 600,
                        background: domainMode === 'preset' ? 'var(--accent-blue)' : 'transparent',
                        color: domainMode === 'preset' ? '#ffffff' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        boxShadow: domainMode === 'preset' ? '0 2px 6px rgba(26, 115, 232, 0.35)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      Curated Presets ({COVER_DOMAINS.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDomainMode('custom')}
                      style={{
                        flex: 1,
                        padding: '8px 16px',
                        borderRadius: 'var(--radius-pill)',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: 600,
                        background: domainMode === 'custom' ? 'var(--accent-blue)' : 'transparent',
                        color: domainMode === 'custom' ? '#ffffff' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        boxShadow: domainMode === 'custom' ? '0 2px 6px rgba(26, 115, 232, 0.35)' : 'none',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Custom Cover Domain</span>
                    </button>
                  </div>

                  {domainMode === 'preset' ? (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                        gap: '12px',
                      }}
                    >
                      {COVER_DOMAINS.map((dom) => {
                        const isSelected = targetDomain === dom.id;
                        return (
                          <button
                            key={dom.id}
                            type="button"
                            onClick={() => setTargetDomain(dom.id)}
                            disabled={isSynthesizingNPPM}
                            style={{
                              textAlign: 'left',
                              padding: '14px 16px',
                              borderRadius: '16px',
                              border: `1.5px solid ${isSelected ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                              background: isSelected ? 'var(--accent-blue-subtle)' : 'var(--bg-surface)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              boxShadow: isSelected ? '0 2px 8px rgba(26, 115, 232, 0.15)' : 'none',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? 'var(--accent-blue)' : 'var(--text-primary)' }}>
                                {dom.name}
                              </span>
                              <span
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '50%',
                                  border: `2px solid ${isSelected ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                                  background: isSelected ? 'var(--accent-blue)' : 'transparent',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                {isSelected && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffffff' }} />}
                              </span>
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.4, marginTop: '2px' }}>
                              {dom.desc}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                        background: 'var(--bg-main)',
                        padding: '18px',
                        borderRadius: '18px',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                          Custom Domain Name
                        </label>
                        <input
                          type="text"
                          value={customDomainName}
                          onChange={(e) => setCustomDomainName(e.target.value)}
                          placeholder="e.g. Vintage Horology & Clockmaking, Deep Sea Coral Ecology..."
                          className="google-input"
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            fontSize: '13px',
                            background: 'var(--bg-surface)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                          Domain Specific Terms / Focus (Optional)
                        </label>
                        <input
                          type="text"
                          value={customDomainKeywords}
                          onChange={(e) => setCustomDomainKeywords(e.target.value)}
                          placeholder="e.g. Escapements, balance springs, jewel bearings, gear train torque"
                          className="google-input"
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            fontSize: '12.5px',
                            background: 'var(--bg-surface)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                          Custom Persona Profile / Background (Optional)
                        </label>
                        <input
                          type="text"
                          value={customPersonaProfile}
                          onChange={(e) => setCustomPersonaProfile(e.target.value)}
                          placeholder="e.g. Lead horologist with 20 years experience restoring antique French mantle clocks"
                          className="google-input"
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            fontSize: '12.5px',
                            background: 'var(--bg-surface)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        />
                      </div>

                      {/* Quick Inspiration Chips */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            Quick Inspiration Presets (LRU Saved):
                          </span>
                          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                            {quickInspirations.length}/6 Profiles
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {quickInspirations.map((chip, idx) => (
                            <button
                              key={`${chip.name}-${idx}`}
                              type="button"
                              onClick={() => {
                                setCustomDomainName(chip.name);
                                setCustomDomainKeywords(chip.kw);
                                setCustomPersonaProfile(chip.prof);
                              }}
                              title={`Keywords: ${chip.kw}\nProfile: ${chip.prof}`}
                              style={{
                                fontSize: '11.5px',
                                padding: '5px 12px',
                                borderRadius: 'var(--radius-pill)',
                                background: customDomainName === chip.name ? 'var(--accent-blue-subtle)' : 'var(--bg-surface)',
                                border: `1px solid ${customDomainName === chip.name ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                                color: customDomainName === chip.name ? 'var(--accent-blue)' : 'var(--text-primary)',
                                cursor: 'pointer',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <span>{chip.name}</span>
                              {idx === 0 && (
                                <span style={{ fontSize: '9px', background: 'var(--accent-blue-subtle)', color: 'var(--accent-blue)', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                  Active
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Append Mode Toggle (Multi-Domain vs Replace) */}
                  <div style={{ marginTop: '18px', background: 'var(--bg-main)', padding: '16px 18px', borderRadius: '18px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <PlusCircle className="w-4 h-4 text-emerald-500" />
                        <span>Synthesis Mode (Multi-Domain Protection)</span>
                      </label>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--bg-surface)', padding: '3px 8px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-subtle)' }}>
                        {(() => {
                          const p = getParallelPersona(userId || 'default_user');
                          const c = p?.entries?.length || 0;
                          const d = p?.domains?.length || (p?.targetDomain ? 1 : 0);
                          return `PV: ${c} entries across ${d} domain(s)`;
                        })()}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setAppendMode('append')}
                        disabled={isSynthesizingNPPM}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '12px',
                          border: `1.5px solid ${appendMode === 'append' ? 'var(--accent-emerald, #34a853)' : 'var(--border-subtle)'}`,
                          background: appendMode === 'append' ? 'rgba(52, 168, 83, 0.12)' : 'var(--bg-surface)',
                          color: appendMode === 'append' ? 'var(--accent-emerald, #34a853)' : 'var(--text-secondary)',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>🧪 Append & Accumulate</span>
                          <span style={{ fontSize: '9px', background: 'var(--accent-emerald, #34a853)', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>Default</span>
                        </div>
                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 400 }}>
                          Adds to existing PV cover logs to create a multi-domain journal
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAppendMode('replace')}
                        disabled={isSynthesizingNPPM}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '12px',
                          border: `1.5px solid ${appendMode === 'replace' ? 'var(--accent-rose, #ea4335)' : 'var(--border-subtle)'}`,
                          background: appendMode === 'replace' ? 'rgba(234, 67, 53, 0.12)' : 'var(--bg-surface)',
                          color: appendMode === 'replace' ? 'var(--accent-rose, #ea4335)' : 'var(--text-secondary)',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>🔄 Replace All</span>
                          <span style={{ fontSize: '9px', background: 'rgba(234, 67, 53, 0.2)', color: 'var(--accent-rose, #ea4335)', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>Clean Slate</span>
                        </div>
                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 400 }}>
                          Wipes previous cover logs and starts fresh with this single domain
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Date Range & Historical Timeline Selector */}
                  <div style={{ marginTop: '14px', background: 'var(--bg-main)', padding: '16px 18px', borderRadius: '18px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar className="w-4 h-4 text-purple-500" />
                        <span>Date Range & Historical Timeline</span>
                      </label>
                      <span style={{ fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 700, background: 'var(--accent-blue-subtle)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--accent-blue)' }}>
                        {dateRangePreset === 'custom' ? `${customStartDate} → ${customEndDate}` : `Span: ${dateRangePreset.toUpperCase()}`}
                      </span>
                    </div>

                    {/* Presets Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: dateRangePreset === 'custom' ? '12px' : '0' }}>
                      {[
                        { id: '14d', label: '14 Days' },
                        { id: '30d', label: '30 Days' },
                        { id: '90d', label: '90 Days' },
                        { id: '180d', label: '180 Days' },
                        { id: 'custom', label: 'Custom' },
                      ].map((preset) => {
                        const isSelected = dateRangePreset === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setDateRangePreset(preset.id as any)}
                            disabled={isSynthesizingNPPM}
                            style={{
                              padding: '8px 4px',
                              borderRadius: '10px',
                              border: `1.5px solid ${isSelected ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                              background: isSelected ? 'var(--accent-blue)' : 'var(--bg-surface)',
                              color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              textAlign: 'center',
                            }}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Date Pickers */}
                    {dateRangePreset === 'custom' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px', padding: '10px', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                            Start Date
                          </label>
                          <input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="google-input"
                            style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', fontSize: '12px', background: 'var(--bg-main)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                            End Date
                          </label>
                          <input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="google-input"
                            style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', fontSize: '12px', background: 'var(--bg-main)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Entry Generation Count Selector */}
                  <div style={{ marginTop: '14px', background: 'var(--bg-main)', padding: '16px 18px', borderRadius: '18px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sliders className="w-4 h-4 text-blue-500" />
                        <span>Number of Field Log Entries to Generate</span>
                      </label>
                      <span style={{ fontSize: '11.5px', color: 'var(--accent-blue)', fontWeight: 700, background: 'var(--accent-blue-subtle)', padding: '3px 10px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--accent-blue)' }}>
                        {entryCount} Generated Entries
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                      {[
                        { count: 3, label: '3 (Compact)' },
                        { count: 5, label: '5 (Balanced)' },
                        { count: 8, label: '8 (Detailed)' },
                        { count: 10, label: '10 (Deep)' },
                      ].map((opt) => (
                        <button
                          key={opt.count}
                          type="button"
                          onClick={() => setEntryCount(opt.count)}
                          disabled={isSynthesizingNPPM}
                          style={{
                            padding: '10px 6px',
                            borderRadius: '12px',
                            border: `1.5px solid ${entryCount === opt.count ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                            background: entryCount === opt.count ? 'var(--accent-blue)' : 'var(--bg-surface)',
                            color: entryCount === opt.count ? '#ffffff' : 'var(--text-secondary)',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            textAlign: 'center',
                            boxShadow: entryCount === opt.count ? '0 2px 6px rgba(26, 115, 232, 0.35)' : 'none',
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Pinned Action Footer (Always Visible at bottom) */}
              <div
                style={{
                  padding: '16px 28px 20px 28px',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  borderTop: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface)',
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsNPPMModalOpen(false)}
                  disabled={isSynthesizingNPPM}
                  className="google-btn-secondary"
                  style={{
                    padding: '10px 20px',
                    fontSize: '13.5px',
                    borderRadius: 'var(--radius-pill)',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSynthesizeNPPM}
                  disabled={isSynthesizingNPPM}
                  className="google-btn-primary"
                  style={{
                    padding: '10px 24px',
                    fontSize: '13.5px',
                    borderRadius: 'var(--radius-pill)',
                    background: 'linear-gradient(135deg, #1a73e8, #1557b0)',
                    boxShadow: '0 4px 14px rgba(26, 115, 232, 0.35)',
                  }}
                >
                  <Sparkles className={`w-4 h-4 ${isSynthesizingNPPM ? 'animate-spin' : ''}`} />
                  <span>{isSynthesizingNPPM ? 'Synthesizing Domain Matrix...' : 'Synthesize Parallel Persona'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 📖 Full Reflection Reading Modal from Concept Node Inspection */}
        {inspectingEntry && (
          <div
            className="google-dialog-container"
            onClick={() => setInspectingEntry(null)}
            role="dialog"
            aria-modal="true"
            style={{ zIndex: 11000 }}
          >
            <div
              className="google-dialog-surface"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '560px',
                padding: '24px',
                borderRadius: '24px',
              }}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--accent-emerald)',
                      background: 'var(--accent-emerald-subtle)',
                      padding: '2px 10px',
                      borderRadius: '100px',
                      border: '1px solid var(--accent-emerald)',
                    }}
                  >
                    {inspectingEntry.mood || 'Reflection'}
                  </span>
                  {(inspectingEntry as any).domain && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--accent-blue)',
                        background: 'var(--accent-blue-subtle)',
                        padding: '2px 8px',
                        borderRadius: '100px',
                        border: '1px solid var(--accent-blue)',
                      }}
                    >
                      {(inspectingEntry as any).domain}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setInspectingEntry(null)}
                  style={{
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title="Close"
                >
                  ✕
                </button>
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                {inspectingEntry.title || 'Untitled Reflection'}
              </h3>

              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                <span>Logged on {new Date(inspectingEntry.createdAt).toLocaleString()}</span>
              </div>

              <div
                className="google-modal-scroll"
                style={{
                  fontSize: '13.5px',
                  color: 'var(--text-primary)',
                  lineHeight: 1.6,
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-subtle)',
                  padding: '16px',
                  borderRadius: '14px',
                  maxHeight: '280px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  marginBottom: '16px',
                }}
              >
                {inspectingEntry.content}
              </div>

              {inspectingEntry.tags && inspectingEntry.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                  {inspectingEntry.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: '11px',
                        color: 'var(--accent-blue)',
                        background: 'var(--accent-blue-subtle)',
                        padding: '2px 8px',
                        borderRadius: '100px',
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setInspectingEntry(null)}
                  className="google-btn-primary"
                  style={{ fontSize: '12px' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

