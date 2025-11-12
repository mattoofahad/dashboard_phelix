// Chatbot Analytics Dashboard JavaScript

class AnalyticsDashboard {
	constructor() {
		this.apiEndpoint = '/debug/agent_chats';
		this.currentData = [];

		this.initializeEventListeners();
		this.loadSavedFilters();
		this.loadApiConfiguration();
	}

	initializeEventListeners() {
		document.getElementById('getDataBtn').addEventListener('click', () => this.fetchData());
		document.getElementById('clearFiltersBtn').addEventListener('click', () => this.clearFilters());

		// Chat history panel events
		document.getElementById('closeChatHistory').addEventListener('click', () => this.closeChatHistory());
		document.getElementById('chatHistoryBackdrop').addEventListener('click', () => this.closeChatHistory());

		// API configuration change
		document.getElementById('apiBaseUrl').addEventListener('input', () => this.saveApiConfiguration());

		// Save filters on input change
		const filterInputs = ['agent_id', 'partner_id', 'assigned_phone_number', 'caller_phone', 'mode', 'timestamp'];
		filterInputs.forEach(inputId => {
			document.getElementById(inputId).addEventListener('input', () => this.saveFilters());
		});
	}

	loadSavedFilters() {
		const savedFilters = localStorage.getItem('analyticsDashboardFilters');
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
		localStorage.setItem('analyticsDashboardFilters', JSON.stringify(filters));
	}

	loadApiConfiguration() {
		const savedApiUrl = localStorage.getItem('analyticsDashboardApiUrl');
		if (savedApiUrl) {
			document.getElementById('apiBaseUrl').value = savedApiUrl;
		}
	}

	saveApiConfiguration() {
		const apiUrl = document.getElementById('apiBaseUrl').value.trim();
		localStorage.setItem('analyticsDashboardApiUrl', apiUrl);
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

			console.log('Fetching data from:', url);

			const response = await fetch(url, {
				method: 'GET',
				headers: { 'accept': 'application/json' }
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			console.log('API Response:', data);

			if (data.status === 'success' && data.agent_chats) {
				const totalChats = data.agent_chats.length;
				// Only keep chats that contain analytics payload
				this.currentData = data.agent_chats.filter(item => item.analytics);
				
				console.log(`Total chats: ${totalChats}, Chats with analytics: ${this.currentData.length}`);
				
				if (totalChats > 0 && this.currentData.length === 0) {
					this.showError(`Found ${totalChats} chat record(s), but none contain analytics data. Please ensure the records have an 'analytics' field.`);
				} else {
					this.renderResults();
				}
			} else {
				throw new Error('Invalid response format. Expected status: "success" and agent_chats array.');
			}
		} catch (error) {
			console.error('Error fetching data:', error);
			this.showError(`Failed to fetch data: ${error.message}`);
		} finally {
			this.showLoading(false);
		}
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

		const columns = [
			'#',
			'Patient Name',
			'Patient HCN',
			'Patient PN',
			'Appointment Start',
			'Appointment End',
			'Purpose',
			'Reason',
			'Status',
			'Mode',
			'Actions'
		];

		columns.forEach(label => {
			const th = document.createElement('th');
			th.className = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
			th.textContent = label;
			headerRow.appendChild(th);
		});
	}

	formatDateFlexible(value) {
		if (!value) return '';
		// Try numeric epoch
		if (/^\d{10,13}$/.test(String(value))) {
			const epoch = String(value).length === 13 ? Number(value) : Number(value) * 1000;
			const d = new Date(epoch);
			if (!isNaN(d.getTime())) return d.toLocaleString();
		}
		// Try ISO or RFC
		const d = new Date(value);
		if (!isNaN(d.getTime())) return d.toLocaleString();
		// Fallback raw
		return String(value);
	}

	renderTableBody() {
		const tbody = document.getElementById('tableBody');
		tbody.innerHTML = '';

		this.currentData.forEach((item, index) => {
			const row = document.createElement('tr');
			row.className = 'hover:bg-gray-50';

			const analytics = item.analytics || {};
			const patient = analytics.patient_details || {};
			const booking = analytics.booking_details || {};
			const slot = (booking && booking.slot) || {};
			const conversationDetails = analytics.conversation_details || {};

			const cells = [
				index + 1,
				patient.name || '',
				patient.hcn || '',
				patient.pn || '',
				this.formatDateFlexible(slot.start_time),
				this.formatDateFlexible(slot.end_time),
				conversationDetails.purpose || '',
				booking.reason || '',
				analytics.status || '',
				analytics.mode || ''
			];

			cells.forEach((text, i) => {
				const td = document.createElement('td');
				td.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900' + (i === 0 ? ' font-medium' : '');
				td.textContent = text;
				row.appendChild(td);
			});

			// Actions
			const actionsTd = document.createElement('td');
			actionsTd.className = 'px-6 py-4 whitespace-nowrap text-sm font-medium';
			const viewButton = document.createElement('button');
			viewButton.className = 'text-blue-600 hover:text-blue-900';
			viewButton.textContent = 'View Chat';
			viewButton.addEventListener('click', () => this.openChatHistory(analytics));
			actionsTd.appendChild(viewButton);
			row.appendChild(actionsTd);

			tbody.appendChild(row);
		});

		document.getElementById('resultCount').textContent = `Found ${this.currentData.length} record${this.currentData.length !== 1 ? 's' : ''}`;
	}

	openChatHistory(analytics) {
		this.currentAnalytics = analytics;
		this.displayChatHistory(analytics);
		this.showChatHistoryPanel();
	}

	showChatHistoryPanel() {
		const panel = document.getElementById('chatHistoryPanel');
		const content = document.getElementById('chatHistoryContent');
		panel.classList.remove('hidden');
		setTimeout(() => { content.classList.remove('-translate-x-full'); }, 10);
	}

	closeChatHistory() {
		const panel = document.getElementById('chatHistoryPanel');
		const content = document.getElementById('chatHistoryContent');
		content.classList.add('-translate-x-full');
		setTimeout(() => { panel.classList.add('hidden'); }, 300);
	}

	displayChatHistory(analytics) {
		const container = document.getElementById('messagesContainer');
		container.innerHTML = '';

		const conv = (analytics && Array.isArray(analytics.conversation)) ? analytics.conversation : [];
		if (conv.length === 0) {
			container.innerHTML = '<p class="text-gray-500">No chat history available.</p>';
			return;
		}

		conv.forEach((message, index) => {
			const el = this.createMessageElement(message, index);
			container.appendChild(el);
		});

		const bottomSpacer = document.createElement('div');
		bottomSpacer.className = 'h-16';
		container.appendChild(bottomSpacer);

		setTimeout(() => { this.scrollPanelToTop(); }, 100);
		this.setupPanelScrollListener();
	}

	createMessageElement(message) {
		const messageDiv = document.createElement('div');
		messageDiv.className = 'flex flex-col space-y-2';

		if (message.role === 'user') {
			messageDiv.innerHTML = `
				<div class="flex justify-end">
					<div class="message-bubble user-message px-4 py-2 rounded-lg">
						<p class="text-sm">${this.escapeHtml(message.content || '')}</p>
					</div>
				</div>
			`;
		} else {
			messageDiv.innerHTML = `
				<div class="flex justify-start">
					<div class="message-bubble assistant-message px-4 py-2 rounded-lg">
						<p class="text-sm">${this.escapeHtml(message.content || '')}</p>
					</div>
				</div>
			`;
		}

		return messageDiv;
	}

	escapeHtml(text) {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	scrollPanelToTop(smooth = false) {
		const scrollContainer = document.getElementById('panelScrollContainer');
		if (scrollContainer) {
			scrollContainer.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
		}
	}

	scrollPanelToBottom(smooth = false) {
		const scrollContainer = document.getElementById('panelScrollContainer');
		if (scrollContainer) {
			const maxScrollTop = scrollContainer.scrollHeight - scrollContainer.clientHeight;
			scrollContainer.scrollTo({ top: maxScrollTop + 10, behavior: smooth ? 'smooth' : 'auto' });
		}
	}

	setupPanelScrollListener() {
		const scrollContainer = document.getElementById('panelScrollContainer');
		const scrollToBottomBtn = document.getElementById('panelScrollToBottomBtn');
		if (!scrollContainer || !scrollToBottomBtn) return;

		scrollContainer.addEventListener('scroll', () => {
			const isAtBottom = scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 10;
			if (isAtBottom) {
				scrollToBottomBtn.classList.add('opacity-0');
			} else {
				scrollToBottomBtn.classList.remove('opacity-0');
			}
		});

		scrollToBottomBtn.addEventListener('click', () => {
			this.scrollPanelToBottom(true);
		});
	}

	showLoading(show) {
		const indicator = document.getElementById('loadingIndicator');
		if (indicator) {
			indicator.classList.toggle('hidden', !show);
		}
	}

	showError(message) {
		const errorDiv = document.getElementById('errorMessage');
		const errorText = document.getElementById('errorText');
		if (errorDiv && errorText) {
			errorText.textContent = message;
			errorDiv.classList.remove('hidden');
		}
	}

	hideError() {
		const errorDiv = document.getElementById('errorMessage');
		if (errorDiv) {
			errorDiv.classList.add('hidden');
		}
	}

	showResults() {
		const resultsSection = document.getElementById('resultsSection');
		if (resultsSection) {
			resultsSection.classList.remove('hidden');
		}
	}

	hideResults() {
		const resultsSection = document.getElementById('resultsSection');
		if (resultsSection) {
			resultsSection.classList.add('hidden');
		}
	}
}

document.addEventListener('DOMContentLoaded', () => {
	new AnalyticsDashboard();
});



