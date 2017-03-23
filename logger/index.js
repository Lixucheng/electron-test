import URL from 'url'

export default class socket {
  constructor() {
    const url = URL.format({
      protocol: 'ws',
      host: '127.0.0.1:8181',
      pathname: ''
    })
    const socket = new WebSocket(url);

    socket.onopen = () => {
      console.log('websocket is connected with' + url);
    };

    window.send = (e) => socket.send(e);
    socket.onmessage = e => {
      console.log(`server say ${e.data}`);
    };
  }
}
