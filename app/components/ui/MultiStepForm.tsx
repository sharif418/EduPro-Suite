'use client';

import React, { useState } from 'react';
import { cn } from '@/app/lib/utils';
import { Button } from './Button';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface Step {
  id: string;
  title: string;
  description?: string;
  component: React.ReactNode;
  isValid?: boolean;
}

interface MultiStepFormProps {
  steps: Step[];
  onComplete: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  className?: string;
}

export function MultiStepForm({
  steps,
  onComplete,
  onCancel,
  isSubmitting = false,
  className,
}: MultiStepFormProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    // Allow navigation to previous steps or current step
    if (stepIndex <= currentStep) {
      setCurrentStep(stepIndex);
    }
  };

  const isCurrentStepValid = steps[currentStep]?.isValid !== false;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className={cn('w-full max-w-4xl mx-auto', className)}>
      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full border-2 cursor-pointer transition-all duration-200',
                  index < currentStep
                    ? 'bg-green-500 border-green-500 text-white'
                    : index === currentStep
                    ? 'bg-indigo-500 border-indigo-500 text-white'
                    : 'bg-white border-gray-300 text-gray-500 hover:border-gray-400',
                  index <= currentStep && 'cursor-pointer'
                )}
                onClick={() => handleStepClick(index)}
              >
                {index < currentStep ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'w-16 h-0.5 mx-2 transition-colors duration-200',
                    index < currentStep ? 'bg-green-500' : 'bg-gray-300'
                  )}
                />
              )}
            </div>
          ))}
        </div>
        
        {/* Step Title and Description */}
        <div className="mt-4 text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            {steps[currentStep]?.title}
          </h3>
          {steps[currentStep]?.description && (
            <p className="text-sm text-gray-600 mt-1">
              {steps[currentStep].description}
            </p>
          )}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 min-h-[400px]">
        {steps[currentStep]?.component}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-6">
        <div>
          {currentStep > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={isSubmitting}
              className="flex items-center"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          {isLastStep ? (
            <Button
              type="button"
              onClick={onComplete}
              disabled={!isCurrentStepValid || isSubmitting}
              className="flex items-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  Complete Admission
                  <Check className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!isCurrentStepValid}
              className="flex items-center"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Step {currentStep + 1} of {steps.length}</span>
          <span>{Math.round(((currentStep + 1) / steps.length) * 100)}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Helper component for form steps
interface FormStepProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormStep({ title, children, className }: FormStepProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {title && (
        <h4 className="text-md font-medium text-gray-900 border-b border-gray-200 pb-2">
          {title}
        </h4>
      )}
      {children}
    </div>
  );
}

// Helper component for form sections within steps
interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <h5 className="text-sm font-medium text-gray-900">{title}</h5>
        {description && (
          <p className="text-xs text-gray-600 mt-1">{description}</p>
        )}
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}
