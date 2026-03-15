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
 * Export BOQ to Excel with DUPA Format
 * Follows standard Detailed Unit Price Analysis format
 */
export async function exportBOQToExcel(items: BOQItem[], projectName: string) {
  const XLSX = await import("xlsx");
  
  // Group items by category for DUPA format
  const categories = [...new Set(items.map(item => item.category))];
  const worksheetData: any[][] = [
    ["DETAILED UNIT PRICE ANALYSIS (DUPA)"],
    [`Project: ${projectName}`],
    [`Date Generated: ${new Date().toLocaleDateString()}`],
    [],
    ["BILL OF QUANTITIES WITH COST BREAKDOWN"],
    [],
  ];

  let grandTotalMaterial = 0;
  let grandTotalLabor = 0;
  let grandTotalEquipment = 0;
  let grandTotal = 0;

  categories.forEach(category => {
    const categoryItems = items.filter(item => item.category === category);
    
    // Category header
    worksheetData.push([`CATEGORY: ${category.toUpperCase()}`]);
    worksheetData.push([
      "Item No",
      "DUPA Code",
      "Description",
      "Unit",
      "Quantity",
      "Material Cost/Unit",
      "Labor Cost/Unit",
      "Equipment Cost/Unit",
      "Unit Cost",
      "Total Material",
      "Total Labor",
      "Total Equipment",
      "Total Amount"
    ]);

    let categoryMaterial = 0;
    let categoryLabor = 0;
    let categoryEquipment = 0;
    let categoryTotal = 0;

    categoryItems.forEach(item => {
      const totalMaterial = item.materialCost * item.quantity;
      const totalLabor = item.laborCost * item.quantity;
      const totalEquipment = (item.equipmentCost || 0) * item.quantity;
      const itemTotal = item.total;

      worksheetData.push([
        item.itemNo,
        item.dpwhItemCode || "CUSTOM",
        item.description,
        item.unit,
        item.quantity,
        item.materialCost,
        item.laborCost,
        item.equipmentCost || 0,
        item.unitCost,
        totalMaterial,
        totalLabor,
        totalEquipment,
        itemTotal,
      ]);

      categoryMaterial += totalMaterial;
      categoryLabor += totalLabor;
      categoryEquipment += totalEquipment;
      categoryTotal += itemTotal;
    });

    // Category subtotal
    worksheetData.push([
      "", "", `SUBTOTAL - ${category.toUpperCase()}`, "", "",
      "", "", "", "",
      categoryMaterial,
      categoryLabor,
      categoryEquipment,
      categoryTotal
    ]);
    worksheetData.push([]);

    grandTotalMaterial += categoryMaterial;
    grandTotalLabor += categoryLabor;
    grandTotalEquipment += categoryEquipment;
    grandTotal += categoryTotal;
  });

  // Grand totals section
  worksheetData.push([]);
  worksheetData.push(["COST SUMMARY"]);
  worksheetData.push(["Description", "Amount (PHP)"]);
  worksheetData.push(["Total Material Cost", grandTotalMaterial]);
  worksheetData.push(["Total Labor Cost", grandTotalLabor]);
  worksheetData.push(["Total Equipment Cost", grandTotalEquipment]);
  worksheetData.push(["DIRECT COST", grandTotal]);
  worksheetData.push([]);
  worksheetData.push(["Indirect Costs (15%)", grandTotal * 0.15]);
  worksheetData.push(["Contractor's Profit (10%)", grandTotal * 0.10]);
  worksheetData.push(["VAT (12%)", grandTotal * 0.12]);
  worksheetData.push([]);
  worksheetData.push(["TOTAL PROJECT COST", grandTotal * 1.37]);

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 8 },   // Item No
    { wch: 12 },  // DUPA Code
    { wch: 40 },  // Description
    { wch: 8 },   // Unit
    { wch: 10 },  // Quantity
    { wch: 15 },  // Material Cost/Unit
    { wch: 15 },  // Labor Cost/Unit
    { wch: 15 },  // Equipment Cost/Unit
    { wch: 12 },  // Unit Cost
    { wch: 15 },  // Total Material
    { wch: 15 },  // Total Labor
    { wch: 15 },  // Total Equipment
    { wch: 15 },  // Total Amount
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "DUPA-BOQ");
  
  XLSX.writeFile(workbook, `DUPA-BOQ-${projectName}-${Date.now()}.xlsx`);
}

/**
 * Export DUPA Items Library to Excel
 */
export async function exportDUPALibraryToExcel(dupaItems: any[]) {
  const XLSX = await import("xlsx");
  
  const worksheetData: any[][] = [
    ["DUPA LIBRARY - STANDARD WORK ITEMS"],
    [`Generated: ${new Date().toLocaleDateString()}`],
    [],
    ["MASTER LIST"],
    ["Item Code", "Description", "Category", "Unit", "Base Unit Cost", "Status", "Notes"],
    ...dupaItems.map(item => [
      item.itemCode,
      item.description,
      item.category,
      item.unit,
      item.baseUnitCost,
      item.isActive ? "Active" : "Inactive",
      item.notes || "",
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  worksheet['!cols'] = [
    { wch: 12 },
    { wch: 50 },
    { wch: 20 },
    { wch: 10 },
    { wch: 15 },
    { wch: 10 },
    { wch: 30 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "DUPA Library");
  
  XLSX.writeFile(workbook, `DUPA-Library-${Date.now()}.xlsx`);
}

/**
 * Export DUPA Item with Full Analysis to Excel
 */
export async function exportDUPAItemAnalysis(dupaItem: any) {
  const XLSX = await import("xlsx");
  
  const worksheetData: any[][] = [
    ["DETAILED UNIT PRICE ANALYSIS"],
    [`Item Code: ${dupaItem.itemCode}`],
    [`Description: ${dupaItem.description}`],
    [`Unit: ${dupaItem.unit}`],
    [`Category: ${dupaItem.category}`],
    [],
    ["MATERIAL ANALYSIS"],
    ["Material Name", "Unit", "Coefficient", "Unit Price", "Waste %", "Total Cost", "Notes"],
  ];

  let totalMaterial = 0;
  if (dupaItem.materials && dupaItem.materials.length > 0) {
    dupaItem.materials.forEach((m: any) => {
      const cost = m.coefficient * m.unitPrice * (1 + m.wastePercentage / 100);
      totalMaterial += cost;
      worksheetData.push([
        m.materialName,
        m.unit,
        m.coefficient,
        m.unitPrice,
        m.wastePercentage,
        cost,
        m.notes || "",
      ]);
    });
  }
  worksheetData.push(["", "", "", "", "TOTAL MATERIAL COST:", totalMaterial]);
  worksheetData.push([]);

  worksheetData.push(["LABOR ANALYSIS"]);
  worksheetData.push(["Labor Type", "Coefficient (hrs)", "Hourly Rate", "Total Cost", "Notes"]);
  let totalLabor = 0;
  if (dupaItem.labor && dupaItem.labor.length > 0) {
    dupaItem.labor.forEach((l: any) => {
      const cost = l.coefficient * l.hourlyRate;
      totalLabor += cost;
      worksheetData.push([
        l.laborType,
        l.coefficient,
        l.hourlyRate,
        cost,
        l.notes || "",
      ]);
    });
  }
  worksheetData.push(["", "", "TOTAL LABOR COST:", totalLabor]);
  worksheetData.push([]);

  worksheetData.push(["EQUIPMENT ANALYSIS"]);
  worksheetData.push(["Equipment Name", "Coefficient (hrs)", "Hourly Rate", "Total Cost", "Notes"]);
  let totalEquipment = 0;
  if (dupaItem.equipment && dupaItem.equipment.length > 0) {
    dupaItem.equipment.forEach((e: any) => {
      const cost = e.coefficient * e.hourlyRate;
      totalEquipment += cost;
      worksheetData.push([
        e.equipmentName,
        e.coefficient,
        e.hourlyRate,
        cost,
        e.notes || "",
      ]);
    });
  }
  worksheetData.push(["", "", "TOTAL EQUIPMENT COST:", totalEquipment]);
  worksheetData.push([]);

  const unitCost = totalMaterial + totalLabor + totalEquipment;
  worksheetData.push(["COST SUMMARY"]);
  worksheetData.push(["Material Cost per Unit:", totalMaterial]);
  worksheetData.push(["Labor Cost per Unit:", totalLabor]);
  worksheetData.push(["Equipment Cost per Unit:", totalEquipment]);
  worksheetData.push(["TOTAL UNIT COST:", unitCost]);

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  worksheet['!cols'] = [
    { wch: 30 },
    { wch: 12 },
    { wch: 12 },
    { wch: 15 },
    { wch: 10 },
    { wch: 15 },
    { wch: 25 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "DUPA Analysis");
  
  XLSX.writeFile(workbook, `DUPA-${dupaItem.itemCode}-${Date.now()}.xlsx`);
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
 * Export Market Prices to Excel with Source Analysis
 */
export async function exportMarketPricesToExcel(items: any[]) {
  const XLSX = await import("xlsx");
  
  const worksheetData: any[][] = [
    ["MARKET PRICE DATABASE"],
    [`Generated: ${new Date().toLocaleDateString()}`],
    [],
    ["MATERIAL COST ANALYSIS"],
    ["Item Name", "Category", "Unit", "Price (PHP)", "Supplier", "Location", "Source", "Date Recorded", "Notes"],
    ...items.map(item => [
      item.itemName,
      item.category,
      item.unit,
      item.pricePerUnit,
      item.supplier || "N/A",
      item.location || "N/A",
      item.source || "N/A",
      new Date(item.effectiveDate).toLocaleDateString(),
      item.notes || "",
    ]),
  ];

  // Add summary by category
  const categories = [...new Set(items.map(i => i.category))];
  worksheetData.push([]);
  worksheetData.push(["PRICE SUMMARY BY CATEGORY"]);
  worksheetData.push(["Category", "Item Count", "Avg Price", "Min Price", "Max Price"]);
  
  categories.forEach(cat => {
    const catItems = items.filter(i => i.category === cat);
    const prices = catItems.map(i => i.pricePerUnit);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    
    worksheetData.push([
      cat,
      catItems.length,
      avg.toFixed(2),
      min.toFixed(2),
      max.toFixed(2),
    ]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  worksheet['!cols'] = [
    { wch: 40 },
    { wch: 20 },
    { wch: 10 },
    { wch: 12 },
    { wch: 25 },
    { wch: 15 },
    { wch: 20 },
    { wch: 15 },
    { wch: 30 },
  ];

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
 * Print BOQ in DUPA Format
 */
export function printBOQ(items: any[], projectName: string) {
  window.print();
}