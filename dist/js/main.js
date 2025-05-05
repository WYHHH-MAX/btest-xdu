// 加载指定地点的天气数据
async function loadWeatherForLocation(locationId, locationName) {
    console.log(`加载地点天气: ${locationName} (ID: ${locationId})`);
    appState.currentLocationId = locationId; // 更新当前地点 ID 状态
    appState.currentLocationName = locationName; // 更新当前地点名称状态
    hideInlineSearchResults(); // Hide dropdown if visible
    if (elements.locationName) {
        // Exit edit mode FIRST before changing content
        if (appState.isEditingLocation) {
            toggleLocationEditMode(false);
        }
        elements.locationName.textContent = locationName; // 更新显示的地点名称
    }

    try {
        // 并行获取所有天气相关数据
        await Promise.all([
            getWeatherData(locationId),
            getAirQualityData(locationId),
            getHourlyWeatherData(locationId)
        ]);
        console.log(`地点 ${locationName} 的天气数据加载完成`);
    } catch (error) {
        console.error(`加载地点 ${locationName} 天气时出错:`, error);
        showToast(`加载 ${locationName} 天气失败`);
        // 错误处理：可以选择恢复到默认地点或显示错误信息
    }
}

// 显示搜索结果 (修改为内联下拉)
function displaySearchResults(results) {
    const listElement = elements.inlineSearchResultsList;
    const containerElement = elements.inlineSearchResultsContainer;
    if (!listElement || !containerElement) return;
    listElement.innerHTML = ''; // 清空旧结果

    if (!results || results.length === 0) {
         const li = document.createElement('li');
         li.textContent = '未找到结果';
         li.classList.add('no-results');
         listElement.appendChild(li);
    } else {
        results.forEach(location => {
            const li = document.createElement('li');
            const displayName = [
                location.name,
                location.adm2 && location.adm2 !== location.name ? location.adm2 : null,
                location.adm1 && location.adm1 !== location.adm2 ? location.adm1 : null,
                location.country
            ].filter(Boolean).join(', ');
            
            li.textContent = displayName;
            li.dataset.locationId = location.id;
            li.dataset.locationName = displayName;
            listElement.appendChild(li);
        });
    }
    containerElement.style.display = 'block'; // 显示下拉容器
    // Modal is no longer used for results
    // elements.searchModal.style.display = 'block'; 
}

// 关闭搜索结果弹窗 (现在未使用，但保留)
function closeSearchModal() {
    if (elements.searchModal) {
        elements.searchModal.style.display = 'none';
        elements.searchResultsList.innerHTML = ''; // 清空列表内容
    }
}

// 切换地点编辑模式
function toggleLocationEditMode(forceState = null) {
    const isEditing = forceState !== null ? forceState : !appState.isEditingLocation;
    
    const locationNameSpan = elements.locationName;
    const editSearchBtn = elements.locationEditSearchBtn;
    const editSearchIcon = editSearchBtn ? editSearchBtn.querySelector('i') : null;

    if (!locationNameSpan || !editSearchBtn || !editSearchIcon) {
        console.error("无法切换编辑模式：缺少必要的元素。");
        return;
    }
    
    // Only proceed if state is actually changing
    if (isEditing === appState.isEditingLocation) return;
    appState.isEditingLocation = isEditing;

    if (isEditing) {
        // Store original name before enabling edit
        appState.originalLocationNameBeforeEdit = locationNameSpan.textContent.trim();
        
        locationNameSpan.setAttribute('contenteditable', 'true');
        locationNameSpan.classList.add('editing'); // Add class for styling
        editSearchIcon.textContent = 'check'; // Change icon to checkmark
        
        // Focus and select text
        locationNameSpan.focus();
        // Use setTimeout to ensure focus is set before selecting
        setTimeout(() => {
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(locationNameSpan);
            selection.removeAllRanges();
            selection.addRange(range);
        }, 0);

    } else {
        hideInlineSearchResults(); // Ensure dropdown is hidden when exiting edit mode
        locationNameSpan.setAttribute('contenteditable', 'false');
        locationNameSpan.classList.remove('editing'); // Remove editing class
        editSearchIcon.textContent = 'search'; // Change icon back to search
        // Restore original text if necessary (e.g., after Esc)
        // Blur event handles restoring text on losing focus outside button
        locationNameSpan.blur(); // Remove focus
        appState.originalLocationNameBeforeEdit = null; // Clear stored name
    }
}

// 处理地点搜索逻辑 (从行内编辑确认按钮或Enter触发)
async function handleInlineLocationSearch() {
    if (!elements.locationName) return;
    
    const query = elements.locationName.textContent.replace(/\s|&nbsp;/g, ' ').trim();
    
    // Don't exit edit mode here, wait for selection or cancel
    // toggleLocationEditMode(false); 

    if (!query) {
        showToast('请输入城市名称进行搜索');
        hideInlineSearchResults(); // Hide if empty query
        return;
    }
    
    // If query is same as *original* name, just close dropdown/cancel edit
    if (query === appState.originalLocationNameBeforeEdit) {
        console.log("查询与编辑前地点相同，取消搜索。");
        hideInlineSearchResults();
        // Don't restore text here, blur/escape will handle it
        // elements.locationName.textContent = appState.originalLocationNameBeforeEdit;
        // toggleLocationEditMode(false);
        return; 
    }
    
    console.log(`开始搜索: ${query}`);
    showToast(`正在搜索: ${query}...`, 1500); // Show loading state
    const results = await searchLocation(query); 
    
    // Display results (or no results message) in the inline dropdown
    displaySearchResults(results);

    // If search fails, keep editing mode active with the failed query
    if (results === null) {
        showToast('搜索失败，请重试');
        // Do not restore name here, keep the failed query visible
    } 
    
    // Do NOT change locationName text here or exit edit mode
}

// 初始化应用
async function initApp() {
    console.log("Initializing app...");

    // --- BEGIN: Capacitor Geolocation Logic ---
    try {
        // 检查 Capacitor 是否可用 (在浏览器环境中运行时会失败)
        if (window.Capacitor && window.Capacitor.isPluginAvailable('Geolocation')) {
            const { Geolocation } = window.Capacitor.Plugins;

            console.log('检查位置权限...');
            let permStatus = await Geolocation.checkPermissions();
            console.log('初始权限状态:', permStatus);

            if (permStatus.location !== 'granted' && permStatus.coarseLocation !== 'granted') {
                console.log('请求位置权限...');
                permStatus = await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] });
                console.log('请求后的权限状态:', permStatus);
            }

            if (permStatus.location === 'granted' || permStatus.coarseLocation === 'granted') {
                console.log('位置权限已获取，尝试获取当前位置...');
                try {
                    const position = await Geolocation.getCurrentPosition();
                    console.log('当前位置:', position.coords.latitude, position.coords.longitude);
                    // 注意：我们只获取并打印位置信息，不在此处使用它
                } catch (posError) {
                    console.error('获取位置信息失败:', posError);
                    // showToast('无法获取当前位置'); // <--- 注释掉这一行
                }
            } else {
                console.warn('用户未授予位置权限。');
                // 可以选择在这里显示一条消息给用户
                 showToast('未授予位置权限'); // <-- 保留这个，仅移除获取失败的提示
            }
        } else {
            console.log('Capacitor Geolocation 插件不可用 (可能在浏览器中运行)。');
        }
    } catch (error) {
        console.error('处理位置权限或获取位置时出错:', error);
    }
    // --- END: Capacitor Geolocation Logic ---

    appState.currentLocationName = config.defaultLocationName; // Initialize state
    
    // 直接加载默认位置的天气数据
    loadWeatherForLocation(config.defaultLocationId, config.defaultLocationName);
    initForecastChart(); 
    
    // --- Event Listeners --- 

    // Inline Location Edit/Search Button
    if (elements.locationEditSearchBtn) {
        elements.locationEditSearchBtn.addEventListener('mousedown', (e) => {
            e.preventDefault(); 
            if (appState.isEditingLocation) {
                handleInlineLocationSearch(); 
            } else {
                toggleLocationEditMode(true); 
            }
        });
    } else {
        console.error("Location edit/search button not found!");
    }
    
    // Location Name Span Event Listeners (for Enter, Escape, Blur)
    if (elements.locationName) {
        elements.locationName.addEventListener('keydown', (event) => {
            if (!appState.isEditingLocation) return; 
            
            if (event.key === 'Enter') {
                event.preventDefault(); 
                handleInlineLocationSearch();
            } else if (event.key === 'Escape') {
                // Cancel edit - restore original text then exit mode
                hideInlineSearchResults();
                if (appState.originalLocationNameBeforeEdit !== null) {
                    elements.locationName.textContent = appState.originalLocationNameBeforeEdit;
                }
                toggleLocationEditMode(false);
            }
        });
        
        // Modified Blur listener
        elements.locationName.addEventListener('blur', (event) => {
             if (appState.isEditingLocation) {
                // Use relatedTarget to see if focus moved to the dropdown
                const relatedTarget = event.relatedTarget;
                
                // Check if focus is moving to the dropdown container or its children
                const isFocusMovingToDropdown = elements.inlineSearchResultsContainer && 
                                                elements.inlineSearchResultsContainer.contains(relatedTarget);

                if (isFocusMovingToDropdown) {
                    // If focus moved to dropdown, do nothing, let dropdown click handle it
                    console.log("Focus moved to dropdown, keeping edit mode.");
                    return; 
                }

                // Otherwise, CANCEL the edit
                console.log("Blur detected away from dropdown, canceling edit.");
                // Use setTimeout to slightly delay cancelation, allows button clicks etc.
                setTimeout(() => {
                    if (appState.isEditingLocation) { // Double check state
                        hideInlineSearchResults();
                        if (appState.originalLocationNameBeforeEdit !== null) {
                            elements.locationName.textContent = appState.originalLocationNameBeforeEdit;
                        }
                        toggleLocationEditMode(false); 
                    }
                }, 100); // Shorter timeout might be okay now
            }
        });
    }
    
    // Inline Search Results List Click Listener
    if (elements.inlineSearchResultsList) {
        elements.inlineSearchResultsList.addEventListener('click', (event) => {
            const targetLi = event.target.closest('li');
            if (targetLi && !targetLi.classList.contains('no-results') && targetLi.dataset.locationId) {
                const selectedId = targetLi.dataset.locationId;
                const selectedName = targetLi.dataset.locationName;
                console.log(`选择了地点 (内联): ${selectedName} (ID: ${selectedId})`);
                
                // Hide dropdown FIRST
                hideInlineSearchResults(); 
                // Exit edit mode (implicitly handled by loadWeatherForLocation)
                // toggleLocationEditMode(false);
                // Load weather for selected location
                loadWeatherForLocation(selectedId, selectedName); 
            }
        });
    }

    // Refresh Button - 强化刷新按钮的初始化和事件绑定
    let refreshBtn = elements.refreshBtn;
    if (!refreshBtn) {
        // 如果elements中没有找到，直接从DOM获取
        refreshBtn = document.getElementById('refresh-btn');
        // 更新elements对象
        if (refreshBtn) elements.refreshBtn = refreshBtn;
    }
    
    if (refreshBtn) {
        // 确保只绑定一次事件
        refreshBtn.removeEventListener('click', refreshData);
        refreshBtn.addEventListener('click', refreshData);
        console.log("刷新按钮事件已绑定");
    } else {
        console.error("刷新按钮未找到，将在DOM加载完成后再次尝试");
        // DOM完全加载后再次尝试
        setTimeout(() => {
            const btn = document.getElementById('refresh-btn');
            if (btn) {
                btn.addEventListener('click', refreshData);
                elements.refreshBtn = btn;
                console.log("刷新按钮延迟初始化成功");
            }
        }, 1000);
    }

    // Search Results Modal Elements (Listeners remain for now, but modal isn't shown by displaySearchResults)
    if (elements.modalCloseBtn) {
        elements.modalCloseBtn.addEventListener('click', closeSearchModal);
    }
    window.addEventListener('click', (event) => {
        // Close modal if clicked outside (if it were somehow shown)
        if (elements.searchModal && event.target == elements.searchModal) {
            closeSearchModal();
        }
        // Close inline dropdown if clicked outside location area & dropdown
        if (appState.isEditingLocation && 
            elements.locationName && !elements.locationName.contains(event.target) &&
            elements.locationEditSearchBtn && !elements.locationEditSearchBtn.contains(event.target) &&
            elements.inlineSearchResultsContainer && !elements.inlineSearchResultsContainer.contains(event.target)) {
                
            console.log("Clicked outside edit area, canceling edit.");
            // Use timeout to prevent race conditions with other events
            setTimeout(() => {
                if (appState.isEditingLocation) {
                    hideInlineSearchResults();
                    if (appState.originalLocationNameBeforeEdit !== null) {
                        elements.locationName.textContent = appState.originalLocationNameBeforeEdit;
                    }
                    toggleLocationEditMode(false);
                }
            }, 50); 
        }
    });
    // Remove modal list listener if modal is fully deprecated
    // if (elements.searchResultsList) { ... }

    console.log("App initialized.");
}

// 刷新当前地点数据
async function refreshData() {
    console.log("Refreshing data for current location...");
    
    // 添加旋转动画 - 首先确保按钮元素存在
    const refreshBtn = elements.refreshBtn || document.getElementById('refresh-btn');
    
    if (refreshBtn) {
        refreshBtn.classList.add('rotating');
        // 确保不会重复绑定事件
        // refreshBtn.removeEventListener('click', refreshData); // Re-binding might be okay here
        // refreshBtn.addEventListener('click', refreshData);
    } else {
        console.warn("刷新按钮未找到，但仍将继续刷新数据");
    }
    
    try {
        // 使用当前存储的 ID 和显示的名称重新加载天气
        const currentLocationId = appState.currentLocationId;
        const currentLocationName = elements.locationName ? elements.locationName.textContent : config.defaultLocationName;
        await loadWeatherForLocation(currentLocationId, currentLocationName);
        showToast('数据已刷新', 1500);
    } catch (error) {
        // loadWeatherForLocation 内部有错误处理，这里记录额外的错误
        console.error('刷新数据过程中发生未捕获错误:', error);
        showToast('刷新失败，请重试', 2000); 
    } finally {
        // 无论成功或失败，都移除旋转动画
        setTimeout(() => {
           if (refreshBtn) {
                refreshBtn.classList.remove('rotating');
           }
        }, 500); 
        console.log("Refresh complete.");
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    console.log('应用启动: DOM 加载完毕');
    // 初始化应用
    initApp();
}); 