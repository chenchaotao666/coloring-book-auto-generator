const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testAPI() {
  console.log('🧪 测试涂色书生成器API...\n');

  try {
    // 1. 测试健康检查
    console.log('1. 测试健康检查...');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ 健康检查通过:', healthResponse.data.message);

    // 2. 测试内容生成
    console.log('\n2. 测试内容生成...');
    const contentData = {
      keyword: '蝴蝶',
      description: '马赛克瓷砖纹理',
      count: 2,
      template: '这是一个关于{keyword}的涂色页模板',
      model: 'deepseek-chat'
    };

    const contentResponse = await axios.post(`${BASE_URL}/api/generate-content`, contentData);
    console.log('✅ 内容生成测试完成');

    // 3. 测试Excel导出
    console.log('\n3. 测试Excel导出...');
    const exportData = {
      contents: [
        {
          title: '测试标题1',
          description: '测试描述1',
          prompt: '测试prompt1',
          content: '测试内容1',
          imagePath: './images/test1.png'
        },
        {
          title: '测试标题2',
          description: '测试描述2',
          prompt: '测试prompt2',
          content: '测试内容2',
          imagePath: './images/test2.png'
        }
      ]
    };

    const exportResponse = await axios.post(`${BASE_URL}/api/export-excel`, exportData, {
      responseType: 'arraybuffer'
    });
    console.log('✅ Excel导出测试完成，文件大小:', exportResponse.data.length, 'bytes');

    console.log('\n🎉 所有API测试通过！');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行测试
if (require.main === module) {
  testAPI();
}

module.exports = { testAPI }; 