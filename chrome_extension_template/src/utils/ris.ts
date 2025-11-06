/**
 * RIS (Research Information Systems) format parser for importing works
 */

import { Work, WorkType, ExternalIdentifier, Contributor } from '../types/work';

interface RISEntry {
  type: string;
  fields: Record<string, string[]>;
}

/**
 * Parse RIS content into works
 */
export function parseRIS(content: string): Work[] {
  const entries = parseRISEntries(content);
  return entries.map(entry => convertRISToWork(entry));
}

/**
 * Parse RIS string into structured entries
 */
function parseRISEntries(content: string): RISEntry[] {
  const entries: RISEntry[] = [];
  const lines = content.split(/\r?\n/);
  
  let currentEntry: RISEntry | null = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) continue;
    
    // Check for tag
    const match = trimmed.match(/^([A-Z][A-Z0-9])\s*-\s*(.*)$/);
    if (!match) continue;
    
    const tag = match[1];
    const value = match[2].trim();
    
    // TY marks start of new entry
    if (tag === 'TY') {
      if (currentEntry) {
        entries.push(currentEntry);
      }
      currentEntry = {
        type: value,
        fields: {},
      };
    } else if (tag === 'ER') {
      // ER marks end of entry
      if (currentEntry) {
        entries.push(currentEntry);
        currentEntry = null;
      }
    } else if (currentEntry) {
      // Add field to current entry
      if (!currentEntry.fields[tag]) {
        currentEntry.fields[tag] = [];
      }
      if (value) {
        currentEntry.fields[tag].push(value);
      }
    }
  }
  
  return entries;
}

/**
 * Convert a RIS entry to a Work object
 */
function convertRISToWork(entry: RISEntry): Work {
  const work: Work = {
    id: crypto.randomUUID(),
    title: entry.fields['TI']?.[0] || entry.fields['T1']?.[0] || 'Untitled',
    type: mapRISTypeToWorkType(entry.type),
    externalIdentifiers: extractIdentifiers(entry.fields),
    contributors: extractContributors(entry.fields),
    importSource: 'ris',
    importedAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
  };
  
  // Publication date
  if (entry.fields['PY']?.[0] || entry.fields['Y1']?.[0]) {
    const year = entry.fields['PY']?.[0] || entry.fields['Y1']?.[0];
    work.publicationDate = { year: year.split('/')[0] };
  }
  
  // Journal title
  if (entry.fields['JO']?.[0] || entry.fields['T2']?.[0]) {
    work.journalTitle = entry.fields['JO']?.[0] || entry.fields['T2']?.[0];
  }
  
  // URL
  if (entry.fields['UR']?.[0]) {
    work.url = entry.fields['UR']?.[0];
  }
  
  // Abstract
  if (entry.fields['AB']?.[0] || entry.fields['N2']?.[0]) {
    work.shortDescription = entry.fields['AB']?.[0] || entry.fields['N2']?.[0];
  }
  
  // Language
  if (entry.fields['LA']?.[0]) {
    work.languageCode = entry.fields['LA']?.[0];
  }
  
  return work;
}

/**
 * Map RIS type to ORCID Work type
 */
function mapRISTypeToWorkType(risType: string): WorkType {
  const typeMap: Record<string, WorkType> = {
    'JOUR': 'JOURNAL_ARTICLE',
    'BOOK': 'BOOK',
    'CHAP': 'BOOK_CHAPTER',
    'CONF': 'CONFERENCE_PAPER',
    'CPAPER': 'CONFERENCE_PAPER',
    'THES': 'DISSERTATION_THESIS',
    'RPRT': 'REPORT',
    'PAT': 'PATENT',
    'COMP': 'SOFTWARE',
    'DATA': 'DATA_SET',
    'MGZN': 'MAGAZINE_ARTICLE',
    'NEWS': 'NEWSPAPER_ARTICLE',
    'ELEC': 'WEBSITE',
    'UNPB': 'PREPRINT',
    'MANSCPT': 'PREPRINT',
    'GEN': 'OTHER',
  };
  
  return typeMap[risType] || 'OTHER';
}

/**
 * Extract external identifiers from RIS fields
 */
function extractIdentifiers(fields: Record<string, string[]>): ExternalIdentifier[] {
  const identifiers: ExternalIdentifier[] = [];
  
  // DOI
  if (fields['DO']?.[0]) {
    identifiers.push({
      type: 'DOI',
      value: fields['DO'][0],
      url: `https://doi.org/${fields['DO'][0]}`,
      relationship: 'SELF',
    });
  }
  
  // PMID
  if (fields['PMID']?.[0]) {
    identifiers.push({
      type: 'PMID',
      value: fields['PMID'][0],
      relationship: 'SELF',
    });
  }
  
  // ISBN
  if (fields['SN']?.[0]) {
    // SN can be ISBN or ISSN, try to determine which
    const sn = fields['SN'][0];
    if (sn.replace(/[-\s]/g, '').length === 13 || sn.replace(/[-\s]/g, '').length === 10) {
      identifiers.push({
        type: 'ISBN',
        value: sn,
        relationship: 'SELF',
      });
    } else {
      identifiers.push({
        type: 'ISSN',
        value: sn,
        relationship: 'SELF',
      });
    }
  }
  
  return identifiers;
}

/**
 * Extract contributors from RIS fields
 */
function extractContributors(fields: Record<string, string[]>): Contributor[] {
  const contributors: Contributor[] = [];
  
  // Authors (AU or A1)
  const authors = fields['AU'] || fields['A1'] || [];
  authors.forEach((name, index) => {
    contributors.push({
      name: formatRISName(name),
      role: 'AUTHOR',
      sequence: index === 0 ? 'FIRST' : 'ADDITIONAL',
    });
  });
  
  // Editors (ED or A2)
  const editors = fields['ED'] || fields['A2'] || [];
  editors.forEach((name) => {
    contributors.push({
      name: formatRISName(name),
      role: 'EDITOR',
      sequence: 'ADDITIONAL',
    });
  });
  
  return contributors;
}

/**
 * Format RIS name (usually "Last, First") to standard format
 */
function formatRISName(name: string): string {
  if (name.includes(',')) {
    const [last, first] = name.split(',').map(s => s.trim());
    return `${first} ${last}`;
  }
  return name;
}

/**
 * Export works to RIS format
 */
export function exportToRIS(works: Work[]): string {
  let ris = '';
  
  works.forEach(work => {
    ris += convertWorkToRIS(work);
    ris += '\n';
  });
  
  return ris;
}

/**
 * Convert a Work object to RIS format
 */
function convertWorkToRIS(work: Work): string {
  let ris = '';
  
  // Type
  const type = mapWorkTypeToRIS(work.type);
  ris += `TY  - ${type}\n`;
  
  // Title
  ris += `TI  - ${work.title}\n`;
  
  // Authors
  work.contributors
    .filter(c => c.role === 'AUTHOR' || !c.role)
    .forEach(author => {
      const name = formatNameToRIS(author.name);
      ris += `AU  - ${name}\n`;
    });
  
  // Editors
  work.contributors
    .filter(c => c.role === 'EDITOR')
    .forEach(editor => {
      const name = formatNameToRIS(editor.name);
      ris += `ED  - ${name}\n`;
    });
  
  // Year
  if (work.publicationDate?.year) {
    ris += `PY  - ${work.publicationDate.year}\n`;
  }
  
  // Journal
  if (work.journalTitle) {
    ris += `JO  - ${work.journalTitle}\n`;
  }
  
  // DOI
  const doi = work.externalIdentifiers.find(id => id.type === 'DOI');
  if (doi) {
    ris += `DO  - ${doi.value}\n`;
  }
  
  // PMID
  const pmid = work.externalIdentifiers.find(id => id.type === 'PMID');
  if (pmid) {
    ris += `PMID- ${pmid.value}\n`;
  }
  
  // ISBN/ISSN
  const isbn = work.externalIdentifiers.find(id => id.type === 'ISBN');
  if (isbn) {
    ris += `SN  - ${isbn.value}\n`;
  } else {
    const issn = work.externalIdentifiers.find(id => id.type === 'ISSN');
    if (issn) {
      ris += `SN  - ${issn.value}\n`;
    }
  }
  
  // URL
  if (work.url) {
    ris += `UR  - ${work.url}\n`;
  }
  
  // Abstract
  if (work.shortDescription) {
    ris += `AB  - ${work.shortDescription}\n`;
  }
  
  // Language
  if (work.languageCode) {
    ris += `LA  - ${work.languageCode}\n`;
  }
  
  // End of record
  ris += 'ER  - \n';
  
  return ris;
}

/**
 * Format name to RIS format (Last, First)
 */
function formatNameToRIS(name: string): string {
  const parts = name.trim().split(/\s+/);
  
  if (parts.length === 1) {
    return parts[0];
  }
  
  // Assume last part is family name
  const family = parts[parts.length - 1];
  const given = parts.slice(0, -1).join(' ');
  
  return `${family}, ${given}`;
}

/**
 * Map ORCID Work type to RIS type
 */
function mapWorkTypeToRIS(workType: WorkType): string {
  const typeMap: Record<WorkType, string> = {
    'JOURNAL_ARTICLE': 'JOUR',
    'BOOK': 'BOOK',
    'BOOK_CHAPTER': 'CHAP',
    'CONFERENCE_PAPER': 'CONF',
    'CONFERENCE_ABSTRACT': 'CONF',
    'CONFERENCE_POSTER': 'CONF',
    'DISSERTATION_THESIS': 'THES',
    'REPORT': 'RPRT',
    'PATENT': 'PAT',
    'SOFTWARE': 'COMP',
    'DATA_SET': 'DATA',
    'MAGAZINE_ARTICLE': 'MGZN',
    'NEWSPAPER_ARTICLE': 'NEWS',
    'WEBSITE': 'ELEC',
    'PREPRINT': 'UNPB',
    'WORKING_PAPER': 'UNPB',
    'ANNOTATION': 'GEN',
    'ARTISTIC_PERFORMANCE': 'GEN',
    'BOOK_REVIEW': 'JOUR',
    'DICTIONARY_ENTRY': 'CHAP',
    'DISCLOSURE': 'RPRT',
    'EDITED_BOOK': 'BOOK',
    'ENCYCLOPEDIA_ENTRY': 'CHAP',
    'INVENTION': 'PAT',
    'JOURNAL_ISSUE': 'JOUR',
    'LECTURE_SPEECH': 'GEN',
    'LICENSE': 'GEN',
    'MANUAL': 'BOOK',
    'NEWSLETTER_ARTICLE': 'MGZN',
    'ONLINE_RESOURCE': 'ELEC',
    'OTHER': 'GEN',
    'PHYSICAL_OBJECT': 'GEN',
    'REGISTERED_COPYRIGHT': 'GEN',
    'RESEARCH_TECHNIQUE': 'GEN',
    'RESEARCH_TOOL': 'COMP',
    'SPIN_OFF_COMPANY': 'GEN',
    'STANDARDS_AND_POLICY': 'RPRT',
    'SUPERVISED_STUDENT_PUBLICATION': 'THES',
    'TECHNICAL_STANDARD': 'RPRT',
    'TEST': 'GEN',
    'TRADEMARK': 'GEN',
    'TRANSLATION': 'BOOK',
  };
  
  return typeMap[workType] || 'GEN';
}
