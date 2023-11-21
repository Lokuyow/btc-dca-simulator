// startDateの最大値を設定
setStartDateMax();

// イベントハンドラーの設定
setupEventHandlers();

function setStartDateMax() {
    document.getElementById('startDate').max = new Date().toISOString().split("T")[0];
}

function setupEventHandlers() {
    const amountInput = document.getElementById('amount');
    amountInput.addEventListener('focus', selectInputText);
    amountInput.addEventListener('keydown', closeKeyboardOnEnter);

    const form = document.getElementById('investmentForm');
    form.addEventListener('submit', handleFormSubmit);
}

function selectInputText(event) {
    event.target.select();
}

function closeKeyboardOnEnter(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        event.target.blur();
    }
}

function handleFormSubmit(event) {
    event.preventDefault();
    const startDate = document.getElementById('startDate').value;
    const monthlyAmount = document.getElementById('amount').value;
    fetchBitcoinData(startDate, monthlyAmount);
}

function fetchBitcoinData(startDate, monthlyAmount) {
    const currentUnixTime = Math.floor(new Date().getTime() / 1000);
    const startUnixTime = Math.floor(new Date(startDate).getTime() / 1000);
    const apiUrl = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=jpy&from=${startUnixTime}&to=${currentUnixTime}`;

    console.log("API URL: ", apiUrl);

    fetch(apiUrl)
        .then(response => response.json())
        .then(data => displayResults(data, monthlyAmount, startDate))
        .catch(error => console.error('Error fetching data: ', error));
}

function displayResults(data, monthlyAmount, startDate) {
    let totalInvestment = 0, totalBitcoinPurchased = 0, totalValue = 0, investmentCount = 0;
    const startDay = new Date(startDate).getDate();
    let lastInvestmentMonth = -1;
    let investmentDetails = "";

    data.prices.forEach((price) => {
        const [date, value] = price;
        processInvestment(new Date(date), value);
    });

    const investmentMultiple = totalValue / totalInvestment;
    const roundedTotalValue = Math.round(totalValue);

    updateResultsDisplay(investmentCount, totalInvestment, roundedTotalValue, investmentMultiple, totalBitcoinPurchased, investmentDetails);

    function processInvestment(date, value) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1; // JavaScriptの月は0から始まるため+1
        const day = date.getDate();
        const investmentDay = Math.min(startDay, new Date(year, month, 0).getDate());

        if (month !== lastInvestmentMonth && (day === investmentDay || day > investmentDay)) {
            lastInvestmentMonth = month;
            const btcAmount = monthlyAmount / value;
            totalInvestment += parseInt(monthlyAmount, 10);
            totalBitcoinPurchased += btcAmount;
            totalValue += btcAmount * data.prices[data.prices.length - 1][1];
            investmentCount++;

            // 日付のフォーマットを "YYYY-MM-DD" にする
            const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

            // 価格を四捨五入して表示
            const roundedValue = Math.round(value);

            investmentDetails += `
            <tr>
                <td>${formattedDate}</td>
                <td>${roundedValue.toLocaleString('ja-JP')}</td>
                <td>${btcAmount.toFixed(8)}</td>
            </tr>`;
        }
    }

    function updateResultsDisplay(count, investment, value, multiple, btc, details) {
        document.getElementById('results').innerHTML = `
            <h2 class="results-header">結果</h2>
            <p class="results-text">購入回数：${count} 回</p>
            <p class="results-text">総購入金額：${investment.toLocaleString('ja-JP')} 円</p>
            <p class="results-important">現在の評価額：${value.toLocaleString('ja-JP')} 円</p>
            <p class="results-important">倍率：${multiple.toFixed(2)}倍</p>
            <p class="results-btc">保有BTC：${btc.toFixed(8)} BTC</p>
            <details class="detail-history-d">
            <summary class="detail-history-s">購入履歴の詳細</summary>
            <table>
                <thead>
                    <tr>
                        <th>日付</th>
                        <th>価格 (円)</th>
                        <th>購入量 (BTC)</th>
                    </tr>
                </thead>
                <tbody>
                    ${details}
                </tbody>
            </table>
        </details>
    `;
    }
}