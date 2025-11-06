import "./App.css";

function App() {
  return (
    <>
      <h1>ORCID Works Manager</h1>
      <div className="works-manager">
        <div className="panel-section">
          <h2>Import</h2>
          <p>Drop files (BibTeX, CSL-JSON, RIS, CSV) to import works</p>
          <button>Select Files</button>
        </div>
        
        <div className="panel-section">
          <h2>Works</h2>
          <p>No works loaded. Import files or load from ORCID profile.</p>
          <button>Load from ORCID</button>
        </div>
        
        <div className="panel-section">
          <h2>Actions</h2>
          <button>Batch Edit</button>
          <button>Deduplicate</button>
          <button>Export</button>
        </div>
      </div>
    </>
  );
}

export default App;
