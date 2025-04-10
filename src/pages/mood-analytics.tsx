import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoodLogger } from '@/components/MoodLogger';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { BarChart3, HelpCircle, Lock, SmilePlus } from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { MoodType } from '@prisma/client';

// Mood colors mapping with softer, more calming colors
const moodColors = {
  VERY_HAPPY: '#22c55e',  // Soft green
  HAPPY: '#60a5fa',       // Soft blue
  NEUTRAL: '#a855f7',     // Soft purple
  SAD: '#f59e0b',         // Soft orange
  STRESSED: '#ef4444',    // Soft red
  ANXIOUS: '#ec4899',     // Soft pink
  BORED: '#64748b'        // Soft slate
};

interface MoodAnalyticsData {
  timelineData: Array<{
    date: string;
    mood: MoodType;
    intensity: number;
    notes?: string;
    transactionAmount: number;
    transactionType?: string;
    category?: string;
  }>;
  moodDistribution: Record<string, number>;
  spendingCorrelation: Record<string, {
    totalSpent: number;
    count: number;
  }>;
  dailyEntriesCount: number;
  historicalWeeks: Array<{
    weekStart: string;
    weekEnd: string;
    averageMood: number;
    entryCount: number;
    totalSpending: number;
  }>;
}

const MAX_DAYS_TO_SHOW = 14; // Maximum number of days to show in the chart

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = now.toDateString() === date.toDateString();
  const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString();

  if (isToday) {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  } else if (isYesterday) {
    return `Yesterday, ${new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date)}`;
  } else {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  }
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const formattedDate = formatDate(data.date);
    
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-foreground mb-1">
          {formattedDate}
        </p>
        <p className="text-sm text-muted-foreground">
          Mood Intensity: {data.intensity}
        </p>
        {data.notes && (
          <p className="text-sm text-muted-foreground mt-1">
            Note: {data.notes}
          </p>
        )}
      </div>
    );
  }
  return null;
};

const MoodAnalytics = () => {
  const router = useRouter();
  const { pathname } = router;
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [showClearButton, setShowClearButton] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<MoodAnalyticsData>({
    timelineData: [],
    moodDistribution: {},
    spendingCorrelation: {},
    dailyEntriesCount: 0,
    historicalWeeks: []
  });
  const [loading, setLoading] = useState(true);
  const [isOptedIn, setIsOptedIn] = useState(true);

  useEffect(() => {
    const optInStatus = localStorage.getItem('moodTrackingOptIn');
    setIsOptedIn(optInStatus !== 'false');
    
    if (optInStatus !== 'false') {
      fetchMoodData();
    }
  }, []);

  // Set up polling for real-time updates
  useEffect(() => {
    if (!isOptedIn) return;

    const interval = setInterval(() => {
      fetchMoodData();
    }, 30000); // Poll every 30 seconds

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [isOptedIn]);

  const fetchMoodData = async () => {
    try {
      const response = await fetch('/api/moods');
	  if(!response.ok){
		const errorData = await response.json();
		throw new Error(errorData.message || 'Failed to fetch mood data');
	  }
      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error fetching mood data:', error);
	  // Set fallback state to prevent crashes
	      setAnalyticsData({
	        timelineData: [],
	        moodDistribution: {},
	        spendingCorrelation: {},
	        dailyEntriesCount: 0,
	        historicalWeeks: [],
    } finally {
      setLoading(false);
    }
  };

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
        const error = await response.json();
        throw new Error(error.details || 'Failed to log mood');
      }
      
      fetchMoodData(); // Refresh data after logging
    } catch (error) {
      console.error('Error logging mood:', error);
      // You might want to show an error message to the user here
    }
  };

  // Transform mood distribution data for visualization
  const distributionData = Object.entries(analyticsData.moodDistribution || {}).map(
    ([mood, count]) => ({
      mood,
      count,
    })
  );

  // Transform spending correlation data for visualization
  const spendingData = Object.entries(analyticsData.spendingCorrelation || {}).map(
    ([mood, data]) => ({
      mood,
      averageSpent: data.totalSpent / data.count,
    })
  );

  // Calculate mood insights
  const calculateInsights = () => {
    const insights: string[] = [];
    if (analyticsData.timelineData.length > 0) {
      // Most common mood
      const moodCounts = analyticsData.moodDistribution;
      const [mostCommonMood] = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0] || [''];
      if (mostCommonMood) {
        insights.push(`Your most frequent mood is ${mostCommonMood.replace('_', ' ').toLowerCase()}`);
      }

      // Highest spending mood
      const spendingByMood = analyticsData.spendingCorrelation;
      if (Object.keys(spendingByMood).length > 0) {
        const [highestSpendingMood] = Object.entries(spendingByMood)
          .sort((a, b) => (b[1].totalSpent / b[1].count) - (a[1].totalSpent / a[1].count))[0] || [''];
        if (highestSpendingMood) {
          insights.push(`You tend to spend more when you're feeling ${highestSpendingMood.replace('_', ' ').toLowerCase()}`);
        }
      }

      // Add spending patterns
      const recentMoods = analyticsData.timelineData.slice(-7);
      const averageMoodIntensity = recentMoods.reduce((sum, item) => sum + item.intensity, 0) / recentMoods.length;
      insights.push(`Your average mood intensity over the past week is ${averageMoodIntensity.toFixed(1)} out of 10`);
    }
    return insights;
  };

  const toggleOptIn = () => {
    const newOptInStatus = !isOptedIn;
    setIsOptedIn(newOptInStatus);
    localStorage.setItem('moodTrackingOptIn', newOptInStatus.toString());
    if (newOptInStatus) {
      fetchMoodData();
    }
  };

  const showInfo = () => {
    setShowInfoDialog(true);
    setShowClearButton(true);
  };

  const handleClearData = async () => {
    try {
      const response = await fetch('/api/moods', {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to clear mood data');
      }
      
      fetchMoodData();
      setShowClearConfirm(false);
      setShowInfoDialog(false);
      setShowClearButton(false);
    } catch (error) {
      console.error('Error clearing mood data:', error);
    }
  };

  if (!isOptedIn) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <Card className="p-6 text-center space-y-4">
            <Lock className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="text-2xl font-bold text-foreground">Mood Tracking is Disabled</h2>
            <p className="text-muted-foreground">
              You've chosen to opt out of mood tracking. Enable it to gain insights into how your emotions affect your spending patterns.
            </p>
            <Button onClick={toggleOptIn}>Enable Mood Tracking</Button>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Mood Analytics</h1>
              <p className="text-muted-foreground mt-2">
                Track how your emotions influence your spending patterns
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={toggleOptIn}
              className="text-sm"
            >
              Disable Tracking
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={showInfo}
              className="rounded-full"
            >
              <HelpCircle className="h-6 w-6" />
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <MoodLogger 
            onMoodLog={handleMoodLog} 
            dailyEntriesCount={analyticsData.dailyEntriesCount}
            onRefresh={fetchMoodData}
          />
          
          {/* Insights Card */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Your Mood Insights</h2>
            <div className="space-y-4">
              {calculateInsights().map((insight, index) => (
                <p key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-primary mt-1.5" />
                  {insight}
                </p>
              ))}
              {calculateInsights().length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Start logging your moods to see personalized insights!
                </p>
              )}
            </div>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Mood Trends Card */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Mood Trends</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={analyticsData.timelineData.slice(-MAX_DAYS_TO_SHOW)}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280"
                    tick={{ fill: '#6b7280' }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    tick={{ fill: '#6b7280' }}
                    domain={[0, 10]}
                    tickCount={6}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="intensity"
                    stroke="#60a5fa"
                    strokeWidth={2}
                    name="Mood Intensity"
                    dot={{ fill: '#60a5fa', r: 4 }}
                    activeDot={{ r: 6, fill: '#3b82f6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Mood Distribution Card */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Mood Distribution</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    dataKey="count"
                    nameKey="mood"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name }) => name.replace('_', ' ')}
                  >
                    {distributionData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={moodColors[entry.mood as keyof typeof moodColors]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Spending Correlation Card */}
          <Card className="p-6 md:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Mood-Spending Correlation</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={spendingData}
                  style={{ userSelect: 'none' }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="mood" 
                    stroke="#6b7280"
                    tick={{ fill: '#6b7280' }}
                    tickFormatter={(value) => value.replace('_', ' ')}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    tick={{ fill: '#6b7280' }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      padding: '8px 12px'
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Average Spending']}
                    labelFormatter={(label) => label.replace('_', ' ')}
                  />
                  <Legend />
                  <Bar 
                    dataKey="averageSpent" 
                    name="Average Spending"
                    radius={[4, 4, 0, 0]}
                  >
                    {spendingData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={moodColors[entry.mood as keyof typeof moodColors]} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Historical Weekly Data */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Historical Weekly Summary</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-muted-foreground font-medium">Week</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Avg Mood</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Entries</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Total Spending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.historicalWeeks?.map((week, index) => (
                      <tr key={week.weekStart} className={`${index % 2 === 0 ? 'bg-muted/50' : ''} text-foreground`}>
                        <td className="py-2">
                          {new Date(week.weekStart).toLocaleDateString()} - {new Date(week.weekEnd).toLocaleDateString()}
                        </td>
                        <td className="text-right py-2">{week.averageMood.toFixed(1)}</td>
                        <td className="text-right py-2">{week.entryCount}</td>
                        <td className="text-right py-2">${week.totalSpending.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>

        <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>About Mood Analytics</DialogTitle>
              <DialogDescription>
                <div className="space-y-4 mt-4">
                  <p>
                    Understanding your emotional state while making financial decisions
                    can help you make better choices and identify patterns in your
                    spending behavior.
                  </p>
                  <h3 className="font-semibold">How it works:</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Log your mood up to 3 times per day</li>
                    <li>Rate the intensity of your emotions</li>
                    <li>Add notes to provide context (optional)</li>
                    <li>View correlations between your mood and spending</li>
                  </ul>
                  <p>
                    Your mood data is private and secure. You can opt out or delete your
                    mood data at any time.
                  </p>
                  {showClearButton && (
                    <div className="mt-6 pt-6 border-t border-border">
                      <Button
                        variant="destructive"
                        onClick={() => setShowClearConfirm(true)}
                        className="w-full"
                      >
                        Clear All Mood Data
                      </Button>
                    </div>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setShowInfoDialog(false)}>
                Got it
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clear All Mood Data</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete all your mood entries? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleClearData}
              >
                Yes, Clear All Data
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default MoodAnalytics;