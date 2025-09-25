import {
  BookOpen,
  GraduationCap,
  Users,
  Calendar,
  Plus,
  Edit,
  Trash2,
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  ChevronRight,
  Menu,
  X,
  Home,
  Settings,
  Bell,
  User,
  FileText,
  BarChart3,
  TrendingUp,
  Award,
  Star,
  Heart,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Camera,
  Upload,
  Download,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Save,
  RefreshCw,
  Filter,
  SortAsc,
  SortDesc,
  Grid,
  List,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  Users as UsersIcon,
  BookOpen as BookIcon,
  PenTool,
  Calculator,
  Globe,
  Zap,
  Shield,
  Target,
  Lightbulb,
  Bookmark,
  Flag,
  Gift,
  Sparkles,
  Crown,
  Gem,
  Trophy,
  Medal,
  type LucideIcon
} from 'lucide-react';

export interface IconProps {
  size?: number;
  className?: string;
  color?: string;
}

// Educational Icons
export const EducationIcons = {
  BookOpen: (props: IconProps) => <BookOpen size={props.size || 20} className={props.className} color={props.color} />,
  GraduationCap: (props: IconProps) => <GraduationCap size={props.size || 20} className={props.className} color={props.color} />,
  Users: (props: IconProps) => <Users size={props.size || 20} className={props.className} color={props.color} />,
  Calendar: (props: IconProps) => <Calendar size={props.size || 20} className={props.className} color={props.color} />,
  PenTool: (props: IconProps) => <PenTool size={props.size || 20} className={props.className} color={props.color} />,
  Calculator: (props: IconProps) => <Calculator size={props.size || 20} className={props.className} color={props.color} />,
  Globe: (props: IconProps) => <Globe size={props.size || 20} className={props.className} color={props.color} />,
  Lightbulb: (props: IconProps) => <Lightbulb size={props.size || 20} className={props.className} color={props.color} />,
  Target: (props: IconProps) => <Target size={props.size || 20} className={props.className} color={props.color} />,
};

// Action Icons
export const ActionIcons = {
  Plus: (props: IconProps) => <Plus size={props.size || 20} className={props.className} color={props.color} />,
  Edit: (props: IconProps) => <Edit size={props.size || 20} className={props.className} color={props.color} />,
  Delete: (props: IconProps) => <Trash2 size={props.size || 20} className={props.className} color={props.color} />,
  Search: (props: IconProps) => <Search size={props.size || 20} className={props.className} color={props.color} />,
  Save: (props: IconProps) => <Save size={props.size || 20} className={props.className} color={props.color} />,
  Upload: (props: IconProps) => <Upload size={props.size || 20} className={props.className} color={props.color} />,
  Download: (props: IconProps) => <Download size={props.size || 20} className={props.className} color={props.color} />,
  RefreshCw: (props: IconProps) => <RefreshCw size={props.size || 20} className={props.className} color={props.color} />,
  Filter: (props: IconProps) => <Filter size={props.size || 20} className={props.className} color={props.color} />,
  Camera: (props: IconProps) => <Camera size={props.size || 20} className={props.className} color={props.color} />,
};

// Status Icons
export const StatusIcons = {
  CheckCircle: (props: IconProps) => <CheckCircle size={props.size || 20} className={props.className} color={props.color} />,
  AlertTriangle: (props: IconProps) => <AlertTriangle size={props.size || 20} className={props.className} color={props.color} />,
  Clock: (props: IconProps) => <Clock size={props.size || 20} className={props.className} color={props.color} />,
  Zap: (props: IconProps) => <Zap size={props.size || 20} className={props.className} color={props.color} />,
  Shield: (props: IconProps) => <Shield size={props.size || 20} className={props.className} color={props.color} />,
  Star: (props: IconProps) => <Star size={props.size || 20} className={props.className} color={props.color} />,
  Heart: (props: IconProps) => <Heart size={props.size || 20} className={props.className} color={props.color} />,
  Flag: (props: IconProps) => <Flag size={props.size || 20} className={props.className} color={props.color} />,
};

// Navigation Icons
export const NavigationIcons = {
  ChevronRight: (props: IconProps) => <ChevronRight size={props.size || 20} className={props.className} color={props.color} />,
  Menu: (props: IconProps) => <Menu size={props.size || 20} className={props.className} color={props.color} />,
  X: (props: IconProps) => <X size={props.size || 20} className={props.className} color={props.color} />,
  Home: (props: IconProps) => <Home size={props.size || 20} className={props.className} color={props.color} />,
  Settings: (props: IconProps) => <Settings size={props.size || 20} className={props.className} color={props.color} />,
  Grid: (props: IconProps) => <Grid size={props.size || 20} className={props.className} color={props.color} />,
  List: (props: IconProps) => <List size={props.size || 20} className={props.className} color={props.color} />,
};

// Communication Icons
export const CommunicationIcons = {
  Bell: (props: IconProps) => <Bell size={props.size || 20} className={props.className} color={props.color} />,
  MessageCircle: (props: IconProps) => <MessageCircle size={props.size || 20} className={props.className} color={props.color} />,
  Phone: (props: IconProps) => <Phone size={props.size || 20} className={props.className} color={props.color} />,
  Mail: (props: IconProps) => <Mail size={props.size || 20} className={props.className} color={props.color} />,
};

// Analytics Icons
export const AnalyticsIcons = {
  BarChart3: (props: IconProps) => <BarChart3 size={props.size || 20} className={props.className} color={props.color} />,
  TrendingUp: (props: IconProps) => <TrendingUp size={props.size || 20} className={props.className} color={props.color} />,
  FileText: (props: IconProps) => <FileText size={props.size || 20} className={props.className} color={props.color} />,
  SortAsc: (props: IconProps) => <SortAsc size={props.size || 20} className={props.className} color={props.color} />,
  SortDesc: (props: IconProps) => <SortDesc size={props.size || 20} className={props.className} color={props.color} />,
};

// Gamification Icons
export const GamificationIcons = {
  Award: (props: IconProps) => <Award size={props.size || 20} className={props.className} color={props.color} />,
  Trophy: (props: IconProps) => <Trophy size={props.size || 20} className={props.className} color={props.color} />,
  Medal: (props: IconProps) => <Medal size={props.size || 20} className={props.className} color={props.color} />,
  Crown: (props: IconProps) => <Crown size={props.size || 20} className={props.className} color={props.color} />,
  Gem: (props: IconProps) => <Gem size={props.size || 20} className={props.className} color={props.color} />,
  Gift: (props: IconProps) => <Gift size={props.size || 20} className={props.className} color={props.color} />,
  Sparkles: (props: IconProps) => <Sparkles size={props.size || 20} className={props.className} color={props.color} />,
  Bookmark: (props: IconProps) => <Bookmark size={props.size || 20} className={props.className} color={props.color} />,
};

// Security Icons
export const SecurityIcons = {
  Lock: (props: IconProps) => <Lock size={props.size || 20} className={props.className} color={props.color} />,
  Unlock: (props: IconProps) => <Unlock size={props.size || 20} className={props.className} color={props.color} />,
  Eye: (props: IconProps) => <Eye size={props.size || 20} className={props.className} color={props.color} />,
  EyeOff: (props: IconProps) => <EyeOff size={props.size || 20} className={props.className} color={props.color} />,
  User: (props: IconProps) => <User size={props.size || 20} className={props.className} color={props.color} />,
};

// Location Icons
export const LocationIcons = {
  MapPin: (props: IconProps) => <MapPin size={props.size || 20} className={props.className} color={props.color} />,
};

// All Icons Combined
export const Icons = {
  ...EducationIcons,
  ...ActionIcons,
  ...StatusIcons,
  ...NavigationIcons,
  ...CommunicationIcons,
  ...AnalyticsIcons,
  ...GamificationIcons,
  ...SecurityIcons,
  ...LocationIcons,
};

// Icon component with theme-aware colors
export interface ThemedIconProps extends IconProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
}

export const ThemedIcon = ({ icon: IconComponent, size = 20, color, className = '', variant = 'primary', ...rest }: ThemedIconProps & { icon: LucideIcon }) => {
  const variantClasses = {
    primary: 'text-blue-600 dark:text-blue-400',
    secondary: 'text-gray-600 dark:text-gray-400',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    error: 'text-red-600 dark:text-red-400',
    info: 'text-cyan-600 dark:text-cyan-400',
  };

  // Filter out variant and icon from rest props to avoid passing them to IconComponent
  const { variant: _, icon: __, ...filteredRest } = rest as any;
  
  return (
    <IconComponent
      size={size}
      color={color}
      className={`${variantClasses[variant]} ${className}`}
      {...filteredRest}
    />
  );
};

export default Icons;
