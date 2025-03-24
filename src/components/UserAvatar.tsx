import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MoodLogger } from "./MoodLogger";
import { MoodType } from "@prisma/client";

interface UserAvatarProps {
  firstName?: string;
  lastName?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  dailyEntriesCount?: number;
  disableDialog?: boolean;
}

const UserAvatar = ({ 
  firstName, 
  lastName, 
  size = "md", 
  className = "", 
  dailyEntriesCount = 0,
  disableDialog = false 
}: UserAvatarProps) => {
  const [showMoodDialog, setShowMoodDialog] = useState(false);

  const getInitials = (first?: string, last?: string) => {
    if (!first && !last) return "U";
    const firstInitial = first ? first[0] : "";
    const lastInitial = last ? last[0] : "";
    return (firstInitial + lastInitial).toUpperCase();
  };

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  const handleMoodLog = async (mood: MoodType, intensity: number, notes?: string) => {
    try {
      const response = await fetch("/api/moods", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mood,
          intensity,
          notes,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to log mood");
      }

      setShowMoodDialog(false);
      // You might want to trigger a refresh of the parent component here
    } catch (error) {
      console.error("Error logging mood:", error);
    }
  };

  return (
    <>
      <Avatar 
        className={`${sizeClasses[size]} ${className} ${!disableDialog ? 'cursor-pointer hover:opacity-80' : ''}`}
        onClick={disableDialog ? undefined : () => setShowMoodDialog(true)}
      >
        <AvatarFallback>{getInitials(firstName, lastName)}</AvatarFallback>
      </Avatar>

      {!disableDialog && (
        <Dialog open={showMoodDialog} onOpenChange={setShowMoodDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <MoodLogger 
              onMoodLog={handleMoodLog}
              dailyEntriesCount={dailyEntriesCount}
              onRefresh={() => {
                // Optional refresh callback
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default UserAvatar;