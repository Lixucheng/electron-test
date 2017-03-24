import URL from 'url'
import { EventEmitter } from 'events';

export default class socket extends EventEmitter {
  constructor(host) {
    super();
    const url = URL.format({
      protocol: 'ws',
      host,
      pathname: ''
    })
    const socket = new WebSocket(url);
    this.socket = socket;

    socket.onopen = () => {
      console.log('websocket is connected with' + url);
    };

    window.send = (e) => socket.send(e);
    socket.onmessage = e => {
      console.log(`server say ${e.data}`);
      this.emit('onmessage', e);
    };
  }
  send(e) {
    this.socket.send(e);
  }
}
