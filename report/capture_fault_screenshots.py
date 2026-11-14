import subprocess
import os
from PIL import Image

JS_ORIG = os.path.abspath('frontend/dist/assets/index-BFCsumKj.js')
HTML_ORIG = os.path.abspath('frontend/dist/test_index.html')
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
OUT_DIR = os.path.abspath('report/figures')

with open(JS_ORIG, 'r', encoding='utf-8') as f:
    js_text = f.read()

target = 'fault_type:"normal",severity:1,target_channel:void 0,onset_s:30,is_active:!1'

# 1. Combustion Irregularity Bundle
combustion_patch = 'fault_type:"combustion_irregularity",severity:3,target_channel:void 0,onset_s:0,is_active:!0'
js_combustion = js_text.replace(target, combustion_patch, 1)

js_combustion_path = os.path.abspath('frontend/dist/assets/index-combustion.js')
with open(js_combustion_path, 'w', encoding='utf-8') as f:
    f.write(js_combustion)

with open(HTML_ORIG, 'r', encoding='utf-8') as f:
    html_text = f.read()

html_combustion = html_text.replace('index-BFCsumKj.js', 'index-combustion.js')
html_combustion_path = os.path.abspath('frontend/dist/index_combustion.html')
with open(html_combustion_path, 'w', encoding='utf-8') as f:
    f.write(html_combustion)

out_combustion = os.path.join(OUT_DIR, 'full_combustion.png')
cmd = [
    CHROME,
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--allow-file-access-from-files',
    '--screenshot=' + out_combustion,
    '--window-size=1600,2600',
    '--virtual-time-budget=4000',
    'file:///' + html_combustion_path.replace('\\', '/')
]
res = subprocess.run(cmd, capture_output=True, text=True)
print("Combustion screenshot returncode:", res.returncode)

if os.path.exists(out_combustion):
    im_comb = Image.open(out_combustion)
    # Save full view and cropped diagnostic panel view
    im_comb.crop((20, 1580, 1580, 2080)).save(os.path.join(OUT_DIR, 'fig_10_4_fault_combustion.png'))
    print("Saved fig_10_4_fault_combustion.png")

# 2. Sensor Dropout Bundle
dropout_patch = 'fault_type:"sensor_dropout",severity:3,target_channel:"rpm",onset_s:0,is_active:!0'
js_dropout = js_text.replace(target, dropout_patch, 1)

js_dropout_path = os.path.abspath('frontend/dist/assets/index-dropout.js')
with open(js_dropout_path, 'w', encoding='utf-8') as f:
    f.write(js_dropout)

html_dropout = html_text.replace('index-BFCsumKj.js', 'index-dropout.js')
html_dropout_path = os.path.abspath('frontend/dist/index_dropout.html')
with open(html_dropout_path, 'w', encoding='utf-8') as f:
    f.write(html_dropout)

out_dropout = os.path.join(OUT_DIR, 'full_dropout.png')
cmd_drop = [
    CHROME,
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--allow-file-access-from-files',
    '--screenshot=' + out_dropout,
    '--window-size=1600,2600',
    '--virtual-time-budget=4000',
    'file:///' + html_dropout_path.replace('\\', '/')
]
res_drop = subprocess.run(cmd_drop, capture_output=True, text=True)
print("Dropout screenshot returncode:", res_drop.returncode)

if os.path.exists(out_dropout):
    im_drop = Image.open(out_dropout)
    im_drop.crop((20, 1580, 1580, 2080)).save(os.path.join(OUT_DIR, 'fig_10_5_fault_sensor_dropout.png'))
    print("Saved fig_10_5_fault_sensor_dropout.png")

print("Fault screenshot generation complete.")
