// bank.js — all bank portal logic

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
        contentHtml = `<div style="text-align:center;"><img src="${url}" alt="${docLabel || 'Document'}" style="max-width:100%; max-height:75vh; border-radius:10px; object-fit:contain; box-shadow: 0 10px 30px rgba(0,0,0,0.4);" onerror="this.parentElement.innerHTML='<p class=\\'text-muted\\'>Failed to load image. Try opening in a new tab.</p>'"/></div>`;
    } else if (isPdf) {
        if (!url.includes('localhost') && !url.includes('127.0.0.1') && url.includes('cloudinary.com')) {
            // Cloudinary PDF: Render first page as JPG image to avoid security/iframe blocks
            let previewUrl = url;
            if (previewUrl.endsWith('.pdf')) {
                previewUrl = previewUrl.replace(/\\.pdf$/, '.jpg');
            } else if (!previewUrl.match(/\\.(jpg|jpeg|png|webp|gif)$/i)) {
                previewUrl += '.jpg';
            }
            contentHtml = `<div style="text-align:center; position:relative;">
                <img src="${previewUrl}" alt="${docLabel || 'PDF Preview'}" style="max-width:100%; max-height:75vh; border-radius:10px; object-fit:contain; box-shadow: 0 10px 30px rgba(0,0,0,0.4);" onerror="this.parentElement.innerHTML='<p class=\\'text-muted\\'>Failed to load PDF preview. Try opening in a new tab.</p>'"/>
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

let bankLoans = [];

// ── Tab switcher ───────────────────────────────────────────────────────────
function showTab(tabId) {
    ['tab-products', 'tab-loans'].forEach(id => {
        document.getElementById(id).style.display = id === tabId ? 'block' : 'none';
    });
    document.getElementById('btn-tab-products').style.background =
        tabId === 'tab-products' ? 'rgba(79,70,229,0.2)' : 'none';
    document.getElementById('btn-tab-products').style.color =
        tabId === 'tab-products' ? 'white' : '#94a3b8';
    document.getElementById('btn-tab-loans').style.background =
        tabId === 'tab-loans' ? 'rgba(79,70,229,0.2)' : 'none';
    document.getElementById('btn-tab-loans').style.color =
        tabId === 'tab-loans' ? 'white' : '#94a3b8';
}

// ── Products tab ──────────────────────────────────────────────────────────
async function loadBankProducts() {
    const list = document.getElementById('products-list');
    try {
        const res = await api.get('/bank/my/products');
        const products = res.data || [];
        
        document.getElementById('product-count-badge').textContent = products.length;
        
        if (products.length === 0) {
            list.innerHTML = '<p class="text-muted text-center" style="padding:2rem 0;">No products yet. Add one using the form.</p>';
            return products;
        }
        list.innerHTML = products.map(p => `
            <div style="background:var(--surface-2); border:1px solid var(--border);
                        border-radius:0.5rem; padding:0.875rem; margin-bottom:0.625rem;
                        display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem;">
                <div style="flex:1;">
                    <div style="font-weight:600; font-size:0.9375rem;">${p.name}</div>
                    <div style="font-size:0.75rem; color:var(--primary); text-transform:uppercase; margin:0.15rem 0;">${p.loanType}</div>
                    <div style="font-size:0.8rem; color:#94a3b8; margin-top:0.25rem;">
                        Rate: <strong style="color:var(--text);">${p.interestRate}%</strong> &nbsp;|&nbsp;
                        ₹${(p.minAmount||0).toLocaleString('en-IN')} – ₹${(p.maxAmount||0).toLocaleString('en-IN')} &nbsp;|&nbsp;
                        ${p.minTenureMonths}–${p.maxTenureMonths} months
                    </div>
                </div>
                <button onclick="deleteProduct('${p._id}')"
                    style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); color:#ef4444;
                           padding:0.25rem 0.6rem; border-radius:0.375rem; cursor:pointer; font-size:0.8rem; white-space:nowrap;">
                    🗑 Delete
                </button>
            </div>`).join('');
            
        return products;
    } catch (err) {
        list.innerHTML = '<p class="text-muted text-center">Failed to load products.</p>';
        return [];
    }
}

async function addProduct(e) {
    e.preventDefault();
    const btn    = document.getElementById('add-product-btn');
    const msgDiv = document.getElementById('product-form-msg');
    btn.disabled = true; btn.textContent = 'Adding...';
    msgDiv.style.display = 'none';

    const body = {
        name:            document.getElementById('p-name').value.trim(),
        loanType:        document.getElementById('p-type').value,
        minAmount:       Number(document.getElementById('p-min-amt').value),
        maxAmount:       Number(document.getElementById('p-max-amt').value),
        interestRate:    Number(document.getElementById('p-rate').value),
        minTenureMonths: Number(document.getElementById('p-min-ten').value),
        maxTenureMonths: Number(document.getElementById('p-max-ten').value),
        isActive:        true
    };

    try {
        await api.post('/bank/my/products', body);
        msgDiv.className = 'alert';
        msgDiv.style.cssText = 'display:block; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.2); color:#10b981; padding:0.75rem; border-radius:0.5rem; margin-bottom:0.75rem;';
        msgDiv.textContent = `✅ "${body.name}" added!`;
        document.getElementById('product-form').reset();
        await loadBankDashboard(); // reload entirely so stats/charts update
    } catch (err) {
        msgDiv.className = 'alert alert-danger';
        msgDiv.style.display = 'block';
        msgDiv.textContent = err.response?.data?.message || 'Failed to add product';
    } finally {
        btn.disabled = false; btn.textContent = 'Add Product';
    }
}

async function deleteProduct(productId) {
    if (!confirm('Delete this product?')) return;
    try {
        await api.delete(`/bank/my/products/${productId}`);
        utils.showToast('Product deleted', 'success');
        await loadBankDashboard(); // reload entirely
    } catch (err) {
        utils.showToast(err.response?.data?.message || 'Failed to delete', 'error');
    }
}

// ── Animated Counter ────────────────────────────────────────────────
function animateCounter(elementId, target) {
    const el = document.getElementById(elementId);
    if (!el) return;
    target = Number(target) || 0;
    if (target === 0) { el.textContent = '0'; return; }
    const isFloat = !Number.isInteger(target);
    const duration = 800;
    const startTime = performance.now();
    function tick(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        const current = eased * target;
        el.textContent = isFloat ? current.toFixed(1) : Math.round(current);
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = isFloat ? target.toFixed(1) : target; // exact end
    }
    requestAnimationFrame(tick);
}

// ── Loan verification tab ─────────────────────────────────────────────────
async function loadBankDashboard() {
    // Wire up product form
    const pForm = document.getElementById('product-form');
    if (pForm) pForm.addEventListener('submit', addProduct);

    document.getElementById('loading').style.display = 'none';
    document.getElementById('bank-dashboard-content').style.display = 'block';

    try {
        // Load in parallel
        const [products, loansRes] = await Promise.all([
            loadBankProducts(),
            api.get('/bank/my/loans').catch(() => ({ data: [] }))
        ]);
        
        bankLoans = loansRes.data || [];
        
        // ── Summary Stats ──
        const totalLoans = bankLoans.length;
        const pendingLoans = bankLoans.filter(l => !l.bankVerified).length;
        
        let avgRate = 0;
        if (products.length > 0) {
            const sum = products.reduce((acc, p) => acc + p.interestRate, 0);
            avgRate = sum / products.length;
        }

        animateCounter('stat-products', products.length);
        animateCounter('stat-loans', totalLoans);
        animateCounter('stat-pending', pendingLoans);
        
        // Custom animation for rate
        const rateEl = document.getElementById('stat-avg-rate');
        if (rateEl) {
            animateCounter('stat-avg-rate', avgRate);
            setTimeout(() => { if(avgRate>0) rateEl.textContent = avgRate.toFixed(1) + '%'; else rateEl.textContent='0%'; }, 850);
        }

        // ── Product Types Doughnut Chart ──
        if (products.length > 0) {
            document.getElementById('product-chart-card').style.display = 'block';
            
            // Count types
            const typeCounts = { education: 0, personal: 0, skill: 0 };
            products.forEach(p => {
                if(typeCounts[p.loanType] !== undefined) typeCounts[p.loanType]++;
                else typeCounts[p.loanType] = 1;
            });
            
            const pCtx = document.getElementById('chart-product-types');
            
            // Destroy existing chart instance if any (for reloading)
            if (window.productChart) window.productChart.destroy();
            
            if (pCtx) {
                window.productChart = new Chart(pCtx.getContext('2d'), {
                    type: 'doughnut',
                    data: {
                        labels: Object.keys(typeCounts).map(k => k.charAt(0).toUpperCase() + k.slice(1)),
                        datasets: [{
                            data: Object.values(typeCounts),
                            backgroundColor: ['#7c5cfc', '#10b981', '#f59e0b', '#3b82f6', '#ef4444'],
                            hoverBackgroundColor: ['#a78bfa', '#34d399', '#fbbf24', '#60a5fa', '#f87171'],
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
                                labels: { color: '#475569', padding: 16, font: { family: "'Inter', sans-serif", size: 11, weight: '600' }, usePointStyle: true, pointStyle: 'circle', boxWidth: 8, boxHeight: 8 }
                            },
                            tooltip: {
                                backgroundColor: '#1B1464', titleColor: '#fff', bodyColor: '#e2e8f0',
                                borderColor: 'rgba(0,0,0,0.1)', borderWidth: 1, cornerRadius: 8, padding: 10
                            }
                        },
                        animation: { animateRotate: true, animateScale: true, duration: 1000, easing: 'easeOutQuart' }
                    }
                });
            }
        } else {
             document.getElementById('product-chart-card').style.display = 'none';
        }

        // Render loans table
        document.getElementById('bank-content').style.display = 'grid';
        renderBankLoansTable();
    } catch (err) {
        console.error(err);
    }
}

function renderBankLoansTable() {
    const container = document.getElementById('bank-loans-table');

    if (bankLoans.length === 0) {
        container.innerHTML = '<p class="text-muted text-center" style="padding:2rem 0;">No assigned applications yet.</p>';
        return;
    }

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Applicant</th>
                    <th>Amount</th>
                    <th>Rate</th>
                    <th>Status</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                ${bankLoans.map(loan => `
                    <tr>
                        <td>
                            <div style="font-weight:500;">${loan.student?.name || 'N/A'}</div>
                            <div class="text-muted text-sm">${loan.student?.email || ''}</div>
                        </td>
                        <td>${utils.formatCurrency(loan.principalAmount)}</td>
                        <td>${loan.interestRate}%</td>
                        <td>
                            <span class="badge badge-${loan.bankVerified ? 'success' : 'warning'}">
                                ${loan.bankVerified ? 'Verified' : 'Pending'}
                            </span>
                        </td>
                        <td>
                            <button onclick="openBankReview('${loan._id}')"
                                style="background:var(--primary-dim); border:1px solid rgba(79,70,229,0.15); color:var(--primary); padding:0.3rem 0.75rem; border-radius:0.375rem; cursor:pointer; font-size:0.875rem; font-weight:600;">
                                Review
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}function openBankReview(loanId) {
    const loan = bankLoans.find(l => l._id === loanId);
    if (!loan) return;

    document.getElementById('bank-review-empty').style.display = 'none';
    const content = document.getElementById('bank-review-content');
    content.style.display = 'block';

    const profile = loan.profile || {};
    const docs     = profile.documents  || [];
    const scores   = profile.studyScores || [];
    const jee      = profile.jeeScore   || {};
    const student  = loan.student       || {};

    const DOC_LABELS = {
        aadhar: '🪪 Aadhar Card', pan: '💳 PAN Card',
        signature: '✒️ Signature', photo: '🖼️ Passport Photo',
        income_certificate: '📄 Income Certificate',
        father_aadhar: "🪪 Father's Aadhar",
        secondary_marks_memo: '📋 10th Marks Memo',
        intermediate_certificate: '📜 12th / Inter Certificate',
        jee_mains_scorecard: '📊 JEE Mains Scorecard',
        jee_advanced_scorecard: '📊 JEE Advanced Scorecard'
    };

    const LEVEL_LABELS = {
        '10th':'10th','12th':'12th','diploma':'Diploma',
        'ug_sem1':'UG S1','ug_sem2':'UG S2','ug_sem3':'UG S3','ug_sem4':'UG S4',
        'ug_sem5':'UG S5','ug_sem6':'UG S6','ug_sem7':'UG S7','ug_sem8':'UG S8','pg':'PG'
    };

    const STATUS_DOT = { verified: '#10b981', rejected: '#ef4444', pending: '#f59e0b' };

    const block = (title, inner) => `
        <div style="background:var(--surface-2); border-radius:0.5rem; padding:0.875rem; margin-bottom:0.75rem;">
            <h4 class="text-muted text-sm" style="text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.75rem;">${title}</h4>
            ${inner}
        </div>`;

    const stat = (label, val, color='') => `
        <div>
            <span class="text-muted" style="font-size:0.7rem; display:block;">${label}</span>
            <strong ${color ? `style="color:${color};"` : ''}>${val}</strong>
        </div>`;

    content.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
            <h3 style="font-size:1.125rem;">Loan Review — ${student.name || 'Applicant'}</h3>
            <button onclick="closeBankReview()" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:1.25rem;">✕</button>
        </div>

        <div id="bank-review-msg" class="alert" style="display:none;"></div>

        <!-- ── LOAN SUMMARY ── -->
        ${block('📋 Loan Summary', `
            <div class="grid gap-3" style="grid-template-columns:repeat(3,1fr); font-size:0.8125rem;">
                ${stat('Amount', utils.formatCurrency(loan.principalAmount))}
                ${stat('Interest Rate', loan.interestRate + '%')}
                ${stat('Tenure', loan.tenureMonths + ' months')}
                ${stat('Loan Type', (loan.loanType || '—').toUpperCase())}
                ${stat('Max Eligible', utils.formatCurrency(profile.maxEligibleAmount || 0), 'var(--success)')}
                ${stat('Course', profile.courseName || '—')}
            </div>
        `)}

        <!-- ── APPLICANT PROFILE ── -->
        ${block('👤 Applicant Profile', `
            <div class="grid gap-3" style="grid-template-columns:repeat(2,1fr); font-size:0.8125rem; margin-bottom:0.5rem;">
                ${stat('Name', student.name || '—')}
                ${stat('Email', student.email || '—')}
                ${stat('Credit Score', profile.creditScore || '—')}
                ${stat('Risk', (profile.riskCategory || '—').toUpperCase(),
                    profile.riskCategory==='low' ? 'var(--success)'
                  : profile.riskCategory==='high' ? 'var(--danger)' : 'var(--warning)')}
                ${stat('Academic Score', (profile.academicScore || '—') + '%')}
                ${stat('Attendance', (profile.attendance || '—') + '%')}
                ${stat('Family Income', utils.formatCurrency(profile.familyIncome || 0))}
                ${stat('Spending Score', profile.spendingBehaviorScore || '—')}
                ${stat('Internship', profile.internshipStatus || '—')}
                ${stat('Loan History', profile.previousLoanHistory || 'none')}
            </div>
        `)}

        <!-- ── STUDY SCORES ── -->
        ${block('📊 Declared Study Scores', scores.length === 0
            ? '<p class="text-muted" style="font-size:0.8125rem;">No study scores declared.</p>'
            : `<div style="overflow-x:auto;">
               <table style="font-size:0.75rem;">
                 <thead><tr><th>Level</th><th>Institution</th><th>Year</th><th>%</th><th>Remarks</th></tr></thead>
                 <tbody>
                   ${scores.map(s => `<tr>
                     <td style="white-space:nowrap;">${LEVEL_LABELS[s.level]||s.level}</td>
                     <td>${s.institution||'—'}</td>
                     <td>${s.year||'—'}</td>
                     <td style="font-weight:600; color:${(s.percentage||0)>=60?'var(--success)':'var(--warning)'};">${s.percentage||'—'}%</td>
                     <td class="text-muted">${s.remarks||'—'}</td>
                   </tr>`).join('')}
                 </tbody>
               </table></div>`
        )}

        <!-- ── JEE SCORE ── -->
        ${jee.appeared ? block('🎯 JEE Score (' + (jee.year||'—') + ')', `
            <div class="grid gap-3" style="grid-template-columns:repeat(3,1fr); font-size:0.8125rem;">
                ${stat('Mains Rank', jee.mainsRank || '—')}
                ${stat('Mains Percentile', jee.mainsPercentile || '—')}
                ${stat('Advanced Rank', jee.advancedRank || 'N/A')}
            </div>`) : ''}

        <!-- ── KYC DOCUMENTS ── -->
        ${block('📎 KYC Documents', docs.length === 0
            ? '<p class="text-muted" style="font-size:0.8125rem;">No documents uploaded yet.</p>'
            : `<div style="display:flex; flex-direction:column; gap:0.5rem;">
               ${docs.map(doc => `
                 <div style="background:var(--surface-2); border-radius:0.375rem; padding:0.625rem 0.75rem;
                             border:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                   <div>
                     <span style="font-size:0.8125rem; font-weight:500;">${DOC_LABELS[doc.docType]||doc.docType}</span>
                     <div style="display:flex; align-items:center; gap:0.5rem; margin-top:0.25rem;">
                       <span style="width:7px; height:7px; border-radius:50%; background:${STATUS_DOT[doc.status]||STATUS_DOT.pending}; display:inline-block;"></span>
                       <span style="font-size:0.7rem; color:${STATUS_DOT[doc.status]||STATUS_DOT.pending}; text-transform:uppercase; font-weight:600;">${doc.status}</span>
                       ${doc.adminNote ? `<span style="font-size:0.7rem; color:var(--danger);">— ${doc.adminNote}</span>` : ''}
                     </div>
                   </div>
                   <button onclick="previewDocument('${getDocUrl(doc)}', '${doc.mimeType || ''}', '${(DOC_LABELS[doc.docType]||doc.docType).replace(/'/g, "\\'")}')"
                      style="font-size:0.75rem; color:var(--primary); white-space:nowrap; border:1px solid rgba(79,70,229,0.2); background:transparent; padding:0.2rem 0.6rem; border-radius:var(--radius-sm); cursor:pointer;">
                      👁 Preview
                   </button>
                 </div>`).join('')}
               </div>`
        )}

        <!-- ── BANK ACTIONS ── -->
        <div style="margin-top:0.5rem;">
        ${ loan.disbursementStatus === 'disbursed'
            /* ── State 3: Fully Disbursed ── */
            ? `<div style="background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.15);
                          border-radius:0.5rem; padding:1rem; text-align:center;">
                   <div style="font-size:1.5rem; margin-bottom:0.25rem;">✅</div>
                   <strong style="color:var(--success);">Loan Disbursed</strong>
                   <p style="font-size:0.75rem; color:#94a3b8; margin-top:0.25rem;">Disbursed: ${utils.formatCurrency(loan.disbursedAmount || loan.approvedAmount || loan.principalAmount)}</p>
                   <p style="font-size:0.7rem; color:#94a3b8;">Emails sent to student &amp; admin.</p>
               </div>`

            : loan.bankVerified
            /* ── State 2: Button 1 done → show Button 2 ── */
            ? `<div style="background:var(--surface-2); border:1px solid var(--border); border-radius:0.5rem; padding:0.875rem;">
                   <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.875rem;">
                       <span style="color:var(--success);">✓</span>
                       <span style="color:var(--success); font-size:0.875rem; font-weight:600;">Eligibility sent to student (${utils.formatCurrency(loan.approvedAmount || loan.principalAmount)})</span>
                   </div>
                   <p style="font-size:0.75rem; color:#94a3b8; margin-bottom:0.75rem;">After the student completes the physical bank visit and all formalities, mark the loan as disbursed:</p>
                   <div style="display:flex; flex-direction:column; gap:0.5rem;">
                       <div>
                           <label style="font-size:0.7rem; color:#94a3b8; display:block; margin-bottom:0.2rem;">Disbursed Amount (₹)</label>
                           <input type="number" id="disburse-amount-${loanId}" value="${loan.approvedAmount || loan.principalAmount}"
                               style="width:100%; background:var(--surface-2); border:1px solid var(--border); border-radius:0.375rem; padding:0.4rem 0.6rem; color:var(--text); font-size:0.875rem;">
                       </div>
                       <div>
                           <label style="font-size:0.7rem; color:#94a3b8; display:block; margin-bottom:0.2rem;">Note (optional — included in email)</label>
                           <textarea id="disburse-note-${loanId}" rows="2" placeholder="e.g. Amount credited within 3 working days..."
                               style="width:100%; background:var(--surface-2); border:1px solid var(--border); border-radius:0.375rem; padding:0.4rem 0.6rem; color:var(--text); font-size:0.8125rem; resize:vertical;">${loan.bankNote || ''}</textarea>
                       </div>
                       <button onclick="disburseLoan('${loanId}')"
                           style="width:100%; background:linear-gradient(135deg,#7c3aed,#4f46e5); border:none; color:white;
                                  padding:0.6rem 1rem; border-radius:0.5rem; cursor:pointer; font-size:0.9rem; font-weight:700;">
                           ✅ Button 2 — Loan Successfully Disbursed
                       </button>
                       <p style="font-size:0.7rem; color:#94a3b8; text-align:center;">Clicking sends confirmation email to student + admin</p>
                   </div>
               </div>`

            /* ── State 1: Not yet verified → show Button 1 ── */
            : `<div style="background:var(--surface-2); border:1px solid var(--border); border-radius:0.5rem; padding:0.875rem;">
                   <h4 class="text-muted text-sm" style="text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.75rem;">📋 Button 1 — Set Eligible Amount &amp; Notify Student</h4>
                   <p style="font-size:0.75rem; color:#94a3b8; margin-bottom:0.625rem;">After reviewing documents, set the eligible loan amount. Student will receive an email with amount, appointment date/time, and required documents.</p>
                   <div style="display:flex; flex-direction:column; gap:0.5rem; margin-bottom:0.75rem;">
                       <div>
                           <label style="font-size:0.7rem; color:#94a3b8; display:block; margin-bottom:0.2rem;">Eligible Amount (₹)</label>
                           <input type="number" id="approved-amount-${loanId}" value="${loan.principalAmount}"
                               style="width:100%; background:var(--surface-2); border:1px solid var(--border); border-radius:0.375rem; padding:0.4rem 0.6rem; color:var(--text); font-size:0.875rem;">
                       </div>
                       <div>
                           <label style="font-size:0.7rem; color:#94a3b8; display:block; margin-bottom:0.2rem;">Instructions for student (included in email)</label>
                           <textarea id="bank-note-${loanId}" rows="2" placeholder="e.g. Bring original documents, appear at 11 AM sharp..."
                               style="width:100%; background:var(--surface-2); border:1px solid var(--border); border-radius:0.375rem; padding:0.4rem 0.6rem; color:var(--text); font-size:0.8125rem; resize:vertical;"></textarea>
                       </div>
                   </div>
                   <div style="display:flex; gap:0.625rem;">
                       <button onclick="notifyStudentEligibility('${loanId}')" class="btn btn-primary"
                           style="flex:1; font-size:0.875rem; font-weight:700; background:linear-gradient(135deg,#059669,#10b981);">
                           📋 Set Amount &amp; Notify Student
                       </button>
                       <button onclick="bankRejectLoan('${loanId}')"
                           style="background:none; border:1px solid var(--danger); color:var(--danger); border-radius:0.5rem; padding:0.5rem 0.75rem; cursor:pointer; font-size:0.875rem;">
                           ✗ Decline
                       </button>
                   </div>
               </div>`
        }
        </div>
    `;
}

function closeBankReview() {
    document.getElementById('bank-review-empty').style.display = 'block';
    document.getElementById('bank-review-content').style.display = 'none';
}

// Button 1 — Set eligible amount → email student with appointment + doc checklist
async function notifyStudentEligibility(loanId) {
    const msgEl = document.getElementById('bank-review-msg');
    try {
        const approvedAmount = document.getElementById(`approved-amount-${loanId}`)?.value;
        const bankNote       = document.getElementById(`bank-note-${loanId}`)?.value;
        if (!approvedAmount || Number(approvedAmount) <= 0) {
            utils.showToast('Please enter a valid eligible amount.', 'error');
            return;
        }
        await api.post(`/bank/my/loans/${loanId}/verify`, { approvedAmount, bankNote });
        utils.showToast('✅ Eligible amount set! Appointment email sent to student.', 'success');
        const res = await api.get('/bank/my/loans');
        bankLoans = res.data || [];
        renderBankLoansTable();
        openBankReview(loanId); // reload → show Button 2
    } catch (err) {
        if (msgEl) { msgEl.className = 'alert alert-danger'; msgEl.textContent = err.response?.data?.message || 'Failed.'; msgEl.style.display = 'block'; }
    }
}

// Button 2 — Mark loan as disbursed → email student + admin
async function disburseLoan(loanId) {
    const msgEl = document.getElementById('bank-review-msg');
    if (!confirm('Confirm: Mark this loan as successfully disbursed? This will email the student and admin.')) return;
    try {
        const disbursedAmount = document.getElementById(`disburse-amount-${loanId}`)?.value;
        const bankNote        = document.getElementById(`disburse-note-${loanId}`)?.value;
        if (!disbursedAmount || Number(disbursedAmount) <= 0) {
            utils.showToast('Please enter the disbursed amount.', 'error');
            return;
        }
        await api.post(`/bank/my/loans/${loanId}/disburse`, { disbursedAmount, bankNote });
        utils.showToast('✅ Loan marked as disbursed! Emails sent to student & admin.', 'success');
        const res = await api.get('/bank/my/loans');
        bankLoans = res.data || [];
        renderBankLoansTable();
        openBankReview(loanId); // reload → show final disbursed state
    } catch (err) {
        if (msgEl) { msgEl.className = 'alert alert-danger'; msgEl.textContent = err.response?.data?.message || 'Failed.'; msgEl.style.display = 'block'; }
    }
}

async function bankRejectLoan(loanId) {
    if (!confirm('Decline this application?')) return;
    try {
        await api.post(`/bank/my/loans/${loanId}/reject`);
        utils.showToast('Application declined.', 'warning');
        const res = await api.get('/bank/my/loans');
        bankLoans = res.data || [];
        renderBankLoansTable();
        closeBankReview();
    } catch (err) {
        const el = document.getElementById('bank-review-msg');
        if(el) { el.className = 'alert alert-danger'; el.textContent = err.response?.data?.message || 'Failed to reject.'; el.style.display = 'block'; }
    }
}
