import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Sun,
  Sunset,
  Moon,
  Calendar,
  Clock,
  User,
  Crown,
  Shield,
  Settings,
  Eye,
  Briefcase,
  Users,
} from "lucide-react";

interface WelcomeBannerProps {
  greeting: string;
  userName: string;
  userRole: string;
  currentTime: Date;
}

export function WelcomeBanner({ greeting, userName, userRole, currentTime }: WelcomeBannerProps) {
  // Get time-based icon
  const getTimeIcon = () => {
    const hour = currentTime.getHours();
    if (hour >= 6 && hour < 12) return Sun;
    if (hour >= 12 && hour < 18) return Sun;
    if (hour >= 18 && hour < 22) return Sunset;
    return Moon;
  };

  // Get role-based icon and styling
  const getRoleInfo = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'super_admin':
        return { icon: Crown, color: 'bg-purple-500', label: 'Super Admin' };
      case 'admin':
        return { icon: Shield, color: 'bg-red-500', label: 'Administrator' };
      case 'manager':
        return { icon: Settings, color: 'bg-blue-500', label: 'Manager' };
      case 'employee':
        return { icon: User, color: 'bg-green-500', label: 'Employee' };
      case 'contractor':
        return { icon: Briefcase, color: 'bg-orange-500', label: 'Contractor' };
      case 'client':
        return { icon: Users, color: 'bg-teal-500', label: 'Client' };
      case 'viewer':
        return { icon: Eye, color: 'bg-gray-500', label: 'Viewer' };
      default:
        return { icon: User, color: 'bg-primary', label: 'User' };
    }
  };

  const TimeIcon = getTimeIcon();
  const roleInfo = getRoleInfo(userRole);
  const RoleIcon = roleInfo.icon;

  return (
    <Card className="glassmorphism border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          {/* Welcome Message */}
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <TimeIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {greeting}, {userName}!
              </h1>
              <p className="text-muted-foreground">
                Welcome to your central hub. Here's what's happening today.
              </p>
            </div>
          </div>

          {/* User Info & Time */}
          <div className="flex items-center space-x-4 text-right">
            <div>
              <div className="flex items-center space-x-2 justify-end mb-1">
                <Badge
                  variant="secondary"
                  className={`${roleInfo.color} text-white border-0`}
                >
                  <RoleIcon className="w-3 h-3 mr-1" />
                  {roleInfo.label}
                </Badge>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{format(currentTime, "EEEE, MMMM d, yyyy")}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{format(currentTime, "h:mm a")}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}