'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  apiResponseTime: number;
  memoryUsage: number;
  componentMountTime: number;
  lastUpdate: Date;
}

interface APICallMetrics {
  url: string;
  method: string;
  duration: number;
  status: number;
  timestamp: Date;
}

interface RenderMetrics {
  componentName: string;
  renderDuration: number;
  timestamp: Date;
}

interface PerformanceOptions {
  trackRenders?: boolean;
  trackAPICalls?: boolean;
  trackMemory?: boolean;
  sampleRate?: number;
}

export const usePerformance = (
  componentName: string,
  options: PerformanceOptions = {}
) => {
  const {
    trackRenders = true,
    trackAPICalls = true,
    trackMemory = true,
    sampleRate = 1.0,
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    apiResponseTime: 0,
    memoryUsage: 0,
    componentMountTime: 0,
    lastUpdate: new Date(),
  });

  const [apiCalls, setApiCalls] = useState<APICallMetrics[]>([]);
  const [renders, setRenders] = useState<RenderMetrics[]>([]);
  
  const mountTimeRef = useRef<number>(Date.now());
  const renderStartRef = useRef<number>(0);

  // Track component mount time
  useEffect(() => {
    if (trackRenders && Math.random() <= sampleRate) {
      const mountTime = Date.now() - mountTimeRef.current;
      setMetrics(prev => ({
        ...prev,
        componentMountTime: mountTime,
        lastUpdate: new Date(),
      }));
    }
  }, [trackRenders, sampleRate]);

  // Measure API call performance
  const measureAPICall = useCallback(async (
    url: string,
    fetchFunction: () => Promise<any>,
    method: string = 'GET'
  ): Promise<any> => {
    if (!trackAPICalls || Math.random() > sampleRate) {
      return fetchFunction();
    }

    const startTime = Date.now();

    try {
      const result = await fetchFunction();
      const endTime = Date.now();
      const duration = endTime - startTime;

      const apiMetric: APICallMetrics = {
        url,
        method,
        duration,
        status: 200,
        timestamp: new Date(),
      };

      setApiCalls(prev => [...prev.slice(-19), apiMetric]);
      setMetrics(prev => ({
        ...prev,
        apiResponseTime: duration,
        lastUpdate: new Date(),
      }));

      return result;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      const apiMetric: APICallMetrics = {
        url,
        method,
        duration,
        status: 500,
        timestamp: new Date(),
      };

      setApiCalls(prev => [...prev.slice(-19), apiMetric]);
      throw error;
    }
  }, [trackAPICalls, sampleRate]);

  // Get performance summary
  const getPerformanceSummary = useCallback(() => {
    const recentApiCalls = apiCalls.slice(-10);
    const recentRenders = renders.slice(-10);

    const avgApiTime = recentApiCalls.length > 0
      ? recentApiCalls.reduce((sum, call) => sum + call.duration, 0) / recentApiCalls.length
      : 0;

    const avgRenderTime = recentRenders.length > 0
      ? recentRenders.reduce((sum, render) => sum + render.renderDuration, 0) / recentRenders.length
      : 0;

    return {
      component: componentName,
      averageApiTime: Math.round(avgApiTime),
      averageRenderTime: Math.round(avgRenderTime),
      totalApiCalls: apiCalls.length,
      totalRenders: renders.length,
      memoryUsage: Math.round(metrics.memoryUsage * 100) / 100,
      mountTime: metrics.componentMountTime,
      lastUpdate: metrics.lastUpdate,
    };
  }, [apiCalls, renders, metrics, componentName]);

  return {
    metrics,
    apiCalls,
    renders,
    measureAPICall,
    getPerformanceSummary,
  };
};

export default usePerformance;
