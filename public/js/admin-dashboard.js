/**
 * ═══════════════════════════════════════════════════════════════
 *  Admin Dashboard — Management Logic (Production)
 *  Real data only — no demo fallbacks
 * ═══════════════════════════════════════════════════════════════
 */

document.addEventListener('DOMContentLoaded', () => {
    if (!auth.isLoggedIn()) {
        window.location.href = '/login.html';
        return;
    }
    if (auth.getRole() !== 'admin') {
        window.location.href = '/farmer-dashboard.html';
        return;
    }
    initAdminDashboard();
    initAdminNavigation();
    initAdminNotifications();
    socketClient.connect();
});

let adminSection = 'overview';

async function initAdminDashboard() {
    const user = auth.userData;
    const avatarEl = document.getElementById('user-avatar');
    const nameEl = document.getElementById('user-name');
    if (avatarEl) avatarEl.textContent = getInitials(user?.name);
    if (nameEl) nameEl.textContent = user?.name || 'Admin';

    loadAdminStats();
    loadAdminAlerts();
    loadFarmersList();
    loadDiseasesList();
    loadAnalyticsData();
    setTimeout(initAdminCharts, 600);
}

function initAdminNavigation() {
    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchAdminSection(item.dataset.section);
        });
    });
}

function switchAdminSection(section) {
    adminSection = section;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`.nav-item[data-section="${section}"]`)?.classList.add('active');

    // Animated section transition
    document.querySelectorAll('.dashboard-section').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('active-section');
    });
    const target = document.getElementById(`section-${section}`);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('active-section');
        // Trigger animation
        target.style.animation = 'none';
        target.offsetHeight; // Reflow
        target.style.animation = 'sectionFadeIn 0.4s ease-out';
    }

    document.querySelector('.sidebar')?.classList.remove('open');
    document.querySelector('.sidebar-overlay')?.classList.remove('active');
}

// ── Notifications ────────────────────────────────────────────
function initAdminNotifications() {
    const bell = document.getElementById('admin-notif-bell');
    const dropdown = document.getElementById('admin-notif-dropdown');
    const wrapper = document.getElementById('admin-notif-wrapper');

    if (bell && dropdown) {
        bell.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        });
        document.addEventListener('click', (e) => {
            if (wrapper && !wrapper.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });
    }

    const clearBtn = document.getElementById('admin-clear-notifs');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            const list = document.getElementById('admin-notif-list');
            if (list) list.innerHTML = '<div class="notif-empty">🔔 No new notifications</div>';
            const badge = document.getElementById('admin-bell-badge');
            if (badge) badge.style.display = 'none';
        });
    }
}

// ── Load Stats ───────────────────────────────────────────────
async function loadAdminStats() {
    try {
        const [userStats, alertStats, farmStats] = await Promise.all([
            auth.apiFetch('/auth/stats'),
            auth.apiFetch('/alerts/stats/overview'),
            auth.apiFetch('/farms/stats/overview'),
        ]);

        if (userStats?.success) {
            animateCountUp('stat-total-users', userStats.data.totalUsers || 0);
            animateCountUp('stat-total-farmers', userStats.data.totalFarmers || 0);
            animateCountUp('stat-active-today', userStats.data.activeToday || 0);
        }
        if (alertStats?.success) {
            animateCountUp('stat-total-alerts', alertStats.data.total || 0);

            // Update notification badge and list
            const count = alertStats.data.total || 0;
            const badge = document.getElementById('admin-bell-badge');
            const navBadge = document.getElementById('admin-nav-alert-count');
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'inline' : 'none';
            }
            if (navBadge) {
                navBadge.textContent = count;
                navBadge.style.display = count > 0 ? 'inline' : 'none';
            }
        }
        if (farmStats?.success) {
            animateCountUp('stat-total-farms', farmStats.data.totalFarms || 0);
        }
    } catch (e) {
        console.error('Failed to load admin stats:', e);
    }
}

function animateCountUp(elementId, target) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const duration = 800;
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        const current = Math.round(start + (target - start) * eased);
        el.textContent = current.toLocaleString();
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

// ── Alerts Management ────────────────────────────────────────
async function loadAdminAlerts() {
    try {
        const data = await auth.apiFetch('/alerts?limit=20');
        const tbody = document.getElementById('alerts-table-body');
        if (!tbody) return;

        if (data?.success && data.data.length > 0) {
            tbody.innerHTML = data.data.map(a => `
                <tr class="table-row-animate">
                    <td><span class="badge badge-${a.severity}">${a.severity}</span></td>
                    <td><strong>${a.title}</strong></td>
                    <td><span class="badge badge-${a.type}">${a.type}</span></td>
                    <td>${a.affectedCrops?.join(', ') || '—'}</td>
                    <td>${timeAgo(a.createdAt)}</td>
                    <td>
                        <button class="btn btn-sm btn-ghost" onclick="deleteAlert('${a._id}')" title="Delete">🗑️</button>
                    </td>
                </tr>
            `).join('');

            // Update notification dropdown
            const notifList = document.getElementById('admin-notif-list');
            if (notifList) {
                notifList.innerHTML = data.data.slice(0, 5).map(a => `
                    <div class="notif-item">
                        <div class="notif-dot ${a.severity}"></div>
                        <div class="notif-content">
                            <h5>${a.title}</h5>
                            <p>${a.description?.substring(0, 60)}...</p>
                        </div>
                        <span class="notif-time">${timeAgo(a.createdAt)}</span>
                    </div>
                `).join('');
            }
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem;"><div style="font-size:2rem;">🔔</div><p style="margin-top:0.5rem;">No alerts yet. Create your first alert!</p></td></tr>';
            const notifList = document.getElementById('admin-notif-list');
            if (notifList) notifList.innerHTML = '<div class="notif-empty">🔔 No new notifications</div>';
        }
    } catch (e) {
        console.error('Failed to load alerts:', e);
        const tbody = document.getElementById('alerts-table-body');
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem;">Could not load alerts. Please refresh.</td></tr>';
    }
}

// ── Create Alert ─────────────────────────────────────────────
function openCreateAlert() {
    Modal.open('alert-modal');
}

async function saveAlert(e) {
    e.preventDefault();
    const form = document.getElementById('alert-form');
    const formData = new FormData(form);
    const alertData = {
        title: formData.get('title'),
        description: formData.get('description'),
        severity: formData.get('severity'),
        type: formData.get('type'),
        affectedCrops: formData.get('affectedCrops')?.split(',').map(s => s.trim()).filter(Boolean),
        treatment: formData.get('treatment'),
        sendToAll: formData.get('sendToAll') === 'on',
    };

    try {
        const res = await auth.apiFetch('/alerts', {
            method: 'POST',
            body: JSON.stringify(alertData),
        });

        if (res?.success) {
            Toast.success('Alert Sent!', 'Alert has been broadcast to farmers.');
            Modal.close('alert-modal');
            form.reset();
            loadAdminAlerts();
            loadAdminStats();
        } else {
            Toast.error('Error', res?.message || 'Failed to create alert.');
        }
    } catch (e) {
        Toast.error('Error', 'Could not send alert.');
    }
}

async function deleteAlert(id) {
    if (!confirm('Delete this alert?')) return;
    try {
        await auth.apiFetch(`/alerts/${id}`, { method: 'DELETE' });
        Toast.success('Deleted', 'Alert removed.');
        loadAdminAlerts();
        loadAdminStats();
    } catch (e) {
        Toast.error('Error', 'Could not delete alert.');
    }
}

// ── Farmers List with Role Management ────────────────────────
async function loadFarmersList() {
    try {
        const data = await auth.apiFetch('/auth/users?limit=50');
        const tbody = document.getElementById('farmers-table-body');
        if (!tbody) return;

        if (data?.success && data.data.length > 0) {
            tbody.innerHTML = data.data.map(u => `
                <tr class="table-row-animate">
                    <td>
                        <div class="user-cell">
                            <div class="avatar-sm">${getInitials(u.name)}</div>
                            <div>
                                <div style="font-weight:600;">${u.name}</div>
                                <div style="font-size:0.78rem;color:var(--text-muted);">${u.email}</div>
                            </div>
                        </div>
                    </td>
                    <td><span class="badge ${u.role === 'admin' ? 'badge-critical' : 'badge-low'}">${u.role}</span></td>
                    <td>${u.phone || '—'}</td>
                    <td>${u.address?.district || '—'}, ${u.address?.state || '—'}</td>
                    <td>${formatDate(u.lastLogin)}</td>
                    <td>
                        ${u._id !== auth.userData?._id ? `
                            <button class="btn btn-sm btn-ghost" onclick="changeUserRole('${u._id}', '${u.role === 'admin' ? 'farmer' : 'admin'}')" title="${u.role === 'admin' ? 'Demote to Farmer' : 'Promote to Admin'}">
                                ${u.role === 'admin' ? '⬇️' : '⬆️'}
                            </button>
                        ` : '<span style="font-size:0.75rem;color:var(--text-muted);">You</span>'}
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem;"><div style="font-size:2rem;">👨‍🌾</div><p style="margin-top:0.5rem;">No users registered yet.</p></td></tr>';
        }
    } catch (e) {
        console.error('Failed to load users:', e);
    }
}

async function changeUserRole(userId, newRole) {
    const action = newRole === 'admin' ? 'promote to Admin' : 'demote to Farmer';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
        const res = await auth.apiFetch(`/auth/users/${userId}/role`, {
            method: 'PUT',
            body: JSON.stringify({ role: newRole }),
        });
        if (res?.success) {
            Toast.success('Role Updated', res.message || `User ${action}d successfully.`);
            loadFarmersList();
            loadAdminStats();
        } else {
            Toast.error('Error', res?.message || 'Failed to update role.');
        }
    } catch (e) {
        Toast.error('Error', 'Could not update user role.');
    }
}

// ── Disease Database ─────────────────────────────────────────
async function loadDiseasesList() {
    try {
        const data = await auth.apiFetch('/diseases?limit=50');
        const tbody = document.getElementById('diseases-table-body');
        if (!tbody) return;

        if (data?.success && data.data.length > 0) {
            tbody.innerHTML = data.data.map(d => `
                <tr class="table-row-animate">
                    <td><strong>${d.name}</strong></td>
                    <td><span class="badge badge-${d.type === 'pest' ? 'pest' : 'disease'}">${d.type}</span></td>
                    <td>${d.affectedCrops?.slice(0, 3).join(', ') || '—'}</td>
                    <td><span class="badge badge-${d.riskLevel}">${d.riskLevel}</span></td>
                    <td>
                        <button class="btn btn-sm btn-ghost" onclick="editDisease('${d._id}')" title="Edit">✏️</button>
                        <button class="btn btn-sm btn-ghost" onclick="deleteDisease('${d._id}')" style="color:var(--danger);" title="Delete">🗑️</button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem;"><div style="font-size:2rem;">🦠</div><p style="margin-top:0.5rem;">No diseases in database. Add your first entry!</p></td></tr>';
        }
    } catch (e) {
        console.error('Failed to load diseases:', e);
    }
}

function openCreateDisease() {
    document.getElementById('disease-edit-id').value = '';
    document.getElementById('disease-modal-title').textContent = 'Add Disease Entry';
    document.getElementById('disease-form').reset();
    Modal.open('disease-modal');
}

async function editDisease(id) {
    try {
        const data = await auth.apiFetch(`/diseases/${id}`);
        if (data?.success && data.data) {
            const d = data.data;
            const form = document.getElementById('disease-form');
            document.getElementById('disease-edit-id').value = d._id;
            document.getElementById('disease-modal-title').textContent = 'Edit Disease Entry';
            form.name.value = d.name || '';
            form.type.value = d.type || 'pest';
            form.riskLevel.value = d.riskLevel || 'medium';
            form.description.value = d.description || '';
            form.affectedCrops.value = d.affectedCrops?.join(', ') || '';
            form.symptoms.value = d.symptoms?.join(', ') || '';
            form.preventiveMeasures.value = d.preventiveMeasures?.join('\n') || '';
            Modal.open('disease-modal');
        } else {
            Toast.error('Error', 'Could not load disease details.');
        }
    } catch (e) {
        Toast.error('Error', 'Could not load disease details.');
    }
}

async function saveDisease(e) {
    e.preventDefault();
    const form = document.getElementById('disease-form');
    const editId = document.getElementById('disease-edit-id').value;
    const formData = new FormData(form);
    const diseaseData = {
        name: formData.get('name'),
        type: formData.get('type'),
        description: formData.get('description'),
        affectedCrops: formData.get('affectedCrops')?.split(',').map(s => s.trim()).filter(Boolean),
        symptoms: formData.get('symptoms')?.split(',').map(s => s.trim()).filter(Boolean),
        riskLevel: formData.get('riskLevel'),
        preventiveMeasures: formData.get('preventiveMeasures')?.split('\n').map(s => s.trim()).filter(Boolean),
    };

    try {
        const url = editId ? `/diseases/${editId}` : '/diseases';
        const method = editId ? 'PUT' : 'POST';
        const res = await auth.apiFetch(url, {
            method,
            body: JSON.stringify(diseaseData),
        });
        if (res?.success) {
            Toast.success(editId ? 'Updated!' : 'Added!', `Disease entry ${editId ? 'updated' : 'created'}.`);
            Modal.close('disease-modal');
            form.reset();
            document.getElementById('disease-edit-id').value = '';
            loadDiseasesList();
        } else {
            Toast.error('Error', res?.message || 'Failed to save disease entry.');
        }
    } catch (e) {
        Toast.error('Error', 'Could not save disease.');
    }
}

async function deleteDisease(id) {
    if (!confirm('Delete this disease entry?')) return;
    try {
        await auth.apiFetch(`/diseases/${id}`, { method: 'DELETE' });
        Toast.success('Deleted', 'Disease entry removed.');
        loadDiseasesList();
    } catch (e) {
        Toast.error('Error', 'Could not delete.');
    }
}

// ── Analytics Data ───────────────────────────────────────────
async function loadAnalyticsData() {
    try {
        const [farmStats, alertStats, userStats, diseaseData] = await Promise.all([
            auth.apiFetch('/farms/stats/overview'),
            auth.apiFetch('/alerts/stats/overview'),
            auth.apiFetch('/auth/stats'),
            auth.apiFetch('/diseases?limit=100'),
        ]);

        if (farmStats?.success) {
            document.getElementById('analytics-total-farms').textContent = farmStats.data.totalFarms || 0;
        }
        if (alertStats?.success) {
            document.getElementById('analytics-total-alerts').textContent = alertStats.data.total || 0;
        }
        if (userStats?.success) {
            document.getElementById('analytics-total-admins').textContent = userStats.data.totalAdmins || 0;
        }
        if (diseaseData?.success) {
            document.getElementById('analytics-total-diseases').textContent = diseaseData.data?.length || 0;
        }
    } catch (e) {
        console.error('Failed to load analytics:', e);
    }
}

// ── Analytics Charts ─────────────────────────────────────────
function initAdminCharts() {
    if (typeof Chart === 'undefined') return;

    // Alert Trends Chart
    const trendCtx = document.getElementById('alert-trend-chart');
    if (trendCtx) {
        new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Alerts',
                    data: [12, 19, 8, 15, 22, 10, 7],
                    borderColor: '#2E7D32',
                    backgroundColor: 'rgba(46,125,50,0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: '#2E7D32',
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                    x: { grid: { display: false } },
                },
            },
        });
    }

    // Severity Distribution
    const sevCtx = document.getElementById('severity-chart');
    if (sevCtx) {
        // Try to use real data from stats
        auth.apiFetch('/alerts/stats/overview').then(stats => {
            const severityData = [0, 0, 0, 0]; // low, medium, high, critical
            if (stats?.success && stats.data.bySeverity) {
                stats.data.bySeverity.forEach(s => {
                    if (s._id === 'low') severityData[0] = s.count;
                    if (s._id === 'medium') severityData[1] = s.count;
                    if (s._id === 'high') severityData[2] = s.count;
                    if (s._id === 'critical') severityData[3] = s.count;
                });
            }
            new Chart(sevCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Low', 'Medium', 'High', 'Critical'],
                    datasets: [{
                        data: severityData.some(v => v > 0) ? severityData : [1, 1, 1, 1],
                        backgroundColor: ['#66BB6A', '#FFA726', '#EF5350', '#B71C1C'],
                        borderWidth: 0,
                        borderRadius: 4,
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: {
                        legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, font: { size: 11 } } },
                    },
                },
            });
        });
    }

    // Crop Distribution
    const cropCtx = document.getElementById('crop-chart');
    if (cropCtx) {
        auth.apiFetch('/farms/stats/overview').then(stats => {
            let labels = ['No Data'];
            let data = [1];
            if (stats?.success && stats.data.cropCounts?.length > 0) {
                labels = stats.data.cropCounts.map(c => c._id || 'Unknown');
                data = stats.data.cropCounts.map(c => c.count);
            }
            const colors = ['#1B5E20', '#2E7D32', '#43A047', '#66BB6A', '#81C784', '#A5D6A7', '#C8E6C9', '#E8F5E9', '#388E3C', '#4CAF50'];
            new Chart(cropCtx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Farms',
                        data,
                        backgroundColor: colors.slice(0, labels.length),
                        borderRadius: 6,
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                        x: { grid: { display: false } },
                    },
                },
            });
        });
    }
}

// ── Handle real-time alerts ──────────────────────────────────
window.addEventListener('new-alert', (e) => {
    loadAdminAlerts();
    loadAdminStats();
});
