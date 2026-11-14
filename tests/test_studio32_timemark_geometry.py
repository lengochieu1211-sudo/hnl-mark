#!/usr/bin/env python3
"""Timemark TEST32: 14-character visual ID + preserved Verified suffix + aligned block geometry."""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
mark=(root/'studio-ui/src/services/timemarkRenderer.ts').read_text('utf-8')
overlay=(root/'studio-ui/src/components/watermark/OriginalTimemarkOverlay.tsx').read_text('utf-8')
app=(root/'studio-ui/src/App.tsx').read_text('utf-8')
assert "const timePart=Date.now().toString(36).toUpperCase().padStart(9,'0').slice(-9);" in mark
assert "const randomPart=values[0].toString(36).toUpperCase().padStart(7,'0').slice(-5);" in mark
assert "return timePart+randomPart;" in mark, "9 + 5 = 14 characters"
assert ".toUpperCase().slice(0,14).padEnd(14,'0')" in mark, "old IDs are normalized only at display time"
assert "const label=`\${cleanCode} Timemark Verified`;" in mark
assert "g.scale(labelScale,1);g.fillText(label,0,0)" in mark, "the Verified suffix must not ellipsize"
assert "const pairedHeight=Math.max(1,textBottom-textTop);" in mark
assert "const scaleY=pairedHeight/Math.max(1,timeGlyph.ascent+timeGlyph.descent);" in mark
assert "g.translate(x,textBottom-timeGlyph.descent*scaleY);g.scale(squeeze,scaleY);" in mark
assert "rect(g,barX,textTop,Math.max(2,base*.105),pairedHeight,base*.04);" in mark
assert "g.fillText(ellipsis(g,dateText,avail),dateX,dateBaseline);" in mark
assert "g.fillText(ellipsis(g,weekdayText,avail),dateX,weekBaseline);" in mark
assert "drawOriginalTimemark(ctx,w,h,config,orientationDeg,photoCode,logo)" in overlay
assert "drawOriginalTimemark(ctx,canvas.width,canvas.height,config,orientation,photoCode,logo)" in mark
assert "createTimemarkCode()" in app
print("PASS TEST32: 14-char displayed ID, Timemark Verified unchanged, time/bar exactly aligned to two-line block")
