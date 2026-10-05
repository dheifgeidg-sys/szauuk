// scanner.js — фоновый сканер залётных лотов
const { fetchActiveLots } = require('./api');
const db = require('./db');
const bot = require('./bot');

const SCAN_INTERVAL_MIN = parseInt(process.env.SCAN_INTERVAL_MIN || '10');
const BARGAIN_THRESHOLD = parseFloat(process.env.BARGAIN_THRESHOLD || '30');
const MIN_HISTORY = 5;      // минимум точек истории для расчёта средней
const COOLDOWN_HOURS = 6;   // не спамить одним и тем же предметом

let timer = null;
let tokenGetter = null;

function init(getter) {
    tokenGetter = getter;
    console.log(`🔍 Сканер инициализирован: интервал ${SCAN_INTERVAL_MIN}мин, порог ${BARGAIN_THRESHOLD}%`);
}

async function scanOnce() {
    const token = tokenGetter ? tokenGetter() : null;
    if (!token) { console.log('⏸ Сканер: нет токена'); return; }

    const list = db.getWatchlist();
    if (list.length === 0) return;

    console.log(`🔍 Сканер: проверяю ${list.length} предметов...`);
    let bargainsFound = 0;

    for (const item of list) {
        try {
            const region = item.region || 'ru';
            const data = await fetchActiveLots(token, region, item.item_id, 200);
            if (!data.lots || data.lots.length === 0) continue;

            const withBuyout = data.lots.filter(l => (l.buyoutPrice || 0) > 0);
            if (withBuyout.length === 0) continue;

            const prices = withBuyout.map(l => l.buyoutPrice);
            const minPrice = Math.min(...prices);

            // Пишем в историю
            db.addPrice(item.item_id, region, minPrice);

            // Проверяем залёт
            const hist = db.getAveragePrice(item.item_id, region, 24);
            if (hist.cnt >= MIN_HISTORY && hist.avg_price) {
                const avg = Math.round(hist.avg_price);
                const discount = ((avg - minPrice) / avg) * 100;

                if (discount >= BARGAIN_THRESHOLD) {
                    const lastAlert = db.getLastBargainTime(item.item_id, region);
                    const hoursSince = (Date.now() - lastAlert) / 3600000;

                    if (hoursSince >= COOLDOWN_HOURS) {
                        console.log(`🎯 ЗАЛЁТ: ${item.name} — ${minPrice} ₽ (скидка ${discount.toFixed(1)}%)`);
                        db.addBargain(item.item_id, item.name, region, minPrice, avg, discount);
                        await bot.sendBargainAlert(
                            { itemId: item.item_id, name: item.name },
                            { region, price: minPrice, avgPrice: avg, discount: discount.toFixed(1) }
                        );
                        bargainsFound++;
                    }
                }
            }
        } catch (e) {
            console.error(`❌ Сканер: ${item.item_id}:`, e.message);
        }
        // Пауза чтобы не забанили
        await new Promise(r => setTimeout(r, 1200));
    }

    // Раз в сутки чистим старые данные
    if (Math.random() < 0.01) db.cleanupOldData(30);

    console.log(`✅ Сканер: цикл завершён${bargainsFound ? `, найдено залётов: ${bargainsFound}` : ''}`);
}

function start() {
    if (timer) return;
    setTimeout(scanOnce, 30000); // первый запуск через 30 сек
    timer = setInterval(scanOnce, SCAN_INTERVAL_MIN * 60 * 1000);
    console.log('⏰ Фоновый сканер запущен');
}

function stop() {
    if (timer) { clearInterval(timer); timer = null; }
}

module.exports = { init, start, stop, scanOnce };