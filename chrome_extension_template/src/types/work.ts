/**
 * Work types and interfaces for ORCID Works Manager
 * Based on ORCID API schema and common bibliographic formats
 */

export type WorkType =
  | 'ANNOTATION'
  | 'ARTISTIC_PERFORMANCE'
  | 'BOOK'
  | 'BOOK_CHAPTER'
  | 'BOOK_REVIEW'
  | 'CONFERENCE_ABSTRACT'
  | 'CONFERENCE_PAPER'
  | 'CONFERENCE_POSTER'
  | 'DATA_SET'
  | 'DICTIONARY_ENTRY'
  | 'DISCLOSURE'
  | 'DISSERTATION_THESIS'
  | 'EDITED_BOOK'
  | 'ENCYCLOPEDIA_ENTRY'
  | 'INVENTION'
  | 'JOURNAL_ARTICLE'
  | 'JOURNAL_ISSUE'
  | 'LECTURE_SPEECH'
  | 'LICENSE'
  | 'MAGAZINE_ARTICLE'
  | 'MANUAL'
  | 'NEWSLETTER_ARTICLE'
  | 'NEWSPAPER_ARTICLE'
  | 'ONLINE_RESOURCE'
  | 'OTHER'
  | 'PATENT'
  | 'PHYSICAL_OBJECT'
  | 'PREPRINT'
  | 'REGISTERED_COPYRIGHT'
  | 'REPORT'
  | 'RESEARCH_TECHNIQUE'
  | 'RESEARCH_TOOL'
  | 'SOFTWARE'
  | 'SPIN_OFF_COMPANY'
  | 'STANDARDS_AND_POLICY'
  | 'SUPERVISED_STUDENT_PUBLICATION'
  | 'TECHNICAL_STANDARD'
  | 'TEST'
  | 'TRADEMARK'
  | 'TRANSLATION'
  | 'WEBSITE'
  | 'WORKING_PAPER';

export type VisibilityType = 'PUBLIC' | 'LIMITED' | 'PRIVATE';

export type IdentifierType =
  | 'DOI'
  | 'PMID'
  | 'PMCID'
  | 'ARXIV'
  | 'ISBN'
  | 'ISSN'
  | 'EID'
  | 'HANDLE'
  | 'URI'
  | 'URN'
  | 'OTHER';

export interface Contributor {
  name: string;
  orcid?: string;
  role?: string;
  sequence?: 'FIRST' | 'ADDITIONAL';
}

export interface ExternalIdentifier {
  type: IdentifierType;
  value: string;
  url?: string;
  relationship?: 'SELF' | 'PART_OF' | 'VERSION_OF';
}

export interface PublicationDate {
  year?: string;
  month?: string;
  day?: string;
}

export interface Work {
  // Internal ID for local tracking
  id: string;
  
  // ORCID-specific
  putCode?: string; // ORCID put-code for existing works
  source?: string;
  visibility?: VisibilityType;
  
  // Core metadata
  title: string;
  subtitle?: string;
  type: WorkType;
  
  // Publication info
  journalTitle?: string;
  publicationDate?: PublicationDate;
  
  // Identifiers
  externalIdentifiers: ExternalIdentifier[];
  url?: string;
  
  // Contributors
  contributors: Contributor[];
  
  // Additional metadata
  languageCode?: string; // ISO 639-1 code
  country?: string; // ISO 3166-1 alpha-2 code
  shortDescription?: string;
  citation?: {
    type: 'BIBTEX' | 'RIS' | 'FORMATTED_APA' | 'FORMATTED_CHICAGO' | 'FORMATTED_IEEE' | 'FORMATTED_MLA' | 'FORMATTED_UNSPECIFIED' | 'FORMATTED_VANCOUVER';
    value: string;
  };
  
  // Local metadata
  locallyModified?: boolean;
  importSource?: 'orcid' | 'bibtex' | 'csl-json' | 'ris' | 'csv';
  importedAt?: string; // ISO 8601 timestamp
  lastModified?: string; // ISO 8601 timestamp
}

export interface WorkDiff {
  workId: string;
  action: 'ADD' | 'UPDATE' | 'DELETE';
  changes?: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
}

export interface DuplicateCluster {
  id: string;
  works: Work[];
  matchReason: 'PID' | 'FUZZY' | 'MANUAL';
  pidType?: IdentifierType;
  confidence: number; // 0-1
}
