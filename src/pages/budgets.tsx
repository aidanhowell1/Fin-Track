import { useState, useEffect } from 'react'
import { Layout } from '@/components/Layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
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
import { useToast } from "@/components/ui/use-toast"
import { CalendarIcon, Plus } from 'lucide-react'
import { fetchWithAuth } from '@/lib/api'

// Budget interface definition
interface Budget {
  id: string
  category: {
    id: string
    name: string
  }
  monthlyLimit: number
  startDate: string
  endDate: string
  isRecurring: boolean
  periodType: 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
  alertThreshold: number
  currentSpending: number
  percentageUsed: string
}
// Default form data for new budget
const defaultFormData = {
  categoryId: '',
  monthlyLimit: '',
  isRecurring: false,
  periodType: 'MONTHLY',
  alertThreshold: '80',
}

export default function Budgets() {
  const { toast } = useToast()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [isAddingBudget, setIsAddingBudget] = useState(false)
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [formData, setFormData] = useState(defaultFormData)
  const [isLoading, setIsLoading] = useState(false)

  const fetchBudgets = async () => {
    try {
      const response = await fetchWithAuth('/api/budgets')
      if (!response.ok) throw new Error('Failed to fetch budgets')
      const data = await response.json()
      setBudgets(data)
    } catch (error) {
      console.error('Error fetching budgets:', error)
      toast({
        title: "Error",
        description: "Failed to load budgets",
        variant: "destructive",
      })
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetchWithAuth('/api/categories')
      if (!response.ok) throw new Error('Failed to fetch categories')
      const data = await response.json()
      setCategories(data.filter((cat: any) => cat.name.toLowerCase() !== 'income'))
    } catch (error) {
      console.error('Error fetching categories:', error)
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    fetchBudgets()
    fetchCategories()
  }, [])

  const resetForm = () => {
    setFormData(defaultFormData)
    setStartDate(new Date())
    setEndDate(new Date())
  }

  const handleSubmit = async () => {
    try {
      setIsLoading(true)

      if (!formData.categoryId || !formData.monthlyLimit) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        })
        return
      }

      const monthlyLimit = parseFloat(formData.monthlyLimit)
      if (isNaN(monthlyLimit) || monthlyLimit <= 0) {
        toast({
          title: "Error",
          description: "Please enter a valid monthly limit amount",
          variant: "destructive",
        })
        return
      }

      if (startDate >= endDate) {
        toast({
          title: "Error",
          description: "End date must be after start date",
          variant: "destructive",
        })
        return
      }

      const response = await fetchWithAuth('/api/budgets', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          monthlyLimit: monthlyLimit,
          alertThreshold: parseFloat(formData.alertThreshold) || 80,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create budget')
      }

      toast({
        title: "Success",
        description: "Budget created successfully",
      })

      setIsAddingBudget(false)
      resetForm()
      fetchBudgets()
    } catch (error) {
      console.error('Error creating budget:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create budget",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getProgressColor = (percentageUsed: number, threshold: number) => {
    if (percentageUsed >= threshold) return "bg-red-500"
    if (percentageUsed >= threshold * 0.8) return "bg-yellow-500"
    return "bg-green-500"
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
          <Dialog open={isAddingBudget} onOpenChange={(open) => {
            setIsAddingBudget(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Budget
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Budget</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="monthlyLimit">Monthly Limit</Label>
                  <Input
                    id="monthlyLimit"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.monthlyLimit}
                    onChange={(e) => setFormData({ ...formData, monthlyLimit: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => setStartDate(date || new Date())}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid gap-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => setEndDate(date || new Date())}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="alertThreshold">Alert Threshold (%)</Label>
                  <Input
                    id="alertThreshold"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="80"
                    value={formData.alertThreshold}
                    onChange={(e) => setFormData({ ...formData, alertThreshold: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Budget"}
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => (
            <Card key={budget.id} className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold capitalize">{budget.category.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(budget.startDate), 'MMM dd')} - {format(new Date(budget.endDate), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${budget.currentSpending.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">of ${budget.monthlyLimit.toFixed(2)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{parseFloat(budget.percentageUsed).toFixed(0)}%</span>
                  </div>
                  <Progress
                    value={parseFloat(budget.percentageUsed)}
                    className={getProgressColor(parseFloat(budget.percentageUsed), budget.alertThreshold)}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  )
}