#!/usr/bin/env python3
"""TEST22 catalog regression: exactly one Timemark, grouped independent layout variants."""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
data=(root/'studio-ui/src/data/templates.ts').read_text(encoding='utf-8')
ui=(root/'studio-ui/src/components/stamps/StampsAndSettingsScreen.tsx').read_text(encoding='utf-8')
mark=(root/'studio-ui/src/services/timemarkRenderer.ts').read_text(encoding='utf-8')
assert "id:'original-timemark'" in data
assert "category:'timemark',templateIds:['timemark']" in data
assert data.index("id:'original-timemark'") < data.index("id:'date-time'")
assert 'TEMPLATE_CATALOG_GROUPS' in ui and 'visibleCatalog.map(' in ui
assert 'WATERMARK_TEMPLATES.map(' not in ui and '10 Mẫu Timemark' not in ui
assert "{ id: 'timemark', label: 'Timemark gốc (1)' }" in ui
assert 'group.templateIds.map(id=>' in ui and 'aria-pressed={config.templateId===id}' in ui
assert "isLegacyTimemark" in ui and 'Dữ liệu mẫu cũ được giữ nguyên' in ui
assert "WATERMARK_TEMPLATES.find((t) => t.id === config.templateId)" in ui
assert 'export function drawOriginalTimemark(' in mark

# All 10 historical TM IDs and 12 HNL IDs still exist in the full registry.
legacy=['timemark','site','minimal','ribbon','clean','tech','cinema','compact','clock','none']
independent=['site-log','inspection','shift','geo','survey','blueprint','bottom-strip','memory','led','journey','corner','metadata']
for name in legacy+independent:
 assert re.search(r'["\']id["\']\s*:\s*["\']'+re.escape(name)+r'["\']',data),name
# Catalog groups not overloaded with multiple Timemark choices.
public=data.split('export const TEMPLATE_CATALOG_GROUPS:',1)[1].split('export const DEFAULT_WATERMARK_CONFIG:',1)[0]
assert public.count("category:'timemark'") == 1
assert public.count("category:'simple'") == 4
assert public.count("category:'independent'") == 6
assert public.count("category:'none'") == 1
assert public.count('templateIds:') == 12
assert re.search(r"category:'none',templateIds:\['none'\]",public)
for old in legacy[1:-1]:assert f"'{old}'" not in public,old
for name in independent:
 assert public.count(f"'{name}'")==1,name
print('PASS: one original Timemark; 3 simple + 1 custom; 6 independent layout groups / 12 variants; 1 no-stamp; old IDs preserved')
