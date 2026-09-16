/**
 * Chatbot Module — KrishiMitra AI Assistant
 * Features:
 *  - Text + image upload
 *  - Chat history persistence (loads on init)
 *  - Language enforcement (uses app language)
 *  - Farm-aware: farmer selects farm for targeted health updates
 *  - Both text and image chats update farm health in real-time
 */
class Chatbot {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.messagesEl = this.container?.querySelector('.chat-messages');
        this.inputEl = this.container?.querySelector('.chat-input');
        this.sendBtn = this.container?.querySelector('.chat-send-btn');
        this.attachBtn = this.container?.querySelector('.chat-attach-btn');
        this.farmSelect = document.getElementById('chat-farm-select');
        this.imageInput = document.getElementById('chat-image-input');
        this.isTyping = false;
        this.pendingImage = null;

        if (this.sendBtn) {
            this.sendBtn.addEventListener('click', () => this.send());
        }
        if (this.inputEl) {
            this.inputEl.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) this.send();
            });
        }

        // Image attach
        if (this.attachBtn && this.imageInput) {
            this.attachBtn.addEventListener('click', () => this.imageInput.click());
            this.imageInput.addEventListener('change', (e) => {
                if (e.target.files.length) {
                    this.attachImage(e.target.files[0]);
                    e.target.value = '';
                }
            });
        }

        // Populate farm selector
        this.populateFarmSelector();

        // Load chat history then show welcome
        this.loadHistory();
    }

    // ── Populate Farm Selector ───────────────────────────────
    populateFarmSelector() {
        if (!this.farmSelect) return;
        const healthIcons = { healthy: '🟢', mild_risk: '🟡', moderate_risk: '🟠', severe_risk: '🔴', critical: '⛔' };

        // Use global userFarms if available
        const farms = window.userFarms || [];
        this.farmSelect.innerHTML = '<option value="">All farms (general)</option>';

        farms.forEach(farm => {
            const opt = document.createElement('option');
            opt.value = farm._id;
            const icon = healthIcons[farm.healthStatus] || '⚪';
            opt.textContent = `${icon} ${farm.name} (${farm.cropType})`;
            this.farmSelect.appendChild(opt);
        });
    }

    // ── Load Saved History ───────────────────────────────────
    async loadHistory() {
        try {
            const res = await auth.apiFetch('/chat/history');
            if (res?.success && res.data.length > 0) {
                // Show history messages
                res.data.forEach(msg => {
                    if (msg.role === 'user') {
                        this.addUserMessage(msg.content, null, true);
                    } else {
                        this.addBotMessage(msg.content, true);
                    }
                });

                // Add separator
                const sep = document.createElement('div');
                sep.style.cssText = 'text-align:center;padding:12px;font-size:0.75rem;color:var(--text-muted);border-bottom:1px solid var(--gray-200);margin-bottom:8px;';
                sep.innerHTML = '— Previous messages loaded —';
                this.messagesEl?.appendChild(sep);
            } else {
                this.addBotMessage(this.getWelcome(), true);
            }
        } catch (e) {
            this.addBotMessage(this.getWelcome(), true);
        }
        this.scrollToBottom();
    }

    getWelcome() {
        const lang = window.i18n?.getLanguage() || 'en';
        const msgs = {
            en: "🌾 Namaste! I'm **KrishiMitra**, your farming assistant.\n\nI can help you with:\n• 🐛 Pest control solutions\n• 🔬 Disease identification\n• 🌤️ Weather advisories\n• 🌱 Soil health tips\n• 📷 **Upload crop images** using the 📎 button for instant analysis!\n\n💡 **Tip:** Select a farm above to get personalized advice and auto-update its health status!",
            hi: "🌾 नमस्ते! मैं **कृषिमित्र** हूं, आपका खेती सहायक।\n\nमैं इनमें मदद कर सकता हूं:\n• 🐛 कीट नियंत्रण\n• 🔬 रोग पहचान\n• 🌤️ मौसम सलाह\n• 📷 **📎 बटन** से फोटो भेजें!\n\n💡 **टिप:** ऊपर खेत चुनें और स्वास्थ्य स्वतः अपडेट होगा!",
            pa: "🌾 ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ **ਕ੍ਰਿਸ਼ੀਮਿੱਤਰ** ਹਾਂ।\n\n• 🐛 ਕੀੜੇ ਕੰਟਰੋਲ\n• 🔬 ਬਿਮਾਰੀ ਪਛਾਣ\n• 📷 **📎** ਨਾਲ ਫਸਲ ਦੀ ਫੋਟੋ ਭੇਜੋ!\n\n💡 **ਟਿਪ:** ਉੱਪਰ ਖੇਤ ਚੁਣੋ ਅਤੇ ਸਿਹਤ ਆਪਣੇ ਆਪ ਅੱਪਡੇਟ ਹੋਵੇਗੀ!",
        };
        return msgs[lang] || msgs.en;
    }

    // ── Attach Image ─────────────────────────────────────────
    attachImage(file) {
        if (!file.type.startsWith('image/')) {
            Toast?.error?.('Invalid File', 'Please upload an image file.');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            Toast?.error?.('File Too Large', 'Maximum file size is 10MB.');
            return;
        }
        this.pendingImage = file;
        this.showAttachmentPreview(file);
    }

    showAttachmentPreview(file) {
        const existing = this.container?.querySelector('.chat-attachment-preview');
        if (existing) existing.remove();

        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.createElement('div');
            preview.className = 'chat-attachment-preview animate-fadeInUp';
            preview.innerHTML = `
                <div style="display:flex;align-items:center;gap:10px;padding:8px 14px;background:var(--primary-50);border-radius:var(--radius-md);border:1px solid var(--primary-200);">
                    <img src="${e.target.result}" style="width:40px;height:40px;border-radius:var(--radius-sm);object-fit:cover;">
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:0.8rem;font-weight:600;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${file.name}</div>
                        <div style="font-size:0.7rem;color:var(--text-muted);">${(file.size / 1024).toFixed(0)} KB — Ready to analyze</div>
                    </div>
                    <button onclick="window.chatbotInstance?.removeAttachment()" style="background:none;border:none;cursor:pointer;font-size:1rem;color:var(--text-muted);" title="Remove">✕</button>
                </div>
            `;
            const inputArea = this.container?.querySelector('.chat-input-area');
            if (inputArea) inputArea.parentNode.insertBefore(preview, inputArea);
        };
        reader.readAsDataURL(file);

        if (this.attachBtn) {
            this.attachBtn.style.background = 'var(--primary-50)';
            this.attachBtn.style.color = 'var(--primary-600)';
        }
    }

    removeAttachment() {
        this.pendingImage = null;
        const preview = this.container?.querySelector('.chat-attachment-preview');
        if (preview) preview.remove();
        if (this.attachBtn) {
            this.attachBtn.style.background = '';
            this.attachBtn.style.color = '';
        }
    }

    // ── Messages ─────────────────────────────────────────────
    addBotMessage(text, silent = false) {
        if (!this.messagesEl) return;
        const div = document.createElement('div');
        div.className = 'chat-message bot';
        div.innerHTML = `
            <div class="bot-msg-avatar">🌿</div>
            <div class="message-bubble">${this.formatMessage(text)}</div>
        `;
        this.messagesEl.appendChild(div);
        if (!silent) this.scrollToBottom();
    }

    addUserMessage(text, imageUrl = null, silent = false) {
        if (!this.messagesEl) return;
        const div = document.createElement('div');
        div.className = 'chat-message user';
        let content = '';
        if (imageUrl) {
            content += `<img src="${imageUrl}" style="max-width:200px;max-height:150px;border-radius:var(--radius-sm);margin-bottom:6px;display:block;">`;
        }
        const displayText = text.replace(/^\[Uploaded crop image\]\s*/i, '📷 ');
        content += `<div class="message-bubble">${displayText || '📷 Crop image'}</div>`;
        div.innerHTML = content;
        this.messagesEl.appendChild(div);
        if (!silent) this.scrollToBottom();
    }

    addTypingIndicator() {
        if (!this.messagesEl) return;
        const div = document.createElement('div');
        div.className = 'chat-message bot typing-indicator';
        div.innerHTML = `
            <div class="bot-msg-avatar">🌿</div>
            <div class="message-bubble" style="color:var(--text-muted);">
                <div class="typing-dots"><span></span><span></span><span></span></div>
                <span style="font-size:0.8rem;margin-left:8px;">KrishiMitra is thinking...</span>
            </div>
        `;
        this.messagesEl.appendChild(div);
        this.scrollToBottom();
    }

    removeTypingIndicator() {
        const indicator = this.messagesEl?.querySelector('.typing-indicator');
        if (indicator) indicator.remove();
    }

    formatMessage(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    }

    addSystemMessage(html) {
        if (!this.messagesEl) return;
        const div = document.createElement('div');
        div.className = 'chat-system-msg animate-fadeInUp';
        div.innerHTML = `<div class="system-msg-content">${this.formatMessage(html)}</div>`;
        this.messagesEl.appendChild(div);
        this.scrollToBottom();
    }

    scrollToBottom() {
        if (this.messagesEl) {
            setTimeout(() => {
                this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
            }, 50);
        }
    }

    // ── Get selected farm ID ─────────────────────────────────
    getSelectedFarmId() {
        return this.farmSelect?.value || '';
    }

    // ── Send Message ─────────────────────────────────────────
    async send() {
        const message = this.inputEl?.value?.trim();
        if ((!message && !this.pendingImage) || this.isTyping) return;

        const hasImage = !!this.pendingImage;
        const lang = window.i18n?.getLanguage() || 'en';
        const farmId = this.getSelectedFarmId();

        // Show user message
        if (hasImage) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.addUserMessage(message || '🔬 Analyze this crop', e.target.result);
            };
            reader.readAsDataURL(this.pendingImage);
        } else {
            this.addUserMessage(message);
        }

        this.inputEl.value = '';
        this.isTyping = true;
        this.addTypingIndicator();

        try {
            let response;

            if (hasImage) {
                const formData = new FormData();
                formData.append('image', this.pendingImage);
                formData.append('message', message || 'What disease does this crop have? Give treatment advice.');
                formData.append('language', lang);
                if (farmId) formData.append('farmId', farmId);

                const res = await fetch('/api/chat/image', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${auth.token}` },
                    body: formData,
                });
                response = await res.json();
                this.removeAttachment();
            } else {
                const body = { message, language: lang };
                if (farmId) body.farmId = farmId;

                response = await auth.apiFetch('/chat', {
                    method: 'POST',
                    body: JSON.stringify(body),
                });
            }

            this.removeTypingIndicator();

            if (response?.success) {
                this.addBotMessage(response.data.reply);

                // Show farm health update notification from BOTH text and image analysis
                if (response.data.updatedFarms?.length > 0) {
                    const healthIcons = { healthy: '🟢', mild_risk: '🟡', moderate_risk: '🟠', severe_risk: '🔴', critical: '⛔' };
                    const farmUpdates = response.data.updatedFarms.map(f => 
                        `${healthIcons[f.healthStatus] || '⚪'} ${f.name} → ${f.healthStatus.replace(/_/g, ' ')}`
                    ).join('<br>');
                    this.addSystemMessage(`📊 **Farm Health Updated:**<br>${farmUpdates}`);
                    
                    // Refresh dashboard data so health reflects everywhere
                    this.refreshDashboard();

                    // Also refresh farm selector to show new status
                    setTimeout(() => this.populateFarmSelector(), 1500);
                }
            } else {
                this.addBotMessage(response?.message || '⚠️ Sorry, I could not process your request.');
            }
        } catch (error) {
            this.removeTypingIndicator();
            this.addBotMessage('⚠️ Connection error. Please check your internet.');
        }

        this.isTyping = false;
    }

    // Refresh all dashboard components after health update
    refreshDashboard() {
        if (typeof loadFarms === 'function') loadFarms();
        if (typeof loadOverviewData === 'function') loadOverviewData();
        if (typeof updateFarmHealthSummary === 'function') updateFarmHealthSummary();
        if (typeof buildFarmCarousel === 'function') setTimeout(buildFarmCarousel, 1000);
    }
}

window.Chatbot = Chatbot;
