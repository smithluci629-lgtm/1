import { GoogleGenAI } from "@google/genai";

const SUPABASE_URL = 'https://dnfkodjijrolqlqplwxr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuZmtvZGppanJvbHFscXBsd3hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMDI4NjIsImV4cCI6MjA4NjY3ODg2Mn0.QnkqQl8ZPs-iKomXMWYWpEknigBijIHbBvsl9tJM1kU';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const MODEL_NAME = "gemini-3-flash-preview";

let ai;
let storyData = [];
let currentIndex = 0;
let currentUser = null;
let currentLessonId = null;
let currentTab = 'practice';
let currentNoteId = null;
let noteToDelete = null;

// ============================================
// AUTH
// ============================================
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        await ensureProfile();
        showUserNav();
        loadUserStats();
    } else {
        showGuestNav();
    }
}

async function ensureProfile() {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

    if (error && error.code === 'PGRST116') {
        await supabase.from('profiles').insert({
            id: currentUser.id,
            email: currentUser.email,
            full_name: currentUser.email.split('@')[0],
            avatar_url: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.email)
        });
    }
}

function showGuestNav() {
    document.getElementById('guestNav').style.display = 'flex';
    document.getElementById('userNav').style.display = 'none';
}

function showUserNav() {
    document.getElementById('guestNav').style.display = 'none';
    document.getElementById('userNav').style.display = 'flex';

    const displayName = currentUser.email.split('@')[0];
    document.getElementById('userName').textContent = displayName;
    document.getElementById('userAvatar').src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.email);
}

async function loadUserStats() {
    const { data } = await supabase
        .from('profiles')
        .select('total_score, total_lessons')
        .eq('id', currentUser.id)
        .single();

    if (data) {
        document.getElementById('userStats').textContent =
            `${data.total_score} pts • ${data.total_lessons} lessons`;
    }
}

window.openLoginModal = () => {
    document.getElementById('loginModal').style.display = 'flex';
    document.getElementById('emailInput').value = '';
    document.getElementById('passwordInput').value = '';
    hideAuthError();
};

window.closeLoginModal = () => {
    document.getElementById('loginModal').style.display = 'none';
    hideAuthError();
};

window.togglePasswordVisibility = () => {
    const passwordInput = document.getElementById('passwordInput');
    const toggleIcon = document.getElementById('passwordToggleIcon');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
};

function showAuthError(message) {
    const errorEl = document.getElementById('authError');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

function hideAuthError() {
    const errorEl = document.getElementById('authError');
    errorEl.style.display = 'none';
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePassword(password) {
    return password.length >= 6;
}

window.handleLogin = async () => {
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;

    hideAuthError();

    if (!email || !password) {
        showAuthError('⚠️ Vui lòng nhập đầy đủ email và password');
        return;
    }

    if (!validateEmail(email)) {
        showAuthError('⚠️ Email không hợp lệ');
        return;
    }

    if (!validatePassword(password)) {
        showAuthError('⚠️ Password phải có ít nhất 6 ký tự');
        return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        if (error.message.includes('Invalid login credentials')) {
            showAuthError('❌ Email hoặc password không đúng');
        } else {
            showAuthError('❌ Lỗi đăng nhập: ' + error.message);
        }
        return;
    }
};

window.handleRegister = async () => {
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;

    hideAuthError();

    if (!email || !password) {
        showAuthError('⚠️ Vui lòng nhập đầy đủ email và password');
        return;
    }

    if (!validateEmail(email)) {
        showAuthError('⚠️ Email không hợp lệ');
        return;
    }

    if (!validatePassword(password)) {
        showAuthError('⚠️ Password phải có ít nhất 6 ký tự');
        return;
    }

    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            emailRedirectTo: window.location.origin
        }
    });

    if (error) {
        if (error.message.includes('User already registered')) {
            showAuthError('⚠️ Email này đã được đăng ký. Vui lòng đăng nhập.');
        } else {
            showAuthError('❌ Lỗi đăng ký: ' + error.message);
        }
        return;
    }

    if (data.user && !data.session) {
        showAuthError('✅ Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.');
    }
};

window.logout = async () => {
    await supabase.auth.signOut();
    currentUser = null;
    showGuestNav();
    if (currentTab !== 'practice') {
        switchTab('practice');
    }
};

supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        currentUser = session.user;
        ensureProfile().then(() => {
            showUserNav();
            loadUserStats();
            closeLoginModal();
        });
    } else {
        showGuestNav();
    }
});

// ============================================
// TAB SWITCHING
// ============================================
window.switchTab = async (tab) => {
    if ((tab === 'leaderboard' || tab === 'notes') && !currentUser) {
        openLoginModal();
        return;
    }

    currentTab = tab;

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    document.getElementById('practiceTab').style.display = 'none';
    document.getElementById('leaderboardContent').style.display = 'none';
    document.getElementById('notesContent').style.display = 'none';

    if (tab === 'practice') {
        document.getElementById('practiceTab').style.display = 'grid';
    } else if (tab === 'leaderboard') {
        document.getElementById('leaderboardContent').style.display = 'block';
        await loadLeaderboard();
    } else if (tab === 'notes') {
        document.getElementById('notesContent').style.display = 'block';
        await loadNotesList();
    }
};

// ============================================
// LEADERBOARD
// ============================================
async function loadLeaderboard() {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('total_score', { ascending: false })
        .limit(50);

    const container = document.getElementById('leaderboardList');

    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-trophy"></i>
                <h3>No Data Yet</h3>
                <p>Be the first to complete a lesson!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = data.map((user, index) => {
        const rank = index + 1;
        const rankDisplay = 'Rank ' + rank;

        return `
            <div class="leaderboard-item slide-in" style="animation-delay: ${index * 0.05}s;">
                <div class="rank ${index < 3 ? 'rank-' + (index + 1) : 'rank-other'}">
                    ${rankDisplay}
                </div>
                <img class="leaderboard-avatar" src="${user.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.email)}" alt="Avatar">
                <div class="leaderboard-info">
                    <div class="leaderboard-name">${user.full_name || user.email}</div>
                    <div class="leaderboard-stats">${user.total_lessons} lessons completed</div>
                </div>
                <div class="leaderboard-score">${user.total_score} <span style="font-size: 0.75rem; color: var(--text-secondary);">pts</span></div>
            </div>
        `;
    }).join('');
}

// ============================================
// NOTES
// ============================================
async function loadNotesList() {
    if (!currentUser) return;

    const { data, error } = await supabase
        .from('user_notes')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('updated_at', { ascending: false });

    const container = document.getElementById('notesList');

    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-sticky-note"></i>
                <h3>Chưa có ghi chú nào</h3>
                <p>Nhấn "New" để tạo ghi chú đầu tiên!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = data.map((note, index) => {
        const date = new Date(note.updated_at).toLocaleDateString('vi-VN');
        const time = new Date(note.updated_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const preview = note.note_content ? note.note_content.substring(0, 100) : 'Không có nội dung';

        return `
            <div class="note-item slide-in" style="animation-delay: ${index * 0.05}s;" onclick="editNote('${note.id}')">
                <button class="note-item-menu-btn" onclick="event.stopPropagation(); toggleNoteMenu(event, '${note.id}')">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
                <div class="note-menu-dropdown" id="note-menu-${note.id}">
                    <button class="note-menu-item danger" onclick="event.stopPropagation(); deleteNotePrompt('${note.id}')">
                        <i class="fas fa-trash"></i>
                        Xóa ghi chú
                    </button>
                </div>
                <div class="note-item-header">
                    <div class="note-item-title">${note.title || 'Không có tiêu đề'}</div>
                    <div class="note-item-date">${date} • ${time}</div>
                </div>
                <div class="note-item-preview">${preview}</div>
            </div>
        `;
    }).join('');

    document.addEventListener('click', closeAllNoteMenus);

    document.getElementById('notesListView').style.display = 'block';
    document.getElementById('notesEditorView').style.display = 'none';
}

window.createNewNote = () => {
    currentNoteId = null;
    document.getElementById('noteTitle').value = '';
    document.getElementById('notesTextarea').value = '';
    document.getElementById('editorTitle').textContent = 'New Note';

    document.getElementById('notesListView').style.display = 'none';
    document.getElementById('notesEditorView').style.display = 'block';

    updateCharCount();
};

window.editNote = async (noteId) => {
    const { data, error } = await supabase
        .from('user_notes')
        .select('*')
        .eq('id', noteId)
        .single();

    if (data) {
        currentNoteId = noteId;
        document.getElementById('noteTitle').value = data.title || '';
        document.getElementById('notesTextarea').value = data.note_content || '';
        document.getElementById('editorTitle').textContent = 'Edit Note';

        document.getElementById('notesListView').style.display = 'none';
        document.getElementById('notesEditorView').style.display = 'block';

        updateCharCount();
    }
};

window.saveNote = async () => {
    if (!currentUser) {
        openLoginModal();
        return;
    }

    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('notesTextarea').value.trim();

    if (!title) {
        alert('⚠️ Vui lòng nhập tiêu đề!');
        return;
    }

    if (content.length > 2000) {
        alert('⚠️ Nội dung không được vượt quá 2000 ký tự!');
        return;
    }

    try {
        if (currentNoteId) {
            // Update existing note
            const { error } = await supabase
                .from('user_notes')
                .update({
                    title: title,
                    note_content: content,
                    updated_at: new Date().toISOString()
                })
                .eq('id', currentNoteId);

            if (error) throw error;
        } else {
            // Create new note
            const { error } = await supabase
                .from('user_notes')
                .insert({
                    user_id: currentUser.id,
                    title: title,
                    note_content: content
                });

            if (error) throw error;
        }

        await loadNotesList();
    } catch (error) {
        alert('❌ Lỗi khi lưu ghi chú: ' + error.message);
    }
};

window.backToNotesList = () => {
    loadNotesList();
};

window.toggleNoteMenu = (event, noteId) => {
    event.stopPropagation();
    const menu = document.getElementById(`note-menu-${noteId}`);
    const allMenus = document.querySelectorAll('.note-menu-dropdown');

    allMenus.forEach(m => {
        if (m.id !== `note-menu-${noteId}`) {
            m.classList.remove('active');
        }
    });

    menu.classList.toggle('active');
};

function closeAllNoteMenus(event) {
    if (event.target.closest('.note-item-menu-btn') || event.target.closest('.note-menu-dropdown')) {
        return;
    }

    const allMenus = document.querySelectorAll('.note-menu-dropdown');
    allMenus.forEach(m => m.classList.remove('active'));
}

window.deleteNotePrompt = (noteId) => {
    noteToDelete = noteId;
    document.getElementById('confirmModal').style.display = 'flex';
};

window.closeConfirmModal = () => {
    document.getElementById('confirmModal').style.display = 'none';
    noteToDelete = null;
};

window.confirmDeleteNote = async () => {
    if (!noteToDelete) return;

    try {
        const { error } = await supabase
            .from('user_notes')
            .delete()
            .eq('id', noteToDelete);

        if (error) throw error;

        await loadNotesList();
        closeConfirmModal();
    } catch (error) {
        alert('❌ Lỗi khi xóa: ' + error.message);
        closeConfirmModal();
    }
};

function updateCharCount() {
    const textarea = document.getElementById('notesTextarea');
    const charCount = document.getElementById('charCount');
    const currentLength = textarea.value.length;

    charCount.textContent = `${currentLength} / 2000`;

    charCount.classList.remove('warning', 'error');
    if (currentLength > 1800) {
        charCount.classList.add('error');
    } else if (currentLength > 1500) {
        charCount.classList.add('warning');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const notesTextarea = document.getElementById('notesTextarea');
    if (notesTextarea) {
        notesTextarea.addEventListener('input', updateCharCount);
    }
});

// ============================================
// API KEY
// ============================================
let apiKeys = [];
let currentKeyIndex = 0;

window.openSettings = () => {
    const savedKeys = JSON.parse(localStorage.getItem('gemini_api_keys') || '[]');
    apiKeys = savedKeys.length > 0 ? savedKeys : [''];
    renderApiKeySlots();
    document.getElementById('settingsModal').style.display = 'flex';
};

window.closeSettings = () => {
    document.getElementById('settingsModal').style.display = 'none';
};

function renderApiKeySlots() {
    const container = document.getElementById('apiKeysContainer');
    container.innerHTML = apiKeys.map((key, index) => `
        <div style="display: flex; gap: 8px; margin-bottom: 12px; align-items: center;">
            <div style="flex: 1; position: relative;">
                <input type="text" 
                    id="apiKeyInput${index}" 
                    value="${key}"
                    placeholder="Paste your Gemini API key here..."
                    style="width:100%; padding:14px 40px 14px 14px; border-radius:10px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); font-family: 'JetBrains Mono', monospace; font-size: 0.85rem;">
                <span style="position: absolute; right: 14px; top: 50%; transform: translateY(-50%); color: var(--text-secondary); font-size: 0.75rem; font-family: 'JetBrains Mono', monospace;">#${index + 1}</span>
            </div>
            ${apiKeys.length > 1 ? `
                <button onclick="removeApiKeySlot(${index})" style="background: var(--error-color); color: white; border: none; width: 40px; height: 40px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-trash"></i>
                </button>
            ` : ''}
        </div>
    `).join('');
}

window.addApiKeySlot = () => {
    // Save current values before adding new slot
    apiKeys = apiKeys.map((_, index) => {
        return document.getElementById(`apiKeyInput${index}`)?.value || '';
    });
    apiKeys.push('');
    renderApiKeySlots();
};

window.removeApiKeySlot = (index) => {
    // Save current values before removing
    apiKeys = apiKeys.map((_, i) => {
        return document.getElementById(`apiKeyInput${i}`)?.value || '';
    });
    apiKeys.splice(index, 1);
    renderApiKeySlots();
};

window.saveApiKeys = () => {
    const keys = apiKeys.map((_, index) => {
        return document.getElementById(`apiKeyInput${index}`)?.value.trim() || '';
    }).filter(k => k);

    if (keys.length === 0) {
        alert("⚠️ Please add at least one API key!");
        return;
    }

    localStorage.setItem('gemini_api_keys', JSON.stringify(keys));
    apiKeys = keys;
    currentKeyIndex = 0;
    initAI(keys[0]);
    closeSettings();
    alert(`✅ ${keys.length} API key(s) saved!`);
};

function initAI(key) {
    ai = new GoogleGenAI({ apiKey: key });
}

async function callAIWithRotation(prompt) {
    const keys = JSON.parse(localStorage.getItem('gemini_api_keys') || '[]');
    if (keys.length === 0) {
        throw new Error('No API keys configured');
    }

    let lastError = null;
    const startIndex = currentKeyIndex;

    // Try all keys starting from current index
    for (let i = 0; i < keys.length; i++) {
        const keyIndex = (startIndex + i) % keys.length;
        const key = keys[keyIndex];

        try {
            const tempAI = new GoogleGenAI({ apiKey: key });
            const response = await tempAI.models.generateContent({ model: MODEL_NAME, contents: prompt });

            // Success! Update current key index and return
            currentKeyIndex = keyIndex;
            ai = tempAI;
            return response;
        } catch (error) {
            lastError = error;
            console.log(`Key #${keyIndex + 1} failed, trying next...`);

            // If quota error, try next key
            if (error.message && (error.message.includes('quota') || error.message.includes('429'))) {
                continue;
            } else {
                // Other errors, don't rotate
                throw error;
            }
        }
    }

    // All keys failed
    throw new Error(`All API keys exhausted. Last error: ${lastError?.message || 'Unknown error'}`);
}

// ============================================
// LESSON GENERATION
// ============================================
window.generateStory = async () => {
    if (!ai) {
        openSettings();
        return;
    }

    const pastedText = document.getElementById('pasteArea').value.trim();
    if (!pastedText) {
        alert("❌ Please paste Vietnamese text first!");
        return;
    }

    document.getElementById('storyContainer').innerHTML = `
        <div class="empty-state">
            <i class="fas fa-spinner fa-spin"></i>
            <h3>AI is analyzing...</h3>
            <p>Please wait</p>
        </div>
    `;

    const prompt = `
        Translate Vietnamese to English. You are a native English speaker with perfect grammar.
        
        CRITICAL GRAMMAR RULES - NO EXCEPTIONS:
        - Use correct verb tenses (past/present/future)
        - Subject-verb agreement (he/she/it + verb+s)
        - Correct articles: a/an (indefinite), the (definite)
        - Proper prepositions (on/in/at/to/for)
        - Natural word order
        - Check EVERY sentence for grammar errors before output
        
        Output JSON: {"sentences": [{"vi": "text,", "en_best": "translation", "phrase_breakdown": [{"phrase": "phrase", "meaning": "nghĩa"}]}]}
        
        Requirements:
        1. Keep Vietnamese text with punctuation
        2. English must be: GRAMMATICALLY PERFECT + sound natural
        3. Break into 3-5 phrases with meanings
        
        Example:
        Input: "Mặt trời mọc lên từ từ trên ngôi làng yên tĩnh."
        Output: {"sentences": [{"vi": "Mặt trời mọc lên từ từ trên ngôi làng yên tĩnh.", "en_best": "The sun rose slowly over the quiet village.", "phrase_breakdown": [{"phrase": "The sun", "meaning": "mặt trời"}, {"phrase": "rose slowly", "meaning": "mọc lên từ từ"}, {"phrase": "over the quiet village", "meaning": "trên ngôi làng yên tĩnh"}]}]}
        
        Input: "${pastedText}"
    `;

    try {
        const response = await callAIWithRotation(prompt);
        const jsonText = response.text.replace(/```json|```/g, '').trim();
        const data = JSON.parse(jsonText);
        storyData = data.sentences;
        currentIndex = 0;

        if (currentUser) {
            const { data: lesson } = await supabase
                .from('lessons')
                .insert({
                    user_id: currentUser.id,
                    vietnamese_text: pastedText,
                    total_sentences: storyData.length,
                    completed_sentences: 0,
                    score: 0,
                    status: 'in_progress'
                })
                .select()
                .single();

            if (lesson) currentLessonId = lesson.id;
        }

        renderStoryUI();

        // Hide paste area and show New button after successful generation
        document.getElementById('pasteAreaContainer').style.display = 'none';
        document.getElementById('btnNew').style.cssText = 'display: inline-flex !important;';
    } catch (e) {
        alert("ERROR: " + e.message);
        document.getElementById('storyContainer').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Generation Failed</h3>
                <p>${e.message}</p>
            </div>
        `;
    }
};

// Show paste area function
window.showPasteArea = () => {
    document.getElementById('pasteAreaContainer').style.display = 'block';
    document.getElementById('btnNew').style.cssText = 'display: none !important;';
    document.getElementById('pasteArea').value = '';
    document.getElementById('pasteArea').focus();
};

function renderStoryUI() {
    const container = document.getElementById('storyContainer');
    container.innerHTML = '';

    storyData.forEach((item, index) => {
        const span = document.createElement('span');
        // Hiển thị tiếng Anh cho câu đã làm, tiếng Việt cho câu chưa làm
        if (index < currentIndex) {
            span.innerText = item.en_best + " ";
        } else {
            span.innerText = item.vi + " ";
        }
        span.classList.add('sentence');

        if (index < currentIndex) span.classList.add('done');
        else if (index === currentIndex) span.classList.add('active');
        else span.classList.add('pending');

        container.appendChild(span);
    });

    document.getElementById('userInput').value = '';
    document.getElementById('userInput').disabled = false;
    document.getElementById('userInput').focus();
    document.getElementById('btnCheck').style.display = 'flex';
    document.getElementById('btnBack').style.display = 'none';
    document.getElementById('btnStartOver').style.display = 'none';
    document.getElementById('btnRetry').style.display = 'none';
    document.getElementById('btnNext').style.display = 'none';

    // Show/hide Previous button based on current index
    if (currentIndex > 0) {
        document.getElementById('btnPrevious').style.display = 'flex';
    } else {
        document.getElementById('btnPrevious').style.display = 'none';
    }

    // Hide feedback when moving to new sentence
    document.getElementById('feedbackBox').innerHTML = `
        <div class="empty-state">
            <i class="fas fa-lightbulb"></i>
            <h3>Check your answer</h3>
            <p>Submit your translation to see feedback</p>
        </div>
    `;

    updateProgress();
}

function updateProgress() {
    document.getElementById('currentStep').innerText = currentIndex + 1;
    document.getElementById('totalSteps').innerText = storyData.length;
    document.getElementById('progressFill').style.width =
        `${(currentIndex / storyData.length) * 100}%`;
}

window.checkCurrentSentence = async () => {
    const currentData = storyData[currentIndex];
    const userAnswer = document.getElementById('userInput').value.trim();

    if (currentUser && currentLessonId) {
        await supabase.from('lesson_attempts').insert({
            lesson_id: currentLessonId,
            user_id: currentUser.id,
            sentence_index: currentIndex,
            vietnamese_sentence: currentData.vi,
            correct_answer: currentData.en_best,
            user_answer: userAnswer,
            is_correct: false,
            attempts: 1
        });
    }

    // Use phrase_breakdown from AI response
    const phraseBreakdowns = currentData.phrase_breakdown || [];

    const phrasesHTML = phraseBreakdowns.map(item => {
        return `
            <div style="padding: 12px 0; border-bottom: 1px solid var(--border-color);">
                <div style="font-weight: 500; font-size: 1rem;">
                    <span style="color: #34d399; font-weight: 600;">${item.phrase}</span><span style="color: var(--text-secondary);">:</span> <span style="color: #c4b5fd;">${item.meaning}</span>
                </div>
            </div>
        `;
    }).join('');

    let feedbackHTML = `
        <div>
            <div style="color: var(--text-highlight); font-weight: bold; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-check-circle"></i> Answer:
            </div>
            <div style="background: var(--bg-secondary); padding: 20px; border-radius: 12px; margin-bottom: 16px;">
                <div style="color: #34d399; font-size: 1.2rem; font-weight: 600;">
                    ${currentData.en_best}
                </div>
            </div>
            <div style="color: var(--text-highlight); font-weight: bold; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-book"></i> Vocabulary:
            </div>
            <div style="background: var(--bg-secondary); padding: 20px; border-radius: 12px;">
                ${phrasesHTML}
            </div>
        </div>
    `;

    document.getElementById('feedbackBox').innerHTML = feedbackHTML;
    document.getElementById('btnCheck').style.display = 'none';
    document.getElementById('btnPrevious').style.display = 'none';
    document.getElementById('btnBack').style.display = 'flex';
    document.getElementById('btnStartOver').style.display = 'flex';
    document.getElementById('btnRetry').style.display = 'flex';
    document.getElementById('btnNext').style.display = 'flex';
    document.getElementById('userInput').disabled = true;
};

// Text-to-Speech function for phrases
window.speakPhrase = (phrase) => {
    const cleanPhrase = phrase.trim();
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanPhrase)}&tl=en&client=tw-ob`;

    const audio = document.createElement('audio');
    audio.src = url;
    audio.setAttribute('preload', 'auto');
    audio.setAttribute('crossorigin', 'anonymous');

    // Play khi sẵn sàng
    audio.addEventListener('canplaythrough', () => {
        audio.play().catch(e => console.error("Lỗi phát:", e));
    }, { once: true });

    audio.load();
};

window.retrySentence = () => {
    document.getElementById('userInput').value = '';
    document.getElementById('userInput').disabled = false;
    document.getElementById('userInput').focus();
    document.getElementById('btnCheck').style.display = 'flex';
    document.getElementById('btnBack').style.display = 'none';
    document.getElementById('btnStartOver').style.display = 'none';
    document.getElementById('btnRetry').style.display = 'none';
    document.getElementById('btnNext').style.display = 'none';

    // Reset feedback to empty state
    document.getElementById('feedbackBox').innerHTML = `
        <div class="empty-state">
            <i class="fas fa-lightbulb"></i>
            <h3>Check your answer</h3>
            <p>Submit your translation to see feedback</p>
        </div>
    `;
};

window.startOver = () => {
    currentIndex = 0;
    renderStoryUI();
};

window.previousSentence = () => {
    if (currentIndex > 0) {
        currentIndex--;
        renderStoryUI();
    }
};

window.nextSentence = async () => {
    if (currentIndex < storyData.length - 1) {
        currentIndex++;
        renderStoryUI();
    } else {
        if (currentUser && currentLessonId) {
            const score = storyData.length * 10;

            await supabase
                .from('lessons')
                .update({
                    completed_sentences: storyData.length,
                    score: score,
                    status: 'completed',
                    completed_at: new Date().toISOString()
                })
                .eq('id', currentLessonId);

            alert("🎉 CONGRATULATIONS! You earned " + score + " points!");
            await loadUserStats();
        } else {
            alert("🎉 CONGRATULATIONS! Sign in to save your progress!");
        }

        document.getElementById('progressFill').style.width = '100%';
    }
};

window.onload = () => {
    // Migrate old single key to new multi-key format
    const oldKey = localStorage.getItem('gemini_api_key');
    const savedKeys = localStorage.getItem('gemini_api_keys');

    if (!savedKeys && oldKey) {
        // Migrate old format to new
        localStorage.setItem('gemini_api_keys', JSON.stringify([oldKey]));
        localStorage.removeItem('gemini_api_key');
    }

    const keys = JSON.parse(localStorage.getItem('gemini_api_keys') || '[]');
    if (keys.length > 0) {
        apiKeys = keys;
        initAI(keys[0]);
    }

    checkAuth();
