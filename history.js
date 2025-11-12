// Chat History Page JavaScript

class ChatHistory {
    constructor() {
        this.chatData = null;
        this.apiEndpoint = '/debug/get_chat';
        this.init();
    }

    init() {
        this.loadApiConfiguration();
        this.initializeEventListeners();
        
        // Try to load from sessionStorage first (for backward compatibility)
        this.loadChatData();
        if (this.chatData) {
            this.displayChatMetadata();
            this.displayChatHistory();
        }
    }

    initializeEventListeners() {
        document.getElementById('getDataBtn').addEventListener('click', () => this.fetchChatHistory());
        document.getElementById('apiBaseUrl').addEventListener('input', () => this.saveApiConfiguration());
    }

    loadApiConfiguration() {
        const savedApiUrl = localStorage.getItem('chatHistoryApiUrl');
        if (savedApiUrl) {
            document.getElementById('apiBaseUrl').value = savedApiUrl;
        }
    }

    saveApiConfiguration() {
        const apiUrl = document.getElementById('apiBaseUrl').value.trim();
        localStorage.setItem('chatHistoryApiUrl', apiUrl);
    }

    getApiUrl() {
        const baseUrl = document.getElementById('apiBaseUrl').value.trim();
        return `${baseUrl}${this.apiEndpoint}`;
    }

    loadChatData() {
        try {
            const chatDataString = sessionStorage.getItem('selectedChat');
            if (chatDataString) {
                this.chatData = JSON.parse(chatDataString);
            }
        } catch (error) {
            console.error('Error loading chat data:', error);
            this.chatData = null;
        }
    }

    async fetchChatHistory() {
        const chatId = document.getElementById('chatId').value.trim();
        
        if (!chatId) {
            this.showError('Please enter a chat ID');
            return;
        }

        this.showLoading(true);
        this.hideError();

        try {
            const url = `${this.getApiUrl()}?chat_id=${encodeURIComponent(chatId)}`;
            
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
            
            if (data.status === 'success' && data.get_chat) {
                this.chatData = data.get_chat;
                this.displayChatMetadata();
                this.displayChatHistory();
            } else {
                throw new Error('Invalid response format or chat not found');
            }
        } catch (error) {
            this.showError(`Failed to fetch chat history: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    displayChatMetadata() {
        if (!this.chatData) return;

        // Show metadata section
        document.getElementById('chatMetadata').classList.remove('hidden');

        // Populate metadata fields
        const chatIdElement = document.getElementById('chatIdValue');
        if (chatIdElement) {
            chatIdElement.textContent = this.chatData._id || 'N/A';
        }

        const ridElement = document.getElementById('ridValue');
        if (ridElement) {
            ridElement.textContent = this.chatData.rid || 'N/A';
        }

        document.getElementById('agentId').textContent = this.chatData.agent_id || 'N/A';
        document.getElementById('partnerId').textContent = this.chatData.partner_id || 'N/A';
        document.getElementById('mode').textContent = this.chatData.mode || 'N/A';
        document.getElementById('assignedPhone').textContent = this.chatData.assigned_phone_number || 'N/A';
        document.getElementById('callerPhone').textContent = this.chatData.caller_phone || 'N/A';
        document.getElementById('runId').textContent = this.chatData.run_id || 'N/A';
        
        // Format timestamp
        if (this.chatData.timestamp) {
            const date = new Date(this.chatData.timestamp);
            document.getElementById('timestamp').textContent = date.toLocaleString();
        } else {
            document.getElementById('timestamp').textContent = 'N/A';
        }
    }

    displayChatHistory() {
        const container = document.getElementById('messagesContainer');
        container.innerHTML = '';

        if (!this.chatData || !this.chatData.history || this.chatData.history.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">No chat history available.</p>';
            document.getElementById('chatHistory').classList.remove('hidden');
            return;
        }

        this.chatData.history.forEach((message, index) => {
            const messageElement = this.createMessageElement(message, index);
            container.appendChild(messageElement);
        });

        // Add extra spacing at the bottom to ensure last message is fully visible
        const bottomSpacer = document.createElement('div');
        bottomSpacer.className = 'h-16';
        container.appendChild(bottomSpacer);

        document.getElementById('chatHistory').classList.remove('hidden');
        
        // Scroll to bottom after messages are loaded with a small delay to ensure rendering
        setTimeout(() => {
            this.scrollToBottom();
            // Double-check scroll after a longer delay to ensure function messages are fully rendered
            setTimeout(() => {
                this.scrollToBottom();
            }, 200);
        }, 100);
        this.setupScrollListener();
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
                <div class="flex justify-start mb-4">
                    <div class="message-bubble function-message px-4 py-2 rounded-lg">
                        <p class="text-sm font-medium">Function: ${this.escapeHtml(functionName)}</p>
                        <p class="text-xs mt-1">No content available</p>
                    </div>
                </div>
            `;
        }

        const accordionId = `function_${index}`;
        const contentId = `content_${index}`;
        
        // Check if this is a function call with arguments and response
        const hasArguments = message.content && message.content.arguments;
        const hasResponse = message.content && (message.content.function_error || 
            (typeof message.content === 'object' && !message.content.arguments));
        
        return `
            <div class="flex justify-start mb-4">
                <div class="message-bubble function-message px-4 py-2 rounded-lg w-full">
                    <button 
                        class="w-full text-left flex items-center justify-between focus:outline-none"
                        onclick="toggleAccordion('${accordionId}', '${contentId}')"
                    >
                        <span class="text-sm font-medium">Function: ${this.escapeHtml(functionName)}</span>
                        <svg class="w-4 h-4 transform transition-transform" id="icon_${accordionId}">
                            <path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                        </svg>
                    </button>
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

    scrollToBottom(smooth = false) {
        const scrollContainer = document.getElementById('scrollContainer');
        if (scrollContainer) {
            // Force scroll to the very bottom with a small buffer
            const scrollHeight = scrollContainer.scrollHeight;
            const clientHeight = scrollContainer.clientHeight;
            const maxScrollTop = scrollHeight - clientHeight;
            
            scrollContainer.scrollTo({
                top: maxScrollTop + 10, // Add 10px buffer to ensure we can see the bottom
                behavior: smooth ? 'smooth' : 'auto'
            });
        }
    }

    setupScrollListener() {
        const scrollContainer = document.getElementById('scrollContainer');
        const scrollToBottomBtn = document.getElementById('scrollToBottomBtn');
        
        if (!scrollContainer || !scrollToBottomBtn) return;

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
            this.scrollToBottom(true); // Use smooth scrolling for user-initiated scrolls
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

// Initialize the chat history when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChatHistory();
});
