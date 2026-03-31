# Weather API 天气 API

天气 API 是前端开发中常见的外部数据集成场景，本章介绍两种主流方案：**wttr.in**（免费无需注册）和 **OpenWeather**（需 API Key）。

## 目录

- [类型定义](#类型定义)
- [wttr.in 免费 API](#wttrin-免费-api)
- [OpenWeather API](#openweather-api)
- [对比与选型](#对比与选型)

---

## 类型定义

```typescript
// 天气数据通用类型
interface WeatherData {
  location: string;        // 位置名称
  temp: number;            // 温度（摄氏度）
  feelsLike: number;       // 体感温度
  humidity: number;        // 湿度百分比
  windSpeed: number;       // 风速 (km/h)
  windDir: string;         // 风向
  condition: string;       // 天气状况（如 "Sunny", "Cloudy"）
  uvIndex: number;         // 紫外线指数
  visibility: number;       // 能见度 (km)
  pressure: number;       // 气压 (hPa)
  precipitation: number;   // 降水量 (mm)
}

// wttr.in 响应格式
interface WttrResponse {
  current_condition: WttrCurrent[];
  nearest_area: WttrArea[];
  weather: WttrForecast[];
}

interface WttrCurrent {
  temp_C: string;
  FeelsLike: string;
  humidity: string;
  windspeedKmph: string;
  winddir16Point: string;
  weatherDesc: { value: string }[];
  uvIndex: string;
  visibility: string;
  pressure: string;
  precipMM: string;
}

interface WttrArea {
  areaName: string;
  country: string;
  region: string;
  latitude: string;
  longitude: string;
}

interface WttrForecast {
  date: string;
  mintempC: string;
  maxtempC: string;
  avgtempC: string;
  sunHour: string;
  hourly: WttrHourly[];
}

interface WttrHourly {
  time: string;
  tempC: string;
  weatherDesc: { value: string }[];
  windspeedKmph: string;
  humidity: string;
}

// OpenWeather 响应格式
interface OpenWeatherResponse {
  coord: { lon: number; lat: number };
  weather: { id: number; main: string; description: string; icon: string }[];
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  visibility: number;
  wind: { speed: number; deg: number };
  clouds: { all: number };
  dt: number;
  sys: { country: string; sunrise: number; sunset: number };
  timezone: number;
  name: string;
}

// 错误响应
interface WeatherError {
  code: string;
  message: string;
}
```

---

## wttr.in 免费 API

### 简介

[wttr.in](https://wttr.in/) 是一个免费、无需注册的天气服务，支持多种格式输出，适合快速原型开发和个人项目。

### 特性

- ✅ 完全免费，无需 API Key
- ✅ 支持地理位置（城市名、IP、坐标）
- ✅ 多种输出格式（JSON、PNG、文本）
- ✅ 内嵌天气预报
- ⚠️ 无保证的可用性（服务可能不稳定）
- ⚠️ 数据精度有限

### 基础用法

```bash
# 查询北京天气（默认 JSON 格式）
curl https://wttr.in/Beijing?format=j1

# 查询当前位置天气
curl https://wttr.in/?format=j1

# 查询带预报的天气
curl https://wttr.in/Tokyo?format=j1&m

# 获取天气图片
curl -o weather.png https://wttr.in/Beijing.png
```

### URL 参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `format=j1` | JSON 格式输出 | `?format=j1` |
| `m` | 公制单位 | `?format=j1&m` |
| `lang=zh` | 中文语言 | `?format=j1&lang=zh` |
| `1` | 只显示今天 | `?1` |
| `2` | 显示今天+明天 | `?2` |
| `3` | 显示三天预报 | `?3` |

### 浏览器 Fetch 示例

```typescript
async function getWeatherWttr(city: string = 'Beijing'): Promise<WeatherData> {
  const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1&m`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });
  
  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }
  
  const data = await response.json();
  const current = data.current_condition[0];
  const area = data.nearest_area[0];
  
  return {
    location: area.areaName[0].value,
    temp: parseInt(current.temp_C),
    feelsLike: parseInt(current.FeelsLike),
    humidity: parseInt(current.humidity),
    windSpeed: parseInt(current.windspeedKmph),
    windDir: current.winddir16Point,
    condition: current.weatherDesc[0].value,
    uvIndex: parseInt(current.uvIndex),
    visibility: parseInt(current.visibility),
    pressure: parseInt(current.pressure),
    precipitation: parseFloat(current.precipMM)
  };
}

// 使用示例
getWeatherWttr('Shanghai')
  .then(weather => console.log(`${weather.location}: ${weather.temp}°C, ${weather.condition}`))
  .catch(err => console.error('Failed:', err));
```

### Node.js 示例

```typescript
import https from 'https';

function getWeather(city: string): Promise<WeatherData> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'wttr.in',
      path: `/${encodeURIComponent(city)}?format=j1&m`,
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const current = json.current_condition[0];
          resolve({
            location: city,
            temp: parseInt(current.temp_C),
            condition: current.weatherDesc[0].value,
            humidity: parseInt(current.humidity),
            windSpeed: parseInt(current.windspeedKmph),
            windDir: current.winddir16Point,
            feelsLike: parseInt(current.FeelsLike),
            uvIndex: parseInt(current.uvIndex),
            visibility: parseInt(current.visibility),
            pressure: parseInt(current.pressure),
            precipitation: parseFloat(current.precipMM)
          });
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}
```

### 完整响应示例

```json
{
  "current_condition": [
    {
      "temp_C": "15",
      "FeelsLike": "14",
      "humidity": "72",
      "windspeedKmph": "12",
      "winddir16Point": "NE",
      "weatherDesc": [{ "value": "Partly cloudy" }],
      "uvIndex": "5",
      "visibility": "10",
      "pressure": "1018",
      "precipMM": "0.0"
    }
  ],
  "nearest_area": [
    {
      "areaName": [{ "value": "Beijing" }],
      "country": [{ "value": "China" }],
      "region": [{ "value": "Beijing" }],
      "latitude": "39.904",
      "longitude": "116.391"
    }
  ],
  "weather": [
    {
      "date": "2024-01-15",
      "mintempC": "8",
      "maxtempC": "15",
      "avgtempC": "12",
      "sunHour": "8.5",
      "hourly": []
    }
  ]
}
```

---

## OpenWeather API

### 简介

[OpenWeather](https://openweathermap.org/api) 是业界标准的商业天气 API，提供高精度数据和丰富的天气类型，适合生产环境。

### 特性

- ✅ 专业的天气数据（高精度）
- ✅ 丰富的天气类型覆盖
- ✅ 多语言支持
- ✅ 历史数据和预报
- ✅ 免费套餐（1000 次/天）
- ❌ 需要注册获取 API Key
- ❌ 超出免费额度需付费

### API 端点

```
https://api.openweathermap.org/data/2.5/weather?q={city}&appid={API_KEY}&units=metric&lang=zh_cn
```

### 参数说明

| 参数 | 说明 | 必填 | 示例 |
|------|------|------|------|
| `q` | 城市名称 | 是 | `Beijing,CN` |
| `appid` | API Key | 是 | `your_api_key` |
| `units` | 单位制 | 否 | `metric`（摄氏度）/ `imperial`（华氏度） |
| `lang` | 语言 | 否 | `zh_cn` |
| `lat/lon` | 坐标查询 | 否 | 替换 q 参数 |

### 注册与获取 Key

1. 访问 [OpenWeather](https://openweathermap.org/api)
2. 注册账户
3. 进入 API Keys 页面
4. 复制默认 Key 或创建新 Key

### 浏览器 Fetch 示例

```typescript
const API_KEY = 'YOUR_OPENWEATHER_API_KEY';

interface OpenWeatherParams {
  city: string;
  units?: 'metric' | 'imperial';
  lang?: string;
}

async function getWeatherOpenWeather({
  city,
  units = 'metric',
  lang = 'zh_cn'
}: OpenWeatherParams): Promise<WeatherData> {
  const url = new URL('https://api.openweathermap.org/data/2.5/weather');
  url.searchParams.set('q', city);
  url.searchParams.set('appid', API_KEY);
  url.searchParams.set('units', units);
  url.searchParams.set('lang', lang);

  const response = await fetch(url.toString());
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Weather API error');
  }
  
  const data: OpenWeatherResponse = await response.json();
  
  return {
    location: `${data.name}, ${data.sys.country}`,
    temp: Math.round(data.main.temp),
    feelsLike: Math.round(data.main.feels_like),
    humidity: data.main.humidity,
    windSpeed: Math.round(data.wind.speed * 3.6), // m/s 转 km/h
    windDir: degreesToDirection(data.wind.deg),
    condition: data.weather[0].main,
    uvIndex: 0, // 需要单独 API
    visibility: data.visibility / 1000,
    pressure: data.main.pressure,
    precipitation: 0 // 需要降水 API
  };
}

function degreesToDirection(deg: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return directions[Math.round(deg / 45) % 8];
}
```

### 完整响应示例

```json
{
  "coord": { "lon": 116.39, "lat": 39.91 },
  "weather": [
    {
      "id": 800,
      "main": "Clear",
      "description": "clear sky",
      "icon": "01d"
    }
  ],
  "main": {
    "temp": 15,
    "feels_like": 14,
    "temp_min": 13,
    "temp_max": 17,
    "pressure": 1018,
    "humidity": 72
  },
  "visibility": 10000,
  "wind": { "speed": 3.5, "deg": 45 },
  "clouds": { "all": 0 },
  "dt": 1705312800,
  "sys": {
    "country": "CN",
    "sunrise": 1705280400,
    "sunset": 1705316400
  },
  "timezone": 28800,
  "name": "Beijing"
}
```

### 错误处理

```typescript
async function safeGetWeather(city: string): Promise<WeatherData | null> {
  try {
    return await getWeatherOpenWeather({ city });
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case 'city not found':
          console.error(`City "${city}" not found`);
          break;
        case 'Invalid API key':
          console.error('Check your API key');
          break;
        case 'Too many requests':
          console.error('Rate limit exceeded');
          break;
        default:
          console.error('Unknown error:', error.message);
      }
    }
    return null;
  }
}
```

---

## 对比与选型

### 核心对比

| 维度 | wttr.in | OpenWeather |
|------|---------|-------------|
| **费用** | 免费 | 免费套餐 1000 次/天 |
| **注册** | 无需 | 需要 |
| **数据精度** | 一般 | 高精度 |
| **可靠性** | 无 SLA | 有 SLA |
| **响应速度** | 快 | 适中 |
| **天气类型数** | 有限 | 50+ 种 |
| **预报支持** | 3 天 | 5 天/16 天 |
| **紫外线指数** | 支持 | 需单独 API |
| **历史数据** | 不支持 | 支持 |

### 选型建议

```
┌─────────────────────────────────────────────────────────┐
│                    Weather API 选型                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  快速原型 / 学习 / 个人项目                              │
│    └─→ wttr.in（无需注册，立即可用）                     │
│                                                         │
│  生产环境 / 需要高可靠性                                 │
│    └─→ OpenWeather（专业数据，保证可用性）               │
│                                                         │
│  中国地区 / 中文支持                                     │
│    └─→ wttr.in（内置中文）                              │
│    └─→ OpenWeather（lang=zh_cn）                        │
│                                                         │
│  需要专业数据（如空气质量、花粉指数）                     │
│    └─→ OpenWeather（专用 API）                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 安全建议

```typescript
// ❌ 避免：将 API Key 硬编码在前端代码
const API_KEY = 'your_secret_key';

// ✅ 推荐：使用环境变量或代理
const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

// ✅ 最佳：通过后端代理转发请求
// 前端 -> 你的后端 -> OpenWeather
async function getWeatherProxy(city: string) {
  const response = await fetch(`/api/weather?city=${city}`);
  return response.json();
}
```

---

## 交互式示例

访问 `examples/weather/weather-api-demo.html` 体验完整的交互式演示，包括：

- wttr.in API 实时调用
- OpenWeather API 集成
- TypeScript 类型定义展示
- API 对比分析

---

## 相关资源

- [wttr.in 文档](https://github.com/chubin/wttr.in)
- [OpenWeather API 文档](https://openweathermap.org/api)
- [Weather API 类型定义](../examples/weather/weather-api-demo.html)
