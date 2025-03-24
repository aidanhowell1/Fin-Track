import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"

interface GoalCardProps {
  goal: {
    id: string
    name: string
    targetAmount: number
    currentAmount: number
    deadline?: Date | null
    priority: 'LOW' | 'MEDIUM' | 'HIGH'
    status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
    description?: string | null
  }
  onEdit?: (id: string) => void
  onAllocate?: (id: string) => void
}

const priorityColors = {
  LOW: "bg-blue-100 text-blue-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-red-100 text-red-800",
}

const statusColors = {
  ACTIVE: "bg-green-100 text-green-800",
  COMPLETED: "bg-gray-100 text-gray-800",
  CANCELLED: "bg-red-100 text-red-800",
}

export function GoalCard({ goal, onEdit, onAllocate }: GoalCardProps) {
  const progress = (goal.currentAmount / goal.targetAmount) * 100
  const remainingAmount = goal.targetAmount - goal.currentAmount
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{goal.name}</CardTitle>
            {goal.description && (
              <CardDescription>{goal.description}</CardDescription>
            )}
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className={priorityColors[goal.priority]}>
              {goal.priority}
            </Badge>
            <Badge variant="secondary" className={statusColors[goal.status]}>
              {goal.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Current Amount</p>
              <p className="font-medium">{formatCurrency(goal.currentAmount)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Target Amount</p>
              <p className="font-medium">{formatCurrency(goal.targetAmount)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Remaining</p>
              <p className="font-medium">{formatCurrency(remainingAmount)}</p>
            </div>
            {goal.deadline && (
              <div>
                <p className="text-muted-foreground">Deadline</p>
                <p className="font-medium">
                  {new Date(goal.deadline).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        {onEdit && goal.status === 'ACTIVE' && (
          <Button variant="outline" onClick={() => onEdit(goal.id)}>
            Edit Goal
          </Button>
        )}
        {onAllocate && goal.status === 'ACTIVE' && (
          <Button onClick={() => onAllocate(goal.id)}>
            Allocate Funds
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}