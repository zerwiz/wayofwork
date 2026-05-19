import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from "@/components/ui/separator"
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { Component } from 'react'
import { useState } from 'react'
import { BookIcon, PenIcon, MoreHorizontalIcon, BellIcon, MenuIcon, SearchIcon, BellIcon as NotificationIcon, PlusIcon, XIcon, CalendarIcon, ChevronRightIcon, ClockIcon, AlertCircleIcon, CheckIcon, Hash } from 'lucide-react'

interface Task {
  id: string
  title: string
  description: string
  status: string
  tags: string[]
  author: User
  createdAt: string
}

interface User {
  id: string
  name: string
  avatar: {
    src?: string
    fallback?: string
  }
}

const users: User[] = [
  { id: '1', name: 'Alice Smith', avatar: { fallback: 'AS' } },
  { id: '2', name: 'Bob Jones', avatar: { fallback: 'BJ' } },
  { id: '3', name: 'Carol White', avatar: { fallback: 'CW' } },
  { id: '4', name: 'David Brown', avatar: { fallback: 'DB' } },
  { id: '5', name: 'Eve Davis', avatar: { fallback: 'ED' } },
]

const tasksData: Task[] = [
  {
    id: '1',
    title: 'Research Quantum Computing',
    description: 'Explore quantum algorithms and their potential applications in cryptography.',
    status: 'In Progress',
    tags: ['Quantum', 'Research'],
    author: users[0],
    createdAt: '2024-01-20T10:30:00Z',
  },
  {
    id: '2',
    title: 'Build Neural Network Model',
    description: 'Train a deep learning model to recognize astronomical patterns.',
    status: 'Review',
    tags: ['ML', 'Astronomy'],
    author: users[1],
    createdAt: '2024-01-15T14:20:00Z',
  },
  {
    id: '3',
    title: 'Analyze Dark Energy Data',
    description: 'Review latest observations on dark energy expansion rates.',
    status: 'Todo',
    tags: ['Cosmology', 'Data'],
    author: users[2],
    createdAt: '2024-01-22T09:15:00Z',
  },
  {
    id: '4',
    title: 'Review Peer-Reviewed Papers',
    description: 'Analyze recent publications on gravitational waves from LIGO.',
    status: 'Todo',
    tags: ['Physics', 'Review'],
    author: users[3],
    createdAt: '2024-01-30T16:45:00Z',
  },
  {
    id: '5',
    title: 'Write Science Popularization',
    description: 'Create a blog post explaining quantum entanglement for laypeople.',
    status: 'Todo',
    tags: ['Writing', 'Education'],
    author: users[4],
    createdAt: '2024-01-18T11:00:00Z',
  },
  {
    id: '6',
    title: 'Develop Physics Simulator',
    description: 'Create an interactive simulation of planetary orbits.',
    status: 'In Progress',
    tags: ['Simulation', 'Development'],
    author: users[0],
    createdAt: '2024-01-25T13:30:00Z',
  },
  {
    id: '7',
    title: 'Study String Theory',
    description: 'Research extra dimensional models and their experimental evidence.',
    status: 'Done',
    tags: ['Theoretical', 'Research'],
    author: users[1],
    createdAt: '2024-01-10T08:45:00Z',
  },
  {
    id: '8',
    title: 'Collaborate on Grant Application',
    description: 'Work with research team to prepare funding proposal.',
    status: 'In Progress',
    tags: ['Grant', 'Collaboration'],
    author: users[2],
    createdAt: '2024-02-01T10:00:00Z',
  },
  {
    id: '9',
    title: 'Present at Conference',
    description: 'Prepare presentation for international physics summit.',
    status: 'Todo',
    tags: ['Presentation', 'Events'],
    author: users[3],
    createdAt: '2024-01-27T14:30:00Z',
  },
  {
    id: '10',
    title: 'Optimize Algorithm',
    description: 'Improve computational efficiency of machine learning pipeline.',
    status: 'Review',
    tags: ['Optimization', 'ML'],
    author: users[4],
    createdAt: '2024-01-23T09:30:00Z',
  },
  {
    id: '11',
    title: 'Review Code Contribution',
    description: 'Audit pull request for new physics engine implementation.',
    status: 'Done',
    tags: ['Code Review', 'Engineering'],
    author: users[0],
    createdAt: '2024-01-12T11:30:00Z',
  },
  {
    id: '12',
    title: 'Document API',
    description: 'Write comprehensive documentation for physics engine API.',
    status: 'Done',
    tags: ['Documentation', 'API'],
    author: users[1],
    createdAt: '2024-01-08T08:00:00Z',
  },
  {
    id: '13',
    title: 'Setup Continuous Integration',
    description: 'Configure CI/CD pipeline for automated testing.',
    status: 'Done',
    tags: ['DevOps', 'Automation'],
    author: users[2],
    createdAt: '2024-01-05T16:00:00Z',
  },
  {
    id: '14',
    title: 'Conduct Code Review Session',
    description: 'Organize and facilitate code review for team members.',
    status: 'Done',
    tags: ['Mentoring', 'Code Review'],
    author: users[3],
    createdAt: '2024-01-03T09:00:00Z',
  },
  {
    id: '15',
    title: 'Mentor Junior Developer',
    description: 'Guide new team member on best practices and architecture.',
    status: 'In Progress',
    tags: ['Mentoring', 'Education'],
    author: users[4],
    createdAt: '2024-01-29T10:00:00Z',
  },
  {
    id: '16',
    title: 'Write Unit Tests',
    description: 'Add comprehensive test coverage for core modules.',
    status: 'Todo',
    tags: ['Testing', 'QA'],
    author: users[0],
    createdAt: '2024-01-31T14:00:00Z',
  },
  {
    id: '17',
    title: 'Refactor Legacy Code',
    description: 'Modernize old modules and remove technical debt.',
    status: 'Done',
    tags: ['Refactoring', 'Technical Debt'],
    author: users[1],
    createdAt: '2024-01-06T11:15:00Z',
  },
  {
    id: '18',
    title: 'Performance Testing',
    description: 'Run load tests and optimize bottlenecks.',
    status: 'Done',
    tags: ['Testing', 'Performance'],
    author: users[2],
    createdAt: '2024-01-07T15:30:00Z',
  },
  {
    id: '19',
    title: 'Setup Documentation Site',
    description: 'Create developer-facing documentation portal.',
    status: 'Done',
    tags: ['Documentation', 'Website'],
    author: users[3],
    createdAt: '2024-01-11T09:45:00Z',
  },
  {
    id: '20',
    title: 'Security Audit',
    description: 'Conduct thorough security assessment of the application.',
    status: 'Done',
    tags: ['Security', 'Audit'],
    author: users[4],
    createdAt: '2024-01-14T13:00:00Z',
  },
]

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  })
}

function getTagColor(tag: string): string {
  const colors = ['blue', 'green', 'yellow', 'purple', 'red', 'orange']
  const index = Math.abs(tag.length % colors.length)
  return colors[index]
}

interface TaskCardProps {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onOpenMore: (task: Task) => void
}

export function TaskCard({ task, onEdit, onDelete, onOpenMore }: TaskCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{task.title}</CardTitle>
            <CardDescription>{task.description}</CardDescription>
            <div className="mt-2 flex gap-2 flex-wrap">
              {task.tags.map((tag, index) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-current-foreground/
                  10 border text-current border-current text-"
                  style={{
                    backgroundColor: `var(--background-${getTagColor(tag)})/10`,
                    color: `var(--background-${getTagColor(tag)})`,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => onEdit(task)}>
              <PenIcon className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onOpenMore(task)}>
              <MoreHorizontalIcon className="h-4 w-4" />
              <span className="sr-only">More</span>
            </Button>
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-100" onClick={() => onDelete(task)}>
              <XIcon className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center text-sm text-gray-500">
            <CalendarIcon className="h-4 w-4 mr-2" />
            {formatDate(task.createdAt)}
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <ClockIcon className="h-4 w-4 mr-2" />
            {formatTime(task.createdAt)}
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Avatar className="h-5 w-5 mr-2">
              {task.author.avatar.src ? (
                <AvatarImage src={task.author.avatar.src} />
              ) : (
                <AvatarFallback>{task.author.avatar.fallback}</AvatarFallback>
              )}
            </Avatar>
            <span>{task.author.name}</span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Hash className="h-4 w-4 mr-2" />
            <span className="capitalize">{task.status}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Overview() {
  const [selectedTab, setSelectedTab] = useState<'todos' | 'todo' | 'in_progress' | 'done'>('todo')

  const filteredTasks = tasksData.filter(task =>
    task.status.toLowerCase() === selectedTab
  )

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b">
        <nav className="flex items-center px-4 sm:px-6">
          <Button variant="ghost" size="sm" className="-mt-2">
            <MenuIcon className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <div className="relative w-40 hidden sm:block max-w-[16rem]">
              <Input
                placeholder="Search tasks..."
                className="pr-8 text-sm"
              />
              <SearchIcon className="absolute right-2 top-2 h-4 w-4 text-muted-foreground" />
            </div>
            <Button variant="ghost" size="sm" className="relative">
              <NotificationIcon className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
            </Button>
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600">JD</span>
            </div>
          </div>
        </nav>
      </div>
      <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as any)}>
        <div className="flex border-b">
          <TabsList className="border-b-0">
            <TabsTrigger value="todos">
              <BookIcon className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Todos</span>
            </TabsTrigger>
            <TabsTrigger value="todo">
              <PenIcon className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">To Do</span>
            </TabsTrigger>
            <TabsTrigger value="in_progress">
              <ClockIcon className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">In Progress</span>
            </TabsTrigger>
            <TabsTrigger value="done">
              <CheckIcon className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Done</span>
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="todos">
          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
              <CardDescription>
                All tasks across various statuses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-280px)] -mr-4">
                <div className="pr-4">
                  {filteredTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={(t) => console.log('Edit task:', t)}
                      onDelete={(t) => console.log('Delete task:', t)}
                      onOpenMore={(t) => console.log('Open more for task:', t)}
                    />
                  ))}
                  {filteredTasks.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No todos found
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="todo">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>My Tasks</CardTitle>
                  <CardDescription>
                    Tasks created by me
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {tasksData.filter(t => t.author.id === '1').map(task => (
                    <div key={task.id} className="flex items-start space-x-2 p-2 rounded-md hover:bg-accent/50 cursor-pointer transition-colors">
                      <Avatar className="h-8 w-8">
                        {task.author.avatar.src ? (
                          <AvatarImage src={task.author.avatar.src} />
                        ) : (
                          <AvatarFallback>{task.author.avatar.fallback}</AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1 truncate">
                          {task.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {task.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {task.tags.slice(0, 2).map(tag => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs border"
                              style={{
                                backgroundColor: `var(--background-${getTagColor(tag)})/10`,
                                color: `var(--background-${getTagColor(tag)})`,
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-muted-foreground">
                        <ChevronRightIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {tasksData.filter(t => t.author.id === '1').length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      No tasks yet
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full">
                        <PlusIcon className="h-4 w-4 mr-2" />
                        New Task
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Task</DialogTitle>
                        <DialogDescription>
                          Add a new task to your list
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="title">Title</Label>
                          <Input id="title" placeholder="Enter task title..." />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea id="description" placeholder="Enter task description..." />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tags">Tags</Label>
                          <Input id="tags" placeholder="comma-separated tags" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit">Create Task</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>
            </div>
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Active Tasks</CardTitle>
                  <CardDescription>
                    Tasks in progress or needing attention
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-200px)] -mr-4">
                    <div className="pr-4 space-y-4">
                      {tasksData.filter(t => ['todo', 'in_progress'].includes(t.status)).map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onEdit={(t) => console.log('Edit task:', t)}
                          onDelete={(t) => console.log('Delete task:', t)}
                          onOpenMore={(t) => console.log('Open more for task:', t)}
                        />
                      ))}
                      {tasksData.filter(t => ['todo', 'in_progress'].includes(t.status)).length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          No active tasks
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="in_progress">
          <Card>
            <CardHeader>
              <CardTitle>In Progress</CardTitle>
              <CardDescription>
                Tasks currently being worked on
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-200px)] -mr-4">
                <div className="pr-4 space-y-4">
                  {tasksData.filter(t => t.status === 'In Progress').map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={(t) => console.log('Edit task:', t)}
                      onDelete={(t) => console.log('Delete task:', t)}
                      onOpenMore={(t) => console.log('Open more for task:', t)}
                    />
                  ))}
                  {tasksData.filter(t => t.status === 'In Progress').length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No in-progress tasks
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="done">
          <Card>
            <CardHeader>
              <CardTitle>Completed</CardTitle>
              <CardDescription>
                Finished tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-200px)] -mr-4">
                <div className="pr-4 space-y-4">
                  {tasksData.filter(t => t.status === 'Done').map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={(t) => console.log('Edit task:', t)}
                      onDelete={(t) => console.log('Delete task:', t)}
                      onOpenMore={(t) => console.log('Open more for task:', t)}
                    />
                  ))}
                  {tasksData.filter(t => t.status === 'Done').length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No completed tasks
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
