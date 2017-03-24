import fs from 'fs';

export default {
  mkdir(dirname) {
    return new Promise((resolve, reject) => {
      fs.access(dirname, err => {
        if (err) {
          fs.mkdir(dirname, err => {
            if (err) {
              reject(err);
            } else {
              resolve(true);
            }
          });
        } else {
          resolve(true);
        }
      });
    });
  },
  writeFile(filename, data) {
    return new Promise((resolve, reject) => {
      fs.writeFile(filename, data, err => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  },
  readFile(filename) {
    return new Promise((resolve, reject) => {
      fs.readFile(filename, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  },
  stat(path) {
    return new Promise((resolve, reject) => {
      fs.stat(path, (err, stat) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(stat);
      });
    });
  },

  appendFile(path, text, code) {
    return new Promise((resolve, reject) => {
      fs.appendFile(path, text, code, (err) => {
        if (err) {
          reject(err);
          console.log('err:', err);
          return;
        }
        resolve();
      });
    });
  },
  readdir(dir) {
    return new Promise((resolve, reject) => {
      fs.readdir(dir, (err, file) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(file);
      });
    });
  }
};
