# 🚀 项目管理与交付监控中台部署手册 (Vercel & 宝塔面板)

本手册详细介绍了如何将当前 Next.js 15 + Supabase 的全栈项目部署至 **Vercel** 以及 **宝塔面板 (Linux 服务器)**。

---

## 📌 部署前准备：环境变量清单

无论采用何种部署方案，都必须配置以下环境变量以确保与 Supabase 云数据库的正常连通。请提前复制：

| 变量名称 | 示例值 | 说明 |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ifgmjhoaskhaorgstxsk.supabase.co` | 您的 Supabase 项目接口地址 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_FRKkiDoNE9QYImevQCL55A_9U46ZrFK` | 您的 Supabase 客户端公钥 (Anon Key) |

---

## ☁️ 方案一：Vercel 托管部署 (极速、首选 ⭐️)

Vercel 是 Next.js 官方首推的无服务器 (Serverless) 托管平台，提供全球边缘加速和自动 CI/CD。

### 1. 提交代码至 Git 仓库
1. 在您的 **GitHub / GitLab / Gitee** 上新建一个私有或公开仓库。
2. 将本地代码推送到仓库中：
   ```bash
   git init
   git add .
   git commit -m "feat: init project-monitor for deployment"
   git branch -M main
   git remote add origin <您的仓库地址>
   git push -u origin main
   ```
   *(注：`.gitignore` 已自动帮您排除了 `.env`、`node_modules` 和 `.next` 缓存目录)*

### 2. 在 Vercel 中导入项目
1. 登录 [Vercel 官网 (vercel.com)](https://vercel.com/)（可直接使用 GitHub 账号登录）。
2. 在 Dashboard 中点击 **Add New...** -> **Project**。
3. 导入您刚才推送的 Git 仓库。

### 3. 配置环境变量与构建选项
1. **Framework Preset**（框架预设）：确保系统自动识别并选择 **Next.js**。
2. **Build and Output Settings**（构建与输出设置）：无需修改，保持默认。
3. **Environment Variables**（环境变量）：展开此区域，将以下两个变量依次添加：
   * Key: `NEXT_PUBLIC_SUPABASE_URL` | Value: `https://ifgmjhoaskhaorgstxsk.supabase.co`
   * Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Value: `sb_publishable_FRKkiDoNE9QYImevQCL55A_9U46ZrFK`
4. 点击 **Deploy**（部署）按钮。

### 4. 完成与绑定域名
* 大约 1-2 分钟后，Vercel 即可构建完毕，并为您分配一个免费的 `.vercel.app` 域名。
* 如需绑定您自己的独立域名，可在项目面板的 **Settings -> Domains** 中直接添加并配置 CNAME 解析。

---

## 🏰 方案二：宝塔面板部署 (独立 Linux 服务器 🖥️)

适用于租用了阿里云、腾讯云、华为云等独立 VPS 服务器，并安装了宝塔 Linux 面板的用户。

### 1. 服务器环境准备 (宝塔后台操作)
1. 登录宝塔面板，前往 **软件商店 (App Store)**。
2. 搜索并安装 **Node.js 版本管理器** (或 **PM2 管理器**)。
3. 打开 Node.js 版本管理器，在“版本列表”中安装 **Node.js v20.x 或 v22.x**（本应用原生兼容最新长效支持版 LTS），并将其设置为**命令行版本 (Registry)**。

### 2. 压缩并上传代码
1. 在本地工作区中，将项目打包为 `.zip` 压缩包。
   * ⚠️ **特别注意**：打包时**请勿**包含 `node_modules` 文件夹和 `.next` 编译缓存，只需打包核心源码，以减小上传体积。
2. 进入宝塔面板 -> **文件 (Files)**。
3. 导航到您的网站根目录目录，推荐：`/www/wwwroot/your-project-dir`。
4. 上传刚刚打包的 `.zip` 文件并在线解压。

### 3. 配置生产环境 `.env` 文件
1. 在解压后的项目根目录下，新建或编辑一个命名为 `.env` 的文件（确保文件名有最前方的英文句点）。
2. 写入以下生产环境配置：
   ```env
   NEXT_PUBLIC_SUPABASE_URL="https://ifgmjhoaskhaorgstxsk.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_FRKkiDoNE9QYImevQCL55A_9U46ZrFK"
   PORT=3000
   NODE_ENV=production
   ```

### 4. 执行依赖安装与编译 (终端命令)
1. 在宝塔面板对应目录点击 **终端 (Terminal)** 按钮，或者使用 SSH 软件连上您的服务器并进入对应目录：
   ```bash
   cd /www/wwwroot/your-project-dir
   ```
2. 使用国内镜像源，快速安装生产环境依赖：
   ```bash
   npm install --registry=https://registry.npmmirror.com
   ```
3. 执行 Next.js 生产环境打包编译：
   ```bash
   npm run build
   ```
   *(编译成功后，目录中会生成一个高压缩的 `.next` 生产资源目录)*

### 5. 在宝塔面板中启动服务 (推荐“Node项目”管理器)
1. 前往宝塔面板 -> **网站 (Website)** -> **Node项目**。
2. 点击 **添加Node项目** 按钮：
   * **项目目录**：选择 `/www/wwwroot/your-project-dir`。
   * **项目名称**：自定义输入，例如 `project-monitor`。
   * **启动文件**：选择项目根目录下的 `node_modules/next/dist/bin/next`。
   * **运行参数**：输入 `start -p 3000` *(3000 端口可根据服务器开放端口自行调整)*。
   * **Node版本**：选择刚才安装的 `v20.x` 或 `v22.x`。
   * **端口**：输入 `3000`。
3. 点击 **提交**。管理器会自动帮您使用 PM2 在后台守护该进程，确保进程挂掉后能秒级自动拉起。

### 6. 配置反向代理与域名 SSL
1. 若要使用您的域名访问该系统，请点击 **Node项目** 列表中对应项目的 **映射 (Map)** 按钮，输入您的域名（如 `pm.yourdomain.com`）。
2. 前往宝塔面板 -> **网站 (Website)** -> **PHP项目** 列表（此时域名已被映射过去）。
3. 点击对应域名的 **设置 (Settings)** -> **反向代理 (Reverse Proxy)**：
   * 确保已自动添加了一条代理到 `http://127.0.0.1:3000` 的规则。
4. 点击域名设置中的 **SSL** 选项：
   * 选择 **Let's Encrypt**，勾选您的域名，点击“申请”。
   * 申请成功后开启右上角的 **强制HTTPS**，确保全站链路安全加密。

---

## 🛡️ 运维与调试常见问题

### 1. 宝塔部署提示 Port 3000 occupied 端口被占用？
* **排查方式**：在终端运行 `lsof -i:3000` 找到占用端口的进程 PID，执行 `kill -9 <PID>` 释放端口；或者在宝塔 Node 管理器中将运行参数和端口修改为 `3001` 等闲置端口。

### 2. 部署后提示数据无法加载？
* **排查方式**：请确保服务器已放行出站连接，能够顺畅访问 `https://ifgmjhoaskhaorgstxsk.supabase.co` 这个 Supabase 域名。
