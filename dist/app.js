// 配置信息
const config = {
    weatherApiUrl: 'https://na6pg6mtw4.re.qweatherapi.com/v7/weather/now',
    hourlyWeatherApiUrl: 'https://na6pg6mtw4.re.qweatherapi.com/v7/weather/24h',
    airQualityApiUrl: 'https://na6pg6mtw4.re.qweatherapi.com/v7/air/now',
    key: 'd50b40892514481fa93637fe18814db7' // 请替换为您的实际API密钥
};

// 检查是否在Capacitor环境中运行
const isCapacitorApp = typeof window.Capacitor !== 'undefined';
// 如果在Capacitor环境中运行，导入所需插件
let Geolocation;
let Network;
if (isCapacitorApp) {
    // 动态导入Capacitor插件
    try {
        Geolocation = window.Capacitor.Plugins.Geolocation;
        Network = window.Capacitor.Plugins.Network;
        
        // 检查网络状态
        async function checkNetworkStatus() {
            if (Network) {
                try {
                    const status = await Network.getStatus();
                    if (!status.connected) {
                        alert('网络连接不可用，请检查您的网络设置');
                    }
                } catch (e) {
                    console.error('检查网络状态失败:', e);
                }
            }
        }
        // 初始检查网络状态
        checkNetworkStatus();
    } catch (e) {
        console.error('Capacitor插件加载失败:', e);
    }
}

// 缓存DOM元素
const elements = {
    locationName: document.getElementById('location-name'),
    refreshBtn: document.getElementById('refresh-btn'),
    weatherIcon: document.getElementById('weather-icon'),
    temperature: document.getElementById('temperature'),
    weatherText: document.getElementById('weather-text'),
    humidity: document.getElementById('humidity'),
    windDir: document.getElementById('wind-dir'),
    windSpeed: document.getElementById('wind-speed'),
    aqiCircle: document.getElementById('aqi-circle'),
    aqiValue: document.getElementById('aqi-value'),
    aqiLevel: document.getElementById('aqi-level'),
    primaryPollutant: document.getElementById('primary-pollutant'),
    healthAdvice: document.getElementById('health-advice'),
    pm2p5: document.getElementById('pm2p5'),
    pm10: document.getElementById('pm10'),
    co: document.getElementById('co'),
    no2: document.getElementById('no2'),
    so2: document.getElementById('so2'),
    o3: document.getElementById('o3'),
    humidityChart: document.getElementById('humidity-chart')
};

// 湿度数据
let humidityChart;

// 天气图标映射
const weatherIcons = {
    '100': 'clear-day',
    '101': 'cloudy',
    '102': 'partly-cloudy-day',
    '103': 'partly-cloudy-day',
    '104': 'cloudy',
    '150': 'clear-night',
    '151': 'cloudy',
    '152': 'partly-cloudy-night',
    '153': 'partly-cloudy-night',
    '300': 'rain',
    '301': 'rain',
    '302': 'thunder-rain',
    '303': 'thunder',
    '304': 'thunder-shower',
    '305': 'rain',
    '306': 'heavy-rain',
    '307': 'rain',
    '308': 'heavy-rain',
    '309': 'drizzle',
    '310': 'storm-rain',
    '311': 'drizzle',
    '312': 'storm-rain',
    '313': 'drizzle',
    '314': 'heavy-rain',
    '315': 'heavy-rain',
    '316': 'rain',
    '317': 'rain',
    '318': 'rain',
    '350': 'rain',
    '351': 'rain',
    '399': 'rain',
    '400': 'snow',
    '401': 'snow',
    '402': 'snow',
    '403': 'snow',
    '404': 'sleet',
    '405': 'rain-snow',
    '406': 'rain-snow',
    '407': 'snow',
    '408': 'snow',
    '409': 'snow',
    '410': 'snow',
    '456': 'snow',
    '457': 'snow',
    '499': 'snow',
    '500': 'fog',
    '501': 'fog',
    '502': 'haze',
    '503': 'dust',
    '504': 'dust',
    '507': 'dust',
    '508': 'dust',
    '509': 'fog',
    '510': 'fog',
    '511': 'fog',
    '512': 'fog',
    '513': 'fog',
    '514': 'fog',
    '515': 'fog',
    '900': 'hot',
    '901': 'cold',
    '999': 'unknown'
};

// 发送网络请求前检查网络状态
async function safeNetworkRequest(url, options = {}) {
    // 如果在Capacitor环境中运行，先检查网络状态
    if (isCapacitorApp && Network) {
        try {
            const status = await Network.getStatus();
            if (!status.connected) {
                throw new Error('网络连接不可用，请检查您的网络设置');
            }
        } catch (e) {
            console.error('检查网络状态失败:', e);
            // 即使检查失败，也尝试发送请求
        }
    }
    
    // 尝试发送网络请求
    return fetch(url, options);
}

// 辅助函数：构建位置查询参数
function _buildLocationQuery(locationParam) {
    if (typeof locationParam === 'string') {
        return `location=${locationParam}`;
    } else if (locationParam && locationParam.latitude && locationParam.longitude) {
        return `location=${locationParam.longitude},${locationParam.latitude}`;
    } else if (Array.isArray(locationParam) && locationParam.length >= 2) {
        // 兼容经纬度作为单独参数传入的情况 (假设是 [latitude, longitude])
        return `location=${locationParam[1]},${locationParam[0]}`;
    }
    console.warn('Invalid locationParam format:', locationParam);
    return null; // 或者返回一个默认值/错误指示
}

// 初始化应用
function initApp() {
    // 获取用户位置
    getUserLocation();
    
    // 初始化湿度图表
    initHumidityChart();
    
    // 添加刷新按钮事件监听
    elements.refreshBtn.addEventListener('click', refreshData);
}

// 获取用户地理位置
async function getUserLocation() {
    // 如果在Capacitor环境中运行，使用Capacitor Geolocation插件
    if (isCapacitorApp && Geolocation) {
        try {
            elements.locationName.textContent = '检查权限...'; // Initial status

            // 1. Check permissions first
            let permissionStatus = await Geolocation.checkPermissions();

            // 2. If not granted, request permissions
            if (permissionStatus.location !== 'granted') {
                elements.locationName.textContent = '请求权限...'; // Status update
                permissionStatus = await Geolocation.requestPermissions();
            }

            // 3. Check the final permission status
            if (permissionStatus.location === 'granted') {
                elements.locationName.textContent = '获取位置中...'; // Status update
                // 4. Only get position if permission is granted
                const position = await Geolocation.getCurrentPosition({
                    enableHighAccuracy: true,
                    timeout: 10000
                });
                const { latitude, longitude } = position.coords;
                // Proceed to get location name and weather data
                getLocationName(latitude, longitude);
            } else {
                // Permission denied
                throw new Error('位置权限被拒绝');
            }
        } catch (error) {
            console.error('获取位置操作失败:', error); // More specific log
            // Determine specific error message for UI
            if (error && error.message && error.message.includes('被拒绝')) {
                elements.locationName.textContent = '未授予位置权限';
            } else if (error && error.message && error.message.includes('timeout')){
                 elements.locationName.textContent = '获取位置超时';
            } else {
                elements.locationName.textContent = '无法获取位置';
            }
            // Fallback to default location
            getWeatherData(39.92, 116.41);
            getAirQualityData(39.92, 116.41);
            getHourlyWeatherData(39.92, 116.41);
        }
    } 
    // 如果在浏览器中运行，使用浏览器的Geolocation API
    else if (navigator.geolocation) {
        elements.locationName.textContent = '获取位置中...';
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                getLocationName(latitude, longitude);
            },
            error => {
                console.error('获取位置失败:', error);
                elements.locationName.textContent = '位置获取失败，请刷新重试';
                // 使用默认位置（北京）
                getWeatherData(39.92, 116.41);
                getAirQualityData(39.92, 116.41);
                getHourlyWeatherData(39.92, 116.41);
            }
        );
    } else {
        elements.locationName.textContent = '您的浏览器不支持地理定位';
        // 使用默认位置（北京）
        getWeatherData(39.92, 116.41);
        getAirQualityData(39.92, 116.41);
        getHourlyWeatherData(39.92, 116.41);
    }
}

// 获取位置名称
async function getLocationName(latitude, longitude) {
    try {
        const response = await safeNetworkRequest(`${config.weatherApiUrl.split('/v7')[0]}/geo/v2/city/lookup?location=${longitude},${latitude}&key=${config.key}`);
        const data = await response.json();
        
        if (data.code === '200' && data.location && data.location.length > 0) {
            const location = data.location[0];
            // 显示完整地址信息：城市名+区名 (如果有区名的话)
            if (location.adm1 && location.name) {
                // 如果地点名和城市名相同，只显示一次
                if (location.adm1 === location.name) {
                    elements.locationName.textContent = location.name;
                } else if (location.adm2 && location.adm2 !== location.name) {
                    // 显示 省/市 + 城市市 + 区县区
                    // 检查adm2是否已经包含"市"字，name是否已经包含"区"字
                    const adm2Display = location.adm2.endsWith('市') ? location.adm2 : `${location.adm2}市`;
                    const nameDisplay = location.name.endsWith('区') ? location.name : `${location.name}区`;
                    elements.locationName.textContent = `${location.adm1} ${adm2Display} ${nameDisplay}`;
                } else {
                    // 显示 省/市 + 区县区
                    const nameDisplay = location.name.endsWith('区') ? location.name : `${location.name}区`;
                    elements.locationName.textContent = `${location.adm1} ${nameDisplay}`;
                }
            } else {
                elements.locationName.textContent = location.name;
            }
            
            // 如果获取到了locationId，可以用它来获取天气数据
            if (location.id) {
                // 使用location.id获取天气和空气质量数据
                getWeatherData(location.id);
                getAirQualityData(location.id);
                getHourlyWeatherData(location.id);
                return; // 已经使用ID获取了天气，不需要再使用经纬度
            }
            
        } else {
            elements.locationName.textContent = '未知位置';
        }
        
        // 如果没有得到location.id，仍然使用经纬度获取天气
        getWeatherData(latitude, longitude);
        getAirQualityData(latitude, longitude);
        getHourlyWeatherData(latitude, longitude);
    } catch (error) {
        console.error('获取位置名称失败:', error);
        elements.locationName.textContent = '位置解析失败';
        
        // 错误情况下也使用经纬度获取天气
        getWeatherData(latitude, longitude);
        getAirQualityData(latitude, longitude);
        getHourlyWeatherData(latitude, longitude);
    }
}

// 获取天气数据
async function getWeatherData(locationParam) {
    const locationQuery = _buildLocationQuery(locationParam);
    if (!locationQuery) {
        console.error('无法构建天气数据的位置查询');
        return; 
    }
    try {
        const response = await safeNetworkRequest(`${config.weatherApiUrl}?${locationQuery}&key=${config.key}`);
        const data = await response.json();
        
        if (data.code === '200') {
            updateWeatherUI(data.now);
        } else {
            console.error('天气数据获取失败:', data.code);
        }
    } catch (error) {
        console.error('获取天气数据失败:', error);
    }
}

// 获取空气质量数据
async function getAirQualityData(locationParam) {
    const locationQuery = _buildLocationQuery(locationParam);
    if (!locationQuery) {
        console.error('无法构建空气质量数据的位置查询');
        return; 
    }
    try {
        const response = await safeNetworkRequest(`${config.airQualityApiUrl}?${locationQuery}&key=${config.key}`);
        const data = await response.json();
        
        if (data.code === '200') {
            updateAirQualityUI(data.now);
        } else {
            console.error('空气质量数据获取失败:', data.code);
        }
    } catch (error) {
        console.error('获取空气质量数据失败:', error);
    }
}

// 获取逐小时天气预报数据
async function getHourlyWeatherData(locationParam) {
    const locationQuery = _buildLocationQuery(locationParam);
    if (!locationQuery) {
        console.error('无法构建逐小时天气数据的位置查询');
        return; 
    }
    try {
        const response = await safeNetworkRequest(`${config.hourlyWeatherApiUrl}?${locationQuery}&key=${config.key}`);
        const data = await response.json();
        
        if (data.code === '200' && data.hourly) {
            updateHumidityChart(data.hourly);
        } else {
            console.error('逐小时天气数据获取失败:', data.code);
        }
    } catch (error) {
        console.error('获取逐小时天气数据失败:', error);
    }
}

// 更新天气UI
function updateWeatherUI(weatherData) {
    elements.temperature.textContent = weatherData.temp;
    elements.weatherText.textContent = weatherData.text;
    elements.humidity.textContent = weatherData.humidity;
    elements.windDir.textContent = weatherData.windDir;
    elements.windSpeed.textContent = weatherData.windSpeed;
    
    // 设置天气图标
    const iconCode = weatherData.icon;
    // 使用 Bas Milius 的填充样式天气图标
    const iconName = weatherIcons[iconCode] || 'unknown';
    elements.weatherIcon.src = `https://cdn.jsdelivr.net/gh/basmilius/weather-icons/production/fill/all/${iconName}.svg`;
}

// 更新空气质量UI
function updateAirQualityUI(airData) {
    // 设置AQI值
    elements.aqiValue.textContent = airData.aqi;
    elements.aqiLevel.textContent = airData.category;
    
    // 根据AQI等级设置颜色
    setAqiColor(airData.aqi);
    
    // 设置首要污染物
    if (airData.primary === 'NA') {
        elements.primaryPollutant.textContent = '无';
    } else {
        elements.primaryPollutant.textContent = airData.primary;
    }
    
    // 设置简洁的健康建议
    let advice = '';
    const level = parseInt(airData.level);
    if (level === 1) {
        advice = '空气优，尽情活动！';
    } else if (level === 2) {
        advice = '空气良，适宜户外活动。';
    } else if (level === 3) {
        advice = '轻度污染，敏感人群减少户外。';
    } else if (level === 4) {
        advice = '中度污染，减少户外活动。';
    } else if (level === 5) {
        advice = '重度污染，避免户外活动。';
    } else if (level === 6) {
        advice = '严重污染，务必留在室内。';
    } else {
        advice = '暂无空气建议';
    }
    elements.healthAdvice.textContent = advice;
    
    // 更新污染物浓度
    elements.pm2p5.innerHTML = `<span class=\"value-num\">${airData.pm2p5}</span><span class=\"unit\"> μg/m³</span>`;
    elements.pm10.innerHTML = `<span class=\"value-num\">${airData.pm10}</span><span class=\"unit\"> μg/m³</span>`;
    elements.co.innerHTML = `<span class=\"value-num\">${airData.co}</span><span class=\"unit\"> mg/m³</span>`;
    elements.no2.innerHTML = `<span class=\"value-num\">${airData.no2}</span><span class=\"unit\"> μg/m³</span>`;
    elements.so2.innerHTML = `<span class=\"value-num\">${airData.so2}</span><span class=\"unit\"> μg/m³</span>`;
    elements.o3.innerHTML = `<span class=\"value-num\">${airData.o3}</span><span class=\"unit\"> μg/m³</span>`;
}

// 根据AQI设置颜色
function setAqiColor(aqi) {
    elements.aqiCircle.className = 'aqi-circle';
    
    if (aqi <= 50) {
        elements.aqiCircle.classList.add('aqi-good');
    } else if (aqi <= 100) {
        elements.aqiCircle.classList.add('aqi-moderate');
    } else if (aqi <= 150) {
        elements.aqiCircle.classList.add('aqi-unhealthy-sensitive');
    } else if (aqi <= 200) {
        elements.aqiCircle.classList.add('aqi-unhealthy');
    } else if (aqi <= 300) {
        elements.aqiCircle.classList.add('aqi-very-unhealthy');
    } else {
        elements.aqiCircle.classList.add('aqi-hazardous');
    }
}

// 初始化湿度图表
function initHumidityChart() {
    const ctx = elements.humidityChart.getContext('2d');
    
    humidityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: '湿度 (%)',
                data: [],
                borderColor: '#03a9f4',
                backgroundColor: 'rgba(3, 169, 244, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            return tooltipItems[0].label; // 显示时间作为标题
                        },
                        label: function(context) {
                            return `湿度: ${context.raw}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 20,
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    title: {
                        display: false,
                        text: '相对湿度 (%)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxTicksLimit: 12
                    },
                    title: {
                        display: false,
                        text: '时间'
                    }
                }
            }
        }
    });
}

// 使用逐小时预报数据更新湿度图表
function updateHumidityChart(hourlyData) {
    if (!humidityChart) {
        initHumidityChart();
    }
    
    // 提取时间和湿度数据
    const labels = [];
    const humidityData = [];
    
    hourlyData.forEach(item => {
        // 从日期时间字符串中提取时间
        const dateTime = new Date(item.fxTime);
        const hour = dateTime.getHours();
        const timeString = `${hour}:00`;
        
        labels.push(timeString);
        humidityData.push(item.humidity);
    });
    
    // 更新图表数据
    humidityChart.data.labels = labels;
    humidityChart.data.datasets[0].data = humidityData;
    humidityChart.update();
}

// 刷新数据
async function refreshData() {
    // 添加旋转动画
    elements.refreshBtn.classList.add('rotating');
    
    try {
        // 获取用户位置并刷新数据
        await getUserLocation();
    } catch (error) {
        console.error('刷新数据失败:', error);
    } finally {
        // 无论成功或失败，都移除旋转动画
        setTimeout(() => {
            elements.refreshBtn.classList.remove('rotating');
        }, 1000);
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp); 