//NodeJs code
const TelegramBot = require('node-telegram-bot-api');
const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');

// replace the value below with the Telegram token you receive from @BotFather
const token = '5779357399:AAHFORWvZfK-0_vleTOttiiozNqzgqrLg6w';

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

// Add your filter link here
const filterUrl = 'https://auto.ria.com/uk/search/?categories.main.id=1&indexName=auto,order_auto,newauto_search&region.id[0]=10&brand.id[0]=190&model.id[0]=62321&size=20';

let currentPrice = null;

// Fetch current prices
function getCurrentPrice(){
  request(filterUrl, (error, response, html) => {
    if(!error && response.statusCode == 200){
      const $ = cheerio.load (html);;

      currentPrice = $('.price-ticket').text(); 
    }
  });
}

// Check for price changes
function checkPriceChanges(){
  setInterval(() => {
    request(filterUrl, (error, response, html) => {
      if(!error && response.statusCode == 200){
        const $ = cheerio.load (html);;
        let newPrice = $('.price-ticket').text();
        if(newPrice < currentPrice){
          // Notify user about the price change
          bot.sendMessage(chatId, 'Цена изменилась! Check out the below link');
          bot.sendMessage(chatId, filterUrl);
        }
        currentPrice = newPrice;
      }
    });
  }, 1000);
}

  bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  if(msg.text === '/start'){
    // Add an if statement to check if the user has used the /stop command
    fs.readFile('chat-list.txt', 'utf-8', (err, data) => {
      if(!data.includes(chatId)){
        bot.sendMessage(chatId, 'Бот запущен! Используйте команду /menu , чтобы получить список доступных команд');
        getCurrentPrice();
        checkPriceChanges();
        // Add the user's chatId to the chat-list.txt file
        fs.appendFile('chat-list.txt', chatId + '\n', () => {
          console.log('ChatId added to the file');
        });
      }
    });
  }
  if(msg.text === '/stop'){
    bot.sendMessage(chatId, 'Бот остановлен! Чтобы запустить используйсте команду /start');
    clearInterval(getCurrentPrice);
    clearInterval(checkPriceChanges);
    // Remove the user's chatId from the chat-list.txt file
    fs.readFile('chat-list.txt', 'utf-8', (err, data) => {
      const updatedList = data.replace(chatId + '\n', '');
      fs.writeFile('chat-list.txt', updatedList, () => {
        console.log('ChatId removed from the file');
      });
    });
  }
  // Add the /menu command
  if(msg.text === '/menu') {
    bot.sendMessage(chatId, 'Available commands: \n\n/start - Включить бота. \n/stop - Остановить бота. \n/list - Активные объявлений по фильтру. \n/menu - Доступные команды.');
  }
  // Add the /list command
if(msg.text === '/list') {
  bot.sendMessage(chatId, 'Собираю список активных объявлений по запросу....');
  // Use the request npm package to get the html page 
  request('https://auto.ria.com/uk/search/?categories.main.id=1&indexName=auto,order_auto,newauto_search&region.id[0]=10&brand.id[0]=190&model.id[0]=62321&size=20', (err, response, html) => {
    if(!err && response.statusCode === 200) {
      // Parse the html with cheerio
      const $ = cheerio.load(html);
      // Get the list of advertisements from the page
      const adLinks = $('a.address');
//	  const adPrice = $('.price-ticket');
      // Send a message with the list of advertisements
      bot.sendMessage(chatId, 'Активные объявления: \n\n' /*+ adPrice*/ + adLinks.map(function(i, el){
        return ($(this).attr('href'));
      }).get().join('\n'));
    }
  });
};
});