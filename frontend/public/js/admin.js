// admin.js — all admin portal logic

// ── Helper: resolve document URL (Cloudinary URL or local fallback) ──
function getDocUrl(doc) {
    if (!doc) return '#';
    let url = doc.url;
    if (!url) {
        url = `${window.location.host.includes('localhost') || window.location.host.includes('127.0.0.1') ? 'http' : 'https'}://${window.location.host}/uploads/${doc.filename}`;
    }
    if (url && url.includes('cloudinary.com')) {
        url = url.replace('http://', 'https://');
    }
    return url;
}

// ── Document Preview Modal ──────────────────────────────────────────
function previewDocument(url, mimeType, docLabel) {
    closePreview();

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
    // Animate in
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

// Close on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePreview();
});


// ── Dashboard ───────────────────────────────────────────────────────
async function loadAdminDashboard() {
    try {
        const res = await api.get('/admin/reports/summary');
        const data = res.data;

        document.getElementById('loading').style.display = 'none';
        document.getElementById('admin-content').style.display = 'block';

        // Animate stat numbers
        animateCounter('stat-total', data.totalLoans);
        animateCounter('stat-approved', data.approvedLoans);
        animateCounter('stat-pending', data.pendingLoans);
        animateCounter('stat-rejected', data.rejectedLoans);

        // ── Application Status Doughnut Chart ──
        const appCtx = document.getElementById('chart-app-status');
        if (appCtx) {
            new Chart(appCtx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['Approved', 'Pending', 'Rejected'],
                    datasets: [{
                        data: [data.approvedLoans || 0, data.pendingLoans || 0, data.rejectedLoans || 0],
                        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                        hoverBackgroundColor: ['#34d399', '#fbbf24', '#f87171'],
                        borderColor: 'transparent',
                        borderWidth: 0,
                        hoverOffset: 8
                    }]
                },
                options: {
                    responsive: true,
                    cutout: '65%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#94a3b8', padding: 20, font: { family: "'Inter', sans-serif", size: 12, weight: '600' }, usePointStyle: true, pointStyle: 'circle', boxWidth: 8, boxHeight: 8 }
                        },
                        tooltip: {
                            backgroundColor: '#1e1e2e',
                            titleColor: '#e2e8f0',
                            bodyColor: '#94a3b8',
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderWidth: 1,
                            cornerRadius: 8,
                            padding: 12
                        }
                    },
                    animation: { animateRotate: true, animateScale: true, duration: 1200, easing: 'easeOutQuart' }
                },
                plugins: [{
                    id: 'centerText',
                    beforeDraw(chart) {
                        const { ctx, chartArea: { width, height, top } } = chart;
                        ctx.save();
                        ctx.font = "700 1.75rem 'Outfit', sans-serif";
                        ctx.fillStyle = '#e2e8f0';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(data.totalLoans, width / 2 + chart.chartArea.left - chart.chartArea.left + chart.chartArea.left, top + height / 2 - 8);
                        ctx.font = "600 0.65rem 'Inter', sans-serif";
                        ctx.fillStyle = '#64748b';
                        ctx.fillText('TOTAL', width / 2 + chart.chartArea.left - chart.chartArea.left + chart.chartArea.left, top + height / 2 + 16);
                        ctx.restore();
                    }
                }]
            });
        }

        // ── Risk Distribution Doughnut Chart ──
        const riskLow = data.riskDistribution?.low || 0;
        const riskMed = data.riskDistribution?.medium || 0;
        const riskHigh = data.riskDistribution?.high || 0;
        const riskTotal = riskLow + riskMed + riskHigh;

        const riskCtx = document.getElementById('chart-risk');
        if (riskCtx) {
            new Chart(riskCtx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['Low Risk', 'Medium Risk', 'High Risk'],
                    datasets: [{
                        data: [riskLow, riskMed, riskHigh],
                        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                        hoverBackgroundColor: ['#34d399', '#fbbf24', '#f87171'],
                        borderColor: 'transparent',
                        borderWidth: 0,
                        hoverOffset: 8
                    }]
                },
                options: {
                    responsive: true,
                    cutout: '65%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#94a3b8', padding: 20, font: { family: "'Inter', sans-serif", size: 12, weight: '600' }, usePointStyle: true, pointStyle: 'circle', boxWidth: 8, boxHeight: 8 }
                        },
                        tooltip: {
                            backgroundColor: '#1e1e2e',
                            titleColor: '#e2e8f0',
                            bodyColor: '#94a3b8',
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderWidth: 1,
                            cornerRadius: 8,
                            padding: 12
                        }
                    },
                    animation: { animateRotate: true, animateScale: true, duration: 1200, easing: 'easeOutQuart' }
                },
                plugins: [{
                    id: 'centerTextRisk',
                    beforeDraw(chart) {
                        const { ctx, chartArea: { width, height, top, left } } = chart;
                        ctx.save();
                        ctx.font = "700 1.75rem 'Outfit', sans-serif";
                        ctx.fillStyle = '#e2e8f0';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(riskTotal, left + width / 2, top + height / 2 - 8);
                        ctx.font = "600 0.65rem 'Inter', sans-serif";
                        ctx.fillStyle = '#64748b';
                        ctx.fillText('APPLICANTS', left + width / 2, top + height / 2 + 16);
                        ctx.restore();
                    }
                }]
            });
        }

    } catch (err) {
        document.getElementById('loading').textContent = 'Failed to load dashboard.';
        console.error(err);
    }
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

// ----- Applications Page -----
let allLoans = [];
let allBanks = [];

async function loadAdminApplications() {
    try {
        const [loansRes, banksRes] = await Promise.all([
            api.get('/admin/loans'),
            api.get('/admin/banks')
        ]);
        allLoans = loansRes.data || [];
        allBanks = banksRes.data || [];

        document.getElementById('loans-loading').style.display = 'none';
        renderLoansTable();
    } catch (err) {
        document.getElementById('loans-loading').textContent = 'Failed to load applications.';
        console.error(err);
    }
}

function renderLoansTable() {
    const container = document.getElementById('loans-table');
    if (allLoans.length === 0) {
        container.innerHTML = '<p class="text-muted text-center" style="padding:2rem 0;">No applications found.</p>';
        return;
    }

    container.innerHTML = `
        <div class="table-responsive">
        <table>
            <thead>
                <tr>
                    <th>Applicant</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                ${allLoans.map(loan => `
                    <tr>
                        <td>
                            <div style="font-weight:500;">${loan.student?.name || 'N/A'}</div>
                            <div class="text-muted text-sm">${loan.student?.email || ''}</div>
                        </td>
                        <td>
                            <div style="font-weight:500;">${utils.formatCurrency(loan.principalAmount)}</div>
                            <div class="text-muted text-sm" style="text-transform:capitalize;">${loan.loanType} · ${loan.tenureMonths}m</div>
                        </td>
                        <td>
                            <span class="badge badge-${loan.status === 'approved' ? 'success' : loan.status === 'rejected' ? 'danger' : 'warning'}">
                                ${loan.status}
                            </span>
                        </td>
                        <td>
                            <button onclick="openReview('${loan._id}')" class="btn btn-outline btn-sm" style="font-size:0.8rem;">
                                Review
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        </div>
    `;
}

async function openReview(loanId) {
    const loan = allLoans.find(l => l._id === loanId);
    if (!loan) return;

    document.getElementById('review-empty').style.display = 'none';
    const reviewContent = document.getElementById('review-content');
    reviewContent.style.display = 'block';
    reviewContent.innerHTML = '<p class="text-muted text-sm" style="padding:2rem; text-align:center;">Loading review data...</p>';

    // Fetch profile docs (KYC) using the student's userId from the loan
    let profileDocs = [];
    let studyScores = [];
    try {
        const studentId = loan.student?._id || loan.student;
        const profileDocsRes = await api.get(`/student/profile/documents`).catch(() => ({ data: [] }));
        profileDocs = (loan.profile?.documents) || [];
        studyScores = (loan.profile?.studyScores) || [];
    } catch (e) { /* silent */ }

    const allProducts = allBanks.flatMap(b =>
        (b.products || []).map(p => ({ ...p, bankName: b.bankName }))
    ).sort((a, b) => a.interestRate - b.interestRate);

    const profile = loan.profile || {};
    const studentId = String(loan.student?._id || loan.student || '');

    const DOC_LABELS = {
        aadhar: '🪪 Aadhar Card', pan: '💳 PAN Card',
        signature: '✒️ Signature', photo: '🖼️ Passport Photo',
        income_certificate: '📄 Income Certificate',
        father_aadhar: '🪪 Father\'s Aadhar',
        secondary_marks_memo: '📋 10th Marks Memo',
        intermediate_certificate: '📜 12th / Inter Certificate',
        jee_mains_scorecard: '📊 JEE Mains Scorecard',
        jee_advanced_scorecard: '📊 JEE Advanced Scorecard'
    };

    const LEVEL_LABELS = {
        '10th': '10th', '12th': '12th', 'diploma': 'Diploma',
        'ug_sem1':'UG S1','ug_sem2':'UG S2','ug_sem3':'UG S3','ug_sem4':'UG S4',
        'ug_sem5':'UG S5','ug_sem6':'UG S6','ug_sem7':'UG S7','ug_sem8':'UG S8','pg':'PG'
    };

    reviewContent.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem;">
            <h2 style="font-size:1.125rem;">Review Application</h2>
            <button onclick="closeReview()" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:1.25rem;">✕</button>
        </div>

        <div id="review-msg" class="alert" style="display:none;"></div>

        <!-- Profile Stats -->
        <div style="background:rgba(255,255,255,0.03); border-radius:0.5rem; padding:0.875rem; margin-bottom:0.75rem;">
            <h4 class="text-muted text-sm" style="text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.75rem;">Applicant</h4>
            <div class="review-stats-grid">
                <div><span class="text-muted" style="font-size:0.7rem; display:block;">Credit Score</span><strong>${profile.creditScore || 'N/A'}</strong></div>
                <div><span class="text-muted" style="font-size:0.7rem; display:block;">Risk</span>
                    <strong style="color:${profile.riskCategory==='low'?'var(--success)':profile.riskCategory==='high'?'var(--danger)':'var(--warning)'}; text-transform:uppercase;">${profile.riskCategory || 'N/A'}</strong>
                </div>
                <div><span class="text-muted" style="font-size:0.7rem; display:block;">Max Eligible</span><strong style="color:var(--success);">${utils.formatCurrency(profile.maxEligibleAmount||0)}</strong></div>
                <div><span class="text-muted" style="font-size:0.7rem; display:block;">Course</span><strong>${profile.courseName||'N/A'}</strong></div>
                <div><span class="text-muted" style="font-size:0.7rem; display:block;">Family Income</span><strong>${utils.formatCurrency(profile.familyIncome||0)}</strong></div>
                <div><span class="text-muted" style="font-size:0.7rem; display:block;">Academic Score</span><strong>${profile.academicScore||'N/A'}%</strong></div>
            </div>
            ${profile.jeeScore?.appeared ? `
            <div style="margin-top:0.75rem; padding-top:0.75rem; border-top:1px solid rgba(255,255,255,0.06);">
                <p class="text-muted" style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:0.5rem;">JEE Score (${profile.jeeScore.year || '—'})</p>
                <div class="grid gap-2" style="grid-template-columns: repeat(3,1fr); font-size:0.8rem;">
                    <div><span class="text-muted" style="font-size:0.65rem; display:block;">Mains Rank</span><strong>${profile.jeeScore.mainsRank || '—'}</strong></div>
                    <div><span class="text-muted" style="font-size:0.65rem; display:block;">Mains %ile</span><strong>${profile.jeeScore.mainsPercentile || '—'}</strong></div>
                    <div><span class="text-muted" style="font-size:0.65rem; display:block;">Adv. Rank</span><strong>${profile.jeeScore.advancedRank || 'N/A'}</strong></div>
                </div>
            </div>` : ''}
        </div>

        <!-- Study Scores Cross-Check -->
        <div style="background:rgba(255,255,255,0.03); border-radius:0.5rem; padding:0.875rem; margin-bottom:0.75rem;">
            <h4 class="text-muted text-sm" style="text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.75rem;">📊 Declared Study Scores</h4>
            ${studyScores.length === 0
                ? '<p class="text-muted" style="font-size:0.8125rem;">No study scores declared.</p>'
                : `<div class="table-responsive"><table style="font-size:0.8rem;">
                    <thead><tr><th>Level</th><th>Institution</th><th>Year</th><th>%</th><th>Remarks</th></tr></thead>
                    <tbody>
                        ${studyScores.map(s => `
                            <tr>
                                <td style="white-space:nowrap;">${LEVEL_LABELS[s.level]||s.level}</td>
                                <td>${s.institution||'—'}</td>
                                <td>${s.year||'—'}</td>
                                <td style="font-weight:600; color:${(s.percentage||0)>=60?'var(--success)':'var(--warning)'};">${s.percentage||'—'}%</td>
                                <td class="text-muted">${s.remarks||'—'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table></div>`
            }
        </div>

        <!-- KYC Documents with Preview + Verify/Reject -->
        <div style="background:rgba(255,255,255,0.03); border-radius:0.5rem; padding:0.875rem; margin-bottom:0.75rem;">
            <h4 class="text-muted text-sm" style="text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.75rem;">📎 KYC Documents</h4>
            ${profileDocs.length === 0
                ? '<p class="text-muted" style="font-size:0.8125rem;">No KYC documents uploaded yet.</p>'
                : `<div style="display:flex; flex-direction:column; gap:0.625rem;" id="kyc-doc-list">
                    ${profileDocs.map(doc => {
                        const docUrl = getDocUrl(doc);
                        const docLabel = DOC_LABELS[doc.docType] || doc.docType;
                        return `
                        <div style="background:rgba(255,255,255,0.03); border-radius:0.375rem; padding:0.625rem; border:1px solid rgba(255,255,255,0.05);" id="doc-row-${doc._id}">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.375rem;">
                                <span style="font-size:0.8125rem; font-weight:500;">${docLabel}</span>
                                <span class="badge badge-${doc.status==='verified'?'success':doc.status==='rejected'?'danger':'warning'}" id="doc-badge-${doc._id}" style="font-size:0.6rem;">${doc.status.toUpperCase()}</span>
                            </div>
                            <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                                <button onclick="previewDocument('${docUrl}', '${doc.mimeType || ''}', '${docLabel.replace(/'/g, "\\'")}')"
                                    class="doc-preview-btn">
                                    👁 Preview
                                </button>
                                ${doc.status !== 'verified' ? `
                                    <button onclick="verifyDoc('${studentId}','${doc._id}','verified')" style="background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); color:var(--success); border-radius:0.25rem; padding:0.2rem 0.5rem; font-size:0.7rem; cursor:pointer;">✓ Verify</button>
                                ` : ''}
                                ${doc.status !== 'rejected' ? `
                                    <button onclick="verifyDoc('${studentId}','${doc._id}','rejected')" style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); color:var(--danger); border-radius:0.25rem; padding:0.2rem 0.5rem; font-size:0.7rem; cursor:pointer;">✗ Reject</button>
                                ` : ''}
                            </div>
                            ${doc.adminNote ? `<div style="font-size:0.7rem; color:var(--danger); margin-top:0.25rem;">Note: ${doc.adminNote}</div>` : ''}
                        </div>
                    `;}).join('')}
                </div>`
            }
        </div>

        <!-- Loan Decision -->
        ${loan.status === 'pending' ? `
        <div style="background:rgba(255,255,255,0.03); border-radius:0.5rem; padding:0.875rem;">
            <h4 class="text-muted text-sm" style="text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.75rem;">Decision</h4>
            
            <div style="background:rgba(16,185,129,0.05); border:1px solid rgba(16,185,129,0.2); border-radius:0.5rem; padding:0.75rem; margin-bottom:0.75rem;">
                <p style="font-size:0.75rem; color:#94a3b8; margin-bottom:0.25rem;">Student's Selected Bank Product:</p>
                <p style="color:var(--success); font-weight:600; font-size:0.875rem;">${loan.bankProduct?.bankName || 'Unknown Bank'} – ${loan.bankProduct?.name || 'Unknown Product'}</p>
                <p style="font-size:0.75rem; color:#94a3b8; margin-top:0.25rem;">Rate: ${loan.bankProduct?.interestRate || loan.interestRate}%</p>
            </div>

            <div class="form-group">
                <label>Confirmed Tenure (Months)</label>
                <input type="number" id="review-tenure" value="${loan.tenureMonths || loan.bankProduct?.minTenureMonths || 24}" min="6" />
            </div>
            
            <div class="decision-actions">
                <button onclick="approveLoan('${loanId}')" class="btn btn-primary" style="flex:1; font-size:0.875rem; background:linear-gradient(135deg,#059669,#10b981); white-space: normal; line-height: 1.3; min-height: 2.75rem; padding: 0.5rem; text-align: center;">
                    ✓ Approve &amp; Forward to Bank
                </button>
                <button onclick="rejectLoan('${loanId}')" style="flex:1; background:none; border:1px solid var(--danger); color:var(--danger); border-radius:0.5rem; padding:0.5rem; cursor:pointer; font-size:0.875rem; min-height: 2.75rem; display: flex; align-items: center; justify-content: center;">
                    ✗ Reject
                </button>
            </div>
        </div>
        ` : loan.status === 'approved' ? `
        <div style="text-align:center; padding:1rem; background:rgba(16,185,129,0.05); border-radius:0.5rem;">
            <p style="color:var(--success); font-weight:600; margin-bottom:0.75rem;">✓ Loan Approved</p>
            <button onclick="markDefaulter('${loanId}')" style="background:none; border:1px solid var(--danger); color:var(--danger); border-radius:0.5rem; padding:0.5rem 1rem; cursor:pointer; font-size:0.875rem; width:100%;">Flag as Defaulter</button>
        </div>
        ` : ''}
    `;
}

async function verifyDoc(studentId, docId, status) {
    const note = status === 'rejected' ? prompt('Optional rejection note (press Cancel to skip):') : null;
    const adminNote = note === null ? undefined : note;
    try {
        await api.patch(`/admin/students/${studentId}/documents/${docId}`, {
            status,
            ...(adminNote !== undefined ? { adminNote } : {})
        });
        utils.showToast(`Document ${status === 'verified' ? 'verified ✓' : 'rejected ✗'}`, status === 'verified' ? 'success' : 'warning');

        const badgeEl = document.getElementById(`doc-badge-${docId}`);
        if (badgeEl) {
            badgeEl.className = `badge badge-${status === 'verified' ? 'success' : 'danger'}`;
            badgeEl.style.fontSize = '0.6rem';
            badgeEl.textContent = status.toUpperCase();
        }
        const rowEl = document.getElementById(`doc-row-${docId}`);
        if (rowEl) {
            rowEl.querySelectorAll('button').forEach(btn => {
                if ((status === 'verified' && btn.textContent.includes('Verify')) ||
                    (status === 'rejected' && btn.textContent.includes('Reject'))) {
                    btn.style.display = 'none';
                }
            });
        }
    } catch (err) {
        console.error('verifyDoc error:', err);
        utils.showToast(err.message || err.response?.data?.message || 'Failed to update document', 'error');
    }
}

function closeReview() {
    document.getElementById('review-empty').style.display = 'block';
    document.getElementById('review-content').style.display = 'none';
}

async function approveLoan(loanId) {
    const tenureMonths = Number(document.getElementById('review-tenure').value);
    try {
        await api.post(`/admin/loans/${loanId}/approve`, { tenureMonths });
        utils.showToast('✅ Approved & Forwarded to Bank!', 'success');
        await refreshApplications();
        closeReview();
    } catch (err) {
        showReviewMsg(err.response?.data?.message || 'Failed to approve.', 'danger');
    }
}

async function rejectLoan(loanId) {
    try {
        await api.post(`/admin/loans/${loanId}/reject`, { reason: 'Admin rejection' });
        utils.showToast('Loan rejected.', 'warning');
        await refreshApplications();
        closeReview();
    } catch (err) {
        showReviewMsg(err.response?.data?.message || 'Failed to reject.', 'danger');
    }
}

async function markDefaulter(loanId) {
    if (!confirm('Mark this applicant as a defaulter? This will heavily impact their credit score.')) return;
    try {
        await api.post(`/admin/loans/${loanId}/mark-defaulter`);
        utils.showToast('Marked as defaulter.', 'warning');
        await refreshApplications();
        closeReview();
    } catch (err) {
        showReviewMsg(err.response?.data?.message || 'Failed.', 'danger');
    }
}

function showReviewMsg(text, type = 'danger') {
    const el = document.getElementById('review-msg');
    el.className = `alert alert-${type}`;
    el.textContent = text;
    el.style.display = 'block';
}

async function refreshApplications() {
    const res = await api.get('/admin/loans');
    allLoans = res.data || [];
    renderLoansTable();
}

// ----- Banks Page -----
async function loadAdminBanks() {
    try {
        const res = await api.get('/admin/banks');
        const banks = res.data || [];

        document.getElementById('banks-loading').style.display = 'none';
        renderBanksList(banks);
    } catch (err) {
        document.getElementById('banks-loading').textContent = 'Failed to load banks.';
        console.error(err);
    }

    // Add bank form
    document.getElementById('add-bank-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('add-bank-btn');
        const msgDiv = document.getElementById('bank-form-msg');
        msgDiv.style.display = 'none';
        btn.disabled = true;
        btn.textContent = 'Adding...';

        try {
            await api.post('/admin/banks', {
                bankName: document.getElementById('bankName').value,
                bankCode: document.getElementById('bankCode').value,
                address: document.getElementById('bankAddress').value,
            });
            utils.showToast('Bank added!');
            const res = await api.get('/admin/banks');
            renderBanksList(res.data || []);
            document.getElementById('add-bank-form').reset();
        } catch (err) {
            msgDiv.className = 'alert alert-danger';
            msgDiv.textContent = err.response?.data?.message || 'Failed to add bank.';
            msgDiv.style.display = 'block';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Add Bank';
        }
    });
}

function renderBanksList(banks) {
    const container = document.getElementById('banks-list');
    if (banks.length === 0) {
        container.innerHTML = '<p class="text-muted text-center" style="padding:2rem 0;">No partner banks registered yet.</p>';
        return;
    }

    container.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:1rem;">
            ${banks.map(b => `
                <div style="background:rgba(255,255,255,0.03); border-radius:0.5rem; padding:1rem; border:1px solid rgba(255,255,255,0.05);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                        <h4 style="font-weight:600;">${b.bankName}</h4>
                        <span class="badge badge-success" style="font-size:0.625rem;">${b.bankCode}</span>
                    </div>
                    <div class="text-muted text-sm">${b.address || 'No address'}</div>
                    <div style="margin-top:0.75rem;">
                        <p class="text-muted text-sm" style="margin-bottom:0.25rem;">Products (${(b.products || []).length})</p>
                        ${(b.products || []).map(p => `
                            <div style="font-size:0.75rem; color:#94a3b8; padding:0.25rem 0; border-bottom:1px solid rgba(255,255,255,0.03);">
                                ${p.name} · ${p.interestRate}% · up to ${utils.formatCurrency(p.maxAmount)}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}
