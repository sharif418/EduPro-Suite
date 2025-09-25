'use client';

import React, { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Icons } from '../icons/IconLibrary';
import AnimatedCard from '../ui/AnimatedCard';
import FileUpload from '../ui/FileUpload';
import ProgressIndicator from '../ui/ProgressIndicator';
import { integrationService } from '../../lib/integration-service';

interface ImportExportProps {
  onImportComplete?: (result: any) => void;
  onExportComplete?: (result: any) => void;
  allowedFileTypes?: string[];
  maxFileSize?: number;
}

interface ImportJob {
  id: string;
  fileName: string;
  fileSize: number;
  type: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  recordsProcessed: number;
  totalRecords: number;
  errors: string[];
  startTime: Date;
  endTime?: Date;
}

interface ExportJob {
  id: string;
  type: string;
  format: string;
  status: 'preparing' | 'generating' | 'completed' | 'failed';
  progress: number;
  recordCount: number;
  downloadUrl?: string;
  startTime: Date;
  endTime?: Date;
}

export const DataImportExport: React.FC<ImportExportProps> = ({
  onImportComplete,
  onExportComplete,
  allowedFileTypes = ['.csv', '.xlsx', '.json'],
  maxFileSize = 10 * 1024 * 1024, // 10MB
}) => {
  const t = useTranslations('admin');
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [importJobs, setImportJobs] = useState<ImportJob[]>([]);
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [selectedDataType, setSelectedDataType] = useState<string>('students');

  const dataTypes = [
    { value: 'students', label: 'Students', icon: 'Users' },
    { value: 'staff', label: 'Staff Members', icon: 'GraduationCap' },
    { value: 'classes', label: 'Classes', icon: 'BookOpen' },
    { value: 'subjects', label: 'Subjects', icon: 'FileText' },
    { value: 'grades', label: 'Grades', icon: 'BarChart3' },
    { value: 'attendance', label: 'Attendance', icon: 'CheckCircle' },
    { value: 'fees', label: 'Fee Records', icon: 'Calculator' },
    { value: 'exams', label: 'Exam Results', icon: 'Award' },
  ];

  const exportFormats = [
    { value: 'csv', label: 'CSV', description: 'Comma-separated values' },
    { value: 'xlsx', label: 'Excel', description: 'Microsoft Excel format' },
    { value: 'json', label: 'JSON', description: 'JavaScript Object Notation' },
    { value: 'pdf', label: 'PDF', description: 'Portable Document Format' },
  ];

  const handleFileUpload = useCallback(async (files: File[]) => {
    for (const file of files) {
      const jobId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const importJob: ImportJob = {
        id: jobId,
        fileName: file.name,
        fileSize: file.size,
        type: selectedDataType,
        status: 'uploading',
        progress: 0,
        recordsProcessed: 0,
        totalRecords: 0,
        errors: [],
        startTime: new Date(),
      };

      setImportJobs(prev => [...prev, importJob]);

      try {
        // Upload file
        const formData = new FormData();
        formData.append('file', file);
        formData.append('dataType', selectedDataType);
        formData.append('jobId', jobId);

        const uploadResponse = await fetch('/api/admin/data/import', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Upload failed');
        }

        const uploadResult = await uploadResponse.json();

        // Update job status
        setImportJobs(prev => prev.map(job => 
          job.id === jobId 
            ? { 
                ...job, 
                status: 'processing', 
                progress: 10,
                totalRecords: uploadResult.totalRecords || 0,
              }
            : job
        ));

        // Simulate processing progress
        const progressInterval = setInterval(() => {
          setImportJobs(prev => prev.map(job => {
            if (job.id === jobId && job.status === 'processing') {
              const newProgress = Math.min(job.progress + Math.random() * 20, 90);
              const newRecordsProcessed = Math.floor((newProgress / 100) * job.totalRecords);
              
              return {
                ...job,
                progress: newProgress,
                recordsProcessed: newRecordsProcessed,
              };
            }
            return job;
          }));
        }, 1000);

        // Simulate completion after 5-10 seconds
        setTimeout(() => {
          clearInterval(progressInterval);
          
          setImportJobs(prev => prev.map(job => 
            job.id === jobId 
              ? { 
                  ...job, 
                  status: 'completed', 
                  progress: 100,
                  recordsProcessed: job.totalRecords,
                  endTime: new Date(),
                }
              : job
          ));

          // Notify completion
          if (onImportComplete) {
            onImportComplete({
              jobId,
              fileName: file.name,
              recordsProcessed: importJob.totalRecords,
              type: selectedDataType,
            });
          }

          // Show success notification
          integrationService.sendNotification({
            title: 'Import Completed',
            message: `Successfully imported ${file.name}`,
            type: 'success',
          });

        }, Math.random() * 5000 + 5000);

      } catch (error) {
        console.error('Import error:', error);
        
        setImportJobs(prev => prev.map(job => 
          job.id === jobId 
            ? { 
                ...job, 
                status: 'failed', 
                errors: [error instanceof Error ? error.message : 'Import failed'],
                endTime: new Date(),
              }
            : job
        ));

        // Show error notification
        integrationService.sendNotification({
          title: 'Import Failed',
          message: `Failed to import ${file.name}`,
          type: 'error',
        });
      }
    }
  }, [selectedDataType, onImportComplete]);

  const handleExport = useCallback(async (format: string) => {
    const jobId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const exportJob: ExportJob = {
      id: jobId,
      type: selectedDataType,
      format,
      status: 'preparing',
      progress: 0,
      recordCount: 0,
      startTime: new Date(),
    };

    setExportJobs(prev => [...prev, exportJob]);

    try {
      // Start export
      const exportResponse = await fetch('/api/admin/data/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          dataType: selectedDataType,
          format,
          jobId,
        }),
      });

      if (!exportResponse.ok) {
        throw new Error('Export failed');
      }

      const exportResult = await exportResponse.json();

      // Update job status
      setExportJobs(prev => prev.map(job => 
        job.id === jobId 
          ? { 
              ...job, 
              status: 'generating', 
              progress: 20,
              recordCount: exportResult.recordCount || 0,
            }
          : job
      ));

      // Simulate export progress
      const progressInterval = setInterval(() => {
        setExportJobs(prev => prev.map(job => {
          if (job.id === jobId && job.status === 'generating') {
            const newProgress = Math.min(job.progress + Math.random() * 15, 90);
            return { ...job, progress: newProgress };
          }
          return job;
        }));
      }, 800);

      // Simulate completion
      setTimeout(() => {
        clearInterval(progressInterval);
        
        const downloadUrl = `/api/admin/data/download/${jobId}`;
        
        setExportJobs(prev => prev.map(job => 
          job.id === jobId 
            ? { 
                ...job, 
                status: 'completed', 
                progress: 100,
                downloadUrl,
                endTime: new Date(),
              }
            : job
        ));

        // Notify completion
        if (onExportComplete) {
          onExportComplete({
            jobId,
            type: selectedDataType,
            format,
            downloadUrl,
            recordCount: exportJob.recordCount,
          });
        }

        // Show success notification
        integrationService.sendNotification({
          title: 'Export Completed',
          message: `${selectedDataType} data exported successfully`,
          type: 'success',
        });

      }, Math.random() * 3000 + 3000);

    } catch (error) {
      console.error('Export error:', error);
      
      setExportJobs(prev => prev.map(job => 
        job.id === jobId 
          ? { 
              ...job, 
              status: 'failed', 
              endTime: new Date(),
            }
          : job
      ));

      // Show error notification
      integrationService.sendNotification({
        title: 'Export Failed',
        message: `Failed to export ${selectedDataType} data`,
        type: 'error',
      });
    }
  }, [selectedDataType, onExportComplete]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'failed': return 'text-red-600 bg-red-50';
      case 'processing':
      case 'generating': return 'text-blue-600 bg-blue-50';
      default: return 'text-yellow-600 bg-yellow-50';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <AnimatedCard variant="elevated" size="lg" hover={false}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            <Icons.Upload size={20} className="mr-2" />
            Data Import & Export
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Import and export system data in various formats
          </p>
        </div>
      </div>

      {/* Data Type Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Select Data Type
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {dataTypes.map((type) => {
            const IconComponent = Icons[type.icon as keyof typeof Icons];
            return (
              <button
                key={type.value}
                onClick={() => setSelectedDataType(type.value)}
                className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                  selectedDataType === type.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <IconComponent size={20} className="mx-auto mb-2" />
                <p className="text-xs font-medium text-center">{type.label}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('import')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 ${
            activeTab === 'import'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          <Icons.Upload size={16} className="inline mr-2" />
          Import Data
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 ${
            activeTab === 'export'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          <Icons.Download size={16} className="inline mr-2" />
          Export Data
        </button>
      </div>

      {/* Import Tab */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          {/* File Upload */}
          <div>
            <FileUpload
              onFilesSelected={handleFileUpload}
              acceptedTypes={allowedFileTypes}
              maxSize={maxFileSize}
              multiple={true}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8"
            />
          </div>

          {/* Import Jobs */}
          {importJobs.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
                Import Progress
              </h4>
              <div className="space-y-3">
                {importJobs.map((job) => (
                  <div key={job.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <Icons.FileText size={20} className="text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {job.fileName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {job.type} • {formatFileSize(job.fileSize)}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </div>

                    {job.status === 'processing' && (
                      <div className="mb-2">
                        <ProgressIndicator
                          value={job.progress}
                          type="linear"
                          color="blue"
                          size="sm"
                          animated={true}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {job.recordsProcessed} / {job.totalRecords} records processed
                        </p>
                      </div>
                    )}

                    {job.errors.length > 0 && (
                      <div className="mt-2">
                        <details className="text-xs">
                          <summary className="cursor-pointer text-red-600 dark:text-red-400">
                            {job.errors.length} error(s)
                          </summary>
                          <ul className="mt-2 space-y-1 text-red-600 dark:text-red-400">
                            {job.errors.map((error, index) => (
                              <li key={index}>• {error}</li>
                            ))}
                          </ul>
                        </details>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          {/* Export Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Export Format
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {exportFormats.map((format) => (
                <button
                  key={format.value}
                  onClick={() => handleExport(format.value)}
                  className="p-4 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
                >
                  <div className="flex items-center space-x-3">
                    <Icons.Download size={20} className="text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {format.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {format.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Export Jobs */}
          {exportJobs.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
                Export Progress
              </h4>
              <div className="space-y-3">
                {exportJobs.map((job) => (
                  <div key={job.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <Icons.Download size={20} className="text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {job.type} Export ({job.format.toUpperCase()})
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {job.recordCount} records
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </div>

                    {job.status === 'generating' && (
                      <div className="mb-2">
                        <ProgressIndicator
                          value={job.progress}
                          type="linear"
                          color="green"
                          size="sm"
                          animated={true}
                        />
                      </div>
                    )}

                    {job.status === 'completed' && job.downloadUrl && (
                      <div className="mt-2">
                        <a
                          href={job.downloadUrl}
                          download
                          className="inline-flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          <Icons.Download size={16} />
                          <span>Download File</span>
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Help Section */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2 flex items-center">
          <Icons.Lightbulb size={16} className="mr-2" />
          Tips & Guidelines
        </h4>
        <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1">
          <li>• Ensure your data follows the required format template</li>
          <li>• Large files may take several minutes to process</li>
          <li>• Duplicate records will be automatically handled</li>
          <li>• Export files are available for download for 24 hours</li>
          <li>• Contact support if you encounter any issues</li>
        </ul>
      </div>
    </AnimatedCard>
  );
};

export default DataImportExport;
