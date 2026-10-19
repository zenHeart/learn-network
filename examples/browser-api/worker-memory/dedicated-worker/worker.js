// DedicatedWorker - 计算密集型任务示例
// Worker 线程：计算斐波那契数列（演示 Worker 内存独立）

self.onmessage = function(e) {
  const { type, data } = e.data;

  switch (type) {
    case 'fibonacci':
      const result = fibonacci(data.n);
      self.postMessage({ type: 'fibonacci-result', result, input: data.n });
      break;
    case 'heavy-compute':
      // 模拟计算密集任务
      const start = Date.now();
      let sum = 0;
      for (let i = 0; i < data.iterations; i++) {
        sum += Math.sqrt(i) * Math.sin(i);
      }
      const duration = Date.now() - start;
      self.postMessage({
        type: 'heavy-result',
        sum,
        duration,
        iterations: data.iterations
      });
      break;
    case 'memory-test':
      // 分配内存（演示 Worker 独立内存空间）
      const arr = new Array(data.size);
      for (let i = 0; i < data.size; i++) {
        arr[i] = Math.random();
      }
      const usedMemory = arr.length * 8 / (1024 * 1024); // 假设每个数 8 字节
      self.postMessage({
        type: 'memory-result',
        allocated: usedMemory,
        arrayLength: arr.length
      });
      break;
    default:
      self.postMessage({ type: 'error', message: 'Unknown message type' });
  }
};

function fibonacci(n) {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    const temp = a + b;
    a = b;
    b = temp;
  }
  return b;
}
