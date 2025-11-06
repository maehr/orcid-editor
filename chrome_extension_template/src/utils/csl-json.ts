/**
 * CSL-JSON parser for importing works
 */

import { Work, WorkType, ExternalIdentifier, Contributor } from '../types/work';

interface CSLItem {
  id?: string;
  type: string;
  title?: string;
  'container-title'?: string;
  author?: Array<{ family?: string; given?: string; literal?: string }>;
  editor?: Array<{ family?: string; given?: string; literal?: string }>;
  issued?: { 'date-parts'?: number[][] };
  DOI?: string;
  PMID?: string;
  PMCID?: string;
  ISBN?: string;
  ISSN?: string;
  URL?: string;
  abstract?: string;
  language?: string;
  [key: string]: unknown;
}

/**
 * Parse CSL-JSON content into works
 */
export function parseCSLJSON(content: string): Work[] {
  try {
    const items: CSLItem[] = JSON.parse(content);
    if (!Array.isArray(items)) {
      // Single item, wrap in array
      return [convertCSLToWork(items as CSLItem)];
    }
    return items.map(item => convertCSLToWork(item));
  } catch {
    throw new Error('Invalid CSL-JSON format');
  }
}

/**
 * Convert a CSL-JSON item to a Work object
 */
function convertCSLToWork(item: CSLItem): Work {
  const work: Work = {
    id: crypto.randomUUID(),
    title: item.title || 'Untitled',
    type: mapCSLTypeToWorkType(item.type),
    externalIdentifiers: extractIdentifiers(item),
    contributors: extractContributors(item),
    importSource: 'csl-json',
    importedAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
  };
  
  // Publication date
  if (item.issued?.['date-parts']?.[0]) {
    const dateParts = item.issued['date-parts'][0];
    work.publicationDate = {
      year: dateParts[0]?.toString(),
      month: dateParts[1]?.toString(),
      day: dateParts[2]?.toString(),
    };
  }
  
  // Journal/container title
  if (item['container-title']) {
    work.journalTitle = item['container-title'];
  }
  
  // URL
  if (item.URL) {
    work.url = item.URL;
  }
  
  // Abstract
  if (item.abstract) {
    work.shortDescription = item.abstract;
  }
  
  // Language
  if (item.language) {
    work.languageCode = item.language;
  }
  
  return work;
}

/**
 * Map CSL-JSON type to ORCID Work type
 */
function mapCSLTypeToWorkType(cslType: string): WorkType {
  const typeMap: Record<string, WorkType> = {
    'article': 'JOURNAL_ARTICLE',
    'article-journal': 'JOURNAL_ARTICLE',
    'article-magazine': 'MAGAZINE_ARTICLE',
    'article-newspaper': 'NEWSPAPER_ARTICLE',
    'book': 'BOOK',
    'chapter': 'BOOK_CHAPTER',
    'dataset': 'DATA_SET',
    'entry': 'ENCYCLOPEDIA_ENTRY',
    'entry-dictionary': 'DICTIONARY_ENTRY',
    'entry-encyclopedia': 'ENCYCLOPEDIA_ENTRY',
    'manuscript': 'PREPRINT',
    'paper-conference': 'CONFERENCE_PAPER',
    'patent': 'PATENT',
    'report': 'REPORT',
    'review': 'BOOK_REVIEW',
    'review-book': 'BOOK_REVIEW',
    'software': 'SOFTWARE',
    'speech': 'LECTURE_SPEECH',
    'thesis': 'DISSERTATION_THESIS',
    'webpage': 'WEBSITE',
  };
  
  return typeMap[cslType.toLowerCase()] || 'OTHER';
}

/**
 * Extract external identifiers from CSL-JSON item
 */
function extractIdentifiers(item: CSLItem): ExternalIdentifier[] {
  const identifiers: ExternalIdentifier[] = [];
  
  if (item.DOI) {
    identifiers.push({
      type: 'DOI',
      value: item.DOI,
      url: `https://doi.org/${item.DOI}`,
      relationship: 'SELF',
    });
  }
  
  if (item.PMID) {
    identifiers.push({
      type: 'PMID',
      value: item.PMID.toString(),
      relationship: 'SELF',
    });
  }
  
  if (item.PMCID) {
    identifiers.push({
      type: 'PMCID',
      value: item.PMCID,
      relationship: 'SELF',
    });
  }
  
  if (item.ISBN) {
    identifiers.push({
      type: 'ISBN',
      value: item.ISBN,
      relationship: 'SELF',
    });
  }
  
  if (item.ISSN) {
    identifiers.push({
      type: 'ISSN',
      value: item.ISSN,
      relationship: 'SELF',
    });
  }
  
  return identifiers;
}

/**
 * Extract contributors from CSL-JSON item
 */
function extractContributors(item: CSLItem): Contributor[] {
  const contributors: Contributor[] = [];
  
  // Authors
  if (item.author) {
    item.author.forEach((author, index) => {
      contributors.push({
        name: formatCSLName(author),
        role: 'AUTHOR',
        sequence: index === 0 ? 'FIRST' : 'ADDITIONAL',
      });
    });
  }
  
  // Editors
  if (item.editor) {
    item.editor.forEach((editor) => {
      contributors.push({
        name: formatCSLName(editor),
        role: 'EDITOR',
        sequence: 'ADDITIONAL',
      });
    });
  }
  
  return contributors;
}

/**
 * Format CSL-JSON name object to string
 */
function formatCSLName(name: { family?: string; given?: string; literal?: string }): string {
  if (name.literal) {
    return name.literal;
  }
  
  const parts: string[] = [];
  if (name.given) parts.push(name.given);
  if (name.family) parts.push(name.family);
  
  return parts.join(' ') || 'Unknown';
}

/**
 * Export works to CSL-JSON format
 */
export function exportToCSLJSON(works: Work[]): string {
  const items = works.map(work => convertWorkToCSL(work));
  return JSON.stringify(items, null, 2);
}

/**
 * Convert a Work object to CSL-JSON item
 */
function convertWorkToCSL(work: Work): CSLItem {
  const item: CSLItem = {
    id: work.id,
    type: mapWorkTypeToCSL(work.type),
    title: work.title,
  };
  
  // Authors
  if (work.contributors.length > 0) {
    const authors = work.contributors
      .filter(c => c.role === 'AUTHOR' || !c.role)
      .map(c => parseNameToCSL(c.name));
    if (authors.length > 0) {
      item.author = authors;
    }
    
    const editors = work.contributors
      .filter(c => c.role === 'EDITOR')
      .map(c => parseNameToCSL(c.name));
    if (editors.length > 0) {
      item.editor = editors;
    }
  }
  
  // Publication date
  if (work.publicationDate) {
    const dateParts: number[] = [];
    if (work.publicationDate.year) dateParts.push(parseInt(work.publicationDate.year));
    if (work.publicationDate.month) dateParts.push(parseInt(work.publicationDate.month));
    if (work.publicationDate.day) dateParts.push(parseInt(work.publicationDate.day));
    
    if (dateParts.length > 0) {
      item.issued = { 'date-parts': [dateParts] };
    }
  }
  
  // Container title
  if (work.journalTitle) {
    item['container-title'] = work.journalTitle;
  }
  
  // Identifiers
  work.externalIdentifiers.forEach(id => {
    switch (id.type) {
      case 'DOI':
        item.DOI = id.value;
        break;
      case 'PMID':
        item.PMID = id.value;
        break;
      case 'PMCID':
        item.PMCID = id.value;
        break;
      case 'ISBN':
        item.ISBN = id.value;
        break;
      case 'ISSN':
        item.ISSN = id.value;
        break;
    }
  });
  
  // URL
  if (work.url) {
    item.URL = work.url;
  }
  
  // Abstract
  if (work.shortDescription) {
    item.abstract = work.shortDescription;
  }
  
  // Language
  if (work.languageCode) {
    item.language = work.languageCode;
  }
  
  return item;
}

/**
 * Parse name string to CSL-JSON name object
 */
function parseNameToCSL(name: string): { family?: string; given?: string } {
  const parts = name.trim().split(/\s+/);
  
  if (parts.length === 1) {
    return { family: parts[0] };
  }
  
  // Assume last part is family name, rest is given name
  const family = parts[parts.length - 1];
  const given = parts.slice(0, -1).join(' ');
  
  return { family, given };
}

/**
 * Map ORCID Work type to CSL-JSON type
 */
function mapWorkTypeToCSL(workType: WorkType): string {
  const typeMap: Record<WorkType, string> = {
    'JOURNAL_ARTICLE': 'article-journal',
    'MAGAZINE_ARTICLE': 'article-magazine',
    'NEWSPAPER_ARTICLE': 'article-newspaper',
    'BOOK': 'book',
    'BOOK_CHAPTER': 'chapter',
    'DATA_SET': 'dataset',
    'DICTIONARY_ENTRY': 'entry-dictionary',
    'ENCYCLOPEDIA_ENTRY': 'entry-encyclopedia',
    'PREPRINT': 'manuscript',
    'CONFERENCE_PAPER': 'paper-conference',
    'CONFERENCE_ABSTRACT': 'paper-conference',
    'CONFERENCE_POSTER': 'paper-conference',
    'PATENT': 'patent',
    'REPORT': 'report',
    'BOOK_REVIEW': 'review-book',
    'SOFTWARE': 'software',
    'LECTURE_SPEECH': 'speech',
    'DISSERTATION_THESIS': 'thesis',
    'WEBSITE': 'webpage',
    'ANNOTATION': 'article',
    'ARTISTIC_PERFORMANCE': 'article',
    'DISCLOSURE': 'report',
    'EDITED_BOOK': 'book',
    'INVENTION': 'patent',
    'JOURNAL_ISSUE': 'article-journal',
    'LICENSE': 'article',
    'MANUAL': 'book',
    'NEWSLETTER_ARTICLE': 'article',
    'ONLINE_RESOURCE': 'webpage',
    'OTHER': 'article',
    'PHYSICAL_OBJECT': 'article',
    'REGISTERED_COPYRIGHT': 'article',
    'RESEARCH_TECHNIQUE': 'article',
    'RESEARCH_TOOL': 'software',
    'SPIN_OFF_COMPANY': 'article',
    'STANDARDS_AND_POLICY': 'report',
    'SUPERVISED_STUDENT_PUBLICATION': 'thesis',
    'TECHNICAL_STANDARD': 'report',
    'TEST': 'software',
    'TRADEMARK': 'article',
    'TRANSLATION': 'book',
    'WORKING_PAPER': 'manuscript',
  };
  
  return typeMap[workType] || 'article';
}
