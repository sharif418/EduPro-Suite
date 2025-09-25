'use client';

import React from 'react';
import { CulturalAdaptationService } from '../../lib/cultural-adaptation-service';

interface BengaliNumberDisplayProps {
  number: number | string;
  className?: string;
  showOriginal?: boolean;
  format?: 'number' | 'currency' | 'percentage';
  currency?: string;
}

const BengaliNumberDisplay: React.FC<BengaliNumberDisplayProps> = ({
  number,
  className = '',
  showOriginal = false,
  format = 'number',
  currency = 'BDT'
}) => {
  const formatNumber = (num: number | string): string => {
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    
    if (isNaN(numValue)) return '০';

    switch (format) {
      case 'currency':
        return `${currency} ${numValue.toLocaleString('bn-BD')}`;
      case 'percentage':
        return `${numValue.toFixed(1)}%`;
      default:
        return numValue.toLocaleString('bn-BD');
    }
  };

  const convertToBengali = (text: string): string => {
    return CulturalAdaptationService.convertToBengaliNumerals(text);
  };

  const originalText = formatNumber(number);
  const bengaliText = convertToBengali(originalText);

  return (
    <span className={`bengali-number ${className}`}>
      <span className="bengali-numerals font-bengali">
        {bengaliText}
      </span>
      {showOriginal && (
        <span className="original-numerals text-xs text-gray-500 ml-1">
          ({originalText})
        </span>
      )}
    </span>
  );
};

// Utility component for displaying Bengali dates
export const BengaliDateDisplay: React.FC<{
  date: Date | string;
  className?: string;
  showOriginal?: boolean;
  format?: 'short' | 'long' | 'numeric';
}> = ({
  date,
  className = '',
  showOriginal = false,
  format = 'short'
}) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const formatDate = (dateValue: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: format === 'long' ? 'long' : format === 'short' ? 'short' : 'numeric',
      day: 'numeric'
    };

    return dateValue.toLocaleDateString('bn-BD', options);
  };

  const originalText = formatDate(dateObj);
  const bengaliText = CulturalAdaptationService.convertToBengaliNumerals(originalText);

  return (
    <span className={`bengali-date ${className}`}>
      <span className="bengali-text font-bengali">
        {bengaliText}
      </span>
      {showOriginal && (
        <span className="original-text text-xs text-gray-500 ml-1">
          ({dateObj.toLocaleDateString('en-US')})
        </span>
      )}
    </span>
  );
};

// Utility component for displaying Bengali time
export const BengaliTimeDisplay: React.FC<{
  time: Date | string;
  className?: string;
  showOriginal?: boolean;
  format24?: boolean;
}> = ({
  time,
  className = '',
  showOriginal = false,
  format24 = false
}) => {
  const timeObj = typeof time === 'string' ? new Date(time) : time;
  
  const formatTime = (timeValue: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: !format24
    };

    return timeValue.toLocaleTimeString('bn-BD', options);
  };

  const originalText = formatTime(timeObj);
  const bengaliText = CulturalAdaptationService.convertToBengaliNumerals(originalText);

  return (
    <span className={`bengali-time ${className}`}>
      <span className="bengali-text font-bengali">
        {bengaliText}
      </span>
      {showOriginal && (
        <span className="original-text text-xs text-gray-500 ml-1">
          ({timeObj.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: !format24 
          })})
        </span>
      )}
    </span>
  );
};

// Hook for using Bengali number conversion
export const useBengaliNumbers = () => {
  const convertNumber = (number: number | string): string => {
    return CulturalAdaptationService.convertToBengaliNumerals(number.toString());
  };

  const convertCurrency = (amount: number, currency: string = 'BDT'): string => {
    const formatted = `${currency} ${amount.toLocaleString('bn-BD')}`;
    return CulturalAdaptationService.convertToBengaliNumerals(formatted);
  };

  const convertPercentage = (value: number): string => {
    const formatted = `${value.toFixed(1)}%`;
    return CulturalAdaptationService.convertToBengaliNumerals(formatted);
  };

  const convertDate = (date: Date): string => {
    const formatted = date.toLocaleDateString('bn-BD');
    return CulturalAdaptationService.convertToBengaliNumerals(formatted);
  };

  const convertTime = (time: Date, format24: boolean = false): string => {
    const formatted = time.toLocaleTimeString('bn-BD', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: !format24
    });
    return CulturalAdaptationService.convertToBengaliNumerals(formatted);
  };

  return {
    convertNumber,
    convertCurrency,
    convertPercentage,
    convertDate,
    convertTime
  };
};

export default BengaliNumberDisplay;
