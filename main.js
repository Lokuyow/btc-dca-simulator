document.getElementById('investmentForm').addEventListener('submit', function (event) {
    event.preventDefault();

    const startDate = document.getElementById('startDate').value;
    const monthlyAmount = document.getElementById('amount').value;

    fetchBitcoinData(startDate, monthlyAmount);
});

function fetchBitcoinData(startDate, monthlyAmount) {
    const currentUnixTime = Math.floor(new Date().getTime() / 1000); // 現在のUNIX時間（秒単位）
    const startDateFormat = new Date(startDate).toISOString().split('T')[0]; // 開始日の年月日形式
    const apiUrl = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=jpy&from=${new Date(startDateFormat).getTime() / 1000}&to=${currentUnixTime}`;

    // コンソールにAPIのURLを出力
    console.log("API URL: ", apiUrl);

    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            // startDateをdisplayResultsに渡す
            displayResults(data, monthlyAmount, startDate);
        })
        .catch(error => {
            console.error('Error fetching data: ', error);
        });
}

function displayResults(data, monthlyAmount, startDate) {
    const prices = data.prices;
    let totalInvestment = 0;
    let totalBitcoinPurchased = 0; // 購入したビットコインの総量
    let totalValue = 0;
    let investmentCount = 0;
    const startDay = new Date(startDate).getDate();

    let lastInvestmentMonth = -1;
    prices.forEach((price) => {
        const priceDate = new Date(price[0]);
        const year = priceDate.getFullYear();
        const month = priceDate.getMonth();
        const day = priceDate.getDate();

        if (month !== lastInvestmentMonth) {
            let investmentDay = Math.min(startDay, new Date(year, month + 1, 0).getDate());

            if (day === investmentDay || (day > investmentDay && month !== lastInvestmentMonth)) {
                lastInvestmentMonth = month;
                const btcAmount = monthlyAmount / price[1]; // 購入したビットコインの量
                totalInvestment += parseInt(monthlyAmount, 10);
                totalBitcoinPurchased += btcAmount; // ビットコイン購入量を加算
                totalValue += btcAmount * prices[prices.length - 1][1];
                investmentCount++;
            }
        }
    });

    const profit = totalValue - totalInvestment;
    const profitRate = (profit / totalInvestment) * 100;

    document.getElementById('results').innerHTML = `
        <h2>投資結果</h2>
        <p>投資回数: ${investmentCount} 回</p>
        <p>購入したビットコインの総量: ${totalBitcoinPurchased.toFixed(8)} BTC</p>
        <p>総投資額: ${totalInvestment.toLocaleString('ja-JP')} 円</p>
        <p>現在の評価額: ${totalValue.toLocaleString('ja-JP')} 円</p>
        <p>利益率: ${profitRate.toFixed(2)}%</p>
    `;
}
