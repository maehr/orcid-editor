/**
 * CSV parser for importing works
 * Simple CSV format with common fields
 */

import { Work, WorkType } from '../types/work';

/**
 * Parse CSV content into works
 */
export function parseCSV(content: string): Work[] {
  const lines = content.split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }
  
  // Parse header
  const headers = parseCSVLine(lines[0]);
  
  // Parse data rows
  const works: Work[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    const values = parseCSVLine(line);
    if (values.length === 0) continue;
    
    const rowData: Record<string, string> = {};
    headers.forEach((header, index) => {
      rowData[header.toLowerCase().trim()] = values[index] || '';
    });
    
    const work = convertCSVRowToWork(rowData);
    works.push(work);
  }
  
  return works;
}

/**
 * Parse a CSV line handling quotes and commas
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      // Check for escaped quote
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  return values;
}

/**
 * Convert a CSV row to a Work object
 */
function convertCSVRowToWork(row: Record<string, string>): Work {
  const work: Work = {
    id: crypto.randomUUID(),
    title: row['title'] || 'Untitled',
    type: parseWorkType(row['type']) || 'OTHER',
    externalIdentifiers: [],
    contributors: [],
    importSource: 'csv',
    importedAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
  };
  
  // Authors
  if (row['authors'] || row['author']) {
    const authors = (row['authors'] || row['author']).split(';');
    authors.forEach((name, index) => {
      const trimmed = name.trim();
      if (trimmed) {
        work.contributors.push({
          name: trimmed,
          role: 'AUTHOR',
          sequence: index === 0 ? 'FIRST' : 'ADDITIONAL',
        });
      }
    });
  }
  
  // Year
  if (row['year']) {
    work.publicationDate = { year: row['year'] };
  }
  
  // Journal
  if (row['journal'] || row['container']) {
    work.journalTitle = row['journal'] || row['container'];
  }
  
  // DOI
  if (row['doi']) {
    work.externalIdentifiers.push({
      type: 'DOI',
      value: row['doi'],
      url: `https://doi.org/${row['doi']}`,
      relationship: 'SELF',
    });
  }
  
  // PMID
  if (row['pmid']) {
    work.externalIdentifiers.push({
      type: 'PMID',
      value: row['pmid'],
      relationship: 'SELF',
    });
  }
  
  // ISBN
  if (row['isbn']) {
    work.externalIdentifiers.push({
      type: 'ISBN',
      value: row['isbn'],
      relationship: 'SELF',
    });
  }
  
  // ISSN
  if (row['issn']) {
    work.externalIdentifiers.push({
      type: 'ISSN',
      value: row['issn'],
      relationship: 'SELF',
    });
  }
  
  // URL
  if (row['url']) {
    work.url = row['url'];
  }
  
  // Abstract
  if (row['abstract']) {
    work.shortDescription = row['abstract'];
  }
  
  // Language
  if (row['language']) {
    work.languageCode = row['language'];
  }
  
  return work;
}

/**
 * Parse work type string to WorkType enum
 */
function parseWorkType(typeStr: string): WorkType | null {
  if (!typeStr) return null;
  
  const normalized = typeStr.toUpperCase().replace(/[-\s]/g, '_');
  
  // Try exact match first
  const validTypes: WorkType[] = [
    'ANNOTATION', 'ARTISTIC_PERFORMANCE', 'BOOK', 'BOOK_CHAPTER', 'BOOK_REVIEW',
    'CONFERENCE_ABSTRACT', 'CONFERENCE_PAPER', 'CONFERENCE_POSTER', 'DATA_SET',
    'DICTIONARY_ENTRY', 'DISCLOSURE', 'DISSERTATION_THESIS', 'EDITED_BOOK',
    'ENCYCLOPEDIA_ENTRY', 'INVENTION', 'JOURNAL_ARTICLE', 'JOURNAL_ISSUE',
    'LECTURE_SPEECH', 'LICENSE', 'MAGAZINE_ARTICLE', 'MANUAL', 'NEWSLETTER_ARTICLE',
    'NEWSPAPER_ARTICLE', 'ONLINE_RESOURCE', 'OTHER', 'PATENT', 'PHYSICAL_OBJECT',
    'PREPRINT', 'REGISTERED_COPYRIGHT', 'REPORT', 'RESEARCH_TECHNIQUE',
    'RESEARCH_TOOL', 'SOFTWARE', 'SPIN_OFF_COMPANY', 'STANDARDS_AND_POLICY',
    'SUPERVISED_STUDENT_PUBLICATION', 'TECHNICAL_STANDARD', 'TEST', 'TRADEMARK',
    'TRANSLATION', 'WEBSITE', 'WORKING_PAPER'
  ];
  
  if (validTypes.includes(normalized as WorkType)) {
    return normalized as WorkType;
  }
  
  // Try common aliases
  const aliasMap: Record<string, WorkType> = {
    'ARTICLE': 'JOURNAL_ARTICLE',
    'CHAPTER': 'BOOK_CHAPTER',
    'CONFERENCE': 'CONFERENCE_PAPER',
    'THESIS': 'DISSERTATION_THESIS',
    'DATASET': 'DATA_SET',
  };
  
  if (aliasMap[normalized]) {
    return aliasMap[normalized];
  }
  
  return null;
}

/**
 * Export works to CSV format
 */
export function exportToCSV(works: Work[]): string {
  const headers = [
    'Title',
    'Type',
    'Authors',
    'Year',
    'Journal',
    'DOI',
    'PMID',
    'ISBN',
    'ISSN',
    'URL',
    'Abstract',
    'Language',
  ];
  
  let csv = headers.join(',') + '\n';
  
  works.forEach(work => {
    const row = [
      escapeCSVField(work.title),
      escapeCSVField(work.type),
      escapeCSVField(work.contributors.map(c => c.name).join('; ')),
      escapeCSVField(work.publicationDate?.year || ''),
      escapeCSVField(work.journalTitle || ''),
      escapeCSVField(work.externalIdentifiers.find(id => id.type === 'DOI')?.value || ''),
      escapeCSVField(work.externalIdentifiers.find(id => id.type === 'PMID')?.value || ''),
      escapeCSVField(work.externalIdentifiers.find(id => id.type === 'ISBN')?.value || ''),
      escapeCSVField(work.externalIdentifiers.find(id => id.type === 'ISSN')?.value || ''),
      escapeCSVField(work.url || ''),
      escapeCSVField(work.shortDescription || ''),
      escapeCSVField(work.languageCode || ''),
    ];
    
    csv += row.join(',') + '\n';
  });
  
  return csv;
}

/**
 * Escape a CSV field
 */
function escapeCSVField(field: string): string {
  if (!field) return '';
  
  // If field contains comma, newline, or quote, wrap in quotes and escape quotes
  if (field.includes(',') || field.includes('\n') || field.includes('"')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  
  return field;
}
