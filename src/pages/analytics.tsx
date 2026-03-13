import { Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

	// Analytics page component
export default function Analytics() {
		// State for time period selection
  	const [period, setPeriod] = useState('6')
  	const [analyticsData, setAnalyticsData] = useState<{
    monthlyData: any[];
    categoryData: any[];
    totals: {
      income: number;
      expenses: number;
      balance: number;
    };
  }>({
    monthlyData: [],
    categoryData: [],
    totals: {
      income: 0,
      expenses: 0,
      balance: 0
    }
  })
  	// State for loading and error handling
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
	
  	// Fetch analytics data based on period
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true)
        setError(null)
			// Get auth token
		const token = localStorage.getItem('token')
		if (!token) {
			console.error('No token found in localStorage');
		    throw new Error('Authentication required: Please log in');
		}
			// Debug log (partial token for security)
		console.log('Fetching analytics with token:', token.substring(0, 10) + '...'); 
		const headers: HeadersInit = {
		          'Content-Type': 'application/json',
				  'Authorization': `Bearer ${token}`
		}
			// Fetch analytics data		
        const response = await fetch(`/api/analytics?period=${period}`,{
			headers
		});
		
        if (!response.ok){
			const errorData = await response.json()
			console.error('Analytics fetch failed:', errorData);
			throw new Error(errorData.error || 'Failed to fetch analytics data')
		} 
        const data = await response.json()
        setAnalyticsData(data)
      } catch (error) {
		// Handle fetch errors
        console.error('Error fetching analytics:', error)
        setError(error instanceof Error ? error.message : 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [period])

  // Format numbers as USD currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Show error state if fetch fails
  if (error) {
    return (
      <Layout>
        <div className="p-4 text-red-500">
          Error loading analytics: {error}
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      {/* Page header with period selector */}
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Last 3 months</SelectItem>
              <SelectItem value="6">Last 6 months</SelectItem>
              <SelectItem value="12">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Total Income</h3>
            <p className="mt-2 text-2xl font-bold text-green-600">
              {formatCurrency(analyticsData.totals.income)}
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Total Expenses</h3>
            <p className="mt-2 text-2xl font-bold text-red-600">
              {formatCurrency(analyticsData.totals.expenses)}
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Balance</h3>
            <p className={`mt-2 text-2xl font-bold ${analyticsData.totals.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(analyticsData.totals.balance)}
            </p>
          </Card>
        </div>

		{/* Line chart for income vs expenses */}
        <div className="grid gap-8 md:grid-cols-2">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Income vs Expenses</h2>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center">
                Loading...
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={formatCurrency} />
                    <Tooltip 
                      formatter={formatCurrency}
                      labelStyle={{ color: 'black' }}
                      contentStyle={{ 
                        backgroundColor: 'white',
                        border: '1px solid #ccc'
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="income"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Income"
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      stroke="#f43f5e"
                      strokeWidth={2}
                      name="Expenses"
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

		  {/* Pie chart for expense categories */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Top Expenses by Category</h2>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center">
                Loading...
              </div>
            ) : (
              <div className="flex flex-col h-[300px]">
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => 
                          `${name} (${(percent * 100).toFixed(0)}%)`
                        }
                        labelLine={true}
                      >
                        {analyticsData.categoryData.map((entry: any, index: number) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={formatCurrency}
                        labelStyle={{ color: 'black' }}
                        contentStyle={{ 
                          backgroundColor: 'white',
                          border: '1px solid #ccc'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
				{/* Legend for pie chart */}
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                  {analyticsData.categoryData.map((category: any, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm truncate">
                        {category.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

		  {/* Detailed analysis with tabs */}
          <Card className="p-6 md:col-span-2">
            <Tabs defaultValue="monthly" className="w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Detailed Analysis</h2>
                <TabsList>
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                  <TabsTrigger value="category">By Category</TabsTrigger>
                </TabsList>
              </div>
			  {/* Monthly line chart */}
              <TabsContent value="monthly">
                {loading ? (
                  <div className="h-[400px] flex items-center justify-center">
                    Loading...
                  </div>
                ) : (
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analyticsData.monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={formatCurrency} />
                        <Tooltip 
                          formatter={formatCurrency}
                          labelStyle={{ color: 'black' }}
                          contentStyle={{ 
                            backgroundColor: 'white',
                            border: '1px solid #ccc'
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="income"
                          name="Income"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="expenses"
                          name="Expenses"
                          stroke="#f43f5e"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </TabsContent>
			  {/* Category breakdown */}
              <TabsContent value="category">
                {loading ? (
                  <div className="h-[400px] flex items-center justify-center">
                    Loading...
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {analyticsData.categoryData.map((category: any, index: number) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            <h3 className="font-medium">{category.name}</h3>
                          </div>
                          <p className="font-bold">{formatCurrency(category.value)}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </Layout>
  )
}
