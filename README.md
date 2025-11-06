# ORCID Works Manager

A Chrome extension that adds a "Works Manager" to ORCID profiles for importing, batch-editing, deduplicating, and exporting works.

## Features

### ✅ Implemented (MVP)

- **File Import/Export**: Support for BibTeX, CSL-JSON, RIS, and CSV formats
  - Drag-and-drop file import
  - One-click export in any format
  - Bidirectional conversion between all formats

- **Deduplication**: Intelligent duplicate detection and merging
  - PID-based matching (DOI, PMID, PMCID, arXiv, ISBN)
  - Fuzzy matching using title, year, and author similarity
  - Interactive review interface with confidence scores
  - Smart merge algorithm that preserves the most complete data

- **Data Storage**: Local IndexedDB storage
  - Works persistence
  - Snapshots for backup
  - Action logging

- **User Interface**: Clean, responsive design
  - Drag-and-drop file import
  - Works list with metadata display
  - Expandable duplicate clusters
  - ORCID green branding

### 📋 Planned (Beyond MVP)

- ORCID Public API integration for reading existing works
- Batch editing capabilities (visibility, type, language, journal, identifiers, URLs)
- OAuth flow for writing back to ORCID
- Diff preview before applying changes
- API rate limiting and backoff

## Tech Stack

- [React](https://react.dev/) - UI framework
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Vite](https://vite.dev/) - Build tool
- Chrome Extension Manifest V3
- IndexedDB for local storage

---

## Setup

### Prerequisites

- Node.js and npm installed
- Chrome or Chromium-based browser

### Installation

1. Clone this repository
2. Navigate to the `chrome_extension_template` folder:
   ```bash
   cd chrome_extension_template
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Build the extension:
   ```bash
   npm run build
   ```

   You should see a `dist` folder created with the bundled extension.

### Loading in Chrome

1. Open [chrome://extensions/](chrome://extensions/) in Chrome
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Navigate to the `chrome_extension_template/dist` folder and select it
5. The "ORCID Works Manager" extension should now appear in your extensions list

### Usage

1. Visit any ORCID profile page (e.g., `https://orcid.org/0000-0000-0000-0000`)
2. Look for the green "Works Manager" button in the bottom-right corner
3. Click it to open the Works Manager panel
4. Use the panel to:
   - Import works from BibTeX, CSL-JSON, RIS, or CSV files
   - View and manage your works
   - Find and merge duplicates
   - Export works in any supported format

---

## Development

### Project Structure

```
chrome_extension_template/
├── public/
│   ├── manifest.json          # Extension manifest
│   └── icons/                 # Extension icons
├── src/
│   ├── components/            # React components
│   │   ├── FileImport.tsx     # File import with drag-and-drop
│   │   ├── WorksList.tsx      # Works display and management
│   │   └── Deduplication.tsx  # Duplicate detection and merging
│   ├── types/
│   │   └── work.ts            # TypeScript type definitions
│   ├── utils/
│   │   ├── storage.ts         # IndexedDB utilities
│   │   ├── bibtex.ts          # BibTeX parser/exporter
│   │   ├── csl-json.ts        # CSL-JSON parser/exporter
│   │   ├── ris.ts             # RIS parser/exporter
│   │   ├── csv.ts             # CSV parser/exporter
│   │   └── deduplication.ts   # Deduplication algorithms
│   ├── background/
│   │   └── index.ts           # Background service worker
│   ├── content/
│   │   └── index.ts           # Content script (UI injection)
│   ├── App.tsx                # Main React app
│   └── App.css                # Styles
└── dist/                      # Built extension (generated)
```

### Development Commands

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Run linter
npm run lint

# Development mode (auto-rebuild)
npm run dev
```

### Making Changes

> [!CAUTION]
> All code should be written in the `src` folder. Never modify code in the `dist` folder directly, as it will be overwritten on the next build.

After making changes:
1. Run `npm run build` to rebuild the extension
2. Go to [chrome://extensions/](chrome://extensions/)
3. Click the refresh icon on the ORCID Works Manager extension
4. Reload any ORCID pages where you're testing

---

## File Formats

The extension supports four bibliographic file formats:

### BibTeX (.bib)
Standard academic bibliography format. Example:
```bibtex
@article{Smith2020,
  author = {Smith, John and Doe, Jane},
  title = {Example Article},
  journal = {Example Journal},
  year = {2020},
  doi = {10.1234/example}
}
```

### CSL-JSON (.json)
Citation Style Language JSON format. Example:
```json
[
  {
    "type": "article-journal",
    "title": "Example Article",
    "author": [
      {"family": "Smith", "given": "John"}
    ],
    "issued": {"date-parts": [[2020]]},
    "DOI": "10.1234/example"
  }
]
```

### RIS (.ris)
Research Information Systems format. Example:
```
TY  - JOUR
TI  - Example Article
AU  - Smith, John
PY  - 2020
DO  - 10.1234/example
ER  -
```

### CSV (.csv)
Comma-separated values. Example:
```csv
Title,Type,Authors,Year,Journal,DOI
Example Article,JOURNAL_ARTICLE,John Smith; Jane Doe,2020,Example Journal,10.1234/example
```

---

## Deduplication Algorithm

The extension uses a two-pass deduplication algorithm:

### 1. PID-based Clustering (100% confidence)
Works are considered duplicates if they share any persistent identifier:
- DOI
- PMID
- PMCID
- arXiv ID
- ISBN

### 2. Fuzzy Matching (variable confidence)
For works without PIDs, fuzzy matching is used:
- **Title similarity**: Token set ratio (Jaccard similarity) ≥ 0.9
- **Year matching**: Within 1 year tolerance
- **Author matching**: First author surname must match

Works are clustered if:
- Title similarity ≥ 0.9 AND (year match OR author match), OR
- Title similarity ≥ 0.95 (high confidence even without other matches)

### Merge Strategy
When merging duplicates, the algorithm:
- Combines all unique identifiers from all works
- Combines all unique contributors
- Prefers the longest title
- Prefers works with journal titles, URLs, and abstracts
- Marks the merged work as locally modified

---

## License

See [LICENSE](../LICENSE) file for details.

---

## Contributing

This project implements issue [#1](https://github.com/maehr/orcid-editor/issues/1). 

For bug reports or feature requests, please open an issue on GitHub.

---

## More Information

This extension is built on top of a Chrome Extension template. For more information about the underlying template structure, see the [original template guide](https://medium.com/@jamesprivett29/02-building-a-chrome-extension-template-using-vite-react-and-typescript-d5d9912f1b40).

