import { JournalEntry, TimeCapsule } from '../types';

function triggerDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportEntriesAsMarkdown(entries: JournalEntry[]) {
  const dateStr = new Date().toISOString().split('T')[0];
  let md = `# 📖 Nexus Mind Vault — Journal Reflections Export\nGenerated: ${new Date().toLocaleString()}\nTotal Entries: ${entries.length}\n\n---\n\n`;

  entries.forEach((entry, idx) => {
    md += `## ${idx + 1}. ${entry.title}\n`;
    md += `**Date:** ${new Date(entry.createdAt).toLocaleString()} | **Mood:** ${entry.mood} | **Tags:** ${(entry.tags || []).join(', ') || 'None'}\n\n`;
    md += `${entry.content}\n\n---\n\n`;
  });

  triggerDownload(`nexus_journal_export_${dateStr}.md`, md, 'text/markdown;charset=utf-8');
}

export function exportEntriesAsCSV(entries: JournalEntry[]) {
  const dateStr = new Date().toISOString().split('T')[0];
  const headers = ['ID', 'Title', 'Date', 'Mood', 'Tags', 'Content'];
  const rows = entries.map(e => [
    `"${e.id}"`,
    `"${(e.title || '').replace(/"/g, '""')}"`,
    `"${e.createdAt}"`,
    `"${e.mood}"`,
    `"${(e.tags || []).join(';')}"`,
    `"${(e.content || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  triggerDownload(`nexus_journal_export_${dateStr}.csv`, csvContent, 'text/csv;charset=utf-8');
}

export function exportEntriesAsJSON(entries: JournalEntry[]) {
  const dateStr = new Date().toISOString().split('T')[0];
  const content = JSON.stringify(entries, null, 2);
  triggerDownload(`nexus_journal_export_${dateStr}.json`, content, 'application/json');
}

export function exportCapsulesAsJSON(capsules: TimeCapsule[]) {
  const dateStr = new Date().toISOString().split('T')[0];
  const content = JSON.stringify(capsules, null, 2);
  triggerDownload(`nexus_capsules_export_${dateStr}.json`, content, 'application/json');
}

export function exportMindGraphAsJSON(graphData: any) {
  const dateStr = new Date().toISOString().split('T')[0];
  const content = JSON.stringify(graphData || { nodes: [], links: [] }, null, 2);
  triggerDownload(`nexus_mind_graph_${dateStr}.json`, content, 'application/json');
}
