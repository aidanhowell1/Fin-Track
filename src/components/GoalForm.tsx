import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { CalendarIcon } from "@radix-ui/react-icons"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  targetAmount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Target amount must be a positive number",
  }),
  deadline: z.date().optional(),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  autoAllocate: z.boolean().default(false),
  allocateAmount: z.string().optional(),
  allocateType: z.enum(["PERCENTAGE", "FIXED"]).optional(),
  categoryId: z.string().optional(),
})

interface GoalFormProps {
  categories: { id: string; name: string }[]
  initialData?: any
  onSubmit: (data: any) => void
  onCancel: () => void
}

export function GoalForm({ categories, initialData, onSubmit, onCancel }: GoalFormProps) {
  const [showAllocationFields, setShowAllocationFields] = useState(
    initialData?.autoAllocate || false
  )

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      targetAmount: initialData?.targetAmount?.toString() || "",
      deadline: initialData?.deadline ? new Date(initialData.deadline) : undefined,
      description: initialData?.description || "",
      priority: initialData?.priority || "MEDIUM",
      autoAllocate: initialData?.autoAllocate || false,
      allocateAmount: initialData?.allocateAmount?.toString() || "",
      allocateType: initialData?.allocateType || "FIXED",
      categoryId: initialData?.categoryId || undefined,
    },
  })

  function handleSubmit(values: z.infer<typeof formSchema>) {
    onSubmit({
      ...values,
      targetAmount: Number(values.targetAmount),
      allocateAmount: values.allocateAmount ? Number(values.allocateAmount) : undefined,
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Goal Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter goal name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="targetAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Amount</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="0.00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="deadline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deadline (Optional)</FormLabel>
              <FormControl>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category (Optional)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter goal description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="autoAllocate"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Automatic Allocation</FormLabel>
                <FormDescription>
                  Automatically allocate funds to this goal
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked)
                    setShowAllocationFields(checked)
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {showAllocationFields && (
          <>
            <FormField
              control={form.control}
              name="allocateType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Allocation Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select allocation type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="FIXED">Fixed Amount</SelectItem>
                      <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allocateAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {form.watch("allocateType") === "PERCENTAGE"
                      ? "Percentage to Allocate"
                      : "Amount to Allocate"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step={form.watch("allocateType") === "PERCENTAGE" ? "1" : "0.01"}
                      placeholder={
                        form.watch("allocateType") === "PERCENTAGE" ? "10" : "0.00"
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {initialData ? "Update Goal" : "Create Goal"}
          </Button>
        </div>
      </form>
    </Form>
  )
}