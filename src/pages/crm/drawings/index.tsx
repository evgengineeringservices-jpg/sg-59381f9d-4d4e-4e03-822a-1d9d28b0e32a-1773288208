import { useState, useEffect } from "react";
import { Upload, FileText, Image, Download, Trash2, CheckCircle, Plus, Eye, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getProjects, createBOQItem } from "@/services/crmService";
import { DrawingUploadDialog } from "@/components/drawings/DrawingUploadDialog";
import { AIBOQSuggestions } from "@/components/drawings/AIBOQSuggestions";
import type { Project, BOQItem } from "@/types";

export default function DrawingsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [drawings, setDrawings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [currentDrawingId, setCurrentDrawingId] = useState("");
  const [extractedData, setExtractedData] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadDrawings();
    }
  }, [selectedProject]);

  async function loadProjects() {
    try {
      const data = await getProjects();
      setProjects(data);
      if (data.length > 0 && !selectedProject) {
        setSelectedProject(data[0].id);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive",
      });
    }
  }

  async function loadDrawings() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("drawings")
        .select("*")
        .eq("project_id", selectedProject)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDrawings(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load drawings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this drawing?")) return;

    try {
      const { error } = await supabase.from("drawings").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Drawing deleted successfully" });
      loadDrawings();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete drawing",
        variant: "destructive",
      });
    }
  }

  function handleUploadComplete(drawingId: string) {
    toast({
      title: "Drawing uploaded",
      description: "AI is analyzing the file for BOQ suggestions.",
    });
    loadDrawings();
  }

  function handleReviewAI(drawingId: string, data: any) {
    setCurrentDrawingId(drawingId);
    setExtractedData(data);
    setSuggestionsOpen(true);
  }

  async function handleCreateBOQFromAI(items: Partial<BOQItem>[]) {
    try {
      for (const item of items) {
        await createBOQItem({
          ...item,
          projectId: selectedProject,
        });
      }

      // Update drawing status
      await supabase
        .from("drawings")
        .update({ status: "processed" })
        .eq("id", currentDrawingId);

      toast({
        title: "Success",
        description: `Created ${items.length} BOQ items successfully`,
      });
      loadDrawings();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create BOQ items",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">CAD & Drawings</h1>
          <p className="text-muted-foreground mt-1">
            Upload floor plans and use AI to automatically generate BOQ estimations
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)} disabled={!selectedProject}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Drawing
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="max-w-md">
            <label className="text-sm font-medium mb-2 block">Select Project</label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a project" />
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
        </CardContent>
      </Card>

      {selectedProject && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drawings.length === 0 && !loading && (
            <div className="col-span-full text-center py-12 bg-accent/30 rounded-lg border border-dashed">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No drawings uploaded</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                Upload CAD files, PDFs, or images. Our AI will analyze dimensions and automatically suggest BOQ items for your project.
              </p>
              <Button onClick={() => setUploadOpen(true)} className="mt-4">
                Upload First Drawing
              </Button>
            </div>
          )}

          {drawings.map((drawing) => (
            <Card key={drawing.id} className="overflow-hidden">
              <div className="h-32 bg-accent/50 flex items-center justify-center border-b">
                {drawing.file_type?.includes("pdf") ? (
                  <FileText className="h-12 w-12 text-muted-foreground" />
                ) : (
                  <Image className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 truncate">
                    <CardTitle className="text-base truncate" title={drawing.file_name}>
                      {drawing.file_name}
                    </CardTitle>
                    <CardDescription className="uppercase mt-1">
                      {drawing.drawing_type.replace("_", " ")}
                    </CardDescription>
                  </div>
                  {drawing.status === "analyzing" && (
                    <Badge variant="secondary" className="animate-pulse">Analyzing...</Badge>
                  )}
                  {drawing.status === "needs_review" && (
                    <Badge variant="default" className="bg-amber-500">AI Ready</Badge>
                  )}
                  {drawing.status === "processed" && (
                    <Badge variant="outline" className="text-green-600 border-green-600">Processed</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground mb-4">
                  <p>Uploaded: {new Date(drawing.created_at).toLocaleDateString()}</p>
                  <p>Size: {(drawing.file_size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                
                <div className="flex flex-col gap-2">
                  {drawing.status === "needs_review" && (
                    <Button 
                      className="w-full bg-primary" 
                      onClick={() => handleReviewAI(drawing.id, drawing.extracted_data)}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Review AI BOQ Suggestions
                    </Button>
                  )}
                  
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button variant="ghost" className="text-destructive" onClick={() => handleDelete(drawing.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DrawingUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        projectId={selectedProject}
        onUploadComplete={handleUploadComplete}
      />

      <AIBOQSuggestions
        open={suggestionsOpen}
        onOpenChange={setSuggestionsOpen}
        drawingId={currentDrawingId}
        extractedData={extractedData}
        onCreateBOQItems={handleCreateBOQFromAI}
      />
    </div>
  );
}