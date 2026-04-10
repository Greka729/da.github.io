// script.js

// Глобальные переменные
let currentUser = null
let currentPage = 'home'

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    // Проверяем текущую сессию
    const { data: { session } } = await supabase.auth.getSession()
    currentUser = session?.user || null
    updateAuthButton()
    
    // Настраиваем навигацию
    setupNavigation()
    
    // Загружаем главную страницу
    loadPage('home')
    
    // Подписываемся на изменения аутентификации
    supabase.auth.onAuthStateChange((event, session) => {
        currentUser = session?.user || null
        updateAuthButton()
        
        if (currentPage === 'auth' && currentUser) {
            loadPage('profile')
        }
    })
})

// Настройка навигации
function setupNavigation() {
    document.getElementById('homeBtn').addEventListener('click', () => loadPage('home'))
    document.getElementById('profileBtn').addEventListener('click', () => {
        if (currentUser) {
            loadPage('profile')
        } else {
            loadPage('auth')
        }
    })
    document.getElementById('dataBtn').addEventListener('click', () => loadPage('data'))
    document.getElementById('authBtn').addEventListener('click', () => {
        if (currentUser) {
            showAuthStatus()
        } else {
            loadPage('auth')
        }
    })
}

// Обновление кнопки аутентификации
function updateAuthButton() {
    const authBtn = document.getElementById('authBtn')
    if (currentUser) {
        authBtn.textContent = currentUser.email.split('@')[0]
        authBtn.classList.add('logged-in')
    } else {
        authBtn.textContent = 'Войти'
        authBtn.classList.remove('logged-in')
    }
}

// Загрузка страниц
function loadPage(page) {
    currentPage = page
    
    // Обновляем активную кнопку
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'))
    document.getElementById(page + 'Btn').classList.add('active')
    
    const content = document.getElementById('content')
    const template = document.getElementById(page + '-template')
    
    if (template) {
        content.innerHTML = ''
        content.appendChild(template.content.cloneNode(true))
        
        // Инициализация специфичных для страницы функций
        switch(page) {
            case 'home':
                initHomePage()
                break
            case 'profile':
                initProfilePage()
                break
            case 'data':
                initDataPage()
                break
            case 'auth':
                initAuthPage()
                break
        }
    }
}

// Главная страница
function initHomePage() {
    console.log('Главная страница загружена')
}

// Страница профиля
async function initProfilePage() {
    if (!currentUser) {
        loadPage('auth')
        return
    }
    
    const profileInfo = document.getElementById('profile-info')
    const profileForm = document.getElementById('profile-form')
    
    // Загружаем профиль
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single()
    
    if (profile) {
        profileInfo.innerHTML = `
            <p><strong>Имя:</strong> ${profile.full_name || 'Не указано'}</p>
            <p><strong>Телефон:</strong> ${profile.phone || 'Не указан'}</p>
            <p><strong>Город:</strong> ${profile.city || 'Не указан'}</p>
            <p><strong>Email:</strong> ${currentUser.email}</p>
        `
        
        document.getElementById('fullName').value = profile.full_name || ''
        document.getElementById('phone').value = profile.phone || ''
        document.getElementById('city').value = profile.city || ''
    } else {
        profileInfo.innerHTML = `
            <p><strong>Email:</strong> ${currentUser.email}</p>
            <p>Заполните информацию о себе</p>
        `
    }
    
    profileForm.style.display = 'block'
    
    // Обработчик сохранения профиля
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        
        const profileData = {
            id: currentUser.id,
            full_name: document.getElementById('fullName').value,
            phone: document.getElementById('phone').value,
            city: document.getElementById('city').value,
            updated_at: new Date()
        }
        
        const { error } = await supabase
            .from('profiles')
            .upsert(profileData)
        
        if (error) {
            alert('Ошибка сохранения: ' + error.message)
        } else {
            alert('Профиль сохранен!')
            initProfilePage()
        }
    })
}

// Страница данных
async function initDataPage() {
    await loadItems()
    
    // Обработчик добавления элемента
    document.getElementById('add-item-form').addEventListener('submit', async (e) => {
        e.preventDefault()
        
        if (!currentUser) {
            alert('Необходимо войти в систему')
            loadPage('auth')
            return
        }
        
        const title = document.getElementById('itemTitle').value
        const description = document.getElementById('itemDescription').value
        
        const { error } = await supabase
            .from('items')
            .insert([{
                title,
                description,
                user_id: currentUser.id,
                created_at: new Date()
            }])
        
        if (error) {
            alert('Ошибка добавления: ' + error.message)
        } else {
            document.getElementById('itemTitle').value = ''
            document.getElementById('itemDescription').value = ''
            await loadItems()
        }
    })
}

// Загрузка элементов
async function loadItems() {
    const container = document.getElementById('items-container')
    container.innerHTML = '<p>Загрузка...</p>'
    
    const { data: items, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false })
    
    if (error) {
        container.innerHTML = '<p>Ошибка загрузки данных</p>'
        return
    }
    
    if (items.length === 0) {
        container.innerHTML = '<p>Нет записей. Добавьте первую!</p>'
        return
    }
    
    container.innerHTML = items.map(item => `
        <div class="item-card">
            <h4>${escapeHtml(item.title)}</h4>
            <p>${escapeHtml(item.description || '')}</p>
            <small>Создано: ${new Date(item.created_at).toLocaleString('ru')}</small>
            ${currentUser && item.user_id === currentUser.id ? `
                <div class="item-actions">
                    <button class="btn-small btn-delete" onclick="deleteItem('${item.id}')">Удалить</button>
                </div>
            ` : ''}
        </div>
    `).join('')
}

// Удаление элемента
async function deleteItem(id) {
    if (!confirm('Удалить запись?')) return
    
    const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id)
    
    if (error) {
        alert('Ошибка удаления: ' + error.message)
    } else {
        await loadItems()
    }
}

// Страница аутентификации
function initAuthPage() {
    // Переключение вкладок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab
            
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'))
            
            btn.classList.add('active')
            document.getElementById(tab + '-form').classList.add('active')
        })
    })
    
    // Вход
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault()
        
        const email = document.getElementById('login-email').value
        const password = document.getElementById('login-password').value
        const errorDiv = document.getElementById('login-error')
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        })
        
        if (error) {
            errorDiv.textContent = error.message
        } else {
            loadPage('profile')
        }
    })
    
    // Регистрация
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault()
        
        const email = document.getElementById('register-email').value
        const password = document.getElementById('register-password').value
        const errorDiv = document.getElementById('register-error')
        
        const { data, error } = await supabase.auth.signUp({
            email,
            password
        })
        
        if (error) {
            errorDiv.textContent = error.message
        } else {
            alert('Проверьте email для подтверждения регистрации')
            document.querySelector('[data-tab="login"]').click()
        }
    })
}

// Показать статус аутентификации
function showAuthStatus() {
    if (!currentUser) return
    
    const content = document.getElementById('content')
    const template = document.getElementById('auth-status-template')
    
    content.innerHTML = ''
    content.appendChild(template.content.cloneNode(true))
    
    document.getElementById('user-email').textContent = currentUser.email
    document.getElementById('user-id').textContent = currentUser.id
    
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await supabase.auth.signOut()
        loadPage('home')
    })
}

// Вспомогательная функция для экранирования HTML
function escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}