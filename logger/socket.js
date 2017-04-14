import {
  EventEmitter
} from 'events';

async function sleep(time) {
  await new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, time);
  })
}

export default class socket extends EventEmitter {
  constructor(url, deviceId) {
    super();
    this.url = url;
    this.deviceId = deviceId;
    this.connectTask();
    // 保证只有一个重连任务
    this.reconnecting = false;
  }
  send(e) {
    if (typeof e === 'object') {
      e = JSON.stringify(e)
    }
    this.socket.send(e);
  }
  async connectTask() {
    if (this.reconnecting) return;
    this.reconnecting = true;
    console.log('reconnect')
    await this.connect();
    this.reconnecting = false;
  }
  connect() {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(this.url);
      this.socket = socket;

      socket.onopen = () => {
        console.log('websocket is connected with' + this.url);
        this.send({
          type: 'regist',
          deviceId: this.deviceId
        });
        resolve(true);
      };

      window.send = (e) => socket.send(e);
      socket.onmessage = e => {
        console.log(`server say ${e.data}`);
        let data = e.data;
        try {
          data = JSON.parse(data)
        } catch (e) {
          console.warn('data is not a obj');
        }
        this.emit('onmessage', data);
      };
      // socket错误处理
      socket.onerror = async() => {
        console.log('websocket is error');
        resolve(false);
        await sleep(10000);
        this.connectTask();
      };

      // socket关闭处理
      socket.onclose = async() => {
        console.log('websocket is close');
        resolve(false);
        await sleep(10000);
        this.connectTask();
      };
    });
  }
}