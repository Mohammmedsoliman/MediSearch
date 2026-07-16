document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const resultsGrid = document.getElementById('resultsGrid');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const errorMessage = document.getElementById('errorMessage');
    const resultsActions = document.getElementById('resultsActions');
    const resultsCount = document.getElementById('resultsCount');
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    const themeToggle = document.getElementById('themeToggle');
    const recentSearchesContainer = document.getElementById('recentSearchesContainer');
    const recentTags = document.getElementById('recentTags');

    const searchBox = document.querySelector('.search-box');
    const suggestionsBox = document.createElement('div');
    suggestionsBox.className = 'suggestions-box';
    suggestionsBox.style.cssText = 'position: absolute; top: 100%; left: 0; right: 0; background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 12px; margin-top: 8px; box-shadow: var(--shadow-lg); z-index: 1000; max-height: 250px; overflow-y: auto; display: none; text-align: left; direction: ltr;';
    searchBox.style.position = 'relative'; 
    searchBox.appendChild(suggestionsBox);

    let currentQuery = '';
    const SEARCH_HISTORY_KEY = 'medisearch_history';

    initTheme();
    loadSearchHistory();

    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            suggestionsBox.style.display = 'none';
            handleSearch();
        }
    });
    
    let autocompleteTimeout;
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        clearTimeout(autocompleteTimeout);

        if (query.length < 3) {
            suggestionsBox.style.display = 'none';
            return;
        }

        autocompleteTimeout = setTimeout(async () => {
            try {
                const response = await fetch(`/search?q=${encodeURIComponent(query)}`);
                const data = await response.json();
                
                if (data.success && data.results.length > 0) {
                    showSuggestions(data.results, query);
                } else {
                    suggestionsBox.style.display = 'none';
                }
            } catch (error) {
                suggestionsBox.style.display = 'none';
            }
        }, 600);
    });

    document.addEventListener('click', (e) => {
        if (!searchBox.contains(e.target)) {
            suggestionsBox.style.display = 'none';
        }
    });

    themeToggle.addEventListener('click', toggleTheme);

    async function handleSearch() {
        const query = searchInput.value.trim();
        if (!query) return;

        currentQuery = query;
        updateUIState('loading');
        saveToHistory(query);
        suggestionsBox.style.display = 'none';

        try {
            const response = await fetch(`/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Failed to fetch data');

            if (data.results.length === 0) {
                updateUIState('no-results', 'لا توجد أدوية مطابقة لبحثك في قواعد البيانات.');
            } else {
                renderResults(data.results, query);
                updateUIState('success', data.results.length);
            }
        } catch (error) {
            updateUIState('error', error.message);
        }
    }

    function showSuggestions(results, keyword) {
        suggestionsBox.innerHTML = '';
        const uniqueBrands = [...new Set(results.map(r => r.brand_name))].slice(0, 6);

        if (uniqueBrands.length === 0) {
            suggestionsBox.style.display = 'none';
            return;
        }

        uniqueBrands.forEach(brand => {
            const item = document.createElement('div');
            item.style.cssText = 'padding: 12px 16px; cursor: pointer; border-bottom: 1px solid var(--border-color); color: var(--text-main); font-weight: 600; font-size: 1rem; transition: background 0.2s;';
            
            const regex = new RegExp(`(${keyword})`, 'gi');
            item.innerHTML = brand.replace(regex, '<mark style="background: transparent; color: var(--primary-color); padding: 0;">$1</mark>');

            item.addEventListener('mouseover', () => item.style.backgroundColor = 'var(--primary-light)');
            item.addEventListener('mouseout', () => item.style.backgroundColor = 'transparent');

            item.addEventListener('click', () => {
                searchInput.value = brand;
                suggestionsBox.style.display = 'none';
                handleSearch();
            });
            suggestionsBox.appendChild(item);
        });
        
        suggestionsBox.style.display = 'block';
    }

    function renderResults(results, keyword) {
        resultsGrid.innerHTML = '';
        
        results.forEach(drug => {
            const card = document.createElement('div');
            card.className = 'card';
            
            const name = drug.brand_name || 'Unknown';
            const activeIngredient = drug.generic_name || '-';
            
            let company = '-';
            if (drug.company) company = drug.company;
            else if (drug.description) company = drug.description.replace('Company: ', '');
            
            let price = 'N/A';
            if (drug.price) price = drug.price;
            else if (drug.side_effects && drug.side_effects.length > 0) {
                price = drug.side_effects[0].replace('Price: ', '').replace(' EGP', '');
            }

            const copyData = ` الدواء: ${name}\n المادة الفعالة: ${activeIngredient}\n الشركة: ${company}\n السعر: ${price} EGP\n\n تم البحث عبر MediSearch`;

            card.innerHTML = `
                <div class="card-content" style="direction: ltr; text-align: left;">
                    <h3 class="drug-name" style="font-size: 1.1rem; font-weight: 800; color: var(--primary-color); margin-bottom: 0.5rem; line-height: 1.4;">${name}</h3>
                    <span class="price-tag" style="display: inline-block; background-color: #DCFCE7; color: #166534; padding: 4px 12px; border-radius: 20px; font-weight: 800; font-size: 0.95rem; margin-bottom: 1.5rem;">${price} EGP</span>
                    
                    <div class="info-group" style="margin-bottom: 1rem;">
                        <span class="info-label" style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 0.2rem;">Active Ingredient</span>
                        <span class="info-value" style="font-size: 0.95rem; font-weight: 600; color: var(--text-main); line-height: 1.4;">${activeIngredient}</span>
                    </div>
                    
                    <div class="info-group" style="margin-bottom: 1rem;">
                        <span class="info-label" style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 0.2rem;">Company</span>
                        <span class="info-value" style="font-size: 0.95rem; font-weight: 600; color: var(--text-main); line-height: 1.4;">${company}</span>
                    </div>
                </div>
                <button class="copy-btn" data-info="${encodeURIComponent(copyData)}" style="width: 100%; background-color: var(--primary-light); color: var(--primary-color); border: none; padding: 0.8rem; border-radius: 10px; font-weight: 700; cursor: pointer; transition: all 0.2s ease;">
                    نسخ البيانات
                </button>
            `;
            resultsGrid.appendChild(card);
        });

        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const textToCopy = decodeURIComponent(e.currentTarget.getAttribute('data-info'));
                
                const onSuccess = () => {
                    const originalText = e.currentTarget.innerText;
                    e.currentTarget.innerText = 'تم النسخ بنجاح! ✔️';
                    e.currentTarget.style.backgroundColor = '#10B981'; 
                    e.currentTarget.style.color = 'white';
                    setTimeout(() => {
                        e.currentTarget.innerText = originalText;
                        e.currentTarget.style.backgroundColor = 'var(--primary-light)';
                        e.currentTarget.style.color = 'var(--primary-color)';
                    }, 2000);
                };

                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(textToCopy).then(onSuccess).catch(err => {
                        fallbackCopyTextToClipboard(textToCopy, onSuccess);
                    });
                } else {
                    fallbackCopyTextToClipboard(textToCopy, onSuccess);
                }
            });
        });
    }

    function fallbackCopyTextToClipboard(text, onSuccess) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            const successful = document.execCommand('copy');
            if (successful && onSuccess) onSuccess();
        } catch (err) {
            console.error(err);
        }
        document.body.removeChild(textArea);
    }

    exportPdfBtn.addEventListener('click', () => {
        if (typeof html2pdf === 'undefined') {
            alert('يرجى التأكد من إضافة مكتبة html2pdf في ملف index.html');
            return;
        }

        const originalBtnText = exportPdfBtn.innerHTML;
        exportPdfBtn.innerHTML = 'جاري تجهيز الملف... ';
        exportPdfBtn.disabled = true;

        const pdfContainer = document.createElement('div');
        pdfContainer.style.padding = '30px';
        pdfContainer.style.fontFamily = "'Cairo', sans-serif";
        pdfContainer.style.direction = 'rtl';
        pdfContainer.style.backgroundColor = '#ffffff';

        let pdfHTML = `
            <div style="text-align: center; border-bottom: 2px solid #1D4ED8; padding-bottom: 20px; margin-bottom: 30px;">
                <h1 style="color: #1D4ED8; margin: 0; font-size: 32px;">MediSearch</h1>
                <p style="color: #64748B; margin: 5px 0 0 0; font-size: 18px;">نتائج البحث عن: <strong style="color: #0F172A;">${currentQuery}</strong></p>
                <p style="color: #94A3B8; margin: 5px 0 0 0; font-size: 14px;">تاريخ البحث: ${new Date().toLocaleDateString('ar-EG')}</p>
            </div>
            <div style="display: flex; flex-direction: column; gap: 20px;">
        `;

        document.querySelectorAll('.card').forEach(card => {
            const name = card.querySelector('.drug-name').innerText;
            const price = card.querySelector('.price-tag').innerText;
            const values = card.querySelectorAll('.info-value');
            const activeIngredient = values[0].innerText;
            const company = values[1].innerText;

            pdfHTML += `
                <div style="border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; background-color: #F8FAFC;">
                    <div style="direction: ltr; text-align: left;">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E2E8F0; padding-bottom: 10px; margin-bottom: 15px;">
                            <h3 style="color: #1D4ED8; margin: 0; font-size: 20px;">${name}</h3>
                            <span style="background-color: #DCFCE7; color: #166534; padding: 5px 15px; border-radius: 20px; font-weight: bold;">${price}</span>
                        </div>
                        <p style="margin: 0 0 10px 0; color: #0F172A;"><strong>Active Ingredient:</strong> <br><span style="color: #475569;">${activeIngredient}</span></p>
                        <p style="margin: 0; color: #0F172A;"><strong>Company:</strong> <br><span style="color: #475569;">${company}</span></p>
                    </div>
                </div>
            `;
        });

        pdfHTML += `
            </div>
            <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #E2E8F0; color: #94A3B8; font-size: 14px;">
                تم استخراج هذه البيانات آلياً عبر محرك بحث MediSearch
            </div>
        `;
        
        pdfContainer.innerHTML = pdfHTML;

        const opt = {
            margin:       10,
            filename:     `MediSearch_${currentQuery}.pdf`,
            image:        { type: 'jpeg', quality: 1 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(pdfContainer).save().then(() => {
            exportPdfBtn.innerHTML = originalBtnText;
            exportPdfBtn.disabled = false;
        });
    });

    function updateUIState(state, payload = null) {
        loadingSpinner.style.display = 'none';
        errorMessage.style.display = 'none';
        resultsActions.style.display = 'none';
        
        if (state === 'loading') {
            loadingSpinner.style.display = 'block';
            resultsGrid.innerHTML = '';
        } else if (state === 'error' || state === 'no-results') {
            errorMessage.style.display = 'flex';
            errorMessage.querySelector('.msg-text').textContent = payload;
        } else if (state === 'success') {
            resultsActions.style.display = 'flex';
            resultsCount.innerHTML = `تم العثور على <strong class="text-primary">${payload}</strong> نتيجة`;
        }
    }

    function saveToHistory(query) {
        let history = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
        history = history.filter(item => item.toLowerCase() !== query.toLowerCase());
        history.unshift(query);
        if (history.length > 5) history.pop(); 
        
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
        loadSearchHistory();
    }

    function loadSearchHistory() {
        const history = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
        if (history.length > 0) {
            recentSearchesContainer.style.display = 'block';
            recentTags.innerHTML = history.map(tag => 
                `<span class="tag" onclick="document.getElementById('searchInput').value='${tag}'; document.getElementById('searchBtn').click()">${tag}</span>`
            ).join('');
        }
    }

    function initTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }
});