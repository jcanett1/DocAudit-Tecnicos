// ============================================================
//  stats.js  –  Módulo de Estadísticas para DocAudit-Tecnicos
// ============================================================

class StatsModule {
    constructor(apiInstance) {
        this.api = apiInstance;
        this.charts = {};   // Instancias de Chart.js activas
        this.data = [];     // Datos cargados

        // Campos de error con sus etiquetas legibles
        this.ERROR_FIELDS = [
            'components_error', 'tipping_error', 'hosel_setting_error',
            'shaft_stepping_error', 'wood_putter_weights_error', 'club_length_error',
            'shaft_alignment_error', 'ferrules_error', 'loft_error', 'lie_error',
            'grip_alignment_error', 'grip_length_error', 'wraps_error',
            'swing_weight_error', 'cleanliness_error', 'boxing_error'
        ];

        this.ERROR_LABELS = {
            components_error:         'Components',
            tipping_error:            'Tipping',
            hosel_setting_error:      'Hosel Setting',
            shaft_stepping_error:     'Shaft Stepping',
            wood_putter_weights_error:'Wood/Putter Weights',
            club_length_error:        'Club Length',
            shaft_alignment_error:    'Shaft Alignment',
            ferrules_error:           'Ferrules',
            loft_error:               'Loft',
            lie_error:                'Lie',
            grip_alignment_error:     'Grip Alignment',
            grip_length_error:        'Grip Length',
            wraps_error:              'Wraps',
            swing_weight_error:       'Swing Weight',
            cleanliness_error:        'Cleanliness',
            boxing_error:             'Boxing'
        };

        this.bindEvents();
        this.setDefaultDates();
    }

    // ── Utilidades de fecha ──────────────────────────────────
    getLocalDateString(date = new Date()) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    formatDateDisplay(dateStr) {
        if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr || '-';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    }

    // ── Fechas por defecto (últimos 30 días) ─────────────────
    setDefaultDates() {
        const today = new Date();
        const from = new Date();
        from.setDate(today.getDate() - 29);

        const fromInput = document.getElementById('statsFilterFrom');
        const toInput   = document.getElementById('statsFilterTo');
        if (fromInput) fromInput.value = this.getLocalDateString(from);
        if (toInput)   toInput.value   = this.getLocalDateString(today);
    }

    // ── Eventos ──────────────────────────────────────────────
    bindEvents() {
        document.getElementById('loadStatsBtn')?.addEventListener('click', () => this.loadAndRender());
    }

    // ── Calcular total de errores de un registro ─────────────
    getTotalErrors(audit) {
        return this.ERROR_FIELDS.reduce((sum, f) => sum + (parseInt(audit[f]) || 0), 0);
    }

    // ── Cargar datos y renderizar todo ───────────────────────
    async loadAndRender() {
        const fromVal    = document.getElementById('statsFilterFrom')?.value || '';
        const toVal      = document.getElementById('statsFilterTo')?.value   || '';
        const auditorVal = document.getElementById('statsFilterAuditor')?.value || '';

        this.showLoading(true);
        this.showContent(false);
        this.showNoData(false);

        try {
            const params = new URLSearchParams();
            params.append('order', 'audit_date.asc');
            params.append('limit', '5000');
            if (fromVal)    params.append('audit_date', `gte.${fromVal}`);
            if (toVal)      params.append('audit_date', `lte.${toVal}`);
            if (auditorVal) params.append('checked_by', `eq.${auditorVal}`);

            const url = `${this.api.supabaseURL}/rest/v1/${this.api.tableName}?${params.toString()}`;
            const response = await fetch(url, {
                headers: {
                    'apikey': this.api.supabaseKey,
                    'Authorization': `Bearer ${this.api.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
            const rawData = await response.json();
            this.data = Array.isArray(rawData) ? rawData : [];

            if (this.data.length === 0) {
                this.showNoData(true);
                return;
            }

            this.renderAll();
            this.showContent(true);
            // Habilitar botones de descarga
            if (window.reportsModule) window.reportsModule.enableButtons(true);

        } catch (err) {
            console.error('Error cargando estadísticas:', err);
            this.showNoData(true);
        } finally {
            this.showLoading(false);
        }
    }

    // ── Renderizar todo ──────────────────────────────────────
    renderAll() {
        this.renderSummaryCards();
        this.renderDailyTable();
        this.renderRepeatedOrders();
        this.renderErrorClassification();
        this.renderTopErrorTypes();   // ← NUEVA SECCIÓN
        this.renderPieChart();
        this.renderBarChart();
        this.renderCellChart();
        this.renderUserTable();
    }

    // ── 1. Tarjetas de resumen ───────────────────────────────
    renderSummaryCards() {
        const container = document.getElementById('statsSummaryCards');
        if (!container) return;

        const total      = this.data.length;
        const withErrors = this.data.filter(a => a.errors_found).length;
        const noErrors   = total - withErrors;
        const pct        = total > 0 ? Math.round((withErrors / total) * 100) : 0;
        const totalGCErr = this.data.reduce((s, a) => s + (parseInt(a.gc_with_errors) || 0), 0);
        const uniqueDates = new Set(this.data.map(a => a.audit_date).filter(Boolean)).size;

        container.innerHTML = `
            <div class="stat-card stat-blue">
                <div class="stat-icon"><i class="fas fa-clipboard-check"></i></div>
                <div class="stat-value">${total}</div>
                <div class="stat-label">Total Registros</div>
            </div>
            <div class="stat-card stat-green">
                <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
                <div class="stat-value">${noErrors}</div>
                <div class="stat-label">Sin Errores</div>
            </div>
            <div class="stat-card stat-red">
                <div class="stat-icon"><i class="fas fa-times-circle"></i></div>
                <div class="stat-value">${withErrors}</div>
                <div class="stat-label">Con Errores</div>
            </div>
            <div class="stat-card stat-orange">
                <div class="stat-icon"><i class="fas fa-percentage"></i></div>
                <div class="stat-value">${pct}%</div>
                <div class="stat-label">% Con Errores</div>
            </div>
            <div class="stat-card stat-purple">
                <div class="stat-icon"><i class="fas fa-golf-ball"></i></div>
                <div class="stat-value">${totalGCErr}</div>
                <div class="stat-label">Total GC con Errores</div>
            </div>
            <div class="stat-card stat-teal">
                <div class="stat-icon"><i class="fas fa-calendar-check"></i></div>
                <div class="stat-value">${uniqueDates}</div>
                <div class="stat-label">Días con Registros</div>
            </div>
        `;
    }

    // ── 2. Tabla de registro diario ──────────────────────────
    renderDailyTable() {
        const container = document.getElementById('statsDailyTable');
        if (!container) return;

        const byDate = {};
        this.data.forEach(a => {
            const d = a.audit_date || 'Sin fecha';
            if (!byDate[d]) byDate[d] = { total: 0, withErrors: 0, noErrors: 0, gcErrors: 0, orders: new Set() };
            byDate[d].total++;
            if (a.errors_found) byDate[d].withErrors++;
            else byDate[d].noErrors++;
            byDate[d].gcErrors += parseInt(a.gc_with_errors) || 0;
            if (a.order_number) byDate[d].orders.add(a.order_number);
        });

        const sortedDates = Object.keys(byDate).sort();
        if (sortedDates.length === 0) {
            container.innerHTML = '<p class="no-data-inline">Sin datos para el período seleccionado.</p>';
            return;
        }

        let html = `
            <table class="stats-table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Total Registros</th>
                        <th>Sin Errores</th>
                        <th>Con Errores</th>
                        <th>GC con Errores</th>
                        <th>Órdenes Únicas</th>
                        <th>% Error</th>
                    </tr>
                </thead>
                <tbody>
        `;

        sortedDates.forEach(date => {
            const row = byDate[date];
            const pct = row.total > 0 ? Math.round((row.withErrors / row.total) * 100) : 0;
            const pctClass = pct === 0 ? 'pct-ok' : pct <= 30 ? 'pct-warn' : 'pct-bad';
            html += `
                <tr>
                    <td><strong>${this.formatDateDisplay(date)}</strong></td>
                    <td class="text-center">${row.total}</td>
                    <td class="text-center text-green">${row.noErrors}</td>
                    <td class="text-center text-red">${row.withErrors}</td>
                    <td class="text-center">${row.gcErrors}</td>
                    <td class="text-center">${row.orders.size}</td>
                    <td class="text-center"><span class="pct-badge ${pctClass}">${pct}%</span></td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }

    // ── 3. Órdenes repetidas ─────────────────────────────────
    renderRepeatedOrders() {
        const container = document.getElementById('statsRepeatedOrders');
        if (!container) return;

        const orderMap = {};
        this.data.forEach(a => {
            if (!a.order_number) return;
            if (!orderMap[a.order_number]) orderMap[a.order_number] = [];
            orderMap[a.order_number].push(a);
        });

        const repeated = Object.entries(orderMap).filter(([, records]) => records.length > 1);

        if (repeated.length === 0) {
            container.innerHTML = `
                <div class="no-repeated">
                    <i class="fas fa-check-circle text-green"></i>
                    <span>No se encontraron órdenes repetidas en el período seleccionado.</span>
                </div>`;
            return;
        }

        repeated.sort((a, b) => b[1].length - a[1].length);

        let html = `
            <div class="repeated-summary">
                <span class="badge-repeated">${repeated.length} orden(es) repetida(s)</span>
            </div>
            <table class="stats-table">
                <thead>
                    <tr>
                        <th>Número de Orden</th>
                        <th>Veces Registrada</th>
                        <th>Fechas</th>
                        <th>Auditores</th>
                        <th>Celdas</th>
                    </tr>
                </thead>
                <tbody>
        `;

        repeated.forEach(([order, records]) => {
            const dates    = [...new Set(records.map(r => this.formatDateDisplay(r.audit_date)))].join(', ');
            const auditors = [...new Set(records.map(r => r.checked_by).filter(Boolean))].join(', ');
            const cells    = [...new Set(records.map(r => r.build_cell).filter(Boolean))].join(', ');
            html += `
                <tr>
                    <td><strong>${order}</strong></td>
                    <td class="text-center"><span class="badge-count">${records.length}x</span></td>
                    <td>${dates}</td>
                    <td>${auditors}</td>
                    <td>${cells}</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }

    // ── 4. Clasificación de errores por orden ────────────────
    renderErrorClassification() {
        const withErrors = this.data.filter(a => a.errors_found);

        const classified = withErrors.map(a => ({
            order:    a.order_number || '(sin orden)',
            date:     this.formatDateDisplay(a.audit_date),
            auditor:  a.checked_by || '-',
            cell:     a.build_cell || '-',
            gcErrors: parseInt(a.gc_with_errors) || 0,
            total:    this.getTotalErrors(a)
        }));

        const low    = classified.filter(r => r.total >= 1 && r.total <= 2);
        const medium = classified.filter(r => r.total > 2 && r.total <= 5);
        const high   = classified.filter(r => r.total > 5);

        this.renderErrorList('count-low',    'list-low',    low);
        this.renderErrorList('count-medium', 'list-medium', medium);
        this.renderErrorList('count-high',   'list-high',   high);
    }

    renderErrorList(countId, listId, items) {
        const countEl = document.getElementById(countId);
        const listEl  = document.getElementById(listId);
        if (!countEl || !listEl) return;

        countEl.textContent = items.length;

        if (items.length === 0) {
            listEl.innerHTML = '<p class="no-data-inline">Sin registros en esta categoría.</p>';
            return;
        }

        let html = `
            <table class="stats-table stats-table-compact">
                <thead>
                    <tr>
                        <th>Orden</th>
                        <th>Fecha</th>
                        <th>Auditor</th>
                        <th>Celda</th>
                        <th>GC Err.</th>
                        <th>Total Err.</th>
                    </tr>
                </thead>
                <tbody>
        `;
        items.forEach(r => {
            html += `
                <tr>
                    <td><strong>${r.order}</strong></td>
                    <td>${r.date}</td>
                    <td>${r.auditor}</td>
                    <td>${r.cell}</td>
                    <td class="text-center">${r.gcErrors}</td>
                    <td class="text-center"><strong>${r.total}</strong></td>
                </tr>
            `;
        });
        html += '</tbody></table>';
        listEl.innerHTML = html;
    }

    // ── 5. Tipos de errores más frecuentes (NUEVA) ───────────
    renderTopErrorTypes() {
        const tableContainer = document.getElementById('statsTopErrorTypesTable');
        const chartCanvas    = document.getElementById('chartTopErrors');
        if (!tableContainer || !chartCanvas) return;

        // Solo registros con errores encontrados
        const withErrors = this.data.filter(a => a.errors_found);

        if (withErrors.length === 0) {
            tableContainer.innerHTML = '<p class="no-data-inline">No hay registros con errores en el período seleccionado.</p>';
            if (this.charts.topErrors) { this.charts.topErrors.destroy(); delete this.charts.topErrors; }
            return;
        }

        // Sumar el valor de cada tipo de error en todos los registros con errores
        const totals = {};
        this.ERROR_FIELDS.forEach(field => {
            totals[field] = withErrors.reduce((sum, a) => sum + (parseInt(a[field]) || 0), 0);
        });

        // Contar en cuántos registros aparece cada tipo (valor > 0)
        const occurrences = {};
        this.ERROR_FIELDS.forEach(field => {
            occurrences[field] = withErrors.filter(a => (parseInt(a[field]) || 0) > 0).length;
        });

        // Ordenar por total acumulado descendente
        const sorted = this.ERROR_FIELDS
            .map(field => ({
                field,
                label:      this.ERROR_LABELS[field],
                total:      totals[field],
                count:      occurrences[field],
                pct:        withErrors.length > 0 ? Math.round((occurrences[field] / withErrors.length) * 100) : 0
            }))
            .filter(e => e.total > 0)
            .sort((a, b) => b.total - a.total);

        if (sorted.length === 0) {
            tableContainer.innerHTML = '<p class="no-data-inline">No se registraron valores de error en los campos de tipo.</p>';
            if (this.charts.topErrors) { this.charts.topErrors.destroy(); delete this.charts.topErrors; }
            return;
        }

        // ── Tabla ────────────────────────────────────────────
        const maxTotal = sorted[0].total;
        let html = `
            <table class="stats-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Tipo de Error</th>
                        <th>Valor Acumulado</th>
                        <th>Registros Afectados</th>
                        <th>% de Órdenes con Error</th>
                        <th>Frecuencia Visual</th>
                    </tr>
                </thead>
                <tbody>
        `;

        sorted.forEach((e, i) => {
            const barWidth = maxTotal > 0 ? Math.round((e.total / maxTotal) * 100) : 0;
            const rankClass = i === 0 ? 'rank-gold' : i === 1 ? 'rank-silver' : i === 2 ? 'rank-bronze' : '';
            const pctClass  = e.pct === 0 ? 'pct-ok' : e.pct <= 30 ? 'pct-warn' : 'pct-bad';
            html += `
                <tr>
                    <td class="text-center">
                        <span class="rank-badge ${rankClass}">${i + 1}</span>
                    </td>
                    <td><strong>${e.label}</strong></td>
                    <td class="text-center"><strong>${e.total}</strong></td>
                    <td class="text-center">${e.count}</td>
                    <td class="text-center"><span class="pct-badge ${pctClass}">${e.pct}%</span></td>
                    <td>
                        <div class="freq-bar-track">
                            <div class="freq-bar-fill" style="width:${barWidth}%"></div>
                        </div>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        tableContainer.innerHTML = html;

        // ── Gráfica de barras horizontales ───────────────────
        if (this.charts.topErrors) { this.charts.topErrors.destroy(); delete this.charts.topErrors; }

        // Mostrar máximo los 10 primeros para no saturar la gráfica
        const top10 = sorted.slice(0, 10);
        const colors = top10.map((_, i) => {
            const palette = [
                '#dc3545','#fd7e14','#ffc107','#28a745','#17a2b8',
                '#667eea','#6f42c1','#e83e8c','#20c997','#6c757d'
            ];
            return palette[i] || '#667eea';
        });

        this.charts.topErrors = new Chart(chartCanvas, {
            type: 'bar',
            data: {
                labels: top10.map(e => e.label),
                datasets: [{
                    label: 'Valor Acumulado de Errores',
                    data: top10.map(e => e.total),
                    backgroundColor: colors.map(c => c + 'CC'),
                    borderColor: colors,
                    borderWidth: 2,
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => {
                                const e = top10[ctx.dataIndex];
                                return [
                                    ` Valor acumulado: ${e.total}`,
                                    ` Registros afectados: ${e.count}`,
                                    ` % de órdenes con error: ${e.pct}%`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: { beginAtZero: true, ticks: { stepSize: 1 } },
                    y: { ticks: { font: { size: 12 } } }
                }
            }
        });
    }

    // ── 6. Gráfica de pastel ─────────────────────────────────
    renderPieChart() {
        const canvas = document.getElementById('chartPie');
        if (!canvas) return;

        if (this.charts.pie) { this.charts.pie.destroy(); delete this.charts.pie; }

        const withErrors = this.data.filter(a => a.errors_found).length;
        const noErrors   = this.data.length - withErrors;

        this.charts.pie = new Chart(canvas, {
            type: 'pie',
            data: {
                labels: ['Sin Errores', 'Con Errores'],
                datasets: [{
                    data: [noErrors, withErrors],
                    backgroundColor: ['#28a745', '#dc3545'],
                    borderColor: ['#fff', '#fff'],
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { font: { size: 13 }, padding: 16 }
                    },
                    tooltip: {
                        callbacks: {
                            label: ctx => {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0;
                                return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // ── 7. Gráfica de barras (registros por día) ─────────────
    renderBarChart() {
        const canvas = document.getElementById('chartBar');
        if (!canvas) return;

        if (this.charts.bar) { this.charts.bar.destroy(); delete this.charts.bar; }

        const byDate = {};
        this.data.forEach(a => {
            const d = a.audit_date || 'Sin fecha';
            if (!byDate[d]) byDate[d] = { ok: 0, err: 0 };
            if (a.errors_found) byDate[d].err++;
            else byDate[d].ok++;
        });

        const sortedDates = Object.keys(byDate).sort();
        const labels  = sortedDates.map(d => this.formatDateDisplay(d));
        const okData  = sortedDates.map(d => byDate[d].ok);
        const errData = sortedDates.map(d => byDate[d].err);

        this.charts.bar = new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Sin Errores',
                        data: okData,
                        backgroundColor: 'rgba(40,167,69,0.8)',
                        borderColor: '#28a745',
                        borderWidth: 1,
                        borderRadius: 4
                    },
                    {
                        label: 'Con Errores',
                        data: errData,
                        backgroundColor: 'rgba(220,53,69,0.8)',
                        borderColor: '#dc3545',
                        borderWidth: 1,
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    x: { stacked: true, ticks: { maxRotation: 45, font: { size: 11 } } },
                    y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } }
                },
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: { mode: 'index', intersect: false }
                }
            }
        });
    }

    // ── 8. Gráfica por celda ─────────────────────────────────
    renderCellChart() {
        const canvas = document.getElementById('chartCell');
        if (!canvas) return;

        if (this.charts.cell) { this.charts.cell.destroy(); delete this.charts.cell; }

        const CELLS = ['5', '10', '11', '15', '16', 'kiteo', 'otras'];
        const byCell = {};
        CELLS.forEach(c => { byCell[c] = { ok: 0, err: 0 }; });

        this.data.forEach(a => {
            const c = a.build_cell || 'otras';
            if (!byCell[c]) byCell[c] = { ok: 0, err: 0 };
            if (a.errors_found) byCell[c].err++;
            else byCell[c].ok++;
        });

        const activeCells = CELLS.filter(c => byCell[c].ok + byCell[c].err > 0);
        const labels  = activeCells.map(c => `Celda ${c}`);
        const okData  = activeCells.map(c => byCell[c].ok);
        const errData = activeCells.map(c => byCell[c].err);

        this.charts.cell = new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Sin Errores',
                        data: okData,
                        backgroundColor: 'rgba(102,126,234,0.8)',
                        borderColor: '#667eea',
                        borderWidth: 1,
                        borderRadius: 6
                    },
                    {
                        label: 'Con Errores',
                        data: errData,
                        backgroundColor: 'rgba(255,107,107,0.8)',
                        borderColor: '#ff6b6b',
                        borderWidth: 1,
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    x: { stacked: false },
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                },
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            afterBody: ctx => {
                                const cell = activeCells[ctx[0].dataIndex];
                                const total = byCell[cell].ok + byCell[cell].err;
                                const pct = total > 0 ? Math.round((byCell[cell].err / total) * 100) : 0;
                                return [`Total: ${total}`, `% Error: ${pct}%`];
                            }
                        }
                    }
                }
            }
        });
    }

    // ── 9. Tabla por usuario ─────────────────────────────────
    renderUserTable() {
        const container = document.getElementById('statsUserTable');
        if (!container) return;

        const byUserDate = {};
        this.data.forEach(a => {
            const user = a.checked_by || 'Sin asignar';
            const date = a.audit_date || 'Sin fecha';
            const key  = `${user}||${date}`;
            if (!byUserDate[key]) byUserDate[key] = { user, date, ok: 0, err: 0, gcErrors: 0 };
            if (a.errors_found) {
                byUserDate[key].err++;
                byUserDate[key].gcErrors += parseInt(a.gc_with_errors) || 0;
            } else {
                byUserDate[key].ok++;
            }
        });

        const rows = Object.values(byUserDate).sort((a, b) => {
            if (a.user < b.user) return -1;
            if (a.user > b.user) return 1;
            return a.date.localeCompare(b.date);
        });

        if (rows.length === 0) {
            container.innerHTML = '<p class="no-data-inline">Sin datos.</p>';
            return;
        }

        const userTotals = {};
        rows.forEach(r => {
            if (!userTotals[r.user]) userTotals[r.user] = { ok: 0, err: 0, gcErrors: 0 };
            userTotals[r.user].ok       += r.ok;
            userTotals[r.user].err      += r.err;
            userTotals[r.user].gcErrors += r.gcErrors;
        });

        let html = `
            <table class="stats-table">
                <thead>
                    <tr>
                        <th>Auditor</th>
                        <th>Fecha</th>
                        <th>Ingresos Sin Errores</th>
                        <th>Ingresos Con Errores</th>
                        <th>Total del Día</th>
                        <th>GC con Errores</th>
                        <th>% Error del Día</th>
                    </tr>
                </thead>
                <tbody>
        `;

        let lastUser = null;
        rows.forEach(r => {
            const total = r.ok + r.err;
            const pct   = total > 0 ? Math.round((r.err / total) * 100) : 0;
            const pctClass  = pct === 0 ? 'pct-ok' : pct <= 30 ? 'pct-warn' : 'pct-bad';
            const isNewUser = r.user !== lastUser;
            lastUser = r.user;

            html += `
                <tr class="${isNewUser ? 'user-row-start' : ''}">
                    <td>${isNewUser ? `<strong>${r.user}</strong>` : ''}</td>
                    <td>${this.formatDateDisplay(r.date)}</td>
                    <td class="text-center text-green">${r.ok}</td>
                    <td class="text-center text-red">${r.err}</td>
                    <td class="text-center"><strong>${total}</strong></td>
                    <td class="text-center">${r.gcErrors}</td>
                    <td class="text-center"><span class="pct-badge ${pctClass}">${pct}%</span></td>
                </tr>
            `;
        });

        html += '<tr class="totals-separator"><td colspan="7"></td></tr>';
        Object.entries(userTotals).forEach(([user, t]) => {
            const total = t.ok + t.err;
            const pct   = total > 0 ? Math.round((t.err / total) * 100) : 0;
            const pctClass = pct === 0 ? 'pct-ok' : pct <= 30 ? 'pct-warn' : 'pct-bad';
            html += `
                <tr class="totals-row">
                    <td colspan="2"><strong>TOTAL – ${user}</strong></td>
                    <td class="text-center text-green"><strong>${t.ok}</strong></td>
                    <td class="text-center text-red"><strong>${t.err}</strong></td>
                    <td class="text-center"><strong>${total}</strong></td>
                    <td class="text-center"><strong>${t.gcErrors}</strong></td>
                    <td class="text-center"><span class="pct-badge ${pctClass}">${pct}%</span></td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }

    // ── Helpers de visibilidad ───────────────────────────────
    showLoading(show) {
        const el = document.getElementById('statsLoadingSpinner');
        if (el) el.style.display = show ? 'block' : 'none';
    }

    showContent(show) {
        const el = document.getElementById('statsContent');
        if (el) el.style.display = show ? 'block' : 'none';
    }

    showNoData(show) {
        const el = document.getElementById('statsNoData');
        if (el) el.style.display = show ? 'flex' : 'none';
    }
}

// ── Inicialización de pestañas ───────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const tabBtns     = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const targetEl = document.getElementById(`tab-${target}`);
            if (targetEl) targetEl.classList.add('active');
        });
    });

    const waitForAPI = setInterval(() => {
        if (window.auditAPI) {
            clearInterval(waitForAPI);
            window.statsModule = new StatsModule(window.auditAPI);
        }
    }, 100);
});
