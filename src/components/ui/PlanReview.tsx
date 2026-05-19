import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Re-export badge variants from Badge component
import { Badge, badgeVariants, BadgeVariants } from './Badge';
import { Button } from './Button';
import { Card } from './Card';

// Define component types
export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

function Tabs({ className, defaultValue = 'overview', onValueChange, ...props }: TabsProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('w-full', className)} {...props} />
  );
}

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

function TabsList({ className, ...props }: TabsListProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground',
        className
      )}
      {...props}
    />
  );
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

function TabsTrigger({ className, value, ...props }: TabsTriggerProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow',
        className
      )}
      data-value={value}
      {...props}
    />
  );
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
}

function TabsContent({ className, value, ...props }: TabsContentProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-tab-value={value} className={cn('ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', className)} {...props} />
  );
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

function Input({ className, type = 'text', ...props }: InputProps & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      type={type}
      {...props}
    />
  );
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

function Textarea({ className, ...props }: TextareaProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y',
        className
      )}
      {...props}
    />
  );
}

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal' | null;
}

function ScrollArea({ className, children, orientation = 'vertical', ...props }: ScrollAreaProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('relative overflow-hidden', className)} {...props}>
      {children}
      {orientation === 'vertical' && (
        <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
      )}
      {orientation === 'horizontal' && (
        <div className="absolute left-0 top-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      )}
    </div>
  );
}

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

function Label({ className, htmlFor, ...props }: LabelProps & React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70', className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, Input, Textarea, ScrollArea, Label };

export type Task = {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  tags: string[];
  author: {
    id: string;
    name: string;
    avatar: {
      src: string;
      fallback: string;
    };
  };
  createdAt: string;
};

export type User = {
  id: string;
  name: string;
  avatar: {
    src: string;
    fallback: string;
  };
};

const users: User[] = [
  { id: '1', name: 'Alex Morgan', avatar: { src: '/avatars/alex.jpg', fallback: 'AM' } },
  { id: '2', name: 'Jordan Lee', avatar: { src: '/avatars/jordan.jpg', fallback: 'JL' } },
  { id: '3', name: 'Sam Wilson', avatar: { src: '/avatars/sam.jpg', fallback: 'SW' } },
];

const taskData: Task[] = [
  {
    id: '1',
    title: 'Design System Audit',
    description: 'Review and update the existing design system components',
    status: 'in-progress',
    tags: ['design', 'ui', 'system'],
    author: { id: '1', name: 'Alex Morgan', avatar: { src: '/avatars/alex.jpg', fallback: 'AM' } },
    createdAt: '2024-01-15T09:30:00Z',
  },
  {
    id: '2',
    title: 'Accessibility Testing',
    description: 'Run automated accessibility tests on all components',
    status: 'pending',
    tags: ['a11y', 'testing', 'audit'],
    author: { id: '2', name: 'Jordan Lee', avatar: { src: '/avatars/jordan.jpg', fallback: 'JL' } },
    createdAt: '2024-01-15T10:15:00Z',
  },
  {
    id: '3',
    title: 'Documentation Update',
    description: 'Update component documentation with new patterns',
    status: 'completed',
    tags: ['docs', 'maintenance'],
    author: { id: '3', name: 'Sam Wilson', avatar: { src: '/avatars/sam.jpg', fallback: 'SW' } },
    createdAt: '2024-01-14T14:20:00Z',
  },
];

const MOCK_PLAN_ID = 'plan_2NwX4k9mPq7';

const mockPlanId = MOCK_PLAN_ID;

// Badge variant for priority levels
const priorityVariants = cva('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', {
  variants: {
    variant: {
      high: 'border-transparent bg-red-100 text-red-800',
      medium: 'border-transparent bg-yellow-100 text-yellow-800',
      low: 'border-transparent bg-green-100 text-green-800',
    },
  },
  defaultVariants: {
    variant: 'low',
  },
});

// Export priority badge component with correct variant types
export function PriorityBadge({ className, variant = 'low', ...props }: { variant: 'high' | 'medium' | 'low' } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(priorityVariants({ variant }), className)} {...props} />;
}

export function PlanReview() {
  const [selectedTab, setSelectedTab] = React.useState<'overview' | 'tasks' | 'participants'>('overview');
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <div className="p-6 border-b border-border">
        <h2 className="text-2xl font-bold tracking-tight">Plan Review</h2>
        <p className="text-muted-foreground mt-1">Review and manage your project plan</p>
      </div>

      <Tabs defaultValue={selectedTab} onValueChange={(v) => setSelectedTab(v as "overview" | "tasks" | "participants")} className="p-6">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="participants">Participants</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6">
              <h3 className="text-sm font-medium text-muted-foreground">Total Tasks</h3>
              <p className="text-3xl font-bold mt-2">{taskData.length}</p>
            </Card>
            <Card className="p-6">
              <h3 className="text-sm font-medium text-muted-foreground">Pending</h3>
              <p className="text-3xl font-bold mt-2">{taskData.filter(t => t.status === 'pending').length}</p>
            </Card>
            <Card className="p-6">
              <h3 className="text-sm font-medium text-muted-foreground">Completed</h3>
              <p className="text-3xl font-bold mt-2">{taskData.filter(t => t.status === 'completed').length}</p>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {taskData.slice(-3).reverse().map(task => (
                <div key={task.id} className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    {task.author.avatar.fallback}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{task.description}</p>
                  </div>
                  <Badge variant={task.status === 'completed' ? 'default' : task.status === 'in-progress' ? 'secondary' : 'muted'}>
                    {task.status}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          {taskData.map(task => (
            <Card key={task.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    {task.author.avatar.fallback}
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold">{task.title}</h4>
                    <p className="text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {task.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                      <PriorityBadge variant={task.tags.includes('urgent') ? 'high' : task.tags.includes('important') ? 'medium' : 'low'}>
                        Priority
                      </PriorityBadge>
                    </div>
                  </div>
                </div>
                <Badge variant={task.status === 'completed' ? 'default' : task.status === 'in-progress' ? 'secondary' : 'muted'}>
                  {task.status}
                </Badge>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <div className="text-sm text-muted-foreground">
                  Created by <span className="font-medium">{task.author.name}</span> on {new Date(task.createdAt).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                  <Button variant="destructive" size="sm">
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="participants" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Team Members</h3>
              <Button size="sm">
                Add Member
              </Button>
            </div>

            <div className="space-y-4">
              {users.map(user => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold">
                      {user.avatar.fallback}
                    </div>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">Product Designer</p>
                    </div>
                  </div>
                  <Badge variant="default" className="text-xs">Active</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Project Information</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input id="project-name" defaultValue="Design System Audit" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-description">Description</Label>
                <Textarea id="project-description" rows={3} defaultValue="Comprehensive audit and update of all design system components" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-status">Status</Label>
                <Input id="project-status" defaultValue="In Progress" />
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="p-6 border-t border-border text-center text-sm text-muted-foreground">
        Plan ID: <code className="bg-muted px-2 py-1 rounded">{mockPlanId}</code>
      </div>
    </Card>
  );
}

export default PlanReview;
