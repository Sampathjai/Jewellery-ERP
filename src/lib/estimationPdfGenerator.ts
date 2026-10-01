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
  const doc = new jsPDF();
  loadPdfFont(doc);

  const shop = getShopHeaderDetails(settings);

  // Premium Header Banner
  doc.setFillColor(30, 31, 38);
  doc.rect(0, 0, 210, 38, 'F');

  // Shop Name & Accent
  doc.setTextColor(212, 175, 55); // Gold Accent
  doc.setFont('Georgia', 'bold');
  doc.setFontSize(20);
  doc.text(shop.name, 14, 17);

  doc.setFontSize(8);
  doc.setTextColor(200, 200, 200);
  doc.setFont('Georgia', 'normal');
  doc.text(shop.address, 14, 24);
  doc.text(shop.phoneStr, 14, 30);

  // Title Box
  doc.setFillColor(212, 175, 55);
  doc.rect(130, 10, 66, 18, 'F');
  doc.setTextColor(18, 18, 23);
  doc.setFontSize(10);
  doc.setFont('Georgia', 'bold');
  doc.text('PRICE ESTIMATION', 133, 17);
  doc.setFontSize(7);
  doc.setFont('Georgia', 'normal');
  doc.text('(NOT A TAX INVOICE / SALE BILL)', 133, 24);

  // Customer & Meta Info Section
  let currentY = 48;
  doc.setTextColor(30, 31, 38);
  doc.setFontSize(9);
  doc.setFont('Georgia', 'bold');
  doc.text('ESTIMATION FOR:', 14, currentY);

  doc.setFont('Georgia', 'normal');
  doc.text(`Customer: ${estimation.customer_name || 'Valued Customer'}`, 14, currentY + 6);
  if (estimation.customer_phone) {
    doc.text(`Phone: ${estimation.customer_phone}`, 14, currentY + 12);
  }
  if (estimation.customer_address) {
    doc.text(`Address: ${estimation.customer_address}`, 14, currentY + 18);
  }

  // Right column: Estimation details
  doc.setFont('Georgia', 'bold');
  doc.text(`Est. No: ${estimation.estimation_number} (Rev ${estimation.version})`, 130, currentY);
  doc.setFont('Georgia', 'normal');
  doc.text(`Est. Date: ${formatDate(estimation.estimation_date)}`, 130, currentY + 6);
  doc.text(`Valid Until: ${formatDate(estimation.valid_until)}`, 130, currentY + 12);

  const typeLabel =
    estimation.estimation_type === 'reference_design'
      ? 'REFERENCE DESIGN ESTIMATION'
      : estimation.estimation_type === 'custom_jewellery'
      ? 'CUSTOM JEWELLERY'
      : 'INVENTORY CATALOGUE';
  doc.setTextColor(184, 134, 11);
  doc.setFont('Georgia', 'bold');
  doc.text(`Type: ${typeLabel}`, 130, currentY + 18);

  currentY += 28;

  // Gold Rate Snapshot Card
  doc.setFillColor(250, 248, 240);
  doc.rect(14, currentY, 182, 14, 'F');
  doc.setLineWidth(0.3);
  doc.setDrawColor(212, 175, 55);
  doc.rect(14, currentY, 182, 14, 'S');

  doc.setFontSize(8);
  doc.setFont('Georgia', 'bold');
  doc.setTextColor(184, 134, 11);
  doc.text('LOCKED MARKET RATE SNAPSHOT:', 18, currentY + 9);
  doc.setFont('Georgia', 'normal');
  doc.setTextColor(40, 40, 40);
  doc.text(
    `Gold 22K (916): ${formatCurrency(estimation.gold_22k_rate)}/g  |  Gold 24K: ${formatCurrency(estimation.gold_24k_rate)}/g  |  Silver: ${formatCurrency(estimation.silver_rate)}/g`,
    80,
    currentY + 9
  );

  currentY += 20;

  // Customer Reference Images Section (if present)
  const images = estimation.reference_images || [];
  if (images.length > 0) {
    doc.setFont('Georgia', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 31, 38);
    doc.text('CUSTOMER REFERENCE DESIGN (PHOTOGRAPHS PROVIDED BY CUSTOMER):', 14, currentY);
    currentY += 5;

    let imgX = 14;
    const imgWidth = 35;
    const imgHeight = 35;

    for (let i = 0; i < Math.min(images.length, 4); i++) {
      const img = images[i];
      const dataUrl = await getImageDataUrl(img.image_url);
      if (dataUrl) {
        try {
          doc.rect(imgX, currentY, imgWidth, imgHeight, 'S');
          doc.addImage(dataUrl, 'JPEG', imgX + 1, currentY + 1, imgWidth - 2, imgHeight - 2);
          doc.setFontSize(6.5);
          doc.setFont('Georgia', 'normal');
          doc.setTextColor(80, 80, 80);
          const label = img.label || `Ref #${i + 1}`;
          doc.text(label, imgX + 2, currentY + imgHeight + 4);
        } catch {
          // In case jsPDF encounters unsupported image format
        }
      }
      imgX += imgWidth + 8;
    }

    currentY += imgHeight + 9;
  }

  // Items Table
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
      'Est. Gross (g)',
      'Est. Stone (g)',
      'Est. Net (g)',
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
      fontSize: 7.5,
      halign: 'center',
    },
    bodyStyles: {
      font: 'Georgia',
      fontSize: 7.5,
      textColor: [30, 31, 38],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 42 },
      2: { halign: 'right', cellWidth: 16 },
      3: { halign: 'right', cellWidth: 16 },
      4: { halign: 'right', cellWidth: 16 },
      5: { halign: 'right', cellWidth: 18 },
      6: { halign: 'right', cellWidth: 20 },
      7: { halign: 'right', cellWidth: 24 },
      8: { halign: 'right', cellWidth: 20 },
      9: { halign: 'right', cellWidth: 22, fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  const finalTableY = (doc as any).lastAutoTable?.finalY || currentY + 40;
  let summaryY = finalTableY + 8;

  // If near page bottom, add a new page
  if (summaryY > 210) {
    doc.addPage();
    summaryY = 20;
  }

  // Summary Card on right
  const summaryBoxWidth = 85;
  const summaryBoxX = 210 - 14 - summaryBoxWidth;

  doc.setFillColor(250, 248, 240);
  doc.rect(summaryBoxX, summaryY, summaryBoxWidth, 48, 'F');
  doc.setLineWidth(0.4);
  doc.setDrawColor(212, 175, 55);
  doc.rect(summaryBoxX, summaryY, summaryBoxWidth, 48, 'S');

  doc.setFontSize(8);
  doc.setFont('Georgia', 'normal');
  doc.setTextColor(50, 50, 50);

  doc.text('Subtotal Metal Value:', summaryBoxX + 4, summaryY + 8);
  doc.text(formatCurrency(estimation.subtotal_metal_value), summaryBoxX + summaryBoxWidth - 4, summaryY + 8, { align: 'right' });

  doc.text('Wastage / VA Value:', summaryBoxX + 4, summaryY + 14);
  doc.text(formatCurrency(estimation.total_wastage_value), summaryBoxX + summaryBoxWidth - 4, summaryY + 14, { align: 'right' });

  doc.text('Total Making & Crafting:', summaryBoxX + 4, summaryY + 20);
  doc.text(formatCurrency(estimation.total_making_charges), summaryBoxX + summaryBoxWidth - 4, summaryY + 20, { align: 'right' });

  if (estimation.total_stone_charges > 0) {
    doc.text('Stone / Gem Charges:', summaryBoxX + 4, summaryY + 26);
    doc.text(formatCurrency(estimation.total_stone_charges), summaryBoxX + summaryBoxWidth - 4, summaryY + 26, { align: 'right' });
  }

  if (estimation.tax_amount > 0) {
    doc.text(`Estimated GST (${estimation.tax_percent}%):`, summaryBoxX + 4, summaryY + 32);
    doc.text(formatCurrency(estimation.tax_amount), summaryBoxX + summaryBoxWidth - 4, summaryY + 32, { align: 'right' });
  }

  // Grand Total Highlight Bar
  doc.setFillColor(30, 31, 38);
  doc.rect(summaryBoxX, summaryY + 38, summaryBoxWidth, 10, 'F');
  doc.setTextColor(212, 175, 55);
  doc.setFont('Georgia', 'bold');
  doc.setFontSize(9);
  doc.text('ESTIMATED TOTAL:', summaryBoxX + 4, summaryY + 44);
  doc.text(formatCurrency(estimation.total_estimated_amount), summaryBoxX + summaryBoxWidth - 4, summaryY + 44, { align: 'right' });

  // Notes on left of summary box
  doc.setFontSize(8);
  doc.setFont('Georgia', 'bold');
  doc.setTextColor(30, 31, 38);
  doc.text('DESIGN & CUSTOMER REQUIREMENTS:', 14, summaryY + 6);
  doc.setFont('Georgia', 'normal');
  doc.setTextColor(70, 70, 70);
  const notesText = estimation.customer_requirements || estimation.general_notes || 'Bespoke custom order estimation based on customer reference photograph.';
  const splitNotes = doc.splitTextToSize(notesText, 90);
  doc.text(splitNotes, 14, summaryY + 12);

  let disclaimerY = summaryY + 56;
  if (disclaimerY > 230) {
    doc.addPage();
    disclaimerY = 20;
  }

  // Mandatory Legal & Commercial Disclaimer Box
  doc.setFillColor(245, 245, 245);
  doc.rect(14, disclaimerY, 182, 32, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(14, disclaimerY, 182, 32, 'S');

  doc.setFontSize(7.5);
  doc.setFont('Georgia', 'bold');
  doc.setTextColor(180, 0, 0);
  doc.text('IMPORTANT TERMS & ESTIMATION DISCLAIMER:', 18, disclaimerY + 6);

  doc.setFont('Georgia', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(6.5);
  const disclaimers = [
    '1. This document is strictly a PRICE ESTIMATE and is NOT a tax invoice, bill of sale, or receipt of payment.',
    '2. Design photographs are customer-provided reference models only. Slight aesthetic variations are inherent to handcrafted jewelry.',
    '3. All weights shown are ESTIMATES. Final billing will be calculated strictly based on actual gross and net weights measured upon completion.',
    '4. Rate snapshot is honored only until the validity date. Market rates at the time of final advance booking will apply if expired.',
    '5. Manufacturing commences only after design approval and advance payment confirmation.',
  ];
  disclaimers.forEach((line, idx) => {
    doc.text(line, 18, disclaimerY + 11 + idx * 4);
  });

  // Signatures
  const sigY = disclaimerY + 40;
  doc.setFontSize(8);
  doc.setFont('Georgia', 'normal');
  doc.setTextColor(50, 50, 50);

  doc.line(18, sigY + 8, 70, sigY + 8);
  doc.text('Customer Acceptance Signature', 18, sigY + 13);

  doc.line(140, sigY + 8, 192, sigY + 8);
  doc.text(`For ${shop.name}`, 140, sigY + 13);
  doc.setFontSize(7);
  doc.text('(Authorized Signatory)', 140, sigY + 17);

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
