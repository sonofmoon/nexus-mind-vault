import { describe, it, expect } from 'vitest';
import { parseImportFile } from '../utils/vaultImportHelper';

describe('📥 External Data Importer (Markdown & JSON)', () => {
  it('should parse Markdown formatted entries with titles and tags', async () => {
    const markdownContent = `# Morning Reflection
Today was a productive day focused on cryptography. #focus #crypto

# Evening Gratitude
Grateful for peaceful evening walks. #mindful
`;

    const mockFile = new File([markdownContent], 'reflections.md', { type: 'text/markdown' });
    const result = await parseImportFile(mockFile);

    expect(result.format).toBe('markdown');
    expect(result.entries.length).toBe(2);
    expect(result.entries[0].title).toBe('Morning Reflection');
    expect(result.entries[0].tags).toContain('focus');
    expect(result.entries[1].title).toBe('Evening Gratitude');
  });

  it('should parse JSON export arrays into journal entries', async () => {
    const jsonContent = JSON.stringify([
      { title: 'Project Launch', content: 'Launched v2.0 successfully', mood: 'energetic', tags: ['launch'] }
    ]);

    const mockFile = new File([jsonContent], 'backup.json', { type: 'application/json' });
    const result = await parseImportFile(mockFile);

    expect(result.format).toBe('json');
    expect(result.entries.length).toBe(1);
    expect(result.entries[0].title).toBe('Project Launch');
    expect(result.entries[0].mood).toBe('energetic');
  });
});
