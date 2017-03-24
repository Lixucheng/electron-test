import Logger from '../logger';
import electron from 'electron';

new Logger({
  dataDir: electron.remote.app.getPath('appData'),
  path: 'localhost:8000',
  deviceId: 'electron'
});
