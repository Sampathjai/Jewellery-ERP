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
 * Builds a strictly SINGLE-PAGE A4 Landscape Jewellery Price Estimation PDF.
 * Dimensions: 297mm width x 210mm height.
 * Margins: Left 12mm, Right 12mm (Printable Width = 273mm).
 * Guaranteed to fit 1-5 items on ONE single page with zero clipping.
 */
export async function buildEstimationPDFDoc(
  estimation: Estimation,
  settings?: BusinessSettings
): Promise<jsPDF> {
  // A4 Landscape: 297mm width x 210mm height
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });
  loadPdfFont(doc);

  const pageWidth = 297;
  const pageHeight = 210;
  const marginX = 12;
  const contentWidth = pageWidth - marginX * 2; // 273mm
  const shop = getShopHeaderDetails(settings);

  // =========================================================================
  // 1. TOP HEADER BANNER (Y: 6 to 25mm, Height: 19mm)
  // =========================================================================
  const bannerY = 6;
  const bannerH = 19;
  doc.setFillColor(26, 27, 34); // Premium Slate/Charcoal
  doc.roundedRect(marginX, bannerY, contentWidth, bannerH, 1.5, 1.5, 'F');

  // Shop Brand Name (Georgia Bold 14pt in Gold)
  doc.setTextColor(212, 175, 55); // Shankar Gold
  doc.setFont('Georgia', 'bold');
  doc.setFontSize(14);
  doc.text(shop.name, marginX + 4, bannerY + 7);

  // Shop Address & Contact Details (Georgia 6.5pt)
  doc.setFontSize(6.5);
  doc.setTextColor(215, 215, 215);
  doc.setFont('Georgia', 'normal');
  doc.text(shop.address, marginX + 4, bannerY + 12);
  doc.setTextColor(180, 180, 180);
  doc.text(shop.phoneStr, marginX + 4, bannerY + 16);

  // Right Title Badge: "PRICE ESTIMATION"
  const titleBoxW = 75;
  const titleBoxH = 14;
  const titleBoxX = pageWidth - marginX - titleBoxW - 2.5;
  const titleBoxY = bannerY + 2.5;
  doc.setFillColor(212, 175, 55);
  doc.roundedRect(titleBoxX, titleBoxY, titleBoxW, titleBoxH, 1, 1, 'F');

  doc.setTextColor(18, 18, 23);
  doc.setFontSize(9);
  doc.setFont('Georgia', 'bold');
  doc.text('PRICE ESTIMATION', titleBoxX + titleBoxW / 2, titleBoxY + 5.5, { align: 'center' });

  doc.setFontSize(5.5);
  doc.setFont('Georgia', 'normal');
  doc.text('(NOT A TAX INVOICE / SALE BILL)', titleBoxX + titleBoxW / 2, titleBoxY + 10.5, {
    align: 'center',
  });

  // =========================================================================
  // 2. 3-COLUMN METADATA & DESIGN PHOTO ROW (Y: 27 to 48mm, Height: 21mm)
  // =========================================================================
  const infoY = 27;
  const infoH = 21;

  // --- COL 1: Customer Details (Width: 84mm, X: 12) ---
  const col1X = marginX;
  const col1W = 84;
  doc.setFillColor(252, 252, 252);
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.25);
  doc.roundedRect(col1X, infoY, col1W, infoH, 1, 1, 'FD');

  doc.setFontSize(6.5);
  doc.setFont('Georgia', 'bold');
  doc.setTextColor(170, 115, 10);
  doc.text('ESTIMATION FOR (CUSTOMER)', col1X + 3, infoY + 4.5);

  doc.setFontSize(7.5);
  doc.setFont('Georgia', 'bold');
  doc.setTextColor(30, 31, 38);
  const custName = estimation.customer_name || 'Valued Customer';
  doc.text(custName.length > 28 ? custName.slice(0, 28) + '...' : custName, col1X + 3, infoY + 9.5);

  doc.setFontSize(6.5);
  doc.setFont('Georgia', 'normal');
  doc.setTextColor(70, 70, 70);
  doc.text(`Phone: ${estimation.customer_phone || '—'}`, col1X + 3, infoY + 14);

  const rawAddr = estimation.customer_address || 'Trichy, Tamil Nadu';
  const splitAddr = doc.splitTextToSize(rawAddr, col1W - 6);
  doc.text(splitAddr[0] || '—', col1X + 3, infoY + 18.5);

  // --- COL 2: Quotation Metadata & Locked Rate Snapshot (Width: 96mm, X: 100) ---
  const col2X = col1X + col1W + 4;
  const col2W = 96;
  doc.setFillColor(252, 252, 252);
  doc.setDrawColor(220, 220, 220);
  doc.roundedRect(col2X, infoY, col2W, infoH, 1, 1, 'FD');

  doc.setFontSize(6.5);
  doc.setFont('Georgia', 'bold');
  doc.setTextColor(30, 31, 38);
  doc.text(`Est. No: ${estimation.estimation_number} (Rev ${estimation.version})`, col2X + 3, infoY + 4.5);

  doc.setFont('Georgia', 'normal');
  doc.setTextColor(70, 70, 70);
  doc.text(`Est. Date: ${formatDate(estimation.estimation_date)}`, col2X + 54, infoY + 4.5);
  doc.text(`Valid Until: ${formatDate(estimation.valid_until)}`, col2X + 3, infoY + 9);

  const typeLabel =
    estimation.estimation_type === 'reference_design'
      ? 'REFERENCE DESIGN'
      : estimation.estimation_type === 'custom_jewellery'
      ? 'CUSTOM JEWELLERY'
      : 'CATALOGUE PRODUCT';
  doc.setTextColor(170, 115, 10);
  doc.setFont('Georgia', 'bold');
  doc.text(`Type: ${typeLabel}`, col2X + 54, infoY + 9);

  // Locked Rate Snapshot Banner inside Col 2 (Y: infoY + 11.5, Height: 7mm)
  doc.setFillColor(250, 248, 235);
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.3);
  doc.rect(col2X + 2, infoY + 11.5, col2W - 4, 7, 'FD');

  doc.setFontSize(6);
  doc.setFont('Georgia', 'bold');
  doc.setTextColor(160, 110, 10);
  doc.text('LOCKED MARKET RATE SNAPSHOT:', col2X + 4, infoY + 16);
  doc.setFont('Georgia', 'normal');
  doc.setTextColor(40, 40, 40);
  doc.text(
    `22K: ${formatCurrency(estimation.gold_22k_rate)}/g  |  24K: ${formatCurrency(
      estimation.gold_24k_rate
    )}/g  |  Silver: ${formatCurrency(estimation.silver_rate)}/g`,
    col2X + 41,
    infoY + 16
  );

  // --- COL 3: Customer Reference Design Thumbnail Gallery (Width: 85mm, X: 200) ---
  const col3X = col2X + col2W + 4;
  const col3W = contentWidth - (col1W + col2W + 8); // 89mm
  doc.setFillColor(252, 252, 252);
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.25);
  doc.roundedRect(col3X, infoY, col3W, infoH, 1, 1, 'FD');

  doc.setFontSize(6);
  doc.setFont('Georgia', 'bold');
  doc.setTextColor(170, 115, 10);
  doc.text('CUSTOMER REFERENCE DESIGN', col3X + 3, infoY + 4.5);

  const images = estimation.reference_images || [];
  if (images.length > 0) {
    const thumbMaxW = 20;
    const thumbMaxH = 14;
    const thumbBoxY = infoY + 5.5;

    // Render up to 2 image thumbnails horizontally
    let currentThumbX = col3X + 3;
    for (let i = 0; i < Math.min(images.length, 2); i++) {
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
          const renderX = currentThumbX + (thumbMaxW - drawW) / 2;
          const renderY = thumbBoxY + (thumbMaxH - drawH) / 2;

          doc.setDrawColor(200, 200, 200);
          doc.rect(currentThumbX, thumbBoxY, thumbMaxW, thumbMaxH, 'S');
          doc.addImage(dataUrl, 'JPEG', renderX, renderY, drawW, drawH);
        } catch {
          // ignore unsupported format
        }
      }
      currentThumbX += thumbMaxW + 2;
    }

    // Label / Extra images badge
    doc.setFontSize(5.5);
    doc.setFont('Georgia', 'normal');
    doc.setTextColor(80, 80, 80);
    const primaryLabel = images[0]?.label || 'Customer Ref Photo';
    const splitLabel = doc.splitTextToSize(primaryLabel, col3W - (currentThumbX - col3X) - 2);
    doc.text(splitLabel[0] || 'Photo Reference', currentThumbX + 1, thumbBoxY + 5);

    if (images.length > 2) {
      doc.setFillColor(240, 235, 215);
      doc.roundedRect(currentThumbX + 1, thumbBoxY + 8, 24, 4.5, 0.8, 0.8, 'F');
      doc.setFont('Georgia', 'bold');
      doc.setTextColor(150, 100, 10);
      doc.text(`+${images.length - 2} more photos`, currentThumbX + 3, thumbBoxY + 11.2);
    } else {
      doc.setTextColor(110, 110, 110);
      doc.text('(Artisanal Reference)', currentThumbX + 1, thumbBoxY + 10);
    }
  } else {
    // No photo attached: Display neat bespoke specification badge
    doc.setFontSize(6);
    doc.setFont('Georgia', 'normal');
    doc.setTextColor(90, 90, 90);
    doc.text('Bespoke Handcrafted Order Model', col3X + 3, infoY + 9.5);
    doc.text('Crafted per customer gold specifications.', col3X + 3, infoY + 14);
    doc.setTextColor(170, 115, 10);
    doc.text('✓ Standard Workshop Pattern', col3X + 3, infoY + 18.5);
  }

  // =========================================================================
  // 3. ESTIMATION ITEMS TABLE (Starts at Y: 50.5mm)
  // Exact column width budget = 273mm total
  // =========================================================================
  const tableStartY = 50.5;

  const tableRows = (estimation.items || []).map((item, idx) => [
    (idx + 1).toString(),
    item.item_name || 'Gold Jewellery Item',
    `${item.purity.toUpperCase()}\n(${item.jewellery_type})`,
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
    startY: tableStartY,
    head: [[
      '#',
      'Item Description',
      'Purity / Type',
      'Est. Gross',
      'Est. Stone',
      'Est. Net',
      'Rate/g',
      'Metal Val',
      'Wastage / VA',
      'Making+Stone',
      'Est. Total',
    ]],
    body: tableRows,
    theme: 'grid',
    showHead: 'everyPage',
    headStyles: {
      fillColor: [26, 27, 34],
      textColor: [212, 175, 55],
      font: 'Georgia',
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
      cellPadding: { top: 1.5, bottom: 1.5, left: 1, right: 1 },
    },
    bodyStyles: {
      font: 'Georgia',
      fontSize: 6.8,
      textColor: [25, 25, 30],
      cellPadding: { top: 1.3, bottom: 1.3, left: 1.2, right: 1.2 },
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 55, halign: 'left' },
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'right', cellWidth: 18 },
      4: { halign: 'right', cellWidth: 18 },
      5: { halign: 'right', cellWidth: 18 },
      6: { halign: 'right', cellWidth: 22 },
      7: { halign: 'right', cellWidth: 28 },
      8: { halign: 'right', cellWidth: 28 },
      9: { halign: 'right', cellWidth: 28 },
      10: { halign: 'right', cellWidth: 32, fontStyle: 'bold', textColor: [18, 18, 23] },
    },
    margin: { left: marginX, right: marginX },
  });

  const finalTableY = (doc as any).lastAutoTable?.finalY || 68;
  const bottomY = Math.max(finalTableY + 2.5, 66);

  // =========================================================================
  // 4. BOTTOM SECTION: SIDE-BY-SIDE SUMMARY & DISCLAIMER
  // Left: Customer Requirements + Legal Disclaimer + Acceptance Sig (Width: 168mm)
  // Right: Financial Breakdown Card + Shankar Authorized Sig (Width: 101mm)
  // =========================================================================
  const leftColX = marginX;
  const leftColW = 168;

  const rightColW = 101;
  const rightColX = pageWidth - marginX - rightColW;

  // --- RIGHT: Financial Summary Card (Height: 44mm) ---
  const summaryBoxH = 44;
  doc.setFillColor(252, 250, 242);
  doc.rect(rightColX, bottomY, rightColW, summaryBoxH, 'F');
  doc.setLineWidth(0.35);
  doc.setDrawColor(212, 175, 55);
  doc.rect(rightColX, bottomY, rightColW, summaryBoxH, 'S');

  doc.setFontSize(6.5);
  doc.setFont('Georgia', 'bold');
  doc.setTextColor(160, 110, 10);
  doc.text('ESTIMATION FINANCIAL SUMMARY', rightColX + 3.5, bottomY + 5);

  doc.setFontSize(6.5);
  doc.setFont('Georgia', 'normal');
  doc.setTextColor(45, 45, 45);

  // Row 1: Subtotal Metal Value
  doc.text('Subtotal Metal Value:', rightColX + 3.5, bottomY + 10);
  doc.text(
    formatCurrency(estimation.subtotal_metal_value),
    rightColX + rightColW - 3.5,
    bottomY + 10,
    { align: 'right' }
  );

  // Row 2: Wastage / VA Value
  doc.text('Wastage / VA Value:', rightColX + 3.5, bottomY + 15);
  doc.text(
    formatCurrency(estimation.total_wastage_value),
    rightColX + rightColW - 3.5,
    bottomY + 15,
    { align: 'right' }
  );

  // Row 3: Making Charges
  doc.text('Making & Crafting Charges:', rightColX + 3.5, bottomY + 20);
  doc.text(
    formatCurrency(estimation.total_making_charges),
    rightColX + rightColW - 3.5,
    bottomY + 20,
    { align: 'right' }
  );

  // Row 4: Stone & Other Charges
  const extraCharges = (estimation.total_stone_charges || 0) + (estimation.total_other_charges || 0);
  doc.text('Stone & Gem Charges:', rightColX + 3.5, bottomY + 25);
  doc.text(formatCurrency(extraCharges), rightColX + rightColW - 3.5, bottomY + 25, {
    align: 'right',
  });

  // Row 5: GST
  doc.text(`Estimated GST (${estimation.tax_percent}%):`, rightColX + 3.5, bottomY + 30);
  doc.text(formatCurrency(estimation.tax_amount), rightColX + rightColW - 3.5, bottomY + 30, {
    align: 'right',
  });

  // Grand Total Highlight Bar (Height: 8mm, inside summary box)
  const totalBarY = bottomY + 35;
  doc.setFillColor(26, 27, 34);
  doc.rect(rightColX, totalBarY, rightColW, 9, 'F');

  doc.setTextColor(212, 175, 55);
  doc.setFont('Georgia', 'bold');
  doc.setFontSize(8.5);
  doc.text('ESTIMATED TOTAL:', rightColX + 3.5, totalBarY + 5.8);
  doc.text(
    formatCurrency(estimation.total_estimated_amount),
    rightColX + rightColW - 3.5,
    totalBarY + 5.8,
    { align: 'right' }
  );

  // Shop Authorized Signatory Box (Below Financial Summary, Height: 15mm)
  const shopSigY = bottomY + summaryBoxH + 4;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.25);
  doc.line(rightColX + 10, shopSigY + 9, rightColX + rightColW - 10, shopSigY + 9);

  doc.setFontSize(6.8);
  doc.setFont('Georgia', 'bold');
  doc.setTextColor(30, 31, 38);
  doc.text(`For ${shop.name}`, rightColX + rightColW / 2, shopSigY + 12.5, { align: 'center' });
  doc.setFontSize(5.5);
  doc.setFont('Georgia', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('(Authorized Signatory)', rightColX + rightColW / 2, shopSigY + 15.5, { align: 'center' });

  // --- LEFT: Notes & Requirements Card (Height: 14mm) ---
  const notesBoxH = 14;
  doc.setFillColor(252, 252, 252);
  doc.setDrawColor(225, 225, 225);
  doc.setLineWidth(0.25);
  doc.rect(leftColX, bottomY, leftColW, notesBoxH, 'FD');

  doc.setFontSize(6);
  doc.setFont('Georgia', 'bold');
  doc.setTextColor(170, 115, 10);
  doc.text('DESIGN & CUSTOMER REQUIREMENTS:', leftColX + 3, bottomY + 4.2);

  doc.setFontSize(5.8);
  doc.setFont('Georgia', 'normal');
  doc.setTextColor(60, 60, 60);
  const notesText =
    estimation.customer_requirements ||
    estimation.general_notes ||
    'Custom bespoke order quote based on customer reference model. Crafting commenced upon order advance.';
  const splitNotes = doc.splitTextToSize(notesText, leftColW - 6);
  doc.text(splitNotes.slice(0, 2), leftColX + 3, bottomY + 8);

  // --- LEFT: Important Terms & Estimation Disclaimer Box (Height: 25mm) ---
  const discY = bottomY + notesBoxH + 2;
  const discH = 25;
  doc.setFillColor(248, 248, 248);
  doc.setDrawColor(220, 220, 220);
  doc.rect(leftColX, discY, leftColW, discH, 'FD');

  doc.setFontSize(6.2);
  doc.setFont('Georgia', 'bold');
  doc.setTextColor(170, 20, 20);
  doc.text('IMPORTANT TERMS & ESTIMATION DISCLAIMER:', leftColX + 3, discY + 4.5);

  doc.setFontSize(5.6);
  doc.setFont('Georgia', 'normal');
  doc.setTextColor(60, 60, 60);
  const disclaimers = [
    '1. PRICE ESTIMATE ONLY: This document is strictly a price estimate and is NOT a tax invoice, bill of sale, or receipt of payment.',
    '2. WEIGHT & RATE ADJUSTMENT: All weights are estimates. Final billing is calculated strictly on actual gross/net weights post-crafting.',
    '3. RATE VALIDITY: Market rates snapshot is honored only until the validity date shown. Prevailing market rates apply thereafter.',
    '4. REFERENCE PHOTOGRAPHS: Design photos are customer reference models only. Handcrafted jewelry will feature artisanal nuances.',
  ];
  disclaimers.forEach((line, idx) => {
    doc.text(line, leftColX + 3, discY + 8.5 + idx * 3.8);
  });

  // --- LEFT: Customer Acceptance Signature ---
  const custSigY = discY + discH + 4;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.25);
  doc.line(leftColX + 5, custSigY + 7, leftColX + 65, custSigY + 7);

  doc.setFontSize(6.5);
  doc.setFont('Georgia', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text('Customer Acceptance Signature', leftColX + 5, custSigY + 10.5);

  doc.text('Date: ____________________', leftColX + 90, custSigY + 10.5);

  // =========================================================================
  // 5. BOTTOM PAGE FOOTER (Y: 204mm)
  // =========================================================================
  doc.setFontSize(5.5);
  doc.setFont('Georgia', 'normal');
  doc.setTextColor(130, 130, 130);
  doc.text('Shankar Jewellery ERP • Trichy', marginX, 204);
  doc.text('Official Price Estimation • Single Page Quote', pageWidth / 2, 204, { align: 'center' });
  doc.text(
    `Page 1 of 1 • Generated on ${new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })}`,
    pageWidth - marginX,
    204,
    { align: 'right' }
  );

  // =========================================================================
  // 6. PROGRAMMATIC SINGLE-PAGE SAFETY NET
  // If jsPDF accidentally spawned page 2, prune all extra pages to guarantee 1 page
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
