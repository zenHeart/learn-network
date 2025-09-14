const request = require('supertest');
const fs = require('fs');
const path = require('path');
const server = require('./server'); // Import the server instance

describe('Range Requests', () => {
  beforeAll(async () => {
    // Wait for 2 seconds to ensure the server is started
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    // Close the server after tests finish
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  test('should return partial content for valid range', async () => {
    const response = await request('http://localhost:3000') // Use the running server
      .get('/')
      .set('Range', 'bytes=0-4');

    expect(response.status).toBe(206);
    expect(response.headers['content-range']).toBe('bytes 0-4/49');
    expect(response.body.toString()).toBe('This ');
  });

  test('should return 416 for invalid range', async () => {
    const response = await request('http://localhost:3000') // Use the running server
      .get('/')
      .set('Range', 'bytes=50-60');

    expect(response.status).toBe(416);
  });

  test('should return full content when no range is provided', async () => {
    const response = await request('http://localhost:3000') // Use the running server
      .get('/');

    expect(response.status).toBe(200);
    expect(response.text).toBe('Range header not provided');
  });
});
