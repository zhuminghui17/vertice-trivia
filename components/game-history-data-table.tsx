'use client'

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, Clock, Trophy, Calendar } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { UserSessionParticipation } from "@/types/participation"
import { useUserTimezone } from "@/hooks/use-user-timezone"

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'completed':
      return 'default'
    case 'started':
      return 'secondary'
    case 'abandoned':
      return 'destructive'
    default:
      return 'secondary'
  }
}

const formatDuration = (seconds?: number) => {
  if (!seconds) return 'N/A'
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (minutes === 0) {
    return `${remainingSeconds}s`
  }
  
  return `${minutes}m ${remainingSeconds}s`
}

const createColumns = (
  formatTimestamp: (timestamp: string | Date, options?: any) => string
): ColumnDef<UserSessionParticipation>[] => [
  {
    accessorKey: "started_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <Calendar className="mr-2 h-4 w-4" />
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const startedAt = row.getValue("started_at") as string
      return (
        <div className="font-medium text-left">
          {formatTimestamp(startedAt, { 
            includeDate: true, 
            includeTime: false,
            includeSeconds: false,
            use12Hour: true
          })}
        </div>
      )
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return (
        <Badge variant={getStatusBadgeVariant(status)} className="capitalize">
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: "correct_answers",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <Trophy className="mr-2 h-4 w-4" />
          Score
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const correctAnswers = row.getValue("correct_answers") as number
      const totalQuestions = row.original.total_questions as number
      const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0
      
      return (
        <div className="text-center">
          <div className="font-medium">
            {correctAnswers}/{totalQuestions}
          </div>
          <div className="text-sm text-muted-foreground">
            {percentage}%
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "time_taken",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <Clock className="mr-2 h-4 w-4" />
          Duration
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const timeTaken = row.getValue("time_taken") as number | undefined
      return (
        <div className="text-center font-mono text-sm">
          {formatDuration(timeTaken)}
        </div>
      )
    },
  },
  {
    accessorKey: "completed_at",
    header: "Completed",
    cell: ({ row }) => {
      const completedAt = row.getValue("completed_at") as string | undefined
      const status = row.getValue("status") as string
      
      if (!completedAt || status !== 'completed') {
        return (
          <div className="text-sm text-muted-foreground">
            -
          </div>
        )
      }
      
      return (
        <div className="text-sm">
          {formatTimestamp(completedAt, { 
            includeDate: false, 
            includeTime: true,
            includeSeconds: false,
            use12Hour: true,
            includeTimezone: true
          })}
        </div>
      )
    },
  },
]

interface GameHistoryDataTableProps {
  data: UserSessionParticipation[]
}

export function GameHistoryDataTable({ data }: GameHistoryDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "started_at", desc: true } // Default sort by newest first
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  
  const { formatTimestamp } = useUserTimezone()
  const columns = createColumns(formatTimestamp)

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
    initialState: {
      pagination: {
        pageSize: 15,
      },
    },
  })

  const completedGames = data.filter(game => game.status === 'completed')
  const averageScore = completedGames.length > 0 
    ? Math.round(completedGames.reduce((sum, game) => 
        sum + (game.total_questions > 0 ? (game.correct_answers / game.total_questions) * 100 : 0), 0
      ) / completedGames.length)
    : 0

  return (
    <div className="w-full space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold">{data.length}</div>
          <div className="text-sm text-muted-foreground">Total Games</div>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold text-green-600">{completedGames.length}</div>
          <div className="text-sm text-muted-foreground">Completed</div>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold text-blue-600">{averageScore}%</div>
          <div className="text-sm text-muted-foreground">Avg Score</div>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold text-orange-600">
            {data.filter(g => g.status === 'started').length}
          </div>
          <div className="text-sm text-muted-foreground">In Progress</div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Filter by status..."
            value={(table.getColumn("status")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("status")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id.replace('_', ' ')}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Data Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="align-center"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="align-center py-4">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No game history found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          Showing {table.getRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} game(s).
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
} 