import { useState, useEffect } from "react";
import { CRMLayout } from "@/components/layout/CRMLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getProjects, getTasks, createTask, updateTask, deleteTask } from "@/services/crmService";
import { Plus, Search, Edit2, Trash2, AlertCircle, CheckCircle2, Clock, Edit, Sparkles, FolderKanban, Calendar, User, CheckSquare } from "lucide-react";
import type { Project, Task, TaskStatus, TaskPriority } from "@/types";

export default function TasksPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    projectId: "",
    phaseId: "",
    assignedTo: "",
    assignedRole: "",
    dueDate: "",
    priority: "medium" as TaskPriority,
    status: "todo" as TaskStatus,
    source: "manual" as "manual" | "auto_generated",
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const filtered = tasks.filter((task) => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
    setFilteredTasks(filtered);
  }, [searchQuery, statusFilter, tasks]);

  async function loadData() {
    try {
      const [projectsData, tasksData] = await Promise.all([
        getProjects(),
        getTasks(),
      ]);
      setProjects(projectsData);
      setTasks(tasksData);
      setFilteredTasks(tasksData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenDialog(task?: Task) {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title,
        description: task.description || "",
        projectId: task.projectId || "",
        phaseId: task.phaseId || "",
        assignedTo: task.assignedTo || "",
        assignedRole: task.assignedRole || "",
        dueDate: task.dueDate || "",
        priority: task.priority,
        status: task.status,
        source: task.source,
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: "",
        description: "",
        projectId: projects.length > 0 ? projects[0].id : "",
        phaseId: "",
        assignedTo: "",
        assignedRole: "",
        dueDate: "",
        priority: "medium",
        status: "todo",
        source: "manual",
      });
    }
    setDialogOpen(true);
  }

  async function handleSubmit() {
    try {
      if (editingTask) {
        await updateTask(editingTask.id, {
          ...formData,
          assignedRole: formData.assignedRole as any,
        } as Partial<Task>);
      } else {
        await createTask({
          ...formData,
          assignedRole: formData.assignedRole as any,
          estimatedCostImpact: null,
          estimatedProfitImpact: null,
          dependency: null,
        } as Omit<Task, "id" | "createdAt" | "updatedAt">);
      }
      setDialogOpen(false);
      loadData();
    } catch (error) {
      console.error("Error saving task:", error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteTask(id);
      loadData();
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  }

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case "todo": return "bg-gray-100 text-gray-700";
      case "in_progress": return "bg-blue-100 text-blue-700";
      case "blocked": return "bg-red-100 text-red-700";
      case "done": return "bg-green-100 text-green-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case "low": return "bg-gray-100 text-gray-700";
      case "medium": return "bg-yellow-100 text-yellow-700";
      case "high": return "bg-orange-100 text-orange-700";
      case "critical": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case "done": return CheckCircle2;
      case "blocked": return AlertCircle;
      default: return Clock;
    }
  };

  if (loading) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">Loading tasks...</div>
        </div>
      </CRMLayout>
    );
  }

  return (
    <CRMLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Tasks</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage project tasks and assignments
            </p>
          </div>
          <Button onClick={() => setShowDialog(true)} size="default" className="touch-manipulation">
            <Plus className="mr-2 w-4 h-4" />
            New Task
          </Button>
        </div>

        {/* Filters - Mobile Optimized with Horizontal Scroll */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 touch-manipulation"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-[140px] shrink-0 touch-manipulation">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px] shrink-0 touch-manipulation">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(TASK_STATUS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[130px] shrink-0 touch-manipulation">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                {Object.entries(TASK_PRIORITY).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tasks List - Mobile Optimized Card View */}
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base sm:text-lg truncate">{task.title}</h3>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(task)}
                        className="touch-manipulation h-9 w-9"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(task.id)}
                        className="touch-manipulation h-9 w-9"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Badges - Responsive */}
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={
                        task.status === "done"
                          ? "default"
                          : task.status === "in_progress"
                          ? "secondary"
                          : task.status === "blocked"
                          ? "destructive"
                          : "outline"
                      }
                    >
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {TASK_STATUS[task.status]}
                    </Badge>
                    <Badge
                      variant={
                        task.priority === "critical"
                          ? "destructive"
                          : task.priority === "high"
                          ? "default"
                          : "outline"
                      }
                    >
                      <PriorityIcon className="w-3 h-3 mr-1" />
                      {TASK_PRIORITY[task.priority]}
                    </Badge>
                    {task.source === "auto_generated" && (
                      <Badge variant="secondary">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Auto
                      </Badge>
                    )}
                  </div>

                  {/* Details Grid - Mobile Optimized */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    {task.projectId && (
                      <div className="flex items-center gap-2">
                        <FolderKanban className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="truncate">
                          {projects.find((p) => p.id === task.projectId)?.name || "Unknown Project"}
                        </span>
                      </div>
                    )}
                    {task.dueDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className={cn(
                          "truncate",
                          new Date(task.dueDate) < new Date() && task.status !== "done" && "text-destructive font-medium"
                        )}>
                          {new Date(task.dueDate).toLocaleDateString("en-PH", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                    {task.assignedTo && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="truncate">Assigned</span>
                      </div>
                    )}
                  </div>

                  {/* Quick Status Update - Mobile Only */}
                  <div className="sm:hidden flex gap-2 pt-2 border-t">
                    {task.status !== "done" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 touch-manipulation"
                        onClick={() => handleQuickStatusUpdate(task.id, "in_progress")}
                      >
                        Start
                      </Button>
                    )}
                    {task.status === "in_progress" && (
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1 touch-manipulation"
                        onClick={() => handleQuickStatusUpdate(task.id, "done")}
                      >
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTasks.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckSquare className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-center text-muted-foreground">
                {searchQuery || filterProject !== "all" || filterStatus !== "all"
                  ? "No tasks match your filters"
                  : "No tasks yet. Create your first task to get started."}
              </p>
            </CardContent>
          </Card>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTask ? "Edit Task" : "Create New Task"}</DialogTitle>
              <DialogDescription>
                {editingTask ? "Update task details" : "Add a new task"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Task Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Prepare Week 3 materials procurement"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Task details..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="projectId">Project *</Label>
                  <Select
                    value={formData.projectId}
                    onValueChange={(value) => setFormData({ ...formData, projectId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phaseId">Phase ID</Label>
                  <Input
                    id="phaseId"
                    value={formData.phaseId}
                    onChange={(e) => setFormData({ ...formData, phaseId: e.target.value })}
                    placeholder="Mobilization Phase ID"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assignedRole">Assigned Role</Label>
                  <Input
                    id="assignedRole"
                    value={formData.assignedRole}
                    onChange={(e) => setFormData({ ...formData, assignedRole: e.target.value })}
                    placeholder="Project Engineer"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date *</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority *</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value as TaskPriority })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as TaskStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                {editingTask ? "Update Task" : "Create Task"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </CRMLayout>
  );
}