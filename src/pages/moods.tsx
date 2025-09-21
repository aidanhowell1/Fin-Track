import { Layout } from '@/components/Layout';
import { MoodLogger } from '@/components/MoodLogger';
import { Card } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { MoodType } from '@prisma/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Interface for a single mood entry
interface RecentMood {
  id: string;
  mood: MoodType;
  intensity: number;
  notes?: string;
  date: string;
}
// Interface for mood data from API
interface MoodData {
  timelineData: RecentMood[];
  dailyEntriesCount: number;
}
// Main MoodsPage component
const MoodsPage = () => {
  const [recentMoods, setRecentMoods] = useState<RecentMood[]>([]);
  const [dailyEntriesCount, setDailyEntriesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetches recent mood data from API
  const fetchRecentMoods = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/moods');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch mood data');
      }
      
      const data: MoodData = await response.json();
      setRecentMoods(data.timelineData.slice(-5)); // Get last 5 moods
      setDailyEntriesCount(data.dailyEntriesCount);
    } catch (error) {
      console.error('Error fetching recent moods:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch mood data');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch moods on component mount
  useEffect(() => {
    fetchRecentMoods();
  }, []);

  // Logs a new mood entry and refreshes recent moods
  const handleMoodLog = async (mood: MoodType, intensity: number, notes?: string) => {
    try {
      const response = await fetch('/api/moods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mood, intensity, notes }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.message || 'Failed to log mood');
      }
      
      await fetchRecentMoods();
    } catch (error) {
      console.error('Error logging mood:', error);
      throw error; // Re-throw to be handled by the MoodLogger component
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Mood Tracking</h1>
        
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="grid gap-6 md:grid-cols-2">
          <MoodLogger 
            onMoodLog={handleMoodLog} 
            dailyEntriesCount={dailyEntriesCount}
          />
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Moods</h2>
            <div className="space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-20 bg-gray-100 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : recentMoods.length > 0 ? (
                recentMoods.map((mood) => (
                  <div key={mood.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{mood.mood.replace('_', ' ')}</p>
                      <p className="text-sm text-gray-600">
                        Intensity: {mood.intensity}/10
                      </p>
                      {mood.notes && (
                        <p className="text-sm text-gray-500 mt-1">{mood.notes}</p>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(mood.date).toLocaleDateString()}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center">No recent moods logged</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default MoodsPage;
