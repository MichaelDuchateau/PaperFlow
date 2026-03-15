const e = require('electron');
console.log('typeof:', typeof e);
console.log('app defined:', typeof e === 'object' && !!e.app);
process.exit(0);
