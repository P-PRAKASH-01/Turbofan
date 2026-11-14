"""ENGINE-TWIN Academic Project Report Generator
Builds both ENGINE_TWIN_Project_Report.docx and ENGINE_TWIN_Project_Report.pdf
Adheres strictly to the structural layout of Salini_ML_Rep.pdf.
"""

import os
import sys
import subprocess
from pathlib import Path
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

BASE_DIR = Path(r"c:\Users\Admin\OneDrive\Documents\Digital Twin")
REPORT_DIR = BASE_DIR / "report"
FIGURES_DIR = REPORT_DIR / "figures"
DOCX_OUT = REPORT_DIR / "ENGINE_TWIN_Project_Report.docx"
PDF_OUT = REPORT_DIR / "ENGINE_TWIN_Project_Report.pdf"

# Color Palette
COLOR_PRIMARY = RGBColor(11, 37, 69)      # #0B2545 Deep Navy
COLOR_SECONDARY = RGBColor(71, 85, 105)   # #475569 Slate
COLOR_BODY = RGBColor(30, 41, 59)         # #1E293B Dark Neutral
COLOR_MUTED = RGBColor(100, 116, 139)     # #64748B Muted Grey
COLOR_ACCENT = RGBColor(29, 78, 216)      # #1D4ED8 Royal Blue

HEX_HEADER_BG = "0B2545"
HEX_ROW_ALT = "F8FAFC"
HEX_CALLOUT_BG = "F1F5F9"
HEX_BORDER = "CBD5E1"

def set_cell_background(cell, hex_color):
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def set_table_borders(table, border_color="CBD5E1"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="single" w:sz="8" w:space="0" w:color="{border_color}"/>'
        f'<w:bottom w:val="single" w:sz="8" w:space="0" w:color="{border_color}"/>'
        f'<w:insideH w:val="single" w:sz="4" w:space="0" w:color="{border_color}"/>'
        f'<w:insideV w:val="none"/>'
        f'<w:left w:val="none"/>'
        f'<w:right w:val="none"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)

def add_header_p(doc, text, level=1):
    p = doc.add_paragraph()
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.bold = True
    
    if level == 1:
        run.font.size = Pt(15)
        run.font.color.rgb = COLOR_PRIMARY
        p.paragraph_format.space_before = Pt(16)
        p.paragraph_format.space_after = Pt(6)
    elif level == 2:
        run.font.size = Pt(13)
        run.font.color.rgb = COLOR_SECONDARY
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
    elif level == 3:
        run.font.size = Pt(11)
        run.italic = True
        run.font.color.rgb = COLOR_BODY
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(2)
    return p

def add_body_p(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(5)
    p.paragraph_format.space_before = Pt(0)
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(11)
    run.font.color.rgb = COLOR_BODY
    return p

def add_callout(doc, title, text, alert_type="NOTE"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    cell = tbl.cell(0, 0)
    cell.width = Inches(6.5)
    
    border_col = "2563EB" if alert_type == "NOTE" else "D97706" if alert_type == "WARNING" else "059669"
    set_cell_background(cell, HEX_CALLOUT_BG)
    set_cell_margins(cell, top=140, bottom=140, left=180, right=180)
    
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:left w:val="single" w:sz="24" w:space="0" w:color="{border_col}"/>'
        f'<w:top w:val="none"/><w:right w:val="none"/><w:bottom w:val="none"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(tcBorders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(2)
    run_t = p.add_run(f"[{alert_type}] {title}\n")
    run_t.font.name = 'Times New Roman'
    run_t.font.size = Pt(10.5)
    run_t.bold = True
    run_t.font.color.rgb = COLOR_PRIMARY
    
    run_b = p.add_run(text)
    run_b.font.name = 'Times New Roman'
    run_b.font.size = Pt(10)
    run_b.font.color.rgb = COLOR_BODY
    
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def add_figure_img(doc, img_name, caption_text, width_in=5.8):
    img_path = FIGURES_DIR / img_name
    if img_path.exists():
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.paragraph_format.space_before = Pt(8)
        p_img.paragraph_format.space_after = Pt(4)
        run_img = p_img.add_run()
        run_img.add_picture(str(img_path), width=Inches(width_in))
        
        p_cap = doc.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cap.paragraph_format.space_after = Pt(10)
        p_cap.paragraph_format.keep_with_next = True
        run_cap = p_cap.add_run(caption_text)
        run_cap.font.name = 'Times New Roman'
        run_cap.font.size = Pt(9.5)
        run_cap.italic = True
        run_cap.font.color.rgb = COLOR_MUTED
    else:
        print(f"Warning: Figure {img_name} not found at {img_path}")

def format_custom_table(doc, headers, rows_data, caption_text=None, col_widths=None):
    if caption_text:
        p_cap = doc.add_paragraph()
        p_cap.paragraph_format.space_before = Pt(8)
        p_cap.paragraph_format.space_after = Pt(3)
        p_cap.paragraph_format.keep_with_next = True
        run_cap = p_cap.add_run(caption_text)
        run_cap.font.name = 'Times New Roman'
        run_cap.font.size = Pt(10)
        run_cap.bold = True
        run_cap.font.color.rgb = COLOR_PRIMARY

    tbl = doc.add_table(rows=len(rows_data) + 1, cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    set_table_borders(tbl)
    
    # Header Row
    hdr_cells = tbl.rows[0].cells
    for i, h_text in enumerate(headers):
        hdr_cells[i].text = h_text
        set_cell_background(hdr_cells[i], HEX_HEADER_BG)
        set_cell_margins(hdr_cells[i], top=100, bottom=100, left=120, right=120)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        for run in p.runs:
            run.font.name = 'Times New Roman'
            run.font.size = Pt(9.5)
            run.bold = True
            run.font.color.rgb = RGBColor(255, 255, 255)
            
    # Data Rows
    for r_idx, row_vals in enumerate(rows_data):
        row_cells = tbl.rows[r_idx + 1].cells
        bg_col = HEX_ROW_ALT if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row_vals):
            row_cells[c_idx].text = str(val)
            set_cell_background(row_cells[c_idx], bg_col)
            set_cell_margins(row_cells[c_idx], top=80, bottom=80, left=120, right=120)
            p = row_cells[c_idx].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for run in p.runs:
                run.font.name = 'Times New Roman'
                run.font.size = Pt(9)
                run.font.color.rgb = COLOR_BODY
                
    if col_widths:
        for row in tbl.rows:
            for i, w in enumerate(col_widths):
                row.cells[i].width = Inches(w)
                
    doc.add_paragraph().paragraph_format.space_after = Pt(6)

print("Report helper modules initialized.")
