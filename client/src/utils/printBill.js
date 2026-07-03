export const printableBillStyles = `
  @import url("https://fonts.googleapis.com/css2?family=Dosis:wght@200..800&display=swap");

  @media print {
    @page {
      size: auto;
      margin: 12mm;
    }
    body {
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .bill-card {
      box-shadow: none !important;
      border-radius: 0 !important;
    }
    .bill-print-toolbar {
      display: none !important;
    }
  }

  body {
    font-family: "Dosis", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: #0f172a;
    background: #f7f7f8;
    margin: 0;
    padding: 24px;
  }

  .bill-print-toolbar {
    box-sizing: border-box;
    width: 440px;
    max-width: 100%;
    margin: 0 auto 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .bill-print-heading {
    margin: 0;
    font-size: 20px;
    line-height: 1.25;
    font-weight: 700;
    color: #111827;
  }

  .bill-print-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .bill-print-button {
    height: 38px;
    border: 0;
    border-radius: 8px;
    padding: 0 14px;
    font: inherit;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    color: #fff;
    background: #34ad54;
  }

  .bill-print-button:hover {
    background: #2f9b45;
  }

  .bill-print-button.secondary {
    color: #374151;
    background: #fff;
    border: 1px solid #e5e7eb;
  }

  .bill-print-button.secondary:hover {
    background: #f3f4f6;
  }

  .hidden {
    display: block !important;
  }

  .bill-card {
    box-sizing: border-box;
    width: 440px;
    max-width: 100%;
    margin: 0 auto;
    border-radius: 16px;
    background: #fff;
    padding: 24px;
    box-shadow: 0 18px 45px rgba(15, 23, 42, 0.16);
  }

  .bill-brand {
    margin: 0;
    text-align: center;
    font-size: 18px;
    font-weight: 900;
  }

  .bill-company {
    margin: 16px 0 0;
    font-size: 12px;
    line-height: 1.5;
    font-weight: 500;
  }

  .bill-title {
    margin: 28px 0 0;
    text-align: center;
    font-size: 20px;
    font-weight: 900;
  }

  .bill-info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 16px;
    margin-top: 24px;
    font-size: 12px;
    font-weight: 700;
  }

  .bill-address {
    margin-top: 18px;
    border-top: 1px dashed #d1d5db;
    padding-top: 14px;
    font-size: 12px;
    font-weight: 700;
  }

  .bill-address p {
    margin: 6px 0 0;
    font-weight: 500;
    line-height: 1.45;
  }

  .bill-items-header,
  .bill-item-row {
    display: grid;
    grid-template-columns: 36px 1.2fr 52px 72px 82px;
    align-items: start;
    font-size: 12px;
  }

  .bill-items-header {
    margin-top: 24px;
    border-bottom: 1px solid #9ca3af;
    padding-bottom: 12px;
    font-weight: 900;
  }

  .bill-item-row {
    padding: 14px 0;
    font-weight: 500;
  }

  .bill-item-name {
    font-weight: 800;
    line-height: 1.35;
  }

  .bill-center {
    text-align: center;
  }

  .bill-right {
    text-align: right;
  }

  .bill-subtotal {
    margin-top: 12px;
    border-top: 1px dashed #d1d5db;
    padding-top: 18px;
  }

  .bill-summary-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    margin-top: 8px;
    font-size: 14px;
    font-weight: 700;
  }

  .bill-total {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-top: 24px;
    border-top: 1px dashed #d1d5db;
    padding-top: 24px;
    font-size: 20px;
    font-weight: 900;
  }

  .bill-note {
    margin-top: 20px;
    border-top: 1px dashed #d1d5db;
    padding-top: 14px;
    font-size: 12px;
    font-style: italic;
    line-height: 1.45;
  }

  .bill-note span {
    font-weight: 900;
  }

  .bill-thanks {
    margin: 28px 0 0;
    text-align: center;
    font-size: 14px;
    font-weight: 700;
    font-style: italic;
  }
`;

export const openPrintableBillWindow = ({ title, content }) => {
  const printWindow = window.open("", "_blank", "width=800,height=600");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>${printableBillStyles}</style>
      </head>
      <body>
        <div class="bill-print-toolbar">
          <h1 class="bill-print-heading">${title}</h1>
          <div class="bill-print-actions">
            <button class="bill-print-button secondary" onclick="window.close()">Đóng</button>
            <button class="bill-print-button" onclick="window.print()">In hóa đơn</button>
          </div>
        </div>
        ${content}
      </body>
    </html>
  `);

  printWindow.document.close();
};
