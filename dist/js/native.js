// 检查是否在Capacitor环境中运行
const isCapacitorApp = typeof window.Capacitor !== 'undefined';

// 如果在Capacitor环境中运行，导入所需插件
// let Geolocation; // No longer needed for IP location
let Network;
if (isCapacitorApp) {
    // 动态导入Capacitor插件
    try {
        // Geolocation = window.Capacitor.Plugins.Geolocation; // No longer needed
        Network = window.Capacitor.Plugins.Network;
        
        // 添加网络状态变化监听器
        if (Network) {
            Network.addListener('networkStatusChange', status => {
                console.log('网络状态变化:', status);
                appState.isNetworkAvailable = status.connected;
                
                // 如果网络恢复，尝试重新发送挂起的请求
                if (status.connected && appState.pendingRequests.length > 0) {
                    console.log('网络已恢复，重试请求');
                    retryPendingRequests();
                }
            });
            
            // 初始检查网络状态
            checkNetworkStatus();
        }
    } catch (e) {
        console.error('Capacitor插件加载失败:', e);
    }
}

// 重试所有挂起的请求
function retryPendingRequests() {
    const requests = [...appState.pendingRequests];
    appState.pendingRequests = []; // 清空挂起请求列表
    
    requests.forEach(req => {
        console.log('重试请求:', req.url);
        fetch(req.url, req.options)
            .then(req.resolve)
            .catch(req.reject);
    });
}

// 检查网络状态
async function checkNetworkStatus() {
    if (isCapacitorApp && Network) { // Only check if Network plugin is available
        try {
            const status = await Network.getStatus();
            appState.isNetworkAvailable = status.connected;
            console.log('当前网络状态:', status.connected ? '已连接' : '未连接');
            
            if (!status.connected) {
                showToast('网络连接不可用，请检查您的网络设置');
            }
            return status.connected;
        } catch (e) {
            console.error('检查网络状态失败:', e);
            // Assume network is available if check fails, to allow browser fallback
            appState.isNetworkAvailable = true; 
            return false;
        }
    } else {
        // If not in Capacitor or Network plugin failed, check browser online status
        appState.isNetworkAvailable = navigator.onLine;
        if (!appState.isNetworkAvailable) {
             showToast('网络连接不可用，请检查您的网络设置');
        }
        console.log('浏览器网络状态:', appState.isNetworkAvailable ? '已连接' : '未连接');
        return appState.isNetworkAvailable;
    }
}

// 显示简单的Toast消息
function showToast(message, duration = 2000) {
    // 查找现有的toast，如果没有就创建新的
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    
    // 设置消息和显示
    toast.textContent = message;
    toast.classList.add('show');
    
    // 设置超时后隐藏
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
    
    console.log("显示Toast消息:", message);
}

// [getUserLocation function removed]

// [getLocationName function removed]

// [fallbackToLatLon function removed] 