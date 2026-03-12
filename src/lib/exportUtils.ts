import * as XLSX from "xlsx";

/**
 * Export Utilities for Excel and Print
 * Handles data export and print formatting across the CRM
 */

// Company branding for exports
const COMPANY_NAME = "BUILDCORE CONSTRUCTION";
const COMPANY_ADDRESS = "Metro Manila, Philippines";
const COMPANY_CONTACT = "contact@buildcore.ph";

/**
 * Export data to Excel with formatting
 */
export function exportToExcel(
  data: any[],
  filename: string,
  sheetName: string = "Sheet1",
  options?: {
    title?: string;
    subtitle?: string;
    headers?: string[];
    columnWidths?: number[];
    includeTotal?: boolean;
    totalColumns?: string[];
  }
) {
  const workbook = XLSX.utils.book_new();
  
  // Prepare worksheet data
  const worksheetData: any[][] = [];
  
  // Add title rows if provided
  if (options?.title) {
    worksheetData.push([options.title]);
    worksheetData.push([]);
  }
  
  if (options?.subtitle) {
    worksheetData.push([options.subtitle]);
    worksheetData.push([]);
  }
  
  // Add company info
  worksheetData.push([COMPANY_NAME]);
  worksheetData.push([COMPANY_ADDRESS]);
  worksheetData.push([COMPANY_CONTACT]);
  worksheetData.push([]);
  worksheetData.push([`Generated: ${new Date().toLocaleString("en-PH")}`]);
  worksheetData.push([]);
  
  // Add headers
  if (options?.headers && options.headers.length > 0) {
    worksheetData.push(options.headers);
  } else if (data.length > 0) {
    worksheetData.push(Object.keys(data[0]));
  }
  
  // Add data rows
  data.forEach(item => {
    const row = options?.headers 
      ? options.headers.map(header => {
          const key = header.toLowerCase().replace(/\s+/g, "_");
          return item[key] ?? item[header] ?? "";
        })
      : Object.values(item);
    worksheetData.push(row);
  });
  
  // Add totals row if requested
  if (options?.includeTotal && options?.totalColumns) {
    const totalRow: any[] = ["TOTAL"];
    const headers = options.headers || Object.keys(data[0]);
    
    headers.slice(1).forEach((header, index) => {
      const key = header.toLowerCase().replace(/\s+/g, "_");
      if (options.totalColumns.includes(key)) {
        const sum = data.reduce((acc, item) => {
          const value = parseFloat(item[key] || 0);
          return acc + (isNaN(value) ? 0 : value);
        }, 0);
        totalRow.push(sum);
      } else {
        totalRow.push("");
      }
    });
    
    worksheetData.push([]);
    worksheetData.push(totalRow);
  }
  
  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Set column widths
  if (options?.columnWidths) {
    worksheet["!cols"] = options.columnWidths.map(w => ({ wch: w }));
  }
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Generate and download file
  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split("T")[0]}.xlsx`);
}

/**
 * Export BOQ to Excel with detailed formatting
 */
export function exportBOQToExcel(
  boqItems: any[],
  projectName: string
) {
  const headers = [
    "Item No",
    "DPWH Code",
    "Description",
    "Category",
    "Unit",
    "Quantity",
    "Material Cost",
    "Labor Cost",
    "Total Cost"
  ];
  
  const data = boqItems.map(item => ({
    "Item No": item.itemNo || item.item_no,
    "DPWH Code": item.dpwhCode || item.dpwh_code || "",
    "Description": item.description,
    "Category": item.category,
    "Unit": item.unit,
    "Quantity": item.quantity,
    "Material Cost": item.materialCost || item.material_cost || 0,
    "Labor Cost": item.laborCost || item.labor_cost || 0,
    "Total Cost": (item.materialCost || item.material_cost || 0) + (item.laborCost || item.labor_cost || 0)
  }));
  
  exportToExcel(data, `BOQ_${projectName}`, "Bill of Quantities", {
    title: "BILL OF QUANTITIES",
    subtitle: `Project: ${projectName}`,
    headers,
    columnWidths: [10, 15, 40, 20, 10, 12, 15, 15, 15],
    includeTotal: true,
    totalColumns: ["quantity", "material_cost", "labor_cost", "total_cost"]
  });
}

/**
 * Export Projects to Excel
 */
export function exportProjectsToExcel(projects: any[]) {
  const headers = [
    "Project Name",
    "Client",
    "Status",
    "Type",
    "Location",
    "Start Date",
    "End Date",
    "Budget",
    "Spent",
    "Contract Amount",
    "Progress %"
  ];
  
  const data = projects.map(p => ({
    "Project Name": p.name,
    "Client": p.client,
    "Status": p.status,
    "Type": p.projectType || p.project_type,
    "Location": p.location,
    "Start Date": p.startDate || p.start_date,
    "End Date": p.endDate || p.end_date,
    "Budget": p.budget || 0,
    "Spent": p.spent || 0,
    "Contract Amount": p.contractAmount || p.contract_amount || 0,
    "Progress %": p.progress || 0
  }));
  
  exportToExcel(data, "Projects_Report", "Projects", {
    title: "PROJECTS REPORT",
    headers,
    columnWidths: [30, 25, 15, 20, 25, 15, 15, 15, 15, 15, 12],
    includeTotal: true,
    totalColumns: ["budget", "spent", "contract_amount"]
  });
}

/**
 * Export Tasks to Excel
 */
export function exportTasksToExcel(tasks: any[]) {
  const headers = [
    "Task Title",
    "Project",
    "Assigned To",
    "Status",
    "Priority",
    "Due Date",
    "Progress %"
  ];
  
  const data = tasks.map(t => ({
    "Task Title": t.title,
    "Project": t.projectName || t.project_name || "N/A",
    "Assigned To": t.assignedToName || t.assigned_to_name || "Unassigned",
    "Status": t.status,
    "Priority": t.priority,
    "Due Date": t.dueDate || t.due_date,
    "Progress %": t.progress || 0
  }));
  
  exportToExcel(data, "Tasks_Report", "Tasks", {
    title: "TASKS REPORT",
    headers,
    columnWidths: [40, 25, 20, 15, 12, 15, 12]
  });
}

/**
 * Export Billing Items to Excel
 */
export function exportBillingToExcel(billingItems: any[], projectName: string) {
  const headers = [
    "Invoice No",
    "Date",
    "Type",
    "Description",
    "Progress %",
    "Base Amount",
    "VAT (12%)",
    "EWT (2%)",
    "Retention (10%)",
    "Net Amount",
    "Status"
  ];
  
  const data = billingItems.map(b => ({
    "Invoice No": b.invoiceNo || b.invoice_no,
    "Date": b.date,
    "Type": b.billingType || b.billing_type,
    "Description": b.description,
    "Progress %": b.progressPercent || b.progress_percent || 0,
    "Base Amount": b.amount || 0,
    "VAT (12%)": (b.amount || 0) * 0.12,
    "EWT (2%)": (b.amount || 0) * 0.02,
    "Retention (10%)": (b.amount || 0) * 0.10,
    "Net Amount": (b.amount || 0) * 1.12 - (b.amount || 0) * 0.02 - (b.amount || 0) * 0.10,
    "Status": b.status
  }));
  
  exportToExcel(data, `Billing_${projectName}`, "Billing", {
    title: "BILLING STATEMENT",
    subtitle: `Project: ${projectName}`,
    headers,
    columnWidths: [15, 15, 15, 35, 12, 15, 15, 15, 15, 15, 15],
    includeTotal: true,
    totalColumns: ["base_amount", "vat_(12%)", "ewt_(2%)", "retention_(10%)", "net_amount"]
  });
}

/**
 * Export Market Prices to Excel
 */
export function exportMarketPricesToExcel(prices: any[]) {
  const headers = [
    "Material/Item",
    "Category",
    "Unit",
    "Price",
    "Supplier/Source",
    "Location",
    "Effective Date"
  ];
  
  const data = prices.map(p => ({
    "Material/Item": p.materialName || p.material_name,
    "Category": p.category,
    "Unit": p.unit,
    "Price": p.pricePerUnit || p.price_per_unit || p.price,
    "Supplier/Source": p.source,
    "Location": p.location,
    "Effective Date": p.effectiveDate || p.effective_date
  }));
  
  exportToExcel(data, "Market_Prices", "Market Prices", {
    title: "MARKET PRICES REFERENCE",
    headers,
    columnWidths: [30, 20, 10, 15, 25, 20, 15]
  });
}

/**
 * Export Weekly Logistics to Excel
 */
export function exportWeeklyLogisticsToExcel(forecasts: any[], projectName: string) {
  const headers = [
    "Week",
    "Start Date",
    "End Date",
    "Phase",
    "Materials Needed",
    "Estimated Cost",
    "Petty Cash",
    "Notes"
  ];
  
  const data = forecasts.map(f => ({
    "Week": f.weekNumber || f.week_number,
    "Start Date": f.startDate || f.start_date,
    "End Date": f.endDate || f.end_date,
    "Phase": f.phaseName || f.phase_name,
    "Materials Needed": Array.isArray(f.materialsNeeded) 
      ? f.materialsNeeded.join(", ") 
      : f.materials_needed || "",
    "Estimated Cost": f.estimatedCost || f.estimated_cost || 0,
    "Petty Cash": f.estimatedPettyCash || f.estimated_petty_cash || 0,
    "Notes": f.notes || ""
  }));
  
  exportToExcel(data, `Weekly_Logistics_${projectName}`, "Weekly Logistics", {
    title: "WEEKLY MATERIALS FORECAST",
    subtitle: `Project: ${projectName}`,
    headers,
    columnWidths: [8, 15, 15, 25, 50, 15, 15, 30],
    includeTotal: true,
    totalColumns: ["estimated_cost", "petty_cash"]
  });
}

/**
 * Print utilities
 */
export function printElement(elementId: string, title?: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found`);
    return;
  }
  
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    console.error("Could not open print window");
    return;
  }
  
  const styles = `
    <style>
      @media print {
        body { 
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          line-height: 1.4;
          color: #000;
        }
        .no-print { display: none !important; }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          page-break-inside: auto;
        }
        tr { page-break-inside: avoid; page-break-after: auto; }
        th, td { 
          border: 1px solid #333; 
          padding: 8px; 
          text-align: left;
        }
        th { 
          background-color: #f0f0f0; 
          font-weight: 600;
        }
        h1 { 
          font-family: 'Bebas Neue', sans-serif;
          font-size: 28px;
          margin-bottom: 20px;
        }
        .print-header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #000;
          padding-bottom: 20px;
        }
        .print-footer {
          margin-top: 30px;
          border-top: 1px solid #333;
          padding-top: 10px;
          font-size: 10px;
          text-align: center;
        }
      }
    </style>
  `;
  
  const header = `
    <div class="print-header">
      <h1>${COMPANY_NAME}</h1>
      <p>${COMPANY_ADDRESS}</p>
      <p>${COMPANY_CONTACT}</p>
      ${title ? `<h2 style="margin-top: 20px;">${title}</h2>` : ""}
      <p style="margin-top: 10px; font-size: 11px;">Generated: ${new Date().toLocaleString("en-PH")}</p>
    </div>
  `;
  
  const footer = `
    <div class="print-footer">
      <p>This is a computer-generated document. No signature required.</p>
      <p>© ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.</p>
    </div>
  `;
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title || "Print"}</title>
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;600&display=swap" rel="stylesheet">
        ${styles}
      </head>
      <body>
        ${header}
        ${element.innerHTML}
        ${footer}
      </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.focus();
  
  // Wait for content to load before printing
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

/**
 * Generate printable BOQ
 */
export function printBOQ(boqItems: any[], projectName: string) {
  const tableHtml = `
    <div id="boq-print-content">
      <h3 style="margin-bottom: 15px;">Project: ${projectName}</h3>
      <table>
        <thead>
          <tr>
            <th>Item No</th>
            <th>DPWH Code</th>
            <th>Description</th>
            <th>Category</th>
            <th>Unit</th>
            <th>Qty</th>
            <th>Material Cost</th>
            <th>Labor Cost</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${boqItems.map(item => `
            <tr>
              <td>${item.itemNo || item.item_no}</td>
              <td>${item.dpwhCode || item.dpwh_code || "-"}</td>
              <td>${item.description}</td>
              <td>${item.category}</td>
              <td>${item.unit}</td>
              <td>${item.quantity}</td>
              <td>₱${((item.materialCost || item.material_cost || 0)).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
              <td>₱${((item.laborCost || item.labor_cost || 0)).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
              <td>₱${((item.materialCost || item.material_cost || 0) + (item.laborCost || item.labor_cost || 0)).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
            </tr>
          `).join("")}
        </tbody>
        <tfoot>
          <tr style="font-weight: 600; background-color: #f0f0f0;">
            <td colspan="6">TOTAL</td>
            <td>₱${boqItems.reduce((sum, item) => sum + (item.materialCost || item.material_cost || 0), 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
            <td>₱${boqItems.reduce((sum, item) => sum + (item.laborCost || item.labor_cost || 0), 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
            <td>₱${boqItems.reduce((sum, item) => sum + (item.materialCost || item.material_cost || 0) + (item.laborCost || item.labor_cost || 0), 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
  
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = tableHtml;
  tempDiv.style.display = "none";
  document.body.appendChild(tempDiv);
  
  printElement("boq-print-content", "BILL OF QUANTITIES");
  
  setTimeout(() => {
    document.body.removeChild(tempDiv);
  }, 1000);
}