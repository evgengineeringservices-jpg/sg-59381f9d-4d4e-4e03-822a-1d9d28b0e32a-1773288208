import React, { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { CRMLayout } from "@/components/layout/CRMLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getEstimates, createEstimateProject, type EstimateProject } from "@/services/estimateService";
import { FileSpreadsheet, Plus, MapPin, Calendar, ArrowRight } from "lucide-react";
import { format } from "date-fns";

export default function EstimatesDashboard() {
  const [estimates, setEstimates] = useState<EstimateProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // New estimate form
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    loadEstimates();
  }, []);

  const loadEstimates = async () => {
    try {
      const data = await getEstimates();
      setEstimates(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load estimates", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEstimate = async () => {
    if (!title) {
      toast({ title: "Required", description: "Project Title is required", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    try {
      const newEstimate = await createEstimateProject(title, location);
      toast({ title: "Success", description: "Workbook generated perfectly!" });
      router.push(`/crm/estimates/${newEstimate.id}`);
    } catch (error) {
      toast({ title: "Error", description: "Failed to create estimate", variant: "destructive" });
      setIsCreating(false);
    }
  };

  return (
    <CRMLayout>
      <Head>
        <title>Estimates Workbook | Softgen CRM</title>
      </Head>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <FileSpreadsheet className="mr-3 h-8 w-8 text-primary" />
            Estimates Workbook
          </h1>
          <p className="text-muted-foreground mt-2">Create and manage your DUPA-based construction estimates.</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Estimate
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Projects</CardTitle>
          <CardDescription>All your initialized estimate workbooks.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading workbooks...</div>
          ) : estimates.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
              <FileSpreadsheet className="mx-auto h-12 w-12 opacity-20 mb-4" />
              <p>No estimates found.</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowCreateDialog(true)}>
                Start Your First Estimate
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Title</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estimates.map((est) => (
                  <TableRow key={est.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => router.push(`/crm/estimates/${est.id}`)}>
                    <TableCell className="font-medium">{est.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="h-3 w-3 mr-1" />
                        {est.location || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="h-3 w-3 mr-1" />
                        {format(new Date(est.created_at), "MMM d, yyyy")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                        {est.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Open <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Initialize New Estimate Workbook</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Project Title</Label>
              <Input 
                id="title" 
                placeholder="e.g. 2-Storey Residential Building" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Project Location</Label>
              <Input 
                id="location" 
                placeholder="e.g. Quezon City, Metro Manila" 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md mt-2 flex items-start">
              <FileSpreadsheet className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <p>This will generate a new DUPA workbook instantly preloaded with all standard Civil, Plumbing, and Electrical items ready for your quantity inputs.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateEstimate} disabled={isCreating}>
              {isCreating ? "Generating Workbook..." : "Create Workbook"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CRMLayout>
  );
}