import type { Project, Lead, BOQItem, Task, PlanningPhase } from "@/types";

/**
 * Export Projects to Excel
 */
export async function exportProjectsToExcel(projects: Project[]) {
  const XLSX = await import("xlsx");
  
  const worksheetData = [
    ["PROJECTS REPORT"],
    [`Generated: ${new Date().toLocaleString()}`],
    [],
    ["Project Name", "Client", "Type", "Status", "Location", "Contract Amount", "Budget", "Spent", "Progress", "Start Date", "End Date", "Permit Status"],
    ...projects.map(p => [
      p.name,
      p.client,
      p.projectType,
      p.status,
      p.location,
      p.contractAmount,
      p.budget,
      p.spent,
      `${p.progress}%`,
      p.startDate,
      p.endDate || "N/A",
      p.permitStatus,
    ]),
  ];
  
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Projects");
  
  XLSX.writeFile(workbook, `projects-${Date.now()}.xlsx`);
}

/**
 * Export Leads to Excel
 */
export async function exportLeadsToExcel(leads: Lead[]) {
  const XLSX = await import("xlsx");
  
  const worksheetData = [
    ["LEADS REPORT"],
    [`Generated: ${new Date().toLocaleString()}`],
    [],
    ["Name", "Email", "Phone", "Company", "Project Type", "Budget Range", "Location", "Status", "Source", "Date"],
    ...leads.map(l => [
      l.name,
      l.email,
      l.phone || "N/A",
      l.company || "N/A",
      l.projectType,
      l.budgetRange || "N/A",
      l.location || "N/A",
      l.status,
      l.source || "N/A",
      new Date(l.createdAt).toLocaleDateString(),
    ]),
  ];
  
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
  
  XLSX.writeFile(workbook, `leads-${Date.now()}.xlsx`);
}

/**
 * Export BOQ to Excel
 */
export async function exportBOQToExcel(items: BOQItem[], projectName: string) {
  const XLSX = await import("xlsx");
  
  const totalMaterial = items.reduce((sum, item) => sum + (item.materialCost * item.quantity), 0);
  const totalLabor = items.reduce((sum, item) => sum + (item.laborCost * item.quantity), 0);
  const grandTotal = totalMaterial + totalLabor;
  
  const worksheetData = [
    ["BILL OF QUANTITIES"],
    [`Project: ${projectName}`],
    [`Generated: ${new Date().toLocaleString()}`],
    [],
    ["Item No", "DPWH Code", "Description", "Category", "Unit", "Quantity", "Unit Cost", "Material Cost", "Labor Cost", "Total"],
    ...items.map(item => [
      item.itemNo,
      item.dpwhItemCode || "N/A",
      item.description,
      item.category,
      item.unit,
      item.quantity,
      item.unitCost,
      item.materialCost * item.quantity,
      item.laborCost * item.quantity,
      item.total,
    ]),
    [],
    ["", "", "", "", "", "", "", "TOTAL MATERIAL:", totalMaterial],
    ["", "", "", "", "", "", "", "TOTAL LABOR:", totalLabor],
    ["", "", "", "", "", "", "", "GRAND TOTAL:", grandTotal],
  ];
  
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "BOQ");
  
  XLSX.writeFile(workbook, `boq-${Date.now()}.xlsx`);
}

/**
 * Export Tasks to Excel
 */
export async function exportTasksToExcel(tasks: Task[]) {
  const XLSX = await import("xlsx");
  
  const worksheetData = [
    ["TASKS REPORT"],
    [`Generated: ${new Date().toLocaleString()}`],
    [],
    ["Title", "Project", "Phase", "Priority", "Status", "Due Date", "Assigned To", "Assigned Role"],
    ...tasks.map(t => [
      t.title,
      t.projectId || "N/A",
      t.phaseId || "N/A",
      t.priority,
      t.status,
      t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "N/A",
      t.assignedTo || "Unassigned",
      t.assignedRole || "N/A",
    ]),
  ];
  
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");
  
  XLSX.writeFile(workbook, `tasks-${Date.now()}.xlsx`);
}

/**
 * Print element as document
 */
export function printElement(elementId: string, title: string) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f4f4f4; }
          h1 { margin-bottom: 10px; }
          .print-header { margin-bottom: 20px; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>${title}</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
        ${element.innerHTML}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            }
          }
        </script>
      </body>
    </html>
  `);
  
  printWindow.document.close();
}

/**
 * Export Market Prices to Excel
 */
export async function exportMarketPricesToExcel(items: any[]) {
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.json_to_sheet(items);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Market Prices");
  XLSX.writeFile(workbook, `market-prices-${Date.now()}.xlsx`);
}

/**
 * Export Billing to Excel
 */
export async function exportBillingToExcel(items: any[], projectName: string = "Project") {
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.json_to_sheet(items);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Billing");
  XLSX.writeFile(workbook, `billing-${Date.now()}.xlsx`);
}

/**
 * Export Weekly Logistics to Excel
 */
export async function exportWeeklyLogisticsToExcel(items: any[], projectName: string = "Project") {
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.json_to_sheet(items);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Logistics");
  XLSX.writeFile(workbook, `logistics-${Date.now()}.xlsx`);
}

/**
 * Print BOQ Helper
 */
export function printBOQ(items: any[], projectName: string) {
  // Simple fallback that prints the current window view for BOQ
  window.print();
}