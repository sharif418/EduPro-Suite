'use client';

import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { motion } from 'framer-motion';

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: any;
}

export interface EducationalChartsProps {
  type: 'line' | 'area' | 'bar' | 'pie' | 'radial';
  data: ChartDataPoint[];
  title?: string;
  subtitle?: string;
  height?: number;
  colors?: string[];
  showBengaliNumbers?: boolean;
  animated?: boolean;
  className?: string;
  dataKeys?: string[];
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
}

const EducationalCharts: React.FC<EducationalChartsProps> = ({
  type,
  data,
  title,
  subtitle,
  height = 300,
  colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'],
  showBengaliNumbers = false,
  animated = true,
  className = '',
  dataKeys = ['value'],
  showGrid = true,
  showLegend = true,
  showTooltip = true,
}) => {
  // Bengali number conversion
  const toBengaliNumber = (num: number | string): string => {
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num.toString().replace(/\d/g, (digit) => bengaliDigits[parseInt(digit)]);
  };

  const formatNumber = (value: number): string => {
    return showBengaliNumbers ? toBengaliNumber(value) : value.toString();
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${formatNumber(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom label formatter for Bengali numbers
  const formatLabel = (value: any) => {
    if (typeof value === 'number') {
      return formatNumber(value);
    }
    return value;
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
              <XAxis 
                dataKey="name" 
                className="text-xs text-gray-600 dark:text-gray-400"
                tickFormatter={formatLabel}
              />
              <YAxis 
                className="text-xs text-gray-600 dark:text-gray-400"
                tickFormatter={formatLabel}
              />
              {showTooltip && <Tooltip content={<CustomTooltip />} />}
              {showLegend && <Legend />}
              {dataKeys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[index % colors.length]}
                  strokeWidth={3}
                  dot={{ fill: colors[index % colors.length], strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: colors[index % colors.length], strokeWidth: 2 }}
                  animationDuration={animated ? 1500 : 0}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
              <XAxis 
                dataKey="name" 
                className="text-xs text-gray-600 dark:text-gray-400"
                tickFormatter={formatLabel}
              />
              <YAxis 
                className="text-xs text-gray-600 dark:text-gray-400"
                tickFormatter={formatLabel}
              />
              {showTooltip && <Tooltip content={<CustomTooltip />} />}
              {showLegend && <Legend />}
              {dataKeys.map((key, index) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stackId="1"
                  stroke={colors[index % colors.length]}
                  fill={colors[index % colors.length]}
                  fillOpacity={0.6}
                  animationDuration={animated ? 1500 : 0}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
              <XAxis 
                dataKey="name" 
                className="text-xs text-gray-600 dark:text-gray-400"
                tickFormatter={formatLabel}
              />
              <YAxis 
                className="text-xs text-gray-600 dark:text-gray-400"
                tickFormatter={formatLabel}
              />
              {showTooltip && <Tooltip content={<CustomTooltip />} />}
              {showLegend && <Legend />}
              {dataKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={colors[index % colors.length]}
                  radius={[4, 4, 0, 0]}
                  animationDuration={animated ? 1500 : 0}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${formatNumber(Math.round(percent * 100))}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                animationDuration={animated ? 1500 : 0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              {showTooltip && <Tooltip content={<CustomTooltip />} />}
              {showLegend && <Legend />}
            </PieChart>
          </ResponsiveContainer>
        );

      case 'radial':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="10%" outerRadius="80%" data={data}>
              <RadialBar
                minAngle={15}
                label={{ position: 'insideStart', fill: '#fff' }}
                background
                clockWise
                dataKey="value"
                animationDuration={animated ? 1500 : 0}
              />
              {showTooltip && <Tooltip content={<CustomTooltip />} />}
              {showLegend && <Legend />}
            </RadialBarChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}
    >
      {/* Header */}
      {(title || subtitle) && (
        <div className="mb-6">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Chart */}
      <div className="w-full">
        {renderChart()}
      </div>
    </motion.div>
  );
};

// Specialized educational chart components
export const AttendanceChart: React.FC<Omit<EducationalChartsProps, 'type'>> = (props) => (
  <EducationalCharts
    {...props}
    type="line"
    title={props.title || 'Attendance Trends'}
    colors={['#10B981', '#F59E0B', '#EF4444']}
  />
);

export const GradeProgressChart: React.FC<Omit<EducationalChartsProps, 'type'>> = (props) => (
  <EducationalCharts
    {...props}
    type="area"
    title={props.title || 'Grade Progress'}
    colors={['#3B82F6', '#8B5CF6', '#06B6D4']}
  />
);

export const SubjectPerformanceChart: React.FC<Omit<EducationalChartsProps, 'type'>> = (props) => (
  <EducationalCharts
    {...props}
    type="bar"
    title={props.title || 'Subject Performance'}
    colors={['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']}
  />
);

export const SyllabusCompletionChart: React.FC<Omit<EducationalChartsProps, 'type'>> = (props) => (
  <EducationalCharts
    {...props}
    type="pie"
    title={props.title || 'Syllabus Completion'}
    colors={['#10B981', '#F59E0B', '#EF4444']}
  />
);

export const ClassComparisonChart: React.FC<Omit<EducationalChartsProps, 'type'>> = (props) => (
  <EducationalCharts
    {...props}
    type="radial"
    title={props.title || 'Class Comparison'}
    colors={['#3B82F6', '#10B981', '#F59E0B', '#EF4444']}
  />
);

// Chart data generators for common educational scenarios
export const generateAttendanceData = (days: number = 30) => {
  const data = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    data.push({
      name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      present: Math.floor(Math.random() * 20) + 80, // 80-100% attendance
      absent: Math.floor(Math.random() * 10) + 5,   // 5-15% absent
      late: Math.floor(Math.random() * 5) + 2,      // 2-7% late
    });
  }
  
  return data;
};

export const generateGradeData = (subjects: string[] = ['Math', 'Science', 'English', 'History']) => {
  return subjects.map(subject => ({
    name: subject,
    currentGrade: Math.floor(Math.random() * 30) + 70, // 70-100
    previousGrade: Math.floor(Math.random() * 30) + 65, // 65-95
    targetGrade: 85,
  }));
};

export const generateSubjectPerformanceData = () => {
  const subjects = ['Mathematics', 'Science', 'English', 'History', 'Geography'];
  return subjects.map(subject => ({
    name: subject,
    average: Math.floor(Math.random() * 30) + 70,
    highest: Math.floor(Math.random() * 20) + 80,
    lowest: Math.floor(Math.random() * 20) + 50,
  }));
};

export const generateSyllabusData = () => [
  { name: 'Completed', value: 75 },
  { name: 'In Progress', value: 15 },
  { name: 'Not Started', value: 10 },
];

export default EducationalCharts;
