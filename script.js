// Helper function to create a crypto subtle hash
async function createHash(algorithm, message) {
    // Convert the message string to an ArrayBuffer
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    
    // Hash the message
    const hashBuffer = await crypto.subtle.digest(algorithm, data);
    
    // Convert the hash to a hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
}

// Helper function to generate a UUID v4
function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

// Helper function to generate a UUID v1-like (time-based with random node)
function uuidv1() {
    const now = new Date().getTime();
    const uuid = 'xxxxxxxx-xxxx-1xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = (now + Math.random()*16)%16 | 0;
        return (c === 'x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
}

// Initialize the page when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    initTabs();
    initTimestampConverter();
    initTimeSinceCalculator();
    initJwtDecoder();
    initBase64Tool();
    initUrlTool();
    initHtmlEntityTool();
    initHashGenerator();
    initUuidGenerator();
});

// Initialize tab switching
function initTabs() {
    document.querySelectorAll('.nav-link').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('show', 'active');
            });
            
            document.querySelectorAll('.nav-link').forEach(t => {
                t.classList.remove('active');
            });
            
            const target = this.getAttribute('data-bs-target');
            document.querySelector(target).classList.add('show', 'active');
            this.classList.add('active');
        });
    });
}

// Initialize Timestamp Converter
function initTimestampConverter() {
    document.getElementById('convert-timestamp').addEventListener('click', () => {
        const timestamp = document.getElementById('timestamp-input').value;
        const output = document.getElementById('timestamp-output');
        
        if (!timestamp) {
            output.textContent = 'Please enter a timestamp.';
            output.classList.remove('d-none');
            return;
        }
        
        try {
            const date = new Date(parseInt(timestamp) * 1000);
            if (isNaN(date.getTime())) {
                throw new Error('Invalid timestamp');
            }
            
            output.innerHTML = `
<strong>UTC Time:</strong> ${date.toUTCString()}
<strong>Local Time:</strong> ${date.toString()}
<strong>ISO Format:</strong> ${date.toISOString()}
            `;
            output.classList.remove('d-none');
        } catch (error) {
            output.textContent = `Error: ${error.message}`;
            output.classList.remove('d-none');
        }
    });
    
    document.getElementById('current-timestamp').addEventListener('click', () => {
        const now = Math.floor(Date.now() / 1000);
        document.getElementById('timestamp-input').value = now;
        document.getElementById('convert-timestamp').click();
    });
}

// Initialize Time Since Calculator
function initTimeSinceCalculator() {
    document.getElementById('calculate-time-since').addEventListener('click', () => {
        const inputDate = document.getElementById('time-since-input').value;
        const output = document.getElementById('time-since-output');
        
        if (!inputDate) {
            output.textContent = 'Please select a date and time.';
            output.classList.remove('d-none');
            return;
        }
        
        try {
            const selectedDate = new Date(inputDate);
            const now = new Date();
            
            const diffMs = now - selectedDate;
            
            if (diffMs < 0) {
                output.textContent = 'The selected date is in the future.';
                output.classList.remove('d-none');
                return;
            }
            
            // Calculate differences
            const seconds = Math.floor(diffMs / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            // Calculate months and years more accurately
            let years = now.getFullYear() - selectedDate.getFullYear();
            let months = now.getMonth() - selectedDate.getMonth();
            
            // Adjust for day of month
            if (now.getDate() < selectedDate.getDate()) {
                months--;
            }
            
            // Handle negative months
            if (months < 0) {
                years--;
                months += 12;
            }
            
            // Calculate remaining time
            const remainingDays = days - (years * 365 + months * 30); // Approximation
            const remainingHours = hours % 24;
            const remainingMinutes = minutes % 60;
            const remainingSeconds = seconds % 60;
            
            output.innerHTML = `
<div class="row">
    <div class="col-md-6">
        <h6 class="text-secondary">Elapsed Time</h6>
        <p>
            ${years} years, ${months} months, ${remainingDays} days<br>
            ${days} total days<br>
            ${hours} total hours<br>
            ${minutes} total minutes<br>
            ${seconds} total seconds
        </p>
    </div>
    <div class="col-md-6">
        <h6 class="text-secondary">Precise Time</h6>
        <p>${years} years, ${months} months, ${remainingDays} days, ${remainingHours} hours, ${remainingMinutes} minutes, ${remainingSeconds} seconds</p>
    </div>
</div>
            `;
            output.classList.remove('d-none');
        } catch (error) {
            output.textContent = `Error: ${error.message}`;
            output.classList.remove('d-none');
        }
    });
    
    // Set default date/time value for time-since calculator
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    document.getElementById('time-since-input').value = `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Initialize JWT Decoder
function initJwtDecoder() {
    document.getElementById('decode-jwt').addEventListener('click', () => {
        const jwtToken = document.getElementById('jwt-input').value.trim();
        const headerOutput = document.getElementById('jwt-header-output');
        const payloadOutput = document.getElementById('jwt-payload-output');
        const errorOutput = document.getElementById('jwt-error');
        
        // Reset outputs
        headerOutput.textContent = '';
        headerOutput.classList.add('d-none');
        payloadOutput.textContent = '';
        payloadOutput.classList.add('d-none');
        errorOutput.classList.add('d-none');
        
        if (!jwtToken) {
            errorOutput.textContent = 'Please enter a JWT token.';
            errorOutput.classList.remove('d-none');
            return;
        }
        
        try {
            const parts = jwtToken.split('.');
            if (parts.length !== 3) {
                throw new Error('Invalid JWT format. Expected 3 parts separated by dots.');
            }
            
            const headerB64 = parts[0];
            const payloadB64 = parts[1];
            
            const decodeBase64 = (str) => {
                // Replace characters for URL-safe base64
                const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
                // Add padding if needed
                const padding = '='.repeat((4 - (base64.length % 4)) % 4);
                
                // Decode and convert to string
                return JSON.parse(atob(base64 + padding));
            };
            
            const header = decodeBase64(headerB64);
            const payload = decodeBase64(payloadB64);
            
            headerOutput.textContent = JSON.stringify(header, null, 2);
            headerOutput.classList.remove('d-none');
            payloadOutput.textContent = JSON.stringify(payload, null, 2);
            payloadOutput.classList.remove('d-none');
            
            // Check for expiration
            if (payload.exp) {
                const expDate = new Date(payload.exp * 1000);
                const now = new Date();
                
                if (expDate < now) {
                    errorOutput.textContent = `Note: This token expired on ${expDate.toLocaleString()}`;
                    errorOutput.classList.remove('d-none');
                }
            }
        } catch (error) {
            errorOutput.textContent = `Error: ${error.message}`;
            errorOutput.classList.remove('d-none');
        }
    });
}

// Initialize Base64 Encoder/Decoder
function initBase64Tool() {
    document.getElementById('encode-base64').addEventListener('click', () => {
        const input = document.getElementById('base64-input').value;
        const output = document.getElementById('base64-output');
        const errorOutput = document.getElementById('base64-error');
        
        // Reset error
        errorOutput.classList.add('d-none');
        
        if (!input) {
            errorOutput.textContent = 'Please enter text to encode.';
            errorOutput.classList.remove('d-none');
            return;
        }
        
        try {
            const encoded = btoa(input);
            output.textContent = encoded;
            output.classList.remove('d-none');
        } catch (error) {
            errorOutput.textContent = `Error encoding to Base64: ${error.message}`;
            errorOutput.classList.remove('d-none');
        }
    });
    
    document.getElementById('decode-base64').addEventListener('click', () => {
        const input = document.getElementById('base64-input').value.trim();
        const output = document.getElementById('base64-output');
        const errorOutput = document.getElementById('base64-error');
        
        // Reset error
        errorOutput.classList.add('d-none');
        
        if (!input) {
            errorOutput.textContent = 'Please enter base64 to decode.';
            errorOutput.classList.remove('d-none');
            return;
        }
        
        try {
            const decoded = atob(input);
            output.textContent = decoded;
            output.classList.remove('d-none');
        } catch (error) {
            errorOutput.textContent = `Error decoding from Base64: ${error.message}. Make sure the input is valid Base64.`;
            errorOutput.classList.remove('d-none');
        }
    });
}

// Initialize URL Encoder/Decoder
function initUrlTool() {
    document.getElementById('encode-url').addEventListener('click', () => {
        const input = document.getElementById('url-input').value;
        const output = document.getElementById('url-output');
        const errorOutput = document.getElementById('url-error');
        
        // Reset error
        errorOutput.classList.add('d-none');
        
        if (!input) {
            errorOutput.textContent = 'Please enter text to encode.';
            errorOutput.classList.remove('d-none');
            return;
        }
        
        try {
            const encoded = encodeURIComponent(input);
            output.textContent = encoded;
            output.classList.remove('d-none');
        } catch (error) {
            errorOutput.textContent = `Error encoding URL: ${error.message}`;
            errorOutput.classList.remove('d-none');
        }
    });
    
    document.getElementById('decode-url').addEventListener('click', () => {
        const input = document.getElementById('url-input').value.trim();
        const output = document.getElementById('url-output');
        const errorOutput = document.getElementById('url-error');
        
        // Reset error
        errorOutput.classList.add('d-none');
        
        if (!input) {
            errorOutput.textContent = 'Please enter URL encoded text to decode.';
            errorOutput.classList.remove('d-none');
            return;
        }
        
        try {
            const decoded = decodeURIComponent(input);
            output.textContent = decoded;
            output.classList.remove('d-none');
        } catch (error) {
            errorOutput.textContent = `Error decoding URL: ${error.message}. Make sure the input is valid URL encoded text.`;
            errorOutput.classList.remove('d-none');
        }
    });
}

// Initialize HTML Entity Encoder/Decoder
function initHtmlEntityTool() {
    document.getElementById('encode-html-entity').addEventListener('click', () => {
        const input = document.getElementById('html-entity-input').value;
        const output = document.getElementById('html-entity-output');
        const errorOutput = document.getElementById('html-entity-error');
        
        // Reset error
        errorOutput.classList.add('d-none');
        
        if (!input) {
            errorOutput.textContent = 'Please enter text to encode.';
            errorOutput.classList.remove('d-none');
            return;
        }
        
        try {
            // Create a textarea element to use the browser's built-in HTML escaping
            const textarea = document.createElement('textarea');
            textarea.textContent = input;
            const encoded = textarea.innerHTML;
            
            output.textContent = encoded;
            output.classList.remove('d-none');
        } catch (error) {
            errorOutput.textContent = `Error encoding HTML entities: ${error.message}`;
            errorOutput.classList.remove('d-none');
        }
    });
    
    document.getElementById('decode-html-entity').addEventListener('click', () => {
        const input = document.getElementById('html-entity-input').value.trim();
        const output = document.getElementById('html-entity-output');
        const errorOutput = document.getElementById('html-entity-error');
        
        // Reset error
        errorOutput.classList.add('d-none');
        
        if (!input) {
            errorOutput.textContent = 'Please enter text with HTML entities to decode.';
            errorOutput.classList.remove('d-none');
            return;
        }
        
        try {
            // Create a div element to decode HTML entities
            const div = document.createElement('div');
            div.innerHTML = input;
            const decoded = div.textContent;
            
            output.textContent = decoded;
            output.classList.remove('d-none');
        } catch (error) {
            errorOutput.textContent = `Error decoding HTML entities: ${error.message}`;
            errorOutput.classList.remove('d-none');
        }
    });
}

// Initialize Hash Generator
function initHashGenerator() {
    document.getElementById('generate-hash').addEventListener('click', async () => {
        const input = document.getElementById('hash-input').value;
        const output = document.getElementById('hash-output');
        const errorOutput = document.getElementById('hash-error');
        const hashType = document.querySelector('input[name="hashType"]:checked').value;
        
        // Reset error
        errorOutput.classList.add('d-none');
        
        if (!input) {
            errorOutput.textContent = 'Please enter text to hash.';
            errorOutput.classList.remove('d-none');
            return;
        }
        
        try {
            let algorithm;
            switch (hashType) {
                case 'MD5':
                    // MD5 is not natively supported in Web Crypto API, so we display a note
                    errorOutput.textContent = 'Note: MD5 is not securely implemented in browsers. For security-sensitive applications, please use SHA-256 or SHA-512.';
                    errorOutput.classList.remove('d-none');
                    
                    // Simple MD5 implementation for demonstration (not cryptographically secure)
                    // In a real app, you would use a proper library
                    output.textContent = 'MD5 is not implemented in this demo for security reasons. Please use SHA-256 or SHA-512.';
                    output.classList.remove('d-none');
                    return;
                case 'SHA-1':
                    algorithm = 'SHA-1';
                    break;
                case 'SHA-256':
                    algorithm = 'SHA-256';
                    break;
                case 'SHA-512':
                    algorithm = 'SHA-512';
                    break;
                default:
                    algorithm = 'SHA-256';
            }
            
            const hashHex = await createHash(algorithm, input);
            
            output.textContent = hashHex;
            output.classList.remove('d-none');
        } catch (error) {
            errorOutput.textContent = `Error generating hash: ${error.message}`;
            errorOutput.classList.remove('d-none');
        }
    });
}

// Initialize UUID Generator
function initUuidGenerator() {
    document.getElementById('generate-uuid').addEventListener('click', () => {
        const output = document.getElementById('uuid-output');
        const uuidVersion = document.querySelector('input[name="uuidVersion"]:checked').value;
        const upperCase = document.getElementById('upperCase').checked;
        const noDashes = document.getElementById('noDashes').checked;
        
        try {
            let uuid = uuidVersion === 'v4' ? uuidv4() : uuidv1();
            
            if (upperCase) {
                uuid = uuid.toUpperCase();
            }
            
            if (noDashes) {
                uuid = uuid.replace(/-/g, '');
            }
            
            output.textContent = uuid;
            output.classList.remove('d-none');
        } catch (error) {
            output.textContent = `Error generating UUID: ${error.message}`;
            output.classList.remove('d-none');
        }
    });
    
    document.getElementById('generate-multiple-uuid').addEventListener('click', () => {
        const output = document.getElementById('uuid-output');
        const uuidVersion = document.querySelector('input[name="uuidVersion"]:checked').value;
        const upperCase = document.getElementById('upperCase').checked;
        const noDashes = document.getElementById('noDashes').checked;
        
        try {
            let uuids = [];
            
            for (let i = 0; i < 10; i++) {
                let uuid = uuidVersion === 'v4' ? uuidv4() : uuidv1();
                
                if (upperCase) {
                    uuid = uuid.toUpperCase();
                }
                
                if (noDashes) {
                    uuid = uuid.replace(/-/g, '');
                }
                
                uuids.push(uuid);
            }
            
            output.textContent = uuids.join('\n');
            output.classList.remove('d-none');
        } catch (error) {
            output.textContent = `Error generating UUIDs: ${error.message}`;
            output.classList.remove('d-none');
        }
    });
}