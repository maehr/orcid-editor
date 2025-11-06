/**
 * Works list component with basic display and actions
 */

import { Work } from '../types/work';

interface WorksListProps {
  works: Work[];
  onExport: (format: 'bibtex' | 'csl-json' | 'ris' | 'csv') => void;
  onClear: () => void;
}

export function WorksList({ works, onExport, onClear }: WorksListProps) {
  if (works.length === 0) {
    return (
      <div className="works-list-empty">
        <p>No works loaded. Import files or load from ORCID profile.</p>
      </div>
    );
  }

  const formatDate = (date: { year?: string; month?: string; day?: string } | undefined) => {
    if (!date) return '';
    const parts = [];
    if (date.year) parts.push(date.year);
    if (date.month) parts.push(date.month.padStart(2, '0'));
    if (date.day) parts.push(date.day.padStart(2, '0'));
    return parts.join('-');
  };

  return (
    <div className="works-list">
      <div className="works-header">
        <h3>{works.length} work{works.length !== 1 ? 's' : ''}</h3>
        <div className="works-actions">
          <button onClick={() => onExport('bibtex')}>Export BibTeX</button>
          <button onClick={() => onExport('csl-json')}>Export CSL-JSON</button>
          <button onClick={() => onExport('ris')}>Export RIS</button>
          <button onClick={() => onExport('csv')}>Export CSV</button>
          <button onClick={onClear} className="danger">Clear All</button>
        </div>
      </div>
      
      <div className="works-items">
        {works.map(work => (
          <div key={work.id} className="work-item">
            <div className="work-title">{work.title}</div>
            <div className="work-meta">
              <span className="work-type">{work.type}</span>
              {work.contributors.length > 0 && (
                <span className="work-authors">
                  {work.contributors
                    .filter(c => c.role === 'AUTHOR' || !c.role)
                    .slice(0, 3)
                    .map(c => c.name)
                    .join(', ')}
                  {work.contributors.filter(c => c.role === 'AUTHOR' || !c.role).length > 3 && ', et al.'}
                </span>
              )}
              {work.publicationDate && (
                <span className="work-date">{formatDate(work.publicationDate)}</span>
              )}
              {work.journalTitle && (
                <span className="work-journal">{work.journalTitle}</span>
              )}
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
          </div>
        ))}
      </div>
    </div>
  );
}
