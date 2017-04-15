const fetch = (url, data) => new Promise((resolve, reject) => {
  window.fetch(url, data)
    .then(response => response.json())
    .then((ret) => {
      resolve(ret);
    }).catch((e) => {
      reject(e);
    });
});

export const postFetch = async(url, data) => {
  return await fetch(url, Object.assign(data, {
    method: 'post',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  }));
};

export default fetch;
