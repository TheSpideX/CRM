import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { logger } from '@/utils/logger';
import { secureGet, secureSet, secureClear } from '../utils/auth-storage';
import { AuthError } from '../errors/auth-error';
import { AuthApi } from '../api/auth-api';

export interface DeviceInfo {
  fingerprint: string;
  userAgent: string;
  platform: string;
  screenResolution: string;
  timezone: string;
  language: string;
  colorDepth?: number;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  touchSupport?: boolean;
  webglInfo?: string;
  fonts?: string[];
  plugins?: string[];
  canvas?: string;
  ip?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
}

export interface TrustedDevice {
  id: string;
  fingerprint: string;
  name: string;
  userAgent: string;
  lastUsed: number;
  trusted: boolean;
  trustExpiration: number;
  verifiedAt?: number;
  createdAt: number;
}

export interface DeviceVerificationStatus {
  required: boolean;
  verified: boolean;
  method?: 'email' | 'sms' | 'app';
  expiresAt?: number;
  deviceId?: string;
}

export class DeviceService {
  private readonly COMPONENT = 'DeviceService';
  private readonly DEVICE_FINGERPRINT_KEY = 'device_fingerprint';
  private readonly TRUSTED_DEVICES_KEY = 'trusted_devices';
  private readonly DEVICE_INFO_KEY = 'device_info';
  private readonly VERIFICATION_STATUS_KEY = 'device_verification';
  private readonly TRUST_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days
  private fpPromise: Promise<any> | null = null;
  private deviceInfo: DeviceInfo | null = null;
  private verificationStatus: DeviceVerificationStatus | null = null;

  constructor() {
    this.fpPromise = FingerprintJS.load({
      monitoring: false, // Disable monitoring to respect privacy
      delayFallback: true // Improve performance
    });
    this.initializeTrustedDevices();
    this.loadVerificationStatus();
  }

  private initializeTrustedDevices(): void {
    try {
      const devices = secureGet<TrustedDevice[]>(this.TRUSTED_DEVICES_KEY);
      if (!devices) {
        secureSet(this.TRUSTED_DEVICES_KEY, []);
      } else {
        // Clean up expired devices on initialization
        this.cleanupExpiredDevices();
      }
    } catch (error) {
      logger.error('Failed to initialize trusted devices', {
        component: this.COMPONENT,
        action: 'initializeTrustedDevices',
        error
      });
      // Fallback to empty array
      secureSet(this.TRUSTED_DEVICES_KEY, []);
    }
  }

  private loadVerificationStatus(): void {
    try {
      this.verificationStatus = secureGet<DeviceVerificationStatus>(this.VERIFICATION_STATUS_KEY);
    } catch (error) {
      logger.error('Failed to load verification status', {
        component: this.COMPONENT,
        action: 'loadVerificationStatus',
        error
      });
    }
  }

  /**
   * Get complete device information including fingerprint
   */
  public async getDeviceInfo(forceRefresh = false): Promise<DeviceInfo> {
    if (this.deviceInfo && !forceRefresh) {
      return this.deviceInfo;
    }

    try {
      // Try to load cached device info first
      const cachedInfo = secureGet<DeviceInfo>(this.DEVICE_INFO_KEY);
      if (cachedInfo && !forceRefresh) {
        this.deviceInfo = cachedInfo;
        return cachedInfo;
      }

      const fingerprint = await this.generateDeviceFingerprint();
      
      const deviceInfo: DeviceInfo = {
        fingerprint,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        colorDepth: window.screen.colorDepth,
        hardwareConcurrency: navigator.hardwareConcurrency || undefined,
        deviceMemory: (navigator as any).deviceMemory || undefined,
        touchSupport: 'ontouchstart' in window,
        webglInfo: this.getWebGLInfo(),
        fonts: await this.getAvailableFonts(),
        plugins: this.getPluginsInfo()
      };
      
      this.deviceInfo = deviceInfo;
      
      // Cache device info
      secureSet(this.DEVICE_INFO_KEY, deviceInfo);
      
      logger.debug('Device info generated', {
        component: this.COMPONENT,
        action: 'getDeviceInfo'
      });
      
      return deviceInfo;
    } catch (error) {
      logger.error('Failed to get device info', {
        component: this.COMPONENT,
        action: 'getDeviceInfo',
        error
      });
      
      // Return basic info if error occurs
      const basicInfo: DeviceInfo = {
        fingerprint: await this.generateBasicFingerprint(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language
      };
      
      this.deviceInfo = basicInfo;
      return basicInfo;
    }
  }

  /**
   * Generate device fingerprint using FingerprintJS
   */
  public async generateDeviceFingerprint(): Promise<string> {
    try {
      // Check if we have a stored fingerprint
      const storedFingerprint = secureGet<string>(this.DEVICE_FINGERPRINT_KEY);
      if (storedFingerprint) {
        return storedFingerprint;
      }

      // Generate a new fingerprint
      if (!this.fpPromise) {
        this.fpPromise = FingerprintJS.load({
          monitoring: false,
          delayFallback: true
        });
      }
      
      const fp = await this.fpPromise;
      const result = await fp.get({
        extendedResult: true,
        timeout: 5000 // 5 second timeout
      });
      
      const fingerprint = result.visitorId;
      
      // Store the fingerprint
      secureSet(this.DEVICE_FINGERPRINT_KEY, fingerprint);
      
      logger.debug('Device fingerprint generated', {
        component: this.COMPONENT,
        action: 'generateDeviceFingerprint'
      });
      
      return fingerprint;
    } catch (error) {
      logger.error('Failed to generate device fingerprint', {
        component: this.COMPONENT,
        action: 'generateDeviceFingerprint',
        error
      });
      
      // Fallback to a basic fingerprint if FingerprintJS fails
      return this.generateBasicFingerprint();
    }
  }

  /**
   * Generate a basic fingerprint as fallback
   */
  private async generateBasicFingerprint(): Promise<string> {
    const components = [
      navigator.userAgent,
      navigator.language,
      navigator.platform,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency,
      this.getWebGLInfo(),
      'ontouchstart' in window
    ];

    const fingerprintData = components.join('|');
    
    // Use SubtleCrypto if available
    if (window.crypto && window.crypto.subtle) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(fingerprintData);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (error) {
        // Fall back to simple hash if SubtleCrypto fails
        return this.simpleHash(fingerprintData);
      }
    }
    
    return this.simpleHash(fingerprintData);
  }

  /**
   * Simple hash function for fallback fingerprinting
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  /**
   * Get WebGL information for fingerprinting
   */
  private getWebGLInfo(): string {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) {
        return 'webgl-not-supported';
      }
      
      const renderer = gl.getParameter(gl.RENDERER);
      const vendor = gl.getParameter(gl.VENDOR);
      
      return `${vendor}|${renderer}`;
    } catch (e) {
      return 'webgl-error';
    }
  }

  /**
   * Get available fonts for fingerprinting
   */
  private async getAvailableFonts(): Promise<string[]> {
    if (!(document as any).fonts || typeof (document as any).fonts.check !== 'function') {
      return [];
    }
    
    const fontList = [
      'Arial', 'Courier New', 'Georgia', 'Times New Roman', 
      'Verdana', 'Helvetica', 'Tahoma', 'Trebuchet MS'
    ];
    
    const availableFonts: string[] = [];
    
    for (const font of fontList) {
      try {
        const isAvailable = await (document as any).fonts.check(`12px "${font}"`);
        if (isAvailable) {
          availableFonts.push(font);
        }
      } catch (e) {
        // Skip this font
      }
    }
    
    return availableFonts;
  }

  /**
   * Get browser plugins information
   */
  private getPluginsInfo(): string[] {
    if (!navigator.plugins || navigator.plugins.length === 0) {
      return [];
    }
    
    const plugins: string[] = [];
    
    for (let i = 0; i < navigator.plugins.length; i++) {
      const plugin = navigator.plugins[i];
      if (plugin && plugin.name) {
        plugins.push(plugin.name);
      }
    }
    
    return plugins;
  }

  /**
   * Store device information on the server
   */
  public async storeDeviceInfo(userId?: string): Promise<void> {
    try {
      const deviceInfo = await this.getDeviceInfo();
      
      // Only store on server if we have a user ID
      if (userId) {
        await AuthApi.storeDeviceInfo({
          userId,
          deviceInfo
        });
        
        logger.debug('Device info stored on server', {
          component: this.COMPONENT,
          action: 'storeDeviceInfo'
        });
      }
    } catch (error) {
      logger.error('Failed to store device info', {
        component: this.COMPONENT,
        action: 'storeDeviceInfo',
        error
      });
    }
  }

  /**
   * Trust current device
   */
  public async trustCurrentDevice(name?: string): Promise<TrustedDevice> {
    const deviceInfo = await this.getDeviceInfo();
    return this.trustDevice(deviceInfo.fingerprint, name);
  }

  /**
   * Trust a specific device by fingerprint
   */
  public async trustDevice(fingerprint: string, name?: string): Promise<TrustedDevice> {
    try {
      const trustedDevices = this.getTrustedDevices();
      const now = Date.now();
      const trustExpiration = now + this.TRUST_DURATION;
      const deviceInfo = await this.getDeviceInfo();

      // Check if device is already trusted
      const existingIndex = trustedDevices.findIndex(d => d.fingerprint === fingerprint);
      
      let device: TrustedDevice;
      
      if (existingIndex >= 0) {
        // Update existing device
        device = {
          ...trustedDevices[existingIndex],
          trustExpiration,
          lastUsed: now,
          trusted: true,
          name: name || trustedDevices[existingIndex].name
        };
        trustedDevices[existingIndex] = device;
      } else {
        // Add new trusted device
        device = {
          id: this.generateDeviceId(),
          fingerprint,
          trustExpiration,
          lastUsed: now,
          trusted: true,
          name: name || `Device ${new Date().toLocaleDateString()}`,
          userAgent: deviceInfo.userAgent,
          createdAt: now,
          verifiedAt: now
        };
        trustedDevices.push(device);
      }

      secureSet(this.TRUSTED_DEVICES_KEY, trustedDevices);
      
      // Update verification status
      if (this.verificationStatus) {
        this.verificationStatus.verified = true;
        this.verificationStatus.deviceId = device.id;
        secureSet(this.VERIFICATION_STATUS_KEY, this.verificationStatus);
      }
      
      logger.debug('Device trusted', {
        component: this.COMPONENT,
        action: 'trustDevice'
      });
      
      return device;
    } catch (error) {
      logger.error('Failed to trust device', {
        component: this.COMPONENT,
        action: 'trustDevice',
        error
      });
      throw new AuthError('DEVICE_TRUST_FAILED', 'Failed to trust device');
    }
  }

  /**
   * Generate a unique device ID
   */
  private generateDeviceId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  /**
   * Check if current device is trusted
   */
  public async isCurrentDeviceTrusted(): Promise<boolean> {
    const deviceInfo = await this.getDeviceInfo();
    return this.isDeviceTrusted(deviceInfo.fingerprint);
  }

  /**
   * Check if a specific device is trusted
   */
  public isDeviceTrusted(fingerprint: string): boolean {
    try {
      const trustedDevices = this.getTrustedDevices();
      const now = Date.now();
      
      // Find device and check if trust hasn't expired
      const device = trustedDevices.find(d => 
        d.fingerprint === fingerprint && 
        d.trusted && 
        d.trustExpiration > now
      );
      
      return !!device;
    } catch (error) {
      logger.error('Failed to check if device is trusted', {
        component: this.COMPONENT,
        action: 'isDeviceTrusted',
        error
      });
      return false;
    }
  }

  /**
   * Get all trusted devices
   */
  public getTrustedDevices(): TrustedDevice[] {
    try {
      const devices = secureGet<TrustedDevice[]>(this.TRUSTED_DEVICES_KEY) || [];
      return devices;
    } catch (error) {
      logger.error('Failed to get trusted devices', {
        component: this.COMPONENT,
        action: 'getTrustedDevices',
        error
      });
      return [];
    }
  }

  /**
   * Get current device
   */
  public async getCurrentDevice(): Promise<TrustedDevice | null> {
    try {
      const deviceInfo = await this.getDeviceInfo();
      const trustedDevices = this.getTrustedDevices();
      
      return trustedDevices.find(d => d.fingerprint === deviceInfo.fingerprint) || null;
    } catch (error) {
      logger.error('Failed to get current device', {
        component: this.COMPONENT,
        action: 'getCurrentDevice',
        error
      });
      return null;
    }
  }

  /**
   * Untrust a device
   */
  public untrustDevice(deviceId: string): boolean {
    try {
      const trustedDevices = this.getTrustedDevices();
      const deviceIndex = trustedDevices.findIndex(d => d.id === deviceId);
      
      if (deviceIndex >= 0) {
        trustedDevices[deviceIndex].trusted = false;
        secureSet(this.TRUSTED_DEVICES_KEY, trustedDevices);
        
        logger.debug('Device untrusted', {
          component: this.COMPONENT,
          action: 'untrustDevice',
          deviceId
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Failed to untrust device', {
        component: this.COMPONENT,
        action: 'untrustDevice',
        error
      });
      return false;
    }
  }

  /**
   * Remove a device from trusted devices
   */
  public removeDevice(deviceId: string): boolean {
    try {
      let trustedDevices = this.getTrustedDevices();
      const initialCount = trustedDevices.length;
      
      trustedDevices = trustedDevices.filter(d => d.id !== deviceId);
      
      if (trustedDevices.length !== initialCount) {
        secureSet(this.TRUSTED_DEVICES_KEY, trustedDevices);
        
        logger.debug('Device removed', {
          component: this.COMPONENT,
          action: 'removeDevice',
          deviceId
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Failed to remove device', {
        component: this.COMPONENT,
        action: 'removeDevice',
        error
      });
      return false;
    }
  }

  /**
   * Clean up expired trusted devices
   */
  public cleanupExpiredDevices(): void {
    try {
      const trustedDevices = this.getTrustedDevices();
      const now = Date.now();
      
      const validDevices = trustedDevices.filter(d => d.trustExpiration > now);
      
      if (validDevices.length !== trustedDevices.length) {
        secureSet(this.TRUSTED_DEVICES_KEY, validDevices);
        
        logger.debug('Expired devices cleaned up', {
          component: this.COMPONENT,
          action: 'cleanupExpiredDevices',
          removed: trustedDevices.length - validDevices.length
        });
      }
    } catch (error) {
      logger.error('Failed to clean up expired devices', {
        component: this.COMPONENT,
        action: 'cleanupExpiredDevices',
        error
      });
    }
  }

  /**
   * Check if a device is known (has been seen before)
   */
  public async isKnownDevice(): Promise<boolean> {
    try {
      const deviceInfo = await this.getDeviceInfo();
      const trustedDevices = this.getTrustedDevices();
      
      return trustedDevices.some(d => d.fingerprint === deviceInfo.fingerprint);
    } catch (error) {
      logger.error('Failed to check if device is known', {
        component: this.COMPONENT,
        action: 'isKnownDevice',
        error
      });
      return false;
    }
  }

  /**
   * Initiate device verification process
   */
  public async initiateDeviceVerification(method: 'email' | 'sms' = 'email'): Promise<DeviceVerificationStatus> {
    try {
      const deviceInfo = await this.getDeviceInfo();
      
      // Call API to initiate verification
      const response = await AuthApi.initiateDeviceVerification({
        deviceInfo,
        method
      });
      
      // Store verification status
      this.verificationStatus = {
        required: true,
        verified: false,
        method,
        expiresAt: Date.now() + (10 * 60 * 1000), // 10 minutes
        deviceId: response.deviceId
      };
      
      secureSet(this.VERIFICATION_STATUS_KEY, this.verificationStatus);
      
      logger.debug('Device verification initiated', {
        component: this.COMPONENT,
        action: 'initiateDeviceVerification',
        method
      });
      
      return this.verificationStatus;
    } catch (error) {
      logger.error('Failed to initiate device verification', {
        component: this.COMPONENT,
        action: 'initiateDeviceVerification',
        error
      });
      throw new AuthError('DEVICE_VERIFICATION_FAILED', 'Failed to initiate device verification');
    }
  }

  /**
   * Verify device with verification code
   */
  public async verifyDevice(code: string): Promise<boolean> {
    try {
      if (!this.verificationStatus) {
        throw new AuthError('NO_VERIFICATION_IN_PROGRESS', 'No device verification in progress');
      }
      
      if (this.verificationStatus.verified) {
        return true; // Already verified
      }
      
      const deviceInfo = await this.getDeviceInfo();
      
      // Call API to verify device
      const response = await AuthApi.verifyDevice({
        deviceInfo,
        code,
        method: this.verificationStatus.method || 'email'
      });
      
      if (response.verified) {
        // Update verification status
        this.verificationStatus.verified = true;
        secureSet(this.VERIFICATION_STATUS_KEY, this.verificationStatus);
        
        // Trust this device
        await this.trustCurrentDevice();
        
        logger.debug('Device verified successfully', {
          component: this.COMPONENT,
          action: 'verifyDevice'
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Failed to verify device', {
        component: this.COMPONENT,
        action: 'verifyDevice',
        error
      });
      throw new AuthError('DEVICE_VERIFICATION_FAILED', 'Failed to verify device');
    }
  }

  /**
   * Get current verification status
   */
  public getVerificationStatus(): DeviceVerificationStatus | null {
    return this.verificationStatus;
  }

  /**
   * Reset device verification status
   */
  public resetVerificationStatus(): void {
    this.verificationStatus = null;
    secureClear(this.VERIFICATION_STATUS_KEY);
  }

  /**
   * Update device name
   */
  public updateDeviceName(deviceId: string, name: string): boolean {
    try {
      const trustedDevices = this.getTrustedDevices();
      const deviceIndex = trustedDevices.findIndex(d => d.id === deviceId);
      
      if (deviceIndex >= 0) {
        trustedDevices[deviceIndex].name = name;
        secureSet(this.TRUSTED_DEVICES_KEY, trustedDevices);
        
        logger.debug('Device name updated', {
          component: this.COMPONENT,
          action: 'updateDeviceName',
          deviceId
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Failed to update device name', {
        component: this.COMPONENT,
        action: 'updateDeviceName',
        error
      });
      return false;
    }
  }

  /**
   * Clear all device data
   */
  public clearDeviceData(): void {
    try {
      secureClear(this.DEVICE_FINGERPRINT_KEY);
      secureClear(this.TRUSTED_DEVICES_KEY);
      secureClear(this.DEVICE_INFO_KEY);
      secureClear(this.VERIFICATION_STATUS_KEY);
      
      this.deviceInfo = null;
      this.verificationStatus = null;
      
      logger.debug('Device data cleared', {
        component: this.COMPONENT,
        action: 'clearDeviceData'
      });
    } catch (error) {
      logger.error('Failed to clear device data', {
        component: this.COMPONENT,
        action: 'clearDeviceData',
        error
      });
    }
  }
}

// Export singleton instance
export const deviceService = new DeviceService();
