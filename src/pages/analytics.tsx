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

type AnalyticsResponse = {
  monthlyData: Array<Record<string, unknown>>
  categoryData: Array<Record<string, unknown> & { color?: string; name: string; value: number }>
  totals: {
    income: number
    expenses: number
    balance: number
  }
}

export default function Analytics() {
  const [period, setPeriod] = useState('6')
  const [analyticsData, setAnalyticsData] = useState<AnalyticsResponse>({
    monthlyData: [],
    categoryData: [],
    totals: {
      income: 0,
      expenses: 0,
      balance: 0,
    },
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true)
        setError(null)

        const token = localStorage.getItem('token')
        if (!token) {
          throw new Error('Authentication required: Please log in')
        }

        const response = await fetch(`/api/analytics?period=${period}`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch analytics data')
        }

        const data: AnalyticsResponse = await response.json()
        setAnalyticsData(data)
      } catch (err) {
        console.error('Error fetching analytics:', err)
        setError(err instanceof Error ? err.message : 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [period])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  if (error) {
    return (
      <Layout>
        <div className="p-4 text-red-500">Error loading analytics: {error}</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
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
            <p
              className={`mt-2 text-2xl font-bold ${
                analyticsData.totals.balance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatCurrency(analyticsData.totals.balance)}
            </p>
          </Card>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold">Income vs Expenses</h2>
            {loading ? (
              <div className="flex h-[300px] items-center justify-center">Loading...</div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={formatCurrency} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(Number(value))}
                      labelStyle={{ color: 'black' }}
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
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

          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold">Top Expenses by Category</h2>
            {loading ? (
              <div className="flex h-[300px] items-center justify-center">Loading...</div>
            ) : (
              <div className="flex h-[300px] flex-col">
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
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine
                      >
                        {analyticsData.categoryData.map((entry, index) => (
                          <Cell key={index} fill={typeof entry.color === 'string' ? entry.color : '#64748b'} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(Number(value))}
                        labelStyle={{ color: 'black' }}
                        contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
                  {analyticsData.categoryData.map((category, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: typeof category.color === 'string' ? category.color : '#64748b' }}
                      />
                      <span className="truncate text-sm">{category.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card className="md:col-span-2 p-6">
            <Tabs defaultValue="monthly" className="w-full">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Detailed Analysis</h2>
                <TabsList>
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                  <TabsTrigger value="category">By Category</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="monthly">
                {loading ? (
                  <div className="flex h-[400px] items-center justify-center">Loading...</div>
                ) : (
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analyticsData.monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={formatCurrency} />
                        <Tooltip
                          formatter={(value: number) => formatCurrency(Number(value))}
                          labelStyle={{ color: 'black' }}
                          contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
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
              <TabsContent value="category">
                {loading ? (
                  <div className="flex h-[400px] items-center justify-center">Loading...</div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {analyticsData.categoryData.map((category, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-4 w-4 rounded-full"
                              style={{
                                backgroundColor: typeof category.color === 'string' ? category.color : '#64748b',
                              }}
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
