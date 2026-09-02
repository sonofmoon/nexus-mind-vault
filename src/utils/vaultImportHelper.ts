/**
 * 📥 Nexus Mind Vault — Markdown & JSON External Data Importer
 */
import { JournalEntry, MoodType } from '../types';

export interface ParsedImportResult {
  entries: Array<Omit<JournalEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & { createdAt?: string }>;
  format: 'markdown' | 'json' | 'dayone';
  filename: string;
}

export async function parseImportFile(file: File): Promise<ParsedImportResult> {
  const text = await file.text();
  const filename = file.name.toLowerCase();

  // 1. JSON Parsing (Nexus Vault Export, Day One, Standard Notes)
  if (filename.endsWith('.json')) {
    try {
      const data = JSON.parse(text);
      if (Array.isArray(data)) {
        const entries = data.map((item: any) => ({
          title: item.title || item.text?.substring(0, 30) || 'Imported Entry',
          content: item.content || item.text || '',
          mood: (item.mood || 'neutral') as MoodType,
          tags: Array.isArray(item.tags) ? item.tags : [],
          folder: item.folder || 'Imported',
          createdAt: item.createdAt || item.creationDate || new Date().toISOString(),
        }));
        return { entries, format: 'json', filename: file.name };
      }
    } catch (e) {
      throw new Error('Invalid JSON format in import file.');
    }
  }

  // 2. Markdown Parsing (.md or .txt)
  const sections = text.split(/\n(?=##?\s+)/g);
  const entries = sections.map((sec, idx) => {
    const lines = sec.trim().split('\n');
    let title = `Imported Reflection ${idx + 1}`;
    let content = sec.trim();
    let mood: MoodType = 'neutral';
    let tags: string[] = ['imported'];

    if (lines[0].startsWith('#')) {
      title = lines[0].replace(/^#+\s*/, '').trim();
      content = lines.slice(1).join('\n').trim();
    }

    // Extract tags from #tag patterns
    const tagMatches = content.match(/#([a-zA-Z0-9_-]+)/g);
    if (tagMatches) {
      tags = Array.from(new Set([...tags, ...tagMatches.map(t => t.replace('#', ''))]));
    }

    return {
      title,
      content,
      mood,
      tags,
      folder: 'Imported',
      createdAt: new Date().toISOString(),
    };
  }).filter(e => e.content.length > 0);

  return { entries, format: 'markdown', filename: file.name };
}
