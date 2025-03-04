import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Layout from "@/components/Layout"
import { GoalCard } from "@/components/GoalCard"
import { GoalForm } from "@/components/GoalForm"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"

export default function GoalsPage() {
  const [goals, setGoals] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<any>(null)
  const { toast } = useToast()
  const router = useRouter()

  // Fetch goals and categories on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setError("")
        setIsLoading(true)
        
        const [goalsRes, categoriesRes] = await Promise.all([
          fetch("/api/goals"),
          fetch("/api/categories"),
        ])
        
        if (!goalsRes.ok || !categoriesRes.ok) {
          throw new Error("Failed to fetch data")
        }

        const [goalsData, categoriesData] = await Promise.all([
          goalsRes.json(),
          categoriesRes.json(),
        ])

        setGoals(goalsData)
        setCategories(categoriesData)
      } catch (error) {
        setError("Failed to load goals and categories. Please try again later.")
        toast({
          title: "Error",
          description: "Failed to load goals and categories",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [toast])

  const handleCreateGoal = async (data: any) => {
    try {
      const formattedData = {
        ...data,
        targetAmount: Number(data.targetAmount),
        allocateAmount: data.allocateAmount ? Number(data.allocateAmount) : undefined,
      }

      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formattedData),
      })

      if (!response.ok) {
        throw new Error("Failed to create goal")
      }

      const newGoal = await response.json()
      setGoals((prev) => [...prev, newGoal])
      setShowForm(false)
      toast({
        title: "Success",
        description: "Goal created successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create goal",
        variant: "destructive",
      })
    }
  }

  const handleUpdateGoal = async (data: any) => {
    if (!editingGoal) return

    try {
      const formattedData = {
        ...data,
        targetAmount: Number(data.targetAmount),
        allocateAmount: data.allocateAmount ? Number(data.allocateAmount) : undefined,
      }

      const response = await fetch(`/api/goals/${editingGoal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formattedData),
      })

      if (!response.ok) {
        throw new Error("Failed to update goal")
      }

      const updatedGoal = await response.json()
      setGoals((prev) =>
        prev.map((goal) => (goal.id === updatedGoal.id ? updatedGoal : goal))
      )
      setEditingGoal(null)
      toast({
        title: "Success",
        description: "Goal updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update goal",
        variant: "destructive",
      })
    }
  }

  const handleAllocate = (goalId: string) => {
    router.push(`/transactions?allocateToGoal=${goalId}`)
  }

  const activeGoals = goals.filter((goal) => goal.status === "ACTIVE")
  const completedGoals = goals.filter((goal) => goal.status === "COMPLETED")
  const cancelledGoals = goals.filter((goal) => goal.status === "CANCELLED")

  const GoalGrid = ({ goals }: { goals: any[] }) => (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {goals.map((goal) => (
        <GoalCard
          key={goal.id}
          goal={goal}
          onEdit={goal.status === "ACTIVE" ? () => setEditingGoal(goal) : undefined}
          onAllocate={goal.status === "ACTIVE" ? handleAllocate : undefined}
        />
      ))}
    </div>
  )

  const LoadingSkeleton = () => (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-4">
          <Skeleton className="h-[200px] w-full rounded-lg" />
        </div>
      ))}
    </div>
  )

  return (
    <Layout>
      <div className="container mx-auto py-6 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Financial Goals</h1>
            <p className="text-muted-foreground mt-1">
              Track and manage your financial objectives
            </p>
          </div>
          <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto">
            Create New Goal
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="active">
                Active ({activeGoals.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({completedGoals.length})
              </TabsTrigger>
              <TabsTrigger value="cancelled">
                Cancelled ({cancelledGoals.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              {activeGoals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No active goals. Create one to get started!
                </div>
              ) : (
                <GoalGrid goals={activeGoals} />
              )}
            </TabsContent>

            <TabsContent value="completed">
              {completedGoals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No completed goals yet.
                </div>
              ) : (
                <GoalGrid goals={completedGoals} />
              )}
            </TabsContent>

            <TabsContent value="cancelled">
              {cancelledGoals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No cancelled goals.
                </div>
              ) : (
                <GoalGrid goals={cancelledGoals} />
              )}
            </TabsContent>
          </Tabs>
        )}

        <Dialog
          open={showForm || !!editingGoal}
          onOpenChange={(open) => {
            if (!open) {
              setShowForm(false)
              setEditingGoal(null)
            }
          }}
        >
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingGoal ? "Edit Goal" : "Create New Goal"}
              </DialogTitle>
              <DialogDescription>
                {editingGoal
                  ? "Update your financial goal details"
                  : "Set up a new financial goal"}
              </DialogDescription>
            </DialogHeader>
            <GoalForm
              categories={categories}
              initialData={editingGoal}
              onSubmit={editingGoal ? handleUpdateGoal : handleCreateGoal}
              onCancel={() => {
                setShowForm(false)
                setEditingGoal(null)
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  )
}