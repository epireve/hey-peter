"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { 
  UserPlus, 
  Calendar, 
  FileText, 
  Award,
  Clock,
  CheckCircle
} from "lucide-react";

interface Activity {
  id: string;
  type: "user_joined" | "class_scheduled" | "material_uploaded" | "class_completed" | "attendance_marked" | "certificate_issued";
  title: string;
  description?: string;
  user?: {
    name: string;
    role: string;
  };
  timestamp: string;
}

interface ActivityTimelineProps {
  activities: Activity[];
}

const activityIcons = {
  user_joined: UserPlus,
  class_scheduled: Calendar,
  material_uploaded: FileText,
  class_completed: CheckCircle,
  attendance_marked: Clock,
  certificate_issued: Award,
};

const activityColors = {
  user_joined: "bg-blue-500",
  class_scheduled: "bg-green-500",
  material_uploaded: "bg-purple-500",
  class_completed: "bg-emerald-500",
  attendance_marked: "bg-orange-500",
  certificate_issued: "bg-yellow-500",
};

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest system activities and events</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const Icon = activityIcons[activity.type];
            const color = activityColors[activity.type];
            
            return (
              <div key={activity.id} className="flex gap-4">
                <div className="relative flex flex-col items-center">
                  <Avatar className={`h-8 w-8 ${color}`}>
                    <AvatarFallback className="bg-transparent">
                      <Icon className="h-4 w-4 text-white" />
                    </AvatarFallback>
                  </Avatar>
                  {index < activities.length - 1 && (
                    <div className="absolute top-8 h-full w-0.5 bg-muted" />
                  )}
                </div>
                <div className="flex-1 space-y-1 pb-4">
                  <p className="text-sm font-medium leading-none">
                    {activity.title}
                  </p>
                  {activity.description && (
                    <p className="text-sm text-muted-foreground">
                      {activity.description}
                    </p>
                  )}
                  {activity.user && (
                    <p className="text-xs text-muted-foreground">
                      by {activity.user.name} ({activity.user.role})
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}