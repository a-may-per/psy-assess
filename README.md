# psy-assess

C 端微信小程序：任何人都可独立完成的趣味性格测评，测完可邀请另一人配对出趣味关系画像。个人结果永远免费，配对结果看激励视频解锁（流量主模式，不做付费）。

> **唯一权威产品定义见 [docs/product-spec.md](docs/product-spec.md)**，其他文档与之冲突时以它为准。

## 商业模式

- 流量主（广告）变现，不做付费
- 个人结果免费（产品本体）；配对结果 = 激励视频解锁（增值层）
- 3 个月硬目标：**累计 UV ≥ 1000 → 开通流量主**（≈500 对配对 + 内容自然流量即可达标）
- 关键推论：单用户收入约 0.1 元级 → 不可能买量，增长只能靠裂变 + 内容引流
- 注意：流量主开通前所有广告组件不可用，目标期内产品实为全免费版

## 生死问题（未解决前不要写代码）

- [ ] **内容供给**：维度、题库、画像库、文案全空白，唯一可行路线是自研+AI辅助+人工精修，需第 1-2 周启动（见 [docs/content-pipeline.md](docs/content-pipeline.md)）
- [ ] **答题体验**：题目必须盲测展示，不暴露测量维度和产品意图；结果页才揭示维度
- [ ] **主体资质**：小程序个人主体能否上线测试类目、流量主开通主体要求（见 [docs/compliance.md](docs/compliance.md)）
- [ ] **合规边界**：敏感个人信息（双人配对关联）、娱乐边界文案红线（见 [docs/compliance.md](docs/compliance.md)）

## 文档索引

| 文档 | 用途 |
|------|------|
| [docs/progress-summary.md](docs/progress-summary.md) | 历次交互、当前进展、完成度与下一步 |
| [docs/product-spec.md](docs/product-spec.md) | 产品规格（唯一权威） |
| [docs/content-pipeline.md](docs/content-pipeline.md) | 内容生产管线与文风规则 |
| [docs/mvp-scope.md](docs/mvp-scope.md) | MVP 范围、里程碑与指标 |
| [docs/monetization.md](docs/monetization.md) | 流量主变现模型 |
| [docs/compliance.md](docs/compliance.md) | 主体资质、数据合规与文案红线 |
| [docs/user-research.md](docs/user-research.md) | 用户调研与访谈 |
| [docs/competitive-analysis.md](docs/competitive-analysis.md) | 竞品分析 |
