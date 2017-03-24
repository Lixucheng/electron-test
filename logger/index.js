import LogService from './log';
/*
  options{
    dataDir: '',
    autoUpload: false, 是否自动上传
    maxSize?: 512 * 1024, 最大文件体积
    path: string, 文件上传地址（默认我的平台）,
    deviceId: '' 设备名称,
    saveDays?: 10,
    wsPath: ''
  }
 */
export default class Logger {
  constructor(options) {
    const defaultOptions = {
      dataDir: '',
      autoUpload: false,
      maxSize: 512 * 1024,
      path: '',
      deviceId: '',
      saveDays: 10,
      wsPath: '127.0.0.1:8181'
    };
    if (options.deviceId) {
      if (options.dataDir) {
        if (options.path && options.path.length) {
          if (options.saveDays <= 0) {
            console.error("saveDays must > 0");
          } else {
            this.options = Object.assign({}, defaultOptions, options);
            LogService.initService(this.options);
          }
        } else {
          console.error("path can't be null");
        }
      } else {
        console.error("dataDir can't be null");
      }
    } else {
      console.error("deviceId can't be null");
    }
  }
}
