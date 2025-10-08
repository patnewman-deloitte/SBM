import type { CampaignPlan, Objective } from '../store/offerStore';
import { estimateCac, estimatePlanSpend } from './planMath';

const downloadBlob = (content: Blob, filename: string) => {
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const escapeCell = (value: string | number) => {
  const str = String(value);
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const exportPlanCsv = (plan: CampaignPlan, objective: Objective, cohortName: string) => {
  const spend = estimatePlanSpend(plan);
  const cac = estimateCac(plan);
  const header = [
    ['Cohort', cohortName],
    ['Goal', objective.goal],
    ['Payback target (mo)', objective.paybackTarget],
    ['Margin target (%)', objective.marginTarget],
    ['CAC ceiling ($)', objective.cacCeiling],
    ['Budget ($)', objective.budget],
    ['Estimated spend ($)', spend],
    ['Estimated CAC ($)', cac],
    [],
    ['Plan field', 'Value']
  ];
  const planRows = [
    ['Price ($)', plan.price.toFixed(2)],
    ['Promo depth (%)', plan.promoDepthPct.toFixed(1)],
    ['Promo months', plan.promoMonths],
    ['Device subsidy ($)', plan.deviceSubsidy.toFixed(2)],
    ['Inventory hold', plan.inventoryHold ? 'Yes' : 'No'],
    ['Channel mix Search (%)', plan.channelMix.Search.toFixed(2)],
    ['Channel mix Social (%)', plan.channelMix.Social.toFixed(2)],
    ['Channel mix Email (%)', plan.channelMix.Email.toFixed(2)],
    ['Channel mix Retail (%)', plan.channelMix.Retail.toFixed(2)],
    ['Payback (mo)', plan.kpis.paybackMo.toFixed(2)],
    ['Payback range (mo)', `${plan.kpis.paybackRange[0]} - ${plan.kpis.paybackRange[1]}`],
    ['Conversion (%)', plan.kpis.conversionPct.toFixed(2)],
    ['Conversion range (%)', `${plan.kpis.conversionRange[0]} - ${plan.kpis.conversionRange[1]}`],
    ['Margin (%)', plan.kpis.marginPct.toFixed(2)],
    ['Margin range (%)', `${plan.kpis.marginRange[0]} - ${plan.kpis.marginRange[1]}`],
    [],
    ['Calendar', 'Week', 'Intensity']
  ];

  const calendarRows: (string | number)[][] = [];
  const channels: [string, number[]][] = [
    ['Search', plan.calendar[0] ?? []],
    ['Social', plan.calendar[1] ?? []],
    ['Email', plan.calendar[2] ?? []],
    ['Retail', plan.calendar[3] ?? []]
  ];

  channels.forEach(([channel, weeks]) => {
    weeks.forEach((intensity, idx) => {
      calendarRows.push([channel, idx + 1, intensity]);
    });
  });

  const allRows = [...header, ...planRows, ...calendarRows];
  const csv = allRows.map((row) => row.map(escapeCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `campaign-plan-${Date.now()}.csv`);
};

const collectCssText = () => {
  const cssTexts: string[] = [];
  Array.from(document.styleSheets).forEach((sheet) => {
    try {
      const rules = sheet.cssRules;
      if (!rules) return;
      cssTexts.push(Array.from(rules).map((rule) => rule.cssText).join('\n'));
    } catch (error) {
      // Ignore cross-origin styles
    }
  });
  return cssTexts.join('\n');
};

export const exportPlanPng = async (elementId: string) => {
  const node = document.getElementById(elementId);
  if (!node) return;
  const rect = node.getBoundingClientRect();
  const width = Math.ceil(rect.width);
  const height = Math.ceil(rect.height);
  const cssText = collectCssText();
  const clone = node.cloneNode(true) as HTMLElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  clone.style.backgroundColor = '#0f172a';
  clone.style.color = '#f8fafc';
  const serialized = new XMLSerializer().serializeToString(clone);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;background:#0f172a;color:#f8fafc;">
      <style>${cssText}</style>
      ${serialized}
    </div>
  </foreignObject>
</svg>`;
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const image = new Image();
  const scale = window.devicePixelRatio || 1;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    URL.revokeObjectURL(url);
    return;
  }
  await new Promise<void>((resolve) => {
    image.onload = () => {
      ctx.scale(scale, scale);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(image, 0, 0, width, height);
      resolve();
    };
    image.onerror = () => resolve();
    image.src = url;
  });
  URL.revokeObjectURL(url);
  const data = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = data;
  link.download = `campaign-plan-${Date.now()}.png`;
  link.click();
};
