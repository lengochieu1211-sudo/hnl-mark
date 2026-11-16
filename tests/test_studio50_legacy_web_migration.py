"""TEST50: prevent silent loss of legacy Web data during Studio production upgrade."""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
legacy = (root / "app.js").read_text()
migration = (root / "studio-ui/src/services/legacyWebMigration.ts").read_text()
app = (root / "studio-ui/src/App.tsx").read_text()
library = (root / "studio-ui/src/components/library/LibraryScreen.tsx").read_text()
assert "libraryName='HNLMarkLocalLibrary',libraryStore='originals'" in legacy
assert "const LEGACY_DB='HNLMarkLocalLibrary'" in migration
assert "const LEGACY_STORE='originals'" in migration
assert "db.transaction(LEGACY_STORE,'readonly')" in migration
assert "storeMediaBatchNew(incoming)" in migration
assert "id:`legacy-web-${row.id}`".replace(r"\`","`") in migration
assert "legacySource={oldId:row.id,edits:row.edits,stampConfig:row.stampConfig" in migration
assert "!(row.blob instanceof Blob)||!row.blob.size" in migration
assert "localStorage.setItem(DONE_KEY,'done')" in migration
assert "await storeMediaBatchNew(incoming);" in migration
assert "localStorage.getItem(DONE_KEY)==='done'" not in migration, 'Done flag must not suppress new old-Web photos'
assert 'ids.has(converted.id)' in migration, 'Repeated scans must never overwrite existing media'
assert migration.index("await storeMediaBatchNew(incoming);") < migration.index("localStorage.setItem(DONE_KEY,'done')")
assert 'deleteDatabase(' not in migration and '.delete(' not in migration
assert "migrateLegacyWebLibrary().catch(error" in app
assert ".then(()=>loadMedia()).then(items=>" in app
assert 'await migrateLegacyWebLibrary();' in app
assert "libraryLoadError && items.length===0 ? 'error'" in library
assert 'libraryLoadError && items.length>0' in library
print('TEST50 legacy Web originals + non-destructive migration: PASS')
