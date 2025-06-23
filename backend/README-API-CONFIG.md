# API配置说明

## 问题诊断

如果遇到 `KIEAI API调用失败: AxiosError: socket hang up` 错误，请按以下步骤检查：

### 1. 检查API配置状态
访问: `http://localhost:3002/api/config-check`

### 2. 常见问题及解决方案

#### 问题1: socket hang up / ECONNRESET
**原因**: 网络连接问题或API服务不稳定
**解决方案**:
- 检查网络连接
- 确认API服务地址正确
- 等待片刻后重试（已内置重试机制）

#### 问题2: API Token无效
**原因**: 使用了默认的测试Token
**解决方案**:
1. 在`backend`目录创建`.env`文件
2. 添加有效的KIEAI API Token:
```env
KIEAI_API_URL=https://kieai.erweima.ai/api/v1
KIEAI_AUTH_TOKEN=your_real_token_here
```

#### 问题3: API积分不足
**原因**: KIEAI账户积分用完
**解决方案**: 充值KIEAI账户积分

#### 问题4: 图片生成时间过长 ⭐ **新增**
**原因**: AI图片生成本身需要较长时间
**现象**: 
- 任务状态一直显示`GENERATING`
- 进度显示`0.00`或缓慢增长
- 超时错误

**解决方案**:
- **正常现象**: AI图片生成通常需要1-5分钟，复杂prompt可能更长
- **已优化**: 系统已将超时时间调整为5分钟，并使用动态查询间隔
- **建议**: 使用简洁的英文prompt以提高生成速度
- **耐心等待**: 如果任务状态为`GENERATING`，说明系统正在处理

#### 问题5: 状态查询频率限制 ⭐ **新增**
**原因**: 违反了API查询频率限制
**官方限制**: [根据文档](https://docs.kie.ai/4o-image-api/get-4-o-image-details/)，每个任务每秒最多查询3次
**现象**:
- 查询失败或被限制
- 403或429错误

**解决方案**:
- **已优化**: 系统使用智能轮询间隔（3-8秒）
- **重试机制**: 包含1秒延迟，确保不违反频率限制
- **错误恢复**: 网络错误时自动重试，避免因临时故障中断

### 3. 环境配置文件示例

创建 `backend/.env` 文件：

```env
# 服务器端口
PORT=3002

# KIEAI图片生成API配置
KIEAI_API_URL=https://kieai.erweima.ai/api/v1
KIEAI_AUTH_TOKEN=your_real_kieai_token_here

# DeepSeek API配置
DEEPSEEK_API_KEY=sk-your_deepseek_key_here

# 其他可选API配置
OPENAI_API_KEY=your_openai_api_key_here
```

### 4. 降级处理

如果API调用失败，系统会自动：
- 使用重试机制（最多2次，避免过度重试）
- 记录详细错误信息
- 生成占位符图片文件
- 继续处理其他内容

### 5. 优化说明 ⭐ **新增**

#### 基于官方文档的优化:
- **图片生成**: [生成4o图像](https://docs.kie.ai/zh-CN/4o-image-api/generate-4-o-image)
- **状态查询**: [获取4o图像详情](https://docs.kie.ai/4o-image-api/get-4-o-image-details/)

#### API调用优化:
- 符合官方API规范的请求格式
- 支持多种响应格式（`msg: "success"`和`code: 200`）
- 增加超时时间至2分钟（图片生成）
- 智能重试机制，减少不必要的重试

#### 轮询优化:
- 动态查询间隔：前期频繁（3秒），后期稀疏（8秒）
- 最长等待时间：5分钟
- 更好的错误处理和网络异常恢复
- **遵守频率限制**：确保每秒不超过3次查询

#### 状态处理优化 ⭐ **新增**:
根据[官方状态说明](https://docs.kie.ai/4o-image-api/get-4-o-image-details/)优化：
- ✅ `GENERATING`: 生成中（正常状态）
- ✅ `SUCCESS`: 生成成功
- ✅ `CREATE_TASK_FAILED`: 创建任务失败
- ✅ `GENERATE_FAILED`: 生成失败
- ✅ 支持错误信息显示（errorMessage）
- ✅ 处理任务不存在的情况

#### Prompt优化建议:
- ✅ 推荐：`Simple black and white butterfly coloring page, line art style`
- ❌ 避免：过长或过于复杂的中文描述
- ✅ 使用简洁、明确的英文描述可显著提升生成速度

### 6. 获取API密钥

- **KIEAI**: https://docs.kie.ai/zh-CN/4o-image-api/get-4-o-image-download-url
- **DeepSeek**: https://platform.deepseek.com/
- **OpenAI**: https://platform.openai.com/

### 7. 调试命令

检查服务状态：
```bash
curl http://localhost:3002/api/health
```

检查配置状态：
```bash
curl http://localhost:3002/api/config-check
```

测试API调用：
```bash
cd backend
node test-optimized-api.js
```

测试状态查询：
```bash
cd backend
node test-status-query.js
```

### 8. 故障排除流程

1. **首先**: 检查服务器和配置状态
2. **然后**: 运行API测试脚本
3. **如果API正常**: 问题可能是生成时间过长，请耐心等待
4. **如果状态查询异常**: 检查是否违反频率限制
5. **如果API异常**: 检查网络、Token和积分
6. **最后**: 系统会自动降级为占位符，确保功能可用

### 9. 性能监控 ⭐ **新增**

系统现在提供详细的状态信息：
- 任务创建时间和完成时间
- 详细的错误代码和错误信息
- 生成进度百分比
- 网络错误自动恢复记录

这些信息有助于诊断问题和优化性能。 