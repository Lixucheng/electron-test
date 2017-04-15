// import Logger from '../logger';
import electron from 'electron';

// const Log = new Logger({
//   dataDir: electron.remote.app.getPath('appData'),
//   path: 'localhost:8000',
//   deviceId: 'electron'
// });

// window.logNum = (num) => {
//   for (let i = 0; i < num; i++) {
//     Log.log({
//       id: i,
//       type: 'test',
//       text: ' 日志内容'
//     })
//   }
// }

import Logger from '../logger';
const Log = new Logger({
  dataDir: electron.remote.app.getPath('appData'),
  path: 'http://localhost:3000/upload',
  deviceId: 'electron'
});

function logCount(num) {
  for (let i = 0; i < num; i++) {
    Log.log({
      id: i,
      type: 'test',
      text: ' 日志内容'
    })
  }
}

window.logCount = logCount;
// log(10000);
// console.log('do');


import Perf from '../Performance';
Perf.initService();
