import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { Readable } from 'stream';
import fileStorage from './file';
import Socket from './socket';
import fetch from 'node-fetch';

const lastLogFileItem = 'lastLogFile';
// filename: deviceid-2016/09/01-12.txt

export class LogService extends EventEmitter {
  async initService(options) {
    this.options = options;
    this.fs = fileStorage;
    const dir = options.dataDir;
    this.dir = path.join(dir, '/logFiles');

    this.uploading = false;
    this.upQueue = [];
    this.writeQueue = [];
    this.writing = false;

    // 初始化文件夹
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir);
    }
    this.localStorage = localStorage;
    const lastFile = this.localStorage.getItem(lastLogFileItem);
    this.file = lastFile;
    if (!lastFile) {
      // 如果是第一次运行 直接创建新文件就行了
      await this.createNewFile();
    } else {
      const fileName = this.getFileName(lastFile);
      if (lastFile && fs.existsSync(lastFile)) {
        const stat = await this.fs.stat(lastFile);
        const date = (new Date()).toLocaleDateString().replace(/\//g, '_');
        if (stat.size < this.options.maxSize &&
          fileName.split('-')[1] === date) {
          this.file = lastFile;
        } else {
          await this.createNewFile(lastFile);
        }
      } else {
        await this.createNewFile(lastFile);
      }
    }

    // 记录当前所使用文件
    this.localStorage.setItem(lastLogFileItem, this.file.toString());

    // 注册消息通道
    this.pushBind();

    // 默认保留10天
    this.check(options.saveDays);

    // 测试方法
    window.log = (str) => {
      this.log(str);
    };
    window.pushFile = (s, e) => {
      this.upload(s, e);
    };

    console.log('logServer is on working')
  }

  pushBind() {
    const socket = new Socket(this.options.wsPath, this.options.deviceId);
    const action = this.pushAction.bind(this);
    socket.on('onmessage', action);
    // socket.removeListener('push', action);
  }

  pushAction(e) {
    if (e && e.type === 'upload') {
      const { startTime, endTime } = e;
      this.upload(startTime, endTime);
    }
  }

  // 创建新的log文件
  async createNewFile(lastFile) {
    const date = (new Date()).toLocaleDateString().replace(/\//g, '_');
    let num = 0;
    if (lastFile && lastFile.split('-')[1] === date) {
      num = Number(lastFile.split('-')[2].split('.')[0]) + 1;
    }
    let fileName =
      `${this.dir}/${this.options.deviceId}-${date}-${num}.txt`;
    fileName = path.normalize(fileName);
    await this.fs.writeFile(fileName, '');
    console.info('createNewLogFile:' + fileName);
    this.file = fileName;
    this.localStorage.setItem(lastLogFileItem, this.file.toString());
    return fileName;
  }

  // 截取文件名称
  getFileName(filePath) {
    return path.basename(filePath);
  }

  // 文件TYPE
  getFileType(filePath) {
    return path.extname(filePath);
  }

  // 向队列中添加一个日志记录
  log(str) {
    if (typeof str === 'object') {
      str.time = (new Date()).toLocaleString();
    } else {
      str = {
        time: (new Date()).toLocaleString(),
        text: str
      };
    }
    try {
      str = JSON.stringify(str);
      this.writeQueue.push(str);
      this.resume();
    } catch (err) {
      // do nothing
    }
  }

  // 继续队列
  async resume() {
    if (this.writeQueue.length && !this.writing) {
      this.writing = true;
      const item = this.writeQueue.shift();
      await this.writeLog(item);
    }
  }

  // 写入文件
  async writeLog(str) {
    const stat = await this.fs.stat(this.file);
    if (stat.size > this.options.maxSize) {
      await this.createNewFile(this.file);
    }
    await this.fs.appendFile(this.file, `${str} \n`, 'utf-8');
    this.writing = false;
    this.resume();
  }

  // 检查历史文件 ，过期删除
  async check(days) {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const date = today.getDate();
    const nDaysAgo = new Date(year, month, date - days);
    const files = await this.fs.readdir(this.dir);
    if (files.length) {
      for (let i = 0; i < files.length; i++) {
        if (this.getFileType(files[i]) === '.txt' && files[i] !== this.getFileName(this.file) && this.file) {
          const stat = await this.fs.stat(path.join(this.dir, files[i]));
          if (stat.birthtime <= nDaysAgo) {
            fs.unlink(path.join(this.dir, files[i]));
          }
        }
      }
    }
  }

  // 上传历史文件 可以分区间上传
  async upload(startTime, endTime) {
    // 如果上传队列里面有东西就说明正在上传, 这里多余的上传指令忽略掉
    if (this.upQueue.length) {
      return;
    }
    const files = await this.fs.readdir(this.dir);
    files.reduce(async (p, file) => {
      await p;
      if (this.getFileType(file) === '.txt' && this.file) {
        const stat = await this.fs.stat(path.join(this.dir, file));
        if (startTime && endTime) {
          if (stat.birthtime >= new Date(startTime) &&
            stat.birthtime <= new Date(endTime)) {
            if (file === this.getFileName(this.file)) {
              // 如果上传的是正在使用的,新建一个文件
              await this.createNewFile(this.file);
            }
            this.upQueue.push(path.join(this.dir, file));
            this.start();
          }
        } else {
          if (file === this.getFileName(this.file)) {
            // 如果上传的是正在使用的,新建一个文件
            await this.createNewFile(this.file);
          }
          this.upQueue.push(path.join(this.dir, file));
          this.start();
        }
      }
    }, null);
  }

  start() {
    if (!navigator.onLine) throw new Error('设备当前处于离线状态，无法同步数据');
    if (this.upQueue.length && !this.uploading) {
      const file = this.upQueue.shift();
      console.log('upload:', file);
      this.uploadFile(file);
    }
  }

  async uploadFile(filePath) {
    this.uploading = true;
    const boundaryKey = Math.random().toString(16);
    const fileStream = fs.createReadStream(filePath);

    const dataStream = Readable();
    const text = '--' + boundaryKey + '\r\n' +
    'Content-Type: text/plain\r\n' +
    'Content-Disposition: form-data; name="file"; filename="' + this.getFileName(filePath) + '"\r\n' +
      'Content-Transfer-Encoding: binary\r\n\r\n';

    let first = true;
    let headerSave = true;
    dataStream._read = () => {
      if (first) {
        first = false;
        fileStream.on('readable', () => {
          let chunk;
          if (headerSave) {
            headerSave = false;
            dataStream.push(text);
          }
          while (chunk = fileStream.read()) {
            dataStream.push(chunk);
          }
        });
        fileStream.on('end', () => {
          dataStream.push('\r\n\r\n');
          dataStream.push(`--${boundaryKey}--`);
          dataStream.push(null);
        });
      }
    };

    fetch('http://localhost:3000/upload', {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary="${boundaryKey}"`,
        'Accept-Encoding': 'gzip'
      },
      compress: true,
      body: dataStream
    })
    .then((json) => {
      // 上传成功后删除文件
      fs.unlink(filePath, () => {
        this.uploading = false;
        this.start();
      });
    })
    .catch((err) => {
      console.log(err);
      this.uploading = false;
      this.start();
    });
  }
}

export default new LogService();
