const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 950,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });

  win.once('ready-to-show', () => win.show());
  win.loadFile('src/index.html');
  Menu.setApplicationMenu(null);
}

function buildMenu(win) {
  const template = [
    ...(process.platform === 'darwin' ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'スタート…',
      accelerator: 'Enter',
      click: () => {
        const popup = Menu.buildFromTemplate([
          { label: '三枚引きを占う', click: () => win.webContents.send('start:run', 'three') },
          { label: 'ワンオラクルを占う', click: () => win.webContents.send('start:run', 'one') }
        ]);
        popup.popup({ window: win });
      }
    },
    {
      label: 'モード',
      submenu: [
        {
          id: 'mode-three',
          label: '三枚引き',
          type: 'radio',
          checked: true,
          click: () => win.webContents.send('mode:change', 'three')
        },
        {
          id: 'mode-one',
          label: 'ワンオラクル',
          type: 'radio',
          click: () => win.webContents.send('mode:change', 'one')
        }
      ]
    },
    {
      label: '表示',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
