// Transaction Summary JavaScript
let currentFilter = 'daily';
let allTransactions = [];
let selectedRows = new Set();
let sortColumn = null;
let sortDirection = 'asc';

function validateDateRange() {
  const fromDate = new Date(dateFrom.value);
  const toDate = new Date(dateTo.value);
  
  if (fromDate > toDate) {
    alert('Error: "From" date cannot be later than "To" date');
    // Reset to valid dates
    dateFrom.value = dateTo.value;
  }
}

function setFilter(type, btn) {
  currentFilter = type;
  document.querySelectorAll('.btn-filter').forEach(b => {
    b.classList.remove('active');
    b.classList.add('bg-gray-100');
  });
  btn.classList.remove('bg-gray-100');
  btn.classList.add('active');
  loadTransactions();
}

function loadTransactions() {
  // Validate date range before loading
  const fromDate = new Date(dateFrom.value);
  const toDate = new Date(dateTo.value);
  
  if (fromDate > toDate) {
    alert('Error: "From" date cannot be later than "To" date');
    return;
  }
  
  fetch('./backend/manageTransactions.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'get_transactions',
      filter: currentFilter,
      date_from: dateFrom.value,
      date_to: dateTo.value
    })
  })
  .then(res => res.json())
  .then(res => {
    if (!res.success) return alert(res.message);
    allTransactions = res.transactions;
    renderTable(res.transactions, res.filter);
    resultCount.innerText = res.total + ' results';
    
    // Update stats with comparison
    updateStatsWithComparison();
    
    // Load charts with real data
    loadRevenueTrends();
    loadCategoryBreakdown();
  })
  .catch(error => {
    console.error('Error loading transactions:', error);
    alert('Failed to load transactions');
  });
}

function updateStatsWithComparison() {
  fetch('./backend/manageTransactions.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      action: 'get_statistics_with_comparison',
      date_from: dateFrom.value,
      date_to: dateTo.value
    })
  })
  .then(res => res.json())
  .then(res => {
    if (res.success) {
      // Update transaction count
      statTotalTx.innerText = res.total_transactions || 0;
      
      // Update revenue
      statRevenue.innerText = 'RM ' + Number(res.total_revenue || 0).toLocaleString();
      
      // Update transaction change percentage
      const txChange = res.tx_change_percent;
      const txChangeEl = document.getElementById('statTotalTxChange');
      
      if (txChange > 0) {
        txChangeEl.innerHTML = `<span class="text-green-600">+${txChange}% than previous period</span>`;
      } else if (txChange < 0) {
        txChangeEl.innerHTML = `<span class="text-red-600">${txChange}% than previous period</span>`;
      } else {
        txChangeEl.innerHTML = `<span class="text-gray-600">No change from previous period</span>`;
      }
      
      // Update revenue change percentage
      const revChange = res.rev_change_percent;
      const revChangeEl = document.getElementById('statRevenueChange');
      
      if (revChange > 0) {
        revChangeEl.innerHTML = `<span class="text-green-600">+${revChange}% than previous period</span>`;
      } else if (revChange < 0) {
        revChangeEl.innerHTML = `<span class="text-red-600">${revChange}% than previous period</span>`;
      } else {
        revChangeEl.innerHTML = `<span class="text-gray-600">No change from previous period</span>`;
      }
    }
  })
  .catch(error => {
    console.error('Error updating stats:', error);
  });
}

function formatPeriod(transaction, filter) {
  if (filter === 'daily') {
    return transaction.period_label;
  } else if (filter === 'weekly') {
    return `Week ${transaction.period_label.split('-W')[1]}, ${transaction.period_start} to ${transaction.period_end}`;
  } else if (filter === 'monthly') {
    const [year, month] = transaction.period_label.split('-');
    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
    return `${monthName} ${year}`;
  }
  return transaction.period_label;
}

function renderTable(data, filter) {
  tableBody.innerHTML = '';
  selectedRows.clear();
  document.getElementById('selectAll').checked = false;
  updateSelectedCount();

  if (!data.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-[1.5rem] text-gray-400">
          No transactions found
        </td>
      </tr>`;
    return;
  }

  // Build all rows at once instead of using +=
  let rowsHTML = '';
  
  data.forEach((t, i) => {
    const periodDisplay = formatPeriod(t, filter);
    const rowId = `row-${i}`;
    // Store the actual transaction data as JSON in data attribute
    const transactionData = JSON.stringify(t).replace(/"/g, '&quot;');
    
    rowsHTML += `
      <tr class="border-t hover:bg-gray-50" id="${rowId}">
        <td class="px-[1.5rem] py-[0.75rem]">
          <input type="checkbox" class="row-checkbox w-4 h-4 cursor-pointer" 
                 data-index="${i}" 
                 data-transaction='${transactionData}'
                 onchange="toggleRow(this, ${i})"/>
        </td>
        <td class="px-[1.5rem] py-[0.75rem]">${i + 1}</td>
        <td class="px-[1.5rem] py-[0.75rem]">${periodDisplay}</td>
        <td class="pl-[1.5rem] pr-[1rem] py-[0.75rem]">${t.total_transactions}</td>
        <td class="pl-[1.5rem] pr-[1rem] py-[0.75rem]">RM ${Number(t.total_revenue).toLocaleString()}</td>
        <td class="pl-[1.5rem] pr-[1rem] py-[0.75rem]">RM ${Number(t.total_sales).toLocaleString()}</td>
        <td class="pl-[1.5rem] pr-[1rem] py-[0.75rem]">RM ${Number(t.total_discount).toLocaleString()}</td>
        <td class="px-[1.5rem] py-[0.75rem]">
          <button class="text-amber-900 hover:text-amber-700 font-medium bg-amber-100 hover:bg-amber-200 rounded-lg p-2 transition-colors"
                  onclick='downloadTransaction(${i})'>
            <svg width="1.25rem" height="1.5rem" viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g clip-path="url(#clip0_download_${i})">
                <path d="M0 3C0 1.34531 1.49479 0 3.33333 0H11.1198C12.0052 0 12.8542 0.314063 13.4792 0.876563L19.026 5.87344C19.651 6.43594 20 7.2 20 7.99688V21C20 22.6547 18.5052 24 16.6667 24H3.33333C1.49479 24 0 22.6547 0 21V3ZM10.8333 2.74219V7.125C10.8333 7.74844 11.3906 8.25 12.0833 8.25H16.9531L10.8333 2.74219ZM9.11458 20.6719C9.60417 21.1125 10.3958 21.1125 10.8802 20.6719L14.2135 17.6719C14.7031 17.2313 14.7031 16.5188 14.2135 16.0828C13.724 15.6469 12.9323 15.6422 12.4479 16.0828L11.25 17.1609V13.125C11.25 12.5016 10.6927 12 10 12C9.30729 12 8.75 12.5016 8.75 13.125V17.1609L7.55208 16.0828C7.0625 15.6422 6.27083 15.6422 5.78646 16.0828C5.30208 16.5234 5.29688 17.2359 5.78646 17.6719L9.11979 20.6719H9.11458Z" fill="currentColor"/>
              </g>
              <defs>
                <clipPath id="clip0_download_${i}">
                  <rect width="20" height="24" fill="white"/>
                </clipPath>
              </defs>
            </svg>
          </button>
        </td>
      </tr>`;
  });
  
  // Set innerHTML once with all rows
  tableBody.innerHTML = rowsHTML;
}

function toggleSelectAll(checkbox) {
  const checkboxes = document.querySelectorAll('.row-checkbox');
  selectedRows.clear();
  
  checkboxes.forEach((cb) => {
    cb.checked = checkbox.checked;
    if (checkbox.checked) {
      const transactionData = cb.getAttribute('data-transaction');
      selectedRows.add(transactionData.replace(/&quot;/g, '"'));
    }
  });
  
  updateSelectedCount();
}

function toggleRow(checkbox, index) {
  const transactionData = checkbox.getAttribute('data-transaction');
  const transaction = JSON.parse(transactionData.replace(/&quot;/g, '"'));
  
  if (checkbox.checked) {
    selectedRows.add(JSON.stringify(transaction));
  } else {
    selectedRows.delete(JSON.stringify(transaction));
    document.getElementById('selectAll').checked = false;
  }
  updateSelectedCount();
}

function updateSelectedCount() {
  const count = selectedRows.size;
  document.getElementById('selectedCount').innerText = `${count} selected`;
  document.getElementById('exportBtn').disabled = count === 0;
}

function sortTable(column) {
  if (sortColumn === column) {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn = column;
    sortDirection = 'asc';
  }
  
  const sorted = [...allTransactions].sort((a, b) => {
    let valA, valB;
    
    switch(column) {
      case 'date':
        valA = new Date(a.period_start);
        valB = new Date(b.period_start);
        break;
      case 'transactions':
        valA = a.total_transactions;
        valB = b.total_transactions;
        break;
      case 'revenue':
        valA = a.total_revenue;
        valB = b.total_revenue;
        break;
      case 'sales':
        valA = a.total_sales;
        valB = b.total_sales;
        break;
      case 'discount':
        valA = a.total_discount;
        valB = b.total_discount;
        break;
      default:
        return 0;
    }
    
    if (sortDirection === 'asc') {
      return valA > valB ? 1 : valA < valB ? -1 : 0;
    } else {
      return valA < valB ? 1 : valA > valB ? -1 : 0;
    }
  });
  
  // Update allTransactions with sorted data
  allTransactions = sorted;
  renderTable(sorted, currentFilter);
}

function showLoading() {
  document.getElementById('loadingModal').classList.remove('hidden');
  document.getElementById('loadingModal').classList.add('flex');
}

function hideLoading() {
  document.getElementById('loadingModal').classList.add('hidden');
  document.getElementById('loadingModal').classList.remove('flex');
}

function downloadTransaction(index) {
  const transaction = allTransactions[index];
  showLoading();
  
  fetch('./backend/manageTransactions.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'export_transaction_details',
      period_start: transaction.period_start,
      period_end: transaction.period_end
    })
  })
  .then(res => res.json())
  .then(data => {
    hideLoading();
    
    if (!data.success) {
      alert(data.message);
      return;
    }
    
    if (!data.transactions || data.transactions.length === 0) {
      alert('No transaction details found for selected period');
      return;
    }
    
    // Generate CSV with detailed transaction and order data
    const csvContent = generateDetailedCSV(data.transactions);
    const filename = `transactions_detail_${data.period_start}_to_${data.period_end}.csv`;
    downloadCSV(csvContent, filename);
  })
  .catch(error => {
    hideLoading();
    console.error('Error:', error);
    alert('Error downloading transaction details: ' + error.message);
  });
}

async function exportSelected() {
  if (selectedRows.size === 0) return;
  
  showLoading();
  
  try {
    // Parse the stored transaction data
    const selectedTransactions = Array.from(selectedRows).map(jsonStr => JSON.parse(jsonStr));
    
    // Fetch detailed data for all selected periods
    const promises = selectedTransactions.map(t => 
      fetch('./backend/manageTransactions.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'export_transaction_details',
          period_start: t.period_start,
          period_end: t.period_end
        })
      }).then(res => res.json())
    );
    
    const results = await Promise.all(promises);
    
    // Combine all transactions from all periods
    let allDetailedTransactions = [];
    results.forEach(result => {
      if (result.success && result.transactions) {
        allDetailedTransactions = allDetailedTransactions.concat(result.transactions);
      }
    });
    
    hideLoading();
    
    if (allDetailedTransactions.length === 0) {
      alert('No transaction details found for selected periods');
      return;
    }
    
    const csvContent = generateDetailedCSV(allDetailedTransactions);
    const filename = `transactions_export_${dateFrom.value}_to_${dateTo.value}.csv`;
    downloadCSV(csvContent, filename);
    
  } catch (error) {
    hideLoading();
    console.error('Error:', error);
    alert('Error exporting transactions: ' + error.message);
  }
}

function generateDetailedCSV(transactions) {
  // CSV Headers with all transaction and order details
  const headers = [
    'Transaction ID',
    'Order ID',
    'Transaction Date',
    'Order Date',
    'User ID',
    'Username',
    'Name',
    'Email',
    'Total Items',
    'Subtotal (RM)',
    'Product Discount (RM)',
    'Voucher Discount (RM)',
    'Total Price (RM)',
    'Transaction Status',
    'Order Status',
  ];
  
  // CSV Rows
  const rows = transactions.map(t => [
    t.transaction_id || '',
    t.order_id || '',
    t.transaction_date || '',
    t.order_date || '',
    t.user_id || '',
    escapeCsvField(t.username || 'N/A'),
    escapeCsvField(t.name || ''),
    escapeCsvField(t.email || ''),
    t.total_items || '',
    t.subtotal ? t.subtotal.toFixed(2) : '0.00',
    t.product_discount ? t.product_discount.toFixed(2) : '0.00',
    t.voucher_discount ? t.voucher_discount.toFixed(2) : '0.00',
    t.total_price ? t.total_price.toFixed(2) : '0.00',
    t.transaction_status || '',
    t.order_status || '',
  ]);
  
  // Combine headers and rows
  const csvArray = [headers, ...rows];
  return csvArray.map(row => row.join(',')).join('\n');
}

function escapeCsvField(field) {
  // Escape fields that contain commas, quotes, or newlines
  if (field && (field.includes(',') || field.includes('"') || field.includes('\n'))) {
    return '"' + field.replace(/"/g, '""') + '"';
  }
  return field;
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Cleanup
  URL.revokeObjectURL(url);
}

// ============================================================
// LOAD REVENUE TRENDS WITH SMART GROUPING
// ============================================================
function loadRevenueTrends() {
  fetch('./backend/manageTransactions.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'get_revenue_trends',
      date_from: dateFrom.value,
      date_to: dateTo.value
    })
  })
  .then(res => res.json())
  .then(res => {
    if (res.success && res.data && res.data.length > 0) {

      renderRevenueChart(res.data, res.group_type);
    } else {
      document.getElementById('revenueChart').innerHTML = '<div class="flex items-center justify-center h-full text-gray-400">No revenue data available</div>';
    }
  })
  .catch(error => {
    console.error('Error loading revenue trends:', error);
    document.getElementById('revenueChart').innerHTML = '<div class="flex items-center justify-center h-full text-gray-400">Failed to load chart</div>';
  });
}

// ============================================================
// RENDER REVENUE CHART WITH SMART LABELS
// ============================================================
function renderRevenueChart(data, groupType) {

  
  if (!data || data.length === 0) {
    document.getElementById('revenueChart').innerHTML = '<div class="flex items-center justify-center h-full text-gray-400">No data available</div>';
    return;
  }

  // Limit display based on group type to prevent overcrowding
  let displayData = data;
  let maxDisplay = 15; // Default max bars
  
  if (groupType === 'daily') {
    maxDisplay = 10;
  } else if (groupType === 'weekly') {
    maxDisplay = 12;
  } else if (groupType === 'monthly') {
    maxDisplay = 12;
  } else if (groupType === 'quarterly') {
    maxDisplay = 8;
  }
  
  // Take last N periods for better visibility
  if (data.length > maxDisplay) {
    displayData = data.slice(-maxDisplay);
  }

  // Find max and min revenue for better scaling
  const revenues = displayData.map(d => parseFloat(d.revenue));
  const maxRevenue = Math.max(...revenues);
  const minRevenue = Math.min(...revenues);

 

  // If all values are 0, show a message
  if (maxRevenue === 0) {
    document.getElementById('revenueChart').innerHTML = '<div class="flex items-center justify-center h-full text-gray-400">No revenue in selected period</div>';
    return;
  }

  // Available height in rem (15.625rem = 250px equivalent)
  const chartHeightRem = 15.625;
  const minBarHeightRem = 1.25; // Minimum bar height
  const maxBarHeightRem = chartHeightRem - 2; // Leave some space at top

  const chartHTML = `
    <div class="flex items-end justify-around gap-3" style="height: ${chartHeightRem}rem; padding: 0 0.625rem;">
      ${displayData.map(item => {
        const revenue = parseFloat(item.revenue);
        // Calculate height in rem directly
        const heightRem = minBarHeightRem + ((revenue - minRevenue) / (maxRevenue - minRevenue || 1)) * (maxBarHeightRem - minBarHeightRem);
        
        // Format label based on group type
        let label = '';
        if (groupType === 'daily') {
          const date = new Date(item.date);
          label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else if (groupType === 'weekly') {
          const date = new Date(item.date);
          const year = date.getFullYear();
          label = `W${item.week_num || ''} ${year}`;
        } else if (groupType === 'monthly') {
          const date = new Date(item.date);
          label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        } else if (groupType === 'quarterly') {
          const date = new Date(item.date);
          const month = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          label = month; // Show as "Jan 2024" instead of "Q1 2024"
        }
        

        
        return `
          <div class="flex flex-col items-center gap-2 flex-1" style="max-width: 3.75rem;">
            <div class="relative group w-full" style="height: 100%; display: flex; flex-direction: column; justify-content: flex-end;">
              <div class="w-full bg-amber-700 rounded-t hover:bg-amber-600 transition-colors cursor-pointer relative" 
                   style="height: ${heightRem}rem;">
                <div class="absolute left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg" style="top: -2.25rem;">
                  RM ${Number(revenue).toLocaleString()}
                </div>
              </div>
            </div>
            <span class="text-xs text-gray-600 whitespace-nowrap" style="line-height: 1.2;">${label}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
  
  document.getElementById('revenueChart').innerHTML = chartHTML;
}

// Load Category Breakdown Chart
function loadCategoryBreakdown() {
  fetch('./backend/manageTransactions.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'get_category_breakdown',
      date_from: dateFrom.value,
      date_to: dateTo.value
    })
  })
  .then(res => res.json())
  .then(res => {
    if (res.success && res.data && res.data.length > 0) {
      renderCategoryChart(res.data);
    } else {
      document.getElementById('breakdownChart').innerHTML = '<div class="flex items-center justify-center h-full text-gray-400">No category data available</div>';
    }
  })
  .catch(error => {
    console.error('Error loading category breakdown:', error);
    document.getElementById('breakdownChart').innerHTML = '<div class="flex items-center justify-center h-full text-gray-400">Failed to load chart</div>';
  });
}

// Render Category Chart
function renderCategoryChart(data) {
  if (!data || data.length === 0) {
    document.getElementById('breakdownChart').innerHTML = '<div class="flex items-center justify-center h-full text-gray-400">No data available</div>';
    return;
  }

  // Calculate total for percentages
  const total = data.reduce((sum, item) => sum + parseFloat(item.total_sales), 0);
  
  // Generate colors for each category
  const colors = ['#b45309', '#d97706', '#f59e0b', '#fbbf24', '#fcd34d'];
  
  const chartHTML = `
    <div class="flex flex-col justify-center gap-4 h-full">
      <div class="space-y-3">
        ${data.map((item, index) => {
          const percentage = ((parseFloat(item.total_sales) / total) * 100).toFixed(1);
          const color = colors[index % colors.length];
          return `
            <div>
              <div class="flex justify-between text-sm mb-1">
                <span class="font-medium">${item.category || 'Uncategorized'}</span>
                <span class="text-gray-600">RM ${Number(item.total_sales).toLocaleString()} (${percentage}%)</span>
              </div>
              <div class="h-3 rounded transition-all hover:opacity-80 cursor-pointer" 
                   style="width: ${percentage}%; background-color: ${color}"
                   title="${item.category}: RM ${Number(item.total_sales).toLocaleString()}">
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
  
  document.getElementById('breakdownChart').innerHTML = chartHTML;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadTransactions();
});