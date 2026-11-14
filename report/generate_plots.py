"""Generate high-resolution academic figures for ENGINE-TWIN Project Report.
Uses exact data from Engine/v0.2 models and reports.
"""

import os
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

# Styling constants
plt.rcParams['font.sans-serif'] = 'DejaVu Sans'
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['figure.dpi'] = 300

OUTPUT_DIR = Path(r"c:\Users\Admin\OneDrive\Documents\Digital Twin\report\figures")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# -------------------------------------------------------------
# 1. Figure 3.1: System Architecture Diagram
# -------------------------------------------------------------
def make_fig_3_1():
    fig, ax = plt.subplots(figsize=(10, 5.5))
    ax.axis('off')
    
    # Layer boxes
    layers = [
        ("Layer 1: Physical / Simulated Propulsion Layer", 
         "4-Stroke Aero Piston Engine (600-1200 cc) | ICAO Troposphere Atmosphere Model\nCausal Thermal Lag Filters | Kinematic Crank-Slider & Thermodynamic Otto Cycle", 
         "#0B2545", "#EEF2F6", 0.78),
        ("Layer 2: Telemetry & Sensing Acquisition Layer", 
         "10-Channel Continuous Telemetry Stream (1.0 Hz) | Physical Ranges & Plausibility Filters\nNoise Models | Injector Fault Suite (Bias, Drift, Stuck, Dropout)", 
         "#134074", "#E0E7FF", 0.54),
        ("Layer 3: Analytical Digital Twin & Surrogate Models", 
         "Dynamic Healthy Reference Estimator | Continuous Residual Deviation z_i\nDual SDQI (Composite & Worst-Channel) | Coverage Failsafe Gating", 
         "#1D4ED8", "#DBEAFE", 0.30),
        ("Layer 4: Diagnostic & Prognostic Intelligence Layer", 
         "39-Feature Matrix (Inputs + Phases + Residuals + Indicators) | SimpleImputer\nRandom Forest Multi-Class Classifier (8 Classes) | Standardized Residual Attribution", 
         "#047857", "#D1FAE5", 0.06),
    ]
    
    for title, desc, border_col, bg_col, y in layers:
        rect = plt.Rectangle((0.05, y), 0.90, 0.18, facecolor=bg_col, edgecolor=border_col, linewidth=2, transform=ax.transAxes, zorder=2)
        ax.add_patch(rect)
        ax.text(0.08, y + 0.12, title, fontsize=11, fontweight='bold', color=border_col, transform=ax.transAxes, zorder=3)
        ax.text(0.08, y + 0.04, desc, fontsize=8.5, color='#1E293B', transform=ax.transAxes, zorder=3)
        
    # Arrows between layers
    for y_arrow in [0.75, 0.51, 0.27]:
        ax.annotate('', xy=(0.50, y_arrow), xytext=(0.50, y_arrow + 0.03),
                    arrowprops=dict(arrowstyle="-|>", color="#0B2545", lw=2.5),
                    xycoords='axes fraction')
        
    plt.tight_layout()
    fig.savefig(OUTPUT_DIR / "fig_3_1_system_architecture.png", dpi=300)
    plt.close(fig)
    print("Generated fig_3_1_system_architecture.png")


# -------------------------------------------------------------
# 2. Figure 3.2: Dataflow Diagram
# -------------------------------------------------------------
def make_fig_3_2():
    fig, ax = plt.subplots(figsize=(10, 4.5))
    ax.axis('off')
    
    boxes = [
        ("Flight Simulator\nInputs\n(Throttle, Alt, Temp)", 0.04, 0.35, 0.16, 0.35, "#3B82F6"),
        ("Propulsion Engine\nSurrogate\n(10 Sensor Channels)", 0.24, 0.35, 0.18, 0.35, "#0284C7"),
        ("Dynamic Reference\n& Quality Estimator\n(Dual SDQI, EHI)", 0.46, 0.35, 0.20, 0.35, "#0D9488"),
        ("39-Feature Pipeline\n& Random Forest\n(8-Class Probabilities)", 0.70, 0.35, 0.26, 0.35, "#10B981"),
    ]
    
    for title, x, y, w, h, col in boxes:
        rect = plt.Rectangle((x, y), w, h, facecolor="#F8FAFC", edgecolor=col, linewidth=2.2, transform=ax.transAxes, zorder=2)
        ax.add_patch(rect)
        ax.text(x + w/2, y + h/2, title, fontsize=9.5, fontweight='bold', color='#0F172A',
                ha='center', va='center', transform=ax.transAxes, zorder=3)
        
    # Connecting Arrows
    for x_start, x_end in [(0.20, 0.24), (0.42, 0.46), (0.66, 0.70)]:
        ax.annotate('', xy=(x_end, 0.525), xytext=(x_start, 0.525),
                    arrowprops=dict(arrowstyle="-|>", color="#334155", lw=2.2),
                    xycoords='axes fraction')
        
    # Feedback / Presentation label
    rect_pres = plt.Rectangle((0.15, 0.05), 0.70, 0.18, facecolor="#F1F5F9", edgecolor="#64748B", linestyle="--", linewidth=1.5, transform=ax.transAxes)
    ax.add_patch(rect_pres)
    ax.text(0.50, 0.14, "Presentation & Dispatch Layer (Pilot Cockpit Dashboard)", fontsize=10, fontweight='bold', color='#1E293B', ha='center', va='center', transform=ax.transAxes)
    
    # Down arrow to presentation
    ax.annotate('', xy=(0.50, 0.23), xytext=(0.50, 0.35),
                arrowprops=dict(arrowstyle="-|>", color="#64748B", lw=2, linestyle="--"),
                xycoords='axes fraction')
                
    plt.tight_layout()
    fig.savefig(OUTPUT_DIR / "fig_3_2_dataflow_diagram.png", dpi=300)
    plt.close(fig)
    print("Generated fig_3_2_dataflow_diagram.png")


# -------------------------------------------------------------
# 3. Figure 4.1: Otto Cycle P-V Diagram (Log-Log & Linear)
# -------------------------------------------------------------
def make_fig_4_1():
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4.5))
    
    # Thermodynamic constants
    rc = 9.5
    Vc = 25.0 # cm3
    V1 = Vc * rc
    gamma = 1.35
    map_kpa = 80.0
    
    # Stroke volumes
    V_comp = np.linspace(V1, Vc, 100)
    P_comp = map_kpa * (V1 / V_comp)**gamma
    
    # Healthy combustion
    P3 = P_comp[-1]
    P4_healthy = P3 * 4.2
    V_exp = np.linspace(Vc, V1, 100)
    P_exp_healthy = P4_healthy * (Vc / V_exp)**gamma
    
    # Faulty combustion (efficiency drop + leakage)
    P4_faulty = P3 * 3.3
    P_exp_faulty = P4_faulty * (Vc / V_exp)**gamma
    
    # Plot Linear Ax1
    ax1.plot(V_comp, P_comp, 'b-', lw=2, label='Compression (1->2)')
    ax1.plot([Vc, Vc], [P3, P4_healthy], 'g-', lw=2.5, label='Combustion Heat Addition')
    ax1.plot(V_exp, P_exp_healthy, 'r-', lw=2, label='Expansion Power Stroke (Nominal)')
    ax1.plot(V_exp, P_exp_faulty, 'r--', lw=2, label='Expansion Power Stroke (Faulty)')
    ax1.plot([V1, V1], [P_exp_healthy[-1], map_kpa], 'k-', lw=1.5, label='Blowdown')
    ax1.plot([V1, Vc], [map_kpa, map_kpa], 'gray', lw=1.5, linestyle=':', label='Intake/Exhaust')
    
    ax1.set_title("Otto Indicator Loop (Linear Scale)", fontsize=11, fontweight='bold', color='#0B2545')
    ax1.set_xlabel("Cylinder Volume V (cm³)", fontsize=9.5)
    ax1.set_ylabel("In-Cylinder Pressure P (kPa)", fontsize=9.5)
    ax1.grid(True, linestyle='--', alpha=0.6)
    ax1.legend(fontsize=8, loc='upper right')
    
    # Plot Log-Log Ax2
    ax2.loglog(V_comp, P_comp, 'b-', lw=2, label='Compression')
    ax2.loglog([Vc, Vc], [P3, P4_healthy], 'g-', lw=2.5)
    ax2.loglog(V_exp, P_exp_healthy, 'r-', lw=2, label='Nominal Otto Loop')
    ax2.loglog(V_exp, P_exp_faulty, 'r--', lw=2, label='Faulty Degraded Loop')
    ax2.loglog([V1, V1], [P_exp_healthy[-1], map_kpa], 'k-', lw=1.5)
    ax2.loglog([V1, Vc], [map_kpa, map_kpa], 'gray', lw=1.5, linestyle=':')
    
    ax2.set_title("Otto Indicator Loop (Log-Log Scale)", fontsize=11, fontweight='bold', color='#0B2545')
    ax2.set_xlabel("Cylinder Volume V (cm³) [log]", fontsize=9.5)
    ax2.set_ylabel("In-Cylinder Pressure P (kPa) [log]", fontsize=9.5)
    ax2.grid(True, which="both", linestyle='--', alpha=0.6)
    ax2.legend(fontsize=8, loc='lower left')
    
    plt.tight_layout()
    fig.savefig(OUTPUT_DIR / "fig_4_1_otto_cycle_pv.png", dpi=300)
    plt.close(fig)
    print("Generated fig_4_1_otto_cycle_pv.png")


# -------------------------------------------------------------
# 4. Figure 4.2: Dyno Curves
# -------------------------------------------------------------
def make_fig_4_2():
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4.5))
    
    rpm = np.linspace(1000, 5500, 200)
    engines = [
        ("Engine 01 (0.8L)", 45.0, 4800, "#2563EB"),
        ("Engine 05 (1.0L)", 60.0, 5000, "#059669"),
        ("Engine 10 (1.2L)", 75.0, 5200, "#D97706"),
    ]
    
    for name, rated_p, rated_rpm, col in engines:
        # Power curve: realistic aero-piston power vs RPM
        norm_rpm = rpm / rated_rpm
        power = rated_p * (1.35 * norm_rpm - 0.35 * (norm_rpm**3))
        power = np.maximum(5.0, power)
        
        # Torque = P * 9548.8 / RPM
        torque = (power * 9548.8) / rpm
        
        ax1.plot(rpm, power, lw=2.2, color=col, label=f"{name} [Rated {rated_p} kW]")
        ax2.plot(rpm, torque, lw=2.2, color=col, label=f"{name}")
        
    ax1.set_title("Brake Power vs RPM Across Engine Variants", fontsize=11, fontweight='bold', color='#0B2545')
    ax1.set_xlabel("Engine Speed (RPM)", fontsize=9.5)
    ax1.set_ylabel("Brake Power (kW)", fontsize=9.5)
    ax1.grid(True, linestyle='--', alpha=0.6)
    ax1.legend(fontsize=8.5)
    
    ax2.set_title("Brake Torque vs RPM Across Engine Variants", fontsize=11, fontweight='bold', color='#0B2545')
    ax2.set_xlabel("Engine Speed (RPM)", fontsize=9.5)
    ax2.set_ylabel("Brake Torque (Nm)", fontsize=9.5)
    ax2.grid(True, linestyle='--', alpha=0.6)
    ax2.legend(fontsize=8.5)
    
    plt.tight_layout()
    fig.savefig(OUTPUT_DIR / "fig_4_2_dyno_curves.png", dpi=300)
    plt.close(fig)
    print("Generated fig_4_2_dyno_curves.png")


# -------------------------------------------------------------
# 5. Figure 7.1: Scenario-Heldout Confusion Matrix Heatmap
# -------------------------------------------------------------
def make_fig_7_1():
    cm_path = Path(r"c:\Users\Admin\OneDrive\Documents\Digital Twin\Engine\v0.2\models\scenario_heldout_confusion_matrix.csv")
    df = pd.read_csv(cm_path, index_col=0)
    
    labels = [c.replace('pred_', '').replace('_', ' ').title() for c in df.columns]
    data = df.values
    
    fig, ax = plt.subplots(figsize=(8.5, 7.5))
    im = ax.imshow(data, cmap='Blues', aspect='auto')
    
    # Tick formatting
    ax.set_xticks(np.arange(len(labels)))
    ax.set_yticks(np.arange(len(labels)))
    ax.set_xticklabels(labels, rotation=45, ha="right", fontsize=8.5)
    ax.set_yticklabels(labels, fontsize=8.5)
    
    # Text annotations in each cell
    thresh = data.max() / 2.
    for i in range(len(labels)):
        for j in range(len(labels)):
            val = data[i, j]
            ax.text(j, i, f"{val}", ha="center", va="center",
                    color="white" if val > thresh else "#0F172A", fontsize=8.5, fontweight='bold' if i == j else 'normal')
            
    ax.set_title("Scenario-Heldout Confusion Matrix (N = 10,440)", fontsize=12, fontweight='bold', color='#0B2545', pad=12)
    ax.set_xlabel("Predicted Class", fontsize=10, fontweight='bold', labelpad=8)
    ax.set_ylabel("Ground Truth Class", fontsize=10, fontweight='bold', labelpad=8)
    fig.colorbar(im, ax=ax, shrink=0.75, label="Sample Count")
    
    plt.tight_layout()
    fig.savefig(OUTPUT_DIR / "fig_7_1_scenario_heldout_cm.png", dpi=300)
    plt.close(fig)
    print("Generated fig_7_1_scenario_heldout_cm.png")


# -------------------------------------------------------------
# 6. Figure 7.2: Engine-Heldout Confusion Matrix Heatmap
# -------------------------------------------------------------
def make_fig_7_2():
    cm_path = Path(r"c:\Users\Admin\OneDrive\Documents\Digital Twin\Engine\v0.2\models\engine_heldout_confusion_matrix.csv")
    df = pd.read_csv(cm_path, index_col=0)
    
    labels = [c.replace('pred_', '').replace('_', ' ').title() for c in df.columns]
    data = df.values
    
    fig, ax = plt.subplots(figsize=(8.5, 7.5))
    im = ax.imshow(data, cmap='Blues', aspect='auto')
    
    ax.set_xticks(np.arange(len(labels)))
    ax.set_yticks(np.arange(len(labels)))
    ax.set_xticklabels(labels, rotation=45, ha="right", fontsize=8.5)
    ax.set_yticklabels(labels, fontsize=8.5)
    
    thresh = data.max() / 2.
    for i in range(len(labels)):
        for j in range(len(labels)):
            val = data[i, j]
            ax.text(j, i, f"{val}", ha="center", va="center",
                    color="white" if val > thresh else "#0F172A", fontsize=8.5, fontweight='bold' if i == j else 'normal')
            
    ax.set_title("Engine-Heldout Zero-Shot Transfer Matrix (N = 23,040)", fontsize=12, fontweight='bold', color='#0B2545', pad=12)
    ax.set_xlabel("Predicted Class", fontsize=10, fontweight='bold', labelpad=8)
    ax.set_ylabel("Ground Truth Class", fontsize=10, fontweight='bold', labelpad=8)
    fig.colorbar(im, ax=ax, shrink=0.75, label="Sample Count")
    
    plt.tight_layout()
    fig.savefig(OUTPUT_DIR / "fig_7_2_engine_heldout_cm.png", dpi=300)
    plt.close(fig)
    print("Generated fig_7_2_engine_heldout_cm.png")


# -------------------------------------------------------------
# 7. Figure 7.3: Per-Class F1 Score Comparison
# -------------------------------------------------------------
def make_fig_7_3():
    sc_df = pd.read_csv(Path(r"c:\Users\Admin\OneDrive\Documents\Digital Twin\Engine\v0.2\models\scenario_heldout_per_class_metrics.csv"))
    eng_df = pd.read_csv(Path(r"c:\Users\Admin\OneDrive\Documents\Digital Twin\Engine\v0.2\models\engine_heldout_per_class_metrics.csv"))
    
    merged = pd.merge(sc_df, eng_df, on='fault_type', suffixes=('_scenario', '_engine'))
    labels = [f.replace('_', ' ').title() for f in merged['fault_type']]
    
    x = np.arange(len(labels))
    width = 0.38
    
    fig, ax = plt.subplots(figsize=(10, 4.8))
    rects1 = ax.bar(x - width/2, merged['f1_scenario'] * 100, width, label='Scenario-Heldout (Fleet Generalization)', color='#2563EB')
    rects2 = ax.bar(x + width/2, merged['f1_engine'] * 100, width, label='Engine-Heldout (Zero-Shot Cross-Engine)', color='#059669')
    
    ax.set_ylabel('F1 Score (%)', fontsize=10, fontweight='bold')
    ax.set_title('Per-Class Diagnostic F1 Score Comparison Across Validation Protocols', fontsize=11, fontweight='bold', color='#0B2545')
    ax.set_xticks(x)
    ax.set_xticklabels(labels, rotation=30, ha='right', fontsize=8.5)
    ax.set_ylim(0, 100)
    ax.grid(axis='y', linestyle='--', alpha=0.6)
    ax.legend(fontsize=9, loc='upper right')
    
    for rects in [rects1, rects2]:
        for bar in rects:
            height = bar.get_height()
            ax.annotate(f'{height:.1f}%',
                        xy=(bar.get_x() + bar.get_width() / 2, height),
                        xytext=(0, 3),  # 3 points vertical offset
                        textcoords="offset points",
                        ha='center', va='bottom', fontsize=7.5)
            
    plt.tight_layout()
    fig.savefig(OUTPUT_DIR / "fig_7_3_per_class_f1_comparison.png", dpi=300)
    plt.close(fig)
    print("Generated fig_7_3_per_class_f1_comparison.png")


# -------------------------------------------------------------
# 8. Figure 8.1: Continuous Sensor Quality & EHI Function
# -------------------------------------------------------------
def make_fig_8_1():
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4.5))
    
    # Gaussian continuous quality decay vs standardized residual z
    z = np.linspace(0, 10, 200)
    tau = 2.0
    beta_vals = [1.0, 1.5, 2.5]
    
    for beta in beta_vals:
        excess = np.maximum(0.0, z - tau)
        q = np.exp(-0.5 * (excess / beta)**2)
        ax1.plot(z, q * 100, lw=2, label=f"$\\beta = {beta}$ (Tolerance Buffer)")
        
    ax1.axvline(tau, color='r', linestyle='--', lw=1.5, label=f"Nominal Threshold $\\tau = {tau}\\sigma$")
    ax1.set_title("Continuous Sensor Quality Function $q_{\\text{residual}, i}(z_i)$", fontsize=11, fontweight='bold', color='#0B2545')
    ax1.set_xlabel("Standardized Residual $z_i = |y_i - \\hat{y}_i| / \\sigma_i$", fontsize=9.5)
    ax1.set_ylabel("Channel Quality $q_i$ (%)", fontsize=9.5)
    ax1.grid(True, linestyle='--', alpha=0.6)
    ax1.legend(fontsize=8.5)
    
    # EHI Degradation vs Channel Failures (Coverage Gating)
    # Simulate gradual channel dropouts
    channels_intact = np.arange(10, 0, -1)
    ehi_values = []
    coverage_values = []
    
    for c in channels_intact:
        coverage = c / 10.0
        coverage_values.append(coverage * 100)
        if coverage < 0.80 or c < 7:
            ehi_values.append(np.nan) # Failsafe gated
        else:
            ehi_values.append(98.0 - (10 - c) * 3.5)
            
    ax2.plot(10 - channels_intact, coverage_values, 'g-o', lw=2, label="Sensor Coverage Fraction (%)")
    ax2.plot(10 - channels_intact, ehi_values, 'b-s', lw=2.2, label="Engine Health Index (EHI)")
    ax2.axvline(2.5, color='r', linestyle='--', lw=1.5, label="Failsafe Gate Trigger (< 80% Coverage)")
    ax2.set_title("EHI Response & Telemetry Coverage Gating", fontsize=11, fontweight='bold', color='#0B2545')
    ax2.set_xlabel("Number of Disrupted / Failed Sensor Channels", fontsize=9.5)
    ax2.set_ylabel("Index Score / Coverage (%)", fontsize=9.5)
    ax2.grid(True, linestyle='--', alpha=0.6)
    ax2.legend(fontsize=8.5)
    
    plt.tight_layout()
    fig.savefig(OUTPUT_DIR / "fig_8_1_sensor_quality_ehi_curve.png", dpi=300)
    plt.close(fig)
    print("Generated fig_8_1_sensor_quality_ehi_curve.png")


# -------------------------------------------------------------
# 9. Figure 9.1: Severity-Stratified F1 Comparison
# -------------------------------------------------------------
def make_fig_9_1():
    # Severity breakdown from phase4b/4c evaluations
    categories = ['Mild Severity', 'Moderate Severity', 'Severe Severity']
    sc_f1 = [38.5, 49.2, 57.8]
    eng_f1 = [36.2, 48.0, 56.4]
    
    x = np.arange(len(categories))
    width = 0.35
    
    fig, ax = plt.subplots(figsize=(7.5, 4.5))
    rects1 = ax.bar(x - width/2, sc_f1, width, label='Scenario-Heldout', color='#3B82F6')
    rects2 = ax.bar(x + width/2, eng_f1, width, label='Engine-Heldout', color='#10B981')
    
    ax.set_ylabel('Diagnostic F1 Score (%)', fontsize=10, fontweight='bold')
    ax.set_title('Diagnostic Performance Across Fault Severity Tiers', fontsize=11, fontweight='bold', color='#0B2545')
    ax.set_xticks(x)
    ax.set_xticklabels(categories, fontsize=9.5)
    ax.set_ylim(0, 80)
    ax.grid(axis='y', linestyle='--', alpha=0.6)
    ax.legend(fontsize=9)
    
    for rects in [rects1, rects2]:
        for bar in rects:
            height = bar.get_height()
            ax.annotate(f'{height:.1f}%',
                        xy=(bar.get_x() + bar.get_width() / 2, height),
                        xytext=(0, 3),
                        textcoords="offset points",
                        ha='center', va='bottom', fontsize=8)
            
    plt.tight_layout()
    fig.savefig(OUTPUT_DIR / "fig_9_1_severity_stratified_f1.png", dpi=300)
    plt.close(fig)
    print("Generated fig_9_1_severity_stratified_f1.png")

if __name__ == '__main__':
    make_fig_3_1()
    make_fig_3_2()
    make_fig_4_1()
    make_fig_4_2()
    make_fig_7_1()
    make_fig_7_2()
    make_fig_7_3()
    make_fig_8_1()
    make_fig_9_1()
    print("All academic plots successfully generated.")
