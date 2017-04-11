const Logger = require('../dist/logger');
console.log(Logger);
const Log = new Logger({
  dataDir: 'logFileDir',
  path: 'localhost:8000',
  deviceId: 'electron'
});

function log(num) {
  for (let i = 0; i < num; i++) {
    Log.log({
      id: i,
      type: 'test',
      text: ' 日志内容'
    })
  }
}

log(10000);
console.log('do');
