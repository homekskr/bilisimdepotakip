/**
 * Centralized Export Utility
 * Handles PDF (Print) and Excel (CSV) exports
 */

/**
 * Standardized PDF Export (using window.print approach)
 * @param {string} title - Report title
 * @param {Array} data - Data to export
 * @param {Array} columns - Column definitions { header: string, key: string, style?: string, transform?: Function }
 */
export function exportToPDF(title, data, columns) {
    const printWindow = window.open('', '_blank');
    const reportDate = new Date().toLocaleString('tr-TR');

    const tableHeaderHtml = columns.map(col => `<th style="${col.style || ''}">${col.header}</th>`).join('');

    const tableRowsHtml = data.map(item => {
        const cells = columns.map(col => {
            let val = col.key.split('.').reduce((obj, key) => obj?.[key], item);
            if (col.transform) val = col.transform(val, item);
            return `<td style="${col.style || ''}">${val ?? '-'}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
    }).join('');

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <style>
                @page { size: A4 portrait; margin: 1cm; }
                body { font-family: Arial, sans-serif; font-size: 10px; color: #000; margin: 0; padding: 0; }
                .pdf-header { text-align: center; margin-bottom: 20px; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 10px; font-size: 12px; }
                .pdf-report-date { text-align: right; margin-bottom: 5px; font-size: 9px; }
                table { width: 100%; border-collapse: collapse; table-layout: fixed; }
                th, td { border: 1px solid #000; padding: 4px; text-align: left; word-wrap: break-word; }
                th { background-color: #f2f2f2; }
                tr:nth-child(even) { background-color: #fafafa; }
            </style>
        </head>
        <body>
            <div class="pdf-report-date">RAPOR TARİHİ: ${reportDate}</div>
            <div class="pdf-header">
                KAHRAMANMARAŞ İL SAĞLIK MÜDÜRLÜĞÜ<br>
                BİLİŞİM DEPOSU ${title.toUpperCase()}
            </div>
            <table>
                <thead><tr>${tableHeaderHtml}</tr></thead>
                <tbody>${tableRowsHtml}</tbody>
            </table>
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(() => window.close(), 500);
                };
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

/**
 * Excel (CSV) Export with Turkish Character Support
 * @param {string} fileName - Base filename
 * @param {Array} data - Data to export
 * @param {Array} columns - Column definitions { header: string, key: string, transform?: Function }
 */
export function exportToExcel(fileName, data, columns) {
    // CSV Header
    const headers = columns.map(col => col.header).join(';');

    // CSV Rows
    const rows = data.map(item => {
        return columns.map(col => {
            let val = col.key.split('.').reduce((obj, key) => obj?.[key], item);
            if (col.transform) val = col.transform(val, item);

            // Clean value for CSV (remove semicolons, newlines, etc.)
            val = String(val ?? '').replace(/;/g, ',').replace(/\n/g, ' ').replace(/\r/g, '');
            return `"${val}"`;
        }).join(';');
    });

    const csvContent = "\uFEFF" + [headers, ...rows].join('\n'); // Add BOM for Excel Turkish support
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
