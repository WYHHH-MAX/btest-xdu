# 天气雾霾监测

一个简洁美观的天气雾霾监测网页应用，基于和风天气API，采用现代Material设计风格。

## 功能特点

- 🌤️ 实时天气信息展示（温度、天气状况、湿度、风向风速）
- 🌫️ 空气质量指数及污染物浓度展示
- 📊 湿度变化趋势图表
- 🌍 基于地理位置自动获取当地天气信息
- 📱 响应式设计，完美适配移动设备

## 如何使用

1. 克隆本仓库到本地
   ```
   git clone https://github.com/yourusername/weather-haze-detector.git
   ```

2. 在 `app.js` 文件中，将和风天气API密钥替换为您自己的密钥
   ```javascript
   const config = {
       weatherApiUrl: 'https://api.qweather.com/v7/weather/now',
       airQualityApiUrl: 'https://api.qweather.com/airquality/v1/current',
       key: '在此处替换为您的API密钥'
   };
   ```

3. 在浏览器中打开 `index.html` 文件即可使用

## 获取和风天气API密钥

1. 访问[和风天气开发服务](https://dev.qweather.com/)
2. 注册账号并创建应用
3. 在应用管理中获取API密钥

## 技术栈

- HTML5
- CSS3（使用Flexbox和Grid布局）
- JavaScript（ES6+）
- Chart.js（用于绘制湿度变化图表）
- 和风天气API

## 预览

![应用预览](preview.png)

## 项目结构

```
/
├── index.html        # 主HTML文件
├── styles.css        # 样式表
├── app.js            # JavaScript逻辑
└── README.md         # 项目说明文档
```

## 注意事项

- 本应用需要获取用户地理位置，请确保在支持地理定位的现代浏览器中使用
- 和风天气API有使用限制，请参考其官方文档了解详情
- 根据和风天气的服务条款，在商业使用时需要标明数据来源 