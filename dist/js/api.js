// 发送网络请求前检查网络状态
async function safeNetworkRequest(url, options = {}) {
    try {
        // 检查网络状态（如果需要且在Capacitor环境）
        if (isCapacitorApp && Network) {
            const status = await Network.getStatus();
            if (!status.connected) {
                appState.isNetworkAvailable = false;
                throw new Error('网络连接不可用，请检查您的网络设置');
            }
            appState.isNetworkAvailable = true;
        }
        
        // 设置请求超时
        return new Promise((resolve, reject) => {
            const controller = new AbortController();
            const signal = controller.signal;
            options.signal = signal;
            
            const timeoutId = setTimeout(() => {
                controller.abort(); // 取消请求
                // appState.isLoading = false;
                showToast('请求超时，请检查网络或稍后重试');
                reject(new Error('请求超时'));
            }, config.requestTimeout);

            fetch(url, options)
                .then(async response => {
                    clearTimeout(timeoutId);
                    // appState.isLoading = false;
                    if (!response.ok) {
                        // 尝试解析错误信息
                        let errorData;
                        try {
                            errorData = await response.json();
                        } catch (e) {
                            // 如果无法解析JSON，使用状态文本
                        }
                        const statusText = response.statusText || '未知错误';
                        const errorCode = errorData?.code || response.status;
                        const errorMessage = `请求失败: ${errorCode} ${statusText}`;
                        console.error(errorMessage, errorData);
                        showToast(errorMessage); 
                        reject(new Error(errorMessage));
                    } else {
                        resolve(response);
                    }
                })
                .catch(error => {
                    clearTimeout(timeoutId);
                    // appState.isLoading = false;
                    
                    if (error.name === 'AbortError') {
                        console.log('请求已中止 (超时)');
                        // 超时错误已在timeout逻辑中处理，这里避免重复reject
                        return; 
                    }
                    
                    // 检查是否是网络问题
                    if (!appState.isNetworkAvailable || (isCapacitorApp && Network && !Network.getStatus().connected)) {
                        showToast('网络连接失败，请检查网络');
                         appState.pendingRequests.push({ url, options, resolve, reject });
                         console.log('网络不可用，添加请求到重试队列:', url);
                    } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                        // 可能是CORS、DNS或服务器不可达等网络层问题
                        showToast('无法连接到服务器，请稍后重试');
                        appState.pendingRequests.push({ url, options, resolve, reject });
                        console.log('Fetch失败，添加请求到重试队列:', url);
                    } else {
                        // 其他未知错误
                        console.error('Fetch 错误:', error);
                        showToast('发生未知错误');
                    }
                    reject(error);
                });
        });
    } catch (error) {
        // appState.isLoading = false;
        showToast(error.message || '请求准备失败');
        throw error;
    }
}

// 辅助函数：构建位置查询参数
function _buildLocationQuery(locationParam) {
    if (typeof locationParam === 'string') {
        // 假设字符串已经是 ID 或 经度,纬度 格式
        return `location=${locationParam}`;
    } else if (locationParam && typeof locationParam.latitude === 'number' && typeof locationParam.longitude === 'number') {
        return `location=${locationParam.longitude},${locationParam.latitude}`;
    } else if (Array.isArray(locationParam) && locationParam.length >= 2 && typeof locationParam[0] === 'number' && typeof locationParam[1] === 'number') {
        // 兼容经纬度作为单独参数传入的情况 (假设是 [latitude, longitude])
        return `location=${locationParam[1]},${locationParam[0]}`;
    }
    console.warn('无效的位置参数格式:', locationParam);
    return null; // 或者返回一个错误指示
}


// 获取天气数据
async function getWeatherData(locationParam) {
    const locationQuery = _buildLocationQuery(locationParam);
    if (!locationQuery) {
        console.error('无法构建天气数据的位置查询');
        showToast('位置参数错误');
        return; 
    }
    try {
        const url = `${config.weatherApiUrl}?${locationQuery}&key=${config.key}`;
        console.log('请求天气数据:', url);
        const response = await safeNetworkRequest(url);
        const data = await response.json();
        
        if (data.code === '200') {
            updateWeatherUI(data.now);
        } else {
            console.error('天气数据获取失败:', data);
            showToast(`天气数据错误: ${data.code}`);
        }
    } catch (error) {
        console.error('获取天气数据时捕获到错误:', error);
        // safeNetworkRequest 内部已处理部分错误提示
        throw error; // Re-throw the error for Promise.all
    }
}

// 获取空气质量数据
async function getAirQualityData(locationParam) {
    const locationQuery = _buildLocationQuery(locationParam);
    if (!locationQuery) {
        console.error('无法构建空气质量数据的位置查询');
        showToast('位置参数错误');
        return; 
    }
    try {
        const url = `${config.airQualityApiUrl}?${locationQuery}&key=${config.key}`;
        console.log('请求空气质量数据:', url);
        const response = await safeNetworkRequest(url);
        const data = await response.json();
        
        if (data.code === '200') {
            updateAirQualityUI(data.now);
        } else {
            console.error('空气质量数据获取失败:', data);
             showToast(`空气质量数据错误: ${data.code}`);
        }
    } catch (error) {
        console.error('获取空气质量数据时捕获到错误:', error);
         // safeNetworkRequest 内部已处理部分错误提示
        throw error; // Re-throw the error for Promise.all
    }
}

// 获取逐小时天气预报数据
async function getHourlyWeatherData(locationParam) {
    const locationQuery = _buildLocationQuery(locationParam);
    if (!locationQuery) {
        console.error('无法构建逐小时天气数据的位置查询');
        showToast('位置参数错误');
        return; 
    }
    try {
        const url = `${config.hourlyWeatherApiUrl}?${locationQuery}&key=${config.key}`;
        console.log('请求逐小时天气数据:', url);
        const response = await safeNetworkRequest(url);
        const data = await response.json();
        
        if (data.code === '200' && data.hourly) {
            updateForecastChart(data.hourly);
        } else {
            console.error('逐小时天气数据获取失败:', data);
            showToast(`逐小时数据错误: ${data.code}`);
        }
    } catch (error) {
        console.error('获取逐小时天气数据时捕获到错误:', error);
        // safeNetworkRequest 内部已处理部分错误提示
        throw error; // Re-throw the error for Promise.all
    }
}

// 搜索城市位置
async function searchLocation(query) {
    if (!query || query.trim().length === 0) {
        showToast('请输入搜索关键词');
        return null;
    }
    
    const url = `${config.geoApiUrl}?location=${encodeURIComponent(query)}&key=${config.key}&number=5`; // Limit to 5 results for now
    console.log('搜索位置:', url);
    
    try {
        const response = await safeNetworkRequest(url);
        const data = await response.json();
        
        if (data.code === '200' && data.location && data.location.length > 0) {
            console.log('搜索结果:', data.location);
            return data.location; // 返回整个结果数组
        } else if (data.code === '404') { // Handle no results specifically
             console.log('未找到匹配的地点');
             return []; // Return empty array for no results
        } else {
            console.error('城市搜索API错误:', data);
            showToast(`地点搜索失败: ${data.code}`);
            return null;
        }
    } catch (error) {
        console.error('搜索位置时捕获到错误:', error);
        showToast('搜索地点时出错');
        return null;
    }
}

/**
 * 根据经纬度查询城市信息
 * @param {number} latitude 纬度
 * @param {number} longitude 经度
 * @returns {Promise<object|null>} 返回包含 id 和 name 的地点对象，或在失败时返回 null
 */
async function searchCityByCoords(latitude, longitude) {
    // 注意：和风天气 Geo API 使用 lon,lat 格式
    const locationString = `${longitude.toFixed(4)},${latitude.toFixed(4)}`;
    const url = `${config.geoApiUrl}?location=${locationString}&key=${config.key}`;
    console.log(`正在查询坐标: ${locationString}, URL: ${url}`); // Log for debugging

    try {
        // Assuming fetchWithTimeout exists from previous context or you have a similar utility
        const response = await fetchWithTimeout(url, { method: 'GET' }, config.requestTimeout);
        if (!response.ok) {
            throw new Error(`Geo API 请求失败: ${response.status}`);
        }
        const data = await response.json();
        console.log("Geo API 响应:", data); // Log response

        if (data.code === '200' && data.location && data.location.length > 0) {
            const loc = data.location[0];
            // 构建一个用户友好的名称，类似于 defaultLocationName 的格式
            let nameParts = [loc.name, loc.adm2, loc.adm1, loc.country];
            // 过滤掉空的部分并用逗号连接
            const name = nameParts.filter(part => part && part.trim() !== '' && part.toLowerCase() !== 'na').join(', ');
            console.log(`坐标反查成功: ID=${loc.id}, Name=${name}`);
            return { id: loc.id, name: name };
        } else {
            console.warn('Geo API 未返回有效的地点信息。 Code:', data.code);
            return null;
        }
    } catch (error) {
        console.error('坐标反查时出错:', error);
        return null;
    }
}

// 如果你使用了模块系统 (ES Modules 或 CommonJS)，请确保导出此函数
// export { searchCityByCoords, ... (other exports) }; 