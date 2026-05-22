
=====================================================================
PATCH FILE: PublicationsPage.tsx  (3 targeted changes)
=====================================================================

────────────────────────────────────────────────────────────────────
CHANGE 1 — Add two new imports (after the ScholarSyncModal import)
────────────────────────────────────────────────────────────────────

FIND (exact line):
  import { ScholarSyncModal } from "./ScholarSyncModal";

REPLACE WITH:
  import { ScholarSyncModal } from "./ScholarSyncModal";
  import { ScopusSyncModal } from "./ScopusSyncModal";
  import { WosSyncModal } from "./WosSyncModal";


────────────────────────────────────────────────────────────────────
CHANGE 2 — Add two new state variables (after isScholarModalOpen)
────────────────────────────────────────────────────────────────────

FIND (exact lines):
  const [isScholarModalOpen, setIsScholarModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

REPLACE WITH:
  const [isScholarModalOpen, setIsScholarModalOpen] = useState(false);
  const [isScopusSyncOpen, setIsScopusSyncOpen] = useState(false);
  const [isWosSync Open, setIsWosSyncOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

NOTE: Remove the space in "isWosSync Open" — it's "isWosSyncOpen" (added here only to avoid false match)


────────────────────────────────────────────────────────────────────
CHANGE 3 — Replace the single header sync button with 4 buttons
────────────────────────────────────────────────────────────────────

FIND (exact block):
              <Button onClick={() => setIsScholarModalOpen(true)}
                className="text-white border text-sm h-8 px-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
                <RefreshCw className="w-3.5 h-3.5 mr-2" />Sync from Scholar / CSV
              </Button>
              <Button onClick={() => setIsAddFormOpen(true)}
                className="text-white border text-sm h-8 px-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
                <Plus className="w-3.5 h-3.5 mr-2" />Add New Publication
              </Button>

REPLACE WITH:
              <Button onClick={() => setIsScholarModalOpen(true)}
                className="text-white border text-sm h-8 px-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
                <RefreshCw className="w-3.5 h-3.5 mr-2" />Sync Scholar
              </Button>
              <Button onClick={() => setIsScopusSyncOpen(true)}
                className="text-white border text-sm h-8 px-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
                <RefreshCw className="w-3.5 h-3.5 mr-2" />Sync Scopus
              </Button>
              <Button onClick={() => setIsWosSyncOpen(true)}
                className="text-white border text-sm h-8 px-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
                <RefreshCw className="w-3.5 h-3.5 mr-2" />Sync WoS
              </Button>
              <Button onClick={() => setIsScholarModalOpen(true)}
                className="text-white border text-sm h-8 px-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
                <Plus className="w-3.5 h-3.5 mr-2" />Import CSV
              </Button>
              <Button onClick={() => setIsAddFormOpen(true)}
                className="text-white border text-sm h-8 px-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
                <Plus className="w-3.5 h-3.5 mr-2" />Add New Publication
              </Button>

NOTE: "Sync Scholar" keeps setIsScholarModalOpen (which handles both Scholar sync AND CSV import via tabs).
      "Import CSV" also uses setIsScholarModalOpen — the ScholarSyncModal has both tabs built in.
      Only Scopus and WoS get their own dedicated modals.


────────────────────────────────────────────────────────────────────
CHANGE 4 — Add two new modals in JSX (after ScholarSyncModal)
────────────────────────────────────────────────────────────────────

FIND (exact block):
      {/* ── Scholar Sync Modal ── */}
      <ScholarSyncModal
        isOpen={isScholarModalOpen}
        onClose={() => setIsScholarModalOpen(false)}
        onImportComplete={async (report) => {
          await loadPublications();
          setLastSync(new Date());
          if (report && report.length > 0) setSimilarityWarnings(report);
        }}
      />

REPLACE WITH:
      {/* ── Scholar Sync Modal ── */}
      <ScholarSyncModal
        isOpen={isScholarModalOpen}
        onClose={() => setIsScholarModalOpen(false)}
        onImportComplete={async (report) => {
          await loadPublications();
          setLastSync(new Date());
          if (report && report.length > 0) setSimilarityWarnings(report);
        }}
      />

      {/* ── Scopus Sync Modal ── */}
      <ScopusSyncModal
        isOpen={isScopusSyncOpen}
        onClose={() => setIsScopusSyncOpen(false)}
        onImportComplete={() => { loadPublications(); setLastSync(new Date()); }}
      />

      {/* ── WoS Sync Modal ── */}
      <WosSyncModal
        isOpen={isWosSyncOpen}
        onClose={() => setIsWosSyncOpen(false)}
        onImportComplete={() => { loadPublications(); setLastSync(new Date()); }}
      />


=====================================================================
PATCH FILE: ConferencesPage.tsx  (4 targeted changes)
=====================================================================

────────────────────────────────────────────────────────────────────
CHANGE 1 — Add imports (after AddConferenceForm import line)
────────────────────────────────────────────────────────────────────

FIND:
  import { AddConferenceForm } from "./AddConferenceForm";

REPLACE WITH:
  import { AddConferenceForm } from "./AddConferenceForm";
  import { ScopusSyncModal } from "./ScopusSyncModal";
  import { WosSyncModal } from "./WosSyncModal";


────────────────────────────────────────────────────────────────────
CHANGE 2 — Add state variables (after isExportModalOpen)
────────────────────────────────────────────────────────────────────

FIND:
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

REPLACE WITH:
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isScopusSyncOpen, setIsScopusSyncOpen] = useState(false);
  const [isWosSyncOpen, setIsWosSyncOpen] = useState(false);


────────────────────────────────────────────────────────────────────
CHANGE 3 — Replace header "Sync Conferences" button with 3 buttons
────────────────────────────────────────────────────────────────────

FIND:
              <Button onClick={syncConferences} disabled={isLoading}
                className="text-white border text-sm h-8 px-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
                <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Syncing...' : 'Sync Conferences'}
              </Button>
              <Button onClick={() => setIsAddFormOpen(true)}
                className="text-white border text-sm h-8 px-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
                <Plus className="w-3.5 h-3.5 mr-2" />Add New Conference
              </Button>

REPLACE WITH:
              <Button onClick={() => setIsScopusSyncOpen(true)}
                className="text-white border text-sm h-8 px-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
                <RefreshCw className="w-3.5 h-3.5 mr-2" />Sync Scopus
              </Button>
              <Button onClick={() => setIsWosSyncOpen(true)}
                className="text-white border text-sm h-8 px-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
                <RefreshCw className="w-3.5 h-3.5 mr-2" />Sync WoS
              </Button>
              <Button onClick={() => setIsExportModalOpen(true)}
                className="text-white border text-sm h-8 px-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
                <FileDown className="w-3.5 h-3.5 mr-2" />Import CSV
              </Button>
              <Button onClick={() => setIsAddFormOpen(true)}
                className="text-white border text-sm h-8 px-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
                <Plus className="w-3.5 h-3.5 mr-2" />Add New Conference
              </Button>

NOTE: "Import CSV" reuses setIsExportModalOpen which opens ExportConferenceCSVModal —
      you'll want a separate CSV *import* modal for conferences. For now this wires up
      the export modal as placeholder; see note at bottom about creating a ConferenceImportModal
      if you have one, or we can create one.


────────────────────────────────────────────────────────────────────
CHANGE 4 — Add two new modals in JSX (place before the closing </main> tag)
────────────────────────────────────────────────────────────────────

FIND (just before </main>):
        <AddConferenceForm isOpen={isAddFormOpen} onClose={() => setIsAddFormOpen(false)} onSubmit={handleAddConference} />
        {editingConference && (
          <AddConferenceForm isOpen={!!editingConference} onClose={() => setEditingConference(null)} onSubmit={handleEditConference} initialData={editingConference} />
        )}

REPLACE WITH:
        <AddConferenceForm isOpen={isAddFormOpen} onClose={() => setIsAddFormOpen(false)} onSubmit={handleAddConference} />
        {editingConference && (
          <AddConferenceForm isOpen={!!editingConference} onClose={() => setEditingConference(null)} onSubmit={handleEditConference} initialData={editingConference} />
        )}

        {/* ── Scopus Sync Modal ── */}
        <ScopusSyncModal
          isOpen={isScopusSyncOpen}
          onClose={() => setIsScopusSyncOpen(false)}
          onImportComplete={() => { loadConferences(); setLastSync(new Date()); }}
        />

        {/* ── WoS Sync Modal ── */}
        <WosSyncModal
          isOpen={isWosSyncOpen}
          onClose={() => setIsWosSyncOpen(false)}
          onImportComplete={() => { loadConferences(); setLastSync(new Date()); }}
        />


=====================================================================
PATCH FILE: BooksChaptersPage.tsx  (identical pattern to Conferences)
=====================================================================

────────────────────────────────────────────────────────────────────
CHANGE 1 — Add imports
────────────────────────────────────────────────────────────────────

FIND:
  import { AddBookForm } from "./AddBookForm";

REPLACE WITH:
  import { AddBookForm } from "./AddBookForm";
  import { ScopusSyncModal } from "./ScopusSyncModal";
  import { WosSyncModal } from "./WosSyncModal";


────────────────────────────────────────────────────────────────────
CHANGE 2 — Add state variables
────────────────────────────────────────────────────────────────────

FIND:
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

REPLACE WITH:
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isScopusSyncOpen, setIsScopusSyncOpen] = useState(false);
  const [isWosSyncOpen, setIsWosSyncOpen] = useState(false);


────────────────────────────────────────────────────────────────────
CHANGE 3 — Replace header "Sync Books" button with 3 buttons
────────────────────────────────────────────────────────────────────

FIND:
              <Button onClick={syncBooksChapters} disabled={isLoading}
                className="text-white border text-sm h-8 px-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
                <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Syncing...' : 'Sync Books'}
              </Button>
              <Button onClick={() => setIsAddFormOpen(true)}
                className="text-white border text-sm h-8 px-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
                <Plus className="w-3.5 h-3.5 mr-2" />Add New Book/Chapter
              </Button>

REPLACE WITH:
              <Button onClick={() => setIsScopusSyncOpen(true)}
                className="text-white border text-sm h-8 px-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
                <RefreshCw className="w-3.5 h-3.5 mr-2" />Sync Scopus
              </Button>
              <Button onClick={() => setIsWosSyncOpen(true)}
                className="text-white border text-sm h-8 px-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
                <RefreshCw className="w-3.5 h-3.5 mr-2" />Sync WoS
              </Button>
              <Button onClick={() => setIsExportModalOpen(true)}
                className="text-white border text-sm h-8 px-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
                <FileDown className="w-3.5 h-3.5 mr-2" />Import CSV
              </Button>
              <Button onClick={() => setIsAddFormOpen(true)}
                className="text-white border text-sm h-8 px-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
                <Plus className="w-3.5 h-3.5 mr-2" />Add New Book/Chapter
              </Button>


────────────────────────────────────────────────────────────────────
CHANGE 4 — Add two new modals in JSX (before closing </main>)
────────────────────────────────────────────────────────────────────

FIND:
        <AddBookForm isOpen={isAddFormOpen} onClose={() => setIsAddFormOpen(false)} onSubmit={handleAddBookChapter} />
        {editingBook && (
          <AddBookForm isOpen={!!editingBook} onClose={() => setEditingBook(null)} onSubmit={handleEditBookChapter} initialData={editingBook} />
        )}

REPLACE WITH:
        <AddBookForm isOpen={isAddFormOpen} onClose={() => setIsAddFormOpen(false)} onSubmit={handleAddBookChapter} />
        {editingBook && (
          <AddBookForm isOpen={!!editingBook} onClose={() => setEditingBook(null)} onSubmit={handleEditBookChapter} initialData={editingBook} />
        )}

        {/* ── Scopus Sync Modal ── */}
        <ScopusSyncModal
          isOpen={isScopusSyncOpen}
          onClose={() => setIsScopusSyncOpen(false)}
          onImportComplete={() => { loadBooksChapters(); setLastSync(new Date()); }}
        />

        {/* ── WoS Sync Modal ── */}
        <WosSyncModal
          isOpen={isWosSyncOpen}
          onClose={() => setIsWosSyncOpen(false)}
          onImportComplete={() => { loadBooksChapters(); setLastSync(new Date()); }}
        />


=====================================================================
IMPORTANT NOTES
=====================================================================

1. FacultyDashboard.tsx — fully rewritten file is ready for download.

2. Publications "Import CSV" button:
   The ScholarSyncModal already has TWO tabs inside it:
   - Tab 1: "Google Scholar Sync"   → fetches live from Scholar
   - Tab 2: "Import CSV (Scopus)"   → uploads a CSV file
   So "Sync Scholar" and "Import CSV" both open the same ScholarSyncModal —
   this is correct and intentional. The user sees the right tab.
   If you want "Import CSV" to open directly on the CSV tab, add a prop like
   defaultTab="csv" to ScholarSyncModal and read it as:
     const [activeTab, setActiveTab] = useState(props.defaultTab ?? 'scholar');

3. Conferences / Books "Import CSV":
   These currently open the ExportCSVModal (which is an *export* modal).
   If you want a proper CSV *import* for conferences and books, you need
   to either:
   a) Create a ConferenceImportModal / BooksImportModal (similar to ScholarSyncModal's CSV tab)
   b) Or reuse ScholarSyncModal with a different endpoint prop
   Let me know and I can build those.

4. FileDown icon: Make sure it's in the imports list for ConferencesPage and
   BooksChaptersPage — it's already imported in both files (used by Export CSV button).