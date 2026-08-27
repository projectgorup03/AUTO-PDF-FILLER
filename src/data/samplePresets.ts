import { SamplePreset } from "../types";

// Helper to draw realistic document forms on HTML5 canvas and export as clean high-res PNG data URLs
export function generateSampleDocumentDataUrl(presetId: string, pageNum: number = 1): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Standard 8.5 x 11 inch ratio at 2x crisp DPI (850 x 1100 px)
  canvas.width = 850;
  canvas.height = 1100;

  // Background - clean crisp off-white paper
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Document outer border & margin guide
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.strokeRect(20, 20, 810, 1060);

  // Footer page marker
  ctx.fillStyle = "#94a3b8";
  ctx.font = "10px monospace";
  ctx.fillText(`Page ${pageNum} of 2`, 740, 1065);
  ctx.fillText("Confidential & Proprietary", 35, 1065);

  if (presetId === "form-w9") {
    if (pageNum === 2) {
      // W-9 Page 2: General Instructions & Taxpayer Certification Exceptions
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(35, 35, 780, 48);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText("Form W-9 (Page 2)", 50, 66);
      ctx.font = "13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText("Part IV: Specific Instructions, Backup Withholding & Payee Codes", 250, 65);

      // Section Header
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(35, 95, 780, 24);
      ctx.fillStyle = "#334155";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("PART IV: EXEMPTIONS & SPECIAL TAX STATUS", 45, 112);

      drawFieldBox(ctx, 35, 130, 380, 52, "Exempt Payee Code (if any)");
      drawFieldBox(ctx, 435, 130, 380, 52, "Exemption from FATCA Reporting Code (if any)");

      // Section 2
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(35, 200, 780, 24);
      ctx.fillStyle = "#334155";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("PART V: FOREIGN FINANCIAL ASSETS & BACKUP WITHHOLDING", 45, 217);

      drawFieldBox(ctx, 35, 235, 780, 52, "Primary Bank Name / Withholding Agent Reference");
      drawFieldBox(ctx, 35, 297, 530, 52, "Designated Agent Contact Person");
      drawFieldBox(ctx, 575, 297, 240, 52, "Agent Phone / Extension");

      drawFieldBox(ctx, 35, 360, 780, 70, "Supplemental Tax Notes / Additional Entity Classification Disclosures");

      // Certification
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(35, 450, 780, 24);
      ctx.fillStyle = "#334155";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("PART VI: SECONDARY AUTHORIZATION & VERIFICATION", 45, 467);

      drawFieldBox(ctx, 35, 485, 530, 65, "Secondary Authorized Representative Signature");
      drawFieldBox(ctx, 575, 485, 240, 65, "Date Verified");

    } else {
      // Top header band
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(35, 35, 780, 48);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText("Form W-9", 50, 66);
      ctx.font = "13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText("Request for Taxpayer Identification Number and Certification", 175, 65);

      // Section 1 Header
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(35, 95, 780, 24);
      ctx.fillStyle = "#334155";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("PART I: TAXPAYER IDENTIFICATION", 45, 112);

      // Row 1: Name
      drawFieldBox(ctx, 35, 130, 780, 52, "1 Name (as shown on your income tax return). Name is required on this line; do not leave this line blank.");

      // Row 2: Business name
      drawFieldBox(ctx, 35, 192, 780, 52, "2 Business name/disregarded entity name, if different from above");

      // Row 3: Federal tax classification
      drawFieldBox(ctx, 35, 254, 780, 68, "3 Check appropriate box for federal tax classification of the person whose name is entered on line 1");
      ctx.font = "12px sans-serif";
      ctx.fillStyle = "#475569";
      drawCheckbox(ctx, 55, 285, "Individual/sole proprietor");
      drawCheckbox(ctx, 230, 285, "C Corporation");
      drawCheckbox(ctx, 360, 285, "S Corporation");
      drawCheckbox(ctx, 490, 285, "Partnership");
      drawCheckbox(ctx, 620, 285, "Trust/estate");

      // Row 4: Address
      drawFieldBox(ctx, 35, 332, 530, 52, "5 Address (number, street, and apt. or suite no.)");
      drawFieldBox(ctx, 575, 332, 240, 52, "Requester's name and address (optional)");

      // Row 5: City, State, ZIP
      drawFieldBox(ctx, 35, 394, 530, 52, "6 City, state, and ZIP code");
      drawFieldBox(ctx, 575, 394, 240, 52, "7 Account number(s) (optional)");

      // Part II: TIN
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(35, 460, 780, 24);
      ctx.fillStyle = "#334155";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("PART II: TAXPAYER IDENTIFICATION NUMBER (TIN)", 45, 477);

      // SSN Boxes
      drawFieldBox(ctx, 35, 495, 380, 65, "Social Security Number (SSN)");
      drawSegmentedBox(ctx, 50, 525, 3, 2, 4); // 000-00-0000 layout

      // EIN Boxes
      drawFieldBox(ctx, 435, 495, 380, 65, "Employer Identification Number (EIN)");
      drawSegmentedBox(ctx, 450, 525, 2, 7, 0); // 00-0000000 layout

      // Part III: Certification & Signature
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(35, 575, 780, 24);
      ctx.fillStyle = "#334155";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("PART III: CERTIFICATION & SIGNATURE", 45, 592);

      ctx.fillStyle = "#64748b";
      ctx.font = "11px sans-serif";
      ctx.fillText("Under penalties of perjury, I certify that the number shown on this form is my correct taxpayer identification number.", 45, 620);
      ctx.fillText("I am a U.S. citizen or other U.S. person, and I am not subject to backup withholding.", 45, 638);

      drawFieldBox(ctx, 35, 660, 530, 65, "Sign Here: Signature of U.S. Person");
      drawFieldBox(ctx, 575, 660, 240, 65, "Date");

      // Additional info & footer instructions
      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px sans-serif";
      ctx.fillText("Cat. No. 10231X", 45, 1040);
      ctx.fillText("Form W-9 (Rev. 10-2024)", 660, 1040);
    }

  } else if (presetId === "patient-intake") {
    if (pageNum === 2) {
      // Patient Intake Page 2: Medical History & Pharmacy
      ctx.fillStyle = "#0284c7";
      ctx.fillRect(35, 35, 780, 52);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("VALLEY HEALTHCARE (PAGE 2)", 50, 65);
      ctx.font = "13px sans-serif";
      ctx.fillText("MEDICAL HISTORY, PHARMACY & CONSENT", 50, 80);

      // Section 3: Clinical Concerns
      ctx.fillStyle = "#e0f2fe";
      ctx.fillRect(35, 100, 780, 24);
      ctx.fillStyle = "#0369a1";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("3. CLINICAL CONCERNS & MEDICAL HISTORY", 45, 117);

      drawFieldBox(ctx, 35, 135, 780, 56, "Chief Complaint / Reason for Visit Today");
      drawFieldBox(ctx, 35, 203, 780, 56, "Known Drug / Environmental Allergies");
      drawFieldBox(ctx, 35, 271, 780, 60, "Current Prescriptions, OTC Medications & Dosages");

      // Section 4: Pharmacy
      ctx.fillStyle = "#e0f2fe";
      ctx.fillRect(35, 345, 780, 24);
      ctx.fillStyle = "#0369a1";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("4. PREFERRED PHARMACY & DISPENSARY", 45, 362);

      drawFieldBox(ctx, 35, 380, 380, 52, "Preferred Pharmacy Name");
      drawFieldBox(ctx, 425, 380, 390, 52, "Pharmacy Street Address / Cross Street");
      drawFieldBox(ctx, 35, 442, 380, 52, "Pharmacy Phone #");
      drawFieldBox(ctx, 425, 442, 390, 52, "Pharmacy Fax / Direct Line");

      // Section 5: Authorization
      ctx.fillStyle = "#e0f2fe";
      ctx.fillRect(35, 515, 780, 24);
      ctx.fillStyle = "#0369a1";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("5. ACKNOWLEDGMENT & AUTHORIZATION", 45, 532);

      ctx.fillStyle = "#64748b";
      ctx.font = "11px sans-serif";
      ctx.fillText("I verify that all information provided is accurate to the best of my knowledge.", 45, 560);

      drawFieldBox(ctx, 35, 580, 530, 65, "Patient or Legal Guardian Signature");
      drawFieldBox(ctx, 575, 580, 240, 65, "Date Signed");

    } else {
      // Medical Intake Form Page 1
      ctx.fillStyle = "#0284c7";
      ctx.fillRect(35, 35, 780, 52);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("VALLEY HEALTHCARE PARTNERS", 50, 65);
      ctx.font = "13px sans-serif";
      ctx.fillText("NEW PATIENT INTAKE & REGISTRATION FORM (PAGE 1)", 50, 80);

      // Section 1: Patient Demographics
      ctx.fillStyle = "#e0f2fe";
      ctx.fillRect(35, 100, 780, 24);
      ctx.fillStyle = "#0369a1";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("1. PATIENT DEMOGRAPHICS", 45, 117);

      drawFieldBox(ctx, 35, 135, 380, 52, "Patient Legal Full Name (Last, First, MI)");
      drawFieldBox(ctx, 425, 135, 180, 52, "Preferred Name / Nickname");
      drawFieldBox(ctx, 615, 135, 200, 52, "Date of Birth (MM/DD/YYYY)");

      drawFieldBox(ctx, 35, 198, 480, 52, "Residential Street Address");
      drawFieldBox(ctx, 525, 198, 140, 52, "City");
      drawFieldBox(ctx, 675, 198, 50, 52, "State");
      drawFieldBox(ctx, 735, 198, 80, 52, "ZIP Code");

      drawFieldBox(ctx, 35, 260, 250, 52, "Primary Phone Number");
      drawFieldBox(ctx, 295, 260, 310, 52, "Email Address");
      drawFieldBox(ctx, 615, 260, 200, 52, "Emergency Contact Full Name");

      // Section 2: Insurance Information
      ctx.fillStyle = "#e0f2fe";
      ctx.fillRect(35, 330, 780, 24);
      ctx.fillStyle = "#0369a1";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("2. MEDICAL INSURANCE COVERAGE", 45, 347);

      drawFieldBox(ctx, 35, 365, 380, 52, "Primary Insurance Company Name");
      drawFieldBox(ctx, 425, 365, 200, 52, "Policy / Member ID #");
      drawFieldBox(ctx, 635, 365, 180, 52, "Group Number");

      drawFieldBox(ctx, 35, 428, 380, 52, "Subscriber / Policyholder Name");
      drawFieldBox(ctx, 425, 428, 190, 52, "Subscriber DOB");
      drawFieldBox(ctx, 625, 428, 190, 52, "Relationship to Patient");

      drawFieldBox(ctx, 35, 500, 530, 65, "Applicant Signature (Page 1 Intake)");
      drawFieldBox(ctx, 575, 500, 240, 65, "Date");
    }

  } else if (presetId === "rental-application") {
    if (pageNum === 2) {
      // Rental Application Page 2
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(35, 35, 780, 48);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("RESIDENTIAL LEASE APPLICATION (PAGE 2)", 50, 65);

      // Section 3: Desired Lease Details
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(35, 95, 780, 24);
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("PROPOSED LEASE TERMS & OCCUPANTS", 45, 112);

      drawFieldBox(ctx, 35, 130, 280, 52, "Desired Move-in Date");
      drawFieldBox(ctx, 325, 130, 250, 52, "Lease Term Requested");
      drawFieldBox(ctx, 585, 130, 230, 52, "Total Number of Occupants");

      drawFieldBox(ctx, 35, 192, 780, 52, "Names of Additional Co-Tenants / Minor Dependents");

      // Section 4: Vehicle & Pets
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(35, 260, 780, 24);
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("VEHICLE & PET INFORMATION", 45, 277);

      drawFieldBox(ctx, 35, 295, 380, 52, "Vehicle Make, Model & Year");
      drawFieldBox(ctx, 425, 295, 390, 52, "License Plate # & State");

      drawFieldBox(ctx, 35, 357, 780, 52, "Pet Types, Breeds & Estimated Weights");

      // Section 5: Signature
      drawFieldBox(ctx, 35, 440, 530, 65, "Applicant Signature (Full Acknowledgment)");
      drawFieldBox(ctx, 575, 440, 240, 65, "Application Date");

    } else {
      // Rental Application Page 1
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(35, 35, 780, 48);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("RESIDENTIAL RENTAL LEASE APPLICATION (PAGE 1)", 50, 65);

      // Section 1
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(35, 95, 780, 24);
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("APPLICANT PERSONAL INFORMATION", 45, 112);

      drawFieldBox(ctx, 35, 130, 400, 52, "Applicant Full Legal Name");
      drawFieldBox(ctx, 445, 130, 180, 52, "Date of Birth");
      drawFieldBox(ctx, 635, 130, 180, 52, "Social Security Number");

      drawFieldBox(ctx, 35, 192, 280, 52, "Driver's License # & State");
      drawFieldBox(ctx, 325, 192, 250, 52, "Contact Phone Number");
      drawFieldBox(ctx, 585, 192, 230, 52, "Email Address");

      // Current Residence
      drawFieldBox(ctx, 35, 254, 430, 52, "Current Street Address");
      drawFieldBox(ctx, 475, 254, 180, 52, "City, State, ZIP");
      drawFieldBox(ctx, 665, 254, 150, 52, "Monthly Rent Amount");

      drawFieldBox(ctx, 35, 316, 400, 52, "Current Landlord / Property Manager Name");
      drawFieldBox(ctx, 445, 316, 200, 52, "Landlord Phone #");
      drawFieldBox(ctx, 655, 316, 160, 52, "Duration at Residence");

      // Section 2: Employment
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(35, 385, 780, 24);
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("EMPLOYMENT & INCOME VERIFICATION", 45, 402);

      drawFieldBox(ctx, 35, 420, 390, 52, "Current Employer / Company Name");
      drawFieldBox(ctx, 435, 420, 380, 52, "Position / Job Title");

      drawFieldBox(ctx, 35, 482, 260, 52, "Gross Monthly Income ($)");
      drawFieldBox(ctx, 305, 482, 270, 52, "Supervisor Name & Title");
      drawFieldBox(ctx, 585, 482, 230, 52, "Work Phone Number");

      // Signature 1
      drawFieldBox(ctx, 35, 560, 530, 65, "Applicant Signature (Part I)");
      drawFieldBox(ctx, 575, 560, 240, 65, "Date Signed");
    }

  } else if (presetId === "employment-application") {
    if (pageNum === 2) {
      // Employment Application Page 2
      ctx.fillStyle = "#047857";
      ctx.fillRect(35, 35, 780, 48);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("NEXUS TECHNOLOGIES — APPLICATION (PAGE 2)", 50, 65);

      // Section 2
      ctx.fillStyle = "#ecfdf5";
      ctx.fillRect(35, 95, 780, 24);
      ctx.fillStyle = "#065f46";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("POSITION DESIRED & PROFESSIONAL BACKGROUND", 45, 112);

      drawFieldBox(ctx, 35, 130, 450, 52, "Position Applied For");
      drawFieldBox(ctx, 495, 130, 320, 52, "Desired Annual Compensation ($)");

      drawFieldBox(ctx, 35, 192, 450, 52, "Highest Degree / University Attended");
      drawFieldBox(ctx, 495, 192, 320, 52, "Years of Relevant Experience");

      drawFieldBox(ctx, 35, 254, 780, 60, "Core Technical Skills & Certifications");

      // References
      ctx.fillStyle = "#ecfdf5";
      ctx.fillRect(35, 330, 780, 24);
      ctx.fillStyle = "#065f46";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("PROFESSIONAL REFERENCES & BACKGROUND CHECK CONSENT", 45, 347);

      drawFieldBox(ctx, 35, 365, 380, 52, "Primary Reference Full Name");
      drawFieldBox(ctx, 425, 365, 390, 52, "Reference Title / Company / Contact Phone");

      // Section 3
      drawFieldBox(ctx, 35, 450, 530, 65, "Applicant Signature");
      drawFieldBox(ctx, 575, 450, 240, 65, "Date Signed");

    } else {
      // Employment Application Page 1
      ctx.fillStyle = "#047857";
      ctx.fillRect(35, 35, 780, 48);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("NEXUS TECHNOLOGIES — EMPLOYMENT APPLICATION (PAGE 1)", 50, 65);

      // Section 1
      ctx.fillStyle = "#ecfdf5";
      ctx.fillRect(35, 95, 780, 24);
      ctx.fillStyle = "#065f46";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("APPLICANT IDENTIFICATION", 45, 112);

      drawFieldBox(ctx, 35, 130, 380, 52, "First & Last Name");
      drawFieldBox(ctx, 425, 130, 200, 52, "Date of Birth");
      drawFieldBox(ctx, 635, 130, 180, 52, "Preferred Pronouns");

      drawFieldBox(ctx, 35, 192, 450, 52, "Home Street Address");
      drawFieldBox(ctx, 495, 192, 190, 52, "City / State");
      drawFieldBox(ctx, 695, 192, 120, 52, "Postal Code");

      drawFieldBox(ctx, 35, 254, 280, 52, "Mobile Phone Number");
      drawFieldBox(ctx, 325, 254, 300, 52, "Primary Email Address");
      drawFieldBox(ctx, 635, 254, 180, 52, "Target Start Date");

      drawFieldBox(ctx, 35, 330, 530, 65, "Applicant Signature (Page 1)");
      drawFieldBox(ctx, 575, 330, 240, 65, "Date");
    }

  } else {
    // Equipment Checkout & Loan Agreement
    if (pageNum === 2) {
      ctx.fillStyle = "#4338ca";
      ctx.fillRect(35, 35, 780, 48);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("HARDWARE ASSET LOAN AGREEMENT (PAGE 2)", 50, 65);

      // Section 2
      ctx.fillStyle = "#eef2ff";
      ctx.fillRect(35, 95, 780, 24);
      ctx.fillStyle = "#3730a3";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("2. EQUIPMENT SPECIFICATIONS", 45, 112);

      drawFieldBox(ctx, 35, 130, 380, 52, "Equipment Make & Model");
      drawFieldBox(ctx, 425, 130, 200, 52, "Asset Tag Barcode #");
      drawFieldBox(ctx, 635, 130, 180, 52, "Serial Number");

      drawFieldBox(ctx, 35, 192, 280, 52, "Issue / Checkout Date");
      drawFieldBox(ctx, 325, 192, 280, 52, "Expected Return Date");
      drawFieldBox(ctx, 615, 192, 200, 52, "Project Cost Center");

      drawFieldBox(ctx, 35, 254, 780, 60, "Included Accessories (Charger, Case, Adapter, Cables)");

      // Section 3
      drawFieldBox(ctx, 35, 340, 530, 65, "Borrower Signature");
      drawFieldBox(ctx, 575, 340, 240, 65, "Date");

    } else {
      ctx.fillStyle = "#4338ca";
      ctx.fillRect(35, 35, 780, 48);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("ENTERPRISE HARDWARE ASSET CHECKOUT (PAGE 1)", 50, 65);

      // Section 1
      ctx.fillStyle = "#eef2ff";
      ctx.fillRect(35, 95, 780, 24);
      ctx.fillStyle = "#3730a3";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("1. CUSTODIAN / BORROWER DETAILS", 45, 112);

      drawFieldBox(ctx, 35, 130, 380, 52, "Employee Full Name");
      drawFieldBox(ctx, 425, 130, 190, 52, "Employee Badge ID");
      drawFieldBox(ctx, 625, 130, 190, 52, "Department / Team");

      drawFieldBox(ctx, 35, 192, 380, 52, "Corporate Email Address");
      drawFieldBox(ctx, 425, 192, 390, 52, "Direct Manager / Supervisor Name");

      drawFieldBox(ctx, 35, 270, 530, 65, "Borrower Initial / Consent (Page 1)");
      drawFieldBox(ctx, 575, 270, 240, 65, "Date");
    }
  }

  return canvas.toDataURL("image/png");
}

function drawFieldBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string) {
  // Label text
  ctx.fillStyle = "#475569";
  ctx.font = "11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(label, x + 4, y - 4);

  // Border box
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1.2;
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
}

function drawCheckbox(ctx: CanvasRenderingContext2D, x: number, y: number, label: string) {
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(x, y - 10, 14, 14);
  ctx.fillStyle = "#334155";
  ctx.font = "12px sans-serif";
  ctx.fillText(label, x + 20, y + 2);
}

function drawSegmentedBox(ctx: CanvasRenderingContext2D, x: number, y: number, ...counts: number[]) {
  let curX = x;
  counts.forEach((count, groupIdx) => {
    for (let i = 0; i < count; i++) {
      ctx.strokeStyle = "#64748b";
      ctx.strokeRect(curX, y, 18, 24);
      curX += 20;
    }
    if (groupIdx < counts.length - 1 && counts[groupIdx + 1] > 0) {
      ctx.fillStyle = "#64748b";
      ctx.fillText("-", curX + 2, y + 16);
      curX += 14;
    }
  });
}

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: "form-w9",
    name: "IRS Form W-9 (Tax Identification)",
    category: "Financial / Tax",
    description: "Standard W-9 Request for Taxpayer ID and Certification with sole proprietor details.",
    documentUrl: "",
    sampleDetails: `Taxpayer Profile:
Name: Sarah Linwood
Business Name: Linwood Creative Design Studio
Tax Classification: Individual / sole proprietor
Home Address: 742 Evergreen Terrace, Apt 4B
City, State, Zip: Springfield, OR 97477
Social Security Number: 382-91-8402
Account Number: ACCT-99482
Signature: Sarah Linwood
Date: 08/24/2026`,
  },
  {
    id: "patient-intake",
    name: "Valley Health Patient Intake Form",
    category: "Healthcare",
    description: "New patient medical demographics, insurance info, allergies, and clinical intake notes.",
    documentUrl: "",
    sampleDetails: `Patient Intake Notes from Front Desk:
Patient: Alexander Marcus Chen
Goes by: Alex
DOB: 11/14/1992
Home Address: 1428 Elm Street, Apt 3, Denver, CO 80202
Phone: (303) 555-0199
Email: a.chen@mountaineer.org
Emergency Contact: Rebecca Chen (Sister, 303-555-0812)
Insurance: Blue Cross Blue Shield of Colorado
Member ID: BCB-883920194
Group #: GRP-44021
Subscriber: Alexander Chen, DOB 11/14/1992, Self
Reason for visit: Persistent lower back pain radiating to left leg for 3 weeks after weightlifting.
Allergies: Penicillin, Sulfa drugs
Current Meds: Ibuprofen 600mg PRN, Vitamin D3 2000 IU daily
Signed: Alexander Chen, 08/25/2026`,
  },
  {
    id: "rental-application",
    name: "Residential Lease Application",
    category: "Real Estate",
    description: "Tenant personal background, current landlord, monthly income, and lease preferences.",
    documentUrl: "",
    sampleDetails: `Applicant Rental Submission:
Applicant: Elena Rostova
Date of Birth: 05/19/1995
SSN: 449-22-1084
Driver's License: DL-CA-9928174 (California)
Phone: (415) 555-7281
Email: elena.rostova@techcorp.io
Current Address: 884 Market St, San Francisco, CA 94102
Current Monthly Rent: $2,850
Current Landlord: Pacific Bay Properties (Attn: David Miller, 415-555-3399)
Duration at residence: 2.5 years
Employer: CloudScale Analytics Inc.
Job Title: Senior Product Designer
Gross Monthly Income: $11,500 ($138k/yr)
Supervisor: Marcus Brody, VP Design (415-555-9011)
Desired Move-in Date: 09/01/2026
Requested Lease Term: 12 Months
Number of Occupants: 1
Signature: Elena Rostova, 08/25/2026`,
  },
  {
    id: "employment-application",
    name: "Nexus Tech Employment Application",
    category: "HR & Onboarding",
    description: "Job candidate identity, desired role, compensation target, and qualifications.",
    documentUrl: "",
    sampleDetails: `Candidate Application Info:
Full Name: Jordan Tyler Hayes
DOB: 03/29/1996
Pronouns: he/him
Address: 520 Pinecrest Boulevard, Seattle, WA 98101
Phone: (206) 555-4820
Email: jhayes.dev@gmail.com
Target Start Date: September 15, 2026
Position Applied For: Staff Full Stack Engineer
Desired Compensation: $195,000 / year
Education: B.S. Computer Science, University of Washington
Years of Experience: 7 years
Core Skills: React, Node.js, TypeScript, Distributed Systems, Cloud Run, Python
Signature: Jordan Hayes, Date: 08/25/2026`,
  },
  {
    id: "equipment-checkout",
    name: "Hardware Asset Loan Agreement",
    category: "IT / Operations",
    description: "Borrower identity, equipment serial numbers, loan terms, and supervisor info.",
    documentUrl: "",
    sampleDetails: `Asset Checkout Log:
Borrower: Dominic Keller
Badge ID: EMP-8492
Department: AI Research & Robotics
Corporate Email: d.keller@enterprise.internal
Manager: Dr. Aris Thorne
Equipment Model: MacBook Pro 16" M3 Max (64GB RAM, 2TB SSD)
Asset Tag #: AST-99201
Serial Number: C02G99XZMD6R
Issue Date: 08/25/2026
Expected Return Date: 11/30/2026
Cost Center: CC-8402 (Autonomous Robotics Lab)
Accessories: 140W USB-C Power Adapter, MagSafe 3 Cable, Thunderbolt 4 Dock, Carrying Sleeve
Signature: Dominic Keller, Date: 08/25/2026`,
  },
];
