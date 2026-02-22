# API 设计草案（注册/登录 + 数据上云）

本文档定义了在当前项目基础上，新增“注册登录 + 数据上传后端”所需的最小接口集合。

## 1. 目标

- 支持用户注册/登录
- 将当前本地数据同步到后端（记录、时薪设置）
- 支持多端同步与冲突处理

## 2. 统一约定

- Base URL: `/api/v1`
- 鉴权: `Authorization: Bearer <access_token>`
- 时间: `ISO 8601`（UTC）+ 业务字段可保留北京时间字符串
- 返回格式:

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

## 3. 数据模型（与当前前端对齐）

### 3.1 用户

```json
{
  "id": "usr_xxx",
  "email": "user@example.com",
  "nickname": "mike",
  "createdAt": "2026-02-22T12:00:00Z"
}
```

### 3.2 排便记录 PoopRecord

```json
{
  "id": "poop-1739930000000",
  "startTime": 1739930000000,
  "endTime": 1739930300000,
  "beijingTimestamp": 1739930300000,
  "beijingTime": "2026-02-22 20:31:40",
  "duration": 300,
  "hardness": 4,
  "smoothness": 4,
  "location": "home",
  "mood": "relaxed",
  "note": "今天状态不错",
  "date": "2026-02-22",
  "updatedAt": "2026-02-22T12:31:40Z"
}
```

### 3.3 用户设置

```json
{
  "hourlySalary": 1,
  "updatedAt": "2026-02-22T12:31:40Z"
}
```

## 4. 认证接口

### 4.1 注册

- `POST /auth/register`

请求:

```json
{
  "email": "user@example.com",
  "password": "StrongPass123!",
  "nickname": "mike"
}
```

响应:

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "user": { "id": "usr_xxx", "email": "user@example.com", "nickname": "mike" },
    "accessToken": "jwt_access",
    "refreshToken": "jwt_refresh",
    "expiresIn": 7200
  }
}
```

### 4.2 登录

- `POST /auth/login`

请求:

```json
{
  "email": "user@example.com",
  "password": "StrongPass123!"
}
```

响应同注册。

### 4.3 刷新 Token

- `POST /auth/refresh`

请求:

```json
{
  "refreshToken": "jwt_refresh"
}
```

### 4.4 登出

- `POST /auth/logout`

请求:

```json
{
  "refreshToken": "jwt_refresh"
}
```

## 5. 用户信息与设置接口

### 5.1 获取当前用户

- `GET /me`

### 5.2 获取设置

- `GET /me/settings`

### 5.3 更新设置（时薪）

- `PATCH /me/settings`

请求:

```json
{
  "hourlySalary": 12
}
```

## 6. 记录接口（核心）

### 6.1 分页查询记录

- `GET /records?cursor=...&limit=50&startDate=2026-02-01&endDate=2026-02-29`

### 6.2 新增单条

- `POST /records`

请求体: `PoopRecord`（不含服务端生成字段时可由后端补齐）

### 6.3 更新单条

- `PATCH /records/{id}`

请求体: `Partial<PoopRecord>`

### 6.4 删除单条

- `DELETE /records/{id}`

### 6.5 清空当前用户全部记录

- `DELETE /records`

建议增加确认参数防误删:

`DELETE /records?confirm=true`

## 7. 同步接口（推荐）

为了把“本地已有数据一次性上传”做好，建议提供批量同步接口。

### 7.1 首次全量上传

- `POST /sync/upload`

请求:

```json
{
  "clientUpdatedAt": "2026-02-22T12:40:00Z",
  "settings": {
    "hourlySalary": 1,
    "updatedAt": "2026-02-22T12:31:40Z"
  },
  "records": [
    {
      "id": "poop-1739930000000",
      "startTime": 1739930000000,
      "endTime": 1739930300000,
      "beijingTimestamp": 1739930300000,
      "beijingTime": "2026-02-22 20:31:40",
      "duration": 300,
      "hardness": 4,
      "smoothness": 4,
      "location": "home",
      "mood": "relaxed",
      "note": "",
      "date": "2026-02-22",
      "updatedAt": "2026-02-22T12:31:40Z"
    }
  ]
}
```

响应:

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "accepted": 120,
    "updated": 5,
    "skipped": 2,
    "serverSyncToken": "sync_abc_001"
  }
}
```

### 7.2 增量拉取

- `GET /sync/pull?since=2026-02-22T12:40:00Z`

返回服务端变更（记录 + 设置 + 删除列表）:

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "recordsUpsert": [],
    "recordsDeleted": ["poop-123"],
    "settings": { "hourlySalary": 8, "updatedAt": "2026-02-22T13:00:00Z" },
    "serverTime": "2026-02-22T13:00:00Z"
  }
}
```

## 8. 导出接口（可选）

如果希望服务端也支持导出:

- `GET /export/json`
- `GET /export/csv`

注意设置 `Content-Disposition`，让浏览器下载文件。

## 9. 冲突处理建议

- 记录按 `id` 唯一
- 采用“最后更新时间优先”（`updatedAt` 新者覆盖）
- 删除建议软删除（`deletedAt`），便于多端同步

## 10. 最小落地顺序

1. `auth/register`、`auth/login`、`auth/refresh`
2. `GET/PATCH /me/settings`
3. `POST/GET/PATCH/DELETE /records`
4. `POST /sync/upload`、`GET /sync/pull`

按以上顺序即可完成从“纯本地存储”到“可登录+可云同步”的升级。
