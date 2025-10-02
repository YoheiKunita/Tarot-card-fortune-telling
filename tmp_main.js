const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 950,
    webPreferences: {
      contextIsolation: true,
      // 明示的にサンドボックスを無効（preloadでNodeのrequireを使うため）
      sandbox: false,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false,
    autoHideMenuBar: false
  });

  win.once('ready-to-show', () => win.show());
  win.loadFile('src/index.html');
  // Ensure menu bar is visible
  try { buildMenu(win); } catch (_) {}
  try { win.setMenuBarVisibility(true); } catch (_) {}
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
      label: 'メニュー',
      submenu: [
        {
          label: 'スタート',
          accelerator: process.platform === 'darwin' ? 'Cmd+N' : 'Ctrl+N',
          click: () => { try { win.webContents.send('menu:start'); } catch (_) {} }
        },
        {
          label: '設定',
          accelerator: process.platform === 'darwin' ? 'Cmd+,' : 'Ctrl+,',
          click: () => { try { win.webContents.send('settings:open'); } catch (_) {} }
        },
        { type: 'separator' },
        (process.platform === 'darwin'
          ? { label: '終了', role: 'quit' }
          : { label: '終了', click: () => { try { app.quit(); } catch (_) {} } })
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


