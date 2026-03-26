// student.js — all student portal logic

// ── Helper: resolve document URL (Cloudinary URL or local fallback) ──
function getStudentDocUrl(doc) {
    if (!doc) return '#';
    let url = doc.url;
    if (!url) {
        url = `${window.location.host.includes('localhost') || window.location.host.includes('127.0.0.1') ? 'http' : 'https'}://${window.location.host}/uploads/${doc.filename}`;
    }
    // Force HTTPS for Cloudinary URLs
    if (url && url.includes('cloudinary.com')) {
        url = url.replace('http://', 'https://');
    }
    return url;
}

// ── Animated Counter ────────────────────────────────────────────────
function animateCounter(elementId, target) {
    const el = document.getElementById(elementId);
    if (!el) return;
    target = Number(target) || 0;
    if (target === 0) { el.textContent = '0'; return; }
    const duration = 800;
    const startTime = performance.now();
    function tick(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        el.textContent = Math.round(eased * target);
        if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

// ── Document Preview Modal (shared with admin) ──────────────────────
function previewDocument(url, mimeType, docLabel) {
    closePreview();

    // If mimeType is missing, try to infer from extension
    if (!mimeType) {
        const ext = url.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) mimeType = 'image/jpeg';
        else if (ext === 'pdf') mimeType = 'application/pdf';
    }

    const isImage = mimeType && mimeType.startsWith('image/');
    const isPdf = mimeType === 'application/pdf';

    let contentHtml;
    if (isImage) {
        contentHtml = `<div style="text-align:center;"><img src="${url}" alt="${docLabel || 'Document'}" style="max-width:100%; max-height:75vh; border-radius:10px; object-fit:contain; box-shadow: 0 10px 30px rgba(0,0,0,0.4);" onerror="this.parentElement.innerHTML='<p class=\'text-muted\'>Failed to load image. Try opening in a new tab.</p>'"/></div>`;
    } else if (isPdf) {
        if (!url.includes('localhost') && !url.includes('127.0.0.1') && url.includes('cloudinary.com')) {
            // Cloudinary PDF: Render first page as JPG image to avoid security/iframe blocks
            let previewUrl = url;
            if (previewUrl.endsWith('.pdf')) {
                previewUrl = previewUrl.replace(/\.pdf$/, '.jpg');
            } else if (!previewUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
                previewUrl += '.jpg';
            }
            contentHtml = `<div style="text-align:center; position:relative;">
                <img src="${previewUrl}" alt="${docLabel || 'PDF Preview'}" style="max-width:100%; max-height:75vh; border-radius:10px; object-fit:contain; box-shadow: 0 10px 30px rgba(0,0,0,0.4);" onerror="this.parentElement.innerHTML='<p class=\'text-muted\'>Failed to load PDF preview. Try opening in a new tab.</p>'"/>
                <div class="text-xs text-muted" style="position:absolute; bottom:-25px; left:0; right:0; text-align:center;">
                    Showing 1st page preview. <a href="${url}" target="_blank" style="color:#4f46e5; text-decoration:underline;">Click to view full PDF</a>.
                </div>
            </div>`;
        } else {
            // Localhost PDF: Native iframe
            contentHtml = `
                <div style="width:100%; height:75vh; position:relative;">
                    <iframe src="${url}" style="width:100%; height:100%; border:none; border-radius:10px; background:#fff;" type="application/pdf"></iframe>
                    <div class="text-xs text-muted" style="position:absolute; bottom:-25px; left:0; right:0; text-align:center;">
                        Note: If nothing shows, it might be a download-only file. <a href="${url}" target="_blank" style="color:#4f46e5; text-decoration:underline;">Click here to open directly</a>.
                    </div>
                </div>
            `;
        }
    } else {
        contentHtml = `
            <div class="empty-state">
                <div class="empty-icon">📄</div>
                <p>Preview not available for this file type.</p>
                <p class="text-sm">Please use the button below to open it.</p>
            </div>
        `;
    }

    const modal = document.createElement('div');
    modal.id = 'preview-modal';
    modal.className = 'preview-modal';
    modal.innerHTML = `
        <div class="preview-overlay" onclick="closePreview()"></div>
        <div class="preview-container">
            <div class="preview-header">
                <span class="preview-title">${docLabel || 'Document Preview'}</span>
                <button class="preview-close-btn" onclick="closePreview()" title="Close">✕</button>
            </div>
            <div class="preview-body">
                ${contentHtml}
            </div>
            <div class="preview-footer">
                <a href="${url}" target="_blank" class="btn btn-outline btn-sm" style="font-size:0.8rem;">
                    Open in New Tab ↗
                </a>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => modal.classList.add('active'));
}

function closePreview() {
    const modal = document.getElementById('preview-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 200);
        document.body.style.overflow = '';
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePreview();
});

async function loadStudentDashboard() {
    try {
        const [profileRes, loansRes] = await Promise.all([
            api.get('/student/profile').catch(() => ({ data: null })),
            api.get('/student/loans').catch(() => ({ data: [] }))
        ]);

        const profile = profileRes.data;
        const loans = loansRes.data || [];

        document.getElementById('loading').style.display = 'none';
        document.getElementById('dashboard-content').style.display = 'block';

        // Credit score widget — Chart.js doughnut ring
        if (profile) {
            const score = profile.creditScore || 0;
            const pct = Math.min((score / 900) * 100, 100);
            const riskColors = { low: '#10b981', medium: '#f59e0b', high: '#ef4444' };
            const riskColor = riskColors[profile.riskCategory] || '#7c5cfc';

            // Center text
            document.getElementById('score-center-text').innerHTML = `
                <span style="font-size:1.75rem; font-weight:700; color:${riskColor};">${score}</span>
            `;

            // Chart.js doughnut for credit score
            const scoreCanvas = document.getElementById('credit-score-chart');
            if (scoreCanvas) {
                new Chart(scoreCanvas.getContext('2d'), {
                    type: 'doughnut',
                    data: {
                        datasets: [{
                            data: [pct, 100 - pct],
                            backgroundColor: [riskColor, 'rgba(255,255,255,0.06)'],
                            borderWidth: 0,
                            borderRadius: 6
                        }]
                    },
                    options: {
                        responsive: false,
                        cutout: '78%',
                        plugins: { legend: { display: false }, tooltip: { enabled: false } },
                        animation: { animateRotate: true, duration: 1500, easing: 'easeOutQuart' }
                    }
                });
            }

            document.getElementById('score-info').innerHTML = `
                <span style="display:inline-block; padding:0.25rem 0.75rem; border-radius:9999px; font-size:0.75rem; font-weight:700;
                    background: rgba(255,255,255,0.05); color: ${riskColor}; text-transform:uppercase;">
                    ${profile.riskCategory} RISK
                </span>
                <p class="text-muted text-sm" style="margin-top:0.5rem;">Max Eligible: <strong>${utils.formatCurrency(profile.maxEligibleAmount)}</strong></p>
            `;
        } else {
            document.getElementById('score-widget').style.display = 'none';
            document.getElementById('no-profile-msg').style.display = 'block';
        }

        // Stats
        const activeLoans = loans.filter(l => l.status === 'approved');
        const pendingLoans = loans.filter(l => l.status === 'pending');
        const rejectedLoans = loans.filter(l => l.status === 'rejected');
        document.getElementById('active-loans-count').textContent = activeLoans.length;
        document.getElementById('pending-loans-count').textContent = pendingLoans.length;

        // Loan Status Doughnut Chart (only if there are loans)
        if (loans.length > 0) {
            document.getElementById('loan-chart-card').style.display = 'block';
            const loanCtx = document.getElementById('chart-loan-status');
            if (loanCtx) {
                new Chart(loanCtx.getContext('2d'), {
                    type: 'doughnut',
                    data: {
                        labels: ['Approved', 'Pending', 'Rejected'],
                        datasets: [{
                            data: [activeLoans.length, pendingLoans.length, rejectedLoans.length],
                            backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                            hoverBackgroundColor: ['#34d399', '#fbbf24', '#f87171'],
                            borderColor: 'transparent',
                            borderWidth: 0,
                            hoverOffset: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        cutout: '60%',
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: { color: '#94a3b8', padding: 16, font: { family: "'Inter', sans-serif", size: 11, weight: '600' }, usePointStyle: true, pointStyle: 'circle', boxWidth: 8, boxHeight: 8 }
                            },
                            tooltip: {
                                backgroundColor: '#1e1e2e', titleColor: '#e2e8f0', bodyColor: '#94a3b8',
                                borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, cornerRadius: 8, padding: 10
                            }
                        },
                        animation: { animateRotate: true, animateScale: true, duration: 1000, easing: 'easeOutQuart' }
                    }
                });
            }
        }

        // Recent loans table
        const container = document.getElementById('loans-table-container');
        if (loans.length === 0) {
            container.innerHTML = '<p class="text-muted text-center" style="padding:2rem 0;">No loan applications yet.</p>';
        } else {
            container.innerHTML = `
                <table>
                    <thead><tr><th>Type</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
                    <tbody>
                        ${loans.slice(0, 5).map(l => `
                            <tr>
                                <td style="text-transform:capitalize;">${l.loanType}</td>
                                <td>${utils.formatCurrency(l.principalAmount)}</td>
                                <td><span class="badge badge-${l.status === 'approved' ? 'success' : l.status === 'rejected' ? 'danger' : 'warning'}">${l.status}</span></td>
                                <td class="text-muted text-sm">${utils.formatDate(l.createdAt)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
    } catch (err) {
        document.getElementById('loading').textContent = 'Failed to load dashboard.';
        console.error(err);
    }
}

// ===================== CREDIT PROFILE =====================

// Study scores state
let studyScoresData = [];
let profileUserId = null;

const LEVEL_LABELS = {
    '10th': '10th Standard', '12th': '12th Standard / PUC',
    'diploma': 'Diploma', 'ug_sem1': 'UG Sem 1', 'ug_sem2': 'UG Sem 2',
    'ug_sem3': 'UG Sem 3', 'ug_sem4': 'UG Sem 4', 'ug_sem5': 'UG Sem 5',
    'ug_sem6': 'UG Sem 6', 'ug_sem7': 'UG Sem 7', 'ug_sem8': 'UG Sem 8',
    'pg': 'PG / Masters'
};

const LEVEL_OPTIONS = Object.entries(LEVEL_LABELS).map(([v, l]) =>
    `<option value="${v}">${l}</option>`
).join('');

const DOC_TYPES = [
    { key: 'aadhar',                label: '🪪 Aadhar Card (Self)' },
    { key: 'father_aadhar',         label: '🪪 Father\'s Aadhar Card' },
    { key: 'pan',                   label: '💳 PAN Card' },
    { key: 'signature',             label: '✒️ Signature (Plain Paper Photo)' },
    { key: 'photo',                 label: '🖼️ Passport Size Photo' },
    { key: 'income_certificate',    label: '📄 Income Certificate' },
    { key: 'secondary_marks_memo',  label: '📋 State Board Secondary (10th) Marks Memo' },
    { key: 'intermediate_certificate', label: '📜 CBSE / State Board Intermediate (12th) Certificate' },
    { key: 'jee_mains_scorecard',   label: '📊 JEE Mains Score Card (if appeared)' },
    { key: 'jee_advanced_scorecard',label: '📊 JEE Advanced Score Card (if appeared)' }
];

async function loadCreditProfile() {
    const loading = document.getElementById('loading');
    const content = document.getElementById('profile-content');
    const msgDiv = document.getElementById('profile-message');

    try {
        const [profRes, docsRes] = await Promise.all([
            api.get('/student/profile').catch(() => ({ data: null })),
            api.get('/student/profile/documents').catch(() => ({ data: [] }))
        ]);

        const profile = profRes.data;
        const docs = docsRes.data || [];

        if (profile) {
            ['courseName', 'academicScore', 'attendance', 'familyIncome', 'spendingBehaviorScore'].forEach(f => {
                const el = document.getElementById(f);
                if (el && profile[f] !== undefined) el.value = profile[f];
            });
            ['internshipStatus', 'previousLoanHistory'].forEach(f => {
                const el = document.getElementById(f);
                if (el && profile[f]) el.value = profile[f];
            });

            // Load study scores
            studyScoresData = profile.studyScores || [];

            // Load JEE score
            const jee = profile.jeeScore || {};
            if (jee.appeared) {
                const appearedEl = document.getElementById('jee-appeared');
                if (appearedEl) { appearedEl.checked = true; toggleJeeFields(true); }
            }
            if (jee.year)             { const el = document.getElementById('jee-year');              if (el) el.value = jee.year; }
            if (jee.mainsRank)        { const el = document.getElementById('jee-mains-rank');       if (el) el.value = jee.mainsRank; }
            if (jee.mainsPercentile)  { const el = document.getElementById('jee-mains-percentile'); if (el) el.value = jee.mainsPercentile; }
            if (jee.advancedRank)     { const el = document.getElementById('jee-advanced-rank');    if (el) el.value = jee.advancedRank; }
        } else {
            document.getElementById('academicScore').value = 75;
            document.getElementById('attendance').value = 80;
            document.getElementById('familyIncome').value = 300000;
            document.getElementById('spendingBehaviorScore').value = 70;
        }

        loading.style.display = 'none';
        content.style.display = 'block';

        renderScoresTable();
        renderDocumentSlots(docs);
        setupProfileForm();
        setupDocumentUpload();

    } catch (err) {
        loading.textContent = 'Failed to load profile. ' + (err.message || '');
        console.error(err);
    }
}

function setupProfileForm() {
    const form = document.getElementById('profile-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('save-btn');
        const msgDiv = document.getElementById('profile-message');
        msgDiv.style.display = 'none';
        btn.disabled = true;
        btn.textContent = 'Calculating...';

        const body = {
            courseName: document.getElementById('courseName').value,
            academicScore: Number(document.getElementById('academicScore').value),
            attendance: Number(document.getElementById('attendance').value),
            internshipStatus: document.getElementById('internshipStatus').value,
            familyIncome: Number(document.getElementById('familyIncome').value),
            previousLoanHistory: document.getElementById('previousLoanHistory').value,
            spendingBehaviorScore: Number(document.getElementById('spendingBehaviorScore').value),
        };

        try {
            await api.post('/student/profile', body);
            msgDiv.className = 'alert';
            msgDiv.style.cssText = 'display:block; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.2); color:#10b981; padding:1rem; border-radius:0.5rem; margin-bottom:1rem;';
            msgDiv.textContent = '✅ Profile saved! Credit score updated. Now upload your documents in the Documents tab.';
        } catch (err) {
            msgDiv.className = 'alert alert-danger';
            msgDiv.style.display = 'block';
            msgDiv.textContent = err.response?.data?.message || 'Failed to save profile';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save & Calculate Credit Score';
        }
    });
}

// ===================== STUDY SCORES =====================

function renderScoresTable() {
    const container = document.getElementById('scores-container');
    if (!container) return;

    if (studyScoresData.length === 0) {
        container.innerHTML = '<p class="text-muted text-sm" style="padding:1rem 0; text-align:center;">No scores added yet. Click "+ Add Row" to add your academic history.</p>';
        return;
    }

    container.innerHTML = studyScoresData.map((s, i) => `
        <div class="score-row" data-index="${i}">
            <select onchange="updateScore(${i},'level',this.value)">
                ${Object.entries(LEVEL_LABELS).map(([v, l]) =>
                    `<option value="${v}" ${s.level === v ? 'selected' : ''}>${l}</option>`
                ).join('')}
            </select>
            <input type="text" value="${s.institution || ''}" placeholder="Institution" onchange="updateScore(${i},'institution',this.value)" />
            <input type="number" value="${s.year || ''}" placeholder="Year" min="1990" max="2030" onchange="updateScore(${i},'year',Number(this.value))" />
            <input type="number" value="${s.percentage || ''}" placeholder="%" min="0" max="100" onchange="updateScore(${i},'percentage',Number(this.value))" />
            <input type="text" value="${s.remarks || ''}" placeholder="Remarks" onchange="updateScore(${i},'remarks',this.value)" />
            <button class="remove-row-btn" onclick="removeScoreRow(${i})">✕</button>
        </div>
    `).join('');
}

function toggleJeeFields(visible) {
    const el = document.getElementById('jee-fields');
    if (el) el.style.display = visible ? 'block' : 'none';
}

function addScoreRow() {
    studyScoresData.push({ level: '10th', institution: '', year: new Date().getFullYear(), percentage: '', remarks: '' });
    renderScoresTable();
}

function removeScoreRow(index) {
    studyScoresData.splice(index, 1);
    renderScoresTable();
}

function updateScore(index, field, value) {
    studyScoresData[index][field] = value;
}

async function saveStudyScores() {
    const btn = document.getElementById('save-scores-btn');
    const msgDiv = document.getElementById('profile-message');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    msgDiv.style.display = 'none';

    try {
        const profRes = await api.get('/student/profile').catch(() => ({ data: null }));
        const p = profRes.data;
        if (!p) {
            msgDiv.className = 'alert alert-danger';
            msgDiv.style.display = 'block';
            msgDiv.textContent = 'Please fill in "Basic Info" first before saving scores.';
            return;
        }

        // Collect JEE score
        const jeeAppeared = document.getElementById('jee-appeared')?.checked || false;
        const jeeScore = jeeAppeared ? {
            appeared: true,
            year: Number(document.getElementById('jee-year')?.value) || undefined,
            mainsRank: Number(document.getElementById('jee-mains-rank')?.value) || undefined,
            mainsPercentile: Number(document.getElementById('jee-mains-percentile')?.value) || undefined,
            advancedRank: Number(document.getElementById('jee-advanced-rank')?.value) || undefined
        } : { appeared: false };

        await api.post('/student/profile', {
            courseName: p.courseName,
            academicScore: p.academicScore,
            attendance: p.attendance,
            internshipStatus: p.internshipStatus,
            familyIncome: p.familyIncome,
            previousLoanHistory: p.previousLoanHistory,
            spendingBehaviorScore: p.spendingBehaviorScore,
            studyScores: studyScoresData,
            jeeScore
        });

        msgDiv.className = 'alert';
        msgDiv.style.cssText = 'display:block; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.2); color:#10b981; padding:1rem; border-radius:0.5rem; margin-bottom:1rem;';
        msgDiv.textContent = `✅ ${studyScoresData.length} study score(s) and JEE details saved!`;
    } catch (err) {
        msgDiv.className = 'alert alert-danger';
        msgDiv.style.display = 'block';
        msgDiv.textContent = err.response?.data?.message || 'Failed to save scores';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Study Scores';
    }
}

// ===================== DOCUMENTS =====================

let currentUploadDocType = null;

function renderDocumentSlots(existingDocs) {
    const grid = document.getElementById('docs-grid');
    if (!grid) return;

    grid.innerHTML = DOC_TYPES.map(({ key, label }) => {
        const existing = existingDocs.find(d => d.docType === key);
        const statusBadge = existing
            ? `<span class="badge badge-${existing.status}" style="font-size:0.625rem; padding:0.2rem 0.5rem;">${existing.status.toUpperCase()}</span>`
            : `<span class="badge" style="font-size:0.625rem; padding:0.2rem 0.5rem; background:rgba(255,255,255,0.05); color:var(--text-muted);">NOT UPLOADED</span>`;
        const filename = existing ? `<div class="file-info">📎 ${existing.originalName || existing.filename}</div>` : '';
        const adminNote = existing?.adminNote ? `<div class="file-info" style="color:var(--danger);">Note: ${existing.adminNote}</div>` : '';

        // Preview button for uploaded docs
        let previewBtn = '';
        if (existing) {
            const docUrl = getStudentDocUrl(existing);
            const escapedLabel = label.replace(/'/g, "\\'");
            previewBtn = `<button onclick="previewDocument('${docUrl}', '${existing.mimeType || ''}', '${escapedLabel}')" class="doc-preview-btn" style="margin-top:0.25rem;">👁 Preview</button>`;
        }

        return `
            <div class="doc-slot" id="slot-${key}">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h4>${label}</h4>
                    ${statusBadge}
                </div>
                ${filename}
                ${adminNote}
                <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
                    <label class="doc-upload-btn" onclick="triggerUpload('${key}')">
                        ${existing ? '↑ Re-upload' : '↑ Upload'}
                    </label>
                    ${previewBtn}
                </div>
                <div id="upload-progress-${key}" style="display:none; font-size:0.75rem; color:var(--text-muted);">Uploading...</div>
            </div>
        `;
    }).join('');
}

function triggerUpload(docType) {
    currentUploadDocType = docType;
    const input = document.getElementById('file-input');
    input.value = '';
    input.click();
}

function setupDocumentUpload() {
    const input = document.getElementById('file-input');
    if (!input) return;

    input.addEventListener('change', async () => {
        if (!input.files || !input.files[0] || !currentUploadDocType) return;

        const file = input.files[0];
        const progress = document.getElementById(`upload-progress-${currentUploadDocType}`);
        if (progress) progress.style.display = 'block';

        const formData = new FormData();
        formData.append('file', file);
        formData.append('docType', currentUploadDocType);

        try {
            await api.post('/student/profile/documents', formData);
            utils.showToast('Document uploaded!', 'success');
            // Refresh document slots
            const docsRes = await api.get('/student/profile/documents');
            renderDocumentSlots(docsRes.data || []);
        } catch (err) {
            utils.showToast(err.response?.data?.message || 'Upload failed', 'error');
        } finally {
            if (progress) progress.style.display = 'none';
            currentUploadDocType = null;
        }
    });
}

// ===================== APPLY PAGE =====================

// Required documents (must match backend REQUIRED_DOCS)
const REQUIRED_DOCS_META = [
    { key: 'aadhar',                   label: 'Aadhar Card (Self)' },
    { key: 'pan',                      label: 'PAN Card' },
    { key: 'photo',                    label: 'Passport Size Photo' },
    { key: 'signature',                label: 'Signature' },
    { key: 'income_certificate',       label: 'Income Certificate' },
    { key: 'secondary_marks_memo',     label: '10th Marks Memo' },
    { key: 'intermediate_certificate', label: '12th / Intermediate Certificate' }
];
const CREDIT_SCORE_THRESHOLD = 600;

async function loadApplyPage() {
    const loading   = document.getElementById('loading');
    const form      = document.getElementById('apply-form');
    const noProfile = document.getElementById('no-profile-warning');
    const msgDiv    = document.getElementById('apply-message');

    try {
        const [profileRes, productsRes, docsRes] = await Promise.all([
            api.get('/student/profile').catch(() => ({ data: null })),
            api.get('/bank/products').catch(() => ({ data: [] })),
            api.get('/student/profile/documents').catch(() => ({ data: [] }))
        ]);

        const profile  = profileRes.data;
        const products = productsRes.data || [];
        const uploadedDocs = docsRes.data || [];

        loading.style.display = 'none';

        if (!profile) {
            noProfile.style.display = 'block';
            return;
        }

        document.getElementById('max-amount').textContent = utils.formatCurrency(profile.maxEligibleAmount);
        document.getElementById('rec-rate').textContent   = `${profile.recommendedInterestRate}%`;
        document.getElementById('credit-score-display').textContent = profile.creditScore;
        document.getElementById('requestedAmount').max    = profile.maxEligibleAmount;

        // ── Pre-flight checks: documents + study scores ──────────────────────
        const uploadedKeys = uploadedDocs.map(d => d.docType);
        const missingDocs = REQUIRED_DOCS_META.filter(d => !uploadedKeys.includes(d.key));
        const hasStudyScores = (profile.studyScores || []).length > 0;

        if (missingDocs.length > 0 || !hasStudyScores) {
            // Build a visual checklist blocker
            const docRows = REQUIRED_DOCS_META.map(d => {
                const uploaded = uploadedKeys.includes(d.key);
                return `<div class="prereq-row ${uploaded ? 'prereq-ok' : 'prereq-missing'}">
                    <span class="prereq-icon">${uploaded ? '✅' : '❌'}</span>
                    <span>${d.label}</span>
                    ${!uploaded ? '<span class="prereq-badge">Missing</span>' : ''}
                </div>`;
            }).join('');

            const scoresRow = `<div class="prereq-row ${hasStudyScores ? 'prereq-ok' : 'prereq-missing'}">
                <span class="prereq-icon">${hasStudyScores ? '✅' : '❌'}</span>
                <span>Study Scores / Academic History</span>
                ${!hasStudyScores ? '<span class="prereq-badge">Missing</span>' : ''}
            </div>`;

            form.insertAdjacentHTML('beforebegin', `
                <div class="prereq-blocker">
                    <div class="prereq-title">⛔ Complete these steps before applying</div>
                    <p class="prereq-subtitle">You must upload all required documents and add your academic history to your Credit Profile before you can submit a loan application.</p>
                    <div class="prereq-list">
                        ${scoresRow}
                        ${docRows}
                    </div>
                    <a href="/student/profile.html" class="btn btn-primary prereq-cta">Go to Credit Profile →</a>
                </div>`);
            // Leave the form hidden — do NOT show it
            return;
        }
        // ─────────────────────────────────────────────────────────────────────

        // ── Low credit score warning banner ─────────────────────────────────
        if (profile.creditScore < CREDIT_SCORE_THRESHOLD) {
            msgDiv.style.cssText = 'display:block; background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.35); color:#fca5a5; padding:1rem; border-radius:0.5rem; margin-bottom:1rem;';
            msgDiv.innerHTML = `
                <strong>⚠️ Low Credit Score Warning</strong><br>
                Your credit score is <strong>${profile.creditScore}</strong>, which is below the minimum required threshold of <strong>${CREDIT_SCORE_THRESHOLD}</strong>.
                Any loan application you submit will be <strong>automatically rejected</strong>.
                Please go to your <a href="/student/profile.html" style="color:#f87171;">Credit Profile</a> and improve your academic score, attendance, and spending behaviour, then reapply.`;
        }
        // ────────────────────────────────────────────────────────────────────

        const productSelect  = document.getElementById('bankProductId');
        const loanTypeSelect = document.getElementById('loanType');

        function fillProducts() {
            const type = loanTypeSelect.value;
            const filtered = products.filter(p => p.loanType === type && p.isActive !== false);
            productSelect.innerHTML = filtered.length === 0
                ? '<option value="">-- No products available for this loan type --</option>'
                : filtered.map(p =>
                    `<option value="${p._id}">
                        ${p.bank?.bankName || 'Bank'} — ${p.name}
                        | Rate: ${p.interestRate}%
                        | ₹${p.minAmount.toLocaleString('en-IN')}–₹${p.maxAmount.toLocaleString('en-IN')}
                        | ${p.minTenureMonths}–${p.maxTenureMonths} months
                    </option>`
                  ).join('');
        }

        loanTypeSelect.addEventListener('change', fillProducts);
        fillProducts();

        form.style.display = 'block';

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('apply-btn');
            btn.disabled = true;
            btn.textContent = 'Submitting...';

            const bankProductId = document.getElementById('bankProductId').value;
            if (!bankProductId) {
                msgDiv.style.cssText = 'display:block; background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.35); color:#fca5a5; padding:1rem; border-radius:0.5rem; margin-bottom:1rem;';
                msgDiv.textContent = 'Please select a bank product to proceed.';
                btn.disabled = false;
                btn.textContent = 'Submit Application';
                return;
            }

            const body = {
                loanType:        document.getElementById('loanType').value,
                requestedAmount: Number(document.getElementById('requestedAmount').value),
                tenureMonths:    Number(document.getElementById('tenureMonths').value),
                bankProductId
            };

            try {
                const res = await api.post('/student/loans/apply', body);
                const result = res.data;

                // ── Auto-rejected response ────────────────────────────────────
                if (result.autoRejected) {
                    msgDiv.style.cssText = 'display:block; background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.35); color:#fca5a5; padding:1rem; border-radius:0.5rem; margin-bottom:1rem;';
                    msgDiv.innerHTML = `<strong>❌ Loan Automatically Rejected</strong><br>${result.rejectionReason}<br><br><a href="/student/loans.html" style="color:#f87171;">View your loan history →</a>`;
                    btn.disabled = false;
                    btn.textContent = 'Submit Application';
                    return;
                }
                // ─────────────────────────────────────────────────────────────

                utils.showToast('Loan application submitted successfully!');
                setTimeout(() => { window.location.href = '/student/loans.html'; }, 1200);
            } catch (err) {
                msgDiv.style.cssText = 'display:block; background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.35); color:#fca5a5; padding:1rem; border-radius:0.5rem; margin-bottom:1rem;';
                msgDiv.textContent = err.response?.data?.message || 'Failed to submit application';
                btn.disabled = false;
                btn.textContent = 'Submit Application';
            }
        });
    } catch (err) {
        loading.textContent = 'Failed to load page. ' + (err.message || '');
        console.error(err);
    }
}

// ===================== MY LOANS =====================

async function loadMyLoans() {
    const loading = document.getElementById('loading');
    const content = document.getElementById('loans-content');

    try {
        const res = await api.get('/student/loans');
        const loans = res.data || [];
        loading.style.display = 'none';

        if (loans.length === 0) {
            content.style.display = 'block';
            content.innerHTML = `
                <div style="text-align:center; padding:3rem 1rem;">
                    <div style="font-size:3rem; margin-bottom:1rem;">📋</div>
                    <p class="text-muted" style="margin-bottom:1.5rem;">No loan applications yet.</p>
                    <a href="/student/apply.html" class="btn btn-primary" style="font-size:0.875rem;">+ Apply for a Loan</a>
                </div>`;
            return;
        }

        content.style.display = 'block';

        // Summary strip stats
        const total    = loans.length;
        const approved = loans.filter(l => l.status === 'approved').length;
        const pending  = loans.filter(l => l.status === 'pending').length;
        const rejected = loans.filter(l => l.status === 'rejected').length;

        animateCounter('ls-total', total);
        animateCounter('ls-approved', approved);
        animateCounter('ls-pending', pending);
        animateCounter('ls-rejected', rejected);
        
        // Render Loan Distribution Chart
        document.getElementById('student-loans-chart-card').style.display = 'block';
        const ctx = document.getElementById('chart-my-loans');
        if (ctx) {
            new Chart(ctx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['Approved', 'Pending', 'Rejected'],
                    datasets: [{
                        data: [approved, pending, rejected],
                        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                        hoverBackgroundColor: ['#34d399', '#fbbf24', '#f87171'],
                        borderColor: 'transparent',
                        borderWidth: 0,
                        hoverOffset: 6
                    }]
                },
                options: {
                    responsive: true,
                    cutout: '65%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#94a3b8', padding: 16, font: { family: "'Inter', sans-serif", size: 11, weight: '600' }, usePointStyle: true, pointStyle: 'circle', boxWidth: 8, boxHeight: 8 }
                        },
                        tooltip: {
                            backgroundColor: '#1e1e2e', titleColor: '#e2e8f0', bodyColor: '#94a3b8',
                            borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, cornerRadius: 8, padding: 10
                        }
                    },
                    animation: { animateRotate: true, animateScale: true, duration: 1000, easing: 'easeOutQuart' }
                }
            });
        }

        document.getElementById('loan-cards').innerHTML = loans.map(renderLoanCard).join('');
    } catch (err) {
        loading.textContent = 'Failed to load loans.';
        console.error(err);
    }
}

function renderLoanCard(loan) {
    const statusConfig = {
        pending:  { color: '#f59e0b', icon: '⏳', label: 'Under Review' },
        approved: { color: '#10b981', icon: '✅', label: 'Approved' },
        rejected: { color: '#ef4444', icon: '❌', label: 'Rejected' }
    };
    const sc = statusConfig[loan.status] || statusConfig.pending;

    // ── 4-step vertical timeline with dates ─────────────────────────────────
    const isRejected = loan.status === 'rejected';

    const tlSteps = [
        {
            icon: '📝',
            label: 'Application Submitted',
            sublabel: 'Your application was received and is under initial review',
            date: loan.createdAt,
            done: true,
            fail: false
        },
        {
            icon: isRejected ? '✖️' : '🏛️',
            label: isRejected ? 'Rejected by Loan Underwriter' : 'Approved by Loan Underwriter (Admin)',
            sublabel: isRejected
                ? 'Admin reviewed and rejected your application'
                : 'Loan underwriter (Admin) reviewed and approved your application',
            date: isRejected ? loan.updatedAt : loan.adminApprovedAt,
            done: loan.status !== 'pending',
            fail: isRejected
        },
        {
            icon: '🏦',
            label: loan.bankVerified ? 'Verified by Bank' : 'Awaiting Bank Verification',
            sublabel: loan.bankVerified
                ? (loan.bank ? loan.bank.bankName + ' completed document verification' : 'Bank completed document verification')
                : 'Bank is reviewing your documents and profile',
            date: loan.bankVerifiedAt,
            done: !!loan.bankVerified,
            fail: false
        },
        {
            icon: '💸',
            label: loan.disbursementStatus === 'disbursed' ? 'Loan Disbursed' : 'Awaiting Disbursal',
            sublabel: loan.disbursementStatus === 'disbursed'
                ? utils.formatCurrency(loan.disbursedAmount || loan.principalAmount) + ' credited to your account'
                : 'Funds will be released after bank verification',
            date: loan.disbursedAt,
            done: loan.disbursementStatus === 'disbursed',
            fail: false
        }
    ];

    const buildTimelineStep = (s, i) => {
        const isLast = i === tlSteps.length - 1;
        const dotBg    = s.done ? (s.fail ? '#ef4444' : '#10b981') : 'rgba(255,255,255,0.04)';
        const dotBord  = s.done ? (s.fail ? '#ef4444' : '#10b981') : 'rgba(255,255,255,0.2)';
        const dotGlow  = s.done ? (s.fail ? 'box-shadow:0 0 10px rgba(239,68,68,0.5);' : 'box-shadow:0 0 10px rgba(16,185,129,0.5);') : '';
        const lblColor = s.done ? (s.fail ? '#fca5a5' : '#e2e8f0') : 'var(--text-muted)';
        const lineGrad = s.done && !s.fail
            ? 'linear-gradient(to bottom,#10b981,rgba(255,255,255,0.08))'
            : s.fail
            ? 'linear-gradient(to bottom,#ef4444,rgba(255,255,255,0.08))'
            : 'rgba(255,255,255,0.08)';
        const dateStr  = s.date
            ? '<span style="font-size:0.72rem;color:var(--text-muted);margin-top:3px;display:block;">📅 ' + utils.formatDate(s.date) + '</span>'
            : '';
        const icon = s.done ? (s.fail ? '✖' : '✓') : s.icon;

        return '<div style="display:flex;gap:0.875rem;">'
            + '<div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;">'
            +   '<div style="width:34px;height:34px;border-radius:50%;border:2px solid ' + dotBord + ';'
            +       'background:' + dotBg + ';display:flex;align-items:center;justify-content:center;'
            +       'font-size:0.9rem;' + dotGlow + 'flex-shrink:0;position:relative;z-index:1;font-weight:700;color:#fff;">'
            +       icon
            +   '</div>'
            +   (!isLast ? '<div style="width:2px;flex:1;min-height:32px;background:' + lineGrad + ';margin:4px 0;"></div>' : '')
            + '</div>'
            + '<div style="padding-bottom:' + (isLast ? '0' : '20px') + ';">'
            +   '<div style="font-size:0.875rem;font-weight:600;color:' + lblColor + ';line-height:1.3;">' + s.label + '</div>'
            +   '<div style="font-size:0.775rem;color:var(--text-muted);margin-top:2px;">' + s.sublabel + '</div>'
            +   dateStr
            + '</div>'
            + '</div>';
    };

    const timeline = '<div style="margin:1rem 0 0.5rem;padding:1rem 1.25rem;background:rgba(0,0,0,0.15);border:1px solid rgba(255,255,255,0.07);border-radius:0.75rem;">'
        + '<div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:0.875rem;">📍 Loan Journey</div>'
        + tlSteps.map(buildTimelineStep).join('')
        + '</div>';

    const rejectionNote = loan.status === 'rejected' && loan.adminDecisionNote
        ? `<div class="loan-rejection-note">💬 ${loan.adminDecisionNote}</div>`
        : '';

    const disbursalInfo = loan.disbursementStatus === 'disbursed'
        ? `<div class="loan-disbursal-info">💸 Disbursed: <strong>${utils.formatCurrency(loan.disbursedAmount || loan.principalAmount)}</strong> on ${utils.formatDate(loan.disbursedAt)}</div>`
        : '';



    return `
        <div class="loan-card" id="lcard-${loan._id}">
            <div class="loan-card-header">
                <div>
                    <span class="loan-type-badge">${loan.loanType.charAt(0).toUpperCase() + loan.loanType.slice(1)} Loan</span>
                    <span class="loan-amount">${utils.formatCurrency(loan.principalAmount)}</span>
                </div>
                <span class="loan-status-pill" style="background:${sc.color}22; color:${sc.color}; border:1px solid ${sc.color}55;">
                    ${sc.icon} ${sc.label}
                </span>
            </div>
            <div class="loan-card-meta">
                <span>📊 Rate: <strong>${loan.interestRate}%</strong></span>
                <span>📅 Tenure: <strong>${loan.tenureMonths} months</strong></span>
                <span>🏦 Bank: <strong>${loan.bank?.bankName || '—'}</strong></span>
                <span>🗓 Applied: <strong>${utils.formatDate(loan.createdAt)}</strong></span>
            </div>
            ${timeline}
            ${rejectionNote}
            ${disbursalInfo}
        </div>`;
}

