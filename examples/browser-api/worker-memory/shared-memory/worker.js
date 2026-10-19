// SharedArrayBuffer - 共享内存示例
// Worker 线程：与主线程共享同一块内存，无需拷贝

let sharedBuffer = null;
let sharedArray = null;

self.onmessage = function(e) {
  const { type, buffer } = e.data;

  if (type === 'init-shared') {
    // 接收 SharedArrayBuffer（无需拷贝）
    sharedBuffer = buffer;
    sharedArray = new Int32Array(buffer);

    self.postMessage({
      type: 'init-done',
      byteLength: buffer.byteLength,
      arrayLength: sharedArray.length
    });
  }

  if (type === 'increment') {
    // 使用 Atomics 保证原子性递增
    const index = e.data.index;
    const oldValue = Atomics.add(sharedArray, index, 1);
    const newValue = Atomics.load(sharedArray, index);

    self.postMessage({
      type: 'incremented',
      index,
      oldValue,
      newValue
    });
  }

  if (type === 'read') {
    const values = [];
    for (let i = 0; i < Math.min(10, sharedArray.length); i++) {
      values.push(Atomics.load(sharedArray, i));
    }
    self.postMessage({ type: 'read-result', values });
  }
};
