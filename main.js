const today = new Date().toISOString().split("T")[0];
let endDate = today

// デフォルト値の設定
function setDefaultDates() {
    document.getElementById('startDate').max = today;
    const endDateInput = document.getElementById('endDate');
    endDateInput.value = today;
    endDateInput.max = today;
    endDateInput.style.visibility = 'visible';
}

// イベントハンドラーの設定
function setupEventHandlers() {
    const amountInput = document.getElementById('amount');
    amountInput.addEventListener('focus', selectInputText);
    amountInput.addEventListener('blur', formatAmountInput);
    amountInput.addEventListener('keydown', closeKeyboardOnEnter);

    const form = document.getElementById('investmentForm');
    form.addEventListener('submit', handleFormSubmit);
}

// ページ読み込み時の処理
document.addEventListener('DOMContentLoaded', () => {
    setDefaultDates();
    setupEventHandlers();
    setupDateExamples();
});

function setupDateExamples() {
    document.querySelectorAll('.date-example').forEach(item => {
        item.addEventListener('click', function () {
            const dateText = this.textContent.match(/\d{4}年\d{1,2}月\d{1,2}日/);
            if (dateText) {
                const dateParts = dateText[0].split(/年|月|日/);
                const formattedDate = `${dateParts[0]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`;
                document.getElementById('startDate').value = formattedDate;
            }
        });
    });
}

function formatAmountInput(event) {
    const numericValue = event.target.value.replace(/\D/g, '');
    if (numericValue) {
        event.target.value = parseInt(numericValue, 10).toLocaleString('ja-JP');
    } else {
        event.target.value = '';
    }
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
    showLoadingAnimation(); // ローディングアニメーションを表示
    const startDate = document.getElementById('startDate').value;
    endDate = document.getElementById('endDate').value;
    const investmentAmount = parseInt(document.getElementById('amount').value.replace(/,/g, ''), 10);
    fetchBitcoinData(startDate, investmentAmount);
}

// ローディングアニメーションを表示
function showLoadingAnimation() {
    const submitButton = document.getElementById('submitBtn');
    const spinner = submitButton.querySelector('.spinner');
    const buttonText = submitButton.querySelector('.button-text');
    spinner.style.display = 'block'; // スピナーを表示
    buttonText.style.display = 'none'; // ボタンのテキストを非表示

    // ボタンを非活性化するのを少し遅らせる
    setTimeout(() => {
        submitButton.disabled = true;
    }, 100); // 100ミリ秒後に実行
}

// ローディングアニメーションを非表示
function hideLoadingAnimation() {
    const submitButton = document.getElementById('submitBtn');
    const spinner = submitButton.querySelector('.spinner');
    const buttonText = submitButton.querySelector('.button-text');
    submitButton.disabled = false;
    spinner.style.display = 'none'; // スピナーを非表示
    buttonText.style.display = 'block'; // ボタンのテキストを表示
}

function fetchBitcoinData(startDate, investmentAmount) {
    const currentUnixTime = Math.floor(new Date().getTime() / 1000);
    const startUnixTime = Math.floor(new Date(startDate).getTime() / 1000);
    const apiUrl = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=jpy&from=${startUnixTime}&to=${currentUnixTime}`;

    console.log("API URL: ", apiUrl);

    fetch(apiUrl)
        .then(response => response.json())
        .then(data => formatDailyData(data))
        .then(formattedData => {
            setTimeout(() => { // 最低0.4秒間はローディング表示
                displayResults(formattedData, investmentAmount, startDate);
                hideLoadingAnimation(); // ローディングアニメーションを非表示
            }, 400);
        })
        .catch(error => {
            console.error('Error fetching data: ', error);
            hideLoadingAnimation();
        });
}

// データを整形
function formatDailyData(data) {
    const dailyData = [];
    let lastDate = "";

    data.prices.forEach((item) => {
        const date = new Date(item[0]);
        const dateString = date.toISOString().split('T')[0]; // 日付をYYYY-MM-DD形式に変換

        if (dateString !== lastDate) {
            dailyData.push(item); // 各日付の最初のデータポイントを保存
            lastDate = dateString;
        }
    });

    return { prices: dailyData };
}

function displayResults(data, investmentAmount, startDate) {
    let totalInvestment = 0, totalBitcoinPurchased = 0, totalValue = 0, investmentCount = 0;
    let investmentDetails = "";

    data.prices.forEach((price) => {
        const [date, value] = price;
        processInvestment(new Date(date), value);
    });

    function processInvestment(date, value) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1; // JavaScriptの月は0から始まるため+1
        const day = date.getDate();
        const purchaseFrequencyElements = document.getElementsByName('purchaseFrequency');
        let purchaseFrequency = 'monthly'; // デフォルト値
        for (const element of purchaseFrequencyElements) {
            if (element.checked) {
                purchaseFrequency = element.value;
                break;
            }
        }

        const investmentDay = new Date(startDate).getDate(); // startDateから日を取得
        const startDayOfWeek = new Date(startDate).getDay(); // startDateの曜日

        // 購入日が購入終了日以前であることを確認
        if (date > new Date(endDate)) {
            return; // 購入終了日を過ぎていたら処理を中止
        }

        let shouldInvest = false;
        if (purchaseFrequency === 'daily') { // 毎日購入
            shouldInvest = true;
        } else if (purchaseFrequency === 'weekly' && date.getDay() === startDayOfWeek) { // 毎週購入
            shouldInvest = true;
        } else if (purchaseFrequency === 'monthly') { // 毎月購入
            const daysInMonth = new Date(year, month, 0).getDate(); // 当月の日数を取得
            if (day === Math.min(investmentDay, daysInMonth)) { // 指定日または月末
                shouldInvest = true;
            }
        }

        if (shouldInvest) {
            const btcAmount = investmentAmount / value;
            totalInvestment += parseInt(investmentAmount, 10);
            totalBitcoinPurchased += btcAmount;
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

    totalValue = totalBitcoinPurchased * data.prices[data.prices.length - 1][1];
    const investmentMultiple = totalValue / totalInvestment;
    const roundedTotalValue = Math.round(totalValue);

    updateResultsDisplay(investmentCount, totalInvestment, roundedTotalValue, investmentMultiple, totalBitcoinPurchased, investmentDetails);

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
                        <th>BTC価格 (円)</th>
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