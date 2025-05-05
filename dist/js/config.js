// 配置信息
const config = {
    weatherApiUrl: 'https://na6pg6mtw4.re.qweatherapi.com/v7/weather/now',
    hourlyWeatherApiUrl: 'https://na6pg6mtw4.re.qweatherapi.com/v7/weather/24h',
    airQualityApiUrl: 'https://na6pg6mtw4.re.qweatherapi.com/v7/air/now',
    geoApiUrl: 'https://na6pg6mtw4.re.qweatherapi.com/geo/v2/city/lookup',
    key: 'xxx', // 请替换为您的实际API密钥
    requestTimeout: 15000, // 请求超时时间(毫秒)
    defaultLocationId: '101110102', // 西安市长安区 ID
    defaultLocationName: '长安, 西安, 陕西省, 中国' // Default display name
};

// 天气图标映射 (主图标 - 使用 Fill 变体)
const weatherIconsFill = {
    // --- 晴 --- 
    '100': 'clear-day',         // 晴（白天）
    '150': 'clear-night',       // 晴（夜晚）
    // --- 云 --- 
    '101': 'partly-cloudy-day', // 多云（白天）
    '151': 'partly-cloudy-night',// 多云（夜晚）
    '102': 'partly-cloudy-day', // 少云（白天）
    '152': 'partly-cloudy-night',// 少云（夜晚）
    '103': 'partly-cloudy-day', // 晴间多云（白天）
    '153': 'partly-cloudy-night',// 晴间多云（夜晚）
    '104': 'overcast',          // 阴
    // --- 雨 --- 
    '300': 'rain',              // 阵雨（白天）
    '350': 'rain',              // 阵雨（夜晚）
    '301': 'heavy-rain',        // 强阵雨（白天）
    '351': 'heavy-rain',        // 强阵雨（夜晚）
    '302': 'thunder-rain',      // 雷阵雨
    '303': 'thunder-rain',      // 强雷阵雨
    '304': 'hail',              // 雷阵雨伴有冰雹
    '305': 'rain',              // 小雨
    '306': 'rain',              // 中雨
    '307': 'heavy-rain',        // 大雨
    '308': 'extreme-rain',      // 极端降雨
    '309': 'drizzle',           // 毛毛雨/细雨
    '310': 'extreme-rain',      // 暴雨
    '311': 'extreme-rain',      // 大暴雨
    '312': 'extreme-rain',      // 特大暴雨
    '313': 'sleet',             // 冻雨
    '314': 'rain',              // 小到中雨
    '315': 'heavy-rain',        // 中到大雨
    '316': 'heavy-rain',        // 大到暴雨
    '317': 'heavy-rain',        // 暴雨到大暴雨
    '318': 'heavy-rain',        // 大暴雨到特大暴雨
    '399': 'rain',              // 雨 (通用)
    // --- 雪 --- 
    '400': 'snow',              // 小雪
    '401': 'snow',              // 中雪
    '402': 'heavy-snow',        // 大雪
    '403': 'extreme-snow',      // 暴雪
    '404': 'rain-snow',         // 雨夹雪
    '405': 'rain-snow',         // 雨雪天气
    '406': 'rain-snow',         // 阵雨夹雪（白天）
    '456': 'rain-snow',         // 阵雨夹雪（夜晚）
    '407': 'snow',              // 阵雪（白天）
    '457': 'snow',              // 阵雪（夜晚）
    '408': 'snow',              // 小到中雪
    '409': 'heavy-snow',        // 中到大雪
    '410': 'heavy-snow',        // 大到暴雪
    '499': 'snow',              // 雪 (通用)
    // --- 雾霾沙尘 --- 
    '500': 'mist',              // 薄雾
    '501': 'fog',               // 雾
    '502': 'haze',              // 霾
    '503': 'dust',              // 扬沙
    '504': 'dust',              // 浮尘
    '507': 'dust-wind',         // 沙尘暴
    '508': 'dust-wind',         // 强沙尘暴
    '509': 'fog',               // 浓雾
    '510': 'extreme-fog',       // 强浓雾
    '511': 'haze',              // 中度霾
    '512': 'extreme-haze',      // 重度霾 
    '513': 'extreme-haze',      // 严重霾 
    '514': 'fog',               // 大雾
    '515': 'extreme-fog',       // 特强浓雾
    // --- 其他 --- 
    '900': 'thermometer-warmer',
    '901': 'thermometer-colder',
    '999': 'unknown' // Fallback for fill icons
};

// 天气图标映射 (小时预报图标 - 使用 Line 变体 - 基于实际可用图标)
const weatherIconsLine = {
    // --- 晴 --- 
    '100': 'clear-day',
    '150': 'clear-night',
    // --- 云 --- 
    '101': 'partly-cloudy-day', 
    '151': 'partly-cloudy-night',
    '102': 'partly-cloudy-day', // 少云（白天）
    '152': 'partly-cloudy-night',// 少云（夜晚）
    '103': 'partly-cloudy-day', // 晴间多云（白天）
    '153': 'partly-cloudy-night',// 晴间多云（夜晚）
    '104': 'overcast',          // 阴
    // --- 雨 --- 
    '300': 'rain',              // 阵雨（白天）
    '350': 'rain',              // 阵雨（夜晚）
    '301': 'rain',              // 强阵雨（白天） - 使用通用 rain
    '351': 'rain',              // 强阵雨（夜晚） - 使用通用 rain
    '302': 'thunderstorms-rain',     // 雷阵雨 
    '303': 'thunderstorms-rain',     // 强雷阵雨 
    '304': 'hail',              // 雷阵雨伴有冰雹
    '305': 'rain',              // 小雨
    '306': 'rain',              // 中雨
    '307': 'rain',              // 大雨 - 使用通用 rain
    '308': 'rain',              // 极端降雨 - 使用通用 rain
    '309': 'drizzle',           // 毛毛雨/细雨
    '310': 'rain',              // 暴雨 - 使用通用 rain
    '311': 'rain',              // 大暴雨 - 使用通用 rain
    '312': 'rain',              // 特大暴雨 - 使用通用 rain
    '313': 'sleet',             // 冻雨
    '314': 'rain',              // 小到中雨
    '315': 'rain',              // 中到大雨
    '316': 'rain',              // 大到暴雨
    '317': 'rain',              // 暴雨到大暴雨
    '318': 'rain',              // 大暴雨到特大暴雨
    '399': 'rain',              // 雨 (通用)
    // --- 雪 --- 
    '400': 'snow',              // 小雪
    '401': 'snow',              // 中雪
    '402': 'snow',              // 大雪 - 使用通用 snow
    '403': 'extreme-snow',      // 暴雪
    '404': 'sleet',             // 雨夹雪 - 使用 sleet 替代
    '405': 'sleet',             // 雨雪天气 - 使用 sleet 替代
    '406': 'sleet',             // 阵雨夹雪（白天）- 使用 sleet 替代
    '456': 'sleet',             // 阵雨夹雪（夜晚）- 使用 sleet 替代
    '407': 'snow',              // 阵雪（白天）
    '457': 'snow',              // 阵雪（夜晚）
    '408': 'snow',              // 小到中雪
    '409': 'snow',              // 中到大雪
    '410': 'extreme-snow',      // 大到暴雪
    '499': 'snow',              // 雪 (通用)
    // --- 雾霾沙尘 --- 
    '500': 'mist',              // 薄雾
    '501': 'fog',               // 雾
    '502': 'haze',              // 霾
    '503': 'dust',              // 扬沙
    '504': 'dust',              // 浮尘
    '507': 'dust-wind',         // 沙尘暴
    '508': 'dust-wind',         // 强沙尘暴
    '509': 'fog',               // 浓雾
    '510': 'extreme-fog',       // 强浓雾
    '511': 'haze',              // 中度霾
    '512': 'extreme-haze',      // 重度霾 
    '513': 'extreme-haze',      // 严重霾 
    '514': 'fog',               // 大雾
    '515': 'extreme-fog',       // 特强浓雾
    // --- 其他 --- 
    '900': 'thermometer-warmer',// 升温
    '901': 'thermometer-colder',// 降温
    '999': 'not-available'      // 未知/无匹配图标
}; 