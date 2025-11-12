// Chatbot Logs Dashboard JavaScript

class ChatbotDashboard {
    constructor() {
        this.apiEndpoint = '/debug/agent_chats';
        this.availableColumns = new Set(['timestamp', 'mode', 'partner_id']); // Default columns
        this.visibleColumns = new Set(['timestamp', 'mode', 'partner_id']); // Currently visible columns
        this.currentData = [];
        this.activeChatIndex = null; // Track the index of the currently open chat
        
        this.initializeEventListeners();
        this.loadSavedFilters();
        this.loadColumnPreferences();
        this.loadApiConfiguration();
        this.loadMetadataToggleState();
    }

    initializeEventListeners() {
        document.getElementById('getDataBtn').addEventListener('click', () => this.fetchData());
        document.getElementById('clearFiltersBtn').addEventListener('click', () => this.clearFilters());
        
        // Chat history panel events
        document.getElementById('closeChatHistory').addEventListener('click', () => this.closeChatHistory());
        
        // Metadata toggle event
        document.getElementById('metadataToggle').addEventListener('click', () => this.toggleMetadata());
        
        // API configuration change
        document.getElementById('apiBaseUrl').addEventListener('input', () => this.saveApiConfiguration());
        
        // Save filters on input change
        const filterInputs = ['agent_id', 'partner_id', 'assigned_phone_number', 'caller_phone', 'mode', 'timestamp'];
        filterInputs.forEach(inputId => {
            document.getElementById(inputId).addEventListener('input', () => this.saveFilters());
        });
    }

    loadSavedFilters() {
        const savedFilters = localStorage.getItem('chatbotDashboardFilters');
        if (savedFilters) {
            const filters = JSON.parse(savedFilters);
            Object.keys(filters).forEach(key => {
                const element = document.getElementById(key);
                if (element) {
                    element.value = filters[key];
                }
            });
        }
    }

    saveFilters() {
        const filters = {
            agent_id: document.getElementById('agent_id').value,
            partner_id: document.getElementById('partner_id').value,
            assigned_phone_number: document.getElementById('assigned_phone_number').value,
            caller_phone: document.getElementById('caller_phone').value,
            mode: document.getElementById('mode').value,
            timestamp: document.getElementById('timestamp').value
        };
        localStorage.setItem('chatbotDashboardFilters', JSON.stringify(filters));
    }

    loadColumnPreferences() {
        const savedColumns = localStorage.getItem('chatbotDashboardColumns');
        if (savedColumns) {
            this.visibleColumns = new Set(JSON.parse(savedColumns));
        }
    }

    saveColumnPreferences() {
        localStorage.setItem('chatbotDashboardColumns', JSON.stringify([...this.visibleColumns]));
    }

    loadApiConfiguration() {
        const savedApiUrl = localStorage.getItem('chatbotDashboardApiUrl');
        if (savedApiUrl) {
            document.getElementById('apiBaseUrl').value = savedApiUrl;
        }
    }

    saveApiConfiguration() {
        const apiUrl = document.getElementById('apiBaseUrl').value.trim();
        localStorage.setItem('chatbotDashboardApiUrl', apiUrl);
    }

    loadMetadataToggleState() {
        const isOpen = localStorage.getItem('chatbotDashboardMetadataOpen') === 'true';
        this.setMetadataToggleState(isOpen);
    }

    saveMetadataToggleState(isOpen) {
        localStorage.setItem('chatbotDashboardMetadataOpen', isOpen.toString());
    }

    toggleMetadata() {
        const content = document.getElementById('metadataContent');
        const arrow = document.getElementById('metadataArrow');
        
        if (content.classList.contains('hidden')) {
            // Open
            content.classList.remove('hidden');
            arrow.style.transform = 'rotate(180deg)';
            this.saveMetadataToggleState(true);
        } else {
            // Close
            content.classList.add('hidden');
            arrow.style.transform = 'rotate(0deg)';
            this.saveMetadataToggleState(false);
        }
    }

    setMetadataToggleState(isOpen) {
        const content = document.getElementById('metadataContent');
        const arrow = document.getElementById('metadataArrow');
        
        if (isOpen) {
            content.classList.remove('hidden');
            arrow.style.transform = 'rotate(180deg)';
        } else {
            content.classList.add('hidden');
            arrow.style.transform = 'rotate(0deg)';
        }
    }

    getApiUrl() {
        const baseUrl = document.getElementById('apiBaseUrl').value.trim();
        return `${baseUrl}${this.apiEndpoint}`;
    }

    clearFilters() {
        const filterInputs = ['agent_id', 'partner_id', 'assigned_phone_number', 'caller_phone', 'mode', 'timestamp'];
        filterInputs.forEach(inputId => {
            document.getElementById(inputId).value = '';
        });
        this.saveFilters();
    }

    validateFilters() {
        const filters = {
            agent_id: document.getElementById('agent_id').value.trim(),
            partner_id: document.getElementById('partner_id').value.trim(),
            assigned_phone_number: document.getElementById('assigned_phone_number').value.trim(),
            caller_phone: document.getElementById('caller_phone').value.trim(),
            mode: document.getElementById('mode').value,
            timestamp: document.getElementById('timestamp').value
        };

        const hasAtLeastOneFilter = Object.values(filters).some(value => value !== '');
        if (!hasAtLeastOneFilter) {
            this.showError('Please provide at least one filter value');
            return false;
        }
        return true;
    }

    buildQueryString() {
        const filters = {
            agent_id: document.getElementById('agent_id').value.trim(),
            partner_id: document.getElementById('partner_id').value.trim(),
            assigned_phone_number: document.getElementById('assigned_phone_number').value.trim(),
            caller_phone: document.getElementById('caller_phone').value.trim(),
            mode: document.getElementById('mode').value,
            timestamp: document.getElementById('timestamp').value
        };

        const params = new URLSearchParams();
        Object.keys(filters).forEach(key => {
            if (filters[key]) {
                params.append(key, filters[key]);
            }
        });

        return params.toString();
    }

    async fetchData() {
        if (!this.validateFilters()) {
            return;
        }

        this.showLoading(true);
        this.hideError();

        try {
            const queryString = this.buildQueryString();
            const url = `${this.getApiUrl()}?${queryString}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.status === 'success' && data.agent_chats) {
                this.currentData = data.agent_chats;
                this.activeChatIndex = null; // Reset active chat when fetching new data
                this.updateAvailableColumns();
                this.renderResults();
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            this.showError(`Failed to fetch data: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    updateAvailableColumns() {
        // Scan all chat objects to find available fields
        const newColumns = new Set();
        
        this.currentData.forEach(chat => {
            Object.keys(chat).forEach(key => {
                if (key !== 'history' && key !== '_id') { // Exclude history and _id
                    newColumns.add(key);
                }
            });
        });

        this.availableColumns = newColumns;
        this.renderColumnSelector();
    }

    renderColumnSelector() {
        const container = document.getElementById('columnSelector');
        container.innerHTML = '';

        [...this.availableColumns].sort().forEach(column => {
            const isChecked = this.visibleColumns.has(column);
            const checkboxId = `column_${column}`;
            
            const label = document.createElement('label');
            label.className = 'flex items-center space-x-2 cursor-pointer';
            label.innerHTML = `
                <input type="checkbox" id="${checkboxId}" ${isChecked ? 'checked' : ''} 
                       class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                <span class="text-sm text-gray-700">${this.formatColumnName(column)}</span>
            `;
            
            label.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.visibleColumns.add(column);
                } else {
                    this.visibleColumns.delete(column);
                }
                this.saveColumnPreferences();
                this.renderResults();
            });
            
            container.appendChild(label);
        });
    }

    formatColumnName(column) {
        return column.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    renderResults() {
        if (this.currentData.length === 0) {
            this.hideResults();
            return;
        }

        this.renderTableHeader();
        this.renderTableBody();
        this.showResults();
    }

    renderTableHeader() {
        const headerRow = document.getElementById('tableHeader');
        headerRow.innerHTML = '';

        // Add Serial Number column first
        const serialTh = document.createElement('th');
        serialTh.className = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
        serialTh.textContent = '#';
        headerRow.appendChild(serialTh);

        // Add timestamp column second if it's visible
        if (this.visibleColumns.has('timestamp')) {
            const timestampTh = document.createElement('th');
            timestampTh.className = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100';
            timestampTh.textContent = 'Timestamp';
            timestampTh.addEventListener('click', () => this.sortTable('timestamp'));
            headerRow.appendChild(timestampTh);
        }

        // Add message count column third
        const messageCountTh = document.createElement('th');
        messageCountTh.className = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
        messageCountTh.textContent = 'Messages';
        headerRow.appendChild(messageCountTh);

        // Add other columns (excluding timestamp since it's already added)
        [...this.visibleColumns].sort().forEach(column => {
            if (column !== 'timestamp') {
                const th = document.createElement('th');
                th.className = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100';
                th.textContent = this.formatColumnName(column);
                th.addEventListener('click', () => this.sortTable(column));
                headerRow.appendChild(th);
            }
        });

        // Add Actions column
        const actionsTh = document.createElement('th');
        actionsTh.className = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
        actionsTh.textContent = 'Actions';
        headerRow.appendChild(actionsTh);
    }

    renderTableBody() {
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';

        this.currentData.forEach((chat, index) => {
            const row = document.createElement('tr');
            
            // Check if this is the active chat and apply highlight
            const isActive = this.isActiveChat(index);
            if (isActive) {
                row.className = 'active-row hover:bg-blue-200';
            } else {
                row.className = 'hover:bg-gray-50';
            }

            // Add Serial Number column first
            const serialTd = document.createElement('td');
            serialTd.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium';
            serialTd.textContent = index + 1;
            row.appendChild(serialTd);

            // Add timestamp column second if it's visible
            if (this.visibleColumns.has('timestamp')) {
                const timestampTd = document.createElement('td');
                timestampTd.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900';
                
                let timestampValue = chat.timestamp || '';
                if (timestampValue) {
                    // Format timestamp for better readability
                    const date = new Date(timestampValue);
                    timestampValue = date.toLocaleString();
                }
                
                timestampTd.textContent = timestampValue;
                row.appendChild(timestampTd);
            }

            // Add message count column third
            const messageCountTd = document.createElement('td');
            messageCountTd.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center';
            
            let messageCount = 0;
            if (chat.history && Array.isArray(chat.history)) {
                // Count only user and assistant messages, exclude function messages
                messageCount = chat.history.filter(message => 
                    message.role === 'user' || message.role === 'assistant'
                ).length;
            }
            
            messageCountTd.textContent = messageCount;
            row.appendChild(messageCountTd);

            // Add other columns (excluding timestamp since it's already added)
            [...this.visibleColumns].sort().forEach(column => {
                if (column !== 'timestamp') {
                    const td = document.createElement('td');
                    td.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900';
                    
                    let value = chat[column] || '';
                    td.textContent = value;
                    row.appendChild(td);
                }
            });

            // Add Actions column
            const actionsTd = document.createElement('td');
            actionsTd.className = 'px-6 py-4 whitespace-nowrap text-sm font-medium';
            
            const viewButton = document.createElement('button');
            viewButton.className = 'text-blue-600 hover:text-blue-900';
            viewButton.textContent = 'View History';
            viewButton.addEventListener('click', () => this.openChatHistory(chat));
            
            actionsTd.appendChild(viewButton);
            row.appendChild(actionsTd);
            
            tbody.appendChild(row);
        });

        // Update result count
        document.getElementById('resultCount').textContent = 
            `Found ${this.currentData.length} chat${this.currentData.length !== 1 ? 's' : ''}`;
    }

    isActiveChat(index) {
        return this.activeChatIndex !== null && this.activeChatIndex === index;
    }

    updateRowHighlighting() {
        // Re-render table body to update highlighting
        this.renderTableBody();
    }

    openChatHistory(chat) {
        const panel = document.getElementById('chatHistoryPanel');
        const isPanelCurrentlyOpen = !panel.classList.contains('hidden');
        
        // Find the index of the chat in currentData
        const chatIndex = this.currentData.findIndex(c => c === chat);
        this.activeChatIndex = chatIndex !== -1 ? chatIndex : null;
        
        this.currentChat = chat;
        this.displayChatMetadata(chat);
        this.displayChatHistory(chat);
        
        // Update row highlighting
        this.updateRowHighlighting();
        
        // If panel is already open, just update the content (no need to shift again)
        if (!isPanelCurrentlyOpen) {
            this.showChatHistoryPanel();
        }
    }

    showChatHistoryPanel() {
        const panel = document.getElementById('chatHistoryPanel');
        const mainContentWrapper = document.getElementById('mainContentWrapper');
        
        // Show the panel
        panel.classList.remove('hidden');
        
        // Shift main content to the right by 50vw (half viewport width)
        mainContentWrapper.style.marginLeft = '50vw';
    }

    closeChatHistory() {
        const panel = document.getElementById('chatHistoryPanel');
        const mainContentWrapper = document.getElementById('mainContentWrapper');
        
        // Clear active chat
        this.activeChatIndex = null;
        this.updateRowHighlighting();
        
        // Shift main content back to original position
        mainContentWrapper.style.marginLeft = '0';
        
        // Hide panel after transition completes
        setTimeout(() => {
            panel.classList.add('hidden');
        }, 300); // Match the transition duration
    }

    displayChatMetadata(chat) {
        document.getElementById('panelChatId').textContent = chat._id || 'N/A';
        document.getElementById('panelAgentId').textContent = chat.agent_id || 'N/A';
        document.getElementById('panelPartnerId').textContent = chat.partner_id || 'N/A';
        document.getElementById('panelMode').textContent = chat.mode || 'N/A';
        document.getElementById('panelAssignedPhone').textContent = chat.assigned_phone_number || 'N/A';
        document.getElementById('panelCallerPhone').textContent = chat.caller_phone || 'N/A';
        document.getElementById('panelRunId').textContent = chat.run_id || 'N/A';
        document.getElementById('panelRid').textContent = chat.rid || 'N/A';
        
        if (chat.timestamp) {
            const date = new Date(chat.timestamp);
            document.getElementById('panelTimestamp').textContent = date.toLocaleString();
        } else {
            document.getElementById('panelTimestamp').textContent = 'N/A';
        }
    }

    displayChatHistory(chat) {
        if (!chat || !chat.history) {
            document.getElementById('messagesContainer').innerHTML = '<p class="text-gray-500">No chat history available.</p>';
            return;
        }

        const container = document.getElementById('messagesContainer');
        container.innerHTML = '';

        chat.history.forEach((message, index) => {
            const messageElement = this.createMessageElement(message, index);
            container.appendChild(messageElement);
        });

        // Add extra spacing at the bottom to ensure last message is fully visible
        const bottomSpacer = document.createElement('div');
        bottomSpacer.className = 'h-16';
        container.appendChild(bottomSpacer);

        // Scroll to top to show the beginning of the conversation
        setTimeout(() => {
            this.scrollPanelToTop();
        }, 100);
        
        this.setupPanelScrollListener();
    }

    createMessageElement(message, index) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'flex flex-col space-y-2';

        if (message.role === 'user') {
            messageDiv.innerHTML = `
                <div class="flex justify-end">
                    <div class="message-bubble user-message px-4 py-2 rounded-lg">
                        <p class="text-sm">${this.escapeHtml(message.content)}</p>
                    </div>
                </div>
            `;
        } else if (message.role === 'assistant') {
            messageDiv.innerHTML = `
                <div class="flex justify-start">
                    <div class="message-bubble assistant-message px-4 py-2 rounded-lg">
                        <p class="text-sm">${this.escapeHtml(message.content)}</p>
                    </div>
                </div>
            `;
        } else if (message.role === 'agent_messages') {
            messageDiv.innerHTML = `
                <div class="flex justify-start">
                    <div class="message-bubble agent-message px-4 py-2 rounded-lg">
                        <p class="text-sm">${this.escapeHtml(message.content)}</p>
                    </div>
                </div>
            `;
        } else if (message.role === 'filler_message') {
            messageDiv.innerHTML = `
                <div class="flex justify-start">
                    <div class="message-bubble filler-message px-4 py-2 rounded-lg">
                        <p class="text-sm">${this.escapeHtml(message.content)}</p>
                    </div>
                </div>
            `;
        } else if (message.role === 'function') {
            messageDiv.innerHTML = this.createFunctionMessage(message, index);
        }

        return messageDiv;
    }

    createFunctionMessage(message, index) {
        const functionName = message.name || 'Unknown Function';
        const hasContent = message.content && (
            (typeof message.content === 'object' && Object.keys(message.content).length > 0) ||
            (Array.isArray(message.content) && message.content.length > 0)
        );

        if (!hasContent) {
            return `
                <div class="flex justify-start">
                    <div class="message-bubble function-message px-4 py-2 rounded-lg">
                        <p class="text-sm font-medium">Function: ${this.escapeHtml(functionName)}</p>
                        <p class="text-xs mt-1">No content available</p>
                    </div>
                </div>
            `;
        }

        const accordionId = `function_${index}`;
        const contentId = `content_${index}`;
        
        // Store function data for copying
        window.functionPayloads = window.functionPayloads || {};
        window.functionPayloads[accordionId] = message.content;
        
        // Check if this is a function call with arguments and response
        const hasArguments = message.content && message.content.arguments;
        const hasResponse = message.content && (message.content.function_error || 
            (typeof message.content === 'object' && !message.content.arguments));
        
        return `
            <div class="flex justify-start">
                <div class="message-bubble function-message px-4 py-2 rounded-lg w-full">
                    <div class="flex items-center justify-between mb-2">
                        <button 
                            class="flex-1 text-left flex items-center justify-between focus:outline-none"
                            onclick="toggleAccordion('${accordionId}', '${contentId}')"
                        >
                            <span class="text-sm font-medium">Function: ${this.escapeHtml(functionName)}</span>
                            <svg class="w-4 h-4 transform transition-transform" id="icon_${accordionId}">
                                <path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                            </svg>
                        </button>
                        <button 
                            class="ml-2 p-1 text-yellow-700 hover:text-yellow-900 focus:outline-none" 
                            onclick="copyFunctionPayload('${accordionId}')"
                            title="Copy JSON payload"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="accordion-content mt-2" id="${contentId}">
                        ${this.formatFunctionContent(message.content, hasArguments, hasResponse)}
                    </div>
                </div>
            </div>
        `;
    }

    formatFunctionContent(content, hasArguments, hasResponse) {
        let html = '';
        
        if (hasArguments && hasResponse) {
            // Function call with both arguments and response
            html += `<div class="space-y-3">
                <div>
                    <h4 class="text-xs font-semibold text-yellow-800 mb-2">Arguments:</h4>
                    <div class="json-content p-3 rounded text-xs overflow-x-auto">
${this.formatJsonContent(content.arguments)}
                    </div>
                </div>
                <div>
                    <h4 class="text-xs font-semibold text-yellow-800 mb-2">Response:</h4>
                    <div class="json-content p-3 rounded text-xs overflow-x-auto">
${this.formatJsonContent(content.function_error || content)}
                    </div>
                </div>
            </div>`;
        } else if (hasArguments) {
            // Only arguments (function call)
            html += `<div>
                <h4 class="text-xs font-semibold text-yellow-800 mb-2">Arguments:</h4>
                <div class="json-content p-3 rounded text-xs overflow-x-auto">
${this.formatJsonContent(content.arguments)}
                </div>
            </div>`;
        } else {
            // General content (response or other)
            html += `<div class="json-content p-3 rounded text-xs overflow-x-auto">
${this.formatJsonContent(content)}
            </div>`;
        }
        
        return html;
    }

    formatJsonContent(content) {
        try {
            let jsonString;
            
            if (typeof content === 'string') {
                // Try to parse as JSON first
                try {
                    const parsed = JSON.parse(content);
                    jsonString = JSON.stringify(parsed, null, 2);
                } catch {
                    return this.escapeHtml(content);
                }
            } else {
                jsonString = JSON.stringify(content, null, 2);
            }
            
            // Apply syntax highlighting
            return this.syntaxHighlight(jsonString);
        } catch (error) {
            return this.escapeHtml(String(content));
        }
    }

    syntaxHighlight(json) {
        // Simple JSON syntax highlighting
        json = this.escapeHtml(json);
        
        // Highlight different JSON elements
        json = json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
            let cls = 'text-gray-300'; // default
            
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'text-blue-400'; // keys
                } else {
                    cls = 'text-green-400'; // strings
                }
            } else if (/true|false/.test(match)) {
                cls = 'text-yellow-400'; // booleans
            } else if (/null/.test(match)) {
                cls = 'text-red-400'; // null
            } else {
                cls = 'text-purple-400'; // numbers
            }
            
            return `<span class="${cls}">${match}</span>`;
        });
        
        return json;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    sortTable(column) {
        this.currentData.sort((a, b) => {
            const aVal = a[column] || '';
            const bVal = b[column] || '';
            
            if (column === 'timestamp') {
                return new Date(aVal) - new Date(bVal);
            }
            
            return String(aVal).localeCompare(String(bVal));
        });
        
        this.renderTableBody();
    }

    showLoading(show) {
        const indicator = document.getElementById('loadingIndicator');
        indicator.classList.toggle('hidden', !show);
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        errorText.textContent = message;
        errorDiv.classList.remove('hidden');
    }

    hideError() {
        document.getElementById('errorMessage').classList.add('hidden');
    }

    showResults() {
        document.getElementById('resultsSection').classList.remove('hidden');
    }

    hideResults() {
        document.getElementById('resultsSection').classList.add('hidden');
    }

    scrollPanelToTop(smooth = false) {
        const scrollContainer = document.getElementById('panelScrollContainer');
        console.log('scrollPanelToTop called, container:', scrollContainer);
        if (scrollContainer) {
            scrollContainer.scrollTo({
                top: 0,
                behavior: smooth ? 'smooth' : 'auto'
            });
        } else {
            console.error('panelScrollContainer not found');
        }
    }

    scrollPanelToBottom(smooth = false) {
        const scrollContainer = document.getElementById('panelScrollContainer');
        console.log('scrollPanelToBottom called, container:', scrollContainer);
        if (scrollContainer) {
            // Force scroll to the very bottom with a small buffer
            const scrollHeight = scrollContainer.scrollHeight;
            const clientHeight = scrollContainer.clientHeight;
            const maxScrollTop = scrollHeight - clientHeight;
            
            console.log('Scroll values:', { scrollHeight, clientHeight, maxScrollTop });
            
            scrollContainer.scrollTo({
                top: maxScrollTop + 10, // Add 10px buffer to ensure we can see the bottom
                behavior: smooth ? 'smooth' : 'auto'
            });
        } else {
            console.error('panelScrollContainer not found');
        }
    }

    setupPanelScrollListener() {
        const scrollContainer = document.getElementById('panelScrollContainer');
        const scrollToBottomBtn = document.getElementById('panelScrollToBottomBtn');
        
        console.log('setupPanelScrollListener called, container:', scrollContainer, 'button:', scrollToBottomBtn);
        
        if (!scrollContainer || !scrollToBottomBtn) {
            console.error('Scroll container or button not found');
            return;
        }

        // Show/hide scroll to bottom button based on scroll position
        scrollContainer.addEventListener('scroll', () => {
            const isAtBottom = scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 10;
            
            if (isAtBottom) {
                scrollToBottomBtn.classList.add('opacity-0');
            } else {
                scrollToBottomBtn.classList.remove('opacity-0');
            }
        });

        // Add click handler for scroll to bottom button
        scrollToBottomBtn.addEventListener('click', () => {
            console.log('Scroll to bottom button clicked');
            this.scrollPanelToBottom(true); // Use smooth scrolling for user-initiated scrolls
        });
    }
}

// Global function for accordion toggle
function toggleAccordion(accordionId, contentId) {
    const content = document.getElementById(contentId);
    const icon = document.getElementById(`icon_${accordionId}`);
    
    if (content.classList.contains('active')) {
        content.classList.remove('active');
        icon.style.transform = 'rotate(0deg)';
    } else {
        content.classList.add('active');
        icon.style.transform = 'rotate(180deg)';
    }
}

// Global function to copy function payload
function copyFunctionPayload(accordionId) {
    if (!window.functionPayloads || !window.functionPayloads[accordionId]) {
        console.error('Function payload not found for:', accordionId);
        return;
    }
    
    const payload = window.functionPayloads[accordionId];
    
    try {
        // Convert to minified JSON
        const minifiedJson = JSON.stringify(payload);
        
        // Copy to clipboard
        navigator.clipboard.writeText(minifiedJson).then(() => {
            // Show success feedback
            showCopyFeedback(accordionId);
        }).catch(err => {
            console.error('Failed to copy to clipboard:', err);
            // Fallback for older browsers
            fallbackCopyToClipboard(minifiedJson);
        });
    } catch (error) {
        console.error('Error serializing payload:', error);
    }
}

// Fallback copy method for older browsers
function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showCopyFeedback('fallback');
    } catch (err) {
        console.error('Fallback copy failed:', err);
    }
    
    document.body.removeChild(textArea);
}

// Show copy success feedback
function showCopyFeedback(accordionId) {
    // Create or update feedback element
    let feedback = document.getElementById(`copy-feedback-${accordionId}`);
    if (!feedback) {
        feedback = document.createElement('div');
        feedback.id = `copy-feedback-${accordionId}`;
        feedback.className = 'absolute top-0 right-0 bg-green-500 text-white text-xs px-2 py-1 rounded shadow-lg z-10';
        feedback.textContent = 'Copied!';
        
        // Find the function message container
        const functionContainer = document.querySelector(`[onclick*="${accordionId}"]`).closest('.message-bubble');
        functionContainer.style.position = 'relative';
        functionContainer.appendChild(feedback);
    } else {
        feedback.textContent = 'Copied!';
        feedback.className = 'absolute top-0 right-0 bg-green-500 text-white text-xs px-2 py-1 rounded shadow-lg z-10';
    }
    
    // Hide feedback after 2 seconds
    setTimeout(() => {
        if (feedback) {
            feedback.style.opacity = '0';
            feedback.style.transition = 'opacity 0.3s ease-out';
            setTimeout(() => {
                if (feedback && feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
            }, 300);
        }
    }, 2000);
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChatbotDashboard();
});

