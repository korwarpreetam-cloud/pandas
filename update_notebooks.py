"""
Adds JSON-export cells to growth.ipynb and inflation.ipynb
so the frontend dashboard can read the data directly from
the notebooks' output, no separate generate_data.py needed.
"""
import nbformat, os

DASHBOARD_PUBLIC = "modern-dashboard/public"

def append_cell(notebook_path, code):
    """Open a notebook, append a new code cell, and save."""
    with open(notebook_path, "r", encoding="utf-8") as f:
        nb = nbformat.read(f, as_version=4)
    new_cell = nbformat.v4.new_code_cell(source=code)
    nb.cells.append(new_cell)
    with open(notebook_path, "w", encoding="utf-8") as f:
        nbformat.write(nb, f)
    print(f"✅  Export cell added to {notebook_path}")

# ── growth.ipynb ──
# Variables already available in the notebook:
#   growth_df       – category-wise growth % per city
#   df              – full data with Total_Cost and Yearly_Growth_%
#   overall_growth_df (or the list 'overall_growth') – overall growth summary
growth_export_code = f'''# ═══════════════════════════════════════════════════
# Export data to JSON for the Frontend Dashboard
# ═══════════════════════════════════════════════════
import json, os

OUT_DIR = "{DASHBOARD_PUBLIC}"
os.makedirs(OUT_DIR, exist_ok=True)

# 1) Category-wise growth %
growth_df.to_json(os.path.join(OUT_DIR, "growth_data.json"), orient="records", indent=2)

# 2) Overall growth summary
overall_growth_df.to_json(os.path.join(OUT_DIR, "overall_growth.json"), orient="records", indent=2)

# 3) Full history (for trend & YoY charts)
cols = ["Year","City","Food","Fuel","Rent","Transport","Utilities","Entertainment","Total_Cost","Yearly_Growth_%"]
history = df[cols].copy()
history.to_json(os.path.join(OUT_DIR, "inflation_history.json"), orient="records", indent=2)

print("✅ growth.ipynb → exported growth_data.json, overall_growth.json, inflation_history.json")
'''

# ── inflation.ipynb ──
# Variables already available in the notebook:
#   latest_df  – latest year category data per city
#   df         – full data with Total_Cost
inflation_export_code = f'''# ═══════════════════════════════════════════════════
# Export data to JSON for the Frontend Dashboard
# ═══════════════════════════════════════════════════
import json, os

OUT_DIR = "{DASHBOARD_PUBLIC}"
os.makedirs(OUT_DIR, exist_ok=True)

# Latest-year category comparison
cols = ["City","Food","Fuel","Rent","Transport","Utilities","Entertainment","Total_Cost"]
latest_df[cols].to_json(os.path.join(OUT_DIR, "inflation_data.json"), orient="records", indent=2)

print("✅ inflation.ipynb → exported inflation_data.json")
'''

# ── Run ──
append_cell("growth.ipynb", growth_export_code)
append_cell("inflation.ipynb", inflation_export_code)

print("\\nDone!  Now open each notebook and run the last cell to generate the JSON files.")
