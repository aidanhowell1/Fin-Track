import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { Layout } from '@/components/Layout'
import { DashboardStats } from '@/components/DashboardStats'
import { MoodLogger } from '@/components/MoodLogger'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { CalendarIcon, Plus, ShoppingCart, Home as HomeIcon, Utensils, Car, Smartphone, DollarSign, Briefcase, Gift, CreditCard } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { fetchWithAuth } from '@/lib/api'
import { useToast } from "@/components/ui/use-toast"

const categoryIcons: { [key: string]: any } = {
  groceries: ShoppingCart,
  rent: HomeIcon,
  food: Utensils,
  transport: Car,
  utilities: Smartphone,
  salary: Briefcase,
  gift: Gift,
  investment: DollarSign,
  shopping: CreditCard,
}

const incomeCategories = [
  { value: 'salary', label: 'Salary' },
  { value: 'investment', label: 'Investment' },
  { value: 'gift', label: 'Gift' },
]

const expenseCategories = [
  { value: 'groceries', label: 'Groceries' },
  { value: 'rent', label: 'Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'transport', label: 'Transport' },
  { value: 'food', label: 'Food' },
  { value: 'shopping', label: 'Shopping' },
]

interface Transaction {
  id: string
  date: string
  description: string
  category: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
}

interface UserSettings {
  currency: string
  language: string
  timezone: string
}

export default function Home() {
  const { toast } = useToast()
  const router = useRouter()
  const [isAddingTransaction, setIsAddingTransaction] = useState(false)
  const [date, setDate] = useState<Date>(new Date())
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [settings, setSettings] = useState<UserSettings>({
    currency: 'USD',
    language: 'en',
    timezone: 'UTC'
  })
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    amount: '',
    type: '',
    category: '',
    description: '',
  })
  const [activeTab, setActiveTab] = useState('transactions')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/auth/login')
      return
    }

    fetchData()
  }, [router])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [transactionsResponse, settingsResponse] = await Promise.all([
        fetchWithAuth('/api/transactions'),
        fetchWithAuth('/api/user/settings')
      ])

      if (!transactionsResponse.ok || !settingsResponse.ok) {
        throw new Error('Failed to fetch data')
      }

      const transactionsData = await transactionsResponse.json()
      const settingsData = await settingsResponse.json()

      setTransactions(transactionsData)
      setSettings(settingsData)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: "Error",
        description: "Failed to load data. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.amount || !formData.type || !formData.category || !date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetchWithAuth('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          amount: formData.type === 'EXPENSE' ? -Math.abs(parseFloat(formData.amount)) : Math.abs(parseFloat(formData.amount)),
          type: formData.type,
          category: formData.category,
          date: date.toISOString(),
          description: formData.description,
        }),
      })

      if (!response.ok) throw new Error('Failed to add transaction')

      toast({
        title: "Success",
        description: "Transaction added successfully",
      })

      setFormData({
        amount: '',
        type: '',
        category: '',
        description: '',
      })
      setDate(new Date())
      setIsAddingTransaction(false)
      fetchData()
    } catch (error) {
      console.error('Error adding transaction:', error)
      toast({
        title: "Error",
        description: "Failed to add transaction. Please try again.",
        variant: "destructive",
      })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: settings.currency || 'USD',
    }).format(amount)
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    if (value === 'budgets') {
      router.push('/budgets')
    } else if (value === 'analytics') {
      router.push('/analytics')
    }
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <Dialog open={isAddingTransaction} onOpenChange={setIsAddingTransaction}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Transaction</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value, category: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INCOME">Income</SelectItem>
                      <SelectItem value="EXPENSE">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.type === 'INCOME' 
                        ? incomeCategories.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))
                        : expenseCategories.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))
                      }
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(newDate) => setDate(newDate || new Date())}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Input 
                    id="description" 
                    placeholder="Transaction description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>
              <Button className="w-full" onClick={handleSubmit}>
                Save Transaction
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        {!loading && transactions.length > 0 && (
          <DashboardStats
            totalIncome={transactions.reduce((sum, t) => t.type === 'INCOME' ? sum + t.amount : sum, 0)}
            totalExpenses={transactions.reduce((sum, t) => t.type === 'EXPENSE' ? sum + t.amount : sum, 0)}
            transactionCount={transactions.length}
          />
        )}



        <Card className="p-6">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="budgets">Budgets</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
            <TabsContent value="transactions">
              <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4 font-medium">
                    <div>Date</div>
                    <div>Description</div>
                    <div>Category</div>
                    <div className="text-right">Amount</div>
                  </div>
                  {loading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="grid grid-cols-4 gap-4">
                          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  ) : transactions.length > 0 ? (
                    <div className="space-y-4">
                      {transactions.map((transaction) => {
                        const Icon = categoryIcons[transaction.category] || DollarSign
                        return (
                          <div key={transaction.id} className="grid grid-cols-4 gap-4 items-center">
                            <div>{format(new Date(transaction.date), 'MMM dd, yyyy')}</div>
                            <div>{transaction.description}</div>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {transaction.category.charAt(0).toUpperCase() + transaction.category.slice(1)}
                            </div>
                            <div className={cn(
                              "text-right font-medium",
                              transaction.type === 'INCOME' ? "text-green-500" : "text-red-500"
                            )}>
                              {transaction.type === 'INCOME' ? '+' : '-'}
                              {formatCurrency(Math.abs(transaction.amount))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      No transactions yet. Add your first transaction using the button above.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="budgets">
              <div className="h-[400px] w-full rounded-md border p-4 flex items-center justify-center">
                <Link href="/budgets">
                  <Button>Go to Budgets</Button>
                </Link>
              </div>
            </TabsContent>
            <TabsContent value="analytics">
              <div className="h-[400px] w-full rounded-md border p-4 flex items-center justify-center">
                <Link href="/analytics">
                  <Button>Go to Analytics</Button>
                </Link>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </Layout>
  )
}