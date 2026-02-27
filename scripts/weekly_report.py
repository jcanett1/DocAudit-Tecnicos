#!/usr/bin/env python3
# ============================================================
#  weekly_report.py  –  Reporte Semanal Automático DocAudit
#  Genera un PDF con:
#    - Resumen general de la semana
#    - Tipos de errores más registrados (ranking)
#    - Errores por celda (con top error de cada celda)
#    - Órdenes con más errores
#    - Estadísticas por auditor
#  El PDF se guarda localmente en /home/ubuntu/reportes/
# ============================================================

import os
import sys
import json
import requests
from datetime import datetime, timedelta
from collections import defaultdict

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, HRFlowable, KeepTogether
)
from reportlab.platypus import PageBreak

# ── Configuración ────────────────────────────────────────────
SUPABASE_URL = os.getenv(
    'SUPABASE_URL',
    'https://hckbtzbcmijdstyazwoz.supabase.co'
)
SUPABASE_KEY = os.getenv(
    'SUPABASE_KEY',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhja2J0emJjbWlqZHN0eWF6d296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1MDU4MDcsImV4cCI6MjA2NTA4MTgwN30.JfYJwuytLNXY42QcfjdilP4btvKu17gr84dbUQ_nMBk'
)
# Permitir override por variable de entorno del sandbox
if os.getenv('SUPABASE_URL'):
    SUPABASE_URL = os.getenv('SUPABASE_URL')
if os.getenv('SUPABASE_KEY'):
    SUPABASE_KEY = os.getenv('SUPABASE_KEY')
TABLE_NAME = 'dotaudit'
OUTPUT_DIR = os.path.expanduser('~/reportes')

ERROR_LABELS = {
    'components_error':          'Components',
    'tipping_error':             'Tipping',
    'hosel_setting_error':       'Hosel Setting',
    'shaft_stepping_error':      'Shaft Stepping',
    'wood_putter_weights_error': 'Wood/Putter Weights',
    'club_length_error':         'Club Length',
    'shaft_alignment_error':     'Shaft Alignment',
    'ferrules_error':            'Ferrules',
    'loft_error':                'Loft',
    'lie_error':                 'Lie',
    'grip_alignment_error':      'Grip Alignment',
    'grip_length_error':         'Grip Length',
    'wraps_error':               'Wraps',
    'swing_weight_error':        'Swing Weight',
    'cleanliness_error':         'Cleanliness',
    'boxing_error':              'Boxing',
}
ERROR_FIELDS = list(ERROR_LABELS.keys())
CELLS        = ['5', '10', '11', '15', '16', 'kiteo', 'otras']

# ── Colores de marca ─────────────────────────────────────────
BRAND   = colors.HexColor('#667eea')
BRAND_L = colors.HexColor('#e8ecff')
RED     = colors.HexColor('#dc3545')
RED_L   = colors.HexColor('#ffe8ea')
GREEN   = colors.HexColor('#28a745')
GREEN_L = colors.HexColor('#e8f5ec')
ORANGE  = colors.HexColor('#fd7e14')
GRAY    = colors.HexColor('#6c757d')
GRAY_L  = colors.HexColor('#f8f9fa')
WHITE   = colors.white
BLACK   = colors.black

# ── Utilidades ───────────────────────────────────────────────
def fmt_date(d: str) -> str:
    try:
        return datetime.strptime(d, '%Y-%m-%d').strftime('%d/%m/%Y')
    except Exception:
        return d or '-'

def pct(part, total):
    return round(part / total * 100) if total else 0

def get_total_errors(record: dict) -> int:
    return sum(int(record.get(f) or 0) for f in ERROR_FIELDS)

# ── Consulta a Supabase ──────────────────────────────────────
def fetch_data(from_date: str, to_date: str) -> list:
    url = f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}"
    params = {
        'audit_date': f'gte.{from_date}',
        'order':      'audit_date.asc',
        'limit':      '5000',
        'select':     '*',
    }
    # Agregar filtro de fecha fin
    headers = {
        'apikey':        SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type':  'application/json',
    }
    # Supabase no acepta dos filtros del mismo campo en params dict;
    # se usa el query string manual
    qs = (
        f"audit_date=gte.{from_date}"
        f"&audit_date=lte.{to_date}"
        f"&order=audit_date.asc"
        f"&limit=5000"
        f"&select=*"
    )
    resp = requests.get(f"{url}?{qs}", headers=headers, timeout=30)
    resp.raise_for_status()
    return resp.json()

# ── Estilos ──────────────────────────────────────────────────
def get_styles():
    base = getSampleStyleSheet()
    styles = {
        'title': ParagraphStyle(
            'title', parent=base['Normal'],
            fontSize=20, fontName='Helvetica-Bold',
            textColor=WHITE, alignment=TA_LEFT, spaceAfter=2
        ),
        'subtitle': ParagraphStyle(
            'subtitle', parent=base['Normal'],
            fontSize=9, fontName='Helvetica',
            textColor=colors.HexColor('#ccccff'), alignment=TA_LEFT
        ),
        'section': ParagraphStyle(
            'section', parent=base['Normal'],
            fontSize=11, fontName='Helvetica-Bold',
            textColor=BRAND, spaceBefore=10, spaceAfter=4
        ),
        'body': ParagraphStyle(
            'body', parent=base['Normal'],
            fontSize=8.5, fontName='Helvetica',
            textColor=BLACK, spaceAfter=2
        ),
        'note': ParagraphStyle(
            'note', parent=base['Normal'],
            fontSize=7.5, fontName='Helvetica-Oblique',
            textColor=GRAY, spaceAfter=4
        ),
        'footer': ParagraphStyle(
            'footer', parent=base['Normal'],
            fontSize=7, fontName='Helvetica',
            textColor=GRAY, alignment=TA_CENTER
        ),
    }
    return styles

# ── Tabla genérica con estilos de marca ──────────────────────
def make_table(data, col_widths=None, head_rows=1, zebra=True):
    t = Table(data, colWidths=col_widths, repeatRows=head_rows)
    style = [
        # Header
        ('BACKGROUND',  (0, 0), (-1, head_rows - 1), BRAND),
        ('TEXTCOLOR',   (0, 0), (-1, head_rows - 1), WHITE),
        ('FONTNAME',    (0, 0), (-1, head_rows - 1), 'Helvetica-Bold'),
        ('FONTSIZE',    (0, 0), (-1, head_rows - 1), 8),
        ('ALIGN',       (0, 0), (-1, head_rows - 1), 'CENTER'),
        ('VALIGN',      (0, 0), (-1, -1), 'MIDDLE'),
        # Body
        ('FONTNAME',    (0, head_rows), (-1, -1), 'Helvetica'),
        ('FONTSIZE',    (0, head_rows), (-1, -1), 8),
        ('ROWBACKGROUND', (0, head_rows), (-1, -1), [WHITE, GRAY_L] if zebra else [WHITE]),
        ('GRID',        (0, 0), (-1, -1), 0.4, colors.HexColor('#dee2e6')),
        ('TOPPADDING',  (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]
    t.setStyle(TableStyle(style))
    return t

# ── Generación del PDF ───────────────────────────────────────
def generate_pdf(data: list, from_date: str, to_date: str, output_path: str):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=14 * mm, rightMargin=14 * mm,
        topMargin=14 * mm, bottomMargin=18 * mm,
        title='Reporte Semanal DocAudit-Tecnicos',
        author='DocAudit Sistema',
    )
    W = A4[0] - 28 * mm   # ancho útil
    styles = get_styles()
    story  = []
    now_str = datetime.now().strftime('%d/%m/%Y %H:%M')

    # ── PORTADA / HEADER ─────────────────────────────────────
    header_data = [[
        Paragraph('DocAudit-Tecnicos', styles['title']),
        Paragraph(f'Generado: {now_str}', ParagraphStyle(
            'gen', parent=styles['subtitle'], alignment=TA_RIGHT
        ))
    ]]
    header_t = Table(header_data, colWidths=[W * 0.65, W * 0.35])
    header_t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BRAND),
        ('VALIGN',     (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING',   (0, 0), (-1, -1), 10),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 10),
        ('ROUNDEDCORNERS', [6]),
    ]))
    story.append(header_t)

    sub_data = [[
        Paragraph('Reporte Semanal Automático — Tipos de Errores y Celdas', ParagraphStyle(
            's', parent=styles['body'], fontSize=9, textColor=GRAY
        )),
        Paragraph(f'Período: {fmt_date(from_date)} al {fmt_date(to_date)}', ParagraphStyle(
            's2', parent=styles['body'], fontSize=9, textColor=BRAND, alignment=TA_RIGHT
        )),
    ]]
    sub_t = Table(sub_data, colWidths=[W * 0.6, W * 0.4])
    sub_t.setStyle(TableStyle([
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(sub_t)
    story.append(Spacer(1, 4 * mm))

    # ── ANÁLISIS ─────────────────────────────────────────────
    total       = len(data)
    with_errors = [a for a in data if a.get('errors_found')]
    no_errors   = total - len(with_errors)
    total_gc    = sum(int(a.get('gc_with_errors') or 0) for a in data)
    unique_dates = len(set(a.get('audit_date', '') for a in data if a.get('audit_date')))
    pct_err     = pct(len(with_errors), total)

    # ── 1. RESUMEN GENERAL ───────────────────────────────────
    story.append(Paragraph('1. Resumen General de la Semana', styles['section']))
    story.append(HRFlowable(width=W, thickness=1, color=BRAND_L))
    story.append(Spacer(1, 2 * mm))

    summary_rows = [
        ['Métrica', 'Valor', 'Métrica', 'Valor'],
        ['Total Registros',     str(total),            'Sin Errores',       str(no_errors)],
        ['Con Errores',         str(len(with_errors)), '% Con Errores',     f'{pct_err}%'],
        ['Total GC con Errores',str(total_gc),         'Días con Registros',str(unique_dates)],
    ]
    t = make_table(summary_rows, col_widths=[W*0.3, W*0.2, W*0.3, W*0.2])
    t.setStyle(TableStyle([
        ('FONTNAME',    (0, 1), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME',    (2, 1), (2, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR',   (1, 1), (1, -1), BRAND),
        ('TEXTCOLOR',   (3, 1), (3, -1), BRAND),
        ('ALIGN',       (1, 0), (1, -1), 'CENTER'),
        ('ALIGN',       (3, 0), (3, -1), 'CENTER'),
        ('BACKGROUND',  (0, 0), (-1, 0), BRAND),
        ('TEXTCOLOR',   (0, 0), (-1, 0), WHITE),
        ('FONTNAME',    (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID',        (0, 0), (-1, -1), 0.4, colors.HexColor('#dee2e6')),
        ('TOPPADDING',  (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(t)
    story.append(Spacer(1, 5 * mm))

    # ── 2. TIPOS DE ERRORES MÁS FRECUENTES ──────────────────
    story.append(Paragraph('2. Tipos de Errores Más Registrados', styles['section']))
    story.append(HRFlowable(width=W, thickness=1, color=BRAND_L))
    story.append(Spacer(1, 2 * mm))

    error_totals = {}
    error_counts = {}
    for f in ERROR_FIELDS:
        error_totals[f] = sum(int(a.get(f) or 0) for a in with_errors)
        error_counts[f] = sum(1 for a in with_errors if int(a.get(f) or 0) > 0)

    sorted_errors = sorted(
        [(f, error_totals[f], error_counts[f]) for f in ERROR_FIELDS if error_totals[f] > 0],
        key=lambda x: x[1], reverse=True
    )

    if sorted_errors:
        err_rows = [['#', 'Tipo de Error', 'Valor Acumulado', 'Registros Afectados', '% de Órdenes con Error']]
        for i, (f, total_v, count_v) in enumerate(sorted_errors, 1):
            p = pct(count_v, len(with_errors))
            err_rows.append([str(i), ERROR_LABELS[f], str(total_v), str(count_v), f'{p}%'])

        t = make_table(err_rows, col_widths=[W*0.06, W*0.34, W*0.18, W*0.22, W*0.20])
        extra_style = [
            ('ALIGN',    (0, 0), (0, -1), 'CENTER'),
            ('ALIGN',    (2, 1), (4, -1), 'CENTER'),
            ('FONTNAME', (1, 1), (1, -1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (2, 1), (2, -1), RED),
            ('FONTNAME', (2, 1), (2, -1), 'Helvetica-Bold'),
        ]
        # Colorear top 3
        for rank, row_i in enumerate([1, 2, 3], 0):
            if row_i < len(err_rows):
                rank_colors = [
                    colors.HexColor('#fff3cd'),
                    colors.HexColor('#f0f0f0'),
                    colors.HexColor('#fde8d8'),
                ]
                extra_style.append(('BACKGROUND', (0, row_i), (0, row_i), rank_colors[rank]))
        t.setStyle(TableStyle(extra_style))
        story.append(t)
    else:
        story.append(Paragraph('No se registraron errores en el período seleccionado.', styles['note']))

    story.append(Spacer(1, 5 * mm))

    # ── 3. ERRORES POR CELDA ─────────────────────────────────
    story.append(Paragraph('3. Errores por Celda de Producción', styles['section']))
    story.append(HRFlowable(width=W, thickness=1, color=BRAND_L))
    story.append(Spacer(1, 2 * mm))

    by_cell = defaultdict(lambda: {'ok': 0, 'err': 0, 'gc': 0, 'error_types': defaultdict(int)})
    for a in data:
        c = a.get('build_cell') or 'otras'
        if a.get('errors_found'):
            by_cell[c]['err'] += 1
            by_cell[c]['gc']  += int(a.get('gc_with_errors') or 0)
            for f in ERROR_FIELDS:
                v = int(a.get(f) or 0)
                if v > 0:
                    by_cell[c]['error_types'][f] += v
        else:
            by_cell[c]['ok'] += 1

    cell_rows = [['Celda', 'Total', 'Sin Errores', 'Con Errores', 'GC Errores', '% Error', 'Error Principal']]
    for c in CELLS:
        if c not in by_cell:
            continue
        r     = by_cell[c]
        tot   = r['ok'] + r['err']
        p_err = pct(r['err'], tot)
        top   = sorted(r['error_types'].items(), key=lambda x: x[1], reverse=True)
        top_label = f"{ERROR_LABELS[top[0][0]]} ({top[0][1]})" if top else 'Sin errores'
        cell_rows.append([
            f'Celda {c}', str(tot), str(r['ok']), str(r['err']),
            str(r['gc']), f'{p_err}%', top_label
        ])

    if len(cell_rows) > 1:
        t = make_table(cell_rows, col_widths=[W*0.10, W*0.09, W*0.12, W*0.12, W*0.10, W*0.09, W*0.38])
        t.setStyle(TableStyle([
            ('ALIGN',     (1, 0), (5, -1), 'CENTER'),
            ('FONTNAME',  (0, 1), (0, -1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (2, 1), (2, -1), GREEN),
            ('TEXTCOLOR', (3, 1), (3, -1), RED),
            ('TEXTCOLOR', (5, 1), (5, -1), BRAND),
            ('FONTNAME',  (5, 1), (5, -1), 'Helvetica-Bold'),
            ('FONTNAME',  (6, 1), (6, -1), 'Helvetica-Oblique'),
            ('TEXTCOLOR', (6, 1), (6, -1), RED),
        ]))
        story.append(t)
    else:
        story.append(Paragraph('No hay datos de celdas en el período.', styles['note']))

    story.append(Spacer(1, 5 * mm))

    # ── 4. DETALLE DE ERRORES POR CELDA ─────────────────────
    story.append(Paragraph('4. Detalle de Tipos de Error por Celda', styles['section']))
    story.append(HRFlowable(width=W, thickness=1, color=BRAND_L))
    story.append(Spacer(1, 2 * mm))

    for c in CELLS:
        if c not in by_cell or by_cell[c]['err'] == 0:
            continue
        r = by_cell[c]
        tot = r['ok'] + r['err']

        cell_block = []
        cell_block.append(Paragraph(
            f'<b>Celda {c}</b> — {r["err"]} registro(s) con error de {tot} totales '
            f'({pct(r["err"], tot)}%)  |  GC afectados: {r["gc"]}',
            ParagraphStyle('ch', parent=styles['body'], textColor=RED, fontSize=9)
        ))

        if r['error_types']:
            sorted_types = sorted(r['error_types'].items(), key=lambda x: x[1], reverse=True)
            type_rows = [['Tipo de Error', 'Valor Acumulado']]
            for f, v in sorted_types:
                type_rows.append([ERROR_LABELS[f], str(v)])
            t = make_table(type_rows, col_widths=[W * 0.55, W * 0.45])
            t.setStyle(TableStyle([
                ('ALIGN',    (1, 0), (1, -1), 'CENTER'),
                ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
                ('TEXTCOLOR', (1, 1), (1, -1), RED),
                ('FONTNAME', (1, 1), (1, -1), 'Helvetica-Bold'),
            ]))
            cell_block.append(Spacer(1, 1 * mm))
            cell_block.append(t)
        else:
            cell_block.append(Paragraph('Sin tipos de error especificados.', styles['note']))

        cell_block.append(Spacer(1, 3 * mm))
        story.append(KeepTogether(cell_block))

    # ── 5. ESTADÍSTICAS POR AUDITOR ──────────────────────────
    story.append(PageBreak())
    story.append(Paragraph('5. Estadísticas por Auditor', styles['section']))
    story.append(HRFlowable(width=W, thickness=1, color=BRAND_L))
    story.append(Spacer(1, 2 * mm))

    by_user = defaultdict(lambda: {'ok': 0, 'err': 0, 'gc': 0})
    for a in data:
        u = a.get('checked_by') or 'Sin asignar'
        if a.get('errors_found'):
            by_user[u]['err'] += 1
            by_user[u]['gc']  += int(a.get('gc_with_errors') or 0)
        else:
            by_user[u]['ok'] += 1

    user_rows = [['Auditor', 'Total', 'Sin Errores', 'Con Errores', 'GC Errores', '% Error']]
    for u in sorted(by_user.keys()):
        r   = by_user[u]
        tot = r['ok'] + r['err']
        user_rows.append([u, str(tot), str(r['ok']), str(r['err']), str(r['gc']), f"{pct(r['err'], tot)}%"])

    if len(user_rows) > 1:
        t = make_table(user_rows, col_widths=[W*0.28, W*0.12, W*0.16, W*0.16, W*0.14, W*0.14])
        t.setStyle(TableStyle([
            ('ALIGN',     (1, 0), (-1, -1), 'CENTER'),
            ('FONTNAME',  (0, 1), (0, -1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (2, 1), (2, -1), GREEN),
            ('TEXTCOLOR', (3, 1), (3, -1), RED),
            ('TEXTCOLOR', (5, 1), (5, -1), BRAND),
            ('FONTNAME',  (5, 1), (5, -1), 'Helvetica-Bold'),
        ]))
        story.append(t)

    story.append(Spacer(1, 5 * mm))

    # ── 6. TOP 10 ÓRDENES CON MÁS ERRORES ───────────────────
    story.append(Paragraph('6. Top 10 Órdenes con Mayor Cantidad de Errores', styles['section']))
    story.append(HRFlowable(width=W, thickness=1, color=BRAND_L))
    story.append(Spacer(1, 2 * mm))

    order_errors = sorted(
        [{'order': a.get('order_number', '(sin orden)'),
          'date':  a.get('audit_date', ''),
          'auditor': a.get('checked_by', '-'),
          'cell':  a.get('build_cell', '-'),
          'gc':    int(a.get('gc_with_errors') or 0),
          'total': get_total_errors(a)}
         for a in with_errors],
        key=lambda x: x['total'], reverse=True
    )[:10]

    if order_errors:
        top_rows = [['#', 'Orden', 'Fecha', 'Auditor', 'Celda', 'GC Err.', 'Total Err.']]
        for i, o in enumerate(order_errors, 1):
            top_rows.append([
                str(i), o['order'], fmt_date(o['date']),
                o['auditor'], o['cell'], str(o['gc']), str(o['total'])
            ])
        t = make_table(top_rows, col_widths=[W*0.05, W*0.22, W*0.13, W*0.18, W*0.10, W*0.12, W*0.20])
        t.setStyle(TableStyle([
            ('ALIGN',    (0, 0), (0, -1), 'CENTER'),
            ('ALIGN',    (5, 0), (6, -1), 'CENTER'),
            ('FONTNAME', (1, 1), (1, -1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (6, 1), (6, -1), RED),
            ('FONTNAME', (6, 1), (6, -1), 'Helvetica-Bold'),
        ]))
        story.append(t)
    else:
        story.append(Paragraph('No se encontraron órdenes con errores en el período.', styles['note']))

    # ── PIE DE PÁGINA ─────────────────────────────────────────
    def add_footer(canvas, doc_obj):
        canvas.saveState()
        canvas.setFont('Helvetica', 7)
        canvas.setFillColor(GRAY)
        page_num = canvas.getPageNumber()
        canvas.drawString(14 * mm, 10 * mm, 'DocAudit-Tecnicos  |  Reporte Semanal Automático  |  Confidencial')
        canvas.drawRightString(A4[0] - 14 * mm, 10 * mm, f'Página {page_num}')
        canvas.restoreState()

    doc.build(story, onFirstPage=add_footer, onLaterPages=add_footer)
    print(f'[OK] PDF generado: {output_path}')
    return output_path

# ── Punto de entrada ─────────────────────────────────────────
def main():
    # Calcular rango: última semana completa (lunes a domingo)
    today    = datetime.now().date()
    # Si se pasan argumentos, usarlos como from_date y to_date
    if len(sys.argv) == 3:
        from_date = sys.argv[1]
        to_date   = sys.argv[2]
    else:
        # Semana anterior: lunes a domingo
        days_since_monday = today.weekday()  # 0=lunes
        last_monday  = today - timedelta(days=days_since_monday + 7)
        last_sunday  = last_monday + timedelta(days=6)
        from_date = str(last_monday)
        to_date   = str(last_sunday)

    print(f'[INFO] Consultando datos del {from_date} al {to_date}...')

    try:
        data = fetch_data(from_date, to_date)
    except Exception as e:
        print(f'[ERROR] No se pudo consultar Supabase: {e}')
        sys.exit(1)

    print(f'[INFO] {len(data)} registros obtenidos.')

    if not data:
        print('[WARN] No hay datos para el período. No se genera PDF.')
        sys.exit(0)

    # Nombre del archivo
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    filename    = f'DocAudit_ReporteSemanal_{from_date}_{to_date}.pdf'
    output_path = os.path.join(OUTPUT_DIR, filename)

    generate_pdf(data, from_date, to_date, output_path)
    print(f'[DONE] Reporte guardado en: {output_path}')

if __name__ == '__main__':
    main()
