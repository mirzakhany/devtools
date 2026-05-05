// ─── Crypto helpers ──────────────────────────────────────────────
async function createHash(algorithm, data) {
    const hashBuffer = await crypto.subtle.digest(algorithm, data);
    return { buffer: hashBuffer, array: new Uint8Array(hashBuffer) };
}

function hashToHex(arr) {
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hashToBase64(arr) {
    return btoa(String.fromCharCode(...arr));
}

// ─── UUID helpers ────────────────────────────────────────────────
function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

function uuidv7() {
    const now = Date.now();
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    // 48-bit timestamp in ms (big-endian) in bytes 0-5
    bytes[0] = (now / 2**40) & 0xff;
    bytes[1] = (now / 2**32) & 0xff;
    bytes[2] = (now / 2**24) & 0xff;
    bytes[3] = (now / 2**16) & 0xff;
    bytes[4] = (now / 2**8) & 0xff;
    bytes[5] = now & 0xff;
    // version 7
    bytes[6] = (bytes[6] & 0x0f) | 0x70;
    // variant 10
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

// ─── Syntax highlighting helper ──────────────────────────────────
function highlightOutput(el, code, language) {
    if (typeof hljs !== 'undefined' && language) {
        const result = hljs.highlight(code, { language });
        el.innerHTML = `<pre><code class="hljs language-${language}">${result.value}</code></pre>`;
    } else {
        el.textContent = code;
    }
    el.classList.remove('d-none');
}

// ─── Copy-to-clipboard ──────────────────────────────────────────
function initCopyButtons() {
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.copy-btn');
        if (!btn) return;
        const targetId = btn.getAttribute('data-copy-target');
        let text;
        if (targetId) {
            text = document.getElementById(targetId)?.textContent;
        } else {
            const output = btn.closest('.output-wrap')?.querySelector('.output');
            text = output?.textContent;
        }
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            btn.classList.add('copied');
            const icon = btn.querySelector('i');
            const origClass = icon?.className;
            if (icon) icon.className = 'bi bi-check2';
            btn.childNodes[btn.childNodes.length - 1].textContent = ' Copied!';
            setTimeout(() => {
                btn.classList.remove('copied');
                if (icon) icon.className = origClass;
                btn.childNodes[btn.childNodes.length - 1].textContent = ' Copy';
            }, 1500);
        });
    });
}

function showOutput(outputEl, copyBtn) {
    outputEl.classList.remove('d-none');
    if (copyBtn) copyBtn.classList.remove('d-none');
}

// ─── Sidebar navigation with hash routing ────────────────────────
function initNavigation() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const toggle = document.getElementById('sidebar-toggle');
    const links = document.querySelectorAll('.sidebar-link');

    function activateTool(toolId) {
        document.querySelectorAll('.tool-pane').forEach(p => p.classList.remove('active'));
        links.forEach(l => l.classList.remove('active'));
        const pane = document.getElementById('tool-' + toolId);
        const link = document.querySelector(`.sidebar-link[data-tool="${toolId}"]`);
        if (pane) pane.classList.add('active');
        if (link) link.classList.add('active');
        // close mobile sidebar
        sidebar.classList.remove('show');
        overlay.classList.remove('show');
    }

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tool = link.getAttribute('data-tool');
            window.location.hash = tool;
            activateTool(tool);
        });
    });

    toggle.addEventListener('click', () => {
        sidebar.classList.toggle('show');
        overlay.classList.toggle('show');
    });

    overlay.addEventListener('click', () => {
        sidebar.classList.remove('show');
        overlay.classList.remove('show');
    });

    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.replace('#', '');
        if (hash) activateTool(hash);
    });

    // activate from hash on load
    const hash = window.location.hash.replace('#', '');
    if (hash) activateTool(hash);
}

// ─── Timestamp Converter ─────────────────────────────────────────
function initTimestampConverter() {
    const input = document.getElementById('timestamp-input');
    const output = document.getElementById('timestamp-output');
    const copyBtn = document.getElementById('timestamp-copy');
    const detect = document.getElementById('timestamp-detect');
    const liveTicker = document.getElementById('live-timestamp');
    const liveTickerMs = document.getElementById('live-timestamp-ms');

    // Live ticker
    function updateLive() {
        const now = Math.floor(Date.now() / 1000);
        liveTicker.textContent = now;
        liveTickerMs.textContent = `(${Date.now()} ms)`;
    }
    updateLive();
    setInterval(updateLive, 1000);

    function convert() {
        const raw = input.value.trim();
        if (!raw) {
            output.textContent = 'Please enter a timestamp.';
            showOutput(output, copyBtn);
            return;
        }
        try {
            const num = parseInt(raw, 10);
            if (isNaN(num)) throw new Error('Invalid number');
            let ms;
            if (raw.length >= 13) {
                ms = num;
                detect.textContent = 'Detected: milliseconds';
            } else {
                ms = num * 1000;
                detect.textContent = 'Detected: seconds';
            }
            const date = new Date(ms);
            if (isNaN(date.getTime())) throw new Error('Invalid timestamp');
            const diff = Date.now() - ms;
            const relStr = formatRelative(diff);

            output.innerHTML =
`<strong>UTC:</strong>       ${date.toUTCString()}
<strong>Local:</strong>     ${date.toString()}
<strong>ISO:</strong>       ${date.toISOString()}
<strong>Seconds:</strong>   ${Math.floor(ms / 1000)}
<strong>Millis:</strong>    ${ms}
<strong>Relative:</strong>  ${relStr}`;
            showOutput(output, copyBtn);
        } catch (err) {
            output.textContent = 'Error: ' + err.message;
            showOutput(output, copyBtn);
        }
    }

    document.getElementById('convert-timestamp').addEventListener('click', convert);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') convert(); });

    document.getElementById('current-timestamp').addEventListener('click', () => {
        input.value = Math.floor(Date.now() / 1000);
        convert();
    });

    // Reverse conversion
    const reverseInput = document.getElementById('timestamp-reverse-input');
    const now = new Date();
    reverseInput.value = toLocalISOString(now);

    document.getElementById('reverse-timestamp').addEventListener('click', () => {
        const val = reverseInput.value;
        if (!val) return;
        const d = new Date(val);
        const sec = Math.floor(d.getTime() / 1000);
        output.innerHTML =
`<strong>Seconds:</strong>      ${sec}
<strong>Milliseconds:</strong>  ${d.getTime()}`;
        showOutput(output, copyBtn);
    });
}

function toLocalISOString(d) {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatRelative(diffMs) {
    const abs = Math.abs(diffMs);
    const seconds = Math.floor(abs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const suffix = diffMs >= 0 ? 'ago' : 'from now';
    if (days > 0) return `${days} day${days !== 1 ? 's' : ''} ${suffix}`;
    if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} ${suffix}`;
    if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''} ${suffix}`;
    return `${seconds} second${seconds !== 1 ? 's' : ''} ${suffix}`;
}

// ─── Time Since Calculator ───────────────────────────────────────
function initTimeSinceCalculator() {
    const calcBtn = document.getElementById('calculate-time-since');
    const inputEl = document.getElementById('time-since-input');
    const output = document.getElementById('time-since-output');
    const copyBtn = document.getElementById('time-since-copy');

    const now = new Date();
    inputEl.value = toLocalISOString(now);

    calcBtn.addEventListener('click', () => {
        const val = inputEl.value;
        if (!val) {
            output.textContent = 'Please select a date and time.';
            showOutput(output, copyBtn);
            return;
        }
        try {
            const selected = new Date(val);
            const current = new Date();
            const isFuture = selected > current;
            const earlier = isFuture ? current : selected;
            const later = isFuture ? selected : current;
            const label = isFuture ? 'Time Until' : 'Time Since';

            // Accurate calendar diff
            let years = later.getFullYear() - earlier.getFullYear();
            let months = later.getMonth() - earlier.getMonth();
            let days = later.getDate() - earlier.getDate();
            let hours = later.getHours() - earlier.getHours();
            let mins = later.getMinutes() - earlier.getMinutes();
            let secs = later.getSeconds() - earlier.getSeconds();

            if (secs < 0) { secs += 60; mins--; }
            if (mins < 0) { mins += 60; hours--; }
            if (hours < 0) { hours += 24; days--; }
            if (days < 0) {
                const prevMonth = new Date(later.getFullYear(), later.getMonth(), 0);
                days += prevMonth.getDate();
                months--;
            }
            if (months < 0) { months += 12; years--; }

            const weeks = Math.floor(days / 7);
            const remainingDays = days % 7;

            // Totals
            const totalMs = Math.abs(later - earlier);
            const totalSec = Math.floor(totalMs / 1000);
            const totalMin = Math.floor(totalSec / 60);
            const totalHrs = Math.floor(totalMin / 60);
            const totalDays = Math.floor(totalHrs / 24);
            const totalWeeks = Math.floor(totalDays / 7);

            output.innerHTML =
`<div class="row">
    <div class="col-md-6">
        <h6 class="text-secondary">${label} (breakdown)</h6>
        <p>
            ${years} year${years!==1?'s':''}, ${months} month${months!==1?'s':''}, ${weeks} week${weeks!==1?'s':''}, ${remainingDays} day${remainingDays!==1?'s':''}
            <br>${hours} hour${hours!==1?'s':''}, ${mins} minute${mins!==1?'s':''}, ${secs} second${secs!==1?'s':''}
        </p>
    </div>
    <div class="col-md-6">
        <h6 class="text-secondary">Totals</h6>
        <p>
            ${totalDays.toLocaleString()} days (${totalWeeks.toLocaleString()} weeks)<br>
            ${totalHrs.toLocaleString()} hours<br>
            ${totalMin.toLocaleString()} minutes<br>
            ${totalSec.toLocaleString()} seconds
        </p>
    </div>
</div>`;
            showOutput(output, copyBtn);
        } catch (err) {
            output.textContent = 'Error: ' + err.message;
            showOutput(output, copyBtn);
        }
    });
}

// ─── JWT Decoder ─────────────────────────────────────────────────
const JWT_CLAIM_LABELS = {
    iss: 'Issuer',
    sub: 'Subject',
    aud: 'Audience',
    exp: 'Expiration Time',
    nbf: 'Not Before',
    iat: 'Issued At',
    jti: 'JWT ID',
};
const JWT_TIME_CLAIMS = ['exp', 'iat', 'nbf'];

function initJwtDecoder() {
    document.getElementById('decode-jwt').addEventListener('click', () => {
        const jwt = document.getElementById('jwt-input').value.trim();
        const headerOut = document.getElementById('jwt-header-output');
        const payloadOut = document.getElementById('jwt-payload-output');
        const sigOut = document.getElementById('jwt-signature-output');
        const errorOut = document.getElementById('jwt-error');
        const statusEl = document.getElementById('jwt-status');

        [headerOut, payloadOut, sigOut].forEach(el => { el.textContent = ''; el.classList.add('d-none'); });
        errorOut.classList.add('d-none');
        statusEl.classList.add('d-none');
        document.querySelectorAll('[data-copy-target^="jwt-"]').forEach(b => b.classList.add('d-none'));

        if (!jwt) {
            errorOut.textContent = 'Please enter a JWT token.';
            errorOut.classList.remove('d-none');
            return;
        }

        try {
            const parts = jwt.split('.');
            if (parts.length !== 3) throw new Error('Invalid JWT format. Expected 3 parts separated by dots.');

            const decodeB64 = (str) => {
                const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
                const padding = '='.repeat((4 - (base64.length % 4)) % 4);
                return JSON.parse(atob(base64 + padding));
            };

            const header = decodeB64(parts[0]);
            const payload = decodeB64(parts[1]);

            highlightOutput(headerOut, JSON.stringify(header, null, 2), 'json');
            headerOut.closest('.output-wrap')?.querySelector('.copy-btn')?.classList.remove('d-none');

            // Annotated payload
            const lines = JSON.stringify(payload, null, 2).split('\n');
            const annotated = lines.map(line => {
                for (const key of JWT_TIME_CLAIMS) {
                    const regex = new RegExp(`"${key}":\\s*(\\d+)`);
                    const m = line.match(regex);
                    if (m) {
                        const ts = parseInt(m[1], 10);
                        const d = new Date(ts * 1000);
                        let extra = d.toISOString();
                        if (key === 'exp') {
                            extra += d < new Date() ? ' (expired)' : ' (valid)';
                        }
                        return line + `  // ${extra}`;
                    }
                }
                for (const [k, label] of Object.entries(JWT_CLAIM_LABELS)) {
                    if (line.includes(`"${k}"`)) {
                        return line + `  // ${label}`;
                    }
                }
                return line;
            });
            highlightOutput(payloadOut, annotated.join('\n'), 'javascript');
            payloadOut.closest('.output-wrap')?.querySelector('.copy-btn')?.classList.remove('d-none');

            // Signature
            sigOut.textContent = parts[2];
            sigOut.classList.remove('d-none');
            sigOut.closest('.output-wrap')?.querySelector('.copy-btn')?.classList.remove('d-none');

            // Status badges
            let badges = '';
            if (payload.iat) {
                const iatDate = new Date(payload.iat * 1000);
                badges += `<span class="badge bg-info text-dark px-3 py-2 me-2"><i class="bi bi-calendar-event me-1"></i> <code>iat</code> Issued on ${iatDate.toLocaleString()}</span>`;
            }
            if (payload.nbf) {
                const nbfDate = new Date(payload.nbf * 1000);
                const notYetValid = nbfDate > new Date();
                badges += notYetValid
                    ? `<span class="badge badge-expired px-3 py-2 me-2"><i class="bi bi-clock me-1"></i> <code>nbf</code> Not valid until ${nbfDate.toLocaleString()}</span>`
                    : `<span class="badge badge-valid px-3 py-2 me-2"><i class="bi bi-clock me-1"></i> <code>nbf</code> Active since ${nbfDate.toLocaleString()}</span>`;
            }
            if (payload.exp) {
                const expDate = new Date(payload.exp * 1000);
                const isExpired = expDate < new Date();
                badges += isExpired
                    ? `<span class="badge badge-expired px-3 py-2"><i class="bi bi-x-circle me-1"></i> <code>exp</code> Expired on ${expDate.toLocaleString()}</span>`
                    : `<span class="badge badge-valid px-3 py-2"><i class="bi bi-check-circle me-1"></i> <code>exp</code> Valid until ${expDate.toLocaleString()}</span>`;
            }
            if (badges) {
                statusEl.innerHTML = badges;
                statusEl.classList.remove('d-none');
            }
        } catch (err) {
            errorOut.textContent = 'Error: ' + err.message;
            errorOut.classList.remove('d-none');
        }
    });
}

// ─── Base64 Encoder/Decoder ──────────────────────────────────────
function initBase64Tool() {
    const inputEl = document.getElementById('base64-input');
    const output = document.getElementById('base64-output');
    const errorOut = document.getElementById('base64-error');
    const inCount = document.getElementById('base64-input-count');
    const outCount = document.getElementById('base64-output-count');
    const urlSafe = document.getElementById('base64-urlsafe');

    inputEl.addEventListener('input', () => {
        inCount.textContent = `${inputEl.value.length} characters`;
    });

    function utf8ToBase64(str) {
        const bytes = new TextEncoder().encode(str);
        let binary = '';
        bytes.forEach(b => binary += String.fromCharCode(b));
        return btoa(binary);
    }

    function base64ToUtf8(b64) {
        const binary = atob(b64);
        const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
        return new TextDecoder().decode(bytes);
    }

    document.getElementById('encode-base64').addEventListener('click', () => {
        errorOut.classList.add('d-none');
        const input = inputEl.value;
        if (!input) { errorOut.textContent = 'Please enter text to encode.'; errorOut.classList.remove('d-none'); return; }
        try {
            let encoded = utf8ToBase64(input);
            if (urlSafe.checked) {
                encoded = encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            }
            output.textContent = encoded;
            showOutput(output);
            outCount.textContent = `${encoded.length} characters`;
            output.closest('.output-wrap')?.querySelector('.copy-btn')?.classList.remove('d-none');
        } catch (err) {
            errorOut.textContent = 'Error: ' + err.message;
            errorOut.classList.remove('d-none');
        }
    });

    document.getElementById('decode-base64').addEventListener('click', () => {
        errorOut.classList.add('d-none');
        let input = inputEl.value.trim();
        if (!input) { errorOut.textContent = 'Please enter base64 to decode.'; errorOut.classList.remove('d-none'); return; }
        try {
            if (urlSafe.checked) {
                input = input.replace(/-/g, '+').replace(/_/g, '/');
                const pad = (4 - (input.length % 4)) % 4;
                input += '='.repeat(pad);
            }
            const decoded = base64ToUtf8(input);
            output.textContent = decoded;
            showOutput(output);
            outCount.textContent = `${decoded.length} characters`;
            output.closest('.output-wrap')?.querySelector('.copy-btn')?.classList.remove('d-none');
        } catch (err) {
            errorOut.textContent = 'Error: ' + err.message + '. Make sure the input is valid Base64.';
            errorOut.classList.remove('d-none');
        }
    });
}

// ─── URL Encoder/Decoder ─────────────────────────────────────────
function initUrlTool() {
    const inputEl = document.getElementById('url-input');
    const output = document.getElementById('url-output');
    const errorOut = document.getElementById('url-error');

    function getMode() {
        return document.querySelector('input[name="urlMode"]:checked').value;
    }

    document.getElementById('encode-url').addEventListener('click', () => {
        errorOut.classList.add('d-none');
        const input = inputEl.value;
        if (!input) { errorOut.textContent = 'Please enter text to encode.'; errorOut.classList.remove('d-none'); return; }
        try {
            const encoded = getMode() === 'uri' ? encodeURI(input) : encodeURIComponent(input);
            output.textContent = encoded;
            showOutput(output);
            output.closest('.output-wrap')?.querySelector('.copy-btn')?.classList.remove('d-none');
        } catch (err) {
            errorOut.textContent = 'Error: ' + err.message;
            errorOut.classList.remove('d-none');
        }
    });

    document.getElementById('decode-url').addEventListener('click', () => {
        errorOut.classList.add('d-none');
        const input = inputEl.value.trim();
        if (!input) { errorOut.textContent = 'Please enter text to decode.'; errorOut.classList.remove('d-none'); return; }
        try {
            const decoded = getMode() === 'uri' ? decodeURI(input) : decodeURIComponent(input);
            output.textContent = decoded;
            showOutput(output);
            output.closest('.output-wrap')?.querySelector('.copy-btn')?.classList.remove('d-none');
        } catch (err) {
            errorOut.textContent = 'Error: ' + err.message;
            errorOut.classList.remove('d-none');
        }
    });

    document.getElementById('parse-url').addEventListener('click', () => {
        errorOut.classList.add('d-none');
        const input = inputEl.value.trim();
        if (!input) { errorOut.textContent = 'Please enter a URL.'; errorOut.classList.remove('d-none'); return; }
        try {
            const url = new URL(input);
            let result = `<strong>Protocol:</strong>  ${url.protocol}\n<strong>Host:</strong>      ${url.host}\n<strong>Hostname:</strong>  ${url.hostname}\n<strong>Port:</strong>      ${url.port || '(default)'}\n<strong>Path:</strong>      ${url.pathname}\n<strong>Hash:</strong>      ${url.hash || '(none)'}\n`;
            if (url.searchParams.toString()) {
                result += `\n<strong>Query Parameters:</strong>\n`;
                url.searchParams.forEach((v, k) => {
                    result += `  ${k} = ${v}\n`;
                });
            }
            output.innerHTML = result;
            showOutput(output);
            output.closest('.output-wrap')?.querySelector('.copy-btn')?.classList.remove('d-none');
        } catch (err) {
            errorOut.textContent = 'Not a valid URL: ' + err.message;
            errorOut.classList.remove('d-none');
        }
    });
}

// ─── HTML Entity Encoder/Decoder ─────────────────────────────────
function initHtmlEntityTool() {
    const inputEl = document.getElementById('html-entity-input');
    const output = document.getElementById('html-entity-output');
    const errorOut = document.getElementById('html-entity-error');
    const inCount = document.getElementById('html-entity-input-count');
    const outCount = document.getElementById('html-entity-output-count');

    inputEl.addEventListener('input', () => { inCount.textContent = `${inputEl.value.length} characters`; });

    document.getElementById('encode-html-entity').addEventListener('click', () => {
        errorOut.classList.add('d-none');
        const input = inputEl.value;
        if (!input) { errorOut.textContent = 'Please enter text to encode.'; errorOut.classList.remove('d-none'); return; }
        const ta = document.createElement('textarea');
        ta.textContent = input;
        const encoded = ta.innerHTML;
        highlightOutput(output, encoded, 'xml');
        outCount.textContent = `${encoded.length} characters`;
        output.closest('.output-wrap')?.querySelector('.copy-btn')?.classList.remove('d-none');
    });

    document.getElementById('decode-html-entity').addEventListener('click', () => {
        errorOut.classList.add('d-none');
        const input = inputEl.value.trim();
        if (!input) { errorOut.textContent = 'Please enter text to decode.'; errorOut.classList.remove('d-none'); return; }
        const div = document.createElement('div');
        div.innerHTML = input;
        const decoded = div.textContent;
        output.textContent = decoded;
        showOutput(output);
        outCount.textContent = `${decoded.length} characters`;
        output.closest('.output-wrap')?.querySelector('.copy-btn')?.classList.remove('d-none');
    });
}

// ─── Hash Generator ──────────────────────────────────────────────
function initHashGenerator() {
    const inputEl = document.getElementById('hash-input');
    const output = document.getElementById('hash-output');
    const errorOut = document.getElementById('hash-error');
    const dropZone = document.getElementById('hash-drop-zone');
    const fileInput = document.getElementById('hash-file-input');
    const fileName = document.getElementById('hash-file-name');
    let fileData = null;

    function getOutputFormat() {
        return document.querySelector('input[name="hashOutput"]:checked').value;
    }

    function getAlgorithm() {
        return document.querySelector('input[name="hashType"]:checked').value;
    }

    async function hashAndDisplay(data) {
        const algo = getAlgorithm();
        const { array } = await createHash(algo, data);
        const fmt = getOutputFormat();
        output.textContent = fmt === 'base64' ? hashToBase64(array) : hashToHex(array);
        showOutput(output);
        output.closest('.output-wrap')?.querySelector('.copy-btn')?.classList.remove('d-none');
    }

    document.getElementById('generate-hash').addEventListener('click', async () => {
        errorOut.classList.add('d-none');
        if (fileData) {
            await hashAndDisplay(fileData);
            return;
        }
        const input = inputEl.value;
        if (!input) { errorOut.textContent = 'Please enter text or drop a file.'; errorOut.classList.remove('d-none'); return; }
        const data = new TextEncoder().encode(input);
        await hashAndDisplay(data);
    });

    // File handling
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) loadFile(file);
    });
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => { if (fileInput.files[0]) loadFile(fileInput.files[0]); });

    function loadFile(file) {
        fileName.textContent = file.name + ' (' + formatBytes(file.size) + ')';
        file.arrayBuffer().then(buf => { fileData = buf; });
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ─── UUID Generator ──────────────────────────────────────────────
function initUuidGenerator() {
    const output = document.getElementById('uuid-output');

    function generate() {
        const version = document.querySelector('input[name="uuidVersion"]:checked').value;
        const upper = document.getElementById('upperCase').checked;
        const noDash = document.getElementById('noDashes').checked;
        const count = Math.max(1, Math.min(100, parseInt(document.getElementById('uuid-count').value, 10) || 1));

        const uuids = [];
        for (let i = 0; i < count; i++) {
            let uuid = version === 'v7' ? uuidv7() : uuidv4();
            if (upper) uuid = uuid.toUpperCase();
            if (noDash) uuid = uuid.replace(/-/g, '');
            uuids.push(uuid);
        }
        output.textContent = uuids.join('\n');
        showOutput(output);
        output.closest('.output-wrap')?.querySelector('.copy-btn')?.classList.remove('d-none');
    }

    document.getElementById('generate-uuid').addEventListener('click', generate);

    // UUID validator
    document.getElementById('validate-uuid').addEventListener('click', () => {
        const input = document.getElementById('uuid-validate-input').value.trim();
        const out = document.getElementById('uuid-validate-output');
        if (!input) { out.textContent = 'Please enter a UUID.'; out.classList.remove('d-none'); return; }
        const uuidRegex = /^[0-9a-f]{8}-?[0-9a-f]{4}-?([0-9a-f])[0-9a-f]{3}-?([0-9a-f])[0-9a-f]{3}-?[0-9a-f]{12}$/i;
        const m = input.match(uuidRegex);
        if (!m) {
            out.textContent = 'Invalid UUID format.';
            out.classList.remove('d-none');
            return;
        }
        const version = m[1];
        const variantNibble = parseInt(m[2], 16);
        let variant;
        if ((variantNibble & 0x8) === 0) variant = 'NCS (reserved)';
        else if ((variantNibble & 0xc) === 0x8) variant = 'RFC 4122';
        else if ((variantNibble & 0xe) === 0xc) variant = 'Microsoft';
        else variant = 'Future (reserved)';

        out.innerHTML =
`<strong>Valid:</strong>    Yes
<strong>Version:</strong>  ${version}
<strong>Variant:</strong>  ${variant}`;
        out.classList.remove('d-none');
    });
}

// ─── Lorem Ipsum Generator ───────────────────────────────────────
const LOREM_WORDS = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum'.split(' ');

function randomLoremSentence() {
    const len = 8 + Math.floor(Math.random() * 12);
    const words = [];
    for (let i = 0; i < len; i++) words.push(LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)]);
    words[0] = words[0][0].toUpperCase() + words[0].slice(1);
    return words.join(' ') + '.';
}

function initLoremIpsum() {
    document.getElementById('generate-lorem').addEventListener('click', () => {
        const count = Math.max(1, Math.min(50, parseInt(document.getElementById('lorem-count').value, 10) || 3));
        const type = document.getElementById('lorem-type').value;
        const output = document.getElementById('lorem-output');
        let result;
        if (type === 'words') {
            const words = [];
            for (let i = 0; i < count; i++) words.push(LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)]);
            result = words.join(' ');
        } else if (type === 'sentences') {
            const sentences = [];
            for (let i = 0; i < count; i++) sentences.push(randomLoremSentence());
            result = sentences.join(' ');
        } else {
            const paras = [];
            for (let i = 0; i < count; i++) {
                const sCount = 3 + Math.floor(Math.random() * 5);
                const sentences = [];
                for (let j = 0; j < sCount; j++) sentences.push(randomLoremSentence());
                paras.push(sentences.join(' '));
            }
            result = paras.join('\n\n');
        }
        output.textContent = result;
        showOutput(output);
        output.closest('.output-wrap')?.querySelector('.copy-btn')?.classList.remove('d-none');
    });
}

// ─── JSON Formatter / Validator ──────────────────────────────────
function initJsonFormatter() {
    const inputEl = document.getElementById('json-input');
    const output = document.getElementById('json-output');
    const errorOut = document.getElementById('json-error');

    function getIndent() {
        const val = document.querySelector('input[name="jsonIndent"]:checked').value;
        return val === 'tab' ? '\t' : parseInt(val, 10);
    }

    document.getElementById('format-json').addEventListener('click', () => {
        errorOut.classList.add('d-none');
        const input = inputEl.value.trim();
        if (!input) { errorOut.textContent = 'Please enter JSON.'; errorOut.classList.remove('d-none'); return; }
        try {
            const obj = JSON.parse(input);
            highlightOutput(output, JSON.stringify(obj, null, getIndent()), 'json');
            output.closest('.output-wrap')?.querySelector('.copy-btn')?.classList.remove('d-none');
        } catch (err) {
            errorOut.textContent = 'Invalid JSON: ' + err.message;
            errorOut.classList.remove('d-none');
        }
    });

    document.getElementById('minify-json').addEventListener('click', () => {
        errorOut.classList.add('d-none');
        const input = inputEl.value.trim();
        if (!input) { errorOut.textContent = 'Please enter JSON.'; errorOut.classList.remove('d-none'); return; }
        try {
            const obj = JSON.parse(input);
            highlightOutput(output, JSON.stringify(obj), 'json');
            output.closest('.output-wrap')?.querySelector('.copy-btn')?.classList.remove('d-none');
        } catch (err) {
            errorOut.textContent = 'Invalid JSON: ' + err.message;
            errorOut.classList.remove('d-none');
        }
    });
}

// ─── Regex Tester ────────────────────────────────────────────────
function initRegexTester() {
    document.getElementById('test-regex').addEventListener('click', () => {
        const pattern = document.getElementById('regex-pattern').value;
        const flags = document.getElementById('regex-flags').value;
        const testStr = document.getElementById('regex-test-string').value;
        const output = document.getElementById('regex-output');
        const highlighted = document.getElementById('regex-highlighted');

        if (!pattern || !testStr) {
            output.textContent = 'Please enter both a pattern and test string.';
            output.classList.remove('d-none');
            highlighted.classList.add('d-none');
            return;
        }

        try {
            const re = new RegExp(pattern, flags);
            const matches = [];
            let m;
            if (flags.includes('g')) {
                while ((m = re.exec(testStr)) !== null) {
                    matches.push({ match: m[0], index: m.index, groups: m.slice(1) });
                    if (m[0].length === 0) re.lastIndex++;
                }
            } else {
                m = re.exec(testStr);
                if (m) matches.push({ match: m[0], index: m.index, groups: m.slice(1) });
            }

            if (matches.length === 0) {
                output.textContent = 'No matches found.';
                output.classList.remove('d-none');
                highlighted.classList.add('d-none');
                return;
            }

            let result = `${matches.length} match${matches.length !== 1 ? 'es' : ''} found:\n\n`;
            matches.forEach((match, i) => {
                result += `Match ${i + 1}: "${match.match}" at index ${match.index}\n`;
                if (match.groups.length) {
                    match.groups.forEach((g, j) => {
                        result += `  Group ${j + 1}: "${g ?? ''}"\n`;
                    });
                }
            });
            output.textContent = result;
            output.classList.remove('d-none');

            // Build highlighted view
            let html = '';
            let last = 0;
            const sortedMatches = [...matches].sort((a, b) => a.index - b.index);
            for (const match of sortedMatches) {
                html += escapeHtml(testStr.slice(last, match.index));
                html += `<span class="regex-match">${escapeHtml(match.match)}</span>`;
                last = match.index + match.match.length;
            }
            html += escapeHtml(testStr.slice(last));
            highlighted.innerHTML = html;
            highlighted.classList.remove('d-none');
        } catch (err) {
            output.textContent = 'Regex error: ' + err.message;
            output.classList.remove('d-none');
            highlighted.classList.add('d-none');
        }
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ─── Text Diff ───────────────────────────────────────────────────
function initTextDiff() {
    document.getElementById('compute-diff').addEventListener('click', () => {
        const a = document.getElementById('diff-input-a').value;
        const b = document.getElementById('diff-input-b').value;
        const output = document.getElementById('diff-output');

        const linesA = a.split('\n');
        const linesB = b.split('\n');

        // Simple LCS-based line diff
        const lcs = lcsLines(linesA, linesB);
        let html = '';
        let ai = 0, bi = 0, li = 0;

        while (ai < linesA.length || bi < linesB.length) {
            if (li < lcs.length && ai < linesA.length && linesA[ai] === lcs[li] && bi < linesB.length && linesB[bi] === lcs[li]) {
                html += `  ${escapeHtml(linesA[ai])}\n`;
                ai++; bi++; li++;
            } else if (bi < linesB.length && (li >= lcs.length || linesB[bi] !== lcs[li])) {
                html += `<span class="diff-added">+ ${escapeHtml(linesB[bi])}</span>\n`;
                bi++;
            } else if (ai < linesA.length && (li >= lcs.length || linesA[ai] !== lcs[li])) {
                html += `<span class="diff-removed">- ${escapeHtml(linesA[ai])}</span>\n`;
                ai++;
            }
        }

        output.innerHTML = html || '(no differences)';
        output.classList.remove('d-none');
    });
}

function lcsLines(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);
        }
    }
    const result = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
        if (a[i-1] === b[j-1]) { result.unshift(a[i-1]); i--; j--; }
        else if (dp[i-1][j] > dp[i][j-1]) i--;
        else j--;
    }
    return result;
}

// ─── Color Converter ─────────────────────────────────────────────
function initColorConverter() {
    const inputEl = document.getElementById('color-input');
    const picker = document.getElementById('color-picker');
    const output = document.getElementById('color-output');
    const swatch = document.getElementById('color-swatch');

    picker.addEventListener('input', () => { inputEl.value = picker.value; });

    document.getElementById('convert-color').addEventListener('click', () => {
        const raw = inputEl.value.trim();
        if (!raw) return;

        const parsed = parseColor(raw);
        if (!parsed) {
            output.textContent = 'Could not parse color. Try #hex, rgb(...), or hsl(...).';
            output.classList.remove('d-none');
            swatch.classList.add('d-none');
            return;
        }

        const { r, g, b, a } = parsed;
        const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
        const hsl = rgbToHsl(r, g, b);

        swatch.style.backgroundColor = a < 1 ? `rgba(${r},${g},${b},${a})` : hex;
        swatch.classList.remove('d-none');

        picker.value = hex;

        output.innerHTML =
`<strong>HEX:</strong>  ${hex}${a < 1 ? padHex(Math.round(a * 255)) : ''}
<strong>RGB:</strong>  rgb(${r}, ${g}, ${b})${a < 1 ? `\n<strong>RGBA:</strong> rgba(${r}, ${g}, ${b}, ${a})` : ''}
<strong>HSL:</strong>  hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)${a < 1 ? `\n<strong>HSLA:</strong> hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${a})` : ''}`;
        showOutput(output);
        output.closest('.output-wrap')?.querySelector('.copy-btn')?.classList.remove('d-none');
    });
}

function padHex(n) { return n.toString(16).padStart(2, '0'); }

function parseColor(str) {
    // hex
    let m = str.match(/^#?([0-9a-f]{3,8})$/i);
    if (m) {
        let hex = m[1];
        if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
        if (hex.length === 4) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2]+hex[3]+hex[3];
        const r = parseInt(hex.slice(0,2), 16);
        const g = parseInt(hex.slice(2,4), 16);
        const b = parseInt(hex.slice(4,6), 16);
        const a = hex.length === 8 ? parseInt(hex.slice(6,8), 16) / 255 : 1;
        return { r, g, b, a: Math.round(a * 100) / 100 };
    }
    // rgb/rgba
    m = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/i);
    if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 };
    // hsl/hsla
    m = str.match(/hsla?\(\s*(\d+)\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*(?:,\s*([\d.]+))?\s*\)/i);
    if (m) {
        const { r, g, b } = hslToRgb(+m[1], +m[2], +m[3]);
        return { r, g, b, a: m[4] !== undefined ? +m[4] : 1 };
    }
    // try browser parsing
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.fillStyle = str;
    const computed = ctx.fillStyle;
    if (computed.startsWith('#')) return parseColor(computed);
    m = computed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
    if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 };
    return null;
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToRgb(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    let r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

// ─── Number Base Converter ───────────────────────────────────────
function initNumberBaseConverter() {
    const inputEl = document.getElementById('numbase-input');
    const output = document.getElementById('numbase-output');

    function convert() {
        const raw = inputEl.value.trim();
        if (!raw) return;
        const fromBase = parseInt(document.getElementById('numbase-from').value, 10);

        try {
            const num = parseInt(raw, fromBase);
            if (isNaN(num)) throw new Error('Invalid number for the selected base');

            output.innerHTML =
`<strong>Decimal:</strong>      ${num.toString(10)}
<strong>Binary:</strong>       ${num.toString(2)}
<strong>Octal:</strong>        ${num.toString(8)}
<strong>Hexadecimal:</strong>  ${num.toString(16).toUpperCase()}`;
            showOutput(output);
            output.closest('.output-wrap')?.querySelector('.copy-btn')?.classList.remove('d-none');
        } catch (err) {
            output.textContent = 'Error: ' + err.message;
            output.classList.remove('d-none');
        }
    }

    document.getElementById('convert-numbase').addEventListener('click', convert);
    inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') convert(); });
    inputEl.addEventListener('input', convert);
}

// ─── Bootstrap ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initCopyButtons();
    initTimestampConverter();
    initTimeSinceCalculator();
    initJwtDecoder();
    initBase64Tool();
    initUrlTool();
    initHtmlEntityTool();
    initHashGenerator();
    initUuidGenerator();
    initLoremIpsum();
    initJsonFormatter();
    initRegexTester();
    initTextDiff();
    initColorConverter();
    initNumberBaseConverter();
});
