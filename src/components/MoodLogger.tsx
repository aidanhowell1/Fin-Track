import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { MoodType } from '@prisma/client';
import { 
  SmilePlus,
  Smile,
  Meh,
  Frown,
  AlertCircle,
  HeartCrack,
  Coffee
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const moodIcons = {
  VERY_HAPPY: SmilePlus,
  HAPPY: Smile,
  NEUTRAL: Meh,
  SAD: Frown,
  STRESSED: AlertCircle,
  ANXIOUS: HeartCrack,
  BORED: Coffee,
} as const;

const moodColors = {
  VERY_HAPPY: '#22c55e',
  HAPPY: '#60a5fa',
  NEUTRAL: '#a855f7',
  SAD: '#f59e0b',
  STRESSED: '#ef4444',
  ANXIOUS: '#ec4899',
  BORED: '#64748b',
} as const;

interface MoodLoggerProps {
  onMoodLog: (mood: MoodType, intensity: number, notes?: string) => Promise<void>;
  dailyEntriesCount: number;
  onRefresh?: () => void;
}

export const MoodLogger = ({ onMoodLog, dailyEntriesCount, onRefresh }: MoodLoggerProps) => {
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [intensity, setIntensity] = useState<number>(5);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedMood) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      await onMoodLog(selectedMood, intensity, notes);
      setSelectedMood(null);
      setIntensity(5);
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log mood');
      console.error('Error logging mood:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (dailyEntriesCount >= 3) {
    return (
      <Card className="p-6 space-y-4">
        <h3 className="text-xl font-semibold text-center text-foreground">Daily Limit Reached</h3>
        <p className="text-center text-muted-foreground">
          You've reached your daily limit of 3 mood entries. Try again tomorrow!
        </p>
        <div className="flex justify-center">
          <div className="bg-muted rounded-lg px-4 py-2">
            <span className="font-medium text-foreground">Today's Entries: {dailyEntriesCount}/3</span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-foreground">How are you feeling right now?</h3>
        <div className="bg-muted rounded-lg px-3 py-1">
          <span className="text-sm font-medium text-foreground">Today's Entries: {dailyEntriesCount}/3</span>
        </div>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
        {(Object.entries(moodIcons) as [MoodType, any][]).map(([mood, Icon]) => {
          const isSelected = selectedMood === mood;
          return (
            <Button
              key={mood}
              variant={isSelected ? "default" : "outline"}
              className={`flex flex-col items-center p-4 h-auto gap-2 ${
                isSelected ? 'ring-2 ring-offset-2' : ''
              }`}
              style={{
                backgroundColor: isSelected ? moodColors[mood] : 'transparent',
                color: isSelected ? 'white' : moodColors[mood],
                borderColor: moodColors[mood],
              }}
              onClick={() => setSelectedMood(mood)}
              disabled={isSubmitting}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs text-center whitespace-nowrap">
                {mood.replace('_', ' ')}
              </span>
            </Button>
          );
        })}
      </div>

      {selectedMood && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              How intense is this feeling? (1-10)
            </label>
            <Slider
              value={[intensity]}
              onValueChange={(value) => setIntensity(value[0])}
              min={1}
              max={10}
              step={1}
              className="w-full"
              disabled={isSubmitting}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Mild</span>
              <span>Moderate</span>
              <span>Intense</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Any thoughts you'd like to add? (optional)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What's making you feel this way?"
              className="h-20 text-foreground placeholder:text-muted-foreground"
              disabled={isSubmitting}
            />
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full text-white hover:opacity-90"
            style={{
              backgroundColor: moodColors[selectedMood],
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Logging...' : 'Log Mood'}
          </Button>
        </>
      )}
    </Card>
  );
};