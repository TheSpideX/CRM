
/**
 * Service for monitoring and reporting server status
 */
class ServerStatusService {
  private isAvailable: boolean = true;
  private lastChecked: Date | null = null;
  private checkInterval: number = 30000; // 30 seconds
  private intervalId: number | null = null;

  constructor() {
    // Initialize with a status check
    this.checkServerAvailability();
    
    // Set up periodic checking
    this.startMonitoring();
  }

  /**
   * Start periodic server status monitoring
   */
  startMonitoring(): void {
    if (!this.intervalId) {
      this.intervalId = window.setInterval(() => {
        this.checkServerAvailability();
      }, this.checkInterval);
    }
  }

  /**
   * Stop periodic server status monitoring
   */
  stopMonitoring(): void {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check if the server is available
   * @returns Promise resolving to server availability status
   */
  async checkServerAvailability(): Promise<boolean> {
    try {
      // Use the configured axiosInstance
      const response = await axiosInstance.get('/api/health', { timeout: 5000 });
      this.isAvailable = response.status === 200;
      this.lastChecked = new Date();
      return this.isAvailable;
    } catch (error) {
      this.isAvailable = false;
      this.lastChecked = new Date();
      return false;
    }
  }

  /**
   * Get the current server status
   */
  getStatus(): { isAvailable: boolean; lastChecked: Date | null } {
    return {
      isAvailable: this.isAvailable,
      lastChecked: this.lastChecked
    };
  }
}

// Export a singleton instance
export const serverStatusService = new ServerStatusService();

/**
 * Service for monitoring and reporting server status
 */
class ServerStatusService {
  private isAvailable: boolean = true;
  private lastChecked: Date | null = null;
  private checkInterval: number = 30000; // 30 seconds
  private intervalId: number | null = null;

  constructor() {
    // Initialize with a status check
    this.checkServerAvailability();
    
    // Set up periodic checking
    this.startMonitoring();
  }

  /**
   * Start periodic server status monitoring
   */
  startMonitoring(): void {
    if (!this.intervalId) {
      this.intervalId = window.setInterval(() => {
        this.checkServerAvailability();
      }, this.checkInterval);
    }
  }

  /**
   * Stop periodic server status monitoring
   */
  stopMonitoring(): void {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check if the server is available
   * @returns Promise resolving to server availability status
   */
  async checkServerAvailability(): Promise<boolean> {
    try {
      // Simple health check implementation
      // In a real app, you would make an actual API call to a health endpoint
      this.isAvailable = true;
      this.lastChecked = new Date();
      return true;
    } catch (error) {
      this.isAvailable = false;
      this.lastChecked = new Date();
      return false;
    }
  }

  /**
   * Get the current server status
   */
  getStatus(): { isAvailable: boolean; lastChecked: Date | null } {
    return {
      isAvailable: this.isAvailable,
      lastChecked: this.lastChecked
    };
  }
}

// Export a singleton instance
export const serverStatusService = new ServerStatusService();
/**
 * Service for monitoring and reporting server status
 */
class ServerStatusService {
  private isAvailable: boolean = true;
  private lastChecked: Date | null = null;
  private checkInterval: number = 30000; // 30 seconds
  private intervalId: number | null = null;

  constructor() {
    // Initialize with a status check
    this.checkServerAvailability();
    
    // Set up periodic checking
    this.startMonitoring();
  }

  /**
   * Start periodic server status monitoring
   */
  startMonitoring(): void {
    if (!this.intervalId) {
      this.intervalId = window.setInterval(() => {
        this.checkServerAvailability();
      }, this.checkInterval);
    }
  }

  /**
   * Stop periodic server status monitoring
   */
  stopMonitoring(): void {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check if the server is available
   * @returns Promise resolving to server availability status
   */
  async checkServerAvailability(): Promise<boolean> {
    try {
      // Simple health check implementation
      // In a real app, you would make an actual API call to a health endpoint
      this.isAvailable = true;
      this.lastChecked = new Date();
      return true;
    } catch (error) {
      this.isAvailable = false;
      this.lastChecked = new Date();
      return false;
    }
  }

  /**
   * Get the current server status
   */
  getStatus(): { isAvailable: boolean; lastChecked: Date | null } {
    return {
      isAvailable: this.isAvailable,
      lastChecked: this.lastChecked
    };
  }
}

// Export a singleton instance
export const serverStatusService = new ServerStatusService();