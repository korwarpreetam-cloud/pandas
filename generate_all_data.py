"""
Generates ALL JSON data files from data.csv to match every single output
in both growth.ipynb and inflation.ipynb.
"""
import pandas as pd
import os, json

df = pd.read_csv("data.csv")

categories = ["Food", "Fuel", "Rent", "Transport", "Utilities", "Entertainment"]

df["Total_Cost"] = df[categories].sum(axis=1)
df = df.sort_values(["City", "Year"])

# ── 1. Raw data (as seen in growth.ipynb cell 1) ──
raw_data = []
for _, row in df.iterrows():
    entry = {
        "Year": int(row["Year"]),
        "City": row["City"],
    }
    for cat in categories:
        entry[cat] = int(row[cat])
    entry["Total_Cost"] = int(row["Total_Cost"])
    raw_data.append(entry)

# ── 2. Overall growth summary (growth.ipynb) ──
overall_growth = []
for city, group in df.groupby("City"):
    first_value = group.iloc[0]["Total_Cost"]
    last_value = group.iloc[-1]["Total_Cost"]
    growth_percent = ((last_value - first_value) / first_value) * 100
    overall_growth.append({
        "City": city,
        "Start_Year": int(group.iloc[0]["Year"]),
        "End_Year": int(group.iloc[-1]["Year"]),
        "Start_Total": int(first_value),
        "End_Total": int(last_value),
        "Overall_Growth_%": round(growth_percent, 2)
    })

# ── 3. Category-wise growth % (growth.ipynb) ──
category_growth = []
for city, group in df.groupby("City"):
    city_result = {"City": city}
    for col in categories:
        first = group.iloc[0][col]
        last = group.iloc[-1][col]
        growth = ((last - first) / first) * 100
        city_result[col] = round(growth, 2)
    category_growth.append(city_result)

# ── 4. YoY Growth % (growth.ipynb) ──
df["Yearly_Growth_%"] = df.groupby("City")["Total_Cost"].pct_change() * 100

history = []
for _, row in df.iterrows():
    entry = {
        "Year": int(row["Year"]),
        "City": row["City"],
        "Total_Cost": int(row["Total_Cost"]),
        "Yearly_Growth_%": round(row["Yearly_Growth_%"], 2) if pd.notna(row["Yearly_Growth_%"]) else None,
    }
    for cat in categories:
        entry[cat] = int(row[cat])
    history.append(entry)

# ── 5. Latest year data (inflation.ipynb) ──
latest_year = int(df["Year"].max())
latest_df = df[df["Year"] == latest_year]
latest_records = []
for _, row in latest_df.iterrows():
    entry = {"City": row["City"], "Total_Cost": int(row["Total_Cost"])}
    for cat in categories:
        entry[cat] = int(row[cat])
    latest_records.append(entry)

# ── 6. Inflation summary (inflation.ipynb) — City, Start/End Year, Start/End Total ──
inflation_summary = []
for city, group in df.groupby("City"):
    inflation_summary.append({
        "City": city,
        "Start_Year": int(group.iloc[0]["Year"]),
        "End_Year": int(group.iloc[-1]["Year"]),
        "Start_Total": int(group.iloc[0]["Total_Cost"]),
        "End_Total": int(group.iloc[-1]["Total_Cost"]),
    })

# ── Write all JSON files ──
out_dir = "modern-dashboard/public"
os.makedirs(out_dir, exist_ok=True)

files = {
    "raw_data.json": raw_data,
    "overall_growth.json": overall_growth,
    "growth_data.json": category_growth,
    "inflation_history.json": history,
    "inflation_data.json": latest_records,
    "inflation_summary.json": inflation_summary,
}

for fname, data in files.items():
    with open(os.path.join(out_dir, fname), "w") as f:
        json.dump(data, f, indent=2)

print(f"✅ Generated {len(files)} JSON files in {out_dir}:")
for fname in files:
    print(f"   • {fname}")
