/**
 * ═══════════════════════════════════════════════════════════════
 *  Farmer Dashboard — Main Logic (Production)
 *  Real data only — no demo fallbacks
 * ═══════════════════════════════════════════════════════════════
 */

document.addEventListener('DOMContentLoaded', () => {
    if (!auth.isLoggedIn()) {
        window.location.href = '/login.html';
        return;
    }

    initDashboard();
    initNavigation();
    socketClient.connect();
    socketClient.requestNotificationPermission();
});

// ── State ────────────────────────────────────────────────────
let currentSection = 'overview';
let userFarms = [];
let userLocation = { lat: 28.6139, lon: 77.2090 }; // Default: Delhi

// ── Initialize Dashboard ─────────────────────────────────────
async function initDashboard() {
    const user = auth.userData;
    const avatarEl = document.getElementById('user-avatar');
    const nameEl = document.getElementById('user-name');
    const roleEl = document.getElementById('user-role');

    if (avatarEl) avatarEl.textContent = getInitials(user?.name);
    if (nameEl) nameEl.textContent = user?.name || 'Farmer';
    if (roleEl) roleEl.textContent = 'Farmer';

    try {
        userLocation = await getCurrentLocation();
    } catch (e) {
        console.log('Using default location');
    }

    loadOverviewData();
    loadWeather();
    loadAlerts();
    loadFarms();
}

// ── Sidebar Navigation ───────────────────────────────────────
function initNavigation() {
    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchSection(item.dataset.section);
        });
    });
}

function switchSection(section) {
    currentSection = section;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`.nav-item[data-section="${section}"]`)?.classList.add('active');

    document.querySelectorAll('.dashboard-section').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('active-section');
    });
    const target = document.getElementById(`section-${section}`);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('active-section');
        target.style.animation = 'none';
        target.offsetHeight;
        target.style.animation = 'sectionFadeIn 0.4s ease-out';
    }

    if (section === 'chatbot') {
        if (!window.chatbotInstance) {
            window.chatbotInstance = new Chatbot('chatbot-widget');
        }
    }

    // Toggle floating button visibility
    const fab = document.getElementById('floating-assistant');
    if (fab) {
        fab.style.display = section === 'chatbot' ? 'none' : '';
    }

    document.querySelector('.sidebar')?.classList.remove('open');
    document.querySelector('.sidebar-overlay')?.classList.remove('active');
}

// ── Load Overview Stats ──────────────────────────────────────
async function loadOverviewData() {
    try {
        const [farmStats, alertStats] = await Promise.all([
            auth.apiFetch('/farms/stats/overview'),
            auth.apiFetch('/alerts/stats/overview'),
        ]);

        if (farmStats?.success) {
            document.getElementById('stat-total-farms').textContent = farmStats.data.totalFarms || 0;
            const healthCounts = farmStats.data.healthCounts || [];
            const healthy = healthCounts.find(h => h._id === 'healthy');
            document.getElementById('stat-crop-health').textContent = healthy ? `${Math.round((healthy.count / (farmStats.data.totalFarms || 1)) * 100)}%` : '—';
        }

        if (alertStats?.success) {
            document.getElementById('stat-active-alerts').textContent = alertStats.data.total || 0;
        }

        // Build farm carousel on dashboard
        buildFarmCarousel();
    } catch (e) {
        console.error('Failed to load overview:', e);
        document.getElementById('stat-total-farms').textContent = '0';
        document.getElementById('stat-active-alerts').textContent = '0';
        document.getElementById('stat-crop-health').textContent = '—';
    }
}

// ── Load Weather ─────────────────────────────────────────────
async function loadWeather() {
    try {
        const data = await auth.apiFetch(`/weather?lat=${userLocation.lat}&lon=${userLocation.lon}`);

        if (data?.success) {
            const w = data.data;
            const temp = Math.round(w.main?.temp || 28);
            const humidity = w.main?.humidity || 65;
            const wind = (w.wind?.speed || 3).toFixed(1);
            const desc = w.weather?.[0]?.description || 'Clear sky';
            const icon = getWeatherEmoji(w.weather?.[0]?.id);

            document.getElementById('weather-temp').innerHTML = `${temp}<sup>°C</sup>`;
            document.getElementById('weather-icon').textContent = icon;
            document.getElementById('weather-desc').textContent = desc.charAt(0).toUpperCase() + desc.slice(1);
            document.getElementById('weather-humidity').textContent = `${humidity}%`;
            document.getElementById('weather-wind').textContent = `${wind} m/s`;
            document.getElementById('weather-location').textContent = w.name || 'Your Location';
            document.getElementById('stat-weather').textContent = `${temp}°C`;
        }
    } catch (e) {
        console.error('Weather load failed:', e);
        document.getElementById('weather-temp').innerHTML = '—<sup>°C</sup>';
        document.getElementById('stat-weather').textContent = '—';
    }
}

// ── Load Alerts ──────────────────────────────────────────────
async function loadAlerts() {
    try {
        const data = await auth.apiFetch('/alerts?limit=10');
        const container = document.getElementById('alerts-list');
        const notifList = document.getElementById('notif-list');

        if (data?.success && data.data.length > 0) {
            const count = data.data.length;

            const bellBadge = document.getElementById('bell-badge-count');
            const navBadge = document.getElementById('nav-alert-count');
            if (bellBadge) { bellBadge.textContent = count; bellBadge.style.display = 'inline'; }
            if (navBadge) { navBadge.textContent = count; navBadge.style.display = 'inline'; }

            container.innerHTML = data.data.map(alert => `
                <div class="alert-item animate-fadeInUp" onclick="viewAlert('${alert._id}')">
                    <div class="alert-severity-dot ${alert.severity}"></div>
                    <div class="alert-info">
                        <h4>${alert.title}</h4>
                        <p>${alert.description?.substring(0, 80) || 'No description'}...</p>
                        <div class="alert-meta">
                            <span class="badge badge-${alert.severity}">${alert.severity}</span>
                            <span class="badge badge-${alert.type}">${alert.type}</span>
                            <span>${timeAgo(alert.createdAt)}</span>
                        </div>
                    </div>
                </div>
            `).join('');

            if (notifList) {
                notifList.innerHTML = data.data.slice(0, 5).map(alert => `
                    <div class="notif-item" onclick="viewAlert('${alert._id}')">
                        <div class="notif-dot ${alert.severity}"></div>
                        <div class="notif-content">
                            <h5>${alert.title}</h5>
                            <p>${alert.description?.substring(0, 60)}...</p>
                        </div>
                        <span class="notif-time">${timeAgo(alert.createdAt)}</span>
                    </div>
                `).join('');
            }
        } else {
            const bellBadge = document.getElementById('bell-badge-count');
            const navBadge = document.getElementById('nav-alert-count');
            if (bellBadge) bellBadge.style.display = 'none';
            if (navBadge) navBadge.style.display = 'none';

            container.innerHTML = `
                <div style="text-align:center;padding:2rem;color:var(--text-muted);">
                    <div style="font-size:2.5rem;">🔔</div>
                    <p style="margin-top:0.5rem;font-weight:500;">No alerts yet</p>
                    <p style="font-size:0.85rem;">You'll see pest and disease alerts here when they are issued.</p>
                </div>`;

            if (notifList) notifList.innerHTML = '<div class="notif-empty">🔔 No new notifications</div>';
        }
    } catch (e) {
        document.getElementById('alerts-list').innerHTML = `
            <div style="text-align:center;padding:2rem;color:var(--text-muted);">
                <p>Could not load alerts. Please refresh.</p>
            </div>`;
    }
}

// ── View Alert Details ───────────────────────────────────────
async function viewAlert(id) {
    Modal.open('alert-detail-modal');
    const contentEl = document.getElementById('alert-detail-content');
    contentEl.innerHTML = '<div style="text-align:center;padding:2rem;"><div class="spinner" style="margin:0 auto;"></div><p style="margin-top:1rem;color:var(--text-muted);">Loading...</p></div>';

    try {
        const data = await auth.apiFetch(`/alerts/${id}`);
        if (data?.success && data.data) {
            const a = data.data;
            const severityColors = { low: '#66BB6A', medium: '#FFA726', high: '#EF5350', critical: '#B71C1C' };
            const severityIcons = { low: '🟢', medium: '🟡', high: '🟠', critical: '🔴' };
            contentEl.innerHTML = `
                <div style="margin-bottom:20px;">
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
                        <span style="font-size:2rem;">${severityIcons[a.severity] || '🔔'}</span>
                        <div>
                            <h3 style="font-family:var(--font-display);font-size:1.3rem;font-weight:700;">${a.title}</h3>
                            <div style="display:flex;gap:8px;margin-top:6px;">
                                <span class="badge badge-${a.severity}">${a.severity}</span>
                                <span class="badge badge-${a.type}">${a.type}</span>
                                <span style="font-size:0.8rem;color:var(--text-muted);">${formatDateTime(a.createdAt)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div style="background:var(--gray-50);border-radius:var(--radius-md);padding:16px;margin-bottom:16px;">
                    <h4 style="font-size:0.85rem;font-weight:700;margin-bottom:8px;color:var(--text-secondary);">📋 Description</h4>
                    <p style="font-size:0.9rem;line-height:1.7;color:var(--text-primary);">${a.description || 'No description provided.'}</p>
                </div>
                ${a.affectedCrops?.length ? `
                    <div style="background:var(--gray-50);border-radius:var(--radius-md);padding:16px;margin-bottom:16px;">
                        <h4 style="font-size:0.85rem;font-weight:700;margin-bottom:8px;color:var(--text-secondary);">🌾 Affected Crops</h4>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;">
                            ${a.affectedCrops.map(c => `<span class="badge" style="background:var(--primary-50);color:var(--primary-700);font-weight:600;">${c}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
                ${a.treatment ? `
                    <div style="background:#FFF3E0;border-radius:var(--radius-md);padding:16px;margin-bottom:16px;border-left:4px solid var(--accent-amber);">
                        <h4 style="font-size:0.85rem;font-weight:700;margin-bottom:8px;color:var(--accent-orange);">💊 Treatment / Advisory</h4>
                        <p style="font-size:0.9rem;line-height:1.7;color:var(--text-primary);">${a.treatment}</p>
                    </div>
                ` : ''}
                ${a.createdBy ? `
                    <div style="font-size:0.8rem;color:var(--text-muted);margin-top:16px;">
                        Issued by: <strong>${a.createdBy.name || 'Admin'}</strong>
                    </div>
                ` : ''}
            `;
        } else {
            contentEl.innerHTML = '<p style="text-align:center;color:var(--danger);padding:2rem;">Alert not found.</p>';
        }
    } catch (e) {
        contentEl.innerHTML = '<p style="text-align:center;color:var(--danger);padding:2rem;">Failed to load alert details.</p>';
    }
}

// ── Load Farms ───────────────────────────────────────────────
async function loadFarms() {
    try {
        const data = await auth.apiFetch('/farms');
        const container = document.getElementById('farms-grid');

        if (data?.success && data.data.length > 0) {
            userFarms = data.data;
            renderFarms(data.data);
            populateFarmSelector();
            buildFarmCarousel();
            updateFarmHealthSummary();
            // Also refresh chatbot farm selector if it exists
            if (window.chatbotInstance) window.chatbotInstance.populateFarmSelector();
        } else {
            container.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-muted);">
                    <div style="font-size:3rem;">🌾</div>
                    <p style="margin-top:0.5rem;font-weight:600;font-size:1rem;">No farms added yet</p>
                    <p style="font-size:0.85rem;margin-bottom:1rem;">Add your first farm to start tracking crop health.</p>
                    <button class="btn btn-primary" onclick="openAddFarm()">+ Add Farm</button>
                </div>`;
        }
    } catch (e) {
        const container = document.getElementById('farms-grid');
        container.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--text-muted);">
                <p>Could not load farms. Please refresh.</p>
            </div>`;
    }
}

// Crop-specific photos for farm cards
const CROP_PHOTOS = {
    rice: 'https://images.unsplash.com/photo-1536304993881-460ea329a554?w=600&h=300&fit=crop',
    wheat: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&h=300&fit=crop',
    cotton: 'https://images.unsplash.com/photo-1594977889411-5145a8b1aab9?w=600&h=300&fit=crop',
    sugarcane: 'https://images.unsplash.com/photo-1596996947594-8e63e96b4b0a?w=600&h=300&fit=crop',
    maize: 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=600&h=300&fit=crop',
    corn: 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=600&h=300&fit=crop',
    vegetable: 'https://images.unsplash.com/photo-1592924802564-c72e51c2a726?w=600&h=300&fit=crop',
    tomato: 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=600&h=300&fit=crop',
    potato: 'https://images.unsplash.com/photo-1518977676601-b28d5556f647?w=600&h=300&fit=crop',
    soybean: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=600&h=300&fit=crop',
    pulse: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=600&h=300&fit=crop',
    default: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&h=300&fit=crop',
};

function getCropPhoto(cropType) {
    const crop = (cropType || '').toLowerCase();
    return CROP_PHOTOS[crop] || Object.entries(CROP_PHOTOS).find(([k]) => crop.includes(k))?.[1] || CROP_PHOTOS.default;
}

function renderFarms(farms) {
    const container = document.getElementById('farms-grid');
    const healthColors = { healthy: '#43A047', mild_risk: '#FFA726', moderate_risk: '#EF6C00', severe_risk: '#C62828', critical: '#B71C1C' };
    const healthLabels = { healthy: '✅ Healthy', mild_risk: '🟡 Mild Risk', moderate_risk: '🟠 Moderate', severe_risk: '🔴 Severe', critical: '⛔ Critical' };

    container.innerHTML = farms.map((farm, i) => {
        const photo = farm.farmPhoto || getCropPhoto(farm.cropType);
        const hColor = healthColors[farm.healthStatus] || '#43A047';
        const hLabel = healthLabels[farm.healthStatus] || '✅ Healthy';
        const crops = [farm.cropType, ...(farm.secondaryCrops || [])].filter(Boolean);
        const lastScan = farm.lastInspection ? timeAgo(farm.lastInspection) : 'Not scanned';
        const scanCount = farm.images?.length || 0;

        return `
        <div class="farm-card farm-card-enhanced animate-fadeInUp" style="animation-delay:${i * 80}ms;">
            <div class="farm-card-photo" style="background-image:url('${photo}');">
                <div class="farm-card-photo-overlay">
                    <div class="farm-card-title">${farm.name}</div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">
                        ${crops.map(c => `<span class="crop-badge-pill">🌾 ${c}</span>`).join('')}
                    </div>
                </div>
                <div class="farm-health-ribbon" style="background:${hColor};">${hLabel}</div>
            </div>
            <div class="farm-card-info">
                <div class="farm-info-row"><span>🏞️</span><span>${farm.soilType} soil • ${farm.areaInAcres || '—'} acres</span></div>
                <div class="farm-info-row"><span>📍</span><span>${farm.address?.village || farm.address?.district || 'Location not set'}</span></div>
                <div class="farm-info-row"><span>🔬</span><span>${scanCount} scan${scanCount !== 1 ? 's' : ''} • Last: ${lastScan}</span></div>
            </div>
            <div class="farm-card-actions">
                <button class="btn btn-sm btn-outline-primary" onclick="switchSection('disease-scan'); setTimeout(() => { document.getElementById('scan-farm-select').value = '${farm._id}'; }, 300);">📸 Scan</button>
                <div>
                    <button class="btn btn-sm btn-ghost" onclick="editFarm('${farm._id}')" title="Edit">✏️</button>
                    <button class="btn btn-sm btn-ghost" onclick="deleteFarm('${farm._id}')" style="color:var(--danger);" title="Delete">🗑️</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ── Farm Carousel (Dashboard Overview) ───────────────────────
let carouselIndex = 0;
let carouselTimer = null;

function buildFarmCarousel() {
    const section = document.getElementById('farm-carousel-section');
    const track = document.getElementById('farm-carousel-track');
    const dots = document.getElementById('carousel-dots');
    if (!section || !track || !userFarms.length) return;

    section.style.display = '';
    const healthColors = { healthy: '#43A047', mild_risk: '#FFA726', moderate_risk: '#EF6C00', severe_risk: '#C62828', critical: '#B71C1C' };
    const healthLabels = { healthy: '✅ Healthy', mild_risk: '🟡 Mild Risk', moderate_risk: '🟠 Moderate Risk', severe_risk: '🔴 Severe Risk' };

    track.innerHTML = userFarms.map((farm, i) => {
        const photo = farm.farmPhoto || getCropPhoto(farm.cropType);
        const hColor = healthColors[farm.healthStatus] || '#43A047';
        const hLabel = healthLabels[farm.healthStatus] || '✅ Healthy';
        const crops = [farm.cropType, ...(farm.secondaryCrops || [])].filter(Boolean);
        const lastScan = farm.lastInspection ? timeAgo(farm.lastInspection) : 'Never';
        const scanCount = farm.images?.length || 0;

        return `
        <div class="farm-slide ${i === 0 ? 'active' : ''}" data-index="${i}">
            <div class="farm-slide-inner" style="background-image:url('${photo}');">
                <div class="farm-slide-overlay">
                    <div class="farm-slide-content">
                        <h3>${farm.name}</h3>
                        <div class="farm-slide-chips">
                            ${crops.map(c => `<span class="slide-chip">🌾 ${c}</span>`).join('')}
                            <span class="slide-chip" style="background:${hColor};color:white;">${hLabel}</span>
                        </div>
                        <div class="farm-slide-meta">
                            <span>📏 ${farm.areaInAcres || '?'} acres</span>
                            <span>🏞️ ${farm.soilType}</span>
                            <span>🔬 ${scanCount} scans • Last: ${lastScan}</span>
                        </div>
                        <button class="btn btn-sm" style="background:white;color:var(--primary-700);font-weight:600;margin-top:8px;" onclick="switchSection('disease-scan'); setTimeout(() => { document.getElementById('scan-farm-select').value = '${farm._id}'; }, 300);">
                            📸 Scan This Farm
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');

    // Dots
    if (dots) {
        dots.innerHTML = userFarms.map((_, i) => 
            `<span class="carousel-dot ${i === 0 ? 'active' : ''}" onclick="goToSlide(${i})"></span>`
        ).join('');
    }

    // Auto-scroll
    carouselIndex = 0;
    clearInterval(carouselTimer);
    if (userFarms.length > 1) {
        carouselTimer = setInterval(() => slideFarmCarousel(1), 5000);
    }
}

function slideFarmCarousel(dir) {
    const slides = document.querySelectorAll('.farm-slide');
    if (!slides.length) return;
    carouselIndex = (carouselIndex + dir + slides.length) % slides.length;
    goToSlide(carouselIndex);
}

function goToSlide(index) {
    const slides = document.querySelectorAll('.farm-slide');
    const dots = document.querySelectorAll('.carousel-dot');
    slides.forEach((s, i) => s.classList.toggle('active', i === index));
    dots.forEach((d, i) => d.classList.toggle('active', i === index));
    carouselIndex = index;
}

// ── Farm Photo Upload ────────────────────────────────────────
let pendingFarmPhoto = null;

function previewFarmPhoto(input) {
    if (!input.files.length) return;
    const file = input.files[0];
    if (file.size > 5 * 1024 * 1024) {
        Toast.warning('Too Large', 'Farm photo must be under 5MB.');
        return;
    }
    pendingFarmPhoto = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('farm-photo-img').src = e.target.result;
        document.getElementById('farm-photo-preview').style.display = '';
        document.getElementById('farm-photo-placeholder').style.display = 'none';
    };
    reader.readAsDataURL(file);
}

function removeFarmPhoto() {
    pendingFarmPhoto = null;
    document.getElementById('farm-photo-preview').style.display = 'none';
    document.getElementById('farm-photo-placeholder').style.display = '';
    document.getElementById('farm-photo-img').src = '';
    document.getElementById('farm-photo-input').value = '';
}

// ── Add Farm ─────────────────────────────────────────────────
function openAddFarm() {
    document.getElementById('farm-edit-id').value = '';
    document.getElementById('farm-modal-title').textContent = 'Add New Farm';
    document.getElementById('farm-modal-icon').textContent = '➕';
    document.getElementById('farm-submit-btn').textContent = 'Save Farm';
    document.getElementById('farm-form').reset();
    // Reset photo state
    pendingFarmPhoto = null;
    const preview = document.getElementById('farm-photo-preview');
    const placeholder = document.getElementById('farm-photo-placeholder');
    if (preview) preview.style.display = 'none';
    if (placeholder) placeholder.style.display = '';
    Modal.open('farm-modal');
}

// ── Edit Farm ────────────────────────────────────────────────
async function editFarm(id) {
    const farm = userFarms.find(f => f._id === id);
    if (!farm) {
        // Fallback: fetch from API
        try {
            const data = await auth.apiFetch(`/farms/${id}`);
            if (data?.success) {
                populateEditFarm(data.data);
            } else {
                Toast.error('Error', 'Could not load farm details.');
            }
        } catch (e) {
            Toast.error('Error', 'Could not load farm details.');
        }
        return;
    }
    populateEditFarm(farm);
}

function populateEditFarm(farm) {
    const form = document.getElementById('farm-form');
    document.getElementById('farm-edit-id').value = farm._id;
    document.getElementById('farm-modal-title').textContent = 'Edit Farm';
    document.getElementById('farm-modal-icon').textContent = '✏️';
    document.getElementById('farm-submit-btn').textContent = 'Update Farm';

    form.name.value = farm.name || '';
    form.cropType.value = farm.cropType || '';
    form.cropVariety.value = farm.cropVariety || '';
    form.soilType.value = farm.soilType || '';
    form.areaInAcres.value = farm.areaInAcres || '';
    form.plantingDate.value = farm.plantingDate ? farm.plantingDate.substring(0, 10) : '';
    form.expectedHarvestDate.value = farm.expectedHarvestDate ? farm.expectedHarvestDate.substring(0, 10) : '';
    const villageInput = form.querySelector('[name="address.village"]');
    if (villageInput) villageInput.value = farm.address?.village || '';

    // Populate secondary crops
    const secondaryInput = document.getElementById('farm-secondary-crops');
    if (secondaryInput) secondaryInput.value = (farm.secondaryCrops || []).join(', ');

    // Show existing farm photo
    const preview = document.getElementById('farm-photo-preview');
    const placeholder = document.getElementById('farm-photo-placeholder');
    const photoImg = document.getElementById('farm-photo-img');
    if (farm.farmPhoto && preview && placeholder && photoImg) {
        photoImg.src = farm.farmPhoto;
        preview.style.display = '';
        placeholder.style.display = 'none';
    } else {
        if (preview) preview.style.display = 'none';
        if (placeholder) placeholder.style.display = '';
    }
    pendingFarmPhoto = null;

    Modal.open('farm-modal');
}

async function saveFarm(e) {
    e.preventDefault();
    const form = document.getElementById('farm-form');
    const editId = document.getElementById('farm-edit-id').value;
    const formData = new FormData(form);
    const farmData = Object.fromEntries(formData.entries());

    // Remove file input from JSON data (handled separately)
    delete farmData.farmPhoto;

    // Nest address
    if (farmData['address.village']) {
        farmData.address = { village: farmData['address.village'] };
        delete farmData['address.village'];
    }

    // Add location
    farmData.location = {
        type: 'Point',
        coordinates: [userLocation.lon, userLocation.lat],
    };

    try {
        const url = editId ? `/farms/${editId}` : '/farms';
        const method = editId ? 'PUT' : 'POST';
        const res = await auth.apiFetch(url, {
            method,
            body: JSON.stringify(farmData),
        });

        if (res?.success) {
            const farmId = res.data._id || editId;

            // Upload photo if pending
            if (pendingFarmPhoto && farmId) {
                try {
                    const photoFormData = new FormData();
                    photoFormData.append('farmPhoto', pendingFarmPhoto);
                    await fetch(`/api/farms/${farmId}/photo`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${auth.token}` },
                        body: photoFormData,
                    });
                } catch (photoErr) {
                    console.error('Photo upload error:', photoErr);
                }
            }

            Toast.success(editId ? 'Farm Updated!' : 'Farm Added!', editId ? 'Your farm has been updated.' : 'Your farm has been registered.');
            Modal.close('farm-modal');
            form.reset();
            pendingFarmPhoto = null;
            document.getElementById('farm-edit-id').value = '';
            loadFarms();
            loadOverviewData();
        } else {
            Toast.error('Error', res?.message || 'Failed to save farm.');
        }
    } catch (e) {
        Toast.error('Error', 'Could not save farm. Please try again.');
    }
}

async function deleteFarm(id) {
    if (!confirm('Are you sure you want to delete this farm?')) return;
    try {
        const res = await auth.apiFetch(`/farms/${id}`, { method: 'DELETE' });
        if (res?.success) {
            Toast.success('Deleted', 'Farm removed.');
            loadFarms();
            loadOverviewData();
        }
    } catch (e) {
        Toast.error('Error', 'Could not delete farm.');
    }
}

// ── Disease Detection ────────────────────────────────────────
function initDiseaseDetection() {
    const dropArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('crop-image-input');
    const removeBtn = document.getElementById('remove-preview-btn');
    if (!dropArea || !fileInput) return;

    dropArea.addEventListener('click', () => fileInput.click());
    dropArea.addEventListener('dragover', (e) => { e.preventDefault(); dropArea.classList.add('dragover'); });
    dropArea.addEventListener('dragleave', () => { dropArea.classList.remove('dragover'); });
    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('dragover');
        if (e.dataTransfer.files.length) previewAndUpload(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) previewAndUpload(e.target.files[0]);
    });
    if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            clearImagePreview();
        });
    }

    // Populate farm selector
    populateFarmSelector();
}

function populateFarmSelector() {
    const select = document.getElementById('scan-farm-select');
    if (!select) return;
    const healthIcons = { healthy: '🟢', mild_risk: '🟡', moderate_risk: '🟠', severe_risk: '🔴', critical: '⛔' };
    select.innerHTML = '<option value="">— Select a farm (required) —</option>';
    if (!userFarms.length) {
        select.innerHTML += '<option value="" disabled>No farms added yet — add a farm first</option>';
        return;
    }
    userFarms.forEach(farm => {
        const opt = document.createElement('option');
        opt.value = farm._id;
        const icon = healthIcons[farm.healthStatus] || '⚪';
        opt.textContent = `${icon} ${farm.name} (${farm.cropType})`;
        select.appendChild(opt);
    });
}

let pendingScanFile = null;

function previewAndUpload(file) {
    if (!file.type.startsWith('image/')) {
        Toast.error('Invalid File', 'Please upload an image file.');
        return;
    }

    // Farm selection is mandatory
    const farmSelect = document.getElementById('scan-farm-select');
    if (!farmSelect?.value) {
        Toast.warning('Select a Farm', 'Please select which farm this crop is from before scanning.');
        farmSelect?.focus();
        farmSelect?.classList.add('form-error');
        setTimeout(() => farmSelect?.classList.remove('form-error'), 3000);
        return;
    }

    pendingScanFile = file;

    // Show image preview
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('image-preview');
        const container = document.getElementById('image-preview-container');
        const filename = document.getElementById('preview-filename');
        if (preview) preview.src = e.target.result;
        if (container) container.classList.remove('hidden');
        if (filename) filename.textContent = `${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
    };
    reader.readAsDataURL(file);

    // Auto-start detection
    handleImageUpload(file);
}

function clearImagePreview() {
    const container = document.getElementById('image-preview-container');
    const resultDiv = document.getElementById('detection-result');
    if (container) container.classList.add('hidden');
    if (resultDiv) { resultDiv.classList.add('hidden'); resultDiv.innerHTML = ''; }
    pendingScanFile = null;
}

async function handleImageUpload(file) {
    const resultDiv = document.getElementById('detection-result');
    const farmId = document.getElementById('scan-farm-select')?.value || '';

    resultDiv.innerHTML = `
        <div style="text-align:center;padding:2rem;">
            <div class="scan-animation">
                <div class="scan-ring"></div>
                <div class="scan-icon">🔬</div>
            </div>
            <p style="margin-top:1rem;color:var(--text-muted);font-weight:500;">Analyzing crop image with AI...</p>
            <p style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">This may take a few seconds</p>
        </div>`;
    resultDiv.classList.remove('hidden');

    const formData = new FormData();
    formData.append('image', file);
    formData.append('latitude', userLocation.lat);
    formData.append('longitude', userLocation.lon);
    if (farmId) formData.append('farmId', farmId);

    try {
        const res = await fetch('/api/diseases/detect', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${auth.token}` },
            body: formData,
        });

        const data = await res.json();

        if (data?.success) {
            const disease = data.data.disease || 'Unknown';
            const confidence = data.data.confidence || 0;
            const isHealthy = data.data.isHealthy || data.data.type === 'healthy';
            const treatment = data.data.treatment || 'Consult your local agriculture officer.';
            const preventive = data.data.preventive || [];
            const healthStatus = data.data.healthStatus || 'healthy';
            const linkedFarm = userFarms.find(f => f._id === farmId);

            const healthColors = { healthy: '#43A047', mild_risk: '#FFA726', moderate_risk: '#EF6C00', severe_risk: '#C62828', critical: '#B71C1C' };
            const healthLabels = { healthy: '✅ Healthy', mild_risk: '🟡 Mild Risk', moderate_risk: '🟠 Moderate Risk', severe_risk: '🔴 Severe Risk', critical: '⛔ Critical' };

            const headerColor = isHealthy ? '#E8F5E9' : '#FFF3E0';
            const headerBorder = isHealthy ? '#43A047' : '#EF6C00';
            const headerIcon = isHealthy ? '✅' : '🔬';
            const headerTitle = isHealthy ? 'Crop Health Report' : disease;
            const headerSubtitle = isHealthy ? 'Your crop looks healthy!' : 'Disease Detected';
            const treatmentTitle = isHealthy ? '🌱 Maintenance Tips' : '💊 Treatment';
            const preventiveTitle = isHealthy ? '🛡️ Keep It Healthy' : '🛡️ Preventive Measures';
            const confBarColor = isHealthy ? 'background:linear-gradient(90deg,#43A047,#66BB6A)' : '';

            resultDiv.innerHTML = `
                <div class="detection-result animate-fadeInUp">
                    <!-- Header -->
                    <div style="background:${headerColor};border-left:4px solid ${headerBorder};border-radius:var(--radius-md);padding:16px;margin-bottom:16px;">
                        <div class="result-header" style="margin:0;padding:0;">
                            <span style="font-size:2.5rem;">${headerIcon}</span>
                            <div>
                                <div class="result-disease" style="color:${headerBorder};">${headerTitle}</div>
                                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">
                                    <span class="badge" style="background:${headerBorder};color:white;">${headerSubtitle}</span>
                                    ${linkedFarm ? `<span class="badge" style="background:var(--primary-50);color:var(--primary-700);">🌾 ${linkedFarm.name}</span>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Confidence -->
                    <div style="margin-bottom:1rem;">
                        <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:4px;">
                            <span>${isHealthy ? 'Health Confidence' : 'Disease Confidence'}</span>
                            <span style="font-weight:700;">${(confidence * 100).toFixed(1)}%</span>
                        </div>
                        <div class="confidence-bar"><div class="bar-fill" style="width:${confidence * 100}%;${confBarColor}"></div></div>
                    </div>

                    <!-- Farm Health Banner -->
                    ${linkedFarm ? `
                        <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:${healthColors[healthStatus]}15;border-radius:var(--radius-sm);border-left:3px solid ${healthColors[healthStatus]};margin-bottom:1rem;">
                            <span style="font-size:1.2rem;">${healthLabels[healthStatus]?.split(' ')[0] || '●'}</span>
                            <div>
                                <div style="font-size:0.85rem;font-weight:600;">Farm Health Updated</div>
                                <div style="font-size:0.78rem;color:var(--text-muted);">${linkedFarm.name} → ${healthLabels[healthStatus] || healthStatus}</div>
                            </div>
                        </div>
                    ` : ''}

                    <!-- Treatment / Tips -->
                    <div style="margin-top:0.5rem;padding:14px;background:var(--gray-50);border-radius:var(--radius-sm);">
                        <h4 style="font-size:0.9rem;font-weight:700;margin-bottom:8px;">${treatmentTitle}</h4>
                        <p style="font-size:0.85rem;color:var(--text-secondary);line-height:1.7;">${treatment}</p>
                    </div>
                    ${preventive.length > 0 ? `
                        <div style="margin-top:0.75rem;padding:14px;background:var(--gray-50);border-radius:var(--radius-sm);">
                            <h4 style="font-size:0.9rem;font-weight:700;margin-bottom:8px;">${preventiveTitle}</h4>
                            <ul style="font-size:0.85rem;color:var(--text-secondary);padding-left:1.2rem;line-height:1.7;">
                                ${preventive.map(p => `<li style="margin-bottom:4px;">${p}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            `;

            // Refresh farm data everywhere
            loadFarms();
            loadOverviewData();
            updateFarmHealthSummary();
            setTimeout(buildFarmCarousel, 1000);
        } else {
            resultDiv.innerHTML = `<div style="padding:1.5rem;text-align:center;"><p style="color:var(--danger);font-weight:500;">⚠️ ${data?.message || 'Detection failed.'}</p><p style="font-size:0.82rem;color:var(--text-muted);margin-top:4px;">Please try again with a clearer image.</p></div>`;
        }
    } catch (e) {
        resultDiv.innerHTML = `<p style="color:var(--danger);text-align:center;padding:1.5rem;">Connection error. Please try again.</p>`;
    }
}

// ── Farm Health Summary ──────────────────────────────────────
async function updateFarmHealthSummary() {
    const container = document.getElementById('farm-health-summary');
    if (!container) return;

    try {
        const data = await auth.apiFetch('/farms');
        if (data?.success && data.data.length > 0) {
            const healthIcons = { healthy: '🟢', mild_risk: '🟡', moderate_risk: '🟠', severe_risk: '🔴', critical: '⛔' };
            container.innerHTML = data.data.map(farm => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--gray-100);">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span>${healthIcons[farm.healthStatus] || '⚪'}</span>
                        <div>
                            <div style="font-weight:600;font-size:0.85rem;">${farm.name}</div>
                            <div style="font-size:0.75rem;color:var(--text-muted);">${farm.cropType}</div>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:0.78rem;font-weight:600;text-transform:capitalize;">${(farm.healthStatus || 'healthy').replace('_', ' ')}</div>
                        <div style="font-size:0.7rem;color:var(--text-muted);">${farm.lastInspection ? timeAgo(farm.lastInspection) : 'Not scanned'}</div>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p>Add farms and scan crops to see health status.</p>';
        }
    } catch (e) {
        console.error('Health summary error:', e);
    }
}

// ── Initialize Chart ─────────────────────────────────────────
function initCharts() {
    if (typeof Chart === 'undefined') return;
    const ctx = document.getElementById('health-chart');
    if (!ctx) return;

    auth.apiFetch('/farms/stats/overview').then(stats => {
        let data = [1, 0, 0, 0];
        let labels = ['Healthy', 'Mild Risk', 'Moderate Risk', 'Severe Risk'];
        if (stats?.success && stats.data.healthCounts?.length > 0) {
            data = [0, 0, 0, 0];
            stats.data.healthCounts.forEach(h => {
                if (h._id === 'healthy') data[0] = h.count;
                else if (h._id === 'mild_risk') data[1] = h.count;
                else if (h._id === 'moderate_risk') data[2] = h.count;
                else if (h._id === 'severe_risk') data[3] = h.count;
            });
            if (data.every(v => v === 0)) data = [1, 0, 0, 0];
        }
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: ['#43A047', '#FFA726', '#EF6C00', '#C62828'],
                    borderWidth: 0,
                    borderRadius: 4,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyleWidth: 10, font: { size: 12 } } },
                },
            },
        });
    });
}

// ── Initialize everything when section is shown ──────────────
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        initDiseaseDetection();
        initCharts();
        updateFarmHealthSummary();

        // Farm photo upload click handler
        const photoUpload = document.getElementById('farm-photo-upload');
        if (photoUpload) {
            photoUpload.addEventListener('click', (e) => {
                if (e.target.closest('.remove-photo-btn')) return;
                document.getElementById('farm-photo-input').click();
            });
        }
    }, 500);
});

// ── Handle real-time alerts ──────────────────────────────────
window.addEventListener('new-alert', (e) => {
    loadAlerts();
    loadOverviewData();
});