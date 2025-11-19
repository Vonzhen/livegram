const { Telegraf } = require('telegraf');

// 从环境变量获取 Token
const bot = new Telegraf(process.env.BOT_TOKEN);

// --- 🛡️ 功能 1：广告屏蔽 ---
// 定义广告关键词（支持正则），例如：加群、领币、http链接等
const adKeywords = [/加群/, /领币/, /点击链接/, /t\.me/, /http/i];

bot.on('text', async (ctx, next) => {
  const messageText = ctx.message.text;
  
  // 检查是否包含广告词
  const isAd = adKeywords.some(regex => regex.test(messageText));
  
  // 如果是广告，且发送者不是管理员（可选逻辑，这里简化为直接删）
  if (isAd) {
    try {
      // 删除消息
      await ctx.deleteMessage(); 
      // 警告用户 (5秒后自动删除警告，保持版面清洁)
      const warning = await ctx.reply(`🚫 @${ctx.from.username || ctx.from.first_name} 请勿发送广告/链接！`);
      setTimeout(() => {
        ctx.telegram.deleteMessage(ctx.chat.id, warning.message_id).catch(() => {});
      }, 5000);
    } catch (e) {
      console.error('删除消息失败（可能是权限不足）', e);
    }
    return; // 结束处理，不再回复该消息
  }
  
  // 如果不是广告，继续执行下一个逻辑
  await next();
});

// --- 👋 功能 2：进群欢迎 ---
bot.on('new_chat_members', (ctx) => {
  const newMembers = ctx.message.new_chat_members;
  newMembers.forEach(member => {
    // 避免欢迎机器人自己
    if (!member.is_bot) {
      ctx.reply(`🎉 欢迎 ${member.first_name} 加入我们的群组！请查看置顶公告。`);
    }
  });
});

// --- 💬 功能 3：双向聊天 (简单的自动回复/关键词回复) ---
// 这里你可以接入 ChatGPT，或者设置简单的规则
bot.on('text', async (ctx) => {
  const text = ctx.message.text.toLowerCase();

  if (text.includes('你好') || text.includes('hello')) {
    await ctx.reply('你好呀！有什么我可以帮你的吗？🤖');
  } else if (text.includes('help') || text.includes('帮助')) {
    await ctx.reply('输入“你好”跟我打招呼，或者直接在群里聊天。我会自动屏蔽广告哦。');
  } else {
    // 默认回复（在私聊时回复，群聊时可以注释掉这行以免太吵）
    if (ctx.chat.type === 'private') {
        await ctx.reply(`我收到了你的消息：${ctx.message.text}`);
    }
  }
});

// --- 🚀 Vercel Webhook 配置 ---
// 必须使用这种方式导出，才能适配 Vercel Serverless Function
module.exports = async (req, res) => {
  try {
    // 处理 Telegram 发来的 Webhook 请求
    await bot.handleUpdate(req.body);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling update:', error);
    res.status(200).send('Error'); // 即使出错也返回200，避免 Telegram 重复发送
  }
};
