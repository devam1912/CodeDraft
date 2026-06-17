const fs = require('fs');
const path = require('path');

const base = 'c:/Users/Admin/Desktop/Projects/CodeDraft';

const filesToFix = [
  'frontend/src/pages/Dashboard.jsx',
  'frontend/src/pages/Leaderboard.jsx',
  'frontend/src/pages/Lobby.jsx',
  'frontend/src/pages/BattleArena.jsx',
  'frontend/src/pages/ProblemEditor.jsx',
  'frontend/src/pages/PublicProfile.jsx',
  'frontend/src/pages/TournamentArena.jsx',
  'frontend/src/pages/MatchReplay.jsx',
  'frontend/src/components/ui/NotificationBell.jsx',
  'frontend/src/components/ui/AICodeConverter.jsx',
  'frontend/src/components/ui/CodeEditor.jsx',
  'frontend/src/components/ui/ProtectedRoute.jsx',
  'frontend/src/components/problem-editor/ExampleRow.jsx',
  'frontend/src/components/problem-editor/TestCaseRow.jsx',
];

// Color replacement map: old -> new
const colorMap = [
  // Primary colors
  ['#6366f1', '#7e5dbd'],
  ['#818cf8', '#9478cc'],
  ['#a5b4fc', '#b49fdb'],
  ['#22d3ee', '#d4a053'],
  ['#81e6d9', '#d4a053'],
  // Surface colors
  ['#111118', '#1a1030'],
  ['#0a0a0f', '#120b22'],
  ['#1e1e2e', '#2a1845'],
  ['#2a2a3e', '#412869'],
  // Text colors
  ['#f8fafc', '#eee8f5'],
  ['#94a3b8', '#a99bc2'],
  ['#64748b', '#7a6b94'],
  ['#475569', '#553689'],
  // Functional colors
  ['#10b981', '#5db885'],
  ['#059669', '#4a9e72'],
  ['#ef4444', '#c75c4a'],
  ['#f87171', '#d4715f'],
  ['#f59e0b', '#d4a053'],
  // Deep backgrounds
  ['#030305', '#0d0818'],
  ['#040407', '#0a0614'],
  ['#06060a', '#0b0716'],
  // Extra colors
  ['#34d399', '#5db885'],
  ['#06b6d4', '#7e5dbd'],
  ['#cbd5e1', '#b49fdb'],
  ['#a7f3d0', '#d4c6ea'],
  ['#99f6e4', '#b49fdb'],
];

// rgba replacements
const rgbaMap = [
  ['rgba(99,102,241', 'rgba(126,93,189'],
  ['rgba(99, 102, 241', 'rgba(126, 93, 189'],
  ['rgba(34,211,238', 'rgba(212,160,83'],
  ['rgba(34, 211, 238', 'rgba(212, 160, 83'],
  ['rgba(16,185,129', 'rgba(93,184,133'],
  ['rgba(16, 185, 129', 'rgba(93, 184, 133'],
  ['rgba(245,158,11', 'rgba(212,160,83'],
  ['rgba(245, 158, 11', 'rgba(212, 160, 83'],
  ['rgba(239,68,68', 'rgba(199,92,74'],
  ['rgba(239, 68, 68', 'rgba(199, 92, 74'],
  ['rgba(10,10,15', 'rgba(13,8,24'],
  ['rgba(10, 10, 15', 'rgba(13, 8, 24'],
  ['rgba(30,30,46', 'rgba(42,24,69'],
  ['rgba(3, 3, 5', 'rgba(13, 8, 24'],
  ['rgba(0,0,0,0.8)', 'rgba(5,3,12,0.85)'],
  ['rgba(0, 0, 0, 0.8)', 'rgba(5, 3, 12, 0.85)'],
  ['rgba(5,5,8,0.92)', 'rgba(5,3,12,0.92)'],
];

let totalChanges = 0;

filesToFix.forEach(fp => {
  const fullPath = path.join(base, fp);
  if (!fs.existsSync(fullPath)) { console.log('NOT FOUND:', fp); return; }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let changes = 0;
  
  // Apply hex color replacements
  for (const [old, nw] of colorMap) {
    const re = new RegExp(old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = content.match(re);
    if (matches) {
      changes += matches.length;
      content = content.replace(re, nw);
    }
  }
  
  // Apply rgba replacements
  for (const [old, nw] of rgbaMap) {
    while (content.includes(old)) {
      content = content.replace(old, nw);
      changes++;
    }
  }
  
  // Write back (Node.js writes proper UTF-8 without BOM)
  fs.writeFileSync(fullPath, content, 'utf8');
  totalChanges += changes;
  console.log(`${path.basename(fp)}: ${changes} color replacements`);
});

console.log(`\nTotal: ${totalChanges} replacements across ${filesToFix.length} files`);
