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
    document.getElementById('amount').addEventListener('focus', selectInputText);
    document.getElementById('amount').addEventListener('blur', formatAmountInput);
    document.getElementById('amount').addEventListener('keydown', e => closeKeyboardOnEnter(e));

    document.getElementById('investmentForm').addEventListener('submit', e => handleFormSubmit(e));
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
    fetchBitcoinData(startDate, endDate, investmentAmount);
}

// ローディングアニメーションを表示
function showLoadingAnimation() {
    const submitButton = document.getElementById('submitBtn');
    const spinnerWrapper = submitButton.querySelector('.spinner-wrapper'); // スピナーのラッパー要素を取得
    const buttonText = submitButton.querySelector('.button-text');
    spinnerWrapper.style.display = 'block'; // スピナーラッパーを表示
    buttonText.style.display = 'none'; // ボタンのテキストを非表示

    // ボタンを非活性化するのを少し遅らせる
    setTimeout(() => {
        submitButton.disabled = true;
    }, 100); // 100ミリ秒後に実行
}

// ローディングアニメーションを非表示
function hideLoadingAnimation() {
    const submitButton = document.getElementById('submitBtn');
    const spinnerWrapper = submitButton.querySelector('.spinner-wrapper'); // スピナーのラッパー要素を取得
    const buttonText = submitButton.querySelector('.button-text');
    submitButton.disabled = false;
    spinnerWrapper.style.display = 'none'; // スピナーラッパーを非表示
    buttonText.style.display = 'block'; // ボタンのテキストを表示
}

// 最新のビットコイン価格を取得する関数
async function fetchLatestPrice() {
    const apiUrl = 'https://public.bitbank.cc/btc_jpy/ticker';
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        return parseInt(data.data.last, 10); // 最終取引価格を返す
    } catch (error) {
        console.error('ビットコイン価格の取得に失敗しました:', error);
        return 0; // エラー時は0を返す
    }
}

async function fetchLocalData(year) {
    const response = await fetch(`data/${year}.json`);
    return await response.json();
}

function formatDailyDataBitBank(ohlcv) {
    return {
        prices: ohlcv.map(item => [item[5], item[0]]) // Unixタイムスタンプとオープン価格の配列に変換
    };
}

// 各年のビットコイン価格を取得する関数
async function fetchBitcoinData(startDate, endDate, investmentAmount) {
    const startTime = Date.now();
    const startYear = new Date(startDate).getFullYear();
    const endYear = new Date(endDate).getFullYear();
    const apiPromises = [];
    const localDataPromises = [];

    const latestPrice = await fetchLatestPrice();

    // 2017年より前のデータをローカルから取得
    for (let year = startYear; year < 2017 && year <= endYear; year++) {
        localDataPromises.push(fetchLocalData(year));
    }

    // 2017年以降のデータをAPIから取得
    for (let year = Math.max(startYear, 2017); year <= endYear; year++) {
        const apiUrl = `https://public.bitbank.cc/btc_jpy/candlestick/1day/${year}`;
        apiPromises.push(
            fetch(apiUrl)
                .then(response => response.json())
                .catch(error => {
                    console.error(`Error fetching data for year ${year}:`, error);
                    return null; // エラーが発生した場合はnullを返して処理を続ける
                })
        );
    }

    // すべてのプロミスが完了したら、データを結合して処理
    Promise.all([...localDataPromises, ...apiPromises])
        .then(results => {
            const validResults = results.filter(result => result !== null);
            const allData = validResults.flatMap(result => result.data ? result.data.candlestick[0].ohlcv : result);
            const formattedData = formatDailyDataBitBank(allData);
            displayResults(formattedData, investmentAmount, startDate, endDate, latestPrice);
        })
        .catch(error => {
            console.error('Error fetching data: ', error);
        })
        .finally(() => {
            const elapsedTime = Date.now() - startTime; // 経過時間を計算
            const delay = Math.max(250 - elapsedTime, 0);
            setTimeout(hideLoadingAnimation, delay); // 計算した遅延時間後にローディングアニメーションを非表示にする
        });
}

function createPriceMap(prices) {
    return prices.reduce((acc, [date, value]) => {
        acc[new Date(date).toISOString().split("T")[0]] = value;
        return acc;
    }, {});
}

async function displayResults(data, investmentAmount, startDate, endDate) {
    const latestPrice = await fetchLatestPrice();
    const priceMap = createPriceMap(data.prices);
    const { totalInvestment, totalBitcoinPurchased, investmentCount, investmentDetails } = processInvestments(investmentAmount, startDate, endDate, priceMap);
    updateResultsDisplay(totalInvestment, totalBitcoinPurchased, investmentCount, investmentDetails, latestPrice);
}

function getNextInvestmentDate(currentDate, purchaseFrequency) {
    let nextDate = new Date(currentDate);
    if (purchaseFrequency === 'weekly') {
        nextDate.setDate(currentDate.getDate() + 7);
    } else if (purchaseFrequency === 'monthly') {
        nextDate.setMonth(currentDate.getMonth() + 1);
    } else {
        nextDate.setDate(currentDate.getDate() + 1);
    }
    return nextDate;
}

function processInvestments(investmentAmount, startDate, endDate, priceMap) {
    let totalInvestment = 0, totalBitcoinPurchased = 0, investmentCount = 0;
    let investmentDetails = "";

    let currentDate = new Date(startDate);
    const endDateObj = new Date(endDate);
    const purchaseFrequency = document.querySelector('input[name="purchaseFrequency"]:checked').value;

    while (currentDate <= endDateObj) {
        const dateString = currentDate.toISOString().split("T")[0];

        // 指定日、翌日、翌々日の価格をチェック
        for (let i = 0; i <= 2; i++) {
            let tryDate = new Date(currentDate);
            tryDate.setDate(tryDate.getDate() + i);
            const tryDateString = tryDate.toISOString().split("T")[0];
            if (tryDateString in priceMap) {
                const investmentDetail = calculateInvestmentDetails(tryDate, priceMap[tryDateString], investmentAmount);
                const result = updateInvestmentResult(investmentDetail, investmentDetails, totalInvestment, totalBitcoinPurchased, investmentCount, investmentAmount);
                totalInvestment = result.totalInvestment;
                totalBitcoinPurchased = result.totalBitcoinPurchased;
                investmentCount = result.investmentCount;
                investmentDetails = result.investmentDetails;
                break; // 価格が見つかったらその日で投資を行い、ループを抜ける
            }
        }

        // 次の購入可能日へ移動
        currentDate = getNextInvestmentDate(currentDate, purchaseFrequency);
    }

    return { totalInvestment, totalBitcoinPurchased, investmentCount, investmentDetails };
}

function calculateInvestmentDetails(date, value, investmentAmount) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const btcAmount = investmentAmount / value;
    return { year, month, day, btcAmount, value };
}

function updateInvestmentResult(investmentDetail, investmentDetails, totalInvestment, totalBitcoinPurchased, investmentCount, investmentAmount) {
    const { year, month, day, btcAmount, value } = investmentDetail;
    totalInvestment += investmentAmount;
    totalBitcoinPurchased += btcAmount;
    investmentCount += 1;

    const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const roundedValue = Math.round(value);
    investmentDetails += `
    <tr>
        <td>${formattedDate}</td>
        <td>${roundedValue.toLocaleString('ja-JP')}</td>
        <td>${btcAmount.toFixed(8)}</td>
    </tr>`;

    return { totalInvestment, totalBitcoinPurchased, investmentCount, investmentDetails };
}

function updateResultsDisplay(totalInvestment, totalBitcoinPurchased, investmentCount, investmentDetails, latestPrice) {
    const totalValue = totalBitcoinPurchased * latestPrice;
    const investmentMultiple = totalValue / totalInvestment;
    const roundedTotalValue = Math.round(totalValue);
    document.getElementById('results').innerHTML = `
    <h2 class="results-header">結果</h2>
    <p class="results-text">購入回数：${investmentCount} 回</p>
    <p class="results-text">総購入金額：${totalInvestment.toLocaleString('ja-JP')} 円</p>
    <p class="results-important">現在の評価額：${roundedTotalValue.toLocaleString('ja-JP')} 円</p>
    <p class="results-important">倍率：${investmentMultiple.toFixed(2)}倍</p>
    <p class="results-btc">保有BTC：${totalBitcoinPurchased.toFixed(8)} BTC</p>
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
                ${investmentDetails}
            </tbody>
        </table>
        <p style="font-size: small; margin-top: 20px; margin-bottom: 20px;">
        ※ 価格データが存在しない日付の場合、翌日に購入しています
    </p>
    </details>
`;
}