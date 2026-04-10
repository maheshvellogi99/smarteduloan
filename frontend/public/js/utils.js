// ============================================================
// SmartEduLoan — Shared UI Utilities (utils.js)
// ============================================================

// ── Toast Notifications ──────────────────────────────────────
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.parentNode && toast.parentNode.removeChild(toast), 300);
    }, 3000);
}

// ── Formatters ───────────────────────────────────────────────
function formatCurrency(amount) {
    return `₹${Number(amount).toLocaleString('en-IN')}`;
}

function formatDate(dateString) {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Auth ──────────────────────────────────────────────────────
function checkAuth(allowedRoles = []) {
    const userStr = localStorage.getItem('user');
    const token   = localStorage.getItem('token');

    if (!userStr || !token) { window.location.href = '/'; return null; }

    try {
        const user = JSON.parse(userStr);
        if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
            window.location.href = '/';
            return null;
        }
        return user;
    } catch (e) {
        window.location.href = '/';
        return null;
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

// ── Mobile Sidebar Toggle ────────────────────────────────────
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('open');
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
}

// ── Sidebar Navigation Builder ───────────────────────────────
function setupSidebar(user) {
    if (!user) return;

    const icons = {
        dashboard: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>',
        profile: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
        apply: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',
        loans: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>',
        applications: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="15" x2="9.01" y2="15"></line><polyline points="9 11 9 11.01 10 11"></polyline></svg>',
        banks: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><line x1="4" y1="10" x2="20" y2="10"></line><line x1="10" y1="4" x2="10" y2="20"></line></svg>',
        brand: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--primary);"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>'
    };

    const navConfig = {
        student: [
            { href: '/student/dashboard.html', icon: icons.dashboard, label: 'Dashboard' },
            { href: '/student/profile.html',   icon: icons.profile, label: 'Credit Profile' },
            { href: '/student/apply.html',     icon: icons.apply, label: 'Apply Loan' },
            { href: '/student/loans.html',     icon: icons.loans, label: 'My Loans' }
        ],
        admin: [
            { href: '/admin/dashboard.html',    icon: icons.dashboard, label: 'Overview' },
            { href: '/admin/applications.html', icon: icons.applications, label: 'Applications' },
            { href: '/admin/banks.html',        icon: icons.banks, label: 'Banks' }
        ],
        bank: [
            { href: '/bank/dashboard.html', icon: icons.dashboard, label: 'Dashboard' }
        ]
    };

    const links = navConfig[user.role] || [];
    const currentPath = window.location.pathname;
    const initials = (user.name || 'U').charAt(0).toUpperCase();

    // Build sidebar HTML
    const sidebarHTML = `
        <a href="/${user.role}/dashboard.html" class="sidebar-brand">
            <div class="brand-icon" style="background:var(--primary-dim); border-radius:0.5rem; padding:0.3rem;">${icons.brand}</div>
            <div class="brand-text"><span>Smart</span>EduLoan</div>
        </a>
        <nav class="sidebar-nav">
            ${links.map(l => {
                const isActive = currentPath === l.href || currentPath.endsWith(l.href);
                return `<a href="${l.href}" class="${isActive ? 'active' : ''}">
                    <span class="nav-icon">${l.icon}</span>
                    <span>${l.label}</span>
                </a>`;
            }).join('')}
        </nav>
        <div class="sidebar-footer">
            <div class="sidebar-user">
                <div class="sidebar-avatar role-${user.role}">${initials}</div>
                <div class="sidebar-user-info">
                    <div class="sidebar-user-name">${user.name}</div>
                    <div class="sidebar-user-role">${user.role}</div>
                </div>
            </div>
            <button class="btn-logout-sidebar" onclick="handleLogout()">Sign Out</button>
        </div>
    `;

    // Build bottom nav for mobile
    const bottomNavHTML = `
        <div class="bottom-nav-inner">
            ${links.map(l => {
                const isActive = currentPath === l.href || currentPath.endsWith(l.href);
                return `<a href="${l.href}" class="${isActive ? 'active' : ''}">
                    <span class="nav-icon">${l.icon}</span>
                    <span>${l.label}</span>
                </a>`;
            }).join('')}
        </div>
    `;

    // Inject sidebar
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.innerHTML = sidebarHTML;

    // Inject mobile topbar
    const topbar = document.getElementById('mobile-topbar');
    if (topbar) {
        topbar.innerHTML = `
            <button class="hamburger-btn" onclick="toggleSidebar()" aria-label="Open menu">
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
            </button>
            <div class="mobile-brand"><span>Smart</span>EduLoan</div>
            <div style="width:34px;"></div>
        `;
    }

    // Inject bottom nav
    const bottomNav = document.getElementById('bottom-nav');
    if (bottomNav) bottomNav.innerHTML = bottomNavHTML;

    // Setup overlay
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) overlay.addEventListener('click', closeSidebar);
}

// ── Skeleton helpers ─────────────────────────────────────────
function createSkeleton(type, count = 1) {
    const items = [];
    for (let i = 0; i < count; i++) {
        if (type === 'card') {
            items.push('<div class="skeleton skeleton-card"></div>');
        } else if (type === 'text') {
            items.push('<div class="skeleton skeleton-text"></div>');
        } else if (type === 'heading') {
            items.push('<div class="skeleton skeleton-heading"></div>');
        }
    }
    return items.join('');
}

// ── Old setupNavbar compatibility (for non-sidebar pages) ────
function setupNavbar(user) {
    // Redirect to setupSidebar
    setupSidebar(user);
}

window.utils = { showToast, formatCurrency, formatDate, checkAuth, handleLogout, setupSidebar, setupNavbar, createSkeleton };
