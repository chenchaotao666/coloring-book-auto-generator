const http = require('http');

function testChinesePrompt() {
  const postData = JSON.stringify({
    keyword: '独角兽',
    description: '彩虹色的梦幻独角兽',
    count: 2,
    model: 'deepseek-chat'
  });

  const options = {
    hostname: 'localhost',
    port: 3002,
    path: '/api/generate-content',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log('🧪 测试中文prompt生成...\n');
  console.log('📋 测试参数:');
  console.log('   关键词: 独角兽');
  console.log('   描述: 彩虹色的梦幻独角兽');
  console.log('   数量: 2\n');

  const req = http.request(options, (res) => {
    console.log(`状态码: ${res.statusCode}\n`);

    let messageCount = 0;
    let step1Items = [];

    res.on('data', (chunk) => {
      const data = chunk.toString();
      const lines = data.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            messageCount++;
            const jsonData = JSON.parse(line.slice(6));

            if (jsonData.type === 'step1_content') {
              step1Items.push(jsonData.content);
              console.log(`📝 主题 ${jsonData.stepProgress}: ${jsonData.content.title}`);
              console.log(`   📖 描述: ${jsonData.content.description}`);
              console.log(`   🎨 中文Prompt: ${jsonData.content.prompt}`);
              console.log('');
            } else if (jsonData.type === 'complete') {
              console.log(`✅ 生成完成！`);
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    });

    res.on('end', () => {
      console.log('\n📊 中文Prompt测试总结:');
      console.log(`   📝 生成的主题数: ${step1Items.length}`);

      step1Items.forEach((item, index) => {
        console.log(`\n   ${index + 1}. ${item.title}`);
        console.log(`      Prompt: "${item.prompt}"`);
        console.log(`      是否包含中文: ${/[\u4e00-\u9fa5]/.test(item.prompt) ? '✅ 是' : '❌ 否'}`);
      });

      console.log('\n🎉 中文Prompt测试完成！');
    });
  });

  req.on('error', (e) => {
    console.error('❌ 请求失败:', e.message);
  });

  req.setTimeout(30000, () => {
    console.error('❌ 请求超时');
    req.destroy();
  });

  req.write(postData);
  req.end();
}

testChinesePrompt(); 