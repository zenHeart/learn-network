exports.parseWebSocketFrame = function parseWebSocketFrame(buffer) {
  if (!buffer || buffer.length < 2) {
    return { error: 'Buffer too short to be a valid WebSocket frame' };
  }

  const fin = (buffer[0] >> 7) & 0x01;
  const opcode = buffer[0] & 0x0F;
  const maskBit = (buffer[1] >> 7) & 0x01;
  let payloadLength = buffer[1] & 0x7F;
  let maskingKey;
  let payloadStartIndex = 2;
  let payload;

  if (opcode !== 0x01) {
    return { error: `Not a text frame (opcode: 0x${opcode.toString(16).padStart(2, '0')})`, fin, opcode };
  }

  if (payloadLength === 126) {
    if (buffer.length < 4) {
      return { error: 'Buffer too short for extended payload length (126)' };
    }
    payloadLength = buffer.readUInt16BE(2);
    payloadStartIndex = 4;
  } else if (payloadLength === 127) {
    if (buffer.length < 10) {
      return { error: 'Buffer too short for extended payload length (127)' };
    }
    // JavaScript 的 Number 类型可能无法精确表示 64 位整数，这里简化处理
    const highLength = buffer.readUInt32BE(2);
    const lowLength = buffer.readUInt32BE(6);
    payloadLength = highLength * Math.pow(2, 32) + lowLength;
    payloadStartIndex = 10;
    console.warn('parseWebSocketFrame: Payload length exceeds JavaScript Number safe range, may be inaccurate.');
  }

  if (maskBit) {
    if (buffer.length < payloadStartIndex + 4) {
      return { error: 'Buffer too short for masking key' };
    }
    maskingKey = buffer.slice(payloadStartIndex, payloadStartIndex + 4);
    payloadStartIndex += 4;

    if (buffer.length < payloadStartIndex + payloadLength) {
      return { error: 'Incomplete payload data' };
    }

    const maskedPayload = buffer.slice(payloadStartIndex, payloadStartIndex + payloadLength);
    payload = Buffer.alloc(payloadLength);
    for (let i = 0; i < payloadLength; i++) {
      payload[i] = maskedPayload[i] ^ maskingKey[i % 4];
    }
  } else {
    if (buffer.length < payloadStartIndex + payloadLength) {
      return { error: 'Incomplete payload data (unmasked)' };
    }
    payload = buffer.slice(payloadStartIndex, payloadStartIndex + payloadLength);
    console.warn('parseWebSocketFrame: Received unmasked data from client, which is not standard.');
  }

  try {
    const payloadString = payload.toString('utf8');
    return { fin, opcode, maskBit, payloadLength, payload: payloadString };
  } catch (error) {
    return { error: `Error decoding payload as UTF-8: ${error.message}`, fin, opcode, maskBit, payloadLength, rawPayload: payload };
  }
}


exports.createCloseFrame = function createCloseFrame(code = 1000, reason = '') {
  const reasonBuf = Buffer.from(reason);
  const length = 2 + reasonBuf.length;
  const frame = Buffer.alloc(2 + length);

  // 第一字节：FIN + opcode=0x8 (close)
  frame[0] = 0x88;

  // 第二字节：不mask，直接 payload 长度
  frame[1] = length;

  // payload：2 字节 close code
  frame.writeUInt16BE(code, 2);

  // payload：后面是 reason 文本
  reasonBuf.copy(frame, 4);

  return frame;
}
