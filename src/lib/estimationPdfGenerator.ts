import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Estimation, BusinessSettings } from '@/types';
import { formatCurrency, formatWeight, formatDate } from './utils';
import { loadPdfFont } from './pdfFont';

function getShopHeaderDetails(settings?: BusinessSettings) {
  const name = settings?.shop_name || 'Shankar Jewellery';
  const addressParts = [
    settings?.address,
    settings?.city,
    settings?.state && settings?.pin_code ? `${settings.state} - ${settings.pin_code}` : (settings?.state || settings?.pin_code)
  ].filter(Boolean).join(', ');
  const address = addressParts || 'No.4 sandhukadai, bigbazzar street, Trichy - 620008';
  const phoneStr = `Phone: ${settings?.phone || '+91 98765 43210'}${settings?.gstin ? ` | GSTIN: ${settings.gstin}` : ''}`;
  return { name, address, phoneStr };
}

async function getImageDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:image/')) return url;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function buildEstimationPDFDoc(
  estimation: Estimation,
  settings?: BusinessSettings
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  loadPdfFont(doc);

  const shop = getShopHeaderDetails(settings);

  // --- Geometry Constants (A4 Portrait: 210mm x 297mm) ---
  const pageWidth = 210;
  const pageHeight = 297;
  const marginLeft = 14;
  const marginRight = 14;
  const contentWidth = pageWidth - marginLeft - marginRight; // 182mm
  const rightBound = pageWidth - marginRight; // 196mm

  // --- Premium Header Banner (0 to 36mm) ---
  const bannerHeight = 36;
  doc.setFillColor(30, 31, 38);
  doc.rect(0, 0, pageWidth, bannerHeight, 'F');

  // Shop Name & Contact Info (Left)
  doc.setTextColor(212, 175, 55); // Gold Accent #D4AF37
  doc.setFont('Georgia', 'bold');
  doc.setFontSize(18);
  doc.text(shop.name, marginLeft, 15);

  doc.setFontSize(7.5);
  doc.setTextColor(210, 210, 210);
  doc.setFont('Georgia', 'normal');
  doc.text(shop.address, marginLeft, 22);
  doc.text(shop.phoneStr, marginLeft, 28);

  // Title Box (Right edge: 132mm to 196mm = 64mm wide)
  const titleBoxWidth = 64;
  const titleBoxX = rightBound - titleBoxWidth;
  doc.setFillColor(212, 175, 55);
  doc.rect(titleBoxX, 8, titleBoxWidth, 20, 'F');
  doc.setTextColor(18, 18, 23);
  doc.setFontSize(9.5);
  doc.setFont('Georgia', 'bold');
  doc.text('PRICE ESTIMATION', titleBoxX + 5, 15);
  doc.setFontSize(6.5);
  doc.setFont('Georgia', 'normal');
  doc.text('(NOT A TAX INVOICE / SALE BILL)', titleBoxX + 5, 21.5);

  // --- Customer & Estimation Metadata Section ---
  let currentY = 44;

  // Left Column: Customer details
  doc.setTextColor(30, 31, 38);
  doc.setFontSize(8.5);
  doc.setFont('Georgia', 'bold');
  doc.text('ESTIMATION FOR:', marginLeft, currentY);

  doc.setFont('Georgia', 'normal');
  doc.setFontSize(8);
  doc.text(`Customer: ${estimation.customer_name || 'Valued Customer'}`, marginLeft, currentY + 5.5);
  if (estimation.customer_phone) {
    doc.text(`Phone: ${estimation.customer_phone}`, marginLeft, currentY + 11);
  }
  if (estimation.customer_address) {
    const custAddr = doc.splitTextToSize(`Address: ${estimation.customer_address}`, 95);
    doc.text(custAddr, marginLeft, currentY + (estimation.customer_phone ? 16.5 : 11));
  }

  // Right Column: Estimation details (starts at x = 126)
  const metaX = 126;
  doc.setFont('Georgia', 'bold');
  doc.setFontSize(8.5);
  doc.text(`Est. No: ${estimation.estimation_number} (Rev ${estimation.version})`, metaX, currentY);
  doc.setFont('Georgia', 'normal');
  doc.setFontSize(8);
  doc.text(`Est. Date: ${formatDate(estimation.estimation_date)}`, metaX, currentY + 5.5);
  doc.text(`Valid Until: ${formatDate(estimation.valid_until)}`, metaX, currentY + 11);

  const typeLabel =
    estimation.estimation_type === 'reference_design'
      ? 'REFERENCE DESIGN ESTIMATION'
      : estimation.estimation_type === 'custom_jewellery'
      ? 'CUSTOM JEWELLERY'
      : 'INVENTORY CATALOGUE';
  doc.setTextColor(184, 134, 11);
  doc.setFont('Georgia', 'bold');
  doc.text(`Type: ${typeLabel}`, metaX, currentY + 16.5);

  currentY += 23;

  // --- Locked Market Rate Snapshot Card ---
  const rateBoxHeight = 11;
  doc.setFillColor(250, 248, 240);
  doc.rect(marginLeft, currentY, contentWidth, rateBoxHeight, 'F');
  doc.setLineWidth(0.3);
  doc.setDrawColor(212, 175, 55);
  doc.rect(marginLeft, currentY, contentWidth, rateBoxHeight, 'S');

  doc.setFontSize(7.2);
  doc.setFont('Georgia', 'bold');
  doc.setTextColor(184, 134, 11);
  doc.text('LOCKED MARKET RATE SNAPSHOT:', marginLeft + 4, currentY + 7);

  doc.setFont('Georgia', 'normal');
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(7);
  doc.text(
    `Gold 22K (916): ${formatCurrency(estimation.gold_22k_rate)}/g  |  Gold 24K: ${formatCurrency(estimation.gold_24k_rate)}/g  |  Silver: ${formatCurrency(estimation.silver_rate)}/g`,
    marginLeft + 60,
    currentY + 7
  );

  currentY += rateBoxHeight + 5;

  // --- Customer Reference Images Section (if present) ---
  const images = estimation.reference_images || [];
  if (images.length > 0) {
    doc.setFont('Georgia', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 31, 38);
    doc.text('CUSTOMER REFERENCE DESIGN (PHOTOGRAPHS PROVIDED BY CUSTOMER):', marginLeft, currentY);
    currentY += 4;

    let imgX = marginLeft;
    const imgWidth = 28;
    const imgHeight = 28;

    for (let i = 0; i < Math.min(images.length, 4); i++) {
      const img = images[i];
      const dataUrl = await getImageDataUrl(img.image_url);
      if (dataUrl) {
        try {
          doc.setDrawColor(200, 200, 200);
          doc.rect(imgX, currentY, imgWidth, imgHeight, 'S');
          doc.addImage(dataUrl, 'JPEG', imgX + 0.5, currentY + 0.5, imgWidth - 1, imgHeight - 1);
          doc.setFontSize(6.2);
          doc.setFont('Georgia', 'normal');
          doc.setTextColor(80, 80, 80);
          const label = img.label || `Ref #${i + 1}`;
          doc.text(label, imgX + 1, currentY + imgHeight + 3.5);
        } catch {
          // Fallback if unsupported image format
        }
      }
      imgX += imgWidth + 6;
    }

    currentY += imgHeight + 6;
  }

  // --- Items Table ---
  // Printable width budget = exactly 182mm:
  // 1: Idx (6) + 2: Desc (42) + 3: Gross (14) + 4: Stone (13) + 5: Net (14)
  // + 6: Rate (17) + 7: MetalVal (19) + 8: Wastage (18) + 9: Making+Stone (18) + 10: Total (21) = 182mm
  const tableRows = (estimation.items || []).map((item, idx) => [
    (idx + 1).toString(),
    `${item.item_name}\n(${item.purity.toUpperCase()} | ${item.jewellery_type})`,
    formatWeight(item.estimated_gross_weight_g),
    formatWeight(item.estimated_stone_weight_g),
    formatWeight(item.estimated_net_weight_g),
    formatCurrency(item.metal_rate_per_gram),
    formatCurrency(item.metal_value),
    `${item.wastage_percent}% (${formatCurrency(item.wastage_value)})`,
    formatCurrency(item.making_charge_amount + (item.stone_charge || 0)),
    formatCurrency(item.line_total),
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [[
      '#',
      'Item Description',
      'Est. Gross\n(g)',
      'Est. Stone\n(g)',
      'Est. Net\n(g)',
      'Rate/g',
      'Metal Val',
      'Wastage / VA',
      'Making+Stone',
      'Est. Total',
    ]],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 31, 38],
      textColor: [212, 175, 55],
      font: 'Georgia',
      fontStyle: 'bold',
      fontSize: 6.8,
      halign: 'center',
      valign: 'middle',
      cellPadding: 1.5,
    },
    bodyStyles: {
      font: 'Georgia',
      fontSize: 6.8,
      textColor: [30, 31, 38],
      cellPadding: 1.5,
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 6 },
      1: { cellWidth: 42, halign: 'left' },
      2: { halign: 'right', cellWidth: 14 },
      3: { halign: 'right', cellWidth: 13 },
      4: { halign: 'right', cellWidth: 14 },
      5: { halign: 'right', cellWidth: 17 },
      6: { halign: 'right', cellWidth: 19 },
      7: { halign: 'right', cellWidth: 18 },
      8: { halign: 'right', cellWidth: 18 },
      9: { halign: 'right', cellWidth: 21, fontStyle: 'bold' },
    },
    margin: { left: marginLeft, right: marginRight },
  });

  const finalTableY = (doc as any).lastAutoTable?.finalY || currentY + 30;

  // --- Dynamic Summary Lines Calculation ---
  const summaryLines: { label: string; value: string }[] = [
    { label: 'Subtotal Metal Value:', value: formatCurrency(estimation.subtotal_metal_value) },
    { label: 'Wastage / VA Value:', value: formatCurrency(estimation.total_wastage_value) },
    { label: 'Total Making & Crafting:', value: formatCurrency(estimation.total_making_charges) },
  ];

  if (estimation.total_stone_charges > 0) {
    summaryLines.push({ label: 'Stone / Gem Charges:', value: formatCurrency(estimation.total_stone_charges) });
  }
  if (estimation.total_other_charges > 0) {
    summaryLines.push({ label: 'Other Charges:', value: formatCurrency(estimation.total_other_charges) });
  }
  if (estimation.discount_amount > 0) {
    summaryLines.push({ label: 'Special Discount:', value: `-${formatCurrency(estimation.discount_amount)}` });
  }
  if (estimation.tax_amount > 0) {
    summaryLines.push({ label: `Estimated GST (${estimation.tax_percent}%):`, value: formatCurrency(estimation.tax_amount) });
  }

  const lineHeight = 4.8;
  const grandTotalBarHeight = 8.5;
  const summaryBoxHeight = 4 + summaryLines.length * lineHeight + 2 + grandTotalBarHeight + 1.5;
  const disclaimerHeight = 23;
  const sigHeight = 16;
  const totalNeededBelowTable = 5 + summaryBoxHeight + 5 + disclaimerHeight + 5 + sigHeight;

  let summaryY = finalTableY + 5;

  // Only break page if content truly exceeds available printable height (287mm)
  if (summaryY + totalNeededBelowTable > 287) {
    doc.addPage();
    summaryY = 16;
  }

  // --- Summary Card on Right (x = 114 to 196, width = 82mm) ---
  const summaryBoxWidth = 82;
  const summaryBoxX = rightBound - summaryBoxWidth;

  doc.setFillColor(250, 248, 240);
  doc.rect(summaryBoxX, summaryY, summaryBoxWidth, summaryBoxHeight, 'F');
  doc.setLineWidth(0.3);
  doc.setDrawColor(212, 175, 55);
  doc.rect(summaryBoxX, summaryY, summaryBoxWidth, summaryBoxHeight, 'S');

  doc.setFontSize(7.2);
  doc.setFont('Georgia', 'normal');
  doc.setTextColor(50, 50, 50);

  summaryLines.forEach((line, index) => {
    const lineY = summaryY + 4 + index * lineHeight + 3.2;
    doc.text(line.label, summaryBoxX + 4, lineY);
    doc.text(line.value, summaryBoxX + summaryBoxWidth - 4, lineY, { align: 'right' });
  });

  // Grand Total Highlight Bar
  const barY = summaryY + summaryBoxHeight - grandTotalBarHeight - 1.2;
  doc.setFillColor(30, 31, 38);
  doc.rect(summaryBoxX + 0.5, barY, summaryBoxWidth - 1, grandTotalBarHeight, 'F');
  doc.setTextColor(212, 175, 55);
  doc.setFont('Georgia', 'bold');
  doc.setFontSize(8.5);
  doc.text('ESTIMATED TOTAL:', summaryBoxX + 4, barY + 5.5);
  doc.text(formatCurrency(estimation.total_estimated_amount), summaryBoxX + summaryBoxWidth - 4, barY + 5.5, { align: 'right' });

  // --- Design & Customer Requirements on Left (Matches screenshot: plain text, no box) ---
  const notesLeftX = marginLeft;
  doc.setFontSize(7.5);
  doc.setFont('Georgia', 'bold');
  doc.setTextColor(30, 31, 38);
  doc.text('DESIGN & CUSTOMER REQUIREMENTS:', notesLeftX, summaryY + 5);

  doc.setFont('Georgia', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(70, 70, 70);
  const notesText =
    estimation.customer_requirements ||
    estimation.general_notes ||
    'Bespoke custom order estimation based on customer reference photograph.';
  const splitNotes = doc.splitTextToSize(notesText, 90);
  doc.text(splitNotes, notesLeftX, summaryY + 10);

  // --- Mandatory Legal & Commercial Disclaimer Box ---
  const disclaimerY = summaryY + summaryBoxHeight + 5;
  doc.setFillColor(248, 248, 248);
  doc.rect(marginLeft, disclaimerY, contentWidth, disclaimerHeight, 'F');
  doc.setDrawColor(210, 210, 210);
  doc.rect(marginLeft, disclaimerY, contentWidth, disclaimerHeight, 'S');

  doc.setFontSize(6.8);
  doc.setFont('Georgia', 'bold');
  doc.setTextColor(180, 0, 0);
  doc.text('IMPORTANT TERMS & ESTIMATION DISCLAIMER:', marginLeft + 4, disclaimerY + 4.5);

  doc.setFont('Georgia', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(6);
  const disclaimers = [
    '1. This document is strictly a PRICE ESTIMATE and is NOT a tax invoice, bill of sale, or receipt of payment.',
    '2. Design photographs are customer-provided reference models only. Slight aesthetic variations are inherent to handcrafted jewelry.',
    '3. All weights shown are ESTIMATES. Final billing will be calculated strictly based on actual gross and net weights measured upon completion.',
    '4. Rate snapshot is honored only until the validity date. Market rates at the time of final advance booking will apply if expired.',
    '5. Manufacturing commences only after design approval and advance payment confirmation.',
  ];
  disclaimers.forEach((line, idx) => {
    doc.text(line, marginLeft + 4, disclaimerY + 8 + idx * 3.1);
  });

  // --- Signatures Block ---
  const sigY = disclaimerY + disclaimerHeight + 10;
  doc.setFontSize(7.2);
  doc.setFont('Georgia', 'normal');
  doc.setTextColor(50, 50, 50);

  doc.setDrawColor(160, 160, 160);
  doc.line(marginLeft, sigY + 5, marginLeft + 54, sigY + 5);
  doc.text('Customer Acceptance Signature', marginLeft, sigY + 9.5);

  const sigRightX = 138;
  doc.line(sigRightX, sigY + 5, rightBound, sigY + 5);
  doc.text(`For ${shop.name}`, sigRightX, sigY + 9.5);
  doc.setFontSize(6.2);
  doc.text('(Authorized Signatory)', sigRightX, sigY + 13.5);

  return doc;
}

export async function downloadEstimationPDF(estimation: Estimation, settings?: BusinessSettings) {
  const doc = await buildEstimationPDFDoc(estimation, settings);
  doc.save(`Estimation_${estimation.estimation_number}_Rev${estimation.version}.pdf`);
}

export async function shareEstimationPDF(estimation: Estimation, settings?: BusinessSettings): Promise<boolean> {
  if (navigator.share) {
    try {
      const doc = await buildEstimationPDFDoc(estimation, settings);
      const pdfBlob = doc.output('blob');
      const file = new File(
        [pdfBlob],
        `Estimation_${estimation.estimation_number}_Rev${estimation.version}.pdf`,
        { type: 'application/pdf' }
      );
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Jewellery Estimation - ${estimation.estimation_number}`,
          text: `Please find attached price estimation from Shankar Jewellery.`,
          files: [file],
        });
        return true;
      }
    } catch {
      // Fallback
    }
  }
  await downloadEstimationPDF(estimation, settings);
  return false;
}
