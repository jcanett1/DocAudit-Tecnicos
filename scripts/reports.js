// ============================================================
//  reports.js  –  Módulo de Reportes PDF para DocAudit-Tecnicos
//  Genera:
//    1. PDF de Estadísticas completas (rango de fechas seleccionado)
//    2. PDF de Reporte Diario (errores por tipo y por celda del día)
// ============================================================

class ReportsModule {
    constructor() {
        this.ERROR_LABELS = {
            components_error:          'Components',
            tipping_error:             'Tipping',
            hosel_setting_error:       'Hosel Setting',
            shaft_stepping_error:      'Shaft Stepping',
            wood_putter_weights_error: 'Wood/Putter Weights',
            club_length_error:         'Club Length',
            shaft_alignment_error:     'Shaft Alignment',
            ferrules_error:            'Ferrules',
            loft_error:                'Loft',
            lie_error:                 'Lie',
            grip_alignment_error:      'Grip Alignment',
            grip_length_error:         'Grip Length',
            wraps_error:               'Wraps',
            swing_weight_error:        'Swing Weight',
            cleanliness_error:         'Cleanliness',
            boxing_error:              'Boxing'
        };

        this.ERROR_FIELDS = Object.keys(this.ERROR_LABELS);
        this.BRAND_COLOR  = [102, 126, 234];  // #667eea
        this.RED_COLOR    = [220, 53, 69];
        this.GREEN_COLOR  = [40, 167, 69];
        this.GRAY_COLOR   = [108, 117, 125];

        this.bindEvents();
    }

    // ── Utilidades ───────────────────────────────────────────
    formatDate(dateStr) {
        if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr || '-';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    }

    getLocalDateString(date = new Date()) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    getTotalErrors(audit) {
        return this.ERROR_FIELDS.reduce((s, f) => s + (parseInt(audit[f]) || 0), 0);
    }

    // ── Eventos ──────────────────────────────────────────────
    bindEvents() {
        document.getElementById('downloadStatsPdfBtn')
            ?.addEventListener('click', () => this.downloadStatsPDF());

        document.getElementById('downloadDailyReportBtn')
            ?.addEventListener('click', () => this.downloadDailyReport());
    }

    // Habilitar/deshabilitar botones según si hay datos cargados
    enableButtons(enable) {
        const pdfBtn   = document.getElementById('downloadStatsPdfBtn');
        const dailyBtn = document.getElementById('downloadDailyReportBtn');
        if (pdfBtn)   { pdfBtn.disabled   = !enable; pdfBtn.title   = enable ? 'Descargar PDF de estadísticas' : 'Carga las estadísticas primero'; }
        if (dailyBtn) { dailyBtn.disabled = !enable; dailyBtn.title = enable ? 'Descargar reporte diario de errores por celda' : 'Carga las estadísticas primero'; }
    }

    // ── Helpers de PDF ───────────────────────────────────────
    newDoc() {
        const { jsPDF } = window.jspdf;
        return new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    }

    addHeader(doc, title, subtitle, pageW) {
        // Fondo del header
        doc.setFillColor(...this.BRAND_COLOR);
        doc.rect(0, 0, pageW, 28, 'F');

        // Título
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('DocAudit-Tecnicos', 14, 11);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(title, 14, 19);

        // Fecha de generación (derecha)
        doc.setFontSize(8);
        const now = new Date().toLocaleString('es-MX');
        doc.text(`Generado: ${now}`, pageW - 14, 19, { align: 'right' });

        // Subtítulo debajo del header
        doc.setTextColor(...this.GRAY_COLOR);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text(subtitle, 14, 35);

        doc.setTextColor(0, 0, 0);
        return 42; // y inicial para el contenido
    }

    addSectionTitle(doc, text, y, pageW) {
        doc.setFillColor(...this.BRAND_COLOR.map(v => Math.min(255, v + 120)));
        doc.rect(14, y - 5, pageW - 28, 8, 'F');
        doc.setTextColor(...this.BRAND_COLOR);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(text, 16, y);
        doc.setTextColor(0, 0, 0);
        return y + 6;
    }

    checkPageBreak(doc, y, margin = 20) {
        if (y > 270) {
            doc.addPage();
            return 20;
        }
        return y;
    }

    addFooter(doc, pageW) {
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setDrawColor(200, 200, 200);
            doc.line(14, 287, pageW - 14, 287);
            doc.setFontSize(7);
            doc.setTextColor(150, 150, 150);
            doc.text('DocAudit-Tecnicos  |  Reporte confidencial', 14, 292);
            doc.text(`Página ${i} de ${pageCount}`, pageW - 14, 292, { align: 'right' });
        }
    }

    // ── 1. PDF DE ESTADÍSTICAS COMPLETAS ────────────────────
    async downloadStatsPDF() {
        const stats = window.statsModule;
        if (!stats || !stats.data || stats.data.length === 0) {
            alert('Primero carga las estadísticas antes de descargar el PDF.');
            return;
        }

        const btn = document.getElementById('downloadStatsPdfBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
        btn.disabled = true;

        try {
            const data    = stats.data;
            const fromVal = document.getElementById('statsFilterFrom')?.value || '';
            const toVal   = document.getElementById('statsFilterTo')?.value   || '';
            const auditor = document.getElementById('statsFilterAuditor')?.value || 'Todos';

            const doc    = this.newDoc();
            const pageW  = doc.internal.pageSize.getWidth();
            const period = `Período: ${this.formatDate(fromVal)} al ${this.formatDate(toVal)}  |  Auditor: ${auditor || 'Todos'}`;

            let y = this.addHeader(doc, 'Reporte de Estadísticas', period, pageW);

            // ── Resumen General ──────────────────────────────
            y = this.addSectionTitle(doc, 'RESUMEN GENERAL', y, pageW);
            y += 2;

            const total      = data.length;
            const withErrors = data.filter(a => a.errors_found).length;
            const noErrors   = total - withErrors;
            const pct        = total > 0 ? Math.round((withErrors / total) * 100) : 0;
            const totalGC    = data.reduce((s, a) => s + (parseInt(a.gc_with_errors) || 0), 0);
            const uniqueDates = new Set(data.map(a => a.audit_date).filter(Boolean)).size;

            const summaryData = [
                ['Total Registros', total, 'Sin Errores', noErrors],
                ['Con Errores', withErrors, '% Con Errores', `${pct}%`],
                ['Total GC con Errores', totalGC, 'Días con Registros', uniqueDates],
            ];

            doc.autoTable({
                startY: y,
                head: [],
                body: summaryData,
                theme: 'grid',
                styles: { fontSize: 9, cellPadding: 3 },
                columnStyles: {
                    0: { fontStyle: 'bold', fillColor: [240, 242, 255], textColor: this.BRAND_COLOR },
                    1: { halign: 'center', fontStyle: 'bold' },
                    2: { fontStyle: 'bold', fillColor: [240, 242, 255], textColor: this.BRAND_COLOR },
                    3: { halign: 'center', fontStyle: 'bold' },
                },
                margin: { left: 14, right: 14 },
            });
            y = doc.lastAutoTable.finalY + 8;

            // ── Registro Diario ──────────────────────────────
            y = this.checkPageBreak(doc, y);
            y = this.addSectionTitle(doc, 'REGISTRO TOTAL DIARIO POR FECHA', y, pageW);
            y += 2;

            const byDate = {};
            data.forEach(a => {
                const d = a.audit_date || 'Sin fecha';
                if (!byDate[d]) byDate[d] = { total: 0, ok: 0, err: 0, gc: 0, orders: new Set() };
                byDate[d].total++;
                if (a.errors_found) { byDate[d].err++; byDate[d].gc += parseInt(a.gc_with_errors) || 0; }
                else byDate[d].ok++;
                if (a.order_number) byDate[d].orders.add(a.order_number);
            });

            const dailyRows = Object.keys(byDate).sort().map(d => {
                const r = byDate[d];
                const p = r.total > 0 ? Math.round((r.err / r.total) * 100) : 0;
                return [this.formatDate(d), r.total, r.ok, r.err, r.gc, r.orders.size, `${p}%`];
            });

            doc.autoTable({
                startY: y,
                head: [['Fecha', 'Total', 'Sin Errores', 'Con Errores', 'GC Errores', 'Órdenes Únicas', '% Error']],
                body: dailyRows,
                theme: 'striped',
                headStyles: { fillColor: this.BRAND_COLOR, fontSize: 8, fontStyle: 'bold' },
                styles: { fontSize: 8, cellPadding: 2.5 },
                columnStyles: {
                    0: { fontStyle: 'bold' },
                    1: { halign: 'center' }, 2: { halign: 'center', textColor: this.GREEN_COLOR },
                    3: { halign: 'center', textColor: this.RED_COLOR },
                    4: { halign: 'center' }, 5: { halign: 'center' },
                    6: { halign: 'center', fontStyle: 'bold' },
                },
                margin: { left: 14, right: 14 },
            });
            y = doc.lastAutoTable.finalY + 8;

            // ── Tipos de Errores Más Frecuentes ──────────────
            y = this.checkPageBreak(doc, y);
            y = this.addSectionTitle(doc, 'TIPOS DE ERRORES MÁS FRECUENTES', y, pageW);
            y += 2;

            const withErrorsData = data.filter(a => a.errors_found);
            const errorTotals = this.ERROR_FIELDS.map(f => ({
                label:      this.ERROR_LABELS[f],
                total:      withErrorsData.reduce((s, a) => s + (parseInt(a[f]) || 0), 0),
                count:      withErrorsData.filter(a => (parseInt(a[f]) || 0) > 0).length,
                pct:        withErrorsData.length > 0
                    ? Math.round((withErrorsData.filter(a => (parseInt(a[f]) || 0) > 0).length / withErrorsData.length) * 100)
                    : 0
            })).filter(e => e.total > 0).sort((a, b) => b.total - a.total);

            const errorRows = errorTotals.map((e, i) => [
                i + 1, e.label, e.total, e.count, `${e.pct}%`
            ]);

            doc.autoTable({
                startY: y,
                head: [['#', 'Tipo de Error', 'Valor Acumulado', 'Registros Afectados', '% Órdenes con Error']],
                body: errorRows,
                theme: 'striped',
                headStyles: { fillColor: this.BRAND_COLOR, fontSize: 8, fontStyle: 'bold' },
                styles: { fontSize: 8, cellPadding: 2.5 },
                columnStyles: {
                    0: { halign: 'center', fontStyle: 'bold', cellWidth: 10 },
                    1: { fontStyle: 'bold' },
                    2: { halign: 'center', textColor: this.RED_COLOR, fontStyle: 'bold' },
                    3: { halign: 'center' },
                    4: { halign: 'center' },
                },
                margin: { left: 14, right: 14 },
            });
            y = doc.lastAutoTable.finalY + 8;

            // ── Errores por Celda ────────────────────────────
            y = this.checkPageBreak(doc, y);
            y = this.addSectionTitle(doc, 'ERRORES POR CELDA', y, pageW);
            y += 2;

            const CELLS = ['5', '10', '11', '15', '16', 'kiteo', 'otras'];
            const byCell = {};
            CELLS.forEach(c => { byCell[c] = { ok: 0, err: 0, gc: 0, errorTypes: {} }; });

            data.forEach(a => {
                const c = a.build_cell || 'otras';
                if (!byCell[c]) byCell[c] = { ok: 0, err: 0, gc: 0, errorTypes: {} };
                if (a.errors_found) {
                    byCell[c].err++;
                    byCell[c].gc += parseInt(a.gc_with_errors) || 0;
                    this.ERROR_FIELDS.forEach(f => {
                        const v = parseInt(a[f]) || 0;
                        if (v > 0) byCell[c].errorTypes[f] = (byCell[c].errorTypes[f] || 0) + v;
                    });
                } else {
                    byCell[c].ok++;
                }
            });

            const cellRows = CELLS.filter(c => byCell[c].ok + byCell[c].err > 0).map(c => {
                const r = byCell[c];
                const total = r.ok + r.err;
                const pct   = total > 0 ? Math.round((r.err / total) * 100) : 0;
                // Top error de esa celda
                const topErr = Object.entries(r.errorTypes).sort((a, b) => b[1] - a[1])[0];
                const topErrLabel = topErr ? `${this.ERROR_LABELS[topErr[0]]} (${topErr[1]})` : '-';
                return [`Celda ${c}`, total, r.ok, r.err, r.gc, `${pct}%`, topErrLabel];
            });

            doc.autoTable({
                startY: y,
                head: [['Celda', 'Total', 'Sin Errores', 'Con Errores', 'GC Errores', '% Error', 'Error Principal']],
                body: cellRows,
                theme: 'striped',
                headStyles: { fillColor: this.BRAND_COLOR, fontSize: 8, fontStyle: 'bold' },
                styles: { fontSize: 8, cellPadding: 2.5 },
                columnStyles: {
                    0: { fontStyle: 'bold' },
                    1: { halign: 'center' },
                    2: { halign: 'center', textColor: this.GREEN_COLOR },
                    3: { halign: 'center', textColor: this.RED_COLOR },
                    4: { halign: 'center' },
                    5: { halign: 'center', fontStyle: 'bold' },
                    6: { fontStyle: 'italic', textColor: this.RED_COLOR },
                },
                margin: { left: 14, right: 14 },
            });
            y = doc.lastAutoTable.finalY + 8;

            // ── Estadísticas por Usuario ─────────────────────
            y = this.checkPageBreak(doc, y);
            y = this.addSectionTitle(doc, 'ESTADÍSTICAS POR AUDITOR', y, pageW);
            y += 2;

            const byUser = {};
            data.forEach(a => {
                const u = a.checked_by || 'Sin asignar';
                if (!byUser[u]) byUser[u] = { ok: 0, err: 0, gc: 0 };
                if (a.errors_found) { byUser[u].err++; byUser[u].gc += parseInt(a.gc_with_errors) || 0; }
                else byUser[u].ok++;
            });

            const userRows = Object.entries(byUser).sort().map(([u, r]) => {
                const total = r.ok + r.err;
                const pct   = total > 0 ? Math.round((r.err / total) * 100) : 0;
                return [u, total, r.ok, r.err, r.gc, `${pct}%`];
            });

            doc.autoTable({
                startY: y,
                head: [['Auditor', 'Total', 'Sin Errores', 'Con Errores', 'GC Errores', '% Error']],
                body: userRows,
                theme: 'striped',
                headStyles: { fillColor: this.BRAND_COLOR, fontSize: 8, fontStyle: 'bold' },
                styles: { fontSize: 8, cellPadding: 2.5 },
                columnStyles: {
                    0: { fontStyle: 'bold' },
                    1: { halign: 'center' },
                    2: { halign: 'center', textColor: this.GREEN_COLOR },
                    3: { halign: 'center', textColor: this.RED_COLOR },
                    4: { halign: 'center' },
                    5: { halign: 'center', fontStyle: 'bold' },
                },
                margin: { left: 14, right: 14 },
            });

            // ── Clasificación de errores ─────────────────────
            y = doc.lastAutoTable.finalY + 8;
            y = this.checkPageBreak(doc, y);
            y = this.addSectionTitle(doc, 'CLASIFICACIÓN DE ÓRDENES POR CANTIDAD DE ERRORES', y, pageW);
            y += 2;

            const classified = withErrorsData.map(a => ({
                order:   a.order_number || '(sin orden)',
                date:    this.formatDate(a.audit_date),
                auditor: a.checked_by || '-',
                cell:    a.build_cell || '-',
                gc:      parseInt(a.gc_with_errors) || 0,
                total:   this.getTotalErrors(a)
            }));

            const low    = classified.filter(r => r.total >= 1 && r.total <= 2);
            const medium = classified.filter(r => r.total > 2 && r.total <= 5);
            const high   = classified.filter(r => r.total > 5);

            const classGroups = [
                { label: '1-2 Errores (Bajo)', items: low,    color: [255, 193, 7] },
                { label: '2-5 Errores (Medio)', items: medium, color: [253, 126, 20] },
                { label: 'Más de 5 Errores (Alto)', items: high, color: this.RED_COLOR },
            ];

            for (const g of classGroups) {
                if (g.items.length === 0) continue;
                y = this.checkPageBreak(doc, y);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...g.color);
                doc.text(`▸ ${g.label} — ${g.items.length} orden(es)`, 16, y);
                doc.setTextColor(0, 0, 0);
                y += 3;

                doc.autoTable({
                    startY: y,
                    head: [['Orden', 'Fecha', 'Auditor', 'Celda', 'GC Err.', 'Total Err.']],
                    body: g.items.map(r => [r.order, r.date, r.auditor, r.cell, r.gc, r.total]),
                    theme: 'grid',
                    headStyles: { fillColor: g.color, fontSize: 7.5, fontStyle: 'bold', textColor: [50, 50, 50] },
                    styles: { fontSize: 7.5, cellPadding: 2 },
                    columnStyles: {
                        0: { fontStyle: 'bold' },
                        4: { halign: 'center' },
                        5: { halign: 'center', fontStyle: 'bold', textColor: this.RED_COLOR },
                    },
                    margin: { left: 14, right: 14 },
                });
                y = doc.lastAutoTable.finalY + 5;
            }

            this.addFooter(doc, pageW);

            const filename = `DocAudit_Estadisticas_${fromVal || 'inicio'}_${toVal || 'hoy'}.pdf`;
            doc.save(filename);

        } catch (err) {
            console.error('Error generando PDF de estadísticas:', err);
            alert('Ocurrió un error al generar el PDF. Revisa la consola para más detalles.');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    // ── 2. PDF DE REPORTE DIARIO ─────────────────────────────
    async downloadDailyReport() {
        const stats = window.statsModule;
        if (!stats || !stats.data || stats.data.length === 0) {
            alert('Primero carga las estadísticas antes de descargar el reporte diario.');
            return;
        }

        const btn = document.getElementById('downloadDailyReportBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
        btn.disabled = true;

        try {
            const data = stats.data;
            const today = this.getLocalDateString();

            // Agrupar por fecha → por celda → errores por tipo
            const byDate = {};
            data.forEach(a => {
                const d = a.audit_date || 'Sin fecha';
                if (!byDate[d]) byDate[d] = {};
                const c = a.build_cell || 'otras';
                if (!byDate[d][c]) byDate[d][c] = { ok: 0, err: 0, gc: 0, errorTypes: {}, orders: [] };
                if (a.errors_found) {
                    byDate[d][c].err++;
                    byDate[d][c].gc += parseInt(a.gc_with_errors) || 0;
                    this.ERROR_FIELDS.forEach(f => {
                        const v = parseInt(a[f]) || 0;
                        if (v > 0) byDate[d][c].errorTypes[f] = (byDate[d][c].errorTypes[f] || 0) + v;
                    });
                    byDate[d][c].orders.push(a.order_number || '(sin orden)');
                } else {
                    byDate[d][c].ok++;
                }
            });

            const doc   = this.newDoc();
            const pageW = doc.internal.pageSize.getWidth();

            const fromVal = document.getElementById('statsFilterFrom')?.value || '';
            const toVal   = document.getElementById('statsFilterTo')?.value   || '';
            const period  = `Período: ${this.formatDate(fromVal)} al ${this.formatDate(toVal)}`;

            let y = this.addHeader(doc, 'Reporte Diario — Errores por Celda', period, pageW);

            const sortedDates = Object.keys(byDate).sort();

            for (const date of sortedDates) {
                y = this.checkPageBreak(doc, y, 40);

                // Encabezado de fecha
                doc.setFillColor(...this.BRAND_COLOR);
                doc.roundedRect(14, y - 5, pageW - 28, 9, 2, 2, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text(`Fecha: ${this.formatDate(date)}`, 18, y + 1);
                doc.setTextColor(0, 0, 0);
                y += 8;

                const cellsOfDate = byDate[date];
                const CELLS = ['5', '10', '11', '15', '16', 'kiteo', 'otras'];
                const activeCells = CELLS.filter(c => cellsOfDate[c]);

                // Tabla resumen del día
                const summaryRows = activeCells.map(c => {
                    const r = cellsOfDate[c];
                    const total = r.ok + r.err;
                    const pct   = total > 0 ? Math.round((r.err / total) * 100) : 0;
                    const topErr = Object.entries(r.errorTypes).sort((a, b) => b[1] - a[1])[0];
                    const topErrLabel = topErr ? `${this.ERROR_LABELS[topErr[0]]} (${topErr[1]})` : 'Sin errores';
                    return [`Celda ${c}`, total, r.ok, r.err, r.gc, `${pct}%`, topErrLabel];
                });

                doc.autoTable({
                    startY: y,
                    head: [['Celda', 'Total', 'Sin Err.', 'Con Err.', 'GC Err.', '% Error', 'Error Principal']],
                    body: summaryRows,
                    theme: 'grid',
                    headStyles: { fillColor: [220, 225, 255], textColor: this.BRAND_COLOR, fontSize: 8, fontStyle: 'bold' },
                    styles: { fontSize: 8, cellPadding: 2.5 },
                    columnStyles: {
                        0: { fontStyle: 'bold' },
                        1: { halign: 'center' },
                        2: { halign: 'center', textColor: this.GREEN_COLOR },
                        3: { halign: 'center', textColor: this.RED_COLOR },
                        4: { halign: 'center' },
                        5: { halign: 'center', fontStyle: 'bold' },
                        6: { fontStyle: 'italic', textColor: this.RED_COLOR },
                    },
                    margin: { left: 14, right: 14 },
                });
                y = doc.lastAutoTable.finalY + 4;

                // Detalle de errores por tipo en cada celda (solo celdas con errores)
                const cellsWithErrors = activeCells.filter(c => cellsOfDate[c].err > 0);
                if (cellsWithErrors.length > 0) {
                    for (const c of cellsWithErrors) {
                        y = this.checkPageBreak(doc, y, 30);
                        const r = cellsOfDate[c];

                        doc.setFontSize(8);
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(...this.RED_COLOR);
                        doc.text(`  Detalle de errores — Celda ${c} (${r.err} registro(s) con error, ${r.gc} GC)`, 16, y);
                        doc.setTextColor(0, 0, 0);
                        y += 3;

                        const typeRows = Object.entries(r.errorTypes)
                            .sort((a, b) => b[1] - a[1])
                            .map(([f, v]) => [this.ERROR_LABELS[f], v]);

                        if (typeRows.length > 0) {
                            doc.autoTable({
                                startY: y,
                                head: [['Tipo de Error', 'Valor Acumulado']],
                                body: typeRows,
                                theme: 'plain',
                                headStyles: { fillColor: [255, 235, 235], textColor: this.RED_COLOR, fontSize: 7.5, fontStyle: 'bold' },
                                styles: { fontSize: 7.5, cellPadding: 2 },
                                columnStyles: {
                                    0: { fontStyle: 'bold' },
                                    1: { halign: 'center', textColor: this.RED_COLOR, fontStyle: 'bold' },
                                },
                                margin: { left: 22, right: 14 },
                            });
                            y = doc.lastAutoTable.finalY + 3;
                        }

                        // Órdenes afectadas
                        if (r.orders.length > 0) {
                            doc.setFontSize(7.5);
                            doc.setFont('helvetica', 'italic');
                            doc.setTextColor(...this.GRAY_COLOR);
                            const ordersText = `Órdenes con error: ${[...new Set(r.orders)].join(', ')}`;
                            const lines = doc.splitTextToSize(ordersText, pageW - 36);
                            doc.text(lines, 22, y);
                            y += lines.length * 4 + 2;
                            doc.setTextColor(0, 0, 0);
                        }
                    }
                }

                y += 6;
            }

            this.addFooter(doc, pageW);

            const filename = `DocAudit_ReporteDiario_${fromVal || 'inicio'}_${toVal || 'hoy'}.pdf`;
            doc.save(filename);

        } catch (err) {
            console.error('Error generando reporte diario:', err);
            alert('Ocurrió un error al generar el reporte diario. Revisa la consola para más detalles.');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}

// ── Inicialización ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    window.reportsModule = new ReportsModule();
});
