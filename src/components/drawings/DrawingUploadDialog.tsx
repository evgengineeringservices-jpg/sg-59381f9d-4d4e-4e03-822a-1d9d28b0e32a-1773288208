import { useState } from "react";
import { Upload, FileText, Image, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

interface DrawingUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onUploadComplete: (drawingId: string) => void;
}

export function DrawingUploadDialog({
  open,
  onOpenChange,
  projectId,
  onUploadComplete,
}: DrawingUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [drawingType, setDrawingType] = useState<string>("floor_plan");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const acceptedTypes = [".pdf", ".jpg", ".jpeg", ".png", ".dwg", ".dxf"];
  const maxSize = 20 * 1024 * 1024; // 20MB

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > maxSize) {
      setError("File size must be less than 20MB");
      return;
    }

    setFile(selectedFile);
    setError(null);
  }

  async function handleUpload() {
    if (!file || !projectId) return;

    try {
      setUploading(true);
      setUploadProgress(0);
      setError(null);

      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${projectId}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("project-documents")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setUploadProgress(50);

      // Create drawing record
      const { data: drawingData, error: drawingError } = await supabase
        .from("drawings")
        .insert({
          project_id: projectId,
          file_name: file.name,
          file_path: uploadData.path,
          file_size: file.size,
          file_type: file.type || `application/${fileExt}`,
          drawing_type: drawingType,
          status: "analyzing",
          description: description || null,
        })
        .select()
        .single();

      if (drawingError) throw drawingError;

      setUploadProgress(75);

      // Trigger AI analysis (simulated for now)
      setAnalyzing(true);
      await simulateAIAnalysis(drawingData.id);

      setUploadProgress(100);
      onUploadComplete(drawingData.id);
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || "Failed to upload drawing");
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  }

  async function simulateAIAnalysis(drawingId: string) {
    // Simulate AI processing time
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Update drawing status to needs_review
    await supabase
      .from("drawings")
      .update({
        status: "needs_review",
        extracted_data: {
          dimensions: {
            floor_area: 180,
            wall_length: 78,
            ceiling_height: 3.0,
          },
          rooms: ["Living Room", "Dining", "Kitchen", "3 Bedrooms", "2 Bathrooms"],
          materials_detected: [
            "Concrete",
            "CHB",
            "Steel Rebar",
            "Roofing Sheets",
            "Floor Tiles",
          ],
          estimated_quantities: {
            concrete: "45 cu.m",
            chb: "850 pcs",
            rebar: "2.5 tons",
          },
        },
      })
      .eq("id", drawingId);
  }

  function resetForm() {
    setFile(null);
    setDrawingType("floor_plan");
    setDescription("");
    setUploadProgress(0);
    setError(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload Drawing / CAD File</DialogTitle>
          <DialogDescription>
            Upload PDF, CAD files, or perspective images. AI will extract dimensions and
            suggest BOQ items.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file">Select File *</Label>
            <div className="flex gap-2">
              <Input
                id="file"
                type="file"
                accept={acceptedTypes.join(",")}
                onChange={handleFileChange}
                disabled={uploading}
              />
            </div>
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {file.type.includes("pdf") ? (
                  <FileText className="h-4 w-4" />
                ) : (
                  <Image className="h-4 w-4" />
                )}
                <span>{file.name}</span>
                <Badge variant="outline">{(file.size / 1024 / 1024).toFixed(2)} MB</Badge>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Accepted: PDF, JPG, PNG, DWG, DXF (Max 20MB)
            </p>
          </div>

          {/* Drawing Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Drawing Type *</Label>
            <select
              id="type"
              className="w-full border rounded-md p-2"
              value={drawingType}
              onChange={(e) => setDrawingType(e.target.value)}
              disabled={uploading}
            >
              <option value="floor_plan">Floor Plan</option>
              <option value="elevation">Elevation</option>
              <option value="section">Section</option>
              <option value="perspective">Perspective / 3D</option>
              <option value="structural">Structural Drawing</option>
              <option value="electrical">Electrical Plan</option>
              <option value="plumbing">Plumbing Plan</option>
              <option value="site_plan">Site Plan</option>
              <option value="detail">Detail Drawing</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about this drawing..."
              rows={2}
              disabled={uploading}
            />
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {analyzing ? "Analyzing drawing..." : "Uploading..."}
                </span>
                <span className="font-medium">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
              {analyzing && (
                <Alert>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertDescription>
                    AI is extracting dimensions and quantities. This may take a moment...
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* AI Features Info */}
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>AI will analyze:</strong> Dimensions, room sizes, material quantities,
              structural elements. You can review and edit before creating BOQ items.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload & Analyze
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}