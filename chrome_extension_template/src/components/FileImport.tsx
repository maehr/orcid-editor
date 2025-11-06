/**
 * File import component with drag-and-drop support
 */

import { useState } from 'react';
import { Work } from '../types/work';
import { parseBibTeX } from '../utils/bibtex';
import { parseCSLJSON } from '../utils/csl-json';
import { parseRIS } from '../utils/ris';
import { parseCSV } from '../utils/csv';
import { saveWorks } from '../utils/storage';

interface FileImportProps {
  onImport: (works: Work[]) => void;
}

export function FileImport({ onImport }: FileImportProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    await processFiles(files);
  };

  const processFiles = async (files: File[]) => {
    setImporting(true);
    setError(null);
    
    try {
      const allWorks: Work[] = [];
      
      for (const file of files) {
        const content = await file.text();
        const works = await parseFile(file.name, content);
        allWorks.push(...works);
      }
      
      if (allWorks.length > 0) {
        await saveWorks(allWorks);
        onImport(allWorks);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import files');
    } finally {
      setImporting(false);
    }
  };

  const parseFile = async (filename: string, content: string): Promise<Work[]> => {
    const ext = filename.toLowerCase().split('.').pop();
    
    switch (ext) {
      case 'bib':
        return parseBibTeX(content);
      case 'json':
        return parseCSLJSON(content);
      case 'ris':
        return parseRIS(content);
      case 'csv':
        return parseCSV(content);
      default:
        throw new Error(`Unsupported file format: ${ext}`);
    }
  };

  return (
    <div className="file-import">
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <p>Drop files here or click to select</p>
        <p className="formats">Supported: BibTeX (.bib), CSL-JSON (.json), RIS (.ris), CSV (.csv)</p>
        <input
          type="file"
          multiple
          accept=".bib,.json,.ris,.csv"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          id="file-input"
        />
        <label htmlFor="file-input" className="file-label">
          <button type="button" disabled={importing}>
            {importing ? 'Importing...' : 'Select Files'}
          </button>
        </label>
      </div>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
