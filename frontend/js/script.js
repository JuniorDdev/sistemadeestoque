// URL base da API (CORRIGIDA para porta 5000)
const API_URL = 'http://localhost:5000';

// Variável para controlar se estamos em modo de busca
let isSearchMode = false;
let currentSearchQuery = '';

// Função para carregar produtos do backend
async function loadProducts() {
    console.log('Carregando produtos...');
    isSearchMode = false;
    currentSearchQuery = '';
    
    try {
        const response = await fetch(`${API_URL}/api/products`);
        
        console.log('Resposta do servidor:', response.status);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const products = await response.json();
        console.log('Produtos carregados:', products);
        
        displayProducts(products);
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        showNotification('Erro ao carregar produtos: ' + error.message, 'error');
        
        const tableBody = document.getElementById('productsTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; color: red;">
                        ⚠️ ATENÇÃO: Servidor não está rodando em ${API_URL}<br>
                        Abra o terminal na pasta backend e execute: python app.py
                    </td>
                </tr>
            `;
        }
    }
}

// Função para buscar produtos
async function searchProducts(query) {
    console.log('Buscando produtos:', query);
    
    if (!query || query.trim() === '') {
        console.log('Busca vazia, carregando todos produtos');
        await loadProducts();
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/products/search?q=${encodeURIComponent(query)}`);
        
        console.log('Resposta da busca:', response.status);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const products = await response.json();
        console.log('Resultados da busca:', products);
        
        isSearchMode = true;
        currentSearchQuery = query;
        displayProducts(products, true);
        
        if (products.length === 0) {
            showNotification(`Nenhum produto encontrado para: "${query}"`, 'info');
        } else {
            showNotification(`Encontrados ${products.length} produto(s) para: "${query}"`, 'success');
        }
        
    } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        showNotification('Erro ao buscar produtos: ' + error.message, 'error');
    }
}

// Função para buscar produto por código específico
async function searchProductByCode(code) {
    console.log('Buscando produto por código:', code);
    
    try {
        const response = await fetch(`${API_URL}/api/products/code/${encodeURIComponent(code)}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                showNotification(`Código ${code} não encontrado`, 'info');
                return null;
            }
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const product = await response.json();
        console.log('Produto encontrado:', product);
        return product;
        
    } catch (error) {
        console.error('Erro ao buscar por código:', error);
        showNotification('Erro ao buscar produto: ' + error.message, 'error');
        return null;
    }
}

// Função para limpar busca
function clearSearch() {
    console.log('Limpando busca');
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    loadProducts();
}

// Função para exibir produtos na tabela
function displayProducts(products, isSearch = false) {
    const tableBody = document.getElementById('productsTableBody');
    
    if (!tableBody) return;
    
    if (!products || products.length === 0) {
        if (isSearch) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center;">
                        🔍 Nenhum produto encontrado para "${currentSearchQuery}"
                    </td>
                </tr>
            `;
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center;">📦 Nenhum produto cadastrado</td>
                </tr>
            `;
        }
        return;
    }
    
    tableBody.innerHTML = '';
    
    products.forEach(product => {
        const row = document.createElement('tr');
        
        const stockClass = getStockClass(product.quantity);
        const stockText = getStockText(product.quantity);
        
        const categoryHtml = product.category 
            ? `<span class="category-badge">${escapeHtml(product.category)}</span>`
            : '<span class="category-badge">Sem categoria</span>';
        
        row.innerHTML = `
            <td><strong>${product.id}</strong></td>
            <td><strong>${escapeHtml(product.code)}</strong></td>
            <td>${escapeHtml(product.name)}</td>
            <td>${escapeHtml(product.description || '-')}</td>
            <td>R$ ${formatPrice(product.price)}</td>
            <td>
                <span class="stock-status ${stockClass}">${stockText} ${product.quantity}</span>
            </td>
            <td>${categoryHtml}</td>
            <td>
                <button class="btn-edit" onclick="editProduct(${product.id})">✏️ Editar</button>
                <button class="btn-delete" onclick="deleteProduct(${product.id})">🗑️ Excluir</button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    console.log(`${products.length} produtos exibidos na tabela`);
}

function getStockClass(quantity) {
    if (quantity === 0) return 'out';
    if (quantity < 5) return 'low';
    return 'normal';
}

function getStockText(quantity) {
    if (quantity === 0) return '❌ ESGOTADO -';
    if (quantity < 5) return '⚠️ BAIXO -';
    return '✅ OK -';
}

async function addProduct(event) {
    event.preventDefault();
    
    console.log('Tentando adicionar produto...');
    
    const code = document.getElementById('productCode')?.value.trim().toUpperCase();
    const name = document.getElementById('productName')?.value.trim();
    const description = document.getElementById('productDescription')?.value.trim();
    const price = parseFloat(document.getElementById('productPrice')?.value);
    const quantity = parseInt(document.getElementById('productQuantity')?.value) || 0;
    const category = document.getElementById('productCategory')?.value.trim() || '';
    
    console.log('Dados do formulário:', { code, name, description, price, quantity, category });
    
    if (!code) {
        showNotification('❌ Digite o código do produto! Ex: BIK-001', 'error');
        document.getElementById('productCode')?.focus();
        return;
    }
    
    const codePattern = /^[A-Z0-9]{2,6}-[A-Z0-9]{2,6}$/;
    if (!codePattern.test(code)) {
        showNotification('❌ Código inválido! Use formato: XXX-999 (ex: BIK-001)', 'error');
        document.getElementById('productCode')?.focus();
        return;
    }
    
    if (!name) {
        showNotification('❌ Digite o nome do produto!', 'error');
        document.getElementById('productName')?.focus();
        return;
    }
    
    if (name.length < 3) {
        showNotification('❌ Nome do produto deve ter pelo menos 3 caracteres!', 'error');
        document.getElementById('productName')?.focus();
        return;
    }
    
    if (isNaN(price) || price <= 0) {
        showNotification('❌ Digite um preço válido (maior que zero)!', 'error');
        document.getElementById('productPrice')?.focus();
        return;
    }
    
    if (price > 999999.99) {
        showNotification('❌ Preço muito alto! Máximo: R$ 999.999,99', 'error');
        document.getElementById('productPrice')?.focus();
        return;
    }
    
    if (isNaN(quantity) || quantity < 0) {
        showNotification('❌ Quantidade inválida!', 'error');
        document.getElementById('productQuantity')?.focus();
        return;
    }
    
    if (quantity > 999999) {
        showNotification('❌ Quantidade muito alta! Máximo: 999.999 unidades', 'error');
        document.getElementById('productQuantity')?.focus();
        return;
    }
    
    const productData = {
        code: code,
        name: name,
        description: description || '',
        price: price,
        quantity: quantity,
        category: category
    };
    
    console.log('Enviando dados:', productData);
    
    const submitBtn = document.querySelector('.btn-submit');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Adicionando...';
    }
    
    try {
        const response = await fetch(`${API_URL}/api/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(productData)
        });
        
        console.log('Resposta do servidor:', response.status);
        
        const data = await response.json();
        console.log('Resposta:', data);
        
        if (!response.ok) {
            throw new Error(data.error || 'Erro ao adicionar produto');
        }
        
        showNotification('✅ Produto adicionado com sucesso!', 'success');
        
        document.getElementById('productForm').reset();
        
        if (isSearchMode) {
            clearSearch();
        } else {
            await loadProducts();
        }
        
    } catch (error) {
        console.error('Erro ao adicionar produto:', error);
        showNotification('❌ ' + error.message, 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '➕ Adicionar Produto';
        }
    }
}

async function editProduct(id) {
    console.log(`Editando produto ID: ${id}`);
    
    try {
        const response = await fetch(`${API_URL}/api/products`);
        const products = await response.json();
        const product = products.find(p => p.id === id);
        
        if (!product) {
            showNotification('Produto não encontrado!', 'error');
            return;
        }
        
        const newCode = prompt('Editar Código (formato: XXX-999):', product.code);
        if (newCode !== null && newCode !== product.code) {
            const codePattern = /^[A-Z0-9]{2,6}-[A-Z0-9]{2,6}$/;
            if (!codePattern.test(newCode.toUpperCase())) {
                showNotification('❌ Código inválido! Use formato: XXX-999', 'error');
                return;
            }
            await updateProductField(id, 'code', newCode.toUpperCase());
        }
        
        const newName = prompt('Editar Nome:', product.name);
        if (newName !== null && newName !== product.name) {
            if (newName.length < 3) {
                showNotification('❌ Nome deve ter pelo menos 3 caracteres!', 'error');
                return;
            }
            await updateProductField(id, 'name', newName);
        }
        
        const newPrice = prompt('Editar Preço (R$):', product.price);
        if (newPrice !== null && parseFloat(newPrice) !== product.price) {
            const priceNum = parseFloat(newPrice);
            if (isNaN(priceNum) || priceNum <= 0) {
                showNotification('❌ Preço inválido!', 'error');
                return;
            }
            await updateProductField(id, 'price', priceNum);
        }
        
        const newQuantity = prompt('Editar Quantidade:', product.quantity);
        if (newQuantity !== null && parseInt(newQuantity) !== product.quantity) {
            const quantityNum = parseInt(newQuantity);
            if (isNaN(quantityNum) || quantityNum < 0) {
                showNotification('❌ Quantidade inválida!', 'error');
                return;
            }
            await updateProductField(id, 'quantity', quantityNum);
        }
        
        const newCategory = prompt('Editar Categoria:', product.category || '');
        if (newCategory !== null && newCategory !== (product.category || '')) {
            await updateProductField(id, 'category', newCategory);
        }
        
        const newDescription = prompt('Editar Descrição:', product.description || '');
        if (newDescription !== null && newDescription !== (product.description || '')) {
            await updateProductField(id, 'description', newDescription);
        }
        
        if (isSearchMode && currentSearchQuery) {
            await searchProducts(currentSearchQuery);
        } else {
            await loadProducts();
        }
        
    } catch (error) {
        console.error('Erro ao editar produto:', error);
        showNotification('❌ Erro ao editar produto!', 'error');
    }
}

async function updateProductField(id, field, value) {
    try {
        const updateData = {};
        updateData[field] = value;
        
        const response = await fetch(`${API_URL}/api/products/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Erro ao atualizar');
        }
        
        showNotification(`✅ Campo ${field} atualizado com sucesso!`, 'success');
        return true;
        
    } catch (error) {
        console.error('Erro ao atualizar:', error);
        showNotification(`❌ ${error.message}`, 'error');
        return false;
    }
}

async function deleteProduct(id) {
    console.log(`Tentando deletar produto ID: ${id}`);
    
    if (!confirm('⚠️ Tem certeza que deseja excluir este produto?\n\nEsta ação não poderá ser desfeita!')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/products/${id}`, {
            method: 'DELETE'
        });
        
        console.log('Resposta do servidor:', response.status);
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Erro ao deletar produto');
        }
        
        showNotification('🗑️ Produto removido com sucesso!', 'success');
        
        if (isSearchMode && currentSearchQuery) {
            await searchProducts(currentSearchQuery);
        } else {
            await loadProducts();
        }
        
    } catch (error) {
        console.error('Erro ao deletar produto:', error);
        showNotification('❌ ' + error.message, 'error');
    }
}

async function checkServerHealth() {
    try {
        const response = await fetch(`${API_URL}/api/health`);
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Servidor está rodando!', data);
            return true;
        }
    } catch (error) {
        console.error('❌ Servidor não está respondendo:', error);
    }
    return false;
}

function formatPrice(price) {
    if (price === undefined || price === null) return '0,00';
    return price.toFixed(2).replace('.', ',');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.style.display = 'none';
            notification.style.opacity = '1';
        }, 300);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Página carregada, inicializando...');
    console.log(`🔌 Conectando ao servidor em: ${API_URL}`);
    
    const isServerRunning = await checkServerHealth();
    
    if (!isServerRunning) {
        showNotification(`❌ Servidor não está rodando em ${API_URL}! Execute: python app.py`, 'error');
        const tableBody = document.getElementById('productsTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; color: red; padding: 40px;">
                        <strong>⚠️ ATENÇÃO: Servidor não está rodando!</strong><br><br>
                        Para iniciar o sistema:<br>
                        1. Abra o terminal na pasta backend<br>
                        2. Execute o comando: <strong>python app.py</strong><br>
                        3. Aguarde a mensagem: "Running on http://127.0.0.1:5000"<br>
                        4. Recarregue esta página (F5)
                    </td>
                </tr>
            `;
        }
        return;
    }
    
    const form = document.getElementById('productForm');
    if (form) {
        form.addEventListener('submit', addProduct);
        console.log('✅ Formulário configurado');
    }
    
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const clearButton = document.getElementById('clearSearch');
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchProducts(searchInput.value);
            }
        });
        console.log('✅ Busca por tecla ENTER configurada');
    }
    
    if (searchButton) {
        searchButton.addEventListener('click', () => {
            if (searchInput) {
                searchProducts(searchInput.value);
            }
        });
        console.log('✅ Botão de busca configurado');
    }
    
    if (clearButton) {
        clearButton.addEventListener('click', clearSearch);
        console.log('✅ Botão limpar busca configurado');
    }
    
    await loadProducts();
    console.log('✅ Sistema inicializado com sucesso!');
});