const SESSION_COOKIE_VALUE = process.env.MB_SESSION;
const MAX_RUNTIME_MS = 320 * 60 * 1000; // 5ч20м
const LOOP_INTERVAL_MS = 3 * 60 * 1000; // 3 минуты

if (!SESSION_COOKIE_VALUE) {
  console.error('❌ MB_SESSION не задана!');
  process.exit(1);
}

const log = (...args) => console.log(`[${new Date().toISOString()}]`, ...args);

// Общие заголовки, чтобы Cloudflare не блокировал запрос
const getHeaders = () => ({
  'accept': 'application/json, text/plain, */*',
  'accept-language': 'en-US,en;q=0.9',
  'content-type': 'application/json',
  'cookie': `mb_session=${SESSION_COOKIE_VALUE}`,
  'origin': 'https://miniblox.io',
  'referer': 'https://miniblox.io/',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
});

async function main() {
  const startTime = Date.now();
  log('🚀 Старт фармера рекламы (Fetch-режим)');

  let iteration = 0;

  while (Date.now() - startTime < MAX_RUNTIME_MS) {
    iteration++;
    log(`🔄 --- Итерация #${iteration} ---`);

    try {
      // 1. Запрос на получение тикета
      const res1 = await fetch('https://miniblox.io/auth-api/rewarded_ad/start', {
        method: 'POST',
        headers: getHeaders(),
        body: '{}'
      });
      
      const data1 = await res1.json();
      
      if (res1.status === 403 || res1.status === 401) {
        log(`❌ Ошибка авторизации (${res1.status}). Возможно, протухла cookie MB_SESSION.`);
        await new Promise(r => setTimeout(r, 60000)); // Ждём минуту и пробуем снова
        continue;
      }

      // 2. Запрос на зачисление награды
      const res2 = await fetch('https://miniblox.io/auth-api/metrics/ad_event', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ kind: 'rewarded', phase: 'shown' })
      });
      
      const data2 = await res2.json();

      log(`✅ Тикет: ${data1.ticket ? 'получен' : 'НЕТ'} | Награда: ${JSON.stringify(data2)} (HTTP ${res2.status})`);

    } catch (e) {
      log(`❌ Ошибка сети: ${e.message}`);
    }

    // Ждём 3 минуты до следующего круга
    log(`⏳ Ждём 3 минуты...`);
    const timeLeft = MAX_RUNTIME_MS - (Date.now() - startTime);
    const waitTime = Math.min(LOOP_INTERVAL_MS, timeLeft);
    
    if (waitTime > 0) {
      await new Promise(r => setTimeout(r, waitTime));
    }
  }

  log(`⏰ 5ч20м истекли. Итераций: ${iteration}. Завершаю.`);
}

main();
