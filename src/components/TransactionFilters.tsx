import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { CalendarIcon, SlidersHorizontal } from 'lucide-react'

interface TransactionFiltersProps {
  onFilterChange: (filters: any) => void
  categories: Array<{ value: string; label: string }>
}

export function TransactionFilters({ onFilterChange, categories }: TransactionFiltersProps) {
  const searchTimeout = useRef<NodeJS.Timeout>()
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current)
      }
    }
  }, [])
  const [isOpen, setIsOpen] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    type: 'all',
    startDate: null as Date | null,
    endDate: null as Date | null,
    minAmount: '',
    maxAmount: '',
  })

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
  }

  const handleApplyFilters = () => {
    const appliedFilters = {
      search: filters.search || undefined,
      category: filters.category !== 'all' ? filters.category : undefined,
      type: filters.type !== 'all' ? filters.type : undefined,
      startDate: filters.startDate ? filters.startDate.toISOString() : undefined,
      endDate: filters.endDate ? filters.endDate.toISOString() : undefined,
      minAmount: filters.minAmount ? parseFloat(filters.minAmount) : undefined,
      maxAmount: filters.maxAmount ? parseFloat(filters.maxAmount) : undefined,
    }

    // Remove undefined values
    Object.keys(appliedFilters).forEach(key => {
      if (appliedFilters[key] === undefined) {
        delete appliedFilters[key]
      }
    })

    onFilterChange(appliedFilters)
    setIsOpen(false)
  }

  const handleReset = () => {
    const resetFilters = {
      search: '',
      category: 'all',
      type: 'all',
      startDate: null,
      endDate: null,
      minAmount: '',
      maxAmount: '',
    }
    setFilters(resetFilters)
    onFilterChange(resetFilters)
    setIsOpen(false)
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-1">
        <Input
          placeholder="Search transactions..."
          value={filters.search}
          onChange={(e) => {
            const value = e.target.value
            handleFilterChange('search', value)
            
            if (searchTimeout.current) {
              clearTimeout(searchTimeout.current)
            }
            
            searchTimeout.current = setTimeout(() => {
              if (mounted.current) {
                onFilterChange({ ...filters, search: value })
              }
            }, 300)
          }}
          className="max-w-sm"
        />
      </div>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Filter Transactions</SheetTitle>
            <SheetDescription>
              Apply filters to find specific transactions
            </SheetDescription>
          </SheetHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Transaction Type</Label>
              <Select
                value={filters.type}
                onValueChange={(value) => handleFilterChange('type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="INCOME">Income</SelectItem>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Category</Label>
              <Select
                value={filters.category}
                onValueChange={(value) => handleFilterChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Date Range</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !filters.startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.startDate ? format(filters.startDate, "PPP") : "Start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.startDate || undefined}
                      onSelect={(date) => handleFilterChange('startDate', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !filters.endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.endDate ? format(filters.endDate, "PPP") : "End date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.endDate || undefined}
                      onSelect={(date) => handleFilterChange('endDate', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Amount Range</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min amount"
                  value={filters.minAmount}
                  onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Max amount"
                  value={filters.maxAmount}
                  onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                />
              </div>
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={handleReset}>
              Reset Filters
            </Button>
            <Button onClick={handleApplyFilters}>Apply Filters</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}