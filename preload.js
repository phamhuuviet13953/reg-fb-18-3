/**
 * Preload script để tạo cầu nối an toàn giữa renderer process và main process
 * Cung cấp API giới hạn thông qua contextBridge
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose API to renderer process
contextBridge.exposeInMainWorld('api', {
  // Đăng ký các hàm invoke để gọi main process
  invoke: async (channel, ...args) => {
    // Danh sách các channel được phép gọi
    const validChannels = [
      'get-devices',
      'refresh-devices',
      'select-device',
      'get-selected-devices',
      'execute-on-devices',
      'open-data-file',
      'set-phone-api',
      'set-mail-api',
      'start-registration',
      'start-all-registrations',
      'stop-registration',
      'stop-all-registrations',
      'get-registration-info',
      'get-all-registrations',
      'get-stats',
      'reset-stats',
      'read-accounts'
    ];
    
    if (validChannels.includes(channel)) {
      return await ipcRenderer.invoke(channel, ...args);
    }
    
    throw new Error(`Channel không được phép: ${channel}`);
  },
  
  // Đăng ký các hàm lắng nghe sự kiện từ main process
  receive: (channel, callback) => {
    // Danh sách các channel được phép nhận
    const validChannels = [
      'registration-update',
      'registration-log',
      'device-update',
      'device-status'
    ];
    
    if (validChannels.includes(channel)) {
      // Xóa người nghe cũ để tránh rò rỉ bộ nhớ
      ipcRenderer.removeAllListeners(channel);
      
      // Thêm người nghe mới
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
      return true;
    }
    
    throw new Error(`Channel không được phép: ${channel}`);
  },
  
  // Hàm gỡ bỏ người nghe sự kiện
  removeListener: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Lắng nghe sự kiện DOM-ready để thông báo cho main process
window.addEventListener('DOMContentLoaded', () => {
  ipcRenderer.send('renderer-ready');
});