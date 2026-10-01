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
    settings?.state && settings?.pin_code
      ? `${settings.state} - ${settings.pin_code}`
      : settings?.state || settings?.pin_code,
  ]
    .filter(Boolean)
    .join(', ');
  const address = addressParts || 'No.4 sandhukadai, bigbazzar street, Trichy - 620008';
  const phoneStr = `Phone: ${settings?.phone || '+91 98765 43210'}${
    settings?.gstin ? ` | GSTIN: ${settings.gstin}` : ''
  }`;
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

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve({ width: 1, height: 1 });
      return;
    }
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth || img.width || 1,
        height: img.naturalHeight || img.height || 1,
      });
    };
    img.onerror = () => resolve({ width: 1, height: 1 });
    img.src = dataUrl;
  });
}

/**
 * Builds a strictly SINGLE-PAGE A4 PORTRAIT Jewellery Price Estimation PDF.
 * Dimensions: 210mm width x 297mm height.
 * Margins: Left 12mm, Right 12mm (Available Table Width = 186mm).
 * Guaranteed to fit 1-5 items on ONE single page with zero clipping.
 */
export async function buildEstimationPDFDoc(
  estimation: Estimation,
  settings?: BusinessSettings
): Promise<jsPDF> {
  // A4 Portrait: 210mm width x 297mm height
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  loadPdfFont(doc);

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 12;
  const contentWidth = pageWidth - marginX * 2; // 186mm
  const shop = getShopHeaderDetails(settings);

  // =========================================================================
  // 1. TOP HEADER BANNER (Y: 0 to 30mm, Height: 30mm)
  // =========================================================================
  doc.setFillColor(30, 31, 38); // Premium Dark Background
  doc.rect(0, 0, pageWidth, 30, 'F');

  // Shop Name in Gold Accent
  doc.setTextColor(212, 175, 55); // Shankar Gold
  doc.setFont('Georgia', 'bold');
  doc.setFontSize(16);
  doc.text(shop.name, marginX, 13);

  // Address & Phone
  doc.setFontSize(6.8);
  doc.setTextColor(210, 210, 210);
  doc.setFont('Georgia', 'normal');
  doc.text(shop.address, marginX, 19);
  doc.setTextColor(180, 180, 180);
  doc.text(shop.phoneStr, marginX, 24);

  // Right Title Box: "PRICE ESTIMATION"
  const titleBoxW = 68;
  const titleBoxH = 16;
  const titleBoxX = pageWidth - marginX - titleBoxW;
  doc.setFillColor(212, 175, 55);
  doc.rect(titleBoxX, 7, titleBoxW, titleBoxH, 'F');

  doc.setTextColor(18, 18, 23);
  doc.setFontSize(9.5);
  doc.setFont('Georgia', 'bold');
  doc.text('PRICE ESTIMATION', titleBoxX + titleBoxW / 2, 13, { align: 'center' });

  doc.setFontSize(5.8);
  doc.setFont('Georgia', 'normal');
  doc.text('(NOT A TAX INVOICE / SALE BILL)', titleBoxX + titleBoxW / 2, 19, { align: 'center' });

  // =========================================================================
  // 2. CUSTOMER & METADATA SECTION (Y: 34 to 55mm, Height: 21mm)
  // =========================================================================
  let currentY = 34;

  // Left Column: Customer details
  doc.setTextColor(30, 31, 38);
  doc.setFontSize(7.5);
  doc.setFont('Georgia', 'bold');
  doc.text('ESTIMATION FOR:', marginX, currentY + 3.5);

  doc.setFont('Georgia', 'normal');
  doc.setFontSize(7.5);
  const custName = estimation.customer_name || 'Valued Customer';
  doc.text(`Customer: ${custName}`, marginX, currentY + 8.5);

  doc.setFontSize(7);
  doc.setTextColor(60, 60, 60);
  doc.text(`Phone: ${estimation.customer_phone || '—'}`, marginX, currentY + 13);

  const rawAddr = estimation.customer_address || 'Trichy, Tamil Nadu';
  const splitAddr = doc.splitTextToSize(`Address: ${rawAddr}`, 105);
  doc.text(splitAddr[0] || 'Address: —', marginX, currentY + 17.5);

  // Right Column: Quotation Metadata
  const metaX = 125;
  doc.setFontSize(7.5);
  doc.setFont('Georgia', 'bold');
  doc.setTextColor(30, 31, 38);
  doc.text(`Est. No: ${estimation.estimation_number} (Rev ${estimation.version})`, metaX, currentY + 3.5);

  doc.setFont('Georgia', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(60, 60, 60);
  doc.text(`Est. Date: ${formatDate(estimation.estimation_date)}`, metaX, currentY + 8.5);
  doc.text(`Valid Until: ${formatDate(estimation.valid_until)}`, metaX, currentY + 13);

  const typeLabel =
    estimation.estimation_type === 'reference_design'
      ? 'REFERENCE DESIGN'
      : estimation.estimation_type === 'custom_jewellery'
      ? 'CUSTOM JEWELLERY'
      : 'INVENTORY CATALOGUE';
  doc.setTextColor(184, 134, 11);
  doc.setFont('Georgia', 'bold');
  doc.text(`Type: ${typeLabel}`, metaX, currentY + 17.5);

  currentY += 21;

  // =========================================================================
  // 3. GOLD RATE SNAPSHOT CARD (Y: 56 to 66mm, Height: 10mm)
  // =========================================================================
  doc.setFillColor(250, 248, 240);
  doc.rect(marginX, currentY, contentWidth, 10, 'F');
  doc.setLineWidth(0.3);
  doc.setDrawColor(212, 175, 55);
  doc.rect(marginX, currentY, contentWidth, 10, 'S');

  doc.setFontSize(6.8);
  doc.setFont('Georgia', 'bold');
  doc.setTextColor(184, 134, 11);
  doc.text('LOCKED MARKET RATE SNAPSHOT:', marginX + 3, currentY + 6.5);

  doc.setFont('Georgia', 'normal');
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(6.6);
  doc.text(
    `Gold 22K (916): ${formatCurrency(estimation.gold_22k_rate)}/g   |   Gold 24K: ${formatCurrency(
      estimation.gold_24k_rate
    )}/g   |   Silver: ${formatCurrency(estimation.silver_rate)}/g`,
    marginX + 54,
    currentY + 6.5
  );

  currentY += 13;

  // =========================================================================
  // 4. CUSTOMER REFERENCE IMAGES SECTION (Compact & Aspect-Preserved)
  // =========================================================================
  const images = estimation.reference_images || [];
  if (images.length > 0) {
    doc.setFont('Georgia', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(30, 31, 38);
    doc.text('CUSTOMER REFERENCE DESIGN (PHOTOGRAPHS PROVIDED BY CUSTOMER):', marginX, currentY);
    currentY += 3.5;

    let imgX = marginX;
    const thumbMaxW = 28;
    const thumbMaxH = 22;

    for (let i = 0; i < Math.min(images.length, 3); i++) {
      const img = images[i];
      const dataUrl = await getImageDataUrl(img.image_url);
      if (dataUrl) {
        try {
          const dims = await getImageDimensions(dataUrl);
          const aspect = dims.width / dims.height;
          let drawW = thumbMaxW;
          let drawH = drawW / aspect;
          if (drawH > thumbMaxH) {
            drawH = thumbMaxH;
            drawW = drawH * aspect;
          }
          const renderX = imgX + (thumbMaxW - drawW) / 2;
          const renderY = currentY + (thumbMaxH - drawH) / 2;

          doc.setDrawColor(210, 210, 210);
          doc.rect(imgX, currentY, thumbMaxW, thumbMaxH, 'S');
          doc.addImage(dataUrl, 'JPEG', renderX, renderY, drawW, drawH);

          doc.setFontSize(5.5);
          doc.setFont('Georgia', 'normal');
          doc.setTextColor(80, 80, 80);
          const label = img.label || `Ref #${i + 1}`;
          doc.text(label, imgX + 1, currentY + thumbMaxH + 3.2);
        } catch {
          // ignore unsupported format
        }
      }
      imgX += thumbMaxW + 6;
    }

    if (images.length > 3) {
      doc.setFontSize(6);
      doc.setFont('Georgia', 'bold');
      doc.setTextColor(170, 115, 10);
      doc.text(`+${images.length - 3} more reference photos`, imgX + 2, currentY + thumbMaxH / 2);
    }

    currentY += thumbMaxH + 5.5;
  }

  // =========================================================================
  // 5. ESTIMATION ITEMS TABLE (A4 Portrait Width Budget = 186mm)
  // Exact column width budget:
  // # (7) + Item (38) + Gross (14) + Stone (13) + Net (14) + Rate (16)
  // + Metal (20) + Wastage (20) + Making (18) + Est. Total (26) = 186mm EXACT
  // =========================================================================
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
      'Rate\n₹/g',
      'Metal Val\n₹',
      'Wastage\n(VA)',
      'Making\n+Stone',
      'Est. Total\n₹',
    ]],
    body: tableRows,
    theme: 'grid',
    showHead: 'everyPage',
    headStyles: {
      fillColor: [30, 31, 38],
      textColor: [212, 175, 55],
      font: 'Georgia',
      fontStyle: 'bold',
      fontSize: 6.8,
      halign: 'center',
      valign: 'middle',
      cellPadding: { top: 1.5, bottom: 1.5, left: 0.8, right: 0.8 },
    },
    bodyStyles: {
      font: 'Georgia',
      fontSize: 6.5,
      textColor: [25, 25, 30],
      cellPadding: { top: 1.5, bottom: 1.5, left: 1, right: 1 },
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 7 },
      1: { cellWidth: 38, halign: 'left' },
      2: { halign: 'right', cellWidth: 14 },
      3: { halign: 'right', cellWidth: 13 },
      4: { halign: 'right', cellWidth: 14 },
      5: { halign: 'right', cellWidth: 16 },
      6: { halign: 'right', cellWidth: 20 },
      7: { halign: 'right', cellWidth: 20 },
      8: { halign: 'right', cellWidth: 18 },
      9: { halign: 'right', cellWidth: 26, fontStyle: 'bold', textColor: [18, 18, 23] },
    },
    margin: { left: marginX, right: marginX },
  });

  const finalTableY = (doc as any).lastAutoTable?.finalY || currentY + 30;
  const summaryY = finalTableY + 5;

  // =========================================================================
  // 6. TOTALS & REQUIREMENTS SECTION (Side-by-side)
  // Right: Summary Card (Width: 85mm)
  // Left: Design Notes / Customer Requirements (Width: 96mm)
  // =========================================================================
  const summaryBoxWidth = 85;
  const summaryBoxX = pageWidth - marginX - summaryBoxWidth;

  doc.setFillColor(250, 248, 240);
  doc.rect(summaryBoxX, summaryY, summaryBoxWidth, 42, 'F');
  doc.setLineWidth(0.35);
  doc.setDrawColor(212, 175, 55);
  doc.rect(summaryBoxX, summaryY, summaryBoxWidth, 42, 'S');

  doc.setFontSize(7);
  doc.setFont('Georgia', 'normal');
  doc.setTextColor(50, 50, 50);

  doc.text('Subtotal Metal Value:', summaryBoxX + 3.5, summaryY + 6);
  doc.text(
    formatCurrency(estimation.subtotal_metal_value),
    summaryBoxX + summaryBoxWidth - 3.5,
    summaryY + 6,
    { align: 'right' }
  );

  doc.text('Wastage / VA Value:', summaryBoxX + 3.5, summaryY + 11);
  doc.text(
    formatCurrency(estimation.total_wastage_value),
    summaryBoxX + summaryBoxWidth - 3.5,
    summaryY + 11,
    { align: 'right' }
  );

  doc.text('Total Making & Crafting:', summaryBoxX + 3.5, summaryY + 16);
  doc.text(
    formatCurrency(estimation.total_making_charges),
    summaryBoxX + summaryBoxWidth - 3.5,
    summaryY + 16,
    { align: 'right' }
  );

  const extraCharges = (estimation.total_stone_charges || 0) + (estimation.total_other_charges || 0);
  doc.text('Stone / Gem Charges:', summaryBoxX + 3.5, summaryY + 21);
  doc.text(formatCurrency(extraCharges), summaryBoxX + summaryBoxWidth - 3.5, summaryY + 21, {
    align: 'right',
  });

  doc.text(`Estimated GST (${estimation.tax_percent}%):`, summaryBoxX + 3.5, summaryY + 26);
  doc.text(
    formatCurrency(estimation.tax_amount),
    summaryBoxX + summaryBoxWidth - 3.5,
    summaryY + 26,
    { align: 'right' }
  );

  // Grand Total Highlight Bar
  doc.setFillColor(30, 31, 38);
  doc.rect(summaryBoxX, summaryY + 31, summaryBoxWidth, 11, 'F');
  doc.setTextColor(212, 175, 55);
  doc.setFont('Georgia', 'bold');
  doc.setFontSize(8.5);
  doc.text('ESTIMATED TOTAL:', summaryBoxX + 3.5, summaryY + 38);
  doc.text(
    formatCurrency(estimation.total_estimated_amount),
    summaryBoxX + summaryBoxWidth - 3.5,
    summaryY + 38,
    { align: 'right' }
  );

  // Notes on left of summary box
  doc.setFontSize(7);
  doc.setFont('Georgia', 'bold');
  doc.setTextColor(30, 31, 38);
  doc.text('DESIGN & CUSTOMER REQUIREMENTS:', marginX, summaryY + 5);
  doc.setFont('Georgia', 'normal');
  doc.setTextColor(70, 70, 70);
  doc.setFontSize(6.2);
  const notesText =
    estimation.customer_requirements ||
    estimation.general_notes ||
    'Bespoke custom order estimation based on customer reference photograph. Crafting commences upon order confirmation.';
  const splitNotes = doc.splitTextToSize(notesText, summaryBoxX - marginX - 6);
  doc.text(splitNotes.slice(0, 5), marginX, summaryY + 10);

  // =========================================================================
  // 7. MANDATORY LEGAL & COMMERCIAL DISCLAIMER BOX (A4 Portrait Width = 186mm)
  // =========================================================================
  const disclaimerY = summaryY + 46;
  const disclaimerH = 26;

  doc.setFillColor(245, 245, 245);
  doc.rect(marginX, disclaimerY, contentWidth, disclaimerH, 'F');
  doc.setDrawColor(215, 215, 215);
  doc.rect(marginX, disclaimerY, contentWidth, disclaimerH, 'S');

  doc.setFontSize(6.8);
  doc.setFont('Georgia', 'bold');
  doc.setTextColor(180, 0, 0);
  doc.text('IMPORTANT TERMS & ESTIMATION DISCLAIMER:', marginX + 3.5, disclaimerY + 5);

  doc.setFont('Georgia', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(5.8);
  const disclaimers = [
    '1. This document is strictly a PRICE ESTIMATE and is NOT a tax invoice, bill of sale, or receipt of payment.',
    '2. Design photographs are customer-provided reference models only. Slight aesthetic variations are inherent to handcrafted jewelry.',
    '3. All weights shown are ESTIMATES. Final billing will be calculated strictly based on actual gross and net weights measured upon completion.',
    '4. Rate snapshot is honored only until the validity date. Market rates at the time of final advance booking will apply if expired.',
    '5. Manufacturing commences only after design approval and advance payment confirmation.',
  ];
  disclaimers.forEach((line, idx) => {
    doc.text(line, marginX + 3.5, disclaimerY + 9 + idx * 3.4);
  });

  // =========================================================================
  // 8. SIGNATURES & BOTTOM FOOTER
  // =========================================================================
  const sigY = disclaimerY + disclaimerH + 4;
  doc.setFontSize(7.2);
  doc.setFont('Georgia', 'normal');
  doc.setTextColor(50, 50, 50);

  // Customer Signature
  doc.setLineWidth(0.25);
  doc.setDrawColor(180, 180, 180);
  doc.line(marginX + 4, sigY + 7, marginX + 64, sigY + 7);
  doc.text('Customer Acceptance Signature', marginX + 4, sigY + 11.5);

  // Authorized Signatory
  const rightSigX = pageWidth - marginX - 60;
  doc.line(rightSigX, sigY + 7, rightSigX + 60, sigY + 7);
  doc.text(`For ${shop.name}`, rightSigX, sigY + 11.5);
  doc.setFontSize(6);
  doc.text('(Authorized Signatory)', rightSigX, sigY + 15);

  // Bottom Page Footer
  doc.setFontSize(5.5);
  doc.setFont('Georgia', 'normal');
  doc.setTextColor(140, 140, 140);
  doc.text('Shankar Jewellery ERP • Trichy', marginX, pageHeight - 6);
  doc.text('Official Price Estimation • Single Page Quote', pageWidth / 2, pageHeight - 6, {
    align: 'center',
  });
  doc.text(
    `Page 1 of 1 • Generated on ${new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })}`,
    pageWidth - marginX,
    pageHeight - 6,
    { align: 'right' }
  );

  // =========================================================================
  // 9. PROGRAMMATIC SINGLE-PAGE SAFETY NET
  // Prunes any trailing page if accidentally generated
  // =========================================================================
  const totalPages = (doc as any).internal.getNumberOfPages();
  if (totalPages > 1) {
    while ((doc as any).internal.getNumberOfPages() > 1) {
      doc.deletePage(2);
    }
  }

  return doc;
}

export async function downloadEstimationPDF(estimation: Estimation, settings?: BusinessSettings) {
  const doc = await buildEstimationPDFDoc(estimation, settings);
  doc.save(`Estimation_${estimation.estimation_number}_Rev${estimation.version}.pdf`);
}

export async function shareEstimationPDF(
  estimation: Estimation,
  settings?: BusinessSettings
): Promise<boolean> {
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
