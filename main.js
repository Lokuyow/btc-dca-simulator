// startDateの最大値を設定
document.getElementById('startDate').max = new Date().toISOString().split("T")[0];

document.getElementById('investmentForm').addEventListener('submit', function (event) {
    event.preventDefault();
    const startDate = document.getElementById('startDate').value;
    const monthlyAmount = document.getElementById('amount').value;
    fetchBitcoinData(startDate, monthlyAmount);
});

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

    data.prices.forEach((price) => {
        const [date, value] = price;
        processInvestment(new Date(date), value);
    });

    const profit = totalValue - totalInvestment;
    const profitRate = (profit / totalInvestment) * 100;
    const profitRateSign = profitRate > 0 ? "+" : "";
    const roundedTotalValue = Math.round(totalValue);

    updateResultsDisplay(investmentCount, totalInvestment, roundedTotalValue, profitRateSign, profitRate, totalBitcoinPurchased);

    function processInvestment(date, value) {
        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();
        const investmentDay = Math.min(startDay, new Date(year, month + 1, 0).getDate());

        if (month !== lastInvestmentMonth && (day === investmentDay || day > investmentDay)) {
            lastInvestmentMonth = month;
            const btcAmount = monthlyAmount / value;
            totalInvestment += parseInt(monthlyAmount, 10);
            totalBitcoinPurchased += btcAmount;
            totalValue += btcAmount * data.prices[data.prices.length - 1][1];
            investmentCount++;
        }
    }

    function updateResultsDisplay(count, investment, value, sign, rate, btc) {
        document.getElementById('results').innerHTML = `
            <h2 class="results-header">結果</h2>
            <p class="results-text">購入回数：${count} 回</p>
            <p class="results-text">総購入金額：${investment.toLocaleString('ja-JP')} 円</p>
            <p class="results-important">現在の評価額：${value.toLocaleString('ja-JP')} 円</p>
            <p class="results-important">利益率：${sign}${rate.toFixed(2)}%</p>
            <p class="results-btc">保有BTC：${btc.toFixed(8)} BTC</p>
        `;
    }
}