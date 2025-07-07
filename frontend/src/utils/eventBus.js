// 简单的事件总线
class EventBus {
  constructor() {
    this.events = {}
  }

  // 监听事件
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(callback)
  }

  // 移除事件监听
  off(event, callback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback)
    }
  }

  // 触发事件
  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(data))
    }
  }
}

// 导出单例实例
export const eventBus = new EventBus() 