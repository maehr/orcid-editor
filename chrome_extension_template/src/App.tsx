import { useState, useEffect } from "react";
import "./App.css";
import { Work } from "./types/work";
import { FileImport } from "./components/FileImport";
import { WorksList } from "./components/WorksList";
import { Deduplication } from "./components/Deduplication";
import { getAllWorks, clearWorks } from "./utils/storage";
import { exportToBibTeX } from "./utils/bibtex";
import { exportToCSLJSON } from "./utils/csl-json";
import { exportToRIS } from "./utils/ris";
import { exportToCSV } from "./utils/csv";

function App() {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorks();
  }, []);

  const loadWorks = async () => {
    try {
      const loadedWorks = await getAllWorks();
      setWorks(loadedWorks);
    } catch (error) {
      console.error('Failed to load works:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = (newWorks: Work[]) => {
    setWorks([...works, ...newWorks]);
  };

  const handleExport = (format: 'bibtex' | 'csl-json' | 'ris' | 'csv') => {
    let content = '';
    let filename = '';
    let mimeType = '';

    switch (format) {
      case 'bibtex':
        content = exportToBibTeX(works);
        filename = 'works.bib';
        mimeType = 'text/plain';
        break;
      case 'csl-json':
        content = exportToCSLJSON(works);
        filename = 'works.json';
        mimeType = 'application/json';
        break;
      case 'ris':
        content = exportToRIS(works);
        filename = 'works.ris';
        mimeType = 'text/plain';
        break;
      case 'csv':
        content = exportToCSV(works);
        filename = 'works.csv';
        mimeType = 'text/csv';
        break;
    }

    // Download the file
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = async () => {
    if (confirm('Are you sure you want to clear all works? This cannot be undone.')) {
      await clearWorks();
      setWorks([]);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <h1>ORCID Works Manager</h1>
      <div className="works-manager">
        <div className="panel-section">
          <h2>Import</h2>
          <FileImport onImport={handleImport} />
        </div>
        
        <div className="panel-section">
          <h2>Works</h2>
          <WorksList works={works} onExport={handleExport} onClear={handleClear} />
        </div>
        
        <div className="panel-section">
          <h2>Deduplication</h2>
          <Deduplication works={works} onUpdate={loadWorks} />
        </div>
        
        <div className="panel-section">
          <h2>Actions</h2>
          <p>Select works above to perform batch operations</p>
          <button disabled>Batch Edit (Coming Soon)</button>
          <button disabled>Sync to ORCID (Coming Soon)</button>
        </div>
      </div>
    </>
  );
}

export default App;
