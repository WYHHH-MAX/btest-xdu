// 缓存DOM元素
const elements = {
    locationName: document.getElementById('location-name'), // Now also the input target
    refreshBtn: document.getElementById('refresh-btn'),
    // Inline Location Edit/Search elements
    locationEditSearchBtn: document.getElementById('location-edit-search-btn'),
    inlineSearchResultsContainer: document.getElementById('inline-search-results'),
    inlineSearchResultsList: document.querySelector('#inline-search-results ul'),
    // Weather elements
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
    forecastChart: document.getElementById('forecast-chart'),
    // Modal elements (kept for potential reuse or complete removal later)
    searchModal: document.getElementById('search-modal'),
    searchResultsList: document.getElementById('search-results-list'), // Keep reference if modal is reused
    modalCloseBtn: document.getElementById('modal-close-btn')
};

// 确保DOM加载完毕后初始化元素
document.addEventListener('DOMContentLoaded', () => {
    // 重新检查刷新按钮是否存在
    if (!elements.refreshBtn) {
        elements.refreshBtn = document.getElementById('refresh-btn');
        console.log('刷新按钮已重新初始化', elements.refreshBtn);
    }
    // 检查并初始化行内编辑/搜索按钮和结果容器
    if (!elements.locationEditSearchBtn) {
        elements.locationEditSearchBtn = document.getElementById('location-edit-search-btn');
    }
    if (!elements.locationName) {
        elements.locationName = document.getElementById('location-name');
    }
    if (!elements.inlineSearchResultsContainer) {
        elements.inlineSearchResultsContainer = document.getElementById('inline-search-results');
    }
    if (!elements.inlineSearchResultsList) {
        elements.inlineSearchResultsList = document.querySelector('#inline-search-results ul');
    }
});

// 气象图表
let forecastChart;

// Helper function to hide inline results
function hideInlineSearchResults() {
    if (elements.inlineSearchResultsContainer) {
        elements.inlineSearchResultsContainer.style.display = 'none';
        if (elements.inlineSearchResultsList) {
            elements.inlineSearchResultsList.innerHTML = ''; // Clear list
        }
    }
}

// 更新天气UI
function updateWeatherUI(weatherData) {
    elements.temperature.textContent = weatherData.temp;
    elements.weatherText.textContent = weatherData.text;
    elements.humidity.textContent = weatherData.humidity;
    elements.windDir.textContent = weatherData.windDir;
    elements.windSpeed.textContent = weatherData.windSpeed;
    
    // 设置天气图标 (使用 Fill 变体)
    const iconCode = weatherData.icon;
    // Use weatherIconsFill map and 'unknown' fallback
    let iconName = weatherIconsFill[iconCode] || 'unknown'; 
    
    // Fallback logic based on text (if needed, uses fill icons)
    if (!iconName || iconName === 'unknown') { // Check if mapping failed or resulted in unknown
        console.warn(`主图标映射失败或为 unknown: Code ${iconCode}, Text: ${weatherData.text}. 尝试文本匹配.`);
        const weatherTextLower = weatherData.text.toLowerCase();
        const hour = new Date().getHours();
        const isDay = hour >= 6 && hour < 18;

        if (weatherTextLower.includes('晴')) {
            iconName = isDay ? 'clear-day' : 'clear-night';
        } else if (weatherTextLower.includes('多云')) {
            iconName = isDay ? 'partly-cloudy-day' : 'partly-cloudy-night';
        } else if (weatherTextLower.includes('阴')) {
            iconName = 'overcast';
        } else if (weatherTextLower.includes('雨')) {
            if (weatherTextLower.includes('雷')) iconName = 'thunder-rain';
            else if (weatherTextLower.includes('大') || weatherTextLower.includes('暴')) iconName = 'heavy-rain';
            else iconName = 'rain';
        } else if (weatherTextLower.includes('雪')) {
            iconName = 'snow';
        } else if (weatherTextLower.includes('雾')) {
            iconName = 'fog';
        } else if (weatherTextLower.includes('霾')) {
            iconName = 'haze';
        } else {
            iconName = 'unknown'; // Final fallback
        }
        console.log(`文本匹配结果 (Fill): ${iconName}`);
    }
    
    // Set the src using the FILL variant path
    elements.weatherIcon.src = `https://cdn.jsdelivr.net/gh/basmilius/weather-icons/production/fill/all/${iconName}.svg`;
}

// 更新空气质量UI
function updateAirQualityUI(airData) {
    // 获取仪表盘相关元素
    const gaugeContainer = document.querySelector('.aqi-gauge-container');
    const valueArc = document.getElementById('aqi-gauge-value-arc');
    const valueText = document.getElementById('aqi-gauge-value-text');
    // const levelText = document.getElementById('aqi-gauge-level-text'); // Removed reference

    // if (!gaugeContainer || !valueArc || !valueText || !levelText) { // Updated check
    if (!gaugeContainer || !valueArc || !valueText) { // Check remaining elements
        console.error("AQI 仪表盘元素未找到!");
        return;
    }

    // 更新中心的文本
    valueText.textContent = airData.aqi;
    // levelText.textContent = airData.category; // Removed update for level text

    // 更新右侧信息 (保持不变)
    if (airData.primary === 'NA') {
        elements.primaryPollutant.textContent = '无';
    } else {
        elements.primaryPollutant.textContent = airData.primary;
    }
    elements.healthAdvice.textContent = getHealthAdvice(parseInt(airData.level));

    // --- 更新仪表盘圆弧 --- 
    const aqi = parseInt(airData.aqi);
    const maxAqiForGauge = 300; // 设置仪表盘满刻度的 AQI 值 (例如 300)
    const circumference = parseFloat(valueArc.getAttribute('stroke-dasharray')); // 获取周长 339.29

    // 计算百分比 (0-100)，超过 maxAqiForGauge 按 100% 算
    const percentage = Math.min(100, (aqi / maxAqiForGauge) * 100);
    // 计算 stroke-dashoffset
    const offset = circumference * (1 - percentage / 100);
    
    // 设置圆弧的偏移量
    valueArc.style.strokeDashoffset = offset;

    // --- 更新仪表盘颜色 (圆弧和文本) --- 
    // 移除旧的颜色类 (仍然需要它来设置圆弧颜色)
    gaugeContainer.className = 'aqi-gauge-container'; // Reset classes
    // 添加新的颜色类 (用于圆弧)
    let colorClass = '';

    if (aqi <= 50) {
        colorClass = 'aqi-gauge-good';
    } else if (aqi <= 100) {
        colorClass = 'aqi-gauge-moderate';
    } else if (aqi <= 150) {
        colorClass = 'aqi-gauge-unhealthy-sensitive';
    } else if (aqi <= 200) {
        colorClass = 'aqi-gauge-unhealthy';
    } else if (aqi <= 300) {
        colorClass = 'aqi-gauge-very-unhealthy';
    } else { // Hazardous
        colorClass = 'aqi-gauge-hazardous';
    }
    if (colorClass) {
        gaugeContainer.classList.add(colorClass);
    }

    // 更新污染物浓度 (保持不变)
    elements.pm2p5.innerHTML = `<span class="value-num">${airData.pm2p5}</span><span class="unit"> μg/m³</span>`;
    elements.pm10.innerHTML = `<span class="value-num">${airData.pm10}</span><span class="unit"> μg/m³</span>`;
    elements.co.innerHTML = `<span class="value-num">${airData.co}</span><span class="unit"> mg/m³</span>`;
    elements.no2.innerHTML = `<span class="value-num">${airData.no2}</span><span class="unit"> μg/m³</span>`;
    elements.so2.innerHTML = `<span class="value-num">${airData.so2}</span><span class="unit"> μg/m³</span>`;
    elements.o3.innerHTML = `<span class="value-num">${airData.o3}</span><span class="unit"> μg/m³</span>`;
}

// 辅助函数：获取健康建议 (从原 updateAirQualityUI 提取)
function getHealthAdvice(level) {
    let advice = '';
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
    return advice;
}

// 初始化天气预报图表
function initForecastChart() {
    const ctx = elements.forecastChart.getContext('2d');
    
    // 找到容器
    const forecastContainer = document.querySelector('.forecast-chart-container');
    const chartScrollContainer = document.querySelector('.chart-scroll-container');
    
    // 创建背景渐变 - 添加到forecast-chart-container而不是滚动容器
    const backgroundElement = document.createElement('div');
    backgroundElement.className = 'forecast-background';
    // 确保背景元素能够覆盖整个图表区域，包括滚动部分
    forecastContainer.prepend(backgroundElement); // 使用prepend确保背景在最底层
    
    // 创建温度标签容器
    const tempLabelsContainer = document.createElement('div');
    tempLabelsContainer.className = 'temp-labels-container';
    forecastContainer.appendChild(tempLabelsContainer);
    
    // 创建图例容器
    const legendContainer = document.createElement('div');
    legendContainer.className = 'chart-legend-container';
    
    // 添加温度图例
    const tempLegend = document.createElement('div');
    tempLegend.className = 'legend-item active';
    tempLegend.setAttribute('data-type', 'temp');
    tempLegend.innerHTML = '<span class="legend-color" style="background-color:#ffb100;"></span><span class="legend-text">温度 (°C)</span>';
    legendContainer.appendChild(tempLegend);
    
    // 添加湿度图例
    const humidityLegend = document.createElement('div');
    humidityLegend.className = 'legend-item';
    humidityLegend.setAttribute('data-type', 'humidity');
    humidityLegend.innerHTML = '<span class="legend-color" style="background-color:#3b82f6;"></span><span class="legend-text">湿度 (%)</span>';
    legendContainer.appendChild(humidityLegend);
    
    // 添加图例点击事件
    tempLegend.addEventListener('click', () => {
        toggleChartView('temp');
    });
    
    humidityLegend.addEventListener('click', () => {
        toggleChartView('humidity');
    });
    
    // 将图例添加到卡片标题下方，而不是图表内部
    const chartContainer = document.getElementById('weather-forecast-container');
    chartContainer.parentNode.insertBefore(legendContainer, chartContainer);
    
    forecastChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: '温度 (°C)',
                data: [],
                borderColor: '#ffb100',
                backgroundColor: 'rgba(255, 177, 0, 0.1)',
                borderWidth: 2.5,
                tension: 0.3,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#ffb100',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
                yAxisID: 'y',
                z: 10,
                hidden: false
            }, {
                label: '湿度 (%)',
                data: [],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2.5,
                tension: 0.3,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#3b82f6',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
                yAxisID: 'y1',
                hidden: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 10,
                    right: 10,
                    left: 20,
                    bottom: 10
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: false // 使用自定义图例，隐藏内置图例
                },
                tooltip: {
                    enabled: false  // 禁用tooltip详细信息窗口
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: false, // 隐藏温度Y轴
                    position: 'left',
                    suggestedMin: function(context) {
                        const min = Math.min(...context.chart.data.datasets[0].data);
                        return min > 0 ? min - 2 : min - 2;
                    },
                    suggestedMax: function(context) {
                        return Math.max(...context.chart.data.datasets[0].data) + 2;
                    }
                },
                y1: {
                    type: 'linear',
                    display: false, // 隐藏湿度Y轴
                    position: 'right',
                    min: 0,
                    max: 100
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        display: false // 隐藏X轴刻度
                    },
                    border: {
                        display: false
                    }
                }
            },
            // 添加动画配置
            animation: {
                duration: 800,
                easing: 'easeOutQuart'
            },
            transitions: {
                show: {
                    animations: {
                        y: {
                            from: 0
                        }
                    }
                },
                hide: {
                    animations: {
                        y: {
                            to: 0
                        }
                    }
                }
            }
        }
    });
    
    // 初始默认显示温度
    toggleChartView('temp');
}

// 切换图表视图（温度/湿度）
function toggleChartView(type) {
    if (!forecastChart) return;
    
    const tempLegend = document.querySelector('.legend-item[data-type="temp"]');
    const humidityLegend = document.querySelector('.legend-item[data-type="humidity"]');
    
    // 首先隐藏所有数据集
    forecastChart.data.datasets.forEach(dataset => {
        dataset.hidden = true;
    });
    
    // 根据选择显示对应数据集
    if (type === 'temp') {
        forecastChart.data.datasets[0].hidden = false; // 显示温度
        tempLegend.classList.add('active');
        humidityLegend.classList.remove('active');
        
        // 更新背景样式
        const background = document.querySelector('.forecast-background');
        if (background) {
            background.style.transition = 'background 0.6s ease';
            background.style.background = 'linear-gradient(to bottom, rgba(255, 248, 225, 0.2), rgba(255, 255, 255, 0.5))';
        }
    } else {
        forecastChart.data.datasets[1].hidden = false; // 显示湿度
        humidityLegend.classList.add('active');
        tempLegend.classList.remove('active');
        
        // 更新背景样式
        const background = document.querySelector('.forecast-background');
        if (background) {
            background.style.transition = 'background 0.6s ease';
            background.style.background = 'linear-gradient(to bottom, rgba(236, 246, 255, 0.2), rgba(255, 255, 255, 0.5))';
        }
    }
    
    // 启用动画更新图表
    forecastChart.update('active');
    
    // 更新标签显示
    updateLabelsVisibility(type);
}

// 更新标签可见性
function updateLabelsVisibility(type) {
    const tempLabels = document.querySelectorAll('.temp-label');
    const humidityLabels = document.querySelectorAll('.humidity-label');
    
    if (type === 'temp') {
        // 温度标签淡入，湿度标签淡出
        tempLabels.forEach(label => {
            label.style.display = 'block';
            label.style.opacity = '0';
            setTimeout(() => {
                label.style.transition = 'opacity 0.5s ease';
                label.style.opacity = '1';
            }, 10);
        });
        
        humidityLabels.forEach(label => {
            label.style.transition = 'opacity 0.5s ease';
            label.style.opacity = '0';
            setTimeout(() => {
                label.style.display = 'none';
            }, 500);
        });
    } else {
        // 湿度标签淡入，温度标签淡出
        tempLabels.forEach(label => {
            label.style.transition = 'opacity 0.5s ease';
            label.style.opacity = '0';
            setTimeout(() => {
                label.style.display = 'none';
            }, 500);
        });
        
        humidityLabels.forEach(label => {
            label.style.display = 'block';
            label.style.opacity = '0';
            setTimeout(() => {
                label.style.transition = 'opacity 0.5s ease';
                label.style.opacity = '1';
            }, 10);
        });
    }
}

// 绘制温度标签
function drawTemperatureLabels(temperatures, timeLabels) {
    const tempLabelsContainer = document.querySelector('.temp-labels-container');
    if (!tempLabelsContainer) return;
    
    // 清空现有内容
    tempLabelsContainer.innerHTML = '';
    
    // 获取图表区域和温度范围
    const chart = forecastChart;
    // 添加检查，确保 chart 和 scales 存在且包含所需轴
    if (!chart || !chart.scales || !chart.scales.x || !chart.scales.y || !chart.scales.y1) {
        console.error("无法绘制温度/湿度标签：图表或坐标轴未准备好。");
        return; // 如果图表或坐标轴无效，则不继续绘制
    }
    const xScale = chart.scales.x;
    const yScale = chart.scales.y;
    const y1Scale = chart.scales.y1;
    
    // 为所有点添加标签，确保与下方时间标签完全对齐
    for (let i = 0; i < temperatures.length; i++) {
        // --> 添加检查，确保 getPixelForValue 可以调用
        if (typeof xScale.getPixelForValue !== 'function' || typeof yScale.getPixelForValue !== 'function') continue;
        
        const x = xScale.getPixelForValue(i);
        const y = yScale.getPixelForValue(temperatures[i]);
        
        const label = document.createElement('div');
        label.className = 'temp-label';
        label.textContent = `${temperatures[i]}°`;
        label.style.position = 'absolute'; // Ensure absolute positioning
        label.style.left = `${x}px`;
        label.style.top = `${y - 20}px`; // 在温度点上方显示
        label.style.transform = 'translateX(-50%)'; // Center align text
        label.style.pointerEvents = 'none'; // Avoid interfering with chart interactions
        
        tempLabelsContainer.appendChild(label);
        
        // 为所有湿度值添加标签
        // --> 添加检查，确保湿度数据和 y1Scale 可用
        if (forecastChart.data.datasets[1] && forecastChart.data.datasets[1].data[i] !== undefined && typeof y1Scale.getPixelForValue === 'function') {
            const humidityY = y1Scale.getPixelForValue(forecastChart.data.datasets[1].data[i]);
            const humidityLabel = document.createElement('div');
            humidityLabel.className = 'humidity-label';
            humidityLabel.textContent = `${forecastChart.data.datasets[1].data[i]}%`;
            humidityLabel.style.position = 'absolute'; // Ensure absolute positioning
            humidityLabel.style.left = `${x}px`;
            humidityLabel.style.top = `${humidityY - 20}px`;
            humidityLabel.style.transform = 'translateX(-50%)'; // Center align text
            humidityLabel.style.display = 'none'; // 默认隐藏湿度标签
            humidityLabel.style.pointerEvents = 'none'; // Avoid interfering
            
            tempLabelsContainer.appendChild(humidityLabel);
        }
    }
}

// 使用逐小时预报数据更新天气预报图表
function updateForecastChart(hourlyData) {
    if (!forecastChart) {
        console.warn('天气预报图表未初始化');
        initForecastChart(); // 尝试重新初始化
    }
    
    if (!forecastChart) { // 如果再次检查仍未初始化，则退出
        console.error('无法初始化天气预报图表');
        return;
    }

    // 提取时间、温度和湿度数据
    const labels = [];
    const tempData = [];
    const humidityData = [];
    const weatherIcons = [];
    const weatherText = [];
    
    hourlyData.forEach(item => {
        // 从日期时间字符串中提取时间
        const dateTime = new Date(item.fxTime);
        // 确保时间是本地时间显示
        const hour = dateTime.getHours();
        const timeString = `${hour.toString().padStart(2, '0')}:00`; // 格式化为 HH:00
        
        labels.push(timeString);
        tempData.push(item.temp);
        humidityData.push(item.humidity);
        
        // 保存天气图标代码和文本描述
        weatherIcons.push(item.icon || '100'); // 默认为晴天图标
        weatherText.push(item.text || ''); // 天气文本描述
    });
    
    // 更新图表数据
    forecastChart.data.labels = labels;
    forecastChart.data.datasets[0].data = tempData;
    forecastChart.data.datasets[1].data = humidityData;
    
    // 使用 requestAnimationFrame 延迟绘制，确保图表渲染有机会完成
    forecastChart.update('none'); // 使用 'none' 模式避免不必要的动画，可能有助于稳定性

    requestAnimationFrame(() => {
        // 再次检查图表实例是否存在，以防万一
        if (!forecastChart) {
            console.error("延迟绘制时图表实例丢失。");
            return;
        }
        // 在图表更新后的下一帧绘制标签和图标
        drawTemperatureLabels(tempData, labels);
        drawWeatherIcons(weatherIcons, labels);
        // 如果之前有切换视图的逻辑，确保在这里更新标签可见性
        const activeType = document.querySelector('.legend-item.active')?.getAttribute('data-type') || 'temp';
        updateLabelsVisibility(activeType); 
    });
}

// 绘制天气图标 (小时预报 - 使用 Line 变体)
function drawWeatherIcons(iconCodes, timeLabels) {
    const container = document.querySelector('.forecast-chart-container');
    const existingIconsContainer = document.getElementById('weather-icons-container');
    if (existingIconsContainer) existingIconsContainer.remove();
    
    const iconsContainer = document.createElement('div');
    iconsContainer.id = 'weather-icons-container';
    iconsContainer.className = 'weather-icons-container';
    
    const chart = forecastChart;
    if (!chart || !chart.scales || !chart.scales.x) { // Add check for chart readiness
        console.error("无法绘制小时图标：图表或X轴未准备好。");
        return;
    }
    const xScale = chart.scales.x;
    
    iconCodes.forEach((iconCode, index) => {
        // Use weatherIconsLine map and 'cloudy' fallback
        const iconName = weatherIconsLine[iconCode] || 'cloudy'; 
        const timeLabel = timeLabels[index];
        
        const iconWrapper = document.createElement('div');
        iconWrapper.className = 'weather-icon-wrapper';
        
        const x = xScale.getPixelForValue(index);
        iconWrapper.style.position = 'absolute';
        iconWrapper.style.left = `${x}px`;
        iconWrapper.style.transform = 'translateX(-50%)';
        iconWrapper.style.width = '40px';
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'time-label';
        timeDiv.textContent = timeLabel;
        
        const iconImg = document.createElement('img');
        // Set the src using the LINE variant path
        iconImg.src = `https://cdn.jsdelivr.net/gh/basmilius/weather-icons/production/line/all/${iconName}.svg`;
        iconImg.alt = '天气图标';
        iconImg.className = 'hourly-weather-icon';
        
        // Add error handling for image loading
        iconImg.onerror = function() {
            console.warn(`无法加载 Line 图标: ${iconName}.svg, Code: ${iconCode}. 尝试后备图标 cloudy.svg`);
            this.src = `https://cdn.jsdelivr.net/gh/basmilius/weather-icons/production/line/all/cloudy.svg`;
            this.onerror = null; // Prevent infinite loop if cloudy also fails
        };
        
        iconWrapper.appendChild(timeDiv);
        iconWrapper.appendChild(iconImg);
        iconsContainer.appendChild(iconWrapper);
    });
    
    container.appendChild(iconsContainer);
} 