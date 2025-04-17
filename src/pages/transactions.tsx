import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { fetchWithAuth } from '@/lib/api'
import { Layout } from '@/components/Layout'
import { TransactionFilters } from '@/components/TransactionFilters'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  CalendarIcon,
  Plus,
  ArrowUpDown,
  ShoppingCart,
  Home,
  Utensils,
  Car,
  Smartphone,
  DollarSign,
  Briefcase,
  Gift,
  CreditCard,
  Trash2,
  Edit,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DashboardStats } from '@/components/DashboardStats'

// Mapping of category names to icons
const categoryIcons: { [key: string]: any } = {
  groceries: ShoppingCart,
  rent: Home,
  food: Utensils,
  transport: Car,
  utilities: Smartphone,
  salary: Briefcase,
  gift: Gift,
  investment: DollarSign,
  shopping: CreditCard,
}

// Predefined income categories
const incomeCategories = [
  { value: 'salary', label: 'Salary' },
  { value: 'investment', label: 'Investment' },
  { value: 'gift', label: 'Gift' },
]
// Predefined expense categories
const expenseCategories = [
  { value: 'groceries', label: 'Groceries' },
  { value: 'rent', label: 'Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'transport', label: 'Transport' },
  { value: 'food', label: 'Food' },
  { value: 'shopping', label: 'Shopping' },
]

// Interface for transaction data
interface Transaction {
  id: string
  date: string | Date
  description: string
  category: {
    id: string
    name: string
  }
  amount: number
  type: 'INCOME' | 'EXPENSE'
  tags?: { id: string; name: string }[]
}

// Main Transactions component
export default function Transactions() {
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const { toast } = useToast()
  const [date, setDate] = useState<Date>(new Date())
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const [isAddingTransaction, setIsAddingTransaction] = useState(false)
  const [isEditingTransaction, setIsEditingTransaction] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [sortConfig, setSortConfig] = useState({ field: 'date', order: 'desc' })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [clearingData, setClearingData] = useState(false)
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    transactionCount: 0
  })
  const [formData, setFormData] = useState({
    amount: '',
    type: '',
    category: '',
    description: '',
    tags: [] as string[],
  })

  // Opens add transaction dialog if query param 'add=true'
  useEffect(() => {
    if (router.query.add === 'true') {
      setIsAddingTransaction(true)
      router.replace('/transactions', undefined, { shallow: true })
    }
  }, [router.query.add])

  // Resets form data and related states
  const resetForm = () => {
    setFormData({
      amount: '',
      type: '',
      category: '',
      description: '',
      tags: [],
    })
    setDate(new Date())
    setSelectedTransaction(null)
    setIsAddingTransaction(false)
    setIsEditingTransaction(false)
  }

  // API error handling
  const handleApiError = (error: any, context: string) => {
    console.error(`Error in ${context}:`, error)
    let errorMessage = 'An unexpected error occurred'
    let errorDetails = ''
    
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    } else if (error?.error || error?.message) {
      errorMessage = error.error || error.message
      if (error.details) {
        errorDetails = error.details
      }
    }
    
    toast({
      title: "Error",
      description: (
        <div className="space-y-2">
          <p>{errorMessage}</p>
          {errorDetails && <p className="text-sm opacity-80">{errorDetails}</p>}
        </div>
      ),
      variant: "destructive",
      duration: 5000,
    })
    return { message: errorMessage, details: errorDetails }
  }
  
  // Fetches transactions with filters, sorting, and pagination
  const fetchTransactions = async (page = 1, filters = {}, sort = sortConfig) => {
    if (!mounted.current) return
    setLoading(true)
    setError(null)
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        sortField: sort.field,
        sortOrder: sort.order,
        ...filters,
      })

      const response = await fetchWithAuth('/api/transactions?' + queryParams.toString())
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load transactions')
      }
      const data = await response.json()
      setTransactions(data.transactions)
      setTotalPages(data.pagination.pages)
      setCurrentPage(data.pagination.currentPage)
      setStats(data.stats)
    } catch (error) {
      setError('Failed to load transactions')
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load transactions",
        variant: "destructive",
      })
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  // Handles filter changes and resets to first page
  const handleFilterChange = (filters: any) => {
    setCurrentPage(1)
    fetchTransactions(1, filters)
  }

  // Handle form submission
  const handleSubmit = async () => {
    try {
      // Validate required fields
      if (!formData.amount || !formData.type || !formData.category || !date) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        })
        return
      }

      // Validate amount
      const amount = parseFloat(formData.amount)
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Error",
          description: "Amount must be a positive number",
          variant: "destructive",
        })
        return
      }

      // Validate description
      if (!formData.description?.trim()) {
        toast({
          title: "Error",
          description: "Description is required",
          variant: "destructive",
        })
        return
      }

      if (formData.description.length > 255) {
        toast({
          title: "Error",
          description: "Description must be less than 255 characters",
          variant: "destructive",
        })
        return
      }

      // Validate date
      if (isNaN(date.getTime())) {
        toast({
          title: "Error",
          description: "Please select a valid date",
          variant: "destructive",
        })
        return
      }

      // Prevent future dates
      if (date > new Date()) {
        toast({
          title: "Error",
          description: "Transaction date cannot be in the future",
          variant: "destructive",
        })
        return
      }

      // Validate tags if provided
      if (formData.tags && (!Array.isArray(formData.tags) || formData.tags.some(tag => !tag.trim()))) {
        toast({
          title: "Error",
          description: "Invalid tags format",
          variant: "destructive",
        })
        return
      }

      const url = selectedTransaction 
        ? '/api/transactions/' + selectedTransaction.id
        : '/api/transactions'
      
      const method = selectedTransaction ? 'PUT' : 'POST'

      // Show loading state
      const loadingToast = toast({
        title: "Processing",
        description: "Please wait while we process your transaction...",
      })

      try {
        const response = await fetchWithAuth(url, {
          method,
          body: {
            amount: amount,
            type: formData.type,
            category: formData.category,
            date: date.toISOString(),
            description: formData.description.trim(),
            tags: formData.tags?.filter(tag => tag.trim()),
          },
        })

        // Dismiss loading toast
        loadingToast.dismiss()

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || errorData.error || 'Failed to process transaction')
        }

        const result = await response.json()

        toast({
          title: "Success",
          description: selectedTransaction ? "Transaction updated successfully" : "Transaction added successfully",
        })

        resetForm()
        setIsAddingTransaction(false)
        setIsEditingTransaction(false)
        fetchTransactions(currentPage)
      } catch (error: any) {
        // Dismiss loading toast
        loadingToast.dismiss()

        // Handle specific error cases
        if (error.status === 401) {
          toast({
            title: "Authentication Error",
            description: "Please log in to continue",
            variant: "destructive",
          })
          return
        }

        console.error('Transaction API Error:', error)
        toast({
          title: "Error",
          description: error.message || "Failed to process transaction. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Transaction submission error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred while processing the transaction",
        variant: "destructive",
      })
    }
  }

  // Deletes a transaction by ID
  const handleDelete = async (id: string) => {
    try {
      const response = await fetchWithAuth('/api/transactions/' + id, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete transaction')

      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      })

      setDeleteConfirmOpen(false)
      setSelectedTransaction(null)
      fetchTransactions(currentPage)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive",
      })
    }
  }

  // Prepares form for editing a transaction
  const handleEdit = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setFormData({
      amount: Math.abs(transaction.amount).toString(),
      type: transaction.type,
      category: transaction.category.name,
      description: transaction.description || '',
      tags: transaction.tags?.map(tag => tag.name) || [],
    })
    setDate(new Date(transaction.date))
    setIsEditingTransaction(true)
  }

  // Updates sorting configuration
  const handleSort = (field: string) => {
    setSortConfig(current => ({
      field,
      order: current.field === field && current.order === 'asc' ? 'desc' : 'asc'
    }))
  }
  
  // Changes current page
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    fetchTransactions(newPage)
  }
  
  // Clears all transactions
  const handleClearData = async () => {
    if (clearingData) return
    
    try {
      setClearingData(true)
      const response = await fetchWithAuth('/api/transactions/clear', {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to clear transactions')
      }

      toast({
        title: "Success",
        description: "All transactions have been cleared successfully",
      })

      setClearConfirmOpen(false)
      fetchTransactions(1) // Reset to first page
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear transactions. Please try again.",
        variant: "destructive",
      })
    } finally {
      setClearingData(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
			{/* Shows total income, expenses, and transaction count*/}
			{!loading && !error && (
              <DashboardStats
                totalIncome={stats.totalIncome}
                totalExpenses={stats.totalExpenses}
                transactionCount={stats.transactionCount}
              />
            )}
          </div>
          <div className="flex gap-2">
		  {/* Button to open add transaction modal */}
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
				{/* Input for transaction amount */}
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
				  {/* Dropdown for transaction type */}
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
				  {/* Dropdown for transaction category */}
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
				  {/* Calendar for selecting transaction date */}
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
				  {/* Input for transaction description */}
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
                  {selectedTransaction ? 'Update' : 'Save'} Transaction
                </Button>
              </DialogContent>
            </Dialog>

          </div>
        </div>

		{/* Component for filtering transactions */}
        <TransactionFilters
          onFilterChange={handleFilterChange}
          categories={[...incomeCategories, ...expenseCategories]}
        />

		{/* Displays transactions in a table */}
        <Card>
          {error ? (
            <div className="p-8 text-center space-y-4">
              <div className="flex flex-col items-center space-y-2">
                <svg
                  className="h-10 w-10 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900">Error Loading Transactions</h3>
                <p className="text-red-500 text-sm">{error}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => fetchTransactions(currentPage)}
                className="mt-4"
              >
                <svg
                  className="h-4 w-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Try Again
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
				  {/* Sortable headers for date, description, and amount */}
                    <TableHead 
                      className="w-[100px] cursor-pointer"
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center">
                        Date
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort('description')}
                    >
                      <div className="flex items-center">
                        Description
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead 
                      className="text-right cursor-pointer"
                      onClick={() => handleSort('amount')}
                    >
                      <div className="flex items-center justify-end">
                        Amount
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
				{/* Shows skeleton row*/}
                  {loading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        No transactions found
                      </TableCell>
                    </TableRow>
					{/* Lists transactions with actions*/}
                  ) : (
                    transactions.map((transaction) => {
                      const Icon = categoryIcons[transaction.category.name] || DollarSign
                      return (
                        <TableRow key={transaction.id} className="group">
                          <TableCell className="font-medium">
                            {format(new Date(transaction.date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span className="capitalize">
                                {transaction.category.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={transaction.type === 'INCOME' ? 'success' : 'destructive'}>
                              {transaction.type === 'INCOME' ? '+' : '-'}
                              ${Math.abs(transaction.amount).toFixed(2)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEdit(transaction)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit transaction</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setSelectedTransaction(transaction)
                                        setDeleteConfirmOpen(true)
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete transaction</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
			  {/* Navigation for table pages*/}
              {!loading && transactions.length > 0 && (
                <div className="flex items-center justify-center space-x-2 py-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

	  {/* Confirm transaction deletion */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the transaction.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedTransaction && handleDelete(selectedTransaction.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

	  {/* Confirm clearing all transactions */}
      <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Transactions</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all your transactions.
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearData}
              disabled={clearingData}
            >
              {clearingData ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Clearing...
                </>
              ) : (
                'Clear All Data'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

	  {/* Edit existing transactions */}
      <Dialog open={isEditingTransaction} onOpenChange={setIsEditingTransaction}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
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
            Update Transaction
          </Button>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}