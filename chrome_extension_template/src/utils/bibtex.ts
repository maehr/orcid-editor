/**
 * BibTeX parser for importing works
 */

import { Work, WorkType, ExternalIdentifier, Contributor } from '../types/work';

interface BibTeXEntry {
  type: string;
  key: string;
  fields: Record<string, string>;
}

/**
 * Parse BibTeX content into works
 */
export function parseBibTeX(content: string): Work[] {
  const entries = parseBibTeXEntries(content);
  return entries.map(entry => convertBibTeXToWork(entry));
}

/**
 * Parse BibTeX string into structured entries
 * 
 * Note: This is a simplified parser that handles basic BibTeX entries.
 * It does not handle nested braces or escaped quotes within field values.
 * For production use with complex BibTeX files, consider using a full parser library.
 */
function parseBibTeXEntries(content: string): BibTeXEntry[] {
  const entries: BibTeXEntry[] = [];
  
  // Simple regex-based parser for BibTeX entries
  const entryRegex = /@(\w+)\s*\{\s*([^,\s]+)\s*,([^}]*)\}/gi;
  let match;
  
  while ((match = entryRegex.exec(content)) !== null) {
    const type = match[1].toLowerCase();
    const key = match[2];
    const fieldsStr = match[3];
    
    const fields: Record<string, string> = {};
    const fieldRegex = /(\w+)\s*=\s*\{([^}]*)\}|(\w+)\s*=\s*"([^"]*)"/g;
    let fieldMatch;
    
    while ((fieldMatch = fieldRegex.exec(fieldsStr)) !== null) {
      const fieldName = (fieldMatch[1] || fieldMatch[3]).toLowerCase();
      const fieldValue = fieldMatch[2] || fieldMatch[4];
      fields[fieldName] = fieldValue.trim();
    }
    
    entries.push({ type, key, fields });
  }
  
  return entries;
}

/**
 * Convert a BibTeX entry to a Work object
 */
function convertBibTeXToWork(entry: BibTeXEntry): Work {
  const work: Work = {
    id: crypto.randomUUID(),
    title: entry.fields.title || 'Untitled',
    type: mapBibTeXTypeToWorkType(entry.type),
    externalIdentifiers: extractIdentifiers(entry.fields),
    contributors: extractContributors(entry.fields),
    importSource: 'bibtex',
    importedAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
  };
  
  // Publication date
  if (entry.fields.year) {
    work.publicationDate = { year: entry.fields.year };
    if (entry.fields.month) {
      work.publicationDate.month = entry.fields.month;
    }
  }
  
  // Journal title
  if (entry.fields.journal) {
    work.journalTitle = entry.fields.journal;
  } else if (entry.fields.booktitle) {
    work.journalTitle = entry.fields.booktitle;
  }
  
  // URL
  if (entry.fields.url) {
    work.url = entry.fields.url;
  }
  
  // Abstract as short description
  if (entry.fields.abstract) {
    work.shortDescription = entry.fields.abstract;
  }
  
  return work;
}

/**
 * Map BibTeX entry type to ORCID Work type
 */
function mapBibTeXTypeToWorkType(bibtexType: string): WorkType {
  const typeMap: Record<string, WorkType> = {
    'article': 'JOURNAL_ARTICLE',
    'book': 'BOOK',
    'inbook': 'BOOK_CHAPTER',
    'incollection': 'BOOK_CHAPTER',
    'inproceedings': 'CONFERENCE_PAPER',
    'conference': 'CONFERENCE_PAPER',
    'proceedings': 'CONFERENCE_PAPER',
    'mastersthesis': 'DISSERTATION_THESIS',
    'phdthesis': 'DISSERTATION_THESIS',
    'techreport': 'REPORT',
    'manual': 'MANUAL',
    'unpublished': 'PREPRINT',
    'misc': 'OTHER',
  };
  
  return typeMap[bibtexType.toLowerCase()] || 'OTHER';
}

/**
 * Extract external identifiers from BibTeX fields
 */
function extractIdentifiers(fields: Record<string, string>): ExternalIdentifier[] {
  const identifiers: ExternalIdentifier[] = [];
  
  if (fields.doi) {
    identifiers.push({
      type: 'DOI',
      value: fields.doi,
      url: `https://doi.org/${fields.doi}`,
      relationship: 'SELF',
    });
  }
  
  if (fields.pmid) {
    identifiers.push({
      type: 'PMID',
      value: fields.pmid,
      relationship: 'SELF',
    });
  }
  
  if (fields.arxiv || fields.eprint) {
    const arxivId = fields.arxiv || fields.eprint;
    identifiers.push({
      type: 'ARXIV',
      value: arxivId,
      url: `https://arxiv.org/abs/${arxivId}`,
      relationship: 'SELF',
    });
  }
  
  if (fields.isbn) {
    identifiers.push({
      type: 'ISBN',
      value: fields.isbn,
      relationship: 'SELF',
    });
  }
  
  if (fields.issn) {
    identifiers.push({
      type: 'ISSN',
      value: fields.issn,
      relationship: 'SELF',
    });
  }
  
  return identifiers;
}

/**
 * Extract contributors from BibTeX fields
 */
function extractContributors(fields: Record<string, string>): Contributor[] {
  const contributors: Contributor[] = [];
  
  // Parse authors
  if (fields.author) {
    const authors = parseNames(fields.author);
    authors.forEach((name, index) => {
      contributors.push({
        name,
        role: 'AUTHOR',
        sequence: index === 0 ? 'FIRST' : 'ADDITIONAL',
      });
    });
  }
  
  // Parse editors
  if (fields.editor) {
    const editors = parseNames(fields.editor);
    editors.forEach((name) => {
      contributors.push({
        name,
        role: 'EDITOR',
        sequence: 'ADDITIONAL',
      });
    });
  }
  
  return contributors;
}

/**
 * Parse BibTeX name field into individual names
 * Handles formats like "Last, First and Last2, First2"
 */
function parseNames(nameField: string): string[] {
  const names: string[] = [];
  
  // Split by "and"
  const nameParts = nameField.split(/\s+and\s+/i);
  
  nameParts.forEach(part => {
    const trimmed = part.trim();
    if (trimmed) {
      // Handle "Last, First" format
      if (trimmed.includes(',')) {
        const [last, first] = trimmed.split(',').map(s => s.trim());
        names.push(`${first} ${last}`);
      } else {
        names.push(trimmed);
      }
    }
  });
  
  return names;
}

/**
 * Export works to BibTeX format
 */
export function exportToBibTeX(works: Work[]): string {
  let bibtex = '';
  
  works.forEach((work, index) => {
    const key = generateBibTeXKey(work, index);
    const type = mapWorkTypeToBibTeX(work.type);
    
    bibtex += `@${type}{${key},\n`;
    
    // Title
    bibtex += `  title = {${work.title}},\n`;
    
    // Authors
    if (work.contributors.length > 0) {
      const authors = work.contributors
        .filter(c => c.role === 'AUTHOR' || !c.role)
        .map(c => c.name)
        .join(' and ');
      if (authors) {
        bibtex += `  author = {${authors}},\n`;
      }
    }
    
    // Year
    if (work.publicationDate?.year) {
      bibtex += `  year = {${work.publicationDate.year}},\n`;
    }
    
    // Journal
    if (work.journalTitle) {
      bibtex += `  journal = {${work.journalTitle}},\n`;
    }
    
    // DOI
    const doi = work.externalIdentifiers.find(id => id.type === 'DOI');
    if (doi) {
      bibtex += `  doi = {${doi.value}},\n`;
    }
    
    // URL
    if (work.url) {
      bibtex += `  url = {${work.url}},\n`;
    }
    
    bibtex += '}\n\n';
  });
  
  return bibtex;
}

/**
 * Generate a BibTeX citation key
 */
function generateBibTeXKey(work: Work, index: number): string {
  const firstAuthor = work.contributors.find(c => c.sequence === 'FIRST');
  const year = work.publicationDate?.year || 'NODATE';
  
  if (firstAuthor) {
    const lastName = firstAuthor.name.split(' ').pop() || 'Unknown';
    return `${lastName}${year}`;
  }
  
  return `work${index + 1}`;
}

/**
 * Map ORCID Work type to BibTeX type
 */
function mapWorkTypeToBibTeX(workType: WorkType): string {
  const typeMap: Record<WorkType, string> = {
    'JOURNAL_ARTICLE': 'article',
    'BOOK': 'book',
    'BOOK_CHAPTER': 'inbook',
    'CONFERENCE_PAPER': 'inproceedings',
    'CONFERENCE_ABSTRACT': 'inproceedings',
    'CONFERENCE_POSTER': 'inproceedings',
    'DISSERTATION_THESIS': 'phdthesis',
    'REPORT': 'techreport',
    'MANUAL': 'manual',
    'PREPRINT': 'unpublished',
    'PATENT': 'misc',
    'SOFTWARE': 'misc',
    'DATA_SET': 'misc',
    'WORKING_PAPER': 'unpublished',
    'ANNOTATION': 'misc',
    'ARTISTIC_PERFORMANCE': 'misc',
    'BOOK_REVIEW': 'article',
    'DICTIONARY_ENTRY': 'inbook',
    'DISCLOSURE': 'misc',
    'EDITED_BOOK': 'book',
    'ENCYCLOPEDIA_ENTRY': 'inbook',
    'INVENTION': 'misc',
    'JOURNAL_ISSUE': 'misc',
    'LECTURE_SPEECH': 'misc',
    'LICENSE': 'misc',
    'MAGAZINE_ARTICLE': 'article',
    'NEWSLETTER_ARTICLE': 'article',
    'NEWSPAPER_ARTICLE': 'article',
    'ONLINE_RESOURCE': 'misc',
    'OTHER': 'misc',
    'PHYSICAL_OBJECT': 'misc',
    'REGISTERED_COPYRIGHT': 'misc',
    'RESEARCH_TECHNIQUE': 'misc',
    'RESEARCH_TOOL': 'misc',
    'SPIN_OFF_COMPANY': 'misc',
    'STANDARDS_AND_POLICY': 'misc',
    'SUPERVISED_STUDENT_PUBLICATION': 'misc',
    'TECHNICAL_STANDARD': 'techreport',
    'TEST': 'misc',
    'TRADEMARK': 'misc',
    'TRANSLATION': 'book',
    'WEBSITE': 'misc',
  };
  
  return typeMap[workType] || 'misc';
}
