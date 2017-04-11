import {
  EventEmitter
} from 'events';

export default class socket extends EventEmitter {
  constructor(url, deviceId) {
    super();
    const socket = new WebSocket(url);
    this.socket = socket;

    socket.onopen = () => {
      console.log('websocket is connected with' + url);
      this.send({
        type: 'regist',
        deviceId: deviceId
      });
    };

    window.send = (e) => socket.send(e);
    socket.onmessage = e => {
      console.log(`server say ${e.data}`);
      this.emit('onmessage', e);
    };
  }
  send(e) {
    if (typeof e === 'object') {
      e = JSON.stringify(e)
    }
    this.socket.send(e);
  }
}
