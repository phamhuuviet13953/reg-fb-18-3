const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const deviceManager = require('./device/device-manager');
const deviceActions = require('./device/device-actions');
const { exec } = require('child_process');
const storage = require('./services/storage');
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const deviceManager = require('./device/device-manager');
const deviceActions = require('./device/device-actions');
const storage = require('./services/storage');
const phoneApi = require('./services/phone-api');
const mailApi = require('./services/mail-api');
const regManager = require('./facebook/reg-manager');
const postRegActions = require('./facebook/post-reg-actions');
const proxyService = require('./services/proxy-service');
const avatarsDir = path.join(storage.dataPath, 'avatars');

// Biến global để lưu trữ cửa sổ chính
let mainWindow;

// Tạo cửa sổ chính của ứng dụng
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets/img/icon.png')
  });

  // Tải file HTML chính
  mainWindow.loadFile('index.html');
 // Khởi tạo các dịch vụ
  await initializeServices();
  // Đăng ký các sự kiện IPC
  registerIpcHandlers();
  // Đăng ký các sự kiện từ Registration Manager
  registerRegManagerEvents();
}
// Khởi tạo các dịch vụ
async function initializeServices() {
  try {
    // Khởi tạo thư mục dữ liệu
    await storage.init(app.getPath('userData'));
    
    // Khởi tạo kết nối với thiết bị
    await deviceManager.init();
    
    console.log('Các dịch vụ đã được khởi tạo thành công');
  } catch (error) {
    console.error('Lỗi khi khởi tạo dịch vụ:', error);
    dialog.showErrorBox('Lỗi khởi động', `Không thể khởi tạo dịch vụ: ${error.message}`);
  }
}
async function initializeServices() {
  try {
    // Khởi tạo thư mục dữ liệu
    await storage.init(app.getPath('userData'));
    
    // Khởi tạo kết nối với thiết bị
    await deviceManager.init();
    
    // Khởi tạo dịch vụ proxy
    proxyService.init(storage.dataPath);
    
    console.log('Các dịch vụ đã được khởi tạo thành công');
  } catch (error) {
    console.error('Lỗi khi khởi tạo dịch vụ:', error);
    dialog.showErrorBox('Lỗi khởi động', `Không thể khởi tạo dịch vụ: ${error.message}`);
  }
}
// Kiểm tra thư mục avatars
const avatarsDir = path.join(storage.dataPath, 'avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
  console.log('Đã tạo thư mục avatars');
}
  // Mở DevTools trong môi trường phát triển (có thể comment lại khi build)
  // mainWindow.webContents.openDevTools();

  // Sự kiện khi cửa sổ đóng
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// Tạo cửa sổ khi ứng dụng sẵn sàng
app.whenReady().then(() => {
  createWindow();

  // Trong macOS, tạo cửa sổ mới khi click vào icon dock
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Kiểm tra và tạo thư mục data nếu chưa tồn tại
  const dataFolderPath = path.join(__dirname, 'data');
  if (!fs.existsSync(dataFolderPath)) {
    fs.mkdirSync(dataFolderPath);
  }

  // Tạo các file dữ liệu cơ bản nếu chưa tồn tại
  const dataFiles = ['ho.txt', 'ten.txt', 'moiso.txt', 'moimail.txt', 'winverify.txt', 'winnovery.txt', 'thatbai.txt'];
  dataFiles.forEach(file => {
    const filePath = path.join(dataFolderPath, file);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '');
    }
  });
});

// Thoát ứng dụng khi tất cả cửa sổ đóng (ngoại trừ macOS)
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// ======= IPC HANDLERS =======

// Quản lý thiết bị
ipcMain.handle('refresh-devices', async () => {
  return await deviceManager.refreshDevices();
});

ipcMain.handle('select-device', (event, deviceId) => {
  deviceManager.selectDevice(deviceId);
  return true;
});

ipcMain.handle('deselect-device', (event, deviceId) => {
  deviceManager.deselectDevice(deviceId);
  return true;
});

ipcMain.handle('select-all-devices', () => {
  deviceManager.selectAllDevices();
  return true;
});

ipcMain.handle('deselect-all-devices', () => {
  deviceManager.deselectAllDevices();
  return true;
});

ipcMain.handle('get-selected-devices', () => {
  return deviceManager.getSelectedDevices();
});

// Thao tác thiết bị
ipcMain.handle('enable-4g', async () => {
  return await deviceManager.executeOnSelectedDevices(deviceId => 
    deviceActions.enable4G(deviceId)
  );
});

ipcMain.handle('disable-4g', async () => {
  return await deviceManager.executeOnSelectedDevices(deviceId => 
    deviceActions.disable4G(deviceId)
  );
});

ipcMain.handle('press-home', async () => {
  return await deviceManager.executeOnSelectedDevices(deviceId => 
    deviceActions.pressHome(deviceId)
  );
});

ipcMain.handle('clear-all', async () => {
  return await deviceManager.executeOnSelectedDevices(deviceId => 
    deviceActions.clearAppData(deviceId, 'com.facebook.katana')
  );
});

// Quản lý DPI
ipcMain.handle('change-dpi', async (event, dpi1, dpi2, loopTime) => {
  const selectedDevices = deviceManager.getSelectedDevices();
  const results = {};
  
  // Lưu trữ interval IDs để có thể dừng sau này
  const intervalIds = {};

  for (const deviceId of selectedDevices) {
    try {
      let currentDpi = dpi1;
      
      // Bắt đầu vòng lặp đổi DPI
      const intervalId = setInterval(async () => {
        try {
          // Đổi qua lại giữa hai giá trị DPI
          if (currentDpi === dpi1) {
            await deviceActions.changeDPI(deviceId, dpi2);
            currentDpi = dpi2;
          } else {
            await deviceActions.changeDPI(deviceId, dpi1);
            currentDpi = dpi1;
          }
          
          // Gửi cập nhật trạng thái về renderer
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('dpi-change-status', {
              deviceId,
              currentDpi
            });
          }
        } catch (error) {
          console.error(`Lỗi khi thay đổi DPI: ${error.message}`);
          clearInterval(intervalId);
          delete intervalIds[deviceId];
          
          // Gửi thông báo lỗi về renderer
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('dpi-change-error', {
              deviceId,
              error: error.message
            });
          }
        }
      }, loopTime);
      
      // Lưu interval ID
      intervalIds[deviceId] = intervalId;
      results[deviceId] = { success: true };
    } catch (error) {
      results[deviceId] = { success: false, error: error.message };
    }
  }
  
  // Lưu intervalIds vào global để có thể dừng sau này
  global.dpiIntervals = intervalIds;
  
  return results;
});

ipcMain.handle('stop-dpi-change', () => {
  if (global.dpiIntervals) {
    Object.values(global.dpiIntervals).forEach(intervalId => {
      clearInterval(intervalId);
    });
    global.dpiIntervals = {};
  }
  return true;
});

// Quản lý múi giờ
ipcMain.handle('enable-auto-timezone', async () => {
  return await deviceManager.executeOnSelectedDevices(deviceId => 
    deviceActions.enableAutomaticTimeZone(deviceId)
  );
});

ipcMain.handle('set-timezone', async (event, region) => {
  // Map tên vùng sang timezone
  const timezoneMap = {
    'Việt Nam': 'Asia/Ho_Chi_Minh',
    'Antigua và Barbuda': 'America/Antigua',
    'Mỹ (New York)': 'America/New_York',
    'Anh (London)': 'Europe/London'
  };
  
  const timezone = timezoneMap[region] || 'UTC';
  
  return await deviceManager.executeOnSelectedDevices(deviceId => 
    deviceActions.setManualTimeZone(deviceId, timezone)
  );
});

ipcMain.handle('set-manual-time', async (event, date, time) => {
  // Chuyển đổi định dạng DD/MM/YYYY HH:MM thành YYYYMMDD.HHmmss
  const dateParts = date.split('/');
  const timeParts = time.split(':');
  const formattedDateTime = `${dateParts[2]}${dateParts[1]}${dateParts[0]}.${timeParts[0]}${timeParts[1]}00`;
  
  return await deviceManager.executeOnSelectedDevices(deviceId => 
    deviceActions.setManualTime(deviceId, formattedDateTime)
  );
});

// Xử lý file dữ liệu
ipcMain.handle('open-text-file', async (event, fileName) => {
  const filePath = path.join(__dirname, 'data', fileName);
  
  // Đảm bảo file tồn tại
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '');
  }
  
  // Mở file bằng Notepad trên Windows hoặc TextEdit trên macOS
  if (process.platform === 'win32') {
    exec(`notepad "${filePath}"`);
  } else if (process.platform === 'darwin') {
    exec(`open -a TextEdit "${filePath}"`);
  } else {
    exec(`xdg-open "${filePath}"`);
  }
  
  return true;
});

ipcMain.handle('read-text-file', async (event, fileName) => {
  const filePath = path.join(__dirname, 'data', fileName);
  
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return content;
    }
    return '';
  } catch (error) {
    console.error(`Lỗi khi đọc file: ${error.message}`);
    return '';
  }
});

ipcMain.handle('write-text-file', async (event, fileName, content) => {
  const filePath = path.join(__dirname, 'data', fileName);
  
  try {
    fs.writeFileSync(filePath, content);
    return true;
  } catch (error) {
    console.error(`Lỗi khi ghi file: ${error.message}`);
    return false;
  }
});

ipcMain.handle('append-text-file', async (event, fileName, content) => {
  const filePath = path.join(__dirname, 'data', fileName);
  
  try {
    fs.appendFileSync(filePath, content + '\n');
    return true;
  } catch (error) {
    console.error(`Lỗi khi ghi file: ${error.message}`);
    return false;
  }
});

// Mở thư mục chọn ảnh
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (!result.canceled) {
    return result.filePaths[0];
  }
  
  return null;
});

ipcMain.handle('get-random-name', async () => {
  const lastName = await storage.getRandomLastName();
  const firstName = await storage.getRandomFirstName();
  return { lastName, firstName };
});

ipcMain.handle('get-random-password', async () => {
  return await storage.getRandomPassword();
});

ipcMain.handle('get-random-phone', async () => {
  return await storage.generateRandomPhoneNumber();
});

ipcMain.handle('get-random-email', async () => {
  return await storage.generateRandomEmail();
});

ipcMain.handle('save-success-account', async (event, account, verified) => {
  return await storage.saveSuccessAccount(account, verified);
});

ipcMain.handle('save-failed-account', async (event, account, reason) => {
  return await storage.saveFailedAccount(account, reason);
});

ipcMain.handle('get-verified-count', async () => {
  return await storage.getVerifiedAccountCount();
});

ipcMain.handle('get-non-verified-count', async () => {
  return await storage.getNonVerifiedAccountCount();
});

ipcMain.handle('get-failed-count', async () => {
  return await storage.getFailedAccountCount();
});

/**
 * Handlers để đọc/ghi file trực tiếp
 */
ipcMain.handle('read-data-file', async (event, fileName) => {
  try {
    const data = await storage.readDataFile(fileName);
    console.log(`Read ${data.length} lines from ${fileName}`);
    return data;
  } catch (error) {
    console.error(`Error in read-data-file handler for ${fileName}:`, error);
    throw error;
  }
});

const fs = require('fs');
const path = require('path');

ipcMain.handle('write-data-file', async (event, fileName, content) => {
  try {
    const filePath = path.join(__dirname, 'data', fileName);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`File ${fileName} written successfully`);
    return true;
  } catch (error) {
    console.error(`Error in write-data-file handler for ${fileName}:`, error);
    throw error;
  }
});

ipcMain.handle('append-data-file', async (event, fileName, content) => {
  try {
    const filePath = path.join(__dirname, 'data', fileName);
    fs.appendFileSync(filePath, content + '\n', 'utf8');
    console.log(`Content appended to ${fileName} successfully`);
    return true;
  } catch (error) {
    console.error(`Error in append-data-file handler for ${fileName}:`, error);
    throw error;
  }
});
// Đăng ký các sự kiện IPC
function registerIpcHandlers() {
  // Các handler cho quản lý thiết bị
  ipcMain.handle('get-devices', async () => {
    return await deviceManager.getDevices();
  });

  ipcMain.handle('refresh-devices', async () => {
    return await deviceManager.refreshDevices();
  });

  ipcMain.handle('select-device', (event, deviceId, selected) => {
    deviceManager.selectDevice(deviceId, selected);
    return deviceManager.getSelectedDevices();
  });

  ipcMain.handle('get-selected-devices', () => {
    return deviceManager.getSelectedDevices();
  });

  // Các handler cho thao tác thiết bị
  ipcMain.handle('execute-on-devices', async (event, action, params) => {
    const devices = deviceManager.getSelectedDevices();
    const results = {};
    
    for (const deviceId of devices) {
      try {
        switch (action) {
          case 'home':
            results[deviceId] = await deviceActions.pressHome(deviceId);
            break;
          case 'enable4g':
            results[deviceId] = await deviceActions.enable4G(deviceId);
            break;
          case 'disable4g':
            results[deviceId] = await deviceActions.disable4G(deviceId);
            break;
          case 'clearall':
            results[deviceId] = await deviceActions.clearAllApps(deviceId);
            break;
          case 'settimezone':
            results[deviceId] = await deviceActions.setTimeZone(deviceId, params.region);
            break;
          case 'enableautotimezone':
            results[deviceId] = await deviceActions.enableAutoTimeZone(deviceId);
            break;
          case 'setmanualtime':
            results[deviceId] = await deviceActions.setManualTime(
              deviceId, 
              params.date,
              params.time
            );
            break;
          case 'toggledpi':
            results[deviceId] = await deviceActions.toggleDPI(
              deviceId,
              params.dpi1,
              params.dpi2,
              params.loopTime
            );
            break;
          default:
            results[deviceId] = { success: false, error: 'Thao tác không được hỗ trợ' };
        }
      } catch (error) {
        results[deviceId] = { success: false, error: error.message };
      }
    }
    
    return results;
  });

  // Các handler cho file dữ liệu
  ipcMain.handle('open-data-file', async (event, filename) => {
    const filePath = path.join(storage.dataPath, filename);
    
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '', 'utf8');
    }
    
    try {
      // Mở file với ứng dụng notepad mặc định
      const { shell } = require('electron');
      await shell.openPath(filePath);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Các handler cho API dịch vụ
  ipcMain.handle('set-phone-api', (event, service, apiKey) => {
    phoneApi.setApiKey(service, apiKey);
    phoneApi.selectService(service);
    return { success: true };
  });

  ipcMain.handle('set-mail-api', (event, service, apiKey) => {
    mailApi.setApiKey(service, apiKey);
    mailApi.selectService(service);
    return { success: true };
  });

  // Các handler cho Registration Manager
  ipcMain.handle('start-registration', async (event, deviceId, settings) => {
    try {
      await regManager.startRegistration(deviceId, settings);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('start-all-registrations', async (event, settings) => {
    const devices = deviceManager.getSelectedDevices();
    const results = {};
    
    for (const deviceId of devices) {
      try {
        // Clone settings để tránh xung đột
        const deviceSettings = JSON.parse(JSON.stringify(settings));
        
        // Bắt đầu đăng ký trên thiết bị
        await regManager.startRegistration(deviceId, deviceSettings);
        results[deviceId] = { success: true };
      } catch (error) {
        results[deviceId] = { success: false, error: error.message };
      }
    }
    
    return results;
  });

  ipcMain.handle('stop-registration', (event, deviceId) => {
    regManager.stopRegistration(deviceId);
    return { success: true };
  });

  ipcMain.handle('stop-all-registrations', () => {
    const registrations = regManager.getAllRegistrations();
    
    for (const deviceId in registrations) {
      regManager.stopRegistration(deviceId);
    }
    
    return { success: true };
  });

  ipcMain.handle('get-registration-info', (event, deviceId) => {
    return regManager.getRegistrationInfo(deviceId);
  });

  ipcMain.handle('get-all-registrations', () => {
    return regManager.getAllRegistrations();
  });

  // Các handler cho thống kê
  ipcMain.handle('get-stats', () => {
    return storage.getStats();
  });

  ipcMain.handle('reset-stats', () => {
    storage.resetStats();
    return { success: true };
  });

  // Đọc dữ liệu tài khoản
  ipcMain.handle('read-accounts', (event, type) => {
    switch (type) {
      case 'verified':
        return storage.readVerifiedAccounts();
      case 'unverified':
        return storage.readUnverifiedAccounts();
      case 'failed':
        return storage.readFailedAccounts();
      default:
        return [];
    }
  });
}
// Thêm vào phần registerIpcHandlers()

// Quản lý proxy
ipcMain.handle('get-proxies', () => {
  return proxyService.proxies;
});

ipcMain.handle('add-proxy', (event, proxy) => {
  return proxyService.addProxy(proxy);
});

ipcMain.handle('remove-proxy', (event, proxy) => {
  return proxyService.removeProxy(proxy);
});

ipcMain.handle('test-proxy', async (event, proxy) => {
  return await proxyService.testProxy(proxy);
});

ipcMain.handle('test-all-proxies', async () => {
  return await proxyService.testAllProxies();
});

ipcMain.handle('assign-proxy', (event, deviceId) => {
  return proxyService.assignProxyToDevice(deviceId);
});

ipcMain.handle('get-device-proxy', (event, deviceId) => {
  return proxyService.getDeviceProxy(deviceId);
});

ipcMain.handle('rotate-device-proxy', (event, deviceId) => {
  return proxyService.rotateDeviceProxy(deviceId);
});
// Thêm vào phần registerIpcHandlers()

// Tính năng sau đăng ký
ipcMain.handle('upload-avatar', async (event, deviceId, accountInfo) => {
  try {
    return await postRegActions.uploadAvatar(deviceId, accountInfo);
  } catch (error) {
    console.error(`Lỗi khi upload avatar trên ${deviceId}:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('interact-newsfeed', async (event, deviceId) => {
  try {
    return await postRegActions.interactWithNewsfeed(deviceId);
  } catch (error) {
    console.error(`Lỗi khi tương tác newsfeed trên ${deviceId}:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('read-notifications', async (event, deviceId) => {
  try {
    return await postRegActions.readNotifications(deviceId);
  } catch (error) {
    console.error(`Lỗi khi đọc thông báo trên ${deviceId}:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('view-stories', async (event, deviceId) => {
  try {
    return await postRegActions.viewStories(deviceId);
  } catch (error) {
    console.error(`Lỗi khi xem story trên ${deviceId}:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('perform-post-reg-actions', async (event, deviceId, accountInfo, actions, settings) => {
  try {
    return await postRegActions.performPostRegActions(deviceId, accountInfo, actions, settings);
  } catch (error) {
    console.error(`Lỗi khi thực hiện thao tác sau đăng ký trên ${deviceId}:`, error);
    return { success: false, error: error.message };
  }
});
// Đăng ký các sự kiện từ Registration Manager
function registerRegManagerEvents() {
  regManager.on('registration-started', (data) => {
    mainWindow.webContents.send('registration-update', {
      type: 'started',
      data
    });
  });

  regManager.on('step-started', (data) => {
    mainWindow.webContents.send('registration-update', {
      type: 'step',
      data
    });
  });

  regManager.on('registration-finished', (data) => {
    mainWindow.webContents.send('registration-update', {
      type: 'finished',
      data
    });
  });

  regManager.on('registration-error', (data) => {
    mainWindow.webContents.send('registration-update', {
      type: 'error',
      data
    });
  });

  regManager.on('registration-stopped', (data) => {
    mainWindow.webContents.send('registration-update', {
      type: 'stopped',
      data
    });
  });

  regManager.on('log', (data) => {
    mainWindow.webContents.send('registration-log', data);
  });
}

// Khởi tạo ứng dụng khi sẵn sàng
app.whenReady().then(createWindow);

// Xử lý khi tất cả cửa sổ đóng
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Xử lý khi ứng dụng được kích hoạt
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Dọn dẹp tài nguyên trước khi thoát
app.on('before-quit', async () => {
  try {
    // Hủy tất cả các yêu cầu API đang chờ
    await phoneApi.clearAllRequests();
    await mailApi.clearAllRequests();
    
    // Dừng tất cả các quá trình đăng ký
    const registrations = regManager.getAllRegistrations();
    for (const deviceId in registrations) {
      regManager.stopRegistration(deviceId);
    }
    
    console.log('Đã dọn dẹp tài nguyên trước khi thoát');
  } catch (error) {
    console.error('Lỗi khi dọn dẹp tài nguyên:', error);
  }
});
// Bổ sung vào sự kiện 'before-quit'
app.on('before-quit', async () => {
  try {
    // Hủy tất cả các yêu cầu API đang chờ
    await phoneApi.clearAllRequests();
    await mailApi.clearAllRequests();
    
    // Dừng tất cả các quá trình đăng ký
    const registrations = regManager.getAllRegistrations();
    for (const deviceId in registrations) {
      regManager.stopRegistration(deviceId);
    }
    
    // Lưu dữ liệu proxy
    proxyService.saveProxies();
    
    console.log('Đã dọn dẹp tài nguyên trước khi thoát');
  } catch (error) {
    console.error('Lỗi khi dọn dẹp tài nguyên:', error);
  }
});

// Thêm vào function createWindow() hoặc khởi tạo ứng dụng

// Tạo menu quản lý proxy
const proxyMenu = Menu.buildFromTemplate([
  {
    label: 'Proxy',
    submenu: [
      {
        label: 'Quản lý Proxy',
        click: () => {
          // Mở cửa sổ quản lý proxy
          openProxyManager();
        }
      },
      {
        label: 'Kiểm tra tất cả Proxy',
        click: async () => {
          const results = await proxyService.testAllProxies();
          dialog.showMessageBox({
            title: 'Kết quả kiểm tra Proxy',
            message: `Tổng số: ${results.total}\nHoạt động: ${results.working}\nLỗi: ${results.failed}`
          });
        }
      },
      { type: 'separator' },
      {
        label: 'Lưu cài đặt Proxy',
        click: () => {
          proxyService.saveProxies();
          dialog.showMessageBox({
            title: 'Lưu cài đặt Proxy',
            message: 'Đã lưu cài đặt Proxy'
          });
        }
      }
    ]
  }
]);

// Thêm menu vào ứng dụng
Menu.setApplicationMenu(proxyMenu);

// Hàm mở cửa sổ quản lý proxy
function openProxyManager() {
  const proxyWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  
  proxyWindow.loadFile('proxy-manager.html');
}