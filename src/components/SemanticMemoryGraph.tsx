import { authenticatedFetch } from '../services/apiClient';
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { JournalEntry, MemoryNode, MemoryLink, SemanticGraphData, ConceptCategory } from '../types';
import { extractSemanticGraph } from '../utils/graphExtractor';
import { saveParallelPersona } from '../services/vaultStorage';
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
  ConceptCategory,
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

  // Sync / Recalculate graph data when entries or initialGraphData changes
  useEffect(() => {
    if (initialGraphData) {
      setGraphData(initialGraphData);
    } else {
      const raw = extractSemanticGraph(entries);
      setGraphData(raw);
    }
    setSelectedNode(null);
    setSelectedLink(null);
  }, [entries, initialGraphData]);

  // Handle NPPM Synthesis Trigger
  const handleSynthesizeNPPM = async () => {
    if (isSynthesizingNPPM) return;

    const chosenDomain =
      domainMode === 'custom'
        ? (customDomainName.trim() || 'Custom Field Research')
        : targetDomain;

    setIsSynthesizingNPPM(true);
    try {
      const res = await authenticatedFetch('/api/functions/translateParallelPersona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetDomain: chosenDomain,
          domainKeywords: domainMode === 'custom' ? customDomainKeywords.trim() : undefined,
          customPersonaProfile: customPersonaProfile.trim() || undefined,
          entryCount: entryCount,
          entries: entries.map((e) => ({
            id: e.id,
            title: e.title,
            content: e.content,
            mood: e.mood,
            tags: e.tags,
            createdAt: e.createdAt,
          })),
        }),
      });

      const data = await res.json();
      if (data.success && data.graph) {
        const personaPayload = {
          targetDomain: data.targetDomain || chosenDomain,
          personaTitle: data.personaTitle || `${chosenDomain} Field Journal`,
          entries: data.entries || [],
          graph: data.graph,
          generatedAt: new Date().toISOString(),
          modelUsed: data.modelUsed || 'Gemini 3.7 Flash',
        };

        saveParallelPersona(userId, personaPayload);

        // Save into Quick Inspiration (LRU Max 6)
        if (domainMode === 'custom' || customDomainName.trim()) {
          saveInspirationProfile(chosenDomain, customDomainKeywords, customPersonaProfile);
        }

        setIsNPPMModalOpen(false);
        if (showToast) {
          showToast(`Parallel Persona Matrix synthesized (${data.entries?.length || entryCount} entries)! Protected Vault is now populated with the "${chosenDomain}" cover persona.`, 'success');
        }
      } else {
        if (showToast) showToast('Failed to synthesize persona matrix.', 'error');
      }
    } catch (err: any) {
      if (showToast) showToast(`NPPM Synthesis error: ${err.message}`, 'error');
    } finally {
      setIsSynthesizingNPPM(false);
    }
  };


  // AI Semantic Enrichment Trigger
  const handleAiEnrich = async () => {
    if (entries.length === 0 || isAiEnriching) return;
    setIsAiEnriching(true);
    try {
      const res = await authenticatedFetch('/api/functions/extractSemanticGraph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });
      const data = await res.json();
      if (data.success && data.graph?.nodes?.length) {
        // Merge enriched metadata into graph
        const enrichedNodes: MemoryNode[] = data.graph.nodes.map((n: any) => ({
          id: n.id,
          label: n.label,
          category: n.category || 'theme',
          val: n.val || 16,
          entryCount: 1,
          entryIds: [],
          summary: n.summary || '',
        }));

        const enrichedLinks: MemoryLink[] = (data.graph.links || []).map((l: any) => ({
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
            centralConcept: data.graph.centralTheme || enrichedNodes[0]?.label || 'Nexus Mind',
          },
        });
        setAiModelUsed(data.modelUsed || 'Gemini 3.7 Flash');
      }
    } catch (err) {
      console.warn('AI graph enrichment fallback', err);
    } finally {
      setIsAiEnriching(false);
    }
  };

  // Filtered nodes & links
  const filteredData = useMemo(() => {
    let nodes = graphData.nodes;
    if (selectedCategory !== 'all') {
      nodes = nodes.filter((n) => n.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      nodes = nodes.filter((n) => n.label.toLowerCase().includes(q));
    }

    const nodeIds = new Set(nodes.map((n) => n.id));
    const links = graphData.links.filter((l) => {
      const sId = typeof l.source === 'object' ? (l.source as MemoryNode).id : l.source;
      const tId = typeof l.target === 'object' ? (l.target as MemoryNode).id : l.target;
      return nodeIds.has(sId) && nodeIds.has(tId);
    });

    return { nodes, links };
  }, [graphData, selectedCategory, searchQuery]);

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

  // Render / Update D3 Force Graph
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

    // Arrow markers for links
    Object.entries(CATEGORY_CONFIG).forEach(([cat, cfg]) => {
      defs
        .append('marker')
        .attr('id', `arrow-${cat}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 24)
        .attr('refY', 0)
        .attr('markerWidth', 5)
        .attr('markerHeight', 5)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', cfg.color)
        .attr('opacity', 0.6);
    });

    // Node Glow filter
    const filter = defs.append('filter').attr('id', 'node-glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur');
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

    // Force Simulation Setup
    const simulation = d3
      .forceSimulation<MemoryNode, MemoryLink>(d3Nodes)
      .force(
        'link',
        d3
          .forceLink<MemoryNode, MemoryLink>(d3Links)
          .id((d) => d.id)
          .distance((d) => 110 - (d.strength || 1) * 8)
      )
      .force('charge', d3.forceManyBody().strength(-360).distanceMax(500))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'collision',
        d3.forceCollide().radius((d: any) => {
          const labelLen = (d.label || '').length;
          return Math.max((d.val || 15) + 28, labelLen * 3.8 + 14);
        })
      );

    simulationRef.current = simulation;

    // Draw Cluster Background Halos / Force Field Rings
    const linkGroup = g.append('g').attr('class', 'links');
    const nodeGroup = g.append('g').attr('class', 'nodes');
    const labelGroup = g.append('g').attr('class', 'labels');

    // Render Links
    const link = linkGroup
      .selectAll<SVGLineElement, MemoryLink>('line')
      .data(d3Links)
      .enter()
      .append('line')
      .attr('stroke', 'rgba(168, 85, 247, 0.25)')
      .attr('stroke-width', (d) => Math.max(1.5, Math.min(4, d.strength * 1.2)))
      .attr('stroke-dasharray', (d) => (d.relationship === 'Influences' ? '4 2' : 'none'))
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedLink(d);
        setSelectedNode(null);
      })
      .on('mouseenter', function (event, d) {
        d3.select(this)
          .attr('stroke', '#a855f7')
          .attr('stroke-width', 4)
          .attr('opacity', 1);
      })
      .on('mouseleave', function (event, d) {
        d3.select(this)
          .attr('stroke', 'rgba(168, 85, 247, 0.25)')
          .attr('stroke-width', (d.strength || 1) * 1.2);
      });

    // Render Nodes (with drag handler)
    const drag = d3
      .drag<SVGGElement, MemoryNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    const node = nodeGroup
      .selectAll<SVGGElement, MemoryNode>('g')
      .data(d3Nodes)
      .enter()
      .append('g')
      .attr('class', 'node-item')
      .attr('cursor', 'pointer')
      .call(drag as any)
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(d);
        setSelectedLink(null);
      })
      .on('mouseenter', (event, d) => {
        setHoveredNode(d);
        // Highlight active connections
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
            return sId === d.id || tId === d.id ? '#a855f7' : 'rgba(168, 85, 247, 0.25)';
          });
      })
      .on('mouseleave', () => {
        setHoveredNode(null);
        node.attr('opacity', 1);
        link.attr('opacity', 1).attr('stroke', 'rgba(168, 85, 247, 0.25)');
      });

    // Outer Aura Ring
    node
      .append('circle')
      .attr('r', (d) => (d.val || 15) + 6)
      .attr('fill', (d) => CATEGORY_CONFIG[d.category]?.bg || 'rgba(168, 85, 247, 0.15)')
      .attr('stroke', (d) => CATEGORY_CONFIG[d.category]?.color || '#a855f7')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.4)
      .attr('filter', 'url(#node-glow)');

    // Core Node Circle
    node
      .append('circle')
      .attr('r', (d) => d.val || 15)
      .attr('fill', (d) => CATEGORY_CONFIG[d.category]?.color || '#a855f7')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .attr('shadow', '0 4px 10px rgba(0,0,0,0.3)');

    // Inner icon / glyph
    node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#ffffff')
      .attr('font-size', (d) => Math.max(9, (d.val || 15) * 0.55))
      .attr('font-weight', '700')
      .attr('pointer-events', 'none')
      .text((d) => d.label.charAt(0).toUpperCase());

    // Node Labels (Smart collision clearance & text outline)
    const label = labelGroup
      .selectAll<SVGTextElement, MemoryNode>('text')
      .data(d3Nodes)
      .enter()
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => (d.val || 15) + 16)
      .attr('fill', isDarkTheme ? '#f8fafc' : '#1f1f1f')
      .attr('font-size', '11.5px')
      .attr('font-weight', '600')
      .attr('letter-spacing', '0.01em')
      .attr('paint-order', 'stroke')
      .attr('stroke', isDarkTheme ? '#0b0f19' : '#ffffff')
      .attr('stroke-width', '3.5px')
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('pointer-events', 'none')
      .text((d) => (d.label && d.label.length > 22 ? d.label.slice(0, 20) + '…' : d.label));

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

    // Auto-fit initial zoom after tick settles
    const timeout = setTimeout(() => {
      svg
        .transition()
        .duration(750)
        .call(
          zoom.transform,
          d3.zoomIdentity.translate(width / 2, height / 2).scale(0.9).translate(-width / 2, -height / 2)
        );
    }, 400);

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
                  <span>Gemini 3.7 Graph Core</span>
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

      {/* Control & Filter Sub-Bar */}
      <div
        className="p-2.5 sm:p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3"
        style={{
          background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 w-full md:w-auto scrollbar-none" style={{ touchAction: 'pan-x', WebkitOverflowScrolling: 'touch', overscrollBehaviorX: 'contain' }}>
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            style={{
              fontSize: '11.5px',
              padding: '5px 14px',
              borderRadius: '100px',
              border: '1px solid',
              borderColor: selectedCategory === 'all' ? 'var(--accent-blue)' : 'var(--border-subtle)', background: selectedCategory === 'all' ? 'var(--accent-blue-subtle)' : 'transparent', color: selectedCategory === 'all' ? 'var(--accent-blue)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            All Concepts ({graphData.nodes.length})
          </button>
          {Object.entries(CATEGORY_CONFIG).map(([catKey, cfg]) => {
            const count = graphData.nodes.filter((n) => n.category === catKey).length;
            const isSelected = selectedCategory === catKey;
            return (
              <button
                key={catKey}
                type="button"
                onClick={() => setSelectedCategory(catKey)}
                style={{
                  fontSize: '11.5px',
                  padding: '5px 14px',
                  borderRadius: '100px',
                  border: '1px solid',
                  borderColor: isSelected ? cfg.color : 'var(--border-subtle)', background: isSelected ? cfg.bg : 'transparent', color: isSelected ? cfg.color : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: isSelected ? 600 : 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: cfg.color }} />
                {cfg.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Live Search Input */}
        <div className="relative w-full md:w-64 min-w-[180px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter concepts or entities..."
            style={{
              width: '100%',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-pill)', padding: '6px 12px 6px 30px', fontSize: '12px', color: 'var(--text-primary)',
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

        {/* Node Inspection Drawer / Popup */}
        {selectedNode && (
          <div
            className="absolute top-3 left-3 sm:top-4 sm:left-4 w-[calc(100%-24px)] sm:w-80 max-h-[80vh] overflow-y-auto p-4 sm:p-5 rounded-2xl z-20"
            style={{
              background: 'var(--bg-card)',
              backdropFilter: 'blur(16px)',
              border: `1px solid ${CATEGORY_CONFIG[selectedNode.category]?.border || 'rgba(168, 85, 247, 0.4)'}`,
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)',
              color: '#ffffff',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: CATEGORY_CONFIG[selectedNode.category]?.color,
                    background: CATEGORY_CONFIG[selectedNode.category]?.bg,
                    padding: '2px 8px',
                    borderRadius: '100px',
                    border: `1px solid ${CATEGORY_CONFIG[selectedNode.category]?.border}`,
                  }}
                >
                  {CATEGORY_CONFIG[selectedNode.category]?.label}
                </span>
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    margin: '6px 0 0 0',
                    color: 'var(--text-primary)', fontFamily: '"Google Sans", "Google Sans Text", sans-serif',
                  }}
                >
                  {selectedNode.label}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Metrics Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                marginBottom: '14px',
                background: 'var(--bg-card)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                padding: '10px 12px',
                borderRadius: '12px',
                fontSize: '11.5px',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Occurrences:</span>{' '}
                <strong style={{ color: '#8ab4f8' }}>{selectedNode.entryCount} Reflections</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Sentiment:</span>{' '}
                <strong style={{ color: '#34a853', textTransform: 'capitalize' }}>
                  {selectedNode.sentiment || 'Positive'}
                </strong>
              </div>
            </div>

            {/* Summary / Excerpts in Google Keep Card Style */}
            <div style={{ marginBottom: '14px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Cognitive Context
              </span>
              <p
                style={{
                  fontSize: '12.5px',
                  color: 'var(--text-primary)',
                  lineHeight: 1.5,
                  margin: '6px 0 0 0',
                  maxHeight: '130px',
                  overflowY: 'auto',
                  background: 'var(--surface-hover)', border: '1px solid var(--border-subtle)',
                  padding: '10px 12px',
                  borderRadius: '10px',
                }}
              >
                {selectedNode.summary || 'Associated across multiple journal reflections and focus sessions.'}
              </p>
            </div>

            {/* Quick Nexus Prompt Generator (Real Mode) */}
            {onSelectConceptPrompt && (
              <button
                type="button"
                onClick={() => {
                  onSelectConceptPrompt(`Synthesize how the concept "${selectedNode.label}" influences my ongoing reflections, projects, and mindset patterns.`);
                  setSelectedNode(null);
                }}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #1a73e8, #7c3aed)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-pill)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(26, 115, 232, 0.3)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Synthesize "{selectedNode.label}" with Gemini AI
              </button>
            )}
          </div>
        )}

        {/* Link / Edge Inspection Drawer */}
        {selectedLink && (
          <div
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              width: '320px',
              background: 'var(--bg-surface)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              border: '1px solid rgba(138, 180, 248, 0.3)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
              padding: '18px',
              zIndex: 20,
              color: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8ab4f8' }} />
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#8ab4f8', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Synaptic Relationship
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLink(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
                background: 'var(--bg-card)',
                padding: '8px 12px',
                borderRadius: '10px',
                fontSize: '12.5px',
              }}
            >
              <strong style={{ color: 'var(--text-primary)' }}>
                {typeof selectedLink.source === 'object' ? (selectedLink.source as MemoryNode).label : selectedLink.source}
              </strong>
              <span style={{ fontSize: '11px', color: '#8ab4f8', fontWeight: 600 }}>
                ➔ {selectedLink.relationship} ➔
              </span>
              <strong style={{ color: 'var(--text-primary)' }}>
                {typeof selectedLink.target === 'object' ? (selectedLink.target as MemoryNode).label : selectedLink.target}
              </strong>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>
              {selectedLink.contextExcerpt || `Shared co-occurrence across ${selectedLink.coOccurrences} reflections.`}
            </p>
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

                  {/* Entry Generation Count Selector */}
                  <div style={{ marginTop: '18px', background: 'var(--bg-main)', padding: '16px 18px', borderRadius: '18px', border: '1px solid var(--border-subtle)' }}>
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
      </div>
    </div>
  );
};