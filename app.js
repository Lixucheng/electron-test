import electron from 'electron';

const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

app.on('ready', () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      devTools: true
    }
  });
  win.loadURL(`file://${__dirname}/app/index.html`);
  win.webContents.openDevTools();
});

export default app;
