import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Signal, SignalHigh, SignalLow } from 'lucide-react';
import axios from 'axios';

// Add the service class before the component
class ServerStatusService {
  private isAvailable: boolean = true;
  private lastChecked: Date | null = null;

  async checkServerAvailability(): Promise<boolean> {
    try {
      const start = Date.now();
      // Use the configured axiosInstance instead of direct axios
      await axiosInstance.get('/api/health', { timeout: 5000 });
      const responseTime = Date.now() - start;
      
      this.isAvailable = true;
      this.lastChecked = new Date();
      return responseTime < 300; // Return true for good performance
    } catch (error) {
      this.isAvailable = false;
      this.lastChecked = new Date();
      return false;
    }
  }

  getStatus(): { isAvailable: boolean; lastChecked: Date | null } {
    return {
      isAvailable: this.isAvailable,
      lastChecked: this.lastChecked
    };
  }
}

// Export the singleton instance
export const serverStatusService = new ServerStatusService();

export const ServerStatusIndicator = () => {
  const [status, setStatus] = useState<'online' | 'degraded' | 'offline'>('offline');
  const [latency, setLatency] = useState<number | null>(null);
  
  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const start = Date.now();
        // Use the configured axiosInstance instead of direct axios
        await axiosInstance.get('/api/health', { timeout: 5000 });
        const responseTime = Date.now() - start;
        setLatency(responseTime);
        
        if (responseTime < 300) {
          setStatus('online');
        } else {
          setStatus('degraded');
        }
      } catch (error) {
        setStatus('offline');
        setLatency(null);
      }
    };
    
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  if (process.env.NODE_ENV === 'production') return null;
  
  const getStatusIcon = () => {
    switch (status) {
      case 'online':
        return <SignalHigh size={14} className="text-emerald-400" />;
      case 'degraded':
        return <SignalLow size={14} className="text-amber-400" />;
      case 'offline':
        return <Signal size={14} className="text-red-400" />;
    }
  };
  
  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30';
      case 'degraded':
        return 'from-amber-500/20 to-amber-600/20 border-amber-500/30';
      case 'offline':
        return 'from-red-500/20 to-red-600/20 border-red-500/30';
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`fixed top-3 right-3 z-50 flex items-center gap-1.5 
                 text-xs px-2.5 py-1.5 rounded-full backdrop-blur-md
                 bg-gradient-to-r ${getStatusColor()}
                 border shadow-lg`}
    >
      {getStatusIcon()}
      <span className="font-medium text-gray-200">
        {status === 'online' && 'Connected'}
        {status === 'degraded' && 'Slow'}
        {status === 'offline' && 'Offline'}
      </span>
      {latency && (
        <span className="text-gray-400 text-[10px]">
          {latency}ms
        </span>
      )}
    </motion.div>
  );
};