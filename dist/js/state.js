// 状态管理
const appState = {
    isNetworkAvailable: true,
    isLoading: false,
    lastNetworkError: null,
    pendingRequests: [],
    currentLocationId: config.defaultLocationId, // Track current location ID
    isEditingLocation: false // Track location editing state
}; 