import subprocess
import os
os.makedirs('./session_new', exist_ok=True)
import time
import re
import threading
from flask import Flask, render_template_string, request

app = Flask(__name__)

# Store active processes
active_processes = {}

# ====== BACKGROUND BOT (Keeps WhatsApp online 24/7) ======
bot_process = None

def start_background_bot():
    """Start the WhatsApp bot in background and keep it running forever"""
    global bot_process
    
    while True:
        try:
            print("[i] Starting background bot...")
            bot_process = subprocess.Popen(
                ['node', 'bot.js'],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True
            )
            
            # Keep reading output
            for line in iter(bot_process.stdout.readline, ''):
                line = line.strip()
                if line:
                    print(f"[BOT] {line}")
                
        except Exception as e:
            print(f"[✗] Bot crashed: {e}")
            time.sleep(10)  # Wait before restart

# Start bot in background thread when app starts
bot_thread = threading.Thread(target=start_background_bot, daemon=True)
bot_thread.start()
# =========================================================

HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>anon V6</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
        
        body { 
            background-color: #0a0a0a; 
            color: #e0e0e0; 
            font-family: 'JetBrains Mono', monospace;
            text-align: center;
            padding: 20px;
            line-height: 1.6;
            margin: 0;
        }
        .container { 
            max-width: 500px;
            margin: 0 auto;
            background: #111;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 0 20px rgba(0, 255, 136, 0.1);
        }
        .header-box {
            border: 2px solid #00ff88;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            background: linear-gradient(135deg, #0a0a0a 0%, #0d1f0d 100%);
        }
        .title { 
            color: #00ff88; 
            font-weight: bold; 
            font-size: 1.8em;
            letter-spacing: 3px;
            margin: 0;
        }
        .subtitle {
            color: #666;
            font-size: 0.7em;
            margin-top: 5px;
        }
        .status-line {
            text-align: left;
            margin: 8px 0;
            font-size: 0.9em;
            color: #aaa;
        }
        .status-line .label {
            color: #00ff88;
            display: inline-block;
            width: 120px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .status-line .value {
            color: #fff;
        }
        .check {
            color: #00ff88;
        }
        .divider {
            border: none;
            border-top: 1px solid #333;
            margin: 20px 0;
        }
        .section-title {
            color: #00ff88;
            font-weight: bold;
            text-align: left;
            margin: 15px 0 10px 0;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        .description {
            text-align: left;
            color: #888;
            font-size: 0.85em;
            line-height: 1.8;
        }
        .command-box {
            background: #0d1f0d;
            border: 1px solid #00ff88;
            border-radius: 5px;
            padding: 15px;
            margin: 15px 0;
            text-align: left;
        }
        .command-name {
            color: #00ff88;
            font-weight: bold;
            font-size: 1.1em;
        }
        .command-desc {
            color: #aaa;
            font-size: 0.85em;
            margin: 5px 0;
        }
        .command-example {
            color: #666;
            font-size: 0.8em;
            font-style: italic;
        }
        .code-display { 
            font-size: 2em; 
            color: #00ff88;
            background: #0a0a0a;
            padding: 20px;
            margin: 20px 0;
            border: 2px solid #00ff88;
            border-radius: 5px;
            letter-spacing: 8px;
            font-weight: bold;
        }
        input { 
            width: 100%; 
            padding: 12px; 
            background: #0a0a0a;
            color: #00ff88;
            border: 1px solid #333;
            border-radius: 5px;
            margin: 10px 0;
            font-family: 'JetBrains Mono', monospace;
            font-size: 1em;
            box-sizing: border-box;
        }
        input:focus { 
            border-color: #00ff88; 
            outline: none;
        }
        .btn { 
            background: #00ff88; 
            color: #000;
            padding: 15px 30px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 1em;
            font-weight: bold;
            width: 100%;
            font-family: 'JetBrains Mono', monospace;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .btn:hover { 
            background: #00cc6a; 
        }
        .error { 
            color: #ff4444; 
            background: #1a0a0a;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
        }
        .success { 
            color: #00ff88; 
            background: #0a1a0a;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
        }
        .footer {
            margin-top: 20px;
            color: #555;
            font-size: 0.8em;
        }
        .footer .powered {
            color: #00ff88;
        }
        .log { 
            text-align: left; 
            background: #0a0a0a; 
            padding: 10px; 
            margin: 10px 0;
            font-size: 0.75em;
            max-height: 150px;
            overflow-y: auto;
            border-radius: 5px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header-box">
            <div class="title">anon V6</div>
            <div class="subtitle">WhatsApp Assistant Bot</div>
        </div>

        <div class="status-line">
            <span class="label">BOT STATUS :</span>
            <span class="value check">ACTIVE ✓</span>
        </div>
        <div class="status-line">
            <span class="label">SYSTEM :</span>
            <span class="value">PAIRING MANAGER</span>
        </div>

        <hr class="divider">

        <div class="section-title">BOT PURPOSE</div>
        <div class="description">
            Anon is a smart assistant designed to help you pair<br>
            and manage WhatsApp devices easily with simple commands.
        </div>

        <hr class="divider">

        {% if error %}
            <div class="error">{{ error }}</div>
        {% endif %}

        {% if pairing_code %}
            <div class="section-title">CONNECTION ESTABLISHED</div>
            <div class="code-display">{{ pairing_code }}</div>
            <div class="success">✓ PAIRING CODE GENERATED</div>
            <div class="description" style="margin-top: 10px;">
                Enter this code in your WhatsApp<br>
                Settings → Linked Devices → Link with phone number
            </div>
            
            {% if logs %}
                <div class="log">
                    <strong>LIVE STATUS:</strong><br>
                    {% for line in logs %}
                        {{ line }}<br>
                    {% endfor %}
                </div>
            {% endif %}
            
            <a href="/" style="color: #00ff88; text-decoration: none; display: block; margin-top: 20px; font-size: 0.9em;">
                ← BACK TO MAIN MENU
            </a>
        {% else %}
            <div class="section-title">PAIRING SYSTEM</div>
            
            <div class="command-box">
                <div class="command-name">connect</div>
                <div class="command-desc">Connect a new number to the system</div>
                <div class="command-example">Example → 234xxxxxxxxxx</div>
            </div>

            <form method="POST" style="margin-top: 20px;">
                <input 
                    type="text" 
                    name="number" 
                    placeholder="Enter phone number (eg: 2347089555755)" 
                    required
                    pattern="[0-9+]{10,16}"
                >
                <button type="submit" class="btn">Connect Device</button>
            </form>
        {% endif %}

        <hr class="divider">

        <div class="section-title">UTILITY</div>
        <div class="command-box">
            <div class="command-name">/runtime</div>
            <div class="command-desc">View bot uptime and system status</div>
        </div>

        <div class="footer">
            SYSTEM POWERED BY <span class="powered">LONER • LONER</span>
        </div>
    </div>
</body>
</html>
"""

def extract_pairing_code(line):
    match = re.search(r'ANON_CODE_START:([A-Z0-9]+):ANON_CODE_END', line)
    if match:
        return match.group(1)
    return None

def run_pairing_process(number, session_id):
    """Run pair.js and keep it alive for linking to complete"""
    script_path = 'anon-bot/pair.js' if os.path.exists('anon-bot/pair.js') else 'pair.js'
    
    if not os.path.exists(script_path):
        return None, "pair.js not found"
    
    try:
        subprocess.run(['pkill', '-f', f'node.*{number}'], stderr=subprocess.DEVNULL)
        time.sleep(1)
        
        print(f"[{session_id}] Starting pair.js for {number}")
        
        # Ensure number has + prefix for international format
        formatted_number = number if number.startswith('+') else '+' + number
        
        process = subprocess.Popen(
            ['node', script_path, formatted_number],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        active_processes[session_id] = {
            'process': process,
            'number': number,
            'code': None,
            'logs': [],
            'linked': False
        }
        
        for line in iter(process.stdout.readline, ''):
            line = line.strip()
            if not line:
                continue
                
            print(f"[{session_id}] {line}")
            active_processes[session_id]['logs'].append(line)
            
            if len(active_processes[session_id]['logs']) > 20:
                active_processes[session_id]['logs'].pop(0)
            
            if not active_processes[session_id]['code']:
                code = extract_pairing_code(line)
                if code:
                    active_processes[session_id]['code'] = code
                    print(f"[{session_id}] Code found: {code}")
            
            if "SUCCESS: DEVICE LINKED" in line:
                active_processes[session_id]['linked'] = True
                print(f"[{session_id}] Device linked!")
            
            if "Logged out" in line or "authentication failed" in line:
                print(f"[{session_id}] Linking failed")
                break
        
        try:
            process.wait(timeout=120)
        except subprocess.TimeoutExpired:
            print(f"[{session_id}] Timeout, terminating...")
            process.terminate()
            process.wait(timeout=5)
            
    except Exception as e:
        print(f"[{session_id}] Error: {str(e)}")
    finally:
        if session_id in active_processes:
            del active_processes[session_id]

@app.route('/', methods=['GET', 'POST'])
def home():
    pairing_code = None
    error = None
    logs = []
    
    if request.method == 'POST':
        number = request.form.get('number', '').strip()
        
        # Remove all non-digit and non-plus characters
        clean_number = re.sub(r'[^\d+]', '', number)
        
        # Ensure it starts with +
        if not clean_number.startswith('+'):
            clean_number = '+' + clean_number
            
        # Validate: must be + followed by at least 10 digits
        digits_only = re.sub(r'\D', '', clean_number)
        if not digits_only or len(digits_only) < 10:
            error = "❌ INVALID PHONE NUMBER - Need at least 10 digits with country code"
        else:
            session_id = f"{clean_number}_{int(time.time())}"
            
            thread = threading.Thread(
                target=run_pairing_process, 
                args=(clean_number, session_id)
            )
            thread.daemon = True
            thread.start()
            
            waited = 0
            while waited < 15:
                if session_id in active_processes:
                    code = active_processes[session_id].get('code')
                    if code:
                        pairing_code = code
                        logs = active_processes[session_id].get('logs', [])
                        break
                time.sleep(0.5)
                waited += 0.5
            
            if not pairing_code:
                error = "❌ TIMEOUT - NO CODE GENERATED"

    return render_template_string(
        HTML_TEMPLATE, 
        pairing_code=pairing_code, 
        error=error,
        logs=logs
    )

# This is critical for Gunicorn on Render
port = int(os.environ.get("PORT", 10000))

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=port)
