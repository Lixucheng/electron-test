import process from 'process';
import fetch, { postFetch } from './fetch';
import config from './config';

export class Perf {
  async initService(token) {
    this.token = token;
    // 计算耗时用
    this.timers = {};
    // 周期上传用
    this.intervalTimer = null;
    this.dataList = [];

    this.interval();

    window.addEventListener('DOMContentLoaded', () => {
      this.increment('counter.pv', 1);
    })
    window.addEventListener('load', () => {
      const response = performance.timing.responseEnd - performance.timing.responseStart;
      this.timing('timing.response', response);
      const load =  performance.timing.loadEventStart - performance.timing.navigationStart;
      this.timing('timing.load', load);
    });
    window.perf = {
      timing: (name, time, tags) => this.timing(name, time, tags),
      increment: (name, delta, tags) => this.increment(name, delta, tags),
      gauge: (name, value, tags) => this.gauge(name, value, tags),
      startTime: (name) => this.startTime(name),
      stopTime: (name, tags) => this.stopTime(name, tags),
      list: () => {
        return {
          data: this.dataList,
          startSend: () => this.startSend(),
        };
      },
      send: obj => this.send(obj)
    };
    window.perflist = () => {
      return {
        data: this.dataList,
        startSend: () => this.startSend(),
      };
    };
  }

  async live() {
    return await fetch(`${config.host}live`);
  }

  interval() {
    this.intervalTimer = setInterval(() => {
      this.startSend();
    }, 2000);
  }

  // 向队列中添加一个记录
  // {
  //   type: string,
  //   name: string,
  //   value: number,
  //   tags: object,
  // }
  add(obj) {
    let exist = false;
    this.dataList.some(e => {
      if (e.type === obj.type && this.isObjectValueEqual(e.tags, obj.tags)) {
        if (!e.data[obj.name]) {
          e.data[obj.name] = [];
        } else if (e.type === 'timer') {
          // 时间类型的数据不做聚合
          return false;
        }
        e.data[obj.name].push(obj.value);
        exist = true;
      }
      return exist;
    });
    if (!exist) {
      const data = {};
      data[obj.name] = [obj.value];
      obj.data = data;
      delete obj.name;
      delete obj.value;
      this.dataList.push(obj);
    }
  }

  isObjectValueEqual(a, b) {
    if (a == b) return true;
    if (!a || !b) return false;
    const aProps = Object.getOwnPropertyNames(a);
    const bProps = Object.getOwnPropertyNames(b);
    if (aProps.length !== bProps.length) {
      return false;
    }
    for (let i = 0; i < aProps.length; i++) {
      const propName = aProps[i];
      if (a[propName] !== b[propName]) {
        return false;
      }
    }
    return true;
  }

  // 开始上传
  async startSend() {
    // TODO
    // const online = await this.live();
    // if (!online) return;
    if (!this.dataList.length) return;
    console.log('send:', this.dataList)
    const list = [];
    // 简单的数据聚合： 数值求和
    while (this.dataList.length) {
      const item = this.dataList.shift();
      switch (item.type) {
        case 'timer':
          {
            Object.keys(item.data).forEach(key => item.data[key] = item.data[key].pop());
            break;
          }
        case 'counter':
          {
            Object.keys(item.data).forEach(key => item.data[key] = item.data[key].reduce((a, b) => a + b, 0));
            break;
          }
        case 'gauge':
          {
            // 上报原始值，注意：一分钟之内服务器若收到多条gauge数据之后保留最后一条，因此我们只上传最后一条就可以了。
            Object.keys(item.data).forEach(key => item.data[key] = item.data[key].pop());
            break;
          }
        default:
      }
      list.push(item);
    }
    this.send(list);
  }

  // 计时指标
  timing(name, time, tags) {
    this.add({
      type: 'timer',
      name,
      value: time,
      tags,
    });
  }

  // 计数指标，第二个参数可以自定义累加值
  increment(name, delta, tags) {
    let value;
    if (typeof delta === 'undefined') {
      value = 1;
    } else if (typeof delta === 'object') {
      tags = delta;
      value = 1;
    } else {
      value = Number(delta);
    }
    this.add({
      type: 'counter',
      name,
      value,
      tags,
    });
  }

  // 离散值指标
  gauge(name, value, tags) {
    this.add({
      type: 'gauge',
      name,
      value,
      tags,
    });
  }

  // 自动计算耗时
  startTime(name) {
    // 防止重复引起时间计算混乱
    if (this.timers[name]) {
      name = name + '-' + (new Date()).getTime();
    }
    this.timers[name] = Date.now();
    return {
      stop: (tags) => this.stopTime(name, tags),
    };
  }

  stopTime(name, tags) {
    // 若没有 start，则直接 return;
    if (typeof this.timers[name] === 'undefined') {
      return;
    }
    const time = Date.now() - this.timers[name];
    delete this.timers[name];

    if (name.indexOf('-') !== -1) {
      name = name.split('-');
      name.pop();
      name = name.join('-');
    }
    this.timing(name, time, tags);
  }

  send(listObj) {
    if (!Array.isArray(listObj)) {
      listObj = [listObj];
    }
    const data = this.transformData(listObj);

    this.dataList = [];
    postFetch(`${config.host}perf/data/add`, {
      body: JSON.stringify(data)
    });
  }

  // 将数据转换成上传格式
  transformData(list) {
    if (Array.isArray(list) && list.length) {
      const data = {
        env: {
          token: this.token,
        },
      };
      data.data = [];
      list.forEach(e => {
        data.data.push({
          type: e.type,
          metrics: e.data,
          tags: Object.assign({}, e.tags, {
            deviceOs: `${process.platform}-${process.arch}`,
            page: location.pathname,
            browser: navigator.userAgent.match(/chrome\/[\d.]+/gi)[0],
            device: navigator.userAgent.match(/Electron\/[\d.]+/gi)[0] || navigator.userAgent.match(/nw\/[\d.]+/gi)[0]
            // posVersion: localStorage.getItem('lastAppVersion'),
          }),
        });
      });
      return data;
    }
    return false;
  }
}

export default new Perf();
