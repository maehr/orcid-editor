/**
 * Deduplication utilities for finding and merging duplicate works
 */

import { Work, DuplicateCluster } from '../types/work';

/**
 * Find duplicate works using PID-based and fuzzy matching
 */
export function findDuplicates(works: Work[]): DuplicateCluster[] {
  const clusters: DuplicateCluster[] = [];
  const processed = new Set<string>();
  
  // First pass: PID-based clustering
  for (const work of works) {
    if (processed.has(work.id)) continue;
    
    const pidCluster = findPIDMatches(work, works, processed);
    if (pidCluster) {
      clusters.push(pidCluster);
      pidCluster.works.forEach(w => processed.add(w.id));
    }
  }
  
  // Second pass: Fuzzy matching for works without PIDs
  for (const work of works) {
    if (processed.has(work.id)) continue;
    
    const fuzzyCluster = findFuzzyMatches(work, works, processed);
    if (fuzzyCluster) {
      clusters.push(fuzzyCluster);
      fuzzyCluster.works.forEach(w => processed.add(w.id));
    }
  }
  
  return clusters;
}

/**
 * Find works that match based on persistent identifiers (DOI, PMID, etc.)
 */
function findPIDMatches(
  work: Work,
  allWorks: Work[],
  processed: Set<string>
): DuplicateCluster | null {
  const matches: Work[] = [work];
  
  // Check each identifier type
  for (const id of work.externalIdentifiers) {
    const idType = id.type;
    const idValue = normalizeIdentifier(id.value);
    
    for (const other of allWorks) {
      if (other.id === work.id || processed.has(other.id)) continue;
      
      // Check if other work has the same identifier
      const matchingId = other.externalIdentifiers.find(
        otherId => otherId.type === idType && normalizeIdentifier(otherId.value) === idValue
      );
      
      if (matchingId && !matches.some(m => m.id === other.id)) {
        matches.push(other);
      }
    }
  }
  
  if (matches.length > 1) {
    // Determine which PID type was used for matching
    const pidType = work.externalIdentifiers[0]?.type;
    
    return {
      id: crypto.randomUUID(),
      works: matches,
      matchReason: 'PID',
      pidType: pidType,
      confidence: 1.0,
    };
  }
  
  return null;
}

/**
 * Find works that match based on fuzzy title and year matching
 */
function findFuzzyMatches(
  work: Work,
  allWorks: Work[],
  processed: Set<string>
): DuplicateCluster | null {
  const matches: Work[] = [work];
  
  const workYear = work.publicationDate?.year ? parseInt(work.publicationDate.year) : null;
  const workTitle = normalizeTitle(work.title);
  const workFirstAuthor = getFirstAuthorSurname(work);
  
  for (const other of allWorks) {
    if (other.id === work.id || processed.has(other.id)) continue;
    
    const otherYear = other.publicationDate?.year ? parseInt(other.publicationDate.year) : null;
    const otherTitle = normalizeTitle(other.title);
    const otherFirstAuthor = getFirstAuthorSurname(other);
    
    // Check year similarity (within 1 year)
    const yearMatch = workYear && otherYear && Math.abs(workYear - otherYear) <= 1;
    
    // Check title similarity using token set ratio
    const titleSimilarity = calculateTitleSimilarity(workTitle, otherTitle);
    
    // Check first author match
    const authorMatch = workFirstAuthor && otherFirstAuthor && 
      workFirstAuthor.toLowerCase() === otherFirstAuthor.toLowerCase();
    
    // Consider it a match if:
    // - Title similarity >= 0.9 AND (year match OR author match)
    // - Title similarity >= 0.95 (even without year/author match)
    const isMatch = 
      (titleSimilarity >= 0.9 && (yearMatch || authorMatch)) ||
      titleSimilarity >= 0.95;
    
    if (isMatch && !matches.some(m => m.id === other.id)) {
      matches.push(other);
    }
  }
  
  if (matches.length > 1) {
    // Calculate average confidence based on title similarity
    const avgSimilarity = matches.slice(1).reduce((sum, other) => {
      return sum + calculateTitleSimilarity(workTitle, normalizeTitle(other.title));
    }, 0) / (matches.length - 1);
    
    return {
      id: crypto.randomUUID(),
      works: matches,
      matchReason: 'FUZZY',
      confidence: avgSimilarity,
    };
  }
  
  return null;
}

/**
 * Normalize an identifier value (remove spaces, hyphens, lowercase)
 */
function normalizeIdentifier(value: string): string {
  return value.toLowerCase().replace(/[-\s]/g, '');
}

/**
 * Normalize a title for comparison
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')     // Normalize spaces
    .trim();
}

/**
 * Get the first author's surname
 */
function getFirstAuthorSurname(work: Work): string | null {
  const firstAuthor = work.contributors.find(c => c.sequence === 'FIRST');
  if (!firstAuthor) return null;
  
  // Assume last word is surname
  const parts = firstAuthor.name.trim().split(/\s+/);
  return parts[parts.length - 1];
}

/**
 * Calculate title similarity using token set ratio
 * Returns a value between 0 and 1
 */
function calculateTitleSimilarity(title1: string, title2: string): number {
  const tokens1 = new Set(title1.split(/\s+/).filter(t => t.length > 0));
  const tokens2 = new Set(title2.split(/\s+/).filter(t => t.length > 0));
  
  // Handle empty sets
  if (tokens1.size === 0 && tokens2.size === 0) {
    return 1.0; // Both empty, consider them identical
  }
  if (tokens1.size === 0 || tokens2.size === 0) {
    return 0.0; // One empty, one not
  }
  
  const intersection = new Set([...tokens1].filter(t => tokens2.has(t)));
  const union = new Set([...tokens1, ...tokens2]);
  
  // Jaccard similarity (union.size cannot be 0 here due to checks above)
  return intersection.size / union.size;
}

/**
 * Merge multiple works into one, preferring more complete data
 */
export function mergeWorks(works: Work[]): Work {
  if (works.length === 0) {
    throw new Error('Cannot merge empty array of works');
  }
  
  if (works.length === 1) {
    return works[0];
  }
  
  // Start with the work that has the most external identifiers (likely most complete)
  const sorted = [...works].sort((a, b) => 
    b.externalIdentifiers.length - a.externalIdentifiers.length
  );
  
  const merged: Work = {
    ...sorted[0],
    id: crypto.randomUUID(),
    locallyModified: true,
    lastModified: new Date().toISOString(),
  };
  
  // Merge identifiers from all works
  const seenIdentifiers = new Set<string>();
  merged.externalIdentifiers = [];
  
  for (const work of works) {
    for (const id of work.externalIdentifiers) {
      const key = `${id.type}:${normalizeIdentifier(id.value)}`;
      if (!seenIdentifiers.has(key)) {
        merged.externalIdentifiers.push(id);
        seenIdentifiers.add(key);
      }
    }
  }
  
  // Merge contributors
  const seenContributors = new Set<string>();
  merged.contributors = [];
  
  for (const work of works) {
    for (const contrib of work.contributors) {
      const key = `${contrib.name}:${contrib.role || 'AUTHOR'}`;
      if (!seenContributors.has(key)) {
        merged.contributors.push(contrib);
        seenContributors.add(key);
      }
    }
  }
  
  // Use longest title
  for (const work of works) {
    if (work.title.length > merged.title.length) {
      merged.title = work.title;
    }
  }
  
  // Prefer works with journal title
  if (!merged.journalTitle) {
    for (const work of works) {
      if (work.journalTitle) {
        merged.journalTitle = work.journalTitle;
        break;
      }
    }
  }
  
  // Prefer works with URL
  if (!merged.url) {
    for (const work of works) {
      if (work.url) {
        merged.url = work.url;
        break;
      }
    }
  }
  
  // Prefer works with abstract
  if (!merged.shortDescription) {
    for (const work of works) {
      if (work.shortDescription) {
        merged.shortDescription = work.shortDescription;
        break;
      }
    }
  }
  
  return merged;
}
