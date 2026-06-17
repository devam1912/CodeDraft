const fs = require('fs');
const path = require('path');

const filesToCheck = [
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
];

filesToCheck.forEach(fp => {
  const fullPath = path.join('c:/Users/Admin/Desktop/Projects/CodeDraft', fp);
  if (!fs.existsSync(fullPath)) { console.log('NOT FOUND:', fp); return; }
  
  const buf = fs.readFileSync(fullPath);
  // Check for BOM
  const hasBOM = buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF;
  
  const content = buf.toString('utf8');
  // Look for replacement chars or broken multi-byte sequences
  const hasBroken = content.includes('\uFFFD');
  
  // Count emojis
  const emojiRegex = /[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]/gu;
  const emojis = content.match(emojiRegex);
  
  console.log(`${fp}: BOM=${hasBOM}, broken=${hasBroken}, emojis=${emojis ? emojis.length : 0}`);
});
