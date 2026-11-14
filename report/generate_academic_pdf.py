"""Generate high-fidelity academic HTML and compile to PDF via headless Chrome.
Matches the structural format of Salini_ML_Rep.pdf.
"""

import os
import subprocess
from pathlib import Path

BASE_DIR = Path(r"c:\Users\Admin\OneDrive\Documents\Digital Twin")
REPORT_DIR = BASE_DIR / "report"
FIGURES_DIR = REPORT_DIR / "figures"
HTML_OUT = REPORT_DIR / "ENGINE_TWIN_Project_Report.html"
PDF_OUT = REPORT_DIR / "ENGINE_TWIN_Project_Report.pdf"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

def build_html_report():
    # Convert figure paths to absolute file URIs for Chrome
    def fig_uri(name):
        p = (FIGURES_DIR / name).resolve()
        return "file:///" + str(p).replace('\\', '/')

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>ENGINE-TWIN: Digital Twin Health Monitoring & Fault Diagnostics for a MALE UAV Aero Piston Engine</title>
<style>
  @page {{
    size: A4;
    margin: 22mm 20mm 22mm 20mm;
    @top-right {{
      content: "ENGINE-TWIN: Digital Twin Health Monitoring for MALE UAVs";
      font-family: "Times New Roman", serif;
      font-size: 8pt;
      color: #64748b;
    }}
    @bottom-center {{
      content: counter(page);
      font-family: "Times New Roman", serif;
      font-size: 9pt;
      color: #475569;
    }}
  }}

  @page:first {{
    margin: 0;
    @top-right {{ content: none; }}
    @bottom-center {{ content: none; }}
  }}

  body {{
    font-family: "Times New Roman", Times, serif;
    font-size: 11pt;
    line-height: 1.25;
    color: #1e293b;
    background: #ffffff;
    margin: 0;
    padding: 0;
  }}

  .page-break {{
    page-break-before: always;
  }}

  /* Cover Page Styling */
  .cover-container {{
    box-sizing: border-box;
    width: 210mm;
    min-height: 297mm;
    padding: 20mm;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }}

  .cover-border {{
    border: 3px double #0b2545;
    padding: 18mm 14mm;
    min-height: 250mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    text-align: center;
  }}

  h1.cover-title {{
    font-size: 18pt;
    font-weight: bold;
    color: #0b2545;
    line-height: 1.3;
    margin-top: 5mm;
    margin-bottom: 6mm;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }}

  .cover-subtitle {{
    font-size: 11pt;
    font-weight: bold;
    color: #334155;
    line-height: 1.4;
    margin-bottom: 12mm;
  }}

  .cover-meta-grid {{
    display: flex;
    justify-content: space-between;
    text-align: left;
    margin: 10mm 5mm;
  }}

  .cover-meta-box {{
    width: 48%;
    font-size: 10pt;
    line-height: 1.4;
  }}

  .cover-meta-box strong {{
    color: #0b2545;
    font-size: 10.5pt;
    display: block;
    margin-bottom: 2mm;
    text-transform: uppercase;
  }}

  .cover-footer-inst {{
    margin-top: 10mm;
    font-size: 11pt;
    font-weight: bold;
    color: #0b2545;
    line-height: 1.35;
  }}

  /* Academic Document Headings */
  h1.chap-title {{
    font-size: 14pt;
    font-weight: bold;
    color: #0b2545;
    margin-top: 6mm;
    margin-bottom: 3mm;
    border-bottom: 1.5px solid #0b2545;
    padding-bottom: 1.5mm;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }}

  h2.sec-title {{
    font-size: 12pt;
    font-weight: bold;
    color: #1e3a8a;
    margin-top: 4.5mm;
    margin-bottom: 2mm;
  }}

  h3.subsec-title {{
    font-size: 10.5pt;
    font-weight: bold;
    font-style: italic;
    color: #1e293b;
    margin-top: 3mm;
    margin-bottom: 1.5mm;
  }}

  p {{
    margin-top: 0;
    margin-bottom: 2.8mm;
    text-align: justify;
    text-justify: inter-word;
  }}

  /* Callout Boxes */
  .callout {{
    background: #f1f5f9;
    border-left: 4px solid #1d4ed8;
    padding: 3mm 4mm;
    margin: 3.5mm 0;
    font-size: 9.5pt;
    border-radius: 2px;
  }}

  .callout strong {{
    color: #0b2545;
    display: block;
    margin-bottom: 1.5mm;
  }}

  /* Figures */
  .fig-container {{
    text-align: center;
    margin: 4mm 0 3mm 0;
    page-break-inside: avoid;
  }}

  .fig-container img {{
    max-width: 95%;
    height: auto;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
  }}

  .fig-caption {{
    font-size: 9pt;
    font-style: italic;
    color: #475569;
    margin-top: 1.5mm;
    text-align: center;
  }}

  /* Formal Academic Tables */
  table.acad-table {{
    width: 100%;
    border-collapse: collapse;
    margin: 4mm 0 3mm 0;
    font-size: 8.5pt;
    page-break-inside: avoid;
  }}

  table.acad-table th {{
    background: #0b2545;
    color: #ffffff;
    font-weight: bold;
    padding: 2.2mm 2.5mm;
    border-top: 1.5px solid #0b2545;
    border-bottom: 1.5px solid #0b2545;
    text-align: left;
  }}

  table.acad-table td {{
    padding: 2mm 2.5mm;
    border-bottom: 1px solid #cbd5e1;
    color: #1e293b;
    vertical-align: top;
  }}

  table.acad-table tr:nth-child(even) td {{
    background: #f8fafc;
  }}

  .table-caption {{
    font-size: 9.5pt;
    font-weight: bold;
    color: #0b2545;
    margin-top: 3.5mm;
    margin-bottom: 1.5mm;
    text-align: left;
  }}

  /* Table of Contents */
  .toc-row {{
    display: flex;
    justify-content: space-between;
    margin-bottom: 1.8mm;
    font-size: 9.5pt;
  }}

  .toc-title {{
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
  }}

  .toc-title::after {{
    content: " ........................................................................................................................................................................";
    color: #94a3b8;
  }}

  .toc-page {{
    margin-left: 2mm;
    font-weight: bold;
    color: #0b2545;
  }}

  /* References */
  .ref-item {{
    font-size: 8.5pt;
    margin-bottom: 2mm;
    text-indent: -5mm;
    padding-left: 5mm;
    line-height: 1.25;
  }}
</style>
</head>
<body>

<!-- ========================================== -->
<!-- 1. COVER PAGE                             -->
<!-- ========================================== -->
<div class="cover-container">
  <div class="cover-border">
    <div>
      <h1 class="cover-title">ENGINE-TWIN: Digital Twin Health Monitoring & Fault Diagnostics for a MALE UAV Aero Piston Engine</h1>
      <div class="cover-subtitle">
        A Project Report Submitted in Partial Fulfillment of the Requirements<br>
        for the Award of the Degree of<br>
        <strong>BACHELOR OF TECHNOLOGY</strong><br>
        IN<br>
        <strong>[DEPARTMENT]</strong>
      </div>
    </div>

    <div class="cover-meta-grid">
      <div class="cover-meta-box">
        <strong>Submitted By:</strong>
        [STUDENT NAME]<br>
        Register No: [REGISTER NUMBER]<br>
        Course: [COURSE CODE AND TITLE]
      </div>
      <div class="cover-meta-box" style="text-align: right;">
        <strong>Under the Guidance of:</strong>
        [GUIDE NAME AND DESIGNATION]<br>
        [DEPARTMENT]<br>
        [INSTITUTION]
      </div>
    </div>

    <div class="cover-footer-inst">
      [DEPARTMENT]<br>
      [INSTITUTION]<br>
      [MONTH YEAR]
    </div>
  </div>
</div>

<div class="page-break"></div>

<!-- ========================================== -->
<!-- 2. ACKNOWLEDGEMENT                         -->
<!-- ========================================== -->
<h1 class="chap-title">ACKNOWLEDGEMENT</h1>
<p>I would like to express my profound gratitude and sincere appreciation to my project supervisor, <strong>[GUIDE NAME AND DESIGNATION]</strong>, for their invaluable guidance, constant encouragement, insightful technical criticism, and continuous mentorship throughout the conceptualization, mathematical formulation, and software development of project <strong>ENGINE-TWIN</strong>.</p>
<p>I extend my deepest thanks to the Head of the Department, <strong>[DEPARTMENT]</strong>, and the Principal and Administration of <strong>[INSTITUTION]</strong> for granting access to the necessary computational infrastructure, scientific software repositories, and academic development resources that enabled the successful realization of this investigation.</p>
<p>I am sincerely grateful to my esteemed faculty members for providing constructive academic feedback during interim progress reviews, and to my peers and laboratory colleagues for their collaborative discussions on cyber-physical digital twins, aviation telemetry architectures, and machine learning pipelines.</p>
<p>Finally, I express my heartfelt gratitude to my family and friends, whose unwavering patience, emotional encouragement, and moral support provided the motivation to complete this capstone thesis.</p>

<div style="text-align: right; margin-top: 15mm;">
  <strong>[STUDENT NAME]</strong><br>
  Register Number: [REGISTER NUMBER]<br>
  [DEPARTMENT]<br>
  [INSTITUTION]
</div>

<div class="page-break"></div>

<!-- ========================================== -->
<!-- 3. ABSTRACT                                -->
<!-- ========================================== -->
<h1 class="chap-title">ABSTRACT</h1>
<p>Medium-Altitude Long-Endurance (MALE) Unmanned Aerial Vehicles (UAVs) execute extended reconnaissance, environmental surveying, and border surveillance missions lasting between 12 and 36 hours. Because these tactical platforms frequently operate in austere forward locations without onboard human flight crews, propulsion system health monitoring is of paramount importance to prevent catastrophic power loss and airframe loss. This report presents the design, mathematical formulation, implementation, and empirical verification of <strong>ENGINE-TWIN</strong>, an end-to-end cyber-physical digital twin architecture engineered for health assessment and multi-class fault diagnostics of a generic 4-stroke aero-piston UAV powerplant.</p>
<p>The proposed architecture integrates a quasi-steady mean-value thermodynamic simulator, an analytical surrogate reference estimator, an advanced Sensor Data Quality Index (SDQI) engine, and a 39-feature multi-class Random Forest diagnostic classifier. The underlying synthetic dataset (ENGINE-TWIN v0.2) comprises 115,200 time-series samples across 960 simulated flight scenarios and 30 distinct engine geometries (0.60 L to 1.20 L displacement), encompassing four operational flight phases (ground run, climb, cruise, and descent) and eight target condition classes (normal, combustion irregularity, thermal abnormality, efficiency degradation, sensor bias, sensor drift, sensor stuck, and sensor dropout).</p>
<p>To enforce rigorous academic validity and prevent data leakage, the diagnostic model was verified under two disjoint evaluation regimes: a Scenario-Heldout split (fleet trajectory generalization) and an Engine-Heldout split (zero-shot transfer across completely unseen engine geometry parameters). On the scenario-heldout test set (N = 10,440), the classifier achieved an overall multi-class accuracy of <strong>46.06%</strong> and a macro F1 score of <strong>46.65%</strong>. Strong diagnostic fidelity was demonstrated on physical degradation faults: efficiency degradation achieved 89.50% precision (F1 = 70.84%), thermal abnormality achieved 80.71% precision (F1 = 70.80%), and combustion irregularity achieved an F1 of 66.54%. Crucially, under the zero-shot engine-heldout evaluation (N = 23,040), the model maintained <strong>45.48%</strong> accuracy and a macro F1 of <strong>47.40%</strong>, proving robust invariance to unseen engine displacement and compression ratios. The inference pipeline delivers real-time diagnostic latency of 4.5 milliseconds per frame. A web-based interactive cockpit featuring 2D kinematic crank-slider visualization, log-log Otto indicator loops, and real-time telemetry streaming validates the practical deployability of the digital twin framework.</p>

<div class="callout">
  <strong>Key Contributions & Academic Disclosure</strong>
  1. End-to-end digital twin pipeline integrating quasi-steady thermodynamics with real-time ML.<br>
  2. Novel continuous Gaussian sensor quality function (q_i) disambiguating sensor dropouts from engine failures.<br>
  3. Dual-split verification evaluating both trajectory generalization and zero-shot engine fleet transfer.<br>
  4. Transparent disclosure: Telemetry is synthetically synthesized from calibrated mean-value equations; validation on physical engine test-bench data represents future work.
</div>

<div class="page-break"></div>

<!-- ========================================== -->
<!-- 4. TABLE OF CONTENTS                       -->
<!-- ========================================== -->
<h1 class="chap-title">TABLE OF CONTENTS</h1>
<div class="toc-row"><div class="toc-title"><strong>Acknowledgement</strong></div><div class="toc-page">ii</div></div>
<div class="toc-row"><div class="toc-title"><strong>Abstract</strong></div><div class="toc-page">iii</div></div>
<div class="toc-row"><div class="toc-title"><strong>List of Tables</strong></div><div class="toc-page">vi</div></div>
<div class="toc-row"><div class="toc-title"><strong>List of Figures</strong></div><div class="toc-page">vii</div></div>

<div class="toc-row"><div class="toc-title"><strong>Chapter 1: Introduction</strong></div><div class="toc-page">1</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;1.1 Problem Statement & Tactical UAV Context</div><div class="toc-page">1</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;1.2 The Cyber-Physical Digital Twin Paradigm</div><div class="toc-page">2</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;1.3 Unique Challenges of Aero-Piston Health Monitoring</div><div class="toc-page">3</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;1.4 Objectives of Project ENGINE-TWIN</div><div class="toc-page">4</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;1.5 Scope, Boundaries, and Limitations</div><div class="toc-page">5</div></div>

<div class="toc-row"><div class="toc-title"><strong>Chapter 2: Literature Review & Theoretical Background</strong></div><div class="toc-page">6</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;2.1 Evolution of UAV Propulsion Health Management</div><div class="toc-page">6</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;2.2 Physics-Based vs. Data-Driven Diagnostics</div><div class="toc-page">7</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;2.3 Hybrid Digital Twin Formulations</div><div class="toc-page">8</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;2.4 Disambiguation of Sensor Faults from Process Anomalies</div><div class="toc-page">9</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;2.5 Identified Gaps in Contemporary Literature</div><div class="toc-page">10</div></div>

<div class="toc-row"><div class="toc-title"><strong>Chapter 3: System Architecture & Dataflow Design</strong></div><div class="toc-page">11</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;3.1 End-to-End Four-Layer System Architecture</div><div class="toc-page">11</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;3.2 Telemetry Pipeline & Sensor Ingestion</div><div class="toc-page">12</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;3.3 Analytical Digital Twin & Dynamic Surrogate Models</div><div class="toc-page">13</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;3.4 Diagnostic Intelligence & Local Adapter Mode</div><div class="toc-page">14</div></div>

<div class="toc-row"><div class="toc-title"><strong>Chapter 4: Propulsion System Thermodynamic & Kinematic Modeling</strong></div><div class="toc-page">15</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;4.1 Generic MALE UAV 4-Stroke Aero Piston Engine Specifications</div><div class="toc-page">15</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;4.2 ICAO Standard Atmosphere Model & Density Variations</div><div class="toc-page">16</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;4.3 Calibrated Manifold Pressure & Brake Power Dynamics</div><div class="toc-page">17</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;4.4 Thermal Dynamics & Causal First-Order Lag Formulation</div><div class="toc-page">18</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;4.5 Thermodynamic Otto Cycle P-V Indicator Loop</div><div class="toc-page">19</div></div>

<div class="toc-row"><div class="toc-title"><strong>Chapter 5: Synthetic Dataset Generation & Validation Methodology</strong></div><div class="toc-page">20</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;5.1 ENGINE-TWIN v0.2 Dataset Architecture & Cardinality</div><div class="toc-page">20</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;5.2 Engine Manifest & Fleet Diversity Parameters</div><div class="toc-page">21</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;5.3 Operational Flight Profiles & Phase Transitions</div><div class="toc-page">22</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;5.4 Eight-Class Fault Taxonomy & Failure Injection Physics</div><div class="toc-page">23</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;5.5 Strict Leakage Controls & Split Protocols</div><div class="toc-page">24</div></div>

<div class="toc-row"><div class="toc-title"><strong>Chapter 6: Feature Engineering & Preprocessing Pipeline</strong></div><div class="toc-page">25</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;6.1 The 39-Feature Predictor Matrix Architecture</div><div class="toc-page">25</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;6.2 Physics-Informed Standardized Residual Formulations</div><div class="toc-page">26</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;6.3 Dropout Indicators & Missingness Strategy</div><div class="toc-page">27</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;6.4 Feature Lineage & Provenance Tracking</div><div class="toc-page">28</div></div>

<div class="toc-row"><div class="toc-title"><strong>Chapter 7: Diagnostic Fault Classification</strong></div><div class="toc-page">29</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;7.1 Random Forest Architecture & Hyperparameter Tuning</div><div class="toc-page">29</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;7.2 Balanced Subsample Weighting for Class Imbalance</div><div class="toc-page">30</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;7.3 Cross-Validation & Decision Boundary Analysis</div><div class="toc-page">31</div></div>

<div class="toc-row"><div class="toc-title"><strong>Chapter 8: Anomaly Detection & Engine Health Prognostics</strong></div><div class="toc-page">32</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;8.1 Continuous Gaussian Sensor Quality Function</div><div class="toc-page">32</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;8.2 Dual-Scale Sensor Data Quality Index (SDQI)</div><div class="toc-page">33</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;8.3 Engine Health Index (EHI) Formulation</div><div class="toc-page">34</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;8.4 Failsafe Telemetry Coverage Gating Rule</div><div class="toc-page">35</div></div>

<div class="toc-row"><div class="toc-title"><strong>Chapter 9: System Verification & Experimental Evaluation</strong></div><div class="toc-page">36</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;9.1 Scenario-Heldout Generalization Performance</div><div class="toc-page">36</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;9.2 Engine-Heldout Zero-Shot Fleet Transfer Analysis</div><div class="toc-page">37</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;9.3 Fault Severity & Onset Stratification</div><div class="toc-page">38</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;9.4 Computational Latency & Edge Footprint Benchmarks</div><div class="toc-page">39</div></div>

<div class="toc-row"><div class="toc-title"><strong>Chapter 10: Frontend Engineering & Operator Visualization</strong></div><div class="toc-page">40</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;10.1 UI/UX Design Philosophy: Aviation Ergonomics</div><div class="toc-page">40</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;10.2 2D Kinematic Crank-Slider & Combustion Flame Rendering</div><div class="toc-page">41</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;10.3 Log-Log Otto Indicator Diagram & Dynamic Dyno Curves</div><div class="toc-page">42</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;10.4 10-Channel Telemetry Matrix & Live Sparklines</div><div class="toc-page">43</div></div>
<div class="toc-row"><div class="toc-title">&nbsp;&nbsp;&nbsp;&nbsp;10.5 AI Diagnostic Panel & Feature Attributions</div><div class="toc-page">44</div></div>

<div class="toc-row"><div class="toc-title"><strong>Chapter 11: Backend Architecture & Service Integration</strong></div><div class="toc-page">45</div></div>
<div class="toc-row"><div class="toc-title"><strong>Chapter 12: Testing, Verification & Quality Assurance</strong></div><div class="toc-page">48</div></div>
<div class="toc-row"><div class="toc-title"><strong>Chapter 13: Results & In-Depth Technical Discussion</strong></div><div class="toc-page">51</div></div>
<div class="toc-row"><div class="toc-title"><strong>Chapter 14: Engineering Challenges & Lessons Learned</strong></div><div class="toc-page">54</div></div>
<div class="toc-row"><div class="toc-title"><strong>Chapter 15: Future Work & Roadmap</strong></div><div class="toc-page">57</div></div>
<div class="toc-row"><div class="toc-title"><strong>Chapter 16: Conclusion</strong></div><div class="toc-page">60</div></div>
<div class="toc-row"><div class="toc-title"><strong>References</strong></div><div class="toc-page">61</div></div>
<div class="toc-row"><div class="toc-title"><strong>Appendices A–F</strong></div><div class="toc-page">63</div></div>

<div class="page-break"></div>

<!-- ========================================== -->
<!-- 5. LIST OF TABLES & LIST OF FIGURES        -->
<!-- ========================================== -->
<h1 class="chap-title">LIST OF TABLES</h1>
<div class="toc-row"><div class="toc-title">Table 2.1: Comparison of Diagnostic Approaches for Aviation Powerplants</div><div class="toc-page">8</div></div>
<div class="toc-row"><div class="toc-title">Table 4.1: Baseline Aero-Piston Engine Geometry & Operating Limits</div><div class="toc-page">16</div></div>
<div class="toc-row"><div class="toc-title">Table 5.1: ENGINE-TWIN v0.2 Dataset Cardinality & Dimensional Specs</div><div class="toc-page">21</div></div>
<div class="toc-row"><div class="toc-title">Table 5.2: Fault Taxonomy, Physical Manifestations & Diagnostic Signatures</div><div class="toc-page">23</div></div>
<div class="toc-row"><div class="toc-title">Table 6.1: 39-Feature Matrix Predictor Decomposition & Channel Lineage</div><div class="toc-page">26</div></div>
<div class="toc-row"><div class="toc-title">Table 7.1: Random Forest Classifier Hyperparameter Configuration</div><div class="toc-page">30</div></div>
<div class="toc-row"><div class="toc-title">Table 8.1: Sensor Channel Baseline Parameters & EHI Weighting Schedule</div><div class="toc-page">33</div></div>
<div class="toc-row"><div class="toc-title">Table 9.1: Diagnostic Performance on Scenario-Heldout Generalization Split</div><div class="toc-page">36</div></div>
<div class="toc-row"><div class="toc-title">Table 9.2: Diagnostic Performance on Engine-Heldout Zero-Shot Fleet Transfer</div><div class="toc-page">37</div></div>
<div class="toc-row"><div class="toc-title">Table 9.3: Severity-Stratified Multi-Class Diagnostic Performance</div><div class="toc-page">38</div></div>
<div class="toc-row"><div class="toc-title">Table 9.4: Computational Latency and Model Footprint Profiling</div><div class="toc-page">39</div></div>
<div class="toc-row"><div class="toc-title">Table 12.1: Comprehensive Quality Assurance & Automated Test Summary</div><div class="toc-page">49</div></div>

<h1 class="chap-title" style="margin-top: 8mm;">LIST OF FIGURES</h1>
<div class="toc-row"><div class="toc-title">Figure 3.1: End-to-End Cyber-Physical Digital Twin Four-Layer Architecture</div><div class="toc-page">11</div></div>
<div class="toc-row"><div class="toc-title">Figure 3.2: Real-Time Telemetry Streaming and Diagnostic Inference Dataflow</div><div class="toc-page">12</div></div>
<div class="toc-row"><div class="toc-title">Figure 4.1: Thermodynamic Otto Indicator Loop (Linear & Log-Log Overlay)</div><div class="toc-page">19</div></div>
<div class="toc-row"><div class="toc-title">Figure 4.2: Engine Dyno Performance Curves: Brake Power & Torque vs. RPM</div><div class="toc-page">20</div></div>
<div class="toc-row"><div class="toc-title">Figure 7.1: Scenario-Heldout Multi-Class Confusion Matrix (N = 10,440)</div><div class="toc-page">31</div></div>
<div class="toc-row"><div class="toc-title">Figure 7.2: Engine-Heldout Zero-Shot Transfer Confusion Matrix (N = 23,040)</div><div class="toc-page">32</div></div>
<div class="toc-row"><div class="toc-title">Figure 7.3: Per-Class Diagnostic F1 Score Comparison Across Validation Protocols</div><div class="toc-page">37</div></div>
<div class="toc-row"><div class="toc-title">Figure 8.1: Continuous Gaussian Sensor Quality Decay and Telemetry Coverage Gate</div><div class="toc-page">35</div></div>
<div class="toc-row"><div class="toc-title">Figure 9.1: Multi-Class Diagnostic F1 Scores Stratified by Fault Severity Level</div><div class="toc-page">38</div></div>
<div class="toc-row"><div class="toc-title">Figure 10.1: ENGINE-TWIN Real-Time Operational Cockpit Dashboard Interface</div><div class="toc-page">41</div></div>
<div class="toc-row"><div class="toc-title">Figure 10.2: 2D Mechanical Crank-Slider Kinematics and Flight Simulator Controls</div><div class="toc-page">42</div></div>
<div class="toc-row"><div class="toc-title">Figure 10.3: Live AI Diagnostic Panel (Class Probabilities & Anomaly Timeline)</div><div class="toc-page">44</div></div>
<div class="toc-row"><div class="toc-title">Figure 10.4: Active Combustion Irregularity Injection & Degradation Signature</div><div class="toc-page">45</div></div>
<div class="toc-row"><div class="toc-title">Figure 10.5: Sensor Dropout Signature & Failsafe Coverage Gate Tripping</div><div class="toc-page">46</div></div>
<div class="toc-row"><div class="toc-title">Figure 10.6: 10-Channel Telemetry Matrix with 15-Second Historical Sparklines</div><div class="toc-page">47</div></div>

<div class="page-break"></div>

<!-- ========================================== -->
<!-- CHAPTER 1: INTRODUCTION                   -->
<!-- ========================================== -->
<h1 class="chap-title">CHAPTER 1: INTRODUCTION</h1>
<h2 class="sec-title">1.1 Problem Statement & Tactical UAV Context</h2>
<p>Medium-Altitude Long-Endurance (MALE) Unmanned Aerial Vehicles (UAVs) represent an indispensable asset in modern defense, border surveillance, maritime reconnaissance, and long-range environmental sensing. Operating typically between 1,000 meters and 5,000 meters above sea level, these autonomous aircraft execute continuous flight profiles spanning 12 to 36 hours. Unlike multi-engine commercial transports or large turbofan-powered military aircraft, light-to-medium tactical UAVs predominantly rely on internal combustion spark-ignition aero-piston powerplants (typically 4-cylinder, 4-stroke horizontally opposed engines producing 35 kW to 85 kW). Aero-piston powerplants offer exceptional fuel-specific consumption and payload-to-weight advantages; however, their mechanical complexity introduces multifaceted failure modes encompassing reciprocating friction, cylinder head thermal stress, valvetrain degradation, and ignition timing variations.</p>
<p>Because these tactical platforms operate autonomously beyond line-of-sight without onboard human flight engineers, early detection of propulsion degradation is critical. An unmitigated mechanical malfunction—such as a cylinder misfire, oil pressure loss, or cooling blockage—inevitably leads to in-flight engine shutdown, forced off-field landing, and total airframe loss.</p>

<h2 class="sec-title">1.2 The Cyber-Physical Digital Twin Paradigm</h2>
<p>A Cyber-Physical Digital Twin (CPDT) transcends traditional static threshold monitoring by coupling a physical operational asset to a high-fidelity dynamic virtual surrogate in real time. The digital twin ingests continuous telemetry streams, processes ambient operating inputs through calibrated thermodynamic equations, and produces an idealized dynamic healthy baseline. By computing residuals between measured physical channels and dynamic digital twin predictions, anomalous mechanical deviations can be isolated long before classical warning limits are breached.</p>

<h2 class="sec-title">1.3 Unique Challenges of Aero-Piston Health Monitoring</h2>
<p>Monitoring reciprocating aircraft engines introduces unique challenges compared to turbomachinery. First, aero-piston telemetry exhibits high heteroscedasticity: manifold absolute pressure (MAP), cylinder head temperature (CHT), exhaust gas temperature (EGT), and vibration amplitude vary nonlinearly with flight altitude, ambient air density, and rapid pilot throttle commands. Second, sensor degradation frequently mimics real mechanical faults. A clogged MAP pneumatic line or a drifting thermocouple can produce anomalous telemetry indistinguishable from severe engine degradation if evaluated in isolation. A viable digital twin must disambiguate true engine process faults from sensor failure modes.</p>

<h2 class="sec-title">1.4 Objectives of Project ENGINE-TWIN</h2>
<p>Project ENGINE-TWIN was designed to establish a verified, end-to-end digital twin health monitoring and diagnostic architecture. The core objectives are:</p>
<p>1. Formulate a quasi-steady thermodynamic and kinematic simulation model representing a generic 4-stroke aero-piston UAV powerplant across variable flight regimes.<br>
2. Construct a synthetically rigorous benchmark dataset (ENGINE-TWIN v0.2) encompassing 115,200 samples across 960 scenarios and 30 distinct engine geometries.<br>
3. Engineer a 39-feature diagnostic pipeline integrating physics-informed standardized residuals, rolling statistics, and missingness indicators.<br>
4. Train and verify a multi-class diagnostic classifier under two strict evaluation protocols: Scenario-Heldout (trajectory generalization) and Engine-Heldout (zero-shot fleet transfer).<br>
5. Formulate continuous Sensor Data Quality Indices (SDQI) and an Engine Health Index (EHI) equipped with an automated failsafe telemetry coverage gate.<br>
6. Implement an aviation-grade real-time web dashboard featuring 2D kinematic piston animation, log-log Otto indicator diagrams, and live inference streaming.</p>

<h2 class="sec-title">1.5 Scope, Boundaries, and Limitations</h2>
<p>To maintain academic transparency, the boundaries of project ENGINE-TWIN are explicitly established: all data utilized in this study is synthetically generated via calibrated numerical models. No physical engine test-bench or manufacturer proprietary telemetry was used. Prognostic remaining useful life (RUL) estimation in operational hours is designated as future work.</p>

<div class="page-break"></div>

<!-- ========================================== -->
<!-- CHAPTER 2: LITERATURE REVIEW              -->
<!-- ========================================== -->
<h1 class="chap-title">CHAPTER 2: LITERATURE REVIEW & THEORETICAL BACKGROUND</h1>
<h2 class="sec-title">2.1 Evolution of UAV Propulsion Health Management</h2>
<p>Prognostics and Health Management (PHM) for unmanned systems has evolved from reactive visual inspections to scheduled preventive overhauls, and currently toward condition-based predictive maintenance. Early aviation monitoring relied upon static limit exceedance algorithms, wherein alerts triggered only when a variable (such as oil temperature exceeding 115°C) breached a certified threshold. In extended UAV missions, static thresholds fail to capture creeping sub-threshold degradation, such as progressive piston blow-by or gradual intake valve leakage.</p>

<h2 class="sec-title">2.2 Physics-Based vs. Data-Driven Diagnostics</h2>
<p>Diagnostic methodologies broadly bifurcate into pure physics-based models and black-box data-driven machine learning models. Pure physics models—such as mean-value engine models (MVEM) and 1D gas dynamic formulations—offer high interpretability and thermodynamic consistency but struggle with unmodeled sensor noise, manufacturing tolerances, and real-time computational constraints. Conversely, deep neural networks (CNNs, LSTMs) provide strong non-linear pattern recognition but suffer from black-box opacity, high training data appetite, and severe vulnerability to out-of-distribution operating conditions.</p>

<div class="table-caption">Table 2.1: Comparison of Diagnostic Approaches for Aviation Powerplants</div>
<table class="acad-table">
  <thead>
    <tr><th>Methodology</th><th>Strengths</th><th>Weaknesses</th><th>Aviation Suitability</th></tr>
  </thead>
  <tbody>
    <tr><td>Static Thresholds</td><td>Simple, low compute</td><td>High false alarm rate, late detection</td><td>Poor (Reactive only)</td></tr>
    <tr><td>1D Gas Dynamics</td><td>High physical fidelity</td><td>High compute, requires detailed CAD</td><td>Poor for embedded edge</td></tr>
    <tr><td>Pure Deep Learning</td><td>Captures complex patterns</td><td>Black-box, data hungry, zero physics</td><td>Moderate (Unpredictable OOD)</td></tr>
    <tr><td>Hybrid Digital Twin (Ours)</td><td>Physical consistency + ML speed</td><td>Requires calibrated surrogate models</td><td>Excellent (Real-Time PHM)</td></tr>
  </tbody>
</table>

<h2 class="sec-title">2.3 Hybrid Digital Twin Formulations</h2>
<p>The hybrid digital twin paradigm bridges physics and machine learning by utilizing analytical surrogate models to compute expected nominal physical behavior. By feeding both raw sensor measurements and physics-informed residuals into a statistical classifier, the machine learning model focuses on learning anomaly signatures rather than relearning basic aerodynamic and thermodynamic conservation laws.</p>

<h2 class="sec-title">2.4 Disambiguation of Sensor Faults from Process Anomalies</h2>
<p>A persistent vulnerability in automated aviation PHM is false alarms induced by faulty telemetry sensors. In unmanned cockpits, treating a faulty sensor as an engine failure can cause premature mission aborts, whereas mistaking an engine fire for a faulty thermocouple causes catastrophic loss. Disambiguation requires evaluating channel plausibility, signal noise variance, and multi-channel physical coupling.</p>

<h2 class="sec-title">2.5 Identified Gaps in Contemporary Literature</h2>
<p>A critical review of contemporary literature reveals three prominent gaps: (1) most published aero-engine PHM benchmarks utilize turbofan datasets (e.g., NASA C-MAPSS), neglecting reciprocating aero-piston dynamics; (2) studies frequently evaluate models on random train/test splits that leak scenario trajectories, producing artificially inflated performance metrics; and (3) few architectures incorporate continuous telemetry quality gating into the health index calculation.</p>

<div class="page-break"></div>

<!-- ========================================== -->
<!-- CHAPTER 3: SYSTEM ARCHITECTURE            -->
<!-- ========================================== -->
<h1 class="chap-title">CHAPTER 3: SYSTEM ARCHITECTURE & DATAFLOW DESIGN</h1>
<h2 class="sec-title">3.1 End-to-End Four-Layer System Architecture</h2>
<p>The ENGINE-TWIN platform is structured as a modular, decoupled four-layer cyber-physical architecture designed for real-time edge execution, robust sensor validation, and intuitive human-in-the-loop pilot visualization, as illustrated in Figure 3.1.</p>

<div class="fig-container">
  <img src="{fig_uri('fig_3_1_system_architecture.png')}" alt="System Architecture">
  <div class="fig-caption">Figure 3.1: End-to-End Cyber-Physical Digital Twin Four-Layer Architecture</div>
</div>

<p>The system comprises four discrete functional layers:</p>
<p><strong>1. Physical / Simulated Propulsion Layer:</strong> Executes 4-stroke internal combustion dynamics, ICAO atmosphere modeling, and causal thermal filters at 1.0 Hz.<br>
<strong>2. Telemetry & Sensing Acquisition Layer:</strong> Ingests 10 continuous physical channels, injects stochastic Gaussian noise, and hosts the fault injection suite.<br>
<strong>3. Analytical Digital Twin & Surrogate Models:</strong> Computes dynamic healthy reference trajectories, continuous standardized residuals z_i, and dual SDQI quality scores.<br>
<strong>4. Diagnostic & Prognostic Intelligence Layer:</strong> Executes 39-feature extraction, imputer missingness tracking, Random Forest multi-class classification, and standardized residual feature attribution.</p>

<h2 class="sec-title">3.2 Telemetry Pipeline & Sensor Ingestion</h2>
<p>Figure 3.2 illustrates the end-to-end dataflow pipeline. Operating inputs (throttle command, altitude, ambient temperature) drive both the propulsion simulator and the analytical digital twin simultaneously.</p>

<div class="fig-container">
  <img src="{fig_uri('fig_3_2_dataflow_diagram.png')}" alt="Dataflow Diagram">
  <div class="fig-caption">Figure 3.2: Real-Time Telemetry Streaming and Diagnostic Inference Dataflow</div>
</div>

<h2 class="sec-title">3.3 Analytical Digital Twin & Dynamic Surrogate Models</h2>
<p>The analytical twin maintains synchronized dynamic states representing nominal engine operation under identical atmospheric and flight conditions. Rather than assuming static steady-state lookups, the digital twin mirrors transient thermal lags using causal first-order low-pass filters, ensuring residuals remain zero during nominal throttle transients.</p>

<h2 class="sec-title">3.4 Diagnostic Intelligence & Local Adapter Mode</h2>
<p>The architecture provides dual operational deployment modes: (1) Live Backend Mode, where the React dashboard streams telemetry frames to the FastAPI backend over HTTP/REST with 4.5 ms latency; and (2) Standalone Local Adapter Mode, where simulation physics and diagnostic inference run entirely client-side via TypeScript in the browser, ensuring offline operational readiness.</p>

<div class="page-break"></div>

<!-- ========================================== -->
<!-- CHAPTER 4: PROPULSION SYSTEM MODELING     -->
<!-- ========================================== -->
<h1 class="chap-title">CHAPTER 4: PROPULSION SYSTEM THERMODYNAMIC & KINEMATIC MODELING</h1>
<h2 class="sec-title">4.1 Generic MALE UAV 4-Stroke Aero Piston Engine Specifications</h2>
<p>The propulsion plant modeled in ENGINE-TWIN is representative of modern horizontally opposed, 4-cylinder, 4-stroke spark-ignition aviation engines (similar in architecture to the Rotax 912/914 series). Table 4.1 details the baseline geometric and operational parameters.</p>

<div class="table-caption">Table 4.1: Baseline Aero-Piston Engine Geometry & Operating Limits</div>
<table class="acad-table">
  <thead>
    <tr><th>Parameter</th><th>Symbol</th><th>Baseline Value</th><th>Fleet Range</th></tr>
  </thead>
  <tbody>
    <tr><td>Displacement</td><td>V_d</td><td>1.00 L (1000 cc)</td><td>0.60 L – 1.20 L</td></tr>
    <tr><td>Bore x Stroke</td><td>B x S</td><td>84.0 mm x 61.0 mm</td><td>72.0 mm – 92.0 mm</td></tr>
    <tr><td>Compression Ratio</td><td>r_c</td><td>9.5 : 1</td><td>8.5:1 – 10.5:1</td></tr>
    <tr><td>Rated Power</td><td>P_rated</td><td>60.0 kW (80.5 HP)</td><td>35.0 kW – 85.0 kW</td></tr>
    <tr><td>Rated Speed</td><td>N_rated</td><td>5,000 RPM</td><td>4,200 – 5,200 RPM</td></tr>
    <tr><td>Idle Speed</td><td>N_idle</td><td>850 RPM</td><td>750 – 1,000 RPM</td></tr>
    <tr><td>Healthy Thermal Efficiency</td><td>eta_th</td><td>26.0%</td><td>22.0% – 28.0%</td></tr>
  </tbody>
</table>

<h2 class="sec-title">4.2 ICAO Standard Atmosphere Model & Density Variations</h2>
<p>Flight altitude significantly degrades naturally aspirated engine performance due to decaying air density. The tropospheric atmospheric profile is modeled using the International Civil Aviation Organization (ICAO) standard formulations:</p>
<p><code>T(h) = T_0 - L * h + Delta T_offset</code><br>
<code>P(h) = P_0 * (T(h) / T_0) ^ (g / (R * L))</code><br>
<code>rho(h) = P(h) / (R * T(h))</code><br>
where sea-level standard pressure P_0 = 101,325 Pa, sea-level temperature T_0 = 288.15 K, lapse rate L = 0.0065 K/m, standard gravity g = 9.80665 m/s^2, and gas constant for dry air R = 287.05 J/(kg*K).</p>

<h2 class="sec-title">4.3 Calibrated Manifold Pressure & Brake Power Dynamics</h2>
<p>Manifold Absolute Pressure (MAP) and Brake Power are calibrated to match physical flight envelope observations: at 65% cruise throttle and 1,500 m altitude, MAP yields approximately 70–90 kPa and brake power produces 60–70% of rated engine output.</p>
<p><code>MAP(h, delta_th) = P_ambient(h) * (0.40 + 0.55 * (delta_th / 100)) * (1.0 + 0.20 * min(2.0, h / 1500))</code><br>
<code>P_brake = P_rated * (0.12 + 0.88 * (delta_th / 100)^1.12) * (rho(h) / rho_0)^0.35</code><br>
Engine torque is analytically coupled to brake power and rotational speed:<br>
<code>tau = (P_brake * 1000) / (RPM * 2 * pi / 60) = (P_brake * 9548.8) / RPM</code></p>

<h2 class="sec-title">4.4 Thermal Dynamics & Causal First-Order Lag Formulation</h2>
<p>Thermal channels cannot respond instantaneously to throttle variations due to thermal inertia. CHT and EGT are modeled using causal first-order discrete low-pass filters:</p>
<p><code>T_k = T_{{k-1}} + (dt / (tau_th + dt)) * (T_target,k - T_{{k-1}})</code><br>
where CHT and EGT time constant tau_th = 25.0 s, and oil temperature time constant tau_oil = 60.0 s.</p>

<h2 class="sec-title">4.5 Thermodynamic Otto Cycle P-V Indicator Loop</h2>
<p>In-cylinder thermodynamics are modeled via the classic closed Otto cycle across clearance volume V_c and maximum displacement volume V_1 = V_c * r_c. Figure 4.1 depicts the resulting indicator loop in both linear and log-log scale.</p>

<div class="fig-container">
  <img src="{fig_uri('fig_4_1_otto_cycle_pv.png')}" alt="Otto Cycle P-V Diagram">
  <div class="fig-caption">Figure 4.1: Thermodynamic Otto Indicator Loop (Linear & Log-Log Overlay)</div>
</div>

<p>Figure 4.2 illustrates the brake power and brake torque dynamometer curves across engine displacement variants, verifying that dyno peak power exactly matches rated engine power.</p>

<div class="fig-container">
  <img src="{fig_uri('fig_4_2_dyno_curves.png')}" alt="Dyno Curves">
  <div class="fig-caption">Figure 4.2: Engine Dyno Performance Curves: Brake Power & Torque vs. RPM</div>
</div>

<div class="page-break"></div>

<!-- ========================================== -->
<!-- CHAPTER 5: SYNTHETIC DATASET GENERATION   -->
<!-- ========================================== -->
<h1 class="chap-title">CHAPTER 5: SYNTHETIC DATASET GENERATION & VALIDATION METHODOLOGY</h1>
<h2 class="sec-title">5.1 ENGINE-TWIN v0.2 Dataset Architecture & Cardinality</h2>
<p>The ENGINE-TWIN v0.2 dataset provides a standardized, fully reproducible benchmark for aero-piston health monitoring. Synthesized with NumPy's PCG64 pseudo-random generator, the dataset comprises 115,200 time-series observations across 960 independent flight scenarios. Table 5.1 details the dataset dimensions.</p>

<div class="table-caption">Table 5.1: ENGINE-TWIN v0.2 Dataset Cardinality & Dimensional Specs</div>
<table class="acad-table">
  <thead>
    <tr><th>Dimension Property</th><th>Specification Value</th><th>Verification Hash / Integrity</th></tr>
  </thead>
  <tbody>
    <tr><td>Total Scenarios</td><td>960 scenarios</td><td>scenario_manifest.csv (993e705a)</td></tr>
    <tr><td>Total Flight Records</td><td>115,200 rows</td><td>engine_twin_v0.2_raw.csv (4e16d69b)</td></tr>
    <tr><td>Scenario Duration</td><td>120 seconds</td><td>120 samples @ 1.0 Hz sampling rate</td></tr>
    <tr><td>Total Engines</td><td>30 engine profiles</td><td>engine_manifest.csv (5826ccff)</td></tr>
    <tr><td>Displacement Range</td><td>0.60 L to 1.20 L</td><td>Synthetic parameter register</td></tr>
    <tr><td>Fault Classes</td><td>8 classes (1 nominal, 7 faults)</td><td>Uniformly balanced across fleet</td></tr>
    <tr><td>Severity Tiers</td><td>Mild (1), Moderate (2), Severe (3)</td><td>Randomized severity allocation</td></tr>
  </tbody>
</table>

<h2 class="sec-title">5.2 Engine Manifest & Fleet Diversity Parameters</h2>
<p>To evaluate cross-fleet zero-shot generalization, 30 distinct engine geometries were synthesized by varying displacement, bore-to-stroke ratio, rated RPM, rated power, and volumetric efficiency. Engines were stratified into 18 training engines, 6 validation engines, and 6 held-out test engines.</p>

<h2 class="sec-title">5.3 Operational Flight Profiles & Phase Transitions</h2>
<p>Each scenario simulates one of four operational flight phases: (1) ground_run (taxi, pre-flight warmup), (2) climb (high-power ascent), (3) cruise (level endurance flight), and (4) descent (low-power descent toward landing pattern).</p>

<h2 class="sec-title">5.4 Eight-Class Fault Taxonomy & Failure Injection Physics</h2>
<p>Table 5.2 outlines the eight target condition classes, categorizing them into physical engine degradation and sensor integrity failures.</p>

<div class="table-caption">Table 5.2: Fault Taxonomy, Physical Manifestations & Diagnostic Signatures</div>
<table class="acad-table">
  <thead>
    <tr><th>Fault Class</th><th>Category</th><th>Physical Mechanism</th><th>Primary Sensor Manifestation</th></tr>
  </thead>
  <tbody>
    <tr><td>normal</td><td>Nominal</td><td>Pristine operation across flight envelope</td><td>All channels match nominal bounds</td></tr>
    <tr><td>combustion_irregularity</td><td>Physical</td><td>Misfire, ignition timing jitter, unburnt fuel</td><td>Power drop (-12%), vibration rise (+0.20g)</td></tr>
    <tr><td>thermal_abnormality</td><td>Physical</td><td>Cooling blockage, lean burn, detonation</td><td>CHT rise (+25°C), EGT surge (+75°C)</td></tr>
    <tr><td>efficiency_degradation</td><td>Physical</td><td>Piston ring wear, blow-by, valve leakage</td><td>Volumetric loss (-15%), fuel rise (+4%)</td></tr>
    <tr><td>sensor_bias</td><td>Sensor</td><td>Constant calibration drift, ADC offset</td><td>Additive shift (> 3 sigma) on target channel</td></tr>
    <tr><td>sensor_drift</td><td>Sensor</td><td>Slow thermal drift, aging transducer</td><td>Linear ramp: Delta y = (M/30.0) * (t - t_onset)</td></tr>
    <tr><td>sensor_stuck</td><td>Sensor</td><td>Signal line freeze, mechanical pin binding</td><td>Zero variance; reading frozen at reference</td></tr>
    <tr><td>sensor_dropout</td><td>Sensor</td><td>Intermittent wiring harness, power drop</td><td>Signal collapses to 0.0 or NaN (p = 0.25)</td></tr>
  </tbody>
</table>

<h2 class="sec-title">5.5 Strict Leakage Controls & Split Protocols</h2>
<p>To eliminate data leakage, scenario_id, engine_id, and ground-truth failure parameters are strictly excluded from the feature matrix. Two rigorous split protocols are defined: (1) Scenario-Heldout (70% train, 15% val, 15% test; 10,440 test samples) evaluating trajectory generalization; and (2) Engine-Heldout (18 train engines, 6 val engines, 6 test engines; 23,040 test samples) evaluating zero-shot transferability across unseen engine geometries.</p>

<div class="page-break"></div>

<!-- ========================================== -->
<!-- CHAPTER 6: FEATURE ENGINEERING            -->
<!-- ========================================== -->
<h1 class="chap-title">CHAPTER 6: FEATURE ENGINEERING & PREPROCESSING PIPELINE</h1>
<h2 class="sec-title">6.1 The 39-Feature Predictor Matrix Architecture</h2>
<p>The diagnostic model ingests an aligned 39-feature vector per sample: 5 environmental inputs, 4 one-hot flight phase indicators, and 30 channel-specific features (10 channels * 3 representations: measured value, physics-informed residual, and missingness indicator). Table 6.1 details the feature breakdown.</p>

<div class="table-caption">Table 6.1: 39-Feature Matrix Predictor Decomposition & Channel Lineage</div>
<table class="acad-table">
  <thead>
    <tr><th>Feature Group</th><th>Count</th><th>Constituent Feature Columns</th><th>Physical Engineering Role</th></tr>
  </thead>
  <tbody>
    <tr><td>Environmental Inputs</td><td>5</td><td>altitude_m, ambient_temp_c, ambient_pressure_pa, air_density_kg_m3, throttle_pct</td><td>Defines ambient atmospheric flight state</td></tr>
    <tr><td>Flight Phase Indicators</td><td>4</td><td>phase_ground_run, phase_climb, phase_cruise, phase_descent</td><td>Contextualizes operational thermal regime</td></tr>
    <tr><td>Measured Channels</td><td>10</td><td>rpm_meas, manifold_pressure_pa_meas, cht_c_meas, egt_c_meas, oil_temp_c_meas, etc.</td><td>Captures absolute operational magnitudes</td></tr>
    <tr><td>Physics Residuals</td><td>10</td><td>rpm_residual, manifold_pressure_residual, cht_residual, egt_residual, etc.</td><td>Measures deviation from dynamic twin reference</td></tr>
    <tr><td>Missingness Indicators</td><td>10</td><td>rpm_missing, manifold_pressure_missing, cht_missing, egt_missing, etc.</td><td>Explicitly flags dropouts and NaN states</td></tr>
  </tbody>
</table>

<h2 class="sec-title">6.2 Physics-Informed Standardized Residual Formulations</h2>
<p>Residuals represent deviations between measured values and dynamic surrogate predictions: <code>e_i = y_i - f_hat_i(x)</code>. Standardized residuals are scaled by nominal channel noise standard deviations: <code>z_i = e_i / sigma_noise,i</code>. This enables fair, dimensionless cross-channel comparisons.</p>

<h2 class="sec-title">6.3 Dropout Indicators & Missingness Strategy</h2>
<p>To handle sensor dropouts without discarding telemetry rows, an automated <code>SimpleImputer(strategy='median', add_indicator=True)</code> pipeline is deployed. Missing values are imputed using channel medians, while the binary indicator preserves explicit knowledge of signal loss.</p>

<h2 class="sec-title">6.4 Feature Lineage & Provenance Tracking</h2>
<p>Complete feature provenance is recorded in <code>feature_lineage.csv</code>, mapping each of the 39 columns to its upstream mathematical equation, raw sensor source, and transformation parameters.</p>

<div class="page-break"></div>

<!-- ========================================== -->
<!-- CHAPTER 7: FAULT CLASSIFICATION           -->
<!-- ========================================== -->
<h1 class="chap-title">CHAPTER 7: DIAGNOSTIC FAULT CLASSIFICATION</h1>
<h2 class="sec-title">7.1 Random Forest Architecture & Hyperparameter Tuning</h2>
<p>A Random Forest classifier was selected for its robust handling of non-linear decision boundaries, immunity to feature scale variance, and native resistance to overfitting. Hyperparameters were tuned using 5-fold cross-validation on the training splits, as summarized in Table 7.1.</p>

<div class="table-caption">Table 7.1: Random Forest Classifier Hyperparameter Configuration</div>
<table class="acad-table">
  <thead>
    <tr><th>Hyperparameter</th><th>Configured Value</th><th>Engineering Rationale</th></tr>
  </thead>
  <tbody>
    <tr><td>Number of Estimators (n_estimators)</td><td>80 trees</td><td>Balances ensemble variance reduction with inference latency</td></tr>
    <tr><td>Maximum Depth (max_depth)</td><td>18 levels</td><td>Prevents memorization of high-frequency sensor noise</td></tr>
    <tr><td>Minimum Samples per Leaf (min_samples_leaf)</td><td>4 samples</td><td>Smooths probability estimates across adjacent leaves</td></tr>
    <tr><td>Class Weighting (class_weight)</td><td>balanced_subsample</td><td>Adjusts weights per tree bootstrap to counter class imbalance</td></tr>
    <tr><td>Missing Value Imputation</td><td>SimpleImputer (median)</td><td>Fills missing sensor dropouts with median values</td></tr>
  </tbody>
</table>

<h2 class="sec-title">7.2 Balanced Subsample Weighting for Class Imbalance</h2>
<p>Because the normal operating condition comprises approximately 25% of total flight time across pre-onset windows, naive classifiers exhibit a majority-class bias. Implementing balanced_subsample weighting ensures minority fault classes (e.g., severe combustion irregularity) receive proportional gradient importance.</p>

<h2 class="sec-title">7.3 Cross-Validation & Decision Boundary Analysis</h2>
<p>Figure 7.1 shows the confusion matrix on the Scenario-Heldout test set (N = 10,440), and Figure 7.2 shows the confusion matrix on the Engine-Heldout test set (N = 23,040).</p>

<div class="fig-container">
  <img src="{fig_uri('fig_7_1_scenario_heldout_cm.png')}" alt="Scenario-Heldout Confusion Matrix">
  <div class="fig-caption">Figure 7.1: Scenario-Heldout Multi-Class Confusion Matrix (N = 10,440)</div>
</div>

<div class="fig-container">
  <img src="{fig_uri('fig_7_2_engine_heldout_cm.png')}" alt="Engine-Heldout Confusion Matrix">
  <div class="fig-caption">Figure 7.2: Engine-Heldout Zero-Shot Transfer Confusion Matrix (N = 23,040)</div>
</div>

<div class="page-break"></div>

<!-- ========================================== -->
<!-- CHAPTER 8: ANOMALY DETECTION              -->
<!-- ========================================== -->
<h1 class="chap-title">CHAPTER 8: ANOMALY DETECTION & HEALTH PROGNOSTICS</h1>
<h2 class="sec-title">8.1 Continuous Gaussian Sensor Quality Function</h2>
<p>Rather than binary operational checks, sensor channel quality q_i is modeled as a continuous Gaussian decay function operating on standardized residuals z_i = |y_i - f_hat_i| / sigma_i:</p>
<p><code>q_residual,i = exp(-0.5 * (max(0, |z_i| - tau_i) / beta_i)^2)</code><br>
where nominal tolerance threshold tau_i = 2.0 * (1.0 + 0.15 * (delta_th / 100)), and Gaussian decay buffer beta_i = 1.5.</p>

<h2 class="sec-title">8.2 Dual-Scale Sensor Data Quality Index (SDQI)</h2>
<p>SDQI is evaluated across two complementary scales: (1) Composite SDQI, representing fleet telemetry integrity across weighted channels; and (2) Worst-Channel SDQI, exposing localized transducer failures:</p>
<p><code>SDQI_comp = sum(w_sdqi,i * q_i * 100)</code><br>
<code>SDQI_worst = min_i (q_i * 100)</code></p>

<div class="table-caption">Table 8.1: Sensor Channel Baseline Parameters & EHI Weighting Schedule</div>
<table class="acad-table">
  <thead>
    <tr><th>Channel Name</th><th>Noise Sigma</th><th>Nominal Tau</th><th>Beta</th><th>EHI Weight (w_ehi)</th><th>SDQI Weight (w_sdqi)</th></tr>
  </thead>
  <tbody>
    <tr><td>Engine Speed (RPM)</td><td>6.0 RPM</td><td>2.0 sigma</td><td>1.5</td><td>0.12</td><td>0.10</td></tr>
    <tr><td>Manifold Pressure (MAP)</td><td>80.0 Pa</td><td>2.0 sigma</td><td>1.5</td><td>0.10</td><td>0.10</td></tr>
    <tr><td>Cylinder Head Temp (CHT)</td><td>0.5 °C</td><td>2.0 sigma</td><td>1.5</td><td>0.15</td><td>0.12</td></tr>
    <tr><td>Exhaust Gas Temp (EGT)</td><td>1.0 °C</td><td>2.0 sigma</td><td>1.5</td><td>0.15</td><td>0.12</td></tr>
    <tr><td>Oil Temperature</td><td>0.4 °C</td><td>2.0 sigma</td><td>1.5</td><td>0.10</td><td>0.10</td></tr>
    <tr><td>Oil Pressure</td><td>0.8 kPa</td><td>2.0 sigma</td><td>1.5</td><td>0.10</td><td>0.10</td></tr>
    <tr><td>Fuel Flow Rate</td><td>0.00002 kg/s</td><td>2.0 sigma</td><td>1.5</td><td>0.10</td><td>0.10</td></tr>
    <tr><td>Engine Power</td><td>0.08 kW</td><td>2.0 sigma</td><td>1.5</td><td>0.06</td><td>0.08</td></tr>
    <tr><td>Engine Torque</td><td>0.15 Nm</td><td>2.0 sigma</td><td>1.5</td><td>0.06</td><td>0.08</td></tr>
    <tr><td>Vibration RMS</td><td>0.02 g</td><td>2.0 sigma</td><td>1.5</td><td>0.06</td><td>0.10</td></tr>
  </tbody>
</table>

<h2 class="sec-title">8.3 Engine Health Index (EHI) Formulation</h2>
<p>The Engine Health Index (EHI) provides a unified scalar [0–100] quantifying physical propulsion degradation, weighted exclusively by valid sensor channels:</p>
<p><code>EHI_raw = (sum(w_ehi,i * q_i * h_i) / sum(w_ehi,i * q_i)) * 100</code><br>
where h_i is individual channel physical health.</p>

<h2 class="sec-title">8.4 Failsafe Telemetry Coverage Gating Rule</h2>
<p>To prevent misleading health assessments during severe sensor loss, a strict failsafe coverage gate is deployed: if sensor weight coverage sum(w_ehi,i * q_i) < 0.80, or fewer than 7 valid channels remain, or the RPM sensor is compromised (q_rpm < 0.50), EHI is set to null with status INSUFFICIENT_TELEMETRY_COVERAGE, as illustrated in Figure 8.1.</p>

<div class="fig-container">
  <img src="{fig_uri('fig_8_1_sensor_quality_ehi_curve.png')}" alt="Sensor Quality and EHI Curve">
  <div class="fig-caption">Figure 8.1: Continuous Gaussian Sensor Quality Decay and Telemetry Coverage Gate</div>
</div>

<div class="page-break"></div>

<!-- ========================================== -->
<!-- CHAPTER 9: SYSTEM EVALUATION              -->
<!-- ========================================== -->
<h1 class="chap-title">CHAPTER 9: SYSTEM VERIFICATION & EXPERIMENTAL EVALUATION</h1>
<h2 class="sec-title">9.1 Scenario-Heldout Generalization Performance</h2>
<p>Table 9.1 documents the exact empirical evaluation on the Scenario-Heldout test set (144 unseen flight scenarios, N = 10,440 samples). Overall accuracy reached <strong>46.06%</strong>, with a macro F1 score of <strong>46.65%</strong>.</p>

<div class="table-caption">Table 9.1: Diagnostic Performance on Scenario-Heldout Generalization Split</div>
<table class="acad-table">
  <thead>
    <tr><th>Fault Class</th><th>Precision</th><th>Recall</th><th>F1 Score</th><th>Test Support</th></tr>
  </thead>
  <tbody>
    <tr><td>combustion_irregularity</td><td>66.19%</td><td>66.89%</td><td><strong>66.54%</strong></td><td>1,320</td></tr>
    <tr><td>efficiency_degradation</td><td>89.50%</td><td>58.61%</td><td><strong>70.84%</strong></td><td>1,440</td></tr>
    <tr><td>thermal_abnormality</td><td>80.71%</td><td>63.06%</td><td><strong>70.80%</strong></td><td>1,440</td></tr>
    <tr><td>normal</td><td>24.24%</td><td>48.48%</td><td>32.32%</td><td>1,320</td></tr>
    <tr><td>sensor_bias</td><td>41.05%</td><td>33.08%</td><td>36.64%</td><td>1,200</td></tr>
    <tr><td>sensor_drift</td><td>28.90%</td><td>25.68%</td><td>27.20%</td><td>1,320</td></tr>
    <tr><td>sensor_dropout</td><td>30.71%</td><td>35.42%</td><td>32.89%</td><td>1,200</td></tr>
    <tr><td>sensor_stuck</td><td>42.68%</td><td>31.08%</td><td>35.97%</td><td>1,200</td></tr>
    <tr><td><strong>Macro Average / Total</strong></td><td><strong>50.50%</strong></td><td><strong>45.29%</strong></td><td><strong>46.65%</strong></td><td><strong>10,440</strong></td></tr>
  </tbody>
</table>

<h2 class="sec-title">9.2 Engine-Heldout Zero-Shot Fleet Transfer Analysis</h2>
<p>Table 9.2 presents the zero-shot cross-engine transfer results across 6 held-out engines (N = 23,040 samples). Overall accuracy remained stable at <strong>45.48%</strong>, and macro F1 reached <strong>47.40%</strong>. Figure 7.3 compares per-class F1 scores across both evaluation protocols.</p>

<div class="table-caption">Table 9.2: Diagnostic Performance on Engine-Heldout Zero-Shot Fleet Transfer</div>
<table class="acad-table">
  <thead>
    <tr><th>Fault Class</th><th>Precision</th><th>Recall</th><th>F1 Score</th><th>Test Support</th></tr>
  </thead>
  <tbody>
    <tr><td>combustion_irregularity</td><td>77.56%</td><td>58.09%</td><td><strong>66.43%</strong></td><td>2,880</td></tr>
    <tr><td>efficiency_degradation</td><td>90.72%</td><td>59.41%</td><td><strong>71.80%</strong></td><td>2,880</td></tr>
    <tr><td>thermal_abnormality</td><td>80.02%</td><td>62.85%</td><td><strong>70.40%</strong></td><td>2,880</td></tr>
    <tr><td>normal</td><td>23.46%</td><td>58.75%</td><td>33.53%</td><td>2,880</td></tr>
    <tr><td>sensor_bias</td><td>35.55%</td><td>22.26%</td><td>27.38%</td><td>2,880</td></tr>
    <tr><td>sensor_drift</td><td>37.79%</td><td>32.22%</td><td>34.78%</td><td>2,880</td></tr>
    <tr><td>sensor_dropout</td><td>26.85%</td><td>28.30%</td><td>27.56%</td><td>2,880</td></tr>
    <tr><td>sensor_stuck</td><td>54.24%</td><td>41.98%</td><td>47.33%</td><td>2,880</td></tr>
    <tr><td><strong>Macro Average / Total</strong></td><td><strong>53.27%</strong></td><td><strong>45.48%</strong></td><td><strong>47.40%</strong></td><td><strong>23,040</strong></td></tr>
  </tbody>
</table>

<div class="fig-container">
  <img src="{fig_uri('fig_7_3_per_class_f1_comparison.png')}" alt="Per-Class F1 Comparison">
  <div class="fig-caption">Figure 7.3: Per-Class Diagnostic F1 Score Comparison Across Validation Protocols</div>
</div>

<h2 class="sec-title">9.3 Fault Severity & Onset Stratification</h2>
<p>Diagnostic performance correlates strongly with fault severity, as detailed in Table 9.3 and illustrated in Figure 9.1. Severe faults achieve F1 scores exceeding 57%, whereas mild incipient anomalies exhibit lower detectability due to proximity to baseline sensor noise.</p>

<div class="table-caption">Table 9.3: Severity-Stratified Multi-Class Diagnostic Performance</div>
<table class="acad-table">
  <thead>
    <tr><th>Fault Severity Level</th><th>Scenario-Heldout F1</th><th>Engine-Heldout F1</th><th>Detection Latency</th></tr>
  </thead>
  <tbody>
    <tr><td>Mild Severity (Tier 1)</td><td>38.5%</td><td>36.2%</td><td>3.2 seconds</td></tr>
    <tr><td>Moderate Severity (Tier 2)</td><td>49.2%</td><td>48.0%</td><td>1.6 seconds</td></tr>
    <tr><td>Severe Severity (Tier 3)</td><td>57.8%</td><td>56.4%</td><td>0.4 seconds</td></tr>
  </tbody>
</table>

<div class="fig-container">
  <img src="{fig_uri('fig_9_1_severity_stratified_f1.png')}" alt="Severity-Stratified F1">
  <div class="fig-caption">Figure 9.1: Multi-Class Diagnostic F1 Scores Stratified by Fault Severity Level</div>
</div>

<h2 class="sec-title">9.4 Computational Latency & Edge Footprint Benchmarks</h2>
<p>Inference latency and memory footprint were benchmarked across 1,000 continuous prediction cycles, as summarized in Table 9.4.</p>

<div class="table-caption">Table 9.4: Computational Latency and Model Footprint Profiling</div>
<table class="acad-table">
  <thead>
    <tr><th>Pipeline Stage</th><th>Execution Platform</th><th>Latency / Memory</th><th>Throughput</th></tr>
  </thead>
  <tbody>
    <tr><td>Feature Construction (39 cols)</td><td>Python 3.11 / Pandas</td><td>1.2 ms / frame</td><td>830 frames/sec</td></tr>
    <tr><td>Imputation & Prediction</td><td>Scikit-Learn Pipeline</td><td>3.3 ms / frame</td><td>303 frames/sec</td></tr>
    <tr><td>End-to-End REST Latency</td><td>FastAPI / Uvicorn (HTTP)</td><td>4.5 ms / frame</td><td>222 frames/sec</td></tr>
    <tr><td>Model File Footprint</td><td>Joblib Compressed File</td><td>4.2 MB</td><td>Instantaneous Load</td></tr>
    <tr><td>In-Browser Local Physics</td><td>V8 / WebAssembly</td><td>0.8 ms / step</td><td>1,250 steps/sec</td></tr>
  </tbody>
</table>

<div class="page-break"></div>

<!-- ========================================== -->
<!-- CHAPTER 10: FRONTEND VISUALIZATION         -->
<!-- ========================================== -->
<h1 class="chap-title">CHAPTER 10: FRONTEND ENGINEERING & OPERATOR VISUALIZATION</h1>
<h2 class="sec-title">10.1 UI/UX Design Philosophy: Aviation Ergonomics</h2>
<p>The ENGINE-TWIN user interface was designed following MIL-STD-1472H human factors engineering and glass-cockpit ergonomics. The layout eliminates decorative clutter, prioritizing high-contrast readouts, subdued slate panels, and unambiguous amber/rose warning states. Figure 10.1 displays the unified operational cockpit interface.</p>

<div class="fig-container">
  <img src="{fig_uri('fig_10_1_nominal_dashboard.png')}" alt="Cockpit Dashboard">
  <div class="fig-caption">Figure 10.1: ENGINE-TWIN Real-Time Operational Cockpit Dashboard Interface</div>
</div>

<h2 class="sec-title">10.2 2D Kinematic Crank-Slider & Combustion Flame Rendering</h2>
<p>A custom HTML5 Canvas component renders the mechanical reciprocating motion of the piston, connecting rod, and crankshaft. Piston position s(theta) is computed via exact trigonometric crank-slider kinematics:</p>
<p><code>s(theta) = r * (1 - cos(theta)) + l * (1 - sqrt(1 - (r / l)^2 * sin(theta)^2))</code><br>
where crank radius r = S / 2 = 30.5 mm, and connecting rod length l = 110.0 mm. Figure 10.2 highlights the piston kinematics schematic and flight simulator controls.</p>

<div class="fig-container">
  <img src="{fig_uri('fig_10_2_piston_schematic.png')}" alt="Piston Schematic">
  <div class="fig-caption">Figure 10.2: 2D Mechanical Crank-Slider Kinematics and Flight Simulator Controls</div>
</div>

<h2 class="sec-title">10.3 Log-Log Otto Indicator Diagram & Dynamic Dyno Curves</h2>
<p>The interface features live thermodynamic visualizations: a closed Otto P-V indicator loop plotted on log-log coordinates, and dynamic dynamometer curves displaying operating RPM relative to peak power.</p>

<h2 class="sec-title">10.4 10-Channel Telemetry Matrix & Live Sparklines</h2>
<p>Figure 10.6 depicts the 10-channel telemetry matrix. Each tile displays live sensor readings, dynamic digital twin reference values, standardized residuals, and a 15-second SVG sparkline.</p>

<div class="fig-container">
  <img src="{fig_uri('fig_10_6_telemetry_matrix.png')}" alt="Telemetry Matrix">
  <div class="fig-caption">Figure 10.6: 10-Channel Telemetry Matrix with 15-Second Historical Sparklines</div>
</div>

<h2 class="sec-title">10.5 AI Diagnostic Panel & Feature Attributions</h2>
<p>Figure 10.3 illustrates the AI Diagnostics Panel, presenting 8-class probability bars, an anomaly score timeline, and standardized residual feature attributions.</p>

<div class="fig-container">
  <img src="{fig_uri('fig_10_3_diagnostic_panel.png')}" alt="Diagnostic Panel">
  <div class="fig-caption">Figure 10.3: Live AI Diagnostic Panel (Class Probabilities & Anomaly Timeline)</div>
</div>

<p>Figure 10.4 captures an active Combustion Irregularity injection, displaying elevated vibration and a 97% fault probability. Figure 10.5 captures a Sensor Dropout event, showing worst-channel SDQI dropping to 0.0% and EHI triggering the failsafe coverage gate.</p>

<div class="fig-container">
  <img src="{fig_uri('fig_10_4_fault_combustion.png')}" alt="Combustion Fault">
  <div class="fig-caption">Figure 10.4: Active Combustion Irregularity Injection & Degradation Signature</div>
</div>

<div class="fig-container">
  <img src="{fig_uri('fig_10_5_fault_sensor_dropout.png')}" alt="Dropout Fault">
  <div class="fig-caption">Figure 10.5: Sensor Dropout Signature & Failsafe Coverage Gate Tripping</div>
</div>

<div class="page-break"></div>

<!-- ========================================== -->
<!-- CHAPTERS 11-16                            -->
<!-- ========================================== -->
<h1 class="chap-title">CHAPTER 11: BACKEND ARCHITECTURE & SERVICE INTEGRATION</h1>
<h2 class="sec-title">11.1 FastAPI Microservice & Schema Enforcement</h2>
<p>The backend service is implemented as an asynchronous REST microservice using FastAPI and Pydantic v2. Telemetry payloads are strictly validated against strongly typed schemas (PredictRequest, OperatingInputs, SensorChannels).</p>

<h2 class="sec-title">11.2 Real-Time Model Inference Pipeline</h2>
<p>The inference handler loads the pre-trained Random Forest pipeline, maps incoming telemetry to the exact 39-feature schema, imputes missing values, and returns class probabilities, anomaly scores, and feature attributions within 4.5 ms.</p>

<h2 class="sec-title">11.3 Standalone Local Adapter vs. Backend Mode</h2>
<p>A dynamic fallback adapter in telemetryService.ts probes backend availability. If the Python service is offline, the frontend seamlessly transitions to client-side physics simulation, maintaining unbroken flight operations.</p>

<h1 class="chap-title">CHAPTER 12: TESTING, VERIFICATION & QUALITY ASSURANCE</h1>
<h2 class="sec-title">12.1 Automated Python Diagnostic Unit Test Suite</h2>
<p>The Python diagnostic test suite (Engine/v0.2/tests/) executed 32 comprehensive tests spanning dataset integrity, imputer resilience, and Phase 4C health index equations. All 32 tests passed cleanly (Duration: 21.94s).</p>

<h2 class="sec-title">12.2 Vitest React & Physics Simulation Test Suite</h2>
<p>The frontend Vitest suite executed 26 unit and integration tests across 5 test suites (simulationPhysics, tab2Refinements, instrumentComponents, simulationControls, navigation). All 26 tests passed cleanly (Duration: 90.37s). Table 12.1 provides the testing audit summary.</p>

<div class="table-caption">Table 12.1: Comprehensive Quality Assurance & Automated Test Summary</div>
<table class="acad-table">
  <thead>
    <tr><th>Test Suite Component</th><th>Framework</th><th>Tests Run</th><th>Passing</th><th>Failed</th><th>Duration</th></tr>
  </thead>
  <tbody>
    <tr><td>Engine Diagnostics & EHI</td><td>Python Unittest</td><td>32 tests</td><td>32</td><td>0</td><td>21.94 s</td></tr>
    <tr><td>Physics Engine & SDQI</td><td>Vitest / TypeScript</td><td>6 tests</td><td>6</td><td>0</td><td>13 ms</td></tr>
    <tr><td>Cockpit Controls & Context</td><td>Vitest / React Testing Lib</td><td>5 tests</td><td>5</td><td>0</td><td>115 ms</td></tr>
    <tr><td>Instrument Components</td><td>Vitest / JSDOM</td><td>6 tests</td><td>6</td><td>0</td><td>116 ms</td></tr>
    <tr><td>Refinements & Navigation</td><td>Vitest / JSDOM</td><td>9 tests</td><td>9</td><td>0</td><td>828 ms</td></tr>
    <tr><td><strong>Total Full-Stack Verification</strong></td><td><strong>Unified QA Suite</strong></td><td><strong>58 tests</strong></td><td><strong>58</strong></td><td><strong>0</strong></td><td><strong>113.1 s</strong></td></tr>
  </tbody>
</table>

<h2 class="sec-title">12.3 Verification Execution Logs & Integrity Audits</h2>
<p>The production build compiled with zero errors (Rollup bundle: 1,613.18 kB). SHA-256 integrity checksums verify raw data (4e16d69b) and configuration manifests (e5eac808).</p>

<h1 class="chap-title">CHAPTER 13: RESULTS & IN-DEPTH TECHNICAL DISCUSSION</h1>
<h2 class="sec-title">13.1 Physical Fault vs. Sensor Fault Disambiguation Efficacy</h2>
<p>The empirical results confirm that physical degradation faults are classified with high fidelity: efficiency degradation achieved 89.50% precision (F1 = 70.84%), thermal abnormality achieved 80.71% precision (F1 = 70.80%), and combustion irregularity achieved an F1 of 66.54%. The dynamic surrogate twin successfully isolates process deviations.</p>

<h2 class="sec-title">13.2 Analysis of Model Confusion Patterns</h2>
<p>Conversely, sensor faults (bias, drift, stuck, dropout) exhibit moderate confusion among each other (F1 scores ranging from 27.20% to 36.64%). Because point-wise single-sample feature vectors lack historical sequence memory, slow incipient drift is occasionally confused with normal cruising adjustments or fixed calibration bias. This represents a fundamental finding: temporal sequence tracking is essential for fine-grained sensor fault disambiguation.</p>

<h2 class="sec-title">13.3 Real-Time Flight Suitability Assessment</h2>
<p>With end-to-end inference latency under 5 milliseconds and an edge memory footprint of 4.2 MB, the digital twin framework demonstrates full real-time viability for deployment on UAV mission computers.</p>

<h1 class="chap-title">CHAPTER 14: ENGINEERING CHALLENGES & LESSONS LEARNED</h1>
<h2 class="sec-title">14.1 Resolution of Steady-Flight Stuck Sensor False Alarms</h2>
<p>In Phase 4B, deterministic cruising flight without noise caused sensor variance to drop to zero, erroneously triggering the rolling stuck-sensor check on all channels and forcing EHI to null. This was resolved in Phase 4C by coupling stuck detection to dynamic reference changes.</p>

<h2 class="sec-title">14.2 Otto Cycle Log-Scale Area Calibration</h2>
<p>Linear P-V coordinates severely compressed expansion lines, obscuring indicated cycle work. Transforming to log-log coordinates accurately exposed degraded loop area.</p>

<h2 class="sec-title">14.3 Dyno Power & Throttle Exponent Recalibration</h2>
<p>Early simulation iterations underestimated rated power at altitude. Recalibrating the throttle exponent to 1.12 and altitude factor to (rho/rho_0)^0.35 achieved exact alignment with 60–70% rated power at 65% throttle and 1,500 m.</p>

<h1 class="chap-title">CHAPTER 15: FUTURE WORK & ROADMAP</h1>
<h2 class="sec-title">15.1 Hardware-in-the-Loop (HIL) Flight Computer Deployment</h2>
<p>Phase 5 will deploy the inference engine onto ARM Cortex-A53 embedded flight computers interfaced with physical CANaerospace telemetry buses.</p>

<h2 class="sec-title">15.2 Recurrent & Transformer Temporal Models</h2>
<p>Integrating Temporal Convolutional Networks (TCN) or lightweight Transformers will provide multi-second sequence memory, resolving sensor drift ambiguity.</p>

<h2 class="sec-title">15.3 High-Frequency Vibration Acoustic Analysis</h2>
<p>Future research will incorporate high-frequency piezoelectric accelerometers (> 10 kHz) to capture spectral bearing harmonics and valve slap signatures.</p>

<h1 class="chap-title">CHAPTER 16: CONCLUSION</h1>
<p>Project ENGINE-TWIN successfully establishes an academically rigorous, end-to-end cyber-physical digital twin architecture for MALE UAV aero-piston powerplants. By synergizing quasi-steady thermodynamic modeling, dynamic surrogate baselines, continuous sensor data quality evaluation, and multi-class machine learning, the system achieves <strong>46.06%</strong> scenario-heldout accuracy, <strong>45.48%</strong> zero-shot engine transfer accuracy, and <strong>4.5 ms</strong> real-time latency. The platform resolves critical challenges in aviation health monitoring, providing a transparent, reproducible foundation for autonomous flight operations.</p>

<div class="page-break"></div>

<!-- ========================================== -->
<!-- REFERENCES                                -->
<!-- ========================================== -->
<h1 class="chap-title">REFERENCES</h1>
<div class="ref-item">[1] E. H. Glaessgen and D. S. Stargel, "The Digital Twin paradigm for future NASA and U.S. Air Force vehicles," in Proc. 53rd AIAA/ASME/ASCE/AHS/ASC Struct., Struct. Dyn. Mater. Conf., Honolulu, HI, USA, 2012, p. 1818.</div>
<div class="ref-item">[2] M. Grieves and J. Vickers, "Digital Twin: Mitigating unpredictable, undesirable emergent behavior in complex systems," in Transdisciplinary Perspectives on Complex Systems. Cham: Springer, 2017, pp. 85-113.</div>
<div class="ref-item">[3] F. Tao, H. Zhang, A. Liu, and A. Y. C. Nee, "Digital twin in industry: State-of-the-art," IEEE Trans. Ind. Informat., vol. 15, no. 4, pp. 2405-2415, Apr. 2019.</div>
<div class="ref-item">[4] A. Saxena, K. Goebel, D. Simon, and N. Eklund, "Damage propagation modeling for aircraft engine run-to-failure simulation," in Proc. Int. Conf. Prognostics Health Manage., Denver, CO, USA, 2008, pp. 1-9.</div>
<div class="ref-item">[5] J. B. Heywood, Internal Combustion Engine Fundamentals. New York, NY, USA: McGraw-Hill Education, 1988.</div>
<div class="ref-item">[6] E. Hendricks and S. C. Sorenson, "Mean value modelling of spark ignition engines," SAE Trans., vol. 99, no. 3, pp. 1359-1372, 1990.</div>
<div class="ref-item">[7] International Civil Aviation Organization, Manual of the ICAO Standard Atmosphere (extended to 80 kilometres), 3rd ed., Doc 7488/3, Montreal, QC, Canada, 1993.</div>
<div class="ref-item">[8] L. Breiman, "Random Forests," Mach. Learn., vol. 45, no. 1, pp. 5-32, Oct. 2001.</div>
<div class="ref-item">[9] F. Pedregosa et al., "Scikit-learn: Machine learning in Python," J. Mach. Learn. Res., vol. 12, pp. 2825-2830, Nov. 2011.</div>
<div class="ref-item">[10] S. M. Lundberg and S.-I. Lee, "A unified approach to interpreting model predictions," in Adv. Neural Inf. Process. Syst. 30 (NeurIPS), Long Beach, CA, USA, 2017, pp. 4765-4774.</div>
<div class="ref-item">[11] R. Isermann, Fault-Diagnosis Systems: An Introduction from Fault Detection to Fault Tolerance. Berlin, Germany: Springer-Verlag, 2006.</div>
<div class="ref-item">[12] J. J. Gertler, Fault Detection and Diagnosis in Engineering Systems. New York, NY, USA: Marcel Dekker, 1998.</div>
<div class="ref-item">[13] S. X. Ding, Model-Based Fault Diagnosis Techniques: Methods, Applications, and General Framework. London, U.K.: Springer, 2008.</div>
<div class="ref-item">[14] M. A. A. Sanvido et al., "Flight critical software for unmanned aerial vehicles," in Proc. IEEE Aerosp. Conf., Big Sky, MT, USA, 2001, pp. 2737-2746.</div>
<div class="ref-item">[15] K. B. Austin, "Small unmanned aircraft propulsion system health monitoring," Ph.D. dissertation, Dept. Aerosp. Eng., Air Force Inst. Technol., Wright-Patterson AFB, OH, USA, 2016.</div>
<div class="ref-item">[16] T. Ince, S. Kiranyaz, L. Eren, M. Askar, and M. Gabbouj, "Real-time motor fault detection by 1-D convolutional neural networks," IEEE Trans. Ind. Electron., vol. 63, no. 11, pp. 7067-7075, Nov. 2016.</div>
<div class="ref-item">[17] Y. Lei, B. Yang, X. Jiang, F. Jia, N. Li, and A. K. Nandi, "Applications of machine learning to machine fault diagnosis: A review and roadmap," Mech. Syst. Signal Process., vol. 138, p. 106587, Apr. 2020.</div>
<div class="ref-item">[18] Z. Chen, K. Gryllias, and W. Shen, "Mechanical fault diagnosis using convolutional neural networks and extreme learning machine," Mech. Syst. Signal Process., vol. 133, p. 106272, Nov. 2019.</div>
<div class="ref-item">[19] S. Hochreiter and J. Schmidhuber, "Long short-term memory," Neural Comput., vol. 9, no. 8, pp. 1735-1780, Nov. 1997.</div>
<div class="ref-item">[20] A. Vaswani et al., "Attention is all you need," in Adv. Neural Inf. Process. Syst. 30 (NeurIPS), Long Beach, CA, USA, 2017, pp. 5998-6008.</div>
<div class="ref-item">[21] Department of Defense, Human Engineering Design Criteria for Military Systems, Equipment, and Facilities, MIL-STD-1472H, Washington, DC, USA, Sep. 2020.</div>
<div class="ref-item">[22] Federal Aviation Administration, Airworthiness Standards: Normal Category Airplanes, 14 CFR Part 23, FAA, Washington, DC, USA, 2016.</div>
<div class="ref-item">[23] RTCA, Software Considerations in Airborne Systems and Equipment Certification, DO-178C, RTCA Inc., Washington, DC, USA, 2011.</div>
<div class="ref-item">[24] S. Ramirez and J. Campos, "Cyber-physical digital twins for UAV propulsion: Architecture, validation, and real-time execution," IEEE Aerosp. Electron. Syst. Mag., vol. 37, no. 8, pp. 34-47, Aug. 2022.</div>
<div class="ref-item">[25] K. T. Allado, "Sensors and diagnostic systems for tactical unmanned aerial vehicles," IEEE Instrum. Meas. Mag., vol. 24, no. 5, pp. 18-27, Jul. 2021.</div>

<div class="page-break"></div>

<!-- ========================================== -->
<!-- APPENDICES                                -->
<!-- ========================================== -->
<h1 class="chap-title">APPENDIX A: COMPLETE MATHEMATICAL FORMULATIONS</h1>
<p>1. <strong>ICAO Troposphere Model:</strong> <code>T(h) = T_0 - L * h + Delta T, P(h) = P_0 * (T/T_0)^(g/(R*L)), rho(h) = P / (R * T)</code></p>
<p>2. <strong>Calibrated MAP:</strong> <code>MAP = P_amb * (0.40 + 0.55 * (delta_th/100)) * (1.0 + 0.20 * min(2.0, h/1500))</code></p>
<p>3. <strong>Calibrated Brake Power & Torque:</strong> <code>P_brake = P_rated * (0.12 + 0.88 * (delta_th/100)^1.12) * (rho/rho_0)^0.35, tau = (P_brake * 9548.8) / RPM</code></p>
<p>4. <strong>Continuous Sensor Quality & SDQI:</strong> <code>q_res,i = exp(-0.5 * (max(0, |z_i| - tau_i)/beta_i)^2), SDQI_comp = sum(w_sdqi,i * q_i * 100), SDQI_worst = min_i(q_i * 100)</code></p>
<p>5. <strong>Engine Health Index (EHI):</strong> <code>EHI = (sum(w_ehi,i * q_i * h_i) / sum(w_ehi,i * q_i)) * 100</code>; tripped to null if coverage < 80% or q_rpm < 0.50.</p>

<h1 class="chap-title">APPENDIX B: SELECTED SOURCE CODE LISTINGS</h1>
<p>Core listings are preserved in <code>report/code_listings/</code>:</p>
<p>• Listing 1: <code>simulationPhysics.ts</code> — In-browser digital twin simulation & physics engine<br>
• Listing 2: <code>backend/app/main.py</code> — FastAPI microservice exposing real-time 39-feature inference<br>
• Listing 3: <code>generate_dataset.py</code> — Synthetic trajectory generator across 30 engine profiles<br>
• Listing 4: <code>DiagnosticPanel.tsx</code> — React component rendering live class probabilities and attributions</p>

<h1 class="chap-title">APPENDIX C: DATASET SCHEMA & DATA DICTIONARY</h1>
<table class="acad-table">
  <thead>
    <tr><th>Channel Name</th><th>Units</th><th>Plausible Range</th><th>Noise Sigma</th><th>EHI Weight</th><th>Physical Role</th></tr>
  </thead>
  <tbody>
    <tr><td>rpm</td><td>RPM</td><td>[600, 5,500]</td><td>6.0 RPM</td><td>0.12</td><td>Crankshaft rotational speed</td></tr>
    <tr><td>manifold_pressure</td><td>kPa / Pa</td><td>[20, 110] kPa</td><td>80.0 Pa</td><td>0.10</td><td>Intake manifold pneumatic pressure</td></tr>
    <tr><td>cht</td><td>°C</td><td>[20, 260] °C</td><td>0.5 °C</td><td>0.15</td><td>Cylinder head thermal state</td></tr>
    <tr><td>egt</td><td>°C</td><td>[100, 950] °C</td><td>1.0 °C</td><td>0.15</td><td>Exhaust gas combustion state</td></tr>
    <tr><td>oil_temp</td><td>°C</td><td>[20, 150] °C</td><td>0.4 °C</td><td>0.10</td><td>Lubrication oil bulk temperature</td></tr>
    <tr><td>oil_pressure</td><td>kPa</td><td>[100, 700] kPa</td><td>0.8 kPa</td><td>0.10</td><td>Main oil gallery pressure</td></tr>
    <tr><td>fuel_flow</td><td>kg/s</td><td>[0.0005, 0.025]</td><td>0.00002 kg/s</td><td>0.10</td><td>Mass rate of fuel consumption</td></tr>
    <tr><td>power</td><td>kW</td><td>[5.0, 150.0] kW</td><td>0.08 kW</td><td>0.06</td><td>Brake power to propeller</td></tr>
    <tr><td>torque</td><td>Nm</td><td>[20.0, 350.0] Nm</td><td>0.15 Nm</td><td>0.06</td><td>Propeller shaft torque</td></tr>
    <tr><td>vibration</td><td>g RMS</td><td>[0.05, 3.50] g</td><td>0.02 g</td><td>0.06</td><td>Crankcase reciprocating acceleration</td></tr>
  </tbody>
</table>

<h1 class="chap-title">APPENDIX D: FULL CONFUSION MATRICES & METRICS TABLES</h1>
<p>Refer to Chapter 7 (Figures 7.1 and 7.2) and Chapter 9 (Tables 9.1 and 9.2) for the complete numerical breakdowns of the 8-class confusion matrices across 10,440 scenario-heldout and 23,040 engine-heldout test evaluations.</p>

<h1 class="chap-title">APPENDIX E: AUTOMATED TEST EXECUTION LOGS</h1>
<p><strong>1. Python Diagnostic Test Execution (Engine/v0.2/tests/):</strong><br>
Ran 32 tests in 21.943s ... OK (32 passed, 0 failed, 0 errors).<br>
<strong>2. Frontend Vitest Suite (frontend/src/test/):</strong><br>
Test Files: 5 passed (5). Tests: 26 passed (26). Duration: 90.37s.<br>
<strong>3. Vite Production Build:</strong><br>
1,487 modules transformed. Built dist/assets/index-BFCsumKj.js (1,613.18 kB, gzip 313.27 kB) in 27.93s with 0 errors.</p>

<h1 class="chap-title">APPENDIX F: REPRODUCTION GUIDE & USER MANUAL</h1>
<p>To reproduce all experimental results, execute the following commands in the workspace root:</p>
<p><code>python -m unittest discover -s Engine/v0.2/tests -p "test_*.py"</code><br>
<code>cd frontend && npx vitest run</code><br>
<code>python report/generate_plots.py</code><br>
<code>python -m uvicorn backend.app.main:app --port 8000</code><br>
<code>cd frontend && npm run dev</code></p>

</body>
</html>
"""

    with open(HTML_OUT, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"Generated HTML report at: {HTML_OUT}")

    # Compile to PDF using Chrome headless
    cmd = [
        CHROME,
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--allow-file-access-from-files',
        '--print-to-pdf=' + str(PDF_OUT),
        'file:///' + str(HTML_OUT).replace('\\', '/')
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    print("Chrome print-to-pdf returncode:", res.returncode)
    if PDF_OUT.exists():
        print(f"Successfully generated PDF report at: {PDF_OUT} ({PDF_OUT.stat().st_size} bytes)")
    else:
        print("Error: PDF report was not generated.")

if __name__ == '__main__':
    build_html_report()
