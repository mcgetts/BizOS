import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  INDUSTRY_OPTIONS,
  PRIORITY_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  TASK_STATUS_OPTIONS,
  TEMPLATE_CATEGORY_OPTIONS,
  COMPANY_SIZE_OPTIONS,
  getIndustryLabel,
  getPriorityLabel,
  getPriorityColor,
  getProjectStatusLabel,
  getProjectStatusColor,
  getTaskStatusLabel,
  getTaskStatusColor,
  type Industry,
  type Priority,
  type ProjectStatus,
  type TaskStatus,
  type TemplateCategory,
  type CompanySize,
} from '@shared/constants';

// Industry Select Component
interface IndustrySelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function IndustrySelect({
  value,
  onValueChange,
  placeholder = "Select industry",
  disabled = false
}: IndustrySelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {INDUSTRY_OPTIONS.map(({ value, label }) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Priority Select Component
interface PrioritySelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showColors?: boolean;
}

export function PrioritySelect({
  value,
  onValueChange,
  placeholder = "Select priority",
  disabled = false,
  showColors = false
}: PrioritySelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {PRIORITY_OPTIONS.map(({ value: optionValue, label }) => (
          <SelectItem key={optionValue} value={optionValue}>
            <div className="flex items-center gap-2">
              {showColors && (
                <Badge className={`text-xs ${getPriorityColor(optionValue as Priority)}`}>
                  {label}
                </Badge>
              )}
              {!showColors && label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Project Status Select Component
interface ProjectStatusSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showColors?: boolean;
}

export function ProjectStatusSelect({
  value,
  onValueChange,
  placeholder = "Select status",
  disabled = false,
  showColors = false
}: ProjectStatusSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {PROJECT_STATUS_OPTIONS.map(({ value: optionValue, label }) => (
          <SelectItem key={optionValue} value={optionValue}>
            <div className="flex items-center gap-2">
              {showColors && (
                <Badge className={`text-xs ${getProjectStatusColor(optionValue as ProjectStatus)}`}>
                  {label}
                </Badge>
              )}
              {!showColors && label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Task Status Select Component
interface TaskStatusSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showColors?: boolean;
}

export function TaskStatusSelect({
  value,
  onValueChange,
  placeholder = "Select status",
  disabled = false,
  showColors = false
}: TaskStatusSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {TASK_STATUS_OPTIONS.map(({ value: optionValue, label }) => (
          <SelectItem key={optionValue} value={optionValue}>
            <div className="flex items-center gap-2">
              {showColors && (
                <Badge className={`text-xs ${getTaskStatusColor(optionValue as TaskStatus)}`}>
                  {label}
                </Badge>
              )}
              {!showColors && label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Template Category Select Component
interface TemplateCategorySelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function TemplateCategorySelect({
  value,
  onValueChange,
  placeholder = "Select category",
  disabled = false
}: TemplateCategorySelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {TEMPLATE_CATEGORY_OPTIONS.map(({ value, label }) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Company Size Select Component
interface CompanySizeSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CompanySizeSelect({
  value,
  onValueChange,
  placeholder = "Select company size",
  disabled = false
}: CompanySizeSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {COMPANY_SIZE_OPTIONS.map(({ value, label }) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Badge components for displaying values with colors
interface IndustryBadgeProps {
  industry: string;
  className?: string;
}

export function IndustryBadge({ industry, className = "" }: IndustryBadgeProps) {
  return (
    <Badge className={`${className}`} variant="secondary">
      {getIndustryLabel(industry)}
    </Badge>
  );
}

interface PriorityBadgeProps {
  priority: string;
  className?: string;
}

export function PriorityBadge({ priority, className = "" }: PriorityBadgeProps) {
  return (
    <Badge className={`${getPriorityColor(priority)} ${className}`}>
      {getPriorityLabel(priority)}
    </Badge>
  );
}

interface ProjectStatusBadgeProps {
  status: string;
  className?: string;
}

export function ProjectStatusBadge({ status, className = "" }: ProjectStatusBadgeProps) {
  return (
    <Badge className={`${getProjectStatusColor(status)} ${className}`}>
      {getProjectStatusLabel(status)}
    </Badge>
  );
}

interface TaskStatusBadgeProps {
  status: string;
  className?: string;
}

export function TaskStatusBadge({ status, className = "" }: TaskStatusBadgeProps) {
  return (
    <Badge className={`${getTaskStatusColor(status)} ${className}`}>
      {getTaskStatusLabel(status)}
    </Badge>
  );
}

// Export all components and utility functions
export {
  getIndustryLabel,
  getPriorityLabel,
  getPriorityColor,
  getProjectStatusLabel,
  getProjectStatusColor,
  getTaskStatusLabel,
  getTaskStatusColor,
};