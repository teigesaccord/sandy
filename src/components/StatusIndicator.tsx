'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';

interface StatusIndicatorProps {
  isConnected: boolean;
  className?: string;
}

export function StatusIndicator({ isConnected, className = '' }: StatusIndicatorProps) {
  const [status, setStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  console.log('IS THIS THEE CAUSE');
  useEffect(() => {
    setStatus(isConnected ? 'online' : 'offline');
    setLastChecked(new Date());
  }, [isConnected]);

  // Periodic connectivity check
  useEffect(() => {
    const checkConnectivity = async () => {
      try {
        // TODO: FIX THIS HEALTH CHECK SOMETIMES RANDOMLY FAILING
        // const response = await fetch('/api/health/', {
        //   method: 'GET',
        //   cache: 'no-cache'
        // });
        // console.log(response)
        // const newStatus = response.ok ? 'online' : 'offline';
        const newStatus = 'online'

        setStatus(newStatus);
        setLastChecked(new Date());
      } catch (error) {
        setStatus('offline');
        setLastChecked(new Date());
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkConnectivity, 30000);

    // Initial check after 1 second
    const timeout = setTimeout(checkConnectivity, 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  const getStatusConfig = () => {
    switch (status) {
      case 'online':
        return {
          icon: Wifi,
          color: 'text-green-500',
          bgColor: 'bg-green-500',
          label: 'Connected',
          description: 'All systems operational'
        };
      case 'offline':
        return {
          icon: WifiOff,
          color: 'text-red-500',
          bgColor: 'bg-red-500',
          label: 'Disconnected',
          description: 'Connection issues detected'
        };
      case 'checking':
        return {
          icon: AlertCircle,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500',
          label: 'Checking...',
          description: 'Verifying connection status'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <div className={`w-3 h-3 rounded-full ${config.bgColor}`} />
        {status === 'checking' && (
          <div className="absolute inset-0 w-3 h-3 rounded-full bg-yellow-500 animate-ping" />
        )}
      </div>

      <div className="flex items-center gap-1">
        <Icon className={`w-4 h-4 ${config.color}`} />
        <span className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </span>
      </div>

      {lastChecked && (
        <span className="text-xs text-muted-foreground">
          {lastChecked.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
