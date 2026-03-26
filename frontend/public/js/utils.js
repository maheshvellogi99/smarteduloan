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

    const navConfig = {
        student: [
            { href: '/student/dashboard.html', icon: '📊', label: 'Dashboard' },
            { href: '/student/profile.html',   icon: '👤', label: 'Credit Profile' },
            { href: '/student/apply.html',     icon: '📝', label: 'Apply Loan' },
            { href: '/student/loans.html',     icon: '💳', label: 'My Loans' }
        ],
        admin: [
            { href: '/admin/dashboard.html',    icon: '📊', label: 'Overview' },
            { href: '/admin/applications.html', icon: '📋', label: 'Applications' },
            { href: '/admin/banks.html',        icon: '🏦', label: 'Banks' }
        ],
        bank: [
            { href: '/bank/dashboard.html', icon: '🏠', label: 'Dashboard' }
        ]
    };

    const links = navConfig[user.role] || [];
    const currentPath = window.location.pathname;
    const initials = (user.name || 'U').charAt(0).toUpperCase();

    // Build sidebar HTML
    const sidebarHTML = `
        <a href="/${user.role}/dashboard.html" class="sidebar-brand">
            <div class="brand-icon">🎓</div>
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
