import { useState, useEffect } from "react";
import { Sparkles, FileImage, Loader2, CheckCircle, XCircle, Upload, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { getDrawings, uploadDrawing, updateDrawing } from "@/services/crmService";
import type { DrawingLog, BOQItem } from "@/types";

interface GenerateBOQDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onCreateBOQItems: (items: Partial<BOQItem>[]) => void;
}

export function GenerateBOQDialog({
  open,
  onOpenChange,
  projectId,
  onCreateBOQItems,
}: GenerateBOQDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"upload" | "processing" | "review">("upload");
  const [drawings, setDrawings] = useState<DrawingLog[]>([]);
  const [selectedDrawing, setSelectedDrawing] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [suggestions, setSuggestions] = useState<Partial<BOQItem>[]>([]);

  useEffect(() => {
    if (open && projectId) {
      loadDrawings();
    }
  }, [open, projectId]);

  const loadDrawings = async () => {
    try {
      const data = await getDrawings(projectId);
      setDrawings(data.filter(d => d.status === "uploaded" || d.status === "approved"));
    } catch (error) {
      console.error("Failed to load drawings:", error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      await uploadDrawing({
        projectId,
        title: file.name,
        description: "Auto-uploaded for BOQ generation",
        version: "1.0",
        file,
      });
      toast({ title: "Drawing uploaded successfully!" });
      await loadDrawings();
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload drawing",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleProcessDrawing = async () => {
    if (!selectedDrawing) return;

    try {
      setProcessing(true);
      setStep("processing");
      setProgress(0);

      // Simulate AI processing (in production, this would call actual AI service)
      const intervals = [20, 40, 60, 80, 100];
      for (const target of intervals) {
        await new Promise(resolve => setTimeout(resolve, 800));
        setProgress(target);
      }

      // Generate mock BOQ suggestions (in production, this would be from AI analysis)
      const mockSuggestions: Partial<BOQItem>[] = [
        {
          projectId,
          itemNo: "1.1",
          dpwhItemCode: "100-01",
          description: "Site Mobilization and Setup",
          category: "mobilization_demobilization",
          unit: "ls",
          quantity: 1,
          materialCost: 50000,
          laborCost: 17500,
          total: 67500,
        },
        {
          projectId,
          itemNo: "2.1",
          dpwhItemCode: "200-01",
          description: "Excavation for Foundation",
          category: "earthworks",
          unit: "cu_m",
          quantity: 45,
          materialCost: 0,
          laborCost: 67500,
          total: 67500,
        },
        {
          projectId,
          itemNo: "3.1",
          dpwhItemCode: "300-01",
          description: "Reinforced Concrete Footing",
          category: "substructure_foundation",
          unit: "cu_m",
          quantity: 12,
          materialCost: 180000,
          laborCost: 63000,
          total: 243000,
        },
        {
          projectId,
          itemNo: "4.1",
          dpwhItemCode: "400-01",
          description: "Portland Cement Type I",
          category: "concrete_works",
          unit: "bags",
          quantity: 200,
          materialCost: 100000,
          laborCost: 35000,
          total: 135000,
        },
        {
          projectId,
          itemNo: "5.1",
          dpwhItemCode: "500-01",
          description: "Deformed Steel Bars 16mm dia",
          category: "reinforcing_steel",
          unit: "kg",
          quantity: 1500,
          materialCost: 90000,
          laborCost: 31500,
          total: 121500,
        },
      ];

      setSuggestions(mockSuggestions);
      setStep("review");

      // Update drawing status
      await updateDrawing(selectedDrawing, {
        status: "approved",
      });

      toast({
        title: "Drawing processed successfully!",
        description: `Generated ${mockSuggestions.length} BOQ item suggestions`,
      });
    } catch (error) {
      toast({
        title: "Processing failed",
        description: "Failed to process drawing",
        variant: "destructive",
      });
      setStep("upload");
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateBOQItems = () => {
    onCreateBOQItems(suggestions);
    onOpenChange(false);
    setStep("upload");
    setSuggestions([]);
    setSelectedDrawing(null);
  };

  const handleRemoveSuggestion = (index: number) => {
    setSuggestions(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Generate BOQ from Drawings
          </DialogTitle>
          <DialogDescription>
            Upload CAD drawings and let AI analyze them to generate BOQ items automatically
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {step === "upload" && (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <FileImage className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">Upload Drawing File</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Supported formats: PDF, DWG, DXF, PNG, JPG
                </p>
                <label htmlFor="drawing-upload">
                  <Button asChild disabled={uploading}>
                    <span>
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Choose File
                        </>
                      )}
                    </span>
                  </Button>
                </label>
                <input
                  id="drawing-upload"
                  type="file"
                  accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {drawings.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Or select from existing drawings:</h4>
                  <ScrollArea className="h-[300px] border rounded-lg p-4">
                    <div className="space-y-2">
                      {drawings.map((drawing) => (
                        <div
                          key={drawing.id}
                          className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedDrawing === drawing.id
                              ? "border-primary bg-accent"
                              : "hover:bg-accent/50"
                          }`}
                          onClick={() => setSelectedDrawing(drawing.id)}
                        >
                          <div className="flex items-center gap-3">
                            <FileImage className="w-5 h-5 text-primary" />
                            <div>
                              <p className="font-medium">{drawing.fileName}</p>
                              <p className="text-xs text-muted-foreground">
                                Rev {drawing.revisionNumber} • {drawing.status}
                              </p>
                            </div>
                          </div>
                          {selectedDrawing === drawing.id && (
                            <CheckCircle className="w-5 h-5 text-primary" />
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleProcessDrawing}
                  disabled={!selectedDrawing || processing}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Process with AI
                </Button>
              </div>
            </div>
          )}

          {step === "processing" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <Loader2 className="w-16 h-16 animate-spin text-primary" />
              <div className="text-center space-y-2">
                <h3 className="font-semibold text-lg">Processing Drawing...</h3>
                <p className="text-sm text-muted-foreground">
                  AI is analyzing the drawing to extract quantities and dimensions
                </p>
              </div>
              <div className="w-full max-w-md">
                <Progress value={progress} className="h-2" />
                <p className="text-center text-sm text-muted-foreground mt-2">
                  {progress}% complete
                </p>
              </div>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Review AI Suggestions</h3>
                  <p className="text-sm text-muted-foreground">
                    {suggestions.length} BOQ items detected from drawing
                  </p>
                </div>
                <Badge variant="secondary" className="text-green-700 bg-green-100">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Processing Complete
                </Badge>
              </div>

              <ScrollArea className="h-[400px] border rounded-lg">
                <div className="p-4 space-y-2">
                  {suggestions.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {item.itemNo}
                          </Badge>
                          {item.dpwhItemCode && (
                            <Badge variant="secondary" className="text-xs">
                              {item.dpwhItemCode}
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.category} • {item.quantity} {item.unit}
                        </p>
                        <p className="text-sm font-semibold text-primary mt-1">
                          ₱{item.total?.toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSuggestion(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep("upload");
                    setSuggestions([]);
                    setSelectedDrawing(null);
                  }}
                >
                  Back
                </Button>
                <Button onClick={handleCreateBOQItems} disabled={suggestions.length === 0}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Create {suggestions.length} BOQ Items
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}