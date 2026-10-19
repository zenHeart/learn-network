// Transferable vs postMessage 拷贝示例
// Worker 线程：接收 ArrayBuffer 并标记已接收

self.onmessage = function(e) {
  const { type, buffer } = e.data;

  if (type === 'transfer-buffer') {
    // 模拟处理 ArrayBuffer 数据
    const view = new DataView(buffer);
    const sum = view.byteLength; // 只是读取长度，不实际处理

    self.postMessage({
      type: 'buffer-received',
      byteLength: buffer.byteLength,
      sum
    });
  }

  if (type === 'normal-copy') {
    // 正常拷贝的数据
    const { data } = e.data;
    self.postMessage({
      type: 'copy-received',
      dataLength: data.length,
      firstValue: data[0]
    });
  }
};
