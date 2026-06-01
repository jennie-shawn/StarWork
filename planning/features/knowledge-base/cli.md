# Knowledge Base CLI

## 命令组

```bash
starwork knowledge <command>
```

## 一期命令

- `starwork knowledge init`：创建项目本地知识库标准结构。
- `starwork knowledge status --json`：输出知识库事实状态，供 Skill 判断。
- `starwork knowledge check`：检查知识库结构完整性，不判断内容质量。
- `starwork knowledge apply --blueprint <file>`：按用户确认过的 blueprint 执行结构性变更。

## CLI 边界

CLI 负责：

- 创建目录和模板。
- 更新工作台配置。
- 安装当前项目需要的 `starworkKnowledgeProject`。
- 输出事实状态。
- 执行 blueprint 中的安全文件操作。

CLI 不负责：

- 判断资料是否值得进入知识库。
- 生成主题页正文。
- 形成综合判断。
- 自动提交到项目中心。
- 安装全局入口 Skill `starworkKnowledge`。
