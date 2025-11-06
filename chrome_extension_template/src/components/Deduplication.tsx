/**
 * Deduplication component for finding and merging duplicate works
 */

import { useState } from 'react';
import { Work, DuplicateCluster } from '../types/work';
import { findDuplicates, mergeWorks } from '../utils/deduplication';
import { saveWork, deleteWork } from '../utils/storage';

interface DeduplicationProps {
  works: Work[];
  onUpdate: () => void;
}

export function Deduplication({ works, onUpdate }: DeduplicationProps) {
  const [clusters, setClusters] = useState<DuplicateCluster[]>([]);
  const [finding, setFinding] = useState(false);
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);

  const handleFindDuplicates = () => {
    setFinding(true);
    try {
      const found = findDuplicates(works);
      setClusters(found);
    } finally {
      setFinding(false);
    }
  };

  const handleMerge = async (cluster: DuplicateCluster) => {
    if (!confirm(`Merge ${cluster.works.length} works into one?`)) {
      return;
    }

    try {
      // Merge the works
      const merged = mergeWorks(cluster.works);
      
      // Save the merged work
      await saveWork(merged);
      
      // Delete the original works (except if we kept one)
      for (const work of cluster.works) {
        await deleteWork(work.id);
      }
      
      // Remove this cluster from the list
      setClusters(clusters.filter(c => c.id !== cluster.id));
      
      // Notify parent to refresh
      onUpdate();
    } catch (error) {
      alert('Failed to merge works: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const toggleCluster = (clusterId: string) => {
    setExpandedCluster(expandedCluster === clusterId ? null : clusterId);
  };

  if (clusters.length === 0 && !finding) {
    return (
      <div className="deduplication">
        <p>Find duplicate works based on DOI, PMID, and fuzzy title matching.</p>
        <button onClick={handleFindDuplicates} disabled={works.length < 2}>
          Find Duplicates
        </button>
        {works.length < 2 && <p className="hint">Need at least 2 works to find duplicates</p>}
      </div>
    );
  }

  if (finding) {
    return <div>Finding duplicates...</div>;
  }

  return (
    <div className="deduplication">
      <div className="dedup-header">
        <h3>Found {clusters.length} duplicate cluster{clusters.length !== 1 ? 's' : ''}</h3>
        <button onClick={handleFindDuplicates}>Refresh</button>
      </div>
      
      {clusters.length === 0 ? (
        <p>No duplicates found! ✓</p>
      ) : (
        <div className="dedup-clusters">
          {clusters.map(cluster => (
            <div key={cluster.id} className="cluster">
              <div className="cluster-header" onClick={() => toggleCluster(cluster.id)}>
                <span className="cluster-title">
                  {cluster.works.length} duplicate works
                  {cluster.matchReason === 'PID' ? (
                    <span className="match-badge pid">PID Match ({cluster.pidType})</span>
                  ) : (
                    <span className="match-badge fuzzy">
                      Fuzzy Match ({Math.round(cluster.confidence * 100)}% confidence)
                    </span>
                  )}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMerge(cluster);
                  }}
                >
                  Merge
                </button>
              </div>
              
              {expandedCluster === cluster.id && (
                <div className="cluster-works">
                  {cluster.works.map(work => (
                    <div key={work.id} className="cluster-work">
                      <div className="work-title">{work.title}</div>
                      <div className="work-meta">
                        {work.contributors.length > 0 && (
                          <span>
                            {work.contributors
                              .filter(c => c.role === 'AUTHOR' || !c.role)
                              .slice(0, 2)
                              .map(c => c.name)
                              .join(', ')}
                          </span>
                        )}
                        {work.publicationDate?.year && (
                          <span>({work.publicationDate.year})</span>
                        )}
                        {work.journalTitle && <span>{work.journalTitle}</span>}
                      </div>
                      {work.externalIdentifiers.length > 0 && (
                        <div className="work-identifiers">
                          {work.externalIdentifiers.map((id, idx) => (
                            <span key={idx} className="identifier-badge">
                              {id.type}: {id.value}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="work-source">
                        Source: {work.importSource || 'unknown'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
