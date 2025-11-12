# Chatbot Logs Dashboard

A simple, local web application for viewing and filtering chatbot/phonebot logs with detailed chat history viewing capabilities.

## Features

- **Filter Logs**: Filter chat logs by agent_id, partner_id, assigned_phone_number, caller_phone, mode, or timestamp
- **Dynamic Columns**: Automatically detect and allow selection of available data fields
- **Persistent Settings**: Filter values and column preferences are saved in browser localStorage
- **Detailed Chat View**: View complete conversation history with formatted function calls
- **No Build Process**: Runs directly in the browser - no installation or compilation required

## Setup

1. **Download Files**: Save all files in the same directory:
   - `index.html` - Main dashboard
   - `app.js` - Dashboard functionality
   - `history.html` - Chat history detail page
   - `history.js` - History page functionality
   - `README.md` - This file

2. **Open Dashboard**: Simply open `index.html` in your web browser

3. **No Server Required**: The application runs entirely in the browser and makes direct API calls to the chatbot service

## Usage

### Main Dashboard (`index.html`)

1. **Set Filters**: Enter values in any of the filter fields:
   - Agent ID
   - Partner ID
   - Assigned Phone Number
   - Caller Phone
   - Mode (Call/Web/Chat)
   - Date (YYYY-MM-DD format)

2. **Get Data**: Click "Get Data" to fetch logs matching your filters
   - At least one filter must be provided
   - Results will appear in the table below

3. **Customize Columns**: Use the checkboxes to select which columns to display
   - Default columns: Timestamp, Mode, Partner ID
   - Additional columns are automatically detected from the API response
   - Column preferences are saved for future sessions

4. **View Chat History**: Click "View History" on any row to see the complete conversation

### Chat History Page (`history.html`)

1. **Chat Information**: View metadata about the selected chat
2. **Conversation**: See the complete message history with:
   - User messages (blue bubbles, right-aligned)
   - Assistant messages (gray bubbles, left-aligned)
   - Function calls (yellow bubbles with expandable details)

3. **Function Details**: Click on function messages to expand and view:
   - Function name
   - Arguments passed to the function
   - Response data (formatted JSON)

4. **Navigation**: Use "Back to Dashboard" to return to the main view

## API Integration

The dashboard connects to:
```
https://conversational.blockhealth.co/debug/agent_chats
```

**Required Parameters**: At least one of the following must be provided:
- `agent_id`
- `partner_id` 
- `assigned_phone_number`
- `caller_phone`
- `mode`
- `timestamp`

**Example API Call**:
```bash
curl -X 'GET' \
  'https://conversational.blockhealth.co/debug/agent_chats?agent_id=59df0b35-e6f3-49a0-a9f7-2b58cd80648e-2025-09-04-07-34-40&partner_id=73&mode=call&timestamp=2025-10-15' \
  -H 'accept: application/json'
```

## Data Storage

- **Filter Values**: Saved in `localStorage` as `chatbotDashboardFilters`
- **Column Preferences**: Saved in `localStorage` as `chatbotDashboardColumns`
- **Chat Data**: Passed between pages via `sessionStorage` as `selectedChat`

## Browser Compatibility

- Modern browsers with ES6+ support
- Tailwind CSS loaded via CDN
- No additional dependencies required

## Troubleshooting

**"No chat data found" Error**:
- Make sure you're clicking "View History" from the dashboard
- Check that the chat data loaded successfully in the main table

**API Connection Issues**:
- Verify the API endpoint is accessible
- Check browser console for CORS or network errors
- Ensure at least one filter is provided before clicking "Get Data"

**Column Selection Not Working**:
- Try refreshing the page after fetching data
- Check that the API response contains the expected data structure

## Customization

The application is designed to be easily customizable:

- **Styling**: Modify Tailwind CSS classes in the HTML files
- **API Endpoint**: Update the `apiUrl` in `app.js`
- **Default Columns**: Modify the `availableColumns` Set in the `ChatbotDashboard` constructor
- **Message Styling**: Adjust CSS classes in `history.html` and `history.js`

## File Structure

```
dashboard_analytics/
├── index.html          # Main dashboard page
├── app.js             # Dashboard functionality
├── history.html       # Chat history detail page
├── history.js         # History page functionality
└── README.md          # Documentation
```

## Security Notes

- This is a local tool for internal use
- No authentication is implemented
- API calls are made directly from the browser
- Consider network security when accessing the API endpoint



